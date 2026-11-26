import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * FR-10 + NFR-02: Xác nhận thanh toán (Idempotent)
   * Được gọi bởi Webhook thật (PayOS/VNPay) hoặc endpoint giả lập mock-pay
   */
  async confirmPayment(
    bookingId: string,
    externalRefId: string,
  ): Promise<{ success: boolean; booking_status: string }> {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { session: { select: { title: true } } },
      });

      if (!booking) {
        throw new NotFoundException({
          errorCode: 'BOOKING_NOT_FOUND',
          message: 'Không tìm thấy đơn đặt chỗ.',
        });
      }

      // Idempotency: Nếu đã xử lý rồi thì trả OK ngay
      if (booking.status !== BookingStatus.PENDING_PAYMENT) {
        this.logger.warn(
          `Webhook idempotent: Booking ${bookingId} đã ở trạng thái ${booking.status}`,
        );
        return { success: true, booking_status: booking.status };
      }

      // Kiểm tra external_ref_id đã xử lý chưa
      const existingTx = await tx.walletTransaction.findUnique({
        where: { external_ref_id: externalRefId },
      });
      if (existingTx) {
        this.logger.warn(
          `Webhook idempotent: external_ref_id ${externalRefId} đã được xử lý`,
        );
        return { success: true, booking_status: booking.status };
      }

      // Cập nhật booking sang CONFIRMED
      const now = new Date();
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          paid_at: now,
          expires_at: null,
        },
      });

      // Ghi WalletTransaction cho GATEWAY payment (không cộng available_balance vì tiền ở Escrow)
      await tx.walletTransaction.create({
        data: {
          user_id: booking.guest_id,
          booking_id: booking.id,
          type: TransactionType.BOOKING_PAYMENT_GATEWAY,
          amount: booking.total_amount,
          balance_before: 0,
          balance_after: 0,
          external_ref_id: externalRefId,
          description: `Thanh toán qua cổng cho buổi đánh "${booking.session.title}"`,
        },
      });

      this.logger.log(
        `Booking ${bookingId} xác nhận thanh toán thành công (ref: ${externalRefId})`,
      );

      return { success: true, booking_status: BookingStatus.CONFIRMED };
    });
  }
}
