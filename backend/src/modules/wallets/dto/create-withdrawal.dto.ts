import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class CreateWithdrawalDto {
  @ApiProperty({
    description: 'Số tiền muốn rút (VNĐ), tối thiểu 50.000 VNĐ',
    example: 200000,
    minimum: 50000,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(50000)
  amount!: number;
}
