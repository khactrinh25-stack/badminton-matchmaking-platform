import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [BookingsModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
