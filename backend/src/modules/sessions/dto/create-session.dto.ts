import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CancelPolicy } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ example: 'Giao lưu tối T3 - Sân Cầu lông Gia Định' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Sân Cầu lông Gia Định' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  court_name!: string;

  @ApiProperty({ example: '2A Phan Chu Trinh, Bình Thạnh, TP.HCM' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address!: string;

  @ApiProperty({ example: 'Sân số 3 & 4' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  court_number!: string;

  @ApiProperty({ example: 10.8031 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: 106.6968 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiProperty({ example: '2026-11-28T19:00:00.000Z' })
  @IsDateString()
  start_time!: string;

  @ApiProperty({ example: '2026-11-28T21:00:00.000Z' })
  @IsDateString()
  end_time!: string;

  @ApiProperty({ example: 70000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_per_slot!: number;

  @ApiProperty({ example: 2.5, minimum: 1.0, maximum: 4.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(1.0)
  @Max(4.0)
  min_skill_level!: number;

  @ApiProperty({ example: 4.0, minimum: 1.0, maximum: 4.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(1.0)
  @Max(4.0)
  max_skill_level!: number;

  @ApiProperty({ example: 4, minimum: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  min_players!: number;

  @ApiProperty({ example: 8, minimum: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  max_players!: number;

  @ApiProperty({ enum: CancelPolicy, example: CancelPolicy.FLEXIBLE_6H })
  @IsEnum(CancelPolicy)
  cancel_policy!: CancelPolicy;

  @ApiPropertyOptional({ example: 'Cầu Thành Công, bao nước suối.' })
  @IsOptional()
  @IsString()
  note?: string;
}
