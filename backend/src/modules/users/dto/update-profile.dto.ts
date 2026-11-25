import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  full_name?: string;

  @ApiPropertyOptional({ example: 3.0, minimum: 1.0, maximum: 4.0 })
  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(4.0)
  skill_level?: number;

  @ApiPropertyOptional({ example: 'Vietcombank', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bank_name?: string;

  @ApiPropertyOptional({ example: '0071000123456', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bank_account_number?: string;

  @ApiPropertyOptional({ example: 'NGUYEN VAN A', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bank_account_name?: string;
}
