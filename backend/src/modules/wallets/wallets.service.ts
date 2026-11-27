import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  Prisma,
  TransactionType,
  WithdrawalStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

const MIN_WITHDRAWAL_AMOUNT = 50000;
const ESCROW_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
  BookingStatus.DISPUTED,
];

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string) {
    const [user, escrowAggregate, transactions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { available_balance: true },
      }),
      this.prisma.booking.aggregate({
        where: {
          status: { in: ESCROW_BOOKING_STATUSES },
          OR: [{ guest_id: userId }, { session: { host_id: userId } }],
        },
        _sum: { total_amount: true },
      }),
      this.prisma.walletTransaction.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          type: true,
          amount: true,
          balance_before: true,
          balance_after: true,
          description: true,
          created_at: true,
        },
      }),
    ]);

    if (!user) {
      throw new NotFoundException({
        errorCode: 'USER_NOT_FOUND',
        message: 'Không tìm thấy tài khoản người dùng.',
      });
    }

    const escrowHeld = escrowAggregate._sum.total_amount ?? new Prisma.Decimal(0);

    return {
      available_balance: user.available_balance.toFixed(2),
      escrow_held_amount: escrowHeld.toFixed(2),
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount.toFixed(2),
        balance_before: transaction.balance_before.toFixed(2),
        balance_after: transaction.balance_after.toFixed(2),
        description: transaction.description,
        created_at: transaction.created_at,
      })),
    };
  }

  async createWithdrawal(userId: string, dto: CreateWithdrawalDto) {
    return this.prisma.$transaction(async (tx) => {
      const amount = new Prisma.Decimal(dto.amount);

      if (amount.lessThan(MIN_WITHDRAWAL_AMOUNT)) {
        throw new BadRequestException({
          errorCode: 'INVALID_WITHDRAWAL_AMOUNT',
          message: `Số tiền rút tối thiểu là ${MIN_WITHDRAWAL_AMOUNT.toLocaleString('vi-VN')} VNĐ.`,
        });
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          bank_name: true,
          bank_account_number: true,
          bank_account_name: true,
        },
      });

      if (!user) {
        throw new NotFoundException({
          errorCode: 'USER_NOT_FOUND',
          message: 'Không tìm thấy tài khoản người dùng.',
        });
      }

      if (
        !user.bank_name?.trim() ||
        !user.bank_account_number?.trim() ||
        !user.bank_account_name?.trim()
      ) {
        throw new BadRequestException({
          errorCode: 'BANK_INFO_REQUIRED',
          message:
            'Vui lòng cập nhật đầy đủ thông tin tài khoản ngân hàng trong hồ sơ trước khi rút tiền.',
        });
      }

      const claimed = await tx.user.updateMany({
        where: { id: userId, available_balance: { gte: amount } },
        data: { available_balance: { decrement: amount } },
      });

      if (claimed.count !== 1) {
        throw new BadRequestException({
          errorCode: 'INSUFFICIENT_BALANCE',
          message: 'Số dư khả dụng không đủ để thực hiện rút tiền.',
        });
      }

      const updatedUser = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { available_balance: true },
      });
      const balanceAfter = updatedUser.available_balance;
      const balanceBefore = balanceAfter.add(amount);

      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          user_id: userId,
          amount,
          bank_name: user.bank_name.trim(),
          bank_account_number: user.bank_account_number.trim(),
          bank_account_name: user.bank_account_name.trim(),
          status: WithdrawalStatus.PENDING,
        },
      });

      await tx.walletTransaction.create({
        data: {
          user_id: userId,
          withdrawal_id: withdrawal.id,
          type: TransactionType.WITHDRAWAL_DEDUCT,
          amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description: 'Rút tiền về tài khoản ngân hàng đã đăng ký',
        },
      });

      return {
        id: withdrawal.id,
        amount: withdrawal.amount.toFixed(2),
        bank_name: withdrawal.bank_name,
        bank_account_number: withdrawal.bank_account_number,
        bank_account_name: withdrawal.bank_account_name,
        status: withdrawal.status,
        created_at: withdrawal.created_at,
      };
    });
  }
}
