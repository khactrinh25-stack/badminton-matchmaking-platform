import { apiClient } from './api';

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'EXPIRED'
  | 'CONFIRMED'
  | 'CANCELLED_BY_GUEST'
  | 'CANCELLED_BY_HOST'
  | 'CHECKED_IN'
  | 'DISPUTED'
  | 'SETTLED';

export type PaymentMethod = 'GATEWAY' | 'WALLET';

export interface CreateBookingPayload {
  session_id: string;
  slots_count: number;
  payment_method: PaymentMethod;
}

export interface PaymentInfo {
  qr_code_url: string | null;
  checkout_url: string | null;
  message?: string;
}

export interface CreateBookingResponse {
  booking: {
    id: string;
    session_id: string;
    slots_count: number;
    total_amount: string;
    payment_method: PaymentMethod;
    status: BookingStatus;
    expires_at: string | null;
    paid_at?: string | null;
  };
  payment: PaymentInfo | null;
}

export interface MyBooking {
  id: string;
  session_id: string;
  slots_count: number;
  total_amount: string;
  payment_method: PaymentMethod;
  status: BookingStatus;
  expires_at: string | null;
  paid_at: string | null;
  checked_in_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  qr_payload: string | null;
  session: {
    id: string;
    title: string;
    court_name: string;
    address: string;
    court_number: string;
    start_time: string;
    end_time: string;
    price_per_slot: string;
    cancel_policy: 'FLEXIBLE_6H' | 'MODERATE_12H' | 'STRICT_24H';
    status: string;
    host: {
      id: string;
      full_name: string;
      phone_number: string;
      skill_level: number;
    };
  };
}

export const bookingService = {
  async createBooking(payload: CreateBookingPayload): Promise<CreateBookingResponse> {
    const response = await apiClient.post<CreateBookingResponse>('/bookings', payload);
    return response.data;
  },

  async getMyBookings(): Promise<MyBooking[]> {
    const response = await apiClient.get<MyBooking[]>('/bookings/my-bookings');
    return response.data;
  },

  async mockPay(
    bookingId: string,
  ): Promise<{ success: boolean; booking_status: string }> {
    const response = await apiClient.post<{
      success: boolean;
      booking_status: string;
    }>(`/webhooks/mock-pay/${bookingId}`);
    return response.data;
  },
};
