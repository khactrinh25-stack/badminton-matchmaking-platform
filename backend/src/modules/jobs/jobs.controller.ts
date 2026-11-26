import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JobsService } from './jobs.service';

@ApiTags('Admin Jobs')
@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('trigger-expire-bookings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin kích hoạt thủ công Cronjob hủy đơn PENDING_PAYMENT quá hạn',
  })
  triggerExpireOverdueBookings() {
    return this.jobsService.triggerExpireOverdueBookings();
  }
}
