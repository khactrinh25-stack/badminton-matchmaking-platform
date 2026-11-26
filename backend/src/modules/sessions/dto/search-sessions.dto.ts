import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class SearchSessionsDto {
  @ApiProperty({ example: 10.7769, description: 'Vĩ độ tâm tìm kiếm' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 106.7009, description: 'Kinh độ tâm tìm kiếm' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Bán kính tìm kiếm (km)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(100)
  radius_km?: number = 10;

  @ApiPropertyOptional({ example: 3.0, minimum: 1.0, maximum: 4.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1.0)
  @Max(4.0)
  skill_level?: number;

  @ApiPropertyOptional({ example: '2026-11-28', description: 'Ngày thi đấu (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;
}
