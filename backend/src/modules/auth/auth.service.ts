import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthUserSummary {
  id: string;
  phone_number: string;
  full_name: string;
  role: Role;
  skill_level: number;
  available_balance: string;
  violation_count: number;
  is_locked: boolean;
  locked_until?: Date | null;
}

export interface AuthResponse {
  access_token: string;
  user: AuthUserSummary;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private buildAuthResponse(user: User, includeLockedUntil = false): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      phone_number: user.phone_number,
      role: user.role,
    };

    const summary: AuthUserSummary = {
      id: user.id,
      phone_number: user.phone_number,
      full_name: user.full_name,
      role: user.role,
      skill_level: user.skill_level,
      available_balance: user.available_balance.toFixed(2),
      violation_count: user.violation_count,
      is_locked: user.is_locked,
      ...(includeLockedUntil && user.is_locked
        ? { locked_until: user.locked_until }
        : {}),
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: summary,
    };
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { phone_number: dto.phone_number },
    });

    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'PHONE_ALREADY_EXISTS',
        message: 'Số điện thoại đã được đăng ký.',
      });
    }

    const password_hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        phone_number: dto.phone_number,
        password_hash,
        full_name: dto.full_name,
        skill_level: dto.skill_level ?? 2.0,
        role: Role.USER,
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { phone_number: dto.phone_number },
    });

    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Số điện thoại hoặc mật khẩu không chính xác.',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Số điện thoại hoặc mật khẩu không chính xác.',
      });
    }

    return this.buildAuthResponse(user, true);
  }
}
