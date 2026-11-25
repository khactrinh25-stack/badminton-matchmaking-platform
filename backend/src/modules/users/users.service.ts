import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

export interface UserProfileResponse {
  id: string;
  phone_number: string;
  full_name: string;
  role: string;
  skill_level: number;
  available_balance: string;
  violation_count: number;
  is_locked: boolean;
  locked_until: Date | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  toProfileResponse(user: User): UserProfileResponse {
    return {
      id: user.id,
      phone_number: user.phone_number,
      full_name: user.full_name,
      role: user.role,
      skill_level: user.skill_level,
      available_balance: user.available_balance.toFixed(2),
      violation_count: user.violation_count,
      is_locked: user.is_locked,
      locked_until: user.locked_until,
      bank_name: user.bank_name,
      bank_account_number: user.bank_account_number,
      bank_account_name: user.bank_account_name,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByPhoneNumber(phone_number: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { phone_number } });
  }

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'USER_NOT_FOUND',
        message: 'Không tìm thấy tài khoản người dùng.',
      });
    }
    return this.toProfileResponse(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    const existing = await this.findById(userId);
    if (!existing) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'USER_NOT_FOUND',
        message: 'Không tìm thấy tài khoản người dùng.',
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.full_name !== undefined && { full_name: dto.full_name }),
        ...(dto.skill_level !== undefined && { skill_level: dto.skill_level }),
        ...(dto.bank_name !== undefined && { bank_name: dto.bank_name }),
        ...(dto.bank_account_number !== undefined && {
          bank_account_number: dto.bank_account_number,
        }),
        ...(dto.bank_account_name !== undefined && {
          bank_account_name: dto.bank_account_name,
        }),
      },
    });

    return this.toProfileResponse(updated);
  }
}
