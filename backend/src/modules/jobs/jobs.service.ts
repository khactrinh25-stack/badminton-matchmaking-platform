import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingsService } from '../bookings/bookings.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * Cronjob chạy mỗi 1 phút: Chuyển đơn PENDING_PAYMENT quá 10 phút sang EXPIRED
   * và hoàn trả booked_slots cho Session.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpireOverdueBookings(): Promise<void> {
    this.logger.debug('Cronjob: Kiểm tra đơn đặt chỗ PENDING_PAYMENT quá hạn...');
    await this.bookingsService.expireOverdueBookings();
  }

  /**
   * Hàm public để Admin gọi trực tiếp qua API khi cần trigger thủ công (Demo)
   */
  async triggerExpireOverdueBookings(): Promise<{ expired_count: number }> {
    const count = await this.bookingsService.expireOverdueBookings();
    return { expired_count: count };
  }
}
