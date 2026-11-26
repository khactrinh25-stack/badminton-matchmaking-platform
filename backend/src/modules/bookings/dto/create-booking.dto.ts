import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'ID của buổi đánh muốn đặt chỗ',
    example: 'uuid-session-1',
  })
  @IsNotEmpty()
  @IsUUID()
  session_id: string;

  @ApiProperty({
    description: 'Số lượng vị trí đặt',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  slots_count: number;

  @ApiProperty({
    description: 'Phương thức thanh toán: GATEWAY (mã QR PayOS/VNPay) hoặc WALLET (trừ số dư)',
    example: 'GATEWAY',
    enum: ['GATEWAY', 'WALLET'],
  })
  @IsString()
  @IsIn(['GATEWAY', 'WALLET'])
  payment_method: 'GATEWAY' | 'WALLET';
}
