import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: '0901234567' })
  @IsString()
  @Matches(/^0\d{9}$/, {
    message: 'Số điện thoại phải gồm đúng 10 chữ số bắt đầu bằng 0.',
  })
  phone_number: string;

  @ApiProperty({ example: 'Password123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự.' })
  password: string;

  @ApiProperty({ example: 'Nguyễn Văn A', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  full_name: string;

  @ApiPropertyOptional({ example: 3.0, minimum: 1.0, maximum: 5.0 })
  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  skill_level?: number;
}
