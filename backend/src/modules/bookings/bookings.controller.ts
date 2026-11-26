import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Khởi tạo đặt chỗ trong buổi đánh (FR-09, FR-10)',
  })
  createBooking(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.createBooking(userId, dto);
  }

  @Get('my-bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách đơn đặt chỗ của tôi kèm mã QR (FR-13)',
  })
  getMyBookings(@CurrentUser('id') userId: string) {
    return this.bookingsService.getMyBookings(userId);
  }
}
