# DATA MODEL — Thiết kế Cơ sở Dữ liệu & Prisma Schema

**Dự án:** Hệ thống Ghép trận Cầu lông Vãng lai (Badminton Matchmaking Platform)  
**Hệ quản trị CSDL:** PostgreSQL 15/16 + Prisma ORM

## 1. Sơ đồ Quan hệ Thực thể Tổng quát (ERD Overview)

Hệ thống bao gồm **6 thực thể cốt lõi** ánh xạ trực tiếp sang 6 bảng dữ liệu vật lý trong PostgreSQL:

1. **`User` (Người dùng):** Lưu thông tin định danh (SĐT duy nhất), mật khẩu băm, vai trò (`USER` / `ADMIN`), trình độ cầu lông (số thực), số dư khả dụng (`available_balance`), số lần vi phạm (`violation_count`), trạng thái khóa phạt 14 ngày và thông tin ngân hàng thụ hưởng.
2. **`Session` (Buổi đánh cầu lông):** Lưu thông tin buổi đánh do Host khởi tạo, bao gồm tọa độ GPS sân, khung giờ, đơn giá, khoảng trình độ, giới hạn số người chơi, số chỗ đã đặt (`booked_slots`) và 1 trong 3 gói chính sách hủy cố định.
3. **`Booking` (Đơn đặt chỗ):** Liên kết Guest với một `Session`. Lưu số lượng vị trí đặt, tổng tiền, phương thức thanh toán, trạng thái vòng đời (từ chờ thanh toán, xác nhận tạm giữ Escrow, điểm danh QR, hủy, tranh chấp cho đến quyết toán). Mã `id` (`UUID`) của `Booking` chính là dữ liệu được mã hóa thành mã QR điểm danh duy nhất cho toàn bộ đơn.
4. **`WalletTransaction` (Lịch sử Biến động Số dư & Giao dịch):** Bảng nhật ký kế toán bất biến (Immutable Ledger) ghi nhận mọi luồng tiền vào/ra số dư khả dụng và quỹ tạm giữ Escrow, kèm mã tham chiếu cổng thanh toán (`external_ref_id`) để đảm bảo tính bất biến Webhook (Idempotency).
5. **`Dispute` (Hồ sơ Tranh chấp Hiện trường):** Quan hệ `1-1` với một `Booking` bị khiếu nại. Lưu trữ **bằng chứng hai chiều** (tọa độ GPS, khoảng cách tới sân, ảnh chụp camera sau từ Cloudinary và Server Timestamp của cả bên khiếu nại lẫn bên phản hồi đối chứng) cùng phán quyết SOP của Admin.
6. **`WithdrawalRequest` (Yêu cầu Rút tiền):** Lưu trữ các lệnh rút tiền từ số dư khả dụng về tài khoản ngân hàng cá nhân của người dùng để Admin đối soát và duyệt thủ công.

### Sơ đồ Liên kết (Cardinality)
- `User (1)` ——— `(N) Session` *(Host tổ chức nhiều buổi đánh)*
- `User (1)` ——— `(N) Booking` *(Guest đặt nhiều đơn tham gia)*
- `Session (1)` ——— `(N) Booking` *(Một buổi đánh có nhiều đơn đặt chỗ)*
- `Booking (1)` ——— `(0..1) Dispute` *(Một đơn đặt chỗ phát sinh tối đa 1 hồ sơ tranh chấp)*
- `User (1)` ——— `(N) WalletTransaction` *(Người dùng có nhiều biến động số dư)*
- `Booking (1)` ——— `(N) WalletTransaction` *(Một đơn đặt chỗ có thể sinh giao dịch thanh toán, hoàn tiền hoặc giải ngân)*
- `WithdrawalRequest (1)` ——— `(N) WalletTransaction` *(Một lệnh rút tiền sinh giao dịch tạm trừ và hoàn lại nếu bị từ chối)*

---

## 2. Quy ước Thang đo Trình độ Cầu lông (`skill_level`)

Cơ sở dữ liệu lưu trữ trình độ dưới dạng số thực (`Float`) từ `1.0` đến `5.0` (bước nhảy `0.5`) để tối ưu truy vấn lọc khoảng giá trị (`min_skill_level <= user.skill_level <= max_skill_level`). Phía Frontend chịu trách nhiệm ánh xạ sang nhãn tiếng Việt:

| Giá trị lưu DB (`Float`) | Nhãn hiển thị trên Frontend | Mô tả năng lực tham chiếu |
| :--- | :--- | :--- |
| `1.0` – `1.5` | **Mới chơi (Newbie)** | Mới làm quen luật chơi, kỹ thuật cơ bản chưa ổn định. |
| `2.0` – `2.5` | **Trung bình yếu (TB-)** | Phông cầu, giao cầu cơ bản tốt, di chuyển bước đơn. |
| `3.0` – `3.5` | **Trung bình (TB)** | Đánh đôi nhịp nhàng, biết đập cầu, bỏ nhỏ, phòng thủ ổn. |
| `4.0` – `4.5` | **Trung bình khá (TB+)** | Điều cầu chiến thuật tốt, phản tạt nhanh, thể lực bền. |
| `5.0` | **Khá / Bán chuyên (Khá+)** | Kỹ thuật toàn diện, tốc độ cao, từng tham gia giải phong trào. |

---

## 3. Bộ Giá trị Liệt kê (Database Enums)

- **`Role`**: `USER`, `ADMIN`
- **`CancelPolicy`**:
  - `FLEXIBLE_6H` (Hoàn 100% trước 6h, hoàn 50% trước 2h)
  - `MODERATE_12H` (Hoàn 100% trước 12h, hoàn 50% trước 4h)
  - `STRICT_24H` (Hoàn 100% trước 24h, hoàn 50% trước 12h)
- **`SessionStatus`**:
  - `OPEN`: Đang mở đăng ký và còn chỗ trống.
  - `FULL`: Đã nhận đủ số lượng người tối đa (`booked_slots == max_players`).
  - `CANCELLED`: Host hủy buổi đánh trước 2h do chưa đủ `min_players`.
  - `COMPLETED`: Buổi đánh đã kết thúc qua 2 tiếng và hoàn tất đối soát toàn bộ đơn.
- **`BookingStatus`**:
  - `PENDING_PAYMENT`: Đang giữ chỗ tạm thời trong 10 phút chờ thanh toán qua cổng QR.
  - `EXPIRED`: Quá 10 phút chưa thanh toán, hệ thống tự động hủy và nhả chỗ trống.
  - `CONFIRMED`: Đã thanh toán 100%, tiền nằm trong quỹ tạm giữ Escrow.
  - `CANCELLED_BY_GUEST`: Guest chủ động hủy trước giờ đánh (đã tính hoàn tiền 100%/50%/0%).
  - `CANCELLED_BY_HOST`: Đơn bị hủy do Host hủy buổi đánh thiếu người (hoàn 100% cho Guest).
  - `CHECKED_IN`: Guest đã có mặt tại sân và được Host quét mã QR xác nhận.
  - `DISPUTED`: Đơn bị khóa giải ngân tự động do phát sinh báo cáo tranh chấp hiện trường.
  - `SETTLED`: Đơn đã hoàn tất quyết toán dòng tiền (giải ngân cho Host hoặc hoàn tiền theo phán quyết).
- **`TransactionType`**:
  - `BOOKING_PAYMENT_GATEWAY`: Guest thanh toán qua QR PayOS/VNPay vào quỹ Escrow.
  - `BOOKING_PAYMENT_WALLET`: Guest thanh toán trực tiếp từ `available_balance` vào quỹ Escrow.
  - `BOOKING_REFUND`: Hoàn tiền từ Escrow về `available_balance` của Guest.
  - `SESSION_PAYOUT`: Giải ngân tiền từ Escrow vào `available_balance` của Host.
  - `WITHDRAWAL_DEDUCT`: Khấu trừ `available_balance` ngay khi tạo lệnh rút tiền.
  - `WITHDRAWAL_REFUND`: Hoàn trả `available_balance` nếu Admin từ chối lệnh rút tiền.
- **`DisputeStatus`**:
  - `PENDING_REVIEW`: Đang chờ Admin kiểm tra bằng chứng và phân xử (SLA 24-48h).
  - `RESOLVED_GUEST_WIN`: Hoàn 100% cho Guest, Host nhận +1 lỗi vi phạm.
  - `RESOLVED_HOST_WIN`: Giải ngân 100% cho Host, Guest nhận +1 lỗi vi phạm.
  - `RESOLVED_SPLIT`: Chia đôi 50% Guest / 50% Host, không bên nào bị tính lỗi vi phạm.
- **`WithdrawalStatus`**: `PENDING`, `COMPLETED`, `REJECTED`

---

## 4. Mã nguồn Chuẩn `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

enum CancelPolicy {
  FLEXIBLE_6H
  MODERATE_12H
  STRICT_24H
}

enum SessionStatus {
  OPEN
  FULL
  CANCELLED
  COMPLETED
}

enum BookingStatus {
  PENDING_PAYMENT
  EXPIRED
  CONFIRMED
  CANCELLED_BY_GUEST
  CANCELLED_BY_HOST
  CHECKED_IN
  DISPUTED
  SETTLED
}

enum TransactionType {
  BOOKING_PAYMENT_GATEWAY
  BOOKING_PAYMENT_WALLET
  BOOKING_REFUND
  SESSION_PAYOUT
  WITHDRAWAL_DEDUCT
  WITHDRAWAL_REFUND
}

enum DisputeStatus {
  PENDING_REVIEW
  RESOLVED_GUEST_WIN
  RESOLVED_HOST_WIN
  RESOLVED_SPLIT
}

enum WithdrawalStatus {
  PENDING
  COMPLETED
  REJECTED
}

model User {
  id                  String   @id @default(uuid())
  phone_number        String   @unique @db.VarChar(15)
  password_hash       String
  full_name           String   @db.VarChar(100)
  role                Role     @default(USER)
  skill_level         Float    @default(2.0)
  available_balance   Decimal  @default(0) @db.Decimal(12, 2)
  violation_count     Int      @default(0)
  is_locked           Boolean  @default(false)
  locked_until        DateTime?
  bank_name           String?  @db.VarChar(100)
  bank_account_number String?  @db.VarChar(50)
  bank_account_name   String?  @db.VarChar(100)
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  hosted_sessions     Session[]           @relation("HostSessions")
  bookings            Booking[]           @relation("GuestBookings")
  transactions        WalletTransaction[]
  disputes_reported   Dispute[]           @relation("DisputeReporter")
  disputes_resolved   Dispute[]           @relation("DisputeAdmin")
  withdrawals         WithdrawalRequest[] @relation("UserWithdrawals")
  withdrawals_handled WithdrawalRequest[] @relation("AdminWithdrawals")

  @@map("users")
}

model Session {
  id              String        @id @default(uuid())
  host_id         String
  title           String        @db.VarChar(200)
  court_name      String        @db.VarChar(150)
  address         String        @db.VarChar(300)
  court_number    String        @db.VarChar(50)
  latitude        Float
  longitude       Float
  start_time      DateTime
  end_time        DateTime
  price_per_slot  Decimal       @db.Decimal(12, 2)
  min_skill_level Float
  max_skill_level Float
  min_players     Int
  max_players     Int
  booked_slots    Int           @default(0)
  cancel_policy   CancelPolicy
  status          SessionStatus @default(OPEN)
  note            String?       @db.Text
  created_at      DateTime      @default(now())
  updated_at      DateTime      @updatedAt

  host            User          @relation("HostSessions", fields: [host_id], references: [id])
  bookings        Booking[]

  @@index([latitude, longitude])
  @@index([status, start_time])
  @@index([host_id])
  @@map("sessions")
}

model Booking {
  id             String        @id @default(uuid())
  session_id     String
  guest_id       String
  slots_count    Int           @default(1)
  total_amount   Decimal       @db.Decimal(12, 2)
  payment_method String        @db.VarChar(20) // 'GATEWAY' | 'WALLET'
  status         BookingStatus @default(PENDING_PAYMENT)
  expires_at     DateTime?
  paid_at        DateTime?
  checked_in_at  DateTime?
  cancelled_at   DateTime?
  settled_at     DateTime?
  created_at     DateTime      @default(now())
  updated_at     DateTime      @updatedAt

  session        Session             @relation(fields: [session_id], references: [id])
  guest          User                @relation("GuestBookings", fields: [guest_id], references: [id])
  transactions   WalletTransaction[]
  dispute        Dispute?

  @@index([session_id, status])
  @@index([guest_id])
  @@index([status, expires_at])
  @@map("bookings")
}

model WalletTransaction {
  id              String          @id @default(uuid())
  user_id         String
  booking_id      String?
  withdrawal_id   String?
  type            TransactionType
  amount          Decimal         @db.Decimal(12, 2)
  balance_before  Decimal         @db.Decimal(12, 2)
  balance_after   Decimal         @db.Decimal(12, 2)
  external_ref_id String?         @unique @db.VarChar(100)
  description     String?         @db.VarChar(255)
  created_at      DateTime        @default(now())

  user            User               @relation(fields: [user_id], references: [id])
  booking         Booking?           @relation(fields: [booking_id], references: [id])
  withdrawal      WithdrawalRequest? @relation(fields: [withdrawal_id], references: [id])

  @@index([user_id, created_at])
  @@index([booking_id])
  @@map("wallet_transactions")
}

model Dispute {
  id                      String        @id @default(uuid())
  booking_id              String        @unique
  reporter_id             String
  reporter_role           String        @db.VarChar(10) // 'GUEST' | 'HOST'
  reason                  String        @db.Text
  reporter_lat            Float
  reporter_lng            Float
  reporter_distance_m     Float
  reporter_evidence_url   String        @db.VarChar(500)
  reported_at             DateTime      @default(now())

  respondent_lat          Float?
  respondent_lng          Float?
  respondent_distance_m   Float?
  respondent_evidence_url String?       @db.VarChar(500)
  respondent_note         String?       @db.Text
  responded_at            DateTime?

  status                  DisputeStatus @default(PENDING_REVIEW)
  admin_id                String?
  admin_note              String?       @db.Text
  resolved_at             DateTime?

  booking                 Booking       @relation(fields: [booking_id], references: [id])
  reporter                User          @relation("DisputeReporter", fields: [reporter_id], references: [id])
  admin                   User?         @relation("DisputeAdmin", fields: [admin_id], references: [id])

  @@index([status])
  @@map("disputes")
}

model WithdrawalRequest {
  id                  String           @id @default(uuid())
  user_id             String
  amount              Decimal          @db.Decimal(12, 2)
  bank_name           String           @db.VarChar(100)
  bank_account_number String           @db.VarChar(50)
  bank_account_name   String           @db.VarChar(100)
  status              WithdrawalStatus @default(PENDING)
  admin_note          String?          @db.VarChar(255)
  processed_by        String?
  processed_at        DateTime?
  created_at          DateTime         @default(now())

  user                User                @relation("UserWithdrawals", fields: [user_id], references: [id])
  admin               User?               @relation("AdminWithdrawals", fields: [processed_by], references: [id])
  transactions        WalletTransaction[]

  @@index([user_id, status])
  @@map("withdrawal_requests")
}
```