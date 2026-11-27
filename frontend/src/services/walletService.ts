import { apiClient } from './api';

export type TransactionType =
  | 'BOOKING_PAYMENT_GATEWAY'
  | 'BOOKING_PAYMENT_WALLET'
  | 'BOOKING_REFUND'
  | 'SESSION_PAYOUT'
  | 'WITHDRAWAL_DEDUCT'
  | 'WITHDRAWAL_REFUND';

export type WithdrawalStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  amount: string;
  balance_before: string;
  balance_after: string;
  description: string | null;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  amount: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  status: WithdrawalStatus;
  created_at: string;
}

export interface WalletSummary {
  available_balance: string;
  escrow_held_amount: string;
  transactions: WalletTransaction[];
}

export interface CreateWithdrawalPayload {
  amount: number;
}

export const walletService = {
  async getSummary(): Promise<WalletSummary> {
    const { data } = await apiClient.get<WalletSummary>('/wallets/summary');
    return data;
  },

  async createWithdrawal(
    payload: CreateWithdrawalPayload,
  ): Promise<WithdrawalRequest> {
    const { data } = await apiClient.post<WithdrawalRequest>(
      '/wallets/withdrawals',
      payload,
    );
    return data;
  },
};
