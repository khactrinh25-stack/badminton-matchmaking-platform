import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateSessionDto } from './dto/create-session.dto';
import { SearchSessionsDto } from './dto/search-sessions.dto';
import { SessionsService } from './sessions.service';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo buổi đánh mới (FR-04)' })
  createSession(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSessionDto,
  ) {
    return this.sessionsService.createSession(userId, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm buổi đánh theo bán kính GPS Haversine (FR-05)' })
  searchSessions(@Query() query: SearchSessionsDto) {
    return this.sessionsService.searchSessions(query);
  }

  @Get('my-hosted')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách buổi đánh do tôi tổ chức' })
  getMyHostedSessions(@CurrentUser('id') userId: string) {
    return this.sessionsService.getMyHostedSessions(userId);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem chi tiết buổi đánh & trạng thái mở khóa SĐT (FR-06, FR-08)' })
  getSessionDetail(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser | null,
  ) {
    return this.sessionsService.getSessionDetail(id, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Host hủy buổi đánh do thiếu người (FR-07)' })
  cancelSession(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.sessionsService.cancelSessionByHost(id, userId);
  }
}
