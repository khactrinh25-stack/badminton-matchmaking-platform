import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  CancelPolicy,
  Prisma,
  Role,
  SessionStatus,
  TransactionType,
} from '@prisma/client';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SearchSessionsDto } from './dto/search-sessions.dto';

interface RawSessionSearchRow {
  id: string;
  title: string;
  court_name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  start_time: Date;
  end_time: Date;
  price_per_slot: Prisma.Decimal;
  min_skill_level: number;
  max_skill_level: number;
  booked_slots: number;
  max_players: number;
  cancel_policy: CancelPolicy;
  host_id: string;
  host_full_name: string;
  host_skill_level: number;
}

const CANCEL_POLICY_MIN_HOURS: Record<CancelPolicy, number> = {
  [CancelPolicy.FLEXIBLE_6H]: 6,
  [CancelPolicy.MODERATE_12H]: 12,
  [CancelPolicy.STRICT_24H]: 24,
};

function maskPhoneNumber(phone: string): string {
  if (phone.length < 7) return '****';
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(hostId: string, dto: CreateSessionDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: hostId },
      select: { id: true, is_locked: true, locked_until: true },
    });

    if (!user) {
      throw new NotFoundException({
        errorCode: 'USER_NOT_FOUND',
        message: 'Không tìm thấy tài khoản người dùng.',
      });
    }

    if (user.is_locked) {
      throw new ForbiddenException({
        errorCode: 'ACCOUNT_LOCKED',
        message: `Tài khoản của bạn đang bị khóa${
          user.locked_until ? ` đến ${user.locked_until.toISOString()}` : ''
        } do vi phạm quy định.`,
      });
    }

    const now = new Date();
    const startTime = new Date(dto.start_time);
    const endTime = new Date(dto.end_time);

    if (startTime <= now) {
      throw new BadRequestException({
        errorCode: 'INVALID_START_TIME',
        message: 'Thời gian bắt đầu phải lớn hơn thời điểm hiện tại.',
      });
    }

    if (endTime <= startTime) {
      throw new BadRequestException({
        errorCode: 'INVALID_END_TIME',
        message: 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu.',
      });
    }

    if (dto.min_skill_level > dto.max_skill_level) {
      throw new BadRequestException({
        errorCode: 'INVALID_SKILL_RANGE',
        message: 'Trình độ tối thiểu không được lớn hơn trình độ tối đa.',
      });
    }

    if (dto.min_players > dto.max_players) {
      throw new BadRequestException({
        errorCode: 'INVALID_PLAYER_RANGE',
        message: 'Số người tối thiểu không được lớn hơn số người tối đa.',
      });
    }

    // RULE-05: Khóa gói hủy có mốc hoàn 100% lớn hơn khoảng thời gian từ lúc tạo đến start_time
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const requiredHours = CANCEL_POLICY_MIN_HOURS[dto.cancel_policy];
    if (hoursUntilStart < requiredHours) {
      throw new BadRequestException({
        errorCode: 'INVALID_CANCEL_POLICY',
        message: `Gói hủy ${dto.cancel_policy} yêu cầu thời gian bắt đầu cách hiện tại ít nhất ${requiredHours} giờ.`,
      });
    }

    const session = await this.prisma.session.create({
      data: {
        host_id: hostId,
        title: dto.title.trim(),
        court_name: dto.court_name.trim(),
        address: dto.address.trim(),
        court_number: dto.court_number.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        start_time: startTime,
        end_time: endTime,
        price_per_slot: new Prisma.Decimal(dto.price_per_slot),
        min_skill_level: dto.min_skill_level,
        max_skill_level: dto.max_skill_level,
        min_players: dto.min_players,
        max_players: dto.max_players,
        cancel_policy: dto.cancel_policy,
        note: dto.note?.trim() || null,
      },
    });

    return {
      ...session,
      price_per_slot: session.price_per_slot.toFixed(2),
    };
  }

  async searchSessions(dto: SearchSessionsDto) {
    const lat = dto.lat;
    const lng = dto.lng;
    const radiusKm = dto.radius_km ?? 10;

    // Bounding box filter to utilize (latitude, longitude) B-Tree index
    const latDelta = radiusKm / 111.0;
    const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), 0.01);
    const lngDelta = radiusKm / (111.0 * cosLat);

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    const skillFilter =
      dto.skill_level !== undefined
        ? Prisma.sql`AND s.min_skill_level <= ${dto.skill_level} AND s.max_skill_level >= ${dto.skill_level}`
        : Prisma.empty;

    let dateFilter = Prisma.empty;
    if (dto.date) {
      const dateStr = dto.date.slice(0, 10);
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      dateFilter = Prisma.sql`AND s.start_time >= ${dayStart} AND s.start_time < ${dayEnd}`;
    }

    const rows = await this.prisma.$queryRaw<RawSessionSearchRow[]>`
      SELECT *
      FROM (
        SELECT
          s.id,
          s.title,
          s.court_name,
          s.address,
          s.latitude,
          s.longitude,
          (
            6371 * 2 * ASIN(
              LEAST(
                1.0,
                SQRT(
                  POWER(SIN(RADIANS((s.latitude - ${lat}) / 2.0)), 2) +
                  COS(RADIANS(${lat})) * COS(RADIANS(s.latitude)) *
                  POWER(SIN(RADIANS((s.longitude - ${lng}) / 2.0)), 2)
                )
              )
            )
          ) AS distance_km,
          s.start_time,
          s.end_time,
          s.price_per_slot,
          s.min_skill_level,
          s.max_skill_level,
          s.booked_slots,
          s.max_players,
          s.cancel_policy,
          u.id AS host_id,
          u.full_name AS host_full_name,
          u.skill_level AS host_skill_level
        FROM sessions s
        INNER JOIN users u ON u.id = s.host_id
        WHERE s.status = 'OPEN'
          AND s.start_time > NOW()
          AND s.latitude BETWEEN ${minLat} AND ${maxLat}
          AND s.longitude BETWEEN ${minLng} AND ${maxLng}
          ${skillFilter}
          ${dateFilter}
      ) sub
      WHERE sub.distance_km <= ${radiusKm}
      ORDER BY sub.distance_km ASC, sub.start_time ASC
    `;

    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        court_name: row.court_name,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        distance_km: Number(Number(row.distance_km).toFixed(2)),
        start_time: row.start_time,
        end_time: row.end_time,
        price_per_slot: Number(row.price_per_slot).toFixed(2),
        min_skill_level: row.min_skill_level,
        max_skill_level: row.max_skill_level,
        booked_slots: row.booked_slots,
        max_players: row.max_players,
        cancel_policy: row.cancel_policy,
        host: {
          id: row.host_id,
          full_name: row.host_full_name,
          skill_level: row.host_skill_level,
        },
      })),
    };
  }

  async getSessionDetail(id: string, currentUser?: AuthenticatedUser | null) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            full_name: true,
            phone_number: true,
            skill_level: true,
          },
        },
        bookings: {
          where: {
            status: {
              in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN],
            },
          },
          include: {
            guest: {
              select: {
                id: true,
                full_name: true,
                phone_number: true,
                skill_level: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException({
        errorCode: 'SESSION_NOT_FOUND',
        message: 'Không tìm thấy buổi đánh cầu lông.',
      });
    }

    const now = new Date();
    const unlockStart = new Date(session.start_time.getTime() - 30 * 60 * 1000);
    const isWithinUnlockWindow = now >= unlockStart && now <= session.end_time;

    const isAdmin = currentUser?.role === Role.ADMIN;
    const isHost = currentUser?.id === session.host_id;
    const isConfirmedGuest = Boolean(
      currentUser && session.bookings.some((b) => b.guest_id === currentUser.id),
    );

    const isPhoneUnlocked =
      isAdmin || (isWithinUnlockWindow && (isHost || isConfirmedGuest));

    const canSeeHostPhone = isHost || isAdmin || (isWithinUnlockWindow && isConfirmedGuest);

    return {
      id: session.id,
      title: session.title,
      court_name: session.court_name,
      address: session.address,
      court_number: session.court_number,
      latitude: session.latitude,
      longitude: session.longitude,
      start_time: session.start_time,
      end_time: session.end_time,
      price_per_slot: session.price_per_slot.toFixed(2),
      min_skill_level: session.min_skill_level,
      max_skill_level: session.max_skill_level,
      min_players: session.min_players,
      max_players: session.max_players,
      booked_slots: session.booked_slots,
      cancel_policy: session.cancel_policy,
      status: session.status,
      note: session.note,
      is_phone_unlocked: isPhoneUnlocked,
      host: {
        id: session.host.id,
        full_name: session.host.full_name,
        phone_number: canSeeHostPhone
          ? session.host.phone_number
          : maskPhoneNumber(session.host.phone_number),
        skill_level: session.host.skill_level,
      },
      participants: session.bookings.map((booking) => {
        const canSeeGuestPhone =
          isAdmin ||
          currentUser?.id === booking.guest.id ||
          (isWithinUnlockWindow && isHost);

        return {
          booking_id: booking.id,
          guest_id: booking.guest.id,
          full_name: booking.guest.full_name,
          phone_number: canSeeGuestPhone
            ? booking.guest.phone_number
            : maskPhoneNumber(booking.guest.phone_number),
          skill_level: booking.guest.skill_level,
          slots_count: booking.slots_count,
          status: booking.status,
        };
      }),
    };
  }

  async getMyHostedSessions(hostId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { host_id: hostId },
      include: {
        bookings: {
          where: {
            status: {
              in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN],
            },
          },
          select: {
            id: true,
            status: true,
            slots_count: true,
          },
        },
      },
      orderBy: { start_time: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      court_name: s.court_name,
      address: s.address,
      court_number: s.court_number,
      start_time: s.start_time,
      end_time: s.end_time,
      price_per_slot: s.price_per_slot.toFixed(2),
      min_players: s.min_players,
      max_players: s.max_players,
      booked_slots: s.booked_slots,
      cancel_policy: s.cancel_policy,
      status: s.status,
      confirmed_bookings_count: s.bookings.filter(
        (b) => b.status === BookingStatus.CONFIRMED,
      ).length,
      checked_in_bookings_count: s.bookings.filter(
        (b) => b.status === BookingStatus.CHECKED_IN,
      ).length,
    }));
  }

  async cancelSessionByHost(sessionId: string, hostId: string) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException({
          errorCode: 'SESSION_NOT_FOUND',
          message: 'Không tìm thấy buổi đánh.',
        });
      }

      if (session.host_id !== hostId) {
        throw new ForbiddenException({
          errorCode: 'FORBIDDEN_HOST_ONLY',
          message: 'Chỉ chủ kèo mới có quyền hủy buổi đánh này.',
        });
      }

      if (session.status !== SessionStatus.OPEN) {
        throw new BadRequestException({
          errorCode: 'SESSION_NOT_OPEN',
          message: 'Chỉ có thể hủy buổi đánh đang ở trạng thái OPEN.',
        });
      }

      const now = new Date();
      const twoHoursMs = 2 * 60 * 60 * 1000;
      if (session.start_time.getTime() - now.getTime() < twoHoursMs) {
        throw new BadRequestException({
          errorCode: 'CANCEL_TOO_LATE',
          message: 'Host chỉ được phép hủy buổi đánh trước giờ bắt đầu ít nhất 2 tiếng.',
        });
      }

      if (session.booked_slots >= session.min_players) {
        throw new BadRequestException({
          errorCode: 'MIN_PLAYERS_REACHED',
          message: 'Buổi đánh đã đủ số người tối thiểu, không thể hủy.',
        });
      }

      const claimedSession = await tx.session.updateMany({
        where: { id: sessionId, status: SessionStatus.OPEN },
        data: { status: SessionStatus.CANCELLED },
      });

      if (claimedSession.count !== 1) {
        throw new ConflictException({
          errorCode: 'SESSION_ALREADY_CANCELLED',
          message: 'Buổi đánh này đã được hủy hoặc đang được xử lý.',
        });
      }

      const bookings = await tx.booking.findMany({
        where: {
          session_id: sessionId,
          status: {
            in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT],
          },
        },
        select: {
          id: true,
          guest_id: true,
          slots_count: true,
          total_amount: true,
          status: true,
        },
      });

      const orderedBookings = [...bookings].sort(
        (a, b) =>
          a.guest_id.localeCompare(b.guest_id) || a.id.localeCompare(b.id),
      );

      let refundedBookings = 0;

      for (const booking of orderedBookings) {
        if (booking.status === BookingStatus.CONFIRMED) {
          const claimedBooking = await tx.booking.updateMany({
            where: { id: booking.id, status: BookingStatus.CONFIRMED },
            data: {
              status: BookingStatus.CANCELLED_BY_HOST,
              cancelled_at: now,
            },
          });

          if (claimedBooking.count !== 1) {
            continue;
          }

          const updatedWallet = await tx.user.update({
            where: { id: booking.guest_id },
            data: {
              available_balance: { increment: booking.total_amount },
            },
            select: { available_balance: true },
          });
          const balanceAfter = updatedWallet.available_balance;
          const balanceBefore = balanceAfter.sub(booking.total_amount);

          await tx.walletTransaction.create({
            data: {
              user_id: booking.guest_id,
              booking_id: booking.id,
              type: TransactionType.BOOKING_REFUND,
              amount: booking.total_amount,
              balance_before: balanceBefore,
              balance_after: balanceAfter,
              description: `Hoàn tiền 100% do Host hủy buổi đánh "${session.title}"`,
            },
          });

          refundedBookings++;
          continue;
        }

        const expiredBooking = await tx.booking.updateMany({
          where: { id: booking.id, status: BookingStatus.PENDING_PAYMENT },
          data: {
            status: BookingStatus.EXPIRED,
            cancelled_at: now,
          },
        });

        if (expiredBooking.count !== 1) {
          continue;
        }

        await tx.session.update({
          where: { id: sessionId },
          data: {
            booked_slots: { decrement: booking.slots_count },
          },
        });
      }

      return {
        message: 'Đã hủy buổi đánh và hoàn tiền 100% cho người chơi.',
        refunded_bookings: refundedBookings,
      };
    });
  }
}
