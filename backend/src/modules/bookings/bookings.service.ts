import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  CancelPolicy,
  SessionStatus,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

const PENDING_PAYMENT_TTL_MINUTES = 10;
const COOLING_OFF_MINUTES = 30;
const COOLING_OFF_MIN_START_HOURS = 2;
const CANCEL_THRESHOLDS_HOURS: Record<
  CancelPolicy,
  { fullRefund: number; halfRefund: number }
> = {
  [CancelPolicy.FLEXIBLE_6H]: { fullRefund: 6, halfRefund: 2 },
  [CancelPolicy.MODERATE_12H]: { fullRefund: 12, halfRefund: 4 },
  [CancelPolicy.STRICT_24H]: { fullRefund: 24, halfRefund: 12 },
};

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * FR-09: Khởi tạo đặt chỗ bọc trong prisma.$transaction chống Race Condition
   * FR-10: Hỗ trợ WALLET (trừ số dư ngay) và GATEWAY (giữ chỗ 10 phút)
   */
  async createBooking(guestId: string, dto: CreateBookingDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Kiểm tra user
      const guest = await tx.user.findUnique({
        where: { id: guestId },
        select: {
          id: true,
          is_locked: true,
          locked_until: true,
          available_balance: true,
        },
      });

      if (!guest) {
        throw new NotFoundException({
          errorCode: 'USER_NOT_FOUND',
          message: 'Không tìm thấy tài khoản người dùng.',
        });
      }

      if (guest.is_locked) {
        throw new ForbiddenException({
          errorCode: 'ACCOUNT_LOCKED',
          message: `Tài khoản của bạn đang bị khóa${
            guest.locked_until
              ? ` đến ${guest.locked_until.toISOString()}`
              : ''
          } do vi phạm quy định.`,
        });
      }

      // 2. Kiểm tra session
      const session = await tx.session.findUnique({
        where: { id: dto.session_id },
      });

      if (!session) {
        throw new NotFoundException({
          errorCode: 'SESSION_NOT_FOUND',
          message: 'Không tìm thấy buổi đánh cầu lông.',
        });
      }

      if (session.host_id === guestId) {
        throw new BadRequestException({
          errorCode: 'CANNOT_BOOK_OWN_SESSION',
          message: 'Chủ kèo không thể đặt chỗ trong buổi đánh của mình.',
        });
      }

      if (session.status !== SessionStatus.OPEN) {
        throw new BadRequestException({
          errorCode: 'SESSION_NOT_OPEN',
          message: 'Buổi đánh không còn ở trạng thái mở đăng ký.',
        });
      }

      const now = new Date();
      if (session.start_time <= now) {
        throw new BadRequestException({
          errorCode: 'SESSION_ALREADY_STARTED',
          message: 'Buổi đánh đã bắt đầu, không thể đặt chỗ.',
        });
      }

      // 3. Kiểm tra chỗ trống
      if (session.booked_slots + dto.slots_count > session.max_players) {
        throw new ConflictException({
          errorCode: 'INSUFFICIENT_SLOTS',
          message: `Không đủ chỗ trống. Còn lại ${session.max_players - session.booked_slots} vị trí.`,
        });
      }

      // 4. Tính tổng tiền
      const totalAmount = session.price_per_slot.mul(dto.slots_count);
      const newBookedSlots = session.booked_slots + dto.slots_count;
      const newSessionStatus =
        newBookedSlots >= session.max_players
          ? SessionStatus.FULL
          : SessionStatus.OPEN;

      // 5. Cập nhật booked_slots trên session
      await tx.session.update({
        where: { id: session.id },
        data: {
          booked_slots: newBookedSlots,
          status: newSessionStatus,
        },
      });

      // 6. Xử lý theo phương thức thanh toán
      if (dto.payment_method === 'WALLET') {
        // --- Thanh toán bằng số dư khả dụng ---
        if (guest.available_balance.lessThan(totalAmount)) {
          throw new BadRequestException({
            errorCode: 'INSUFFICIENT_BALANCE',
            message: `Số dư khả dụng không đủ. Cần ${totalAmount.toFixed(2)} VNĐ nhưng chỉ có ${guest.available_balance.toFixed(2)} VNĐ.`,
          });
        }

        const balanceBefore = guest.available_balance;
        const balanceAfter = balanceBefore.sub(totalAmount);

        // Trừ số dư
        await tx.user.update({
          where: { id: guestId },
          data: { available_balance: balanceAfter },
        });

        // Tạo booking CONFIRMED ngay
        const booking = await tx.booking.create({
          data: {
            session_id: dto.session_id,
            guest_id: guestId,
            slots_count: dto.slots_count,
            total_amount: totalAmount,
            payment_method: 'WALLET',
            status: BookingStatus.CONFIRMED,
            paid_at: now,
          },
        });

        // Ghi WalletTransaction
        await tx.walletTransaction.create({
          data: {
            user_id: guestId,
            booking_id: booking.id,
            type: TransactionType.BOOKING_PAYMENT_WALLET,
            amount: totalAmount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            description: `Thanh toán đặt chỗ buổi đánh "${session.title}"`,
          },
        });

        return {
          booking: {
            id: booking.id,
            session_id: booking.session_id,
            slots_count: booking.slots_count,
            total_amount: booking.total_amount.toFixed(2),
            payment_method: booking.payment_method,
            status: booking.status,
            paid_at: booking.paid_at,
          },
          payment: null,
        };
      } else {
        // --- Thanh toán qua cổng GATEWAY (giữ chỗ 10 phút) ---
        const expiresAt = new Date(
          now.getTime() + PENDING_PAYMENT_TTL_MINUTES * 60 * 1000,
        );

        const booking = await tx.booking.create({
          data: {
            session_id: dto.session_id,
            guest_id: guestId,
            slots_count: dto.slots_count,
            total_amount: totalAmount,
            payment_method: 'GATEWAY',
            status: BookingStatus.PENDING_PAYMENT,
            expires_at: expiresAt,
          },
        });

        return {
          booking: {
            id: booking.id,
            session_id: booking.session_id,
            slots_count: booking.slots_count,
            total_amount: booking.total_amount.toFixed(2),
            payment_method: booking.payment_method,
            status: booking.status,
            expires_at: booking.expires_at,
          },
          payment: {
            qr_code_url: booking.id,
            checkout_url: null,
            message:
              'Chế độ demo: dùng mã QR này hoặc bấm "Giả lập thanh toán" trong danh sách đơn để xác nhận.',
          },
        };
      }
    });
  }

  /**
   * GET /api/bookings/my-bookings — FR-13
   * Lấy danh sách đơn đặt chỗ của Guest hiện tại kèm qr_payload
   */
  async getMyBookings(guestId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { guest_id: guestId },
      include: {
        session: {
          include: {
            host: {
              select: {
                id: true,
                full_name: true,
                phone_number: true,
                skill_level: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const now = new Date();

    return bookings.map((b) => {
      const unlockStart = new Date(
        b.session.start_time.getTime() - 30 * 60 * 1000,
      );
      const isWithinUnlockWindow =
        now >= unlockStart && now <= b.session.end_time;

      const isConfirmedOrCheckedIn =
        b.status === BookingStatus.CONFIRMED ||
        b.status === BookingStatus.CHECKED_IN;

      const canSeeHostPhone = isWithinUnlockWindow && isConfirmedOrCheckedIn;

      return {
        id: b.id,
        session_id: b.session_id,
        slots_count: b.slots_count,
        total_amount: b.total_amount.toFixed(2),
        payment_method: b.payment_method,
        status: b.status,
        expires_at: b.expires_at,
        paid_at: b.paid_at,
        checked_in_at: b.checked_in_at,
        cancelled_at: b.cancelled_at,
        created_at: b.created_at,
        qr_payload: isConfirmedOrCheckedIn ? b.id : null,
        session: {
          id: b.session.id,
          title: b.session.title,
          court_name: b.session.court_name,
          address: b.session.address,
          court_number: b.session.court_number,
          start_time: b.session.start_time,
          end_time: b.session.end_time,
          price_per_slot: b.session.price_per_slot.toFixed(2),
          cancel_policy: b.session.cancel_policy,
          status: b.session.status,
          host: {
            id: b.session.host.id,
            full_name: b.session.host.full_name,
            phone_number: canSeeHostPhone
              ? b.session.host.phone_number
              : maskPhoneNumber(b.session.host.phone_number),
            skill_level: b.session.host.skill_level,
          },
        },
      };
    });
  }

  async cancelBooking(guestId: string, bookingId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          session: true,
        },
      });

      if (!booking) {
        throw new NotFoundException({
          errorCode: 'BOOKING_NOT_FOUND',
          message: 'Không tìm thấy đơn đặt chỗ.',
        });
      }

      if (booking.guest_id !== guestId) {
        throw new ForbiddenException({
          errorCode: 'BOOKING_NOT_OWNER',
          message: 'Bạn chỉ có thể hủy đơn đặt chỗ của mình.',
        });
      }

      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new ConflictException({
          errorCode: 'BOOKING_NOT_CANCELLABLE',
          message: 'Chỉ có thể hủy đơn đã xác nhận thanh toán.',
        });
      }

      const now = new Date();
      if (now >= booking.session.start_time) {
        throw new ConflictException({
          errorCode: 'SESSION_ALREADY_STARTED',
          message: 'Buổi đánh đã bắt đầu, không thể hủy đặt chỗ.',
        });
      }

      const hoursUntilStart =
        (booking.session.start_time.getTime() - now.getTime()) /
        (60 * 60 * 1000);
      const paidAt = booking.paid_at;
      const isWithinCoolingOff =
        paidAt !== null &&
        now.getTime() - paidAt.getTime() <= COOLING_OFF_MINUTES * 60 * 1000 &&
        hoursUntilStart >= COOLING_OFF_MIN_START_HOURS;

      const thresholds = CANCEL_THRESHOLDS_HOURS[booking.session.cancel_policy];
      let refundPercentage = 0;

      if (isWithinCoolingOff || hoursUntilStart >= thresholds.fullRefund) {
        refundPercentage = 100;
      } else if (hoursUntilStart >= thresholds.halfRefund) {
        refundPercentage = 50;
      }

      const refundAmount = booking.total_amount
        .mul(refundPercentage)
        .div(100)
        .floor();
      const hostAmount = booking.total_amount.sub(refundAmount);

      const claimed = await tx.booking.updateMany({
        where: { id: bookingId, status: BookingStatus.CONFIRMED },
        data: {
          status: BookingStatus.CANCELLED_BY_GUEST,
          cancelled_at: now,
        },
      });

      if (claimed.count !== 1) {
        throw new ConflictException({
          errorCode: 'BOOKING_ALREADY_CANCELLED',
          message: 'Đơn đặt chỗ này đã được hủy.',
        });
      }

      const updatedSession = await tx.session.update({
        where: { id: booking.session_id },
        data: { booked_slots: { decrement: booking.slots_count } },
      });

      if (
        updatedSession.status === SessionStatus.FULL &&
        updatedSession.booked_slots < updatedSession.max_players &&
        updatedSession.start_time > now
      ) {
        await tx.session.update({
          where: { id: booking.session_id },
          data: { status: SessionStatus.OPEN },
        });
      }

      if (refundAmount.greaterThan(0)) {
        const guestWallet = await tx.user.update({
          where: { id: guestId },
          data: { available_balance: { increment: refundAmount } },
          select: { available_balance: true },
        });
        const balanceAfter = guestWallet.available_balance;
        const balanceBefore = balanceAfter.sub(refundAmount);

        await tx.walletTransaction.create({
          data: {
            user_id: guestId,
            booking_id: booking.id,
            type: TransactionType.BOOKING_REFUND,
            amount: refundAmount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            description: `Hoàn tiền hủy đặt chỗ buổi đánh "${booking.session.title}"`,
          },
        });
      }

      if (hostAmount.greaterThan(0)) {
        const hostWallet = await tx.user.update({
          where: { id: booking.session.host_id },
          data: { available_balance: { increment: hostAmount } },
          select: { available_balance: true },
        });
        const balanceAfter = hostWallet.available_balance;
        const balanceBefore = balanceAfter.sub(hostAmount);

        await tx.walletTransaction.create({
          data: {
            user_id: booking.session.host_id,
            booking_id: booking.id,
            type: TransactionType.SESSION_PAYOUT,
            amount: hostAmount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            description: `Giải ngân từ đơn đã hủy buổi đánh "${booking.session.title}"`,
          },
        });
      }

      return {
        message: 'Hủy đặt chỗ thành công.',
        refund_percentage: refundPercentage,
        refunded_amount: refundAmount.toFixed(2),
      };
    });
  }

  /**
   * NFR-01: Cronjob logic — Hủy đơn PENDING_PAYMENT quá 10 phút
   * Được gọi bởi JobsService mỗi phút
   */
  async expireOverdueBookings(): Promise<number> {
    const now = new Date();

    // Tìm tất cả booking quá hạn
    const overdueBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING_PAYMENT,
        expires_at: { lte: now },
      },
      select: {
        id: true,
        session_id: true,
        slots_count: true,
      },
    });

    if (overdueBookings.length === 0) {
      return 0;
    }

    // Xử lý từng booking trong transaction riêng để tránh 1 lỗi ảnh hưởng tất cả
    let expiredCount = 0;
    for (const booking of overdueBookings) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Đổi trạng thái booking sang EXPIRED
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: BookingStatus.EXPIRED,
              cancelled_at: now,
            },
          });

          // Trả lại chỗ trống cho session
          const updatedSession = await tx.session.update({
            where: { id: booking.session_id },
            data: {
              booked_slots: { decrement: booking.slots_count },
            },
          });

          // Nếu session đang FULL, chuyển lại OPEN
          if (
            updatedSession.status === SessionStatus.FULL &&
            updatedSession.booked_slots < updatedSession.max_players
          ) {
            await tx.session.update({
              where: { id: booking.session_id },
              data: { status: SessionStatus.OPEN },
            });
          }
        });
        expiredCount++;
      } catch (error) {
        this.logger.error(
          `Lỗi khi xử lý hết hạn đơn đặt chỗ ${booking.id}: ${String(error)}`,
        );
      }
    }

    if (expiredCount > 0) {
      this.logger.log(
        `Cronjob: Đã chuyển ${expiredCount} đơn PENDING_PAYMENT quá hạn sang EXPIRED.`,
      );
    }

    return expiredCount;
  }
}

function maskPhoneNumber(phone: string): string {
  if (phone.length < 7) return '****';
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}
