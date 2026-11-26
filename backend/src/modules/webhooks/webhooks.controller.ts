import {
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Nhận webhook xác nhận thanh toán từ cổng thật (chưa bật ở chế độ demo)',
  })
  handleGatewayWebhook() {
    return this.webhooksService.handleGatewayWebhook();
  }

  /**
   * Endpoint giả lập thanh toán cho môi trường Dev/Demo
   * Chỉ hoạt động khi ENABLE_MOCK_PAYMENT=true
   */
  @Post('mock-pay/:bookingId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Giả lập thanh toán thành công cho đơn PENDING_PAYMENT (Dev/Demo)',
  })
  mockPayBooking(@Param('bookingId') bookingId: string) {
    const enableMock = process.env.ENABLE_MOCK_PAYMENT === 'true';
    if (!enableMock) {
      throw new NotFoundException({
        errorCode: 'MOCK_PAYMENT_DISABLED',
        message: 'Chế độ giả lập thanh toán không được kích hoạt.',
      });
    }
    return this.webhooksService.confirmPayment(bookingId, `MOCK-${bookingId}`);
  }
}
