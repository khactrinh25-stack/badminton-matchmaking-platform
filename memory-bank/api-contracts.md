# API CONTRACTS — Đặc tả Giao diện Lập trình Ứng dụng (RESTful API)

**Dự án:** Hệ thống Ghép trận Cầu lông Vãng lai (Badminton Matchmaking Platform)  
**Base URL:** `/api`  
**Định dạng trao đổi:** `application/json` (riêng các API tải ảnh hiện trường dùng `multipart/form-data`)

## 1. Quy ước Chung & Các Tham số Kỹ thuật Bổ sung

1. **Xác thực & Phân quyền:**
   - Header bắt buộc cho các endpoint bảo vệ: `Authorization: Bearer <access_token>`.
   - Payload bên trong JWT: `{ sub: string (user_id), phone_number: string, role: 'USER' | 'ADMIN' }`.
2. **Định dạng Phản hồi Lỗi Chuẩn (NestJS Exception Filter):**
   ```json
   {
     "statusCode": 400,
     "errorCode": "ACCOUNT_LOCKED",
     "message": "Tài khoản của bạn đang bị khóa đến 2026-12-01T10:00:00.000Z do vi phạm quy định.",
     "timestamp": "2026-11-17T10:00:00.000Z"
   }
   ```
3. **Các Quy tắc Biên đã Chốt cho Backend Service:**
   - **Thời gian giữ chỗ chờ thanh toán (`PENDING_PAYMENT`):** Tối đa **10 phút** (`expires_at = created_at + 10m`). Cronjob chạy mỗi 1 phút để chuyển đơn quá hạn sang `EXPIRED` và hoàn trả `booked_slots` cho `Session`.
   - **Phương thức thanh toán đặt chỗ:** Chỉ hỗ trợ thanh toán **100% bằng số dư khả dụng (`WALLET`)** hoặc **100% qua mã QR cổng thanh toán (`GATEWAY`)**, không tách thanh toán hỗn hợp.
   - **Ngưỡng sai số GPS hợp lệ tại sân:** **200 mét** (`distance_m <= 200`). Khi nhận báo cáo tranh chấp hoặc bằng chứng đối chứng, Backend dùng công thức Haversine tính khoảng cách từ tọa độ GPS người gửi đến tọa độ `Session`, lưu vào `reporter_distance_m` / `respondent_distance_m` để Admin đánh giá.
   - **Phạm vi khóa giải ngân khi có tranh chấp:** Chỉ khóa giải ngân trên từng `Booking` có trạng thái `DISPUTED`. Các `Booking` khác (`CONFIRMED` hoặc `CHECKED_IN`) trong cùng `Session` vẫn được giải ngân tự động cho Host sau `end_time + 2h`.
   - **Phí nền tảng (Platform Fee):** **0%** ở giai đoạn MVP (Host nhận 100% giá trị giải ngân).
   - **Quy tắc che Số điện thoại (`RULE-07`):** Mọi API trả về thông tin Host hoặc Guest đều che SĐT dạng `090****123`, ngoại trừ: (a) chính chủ tài khoản, (b) `ADMIN`, hoặc (c) người dùng có đơn `CONFIRMED` / `CHECKED_IN` trong buổi đánh đó và thời gian hiện tại nằm trong `[start_time - 30m, end_time]`.

---

## 2. Phân hệ 1: Tài khoản & Định danh (`auth`, `users`)

### 2.1. Đăng ký tài khoản (`FR-01`)
- **Endpoint:** `POST /api/auth/register` | **Auth:** Public
- **Request Body:**
  ```json
  {
    "phone_number": "0901234567",
    "password": "Password123",
    "full_name": "Nguyễn Văn A",
    "skill_level": 3.0
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid-user-1",
      "phone_number": "0901234567",
      "full_name": "Nguyễn Văn A",
      "role": "USER",
      "skill_level": 3.0,
      "available_balance": "0.00",
      "violation_count": 0,
      "is_locked": false
    }
  }
  ```
- **Lỗi nghiệp vụ:** `409 Conflict` (`PHONE_ALREADY_EXISTS`), `400 Bad Request` (SĐT không đúng định dạng 10 số VN).

### 2.2. Đăng nhập (`FR-02`)
- **Endpoint:** `POST /api/auth/login` | **Auth:** Public
- **Request Body:**
  ```json
  {
    "phone_number": "0901234567",
    "password": "Password123"
  }
  ```
- **Response (`200 OK`):** Trả về `{ access_token, user }` tương tự API đăng ký (kèm `locked_until` nếu `is_locked = true`).

### 2.3. Lấy thông tin cá nhân hiện tại (`FR-03`)
- **Endpoint:** `GET /api/users/me` | **Auth:** `USER`, `ADMIN`
- **Response (`200 OK`):** Trả về đầy đủ thông tin `User` (bao gồm `bank_name`, `bank_account_number`, `bank_account_name`, `available_balance`, `violation_count`, `is_locked`, `locked_until`).

### 2.4. Cập nhật trình độ & Thông tin ngân hàng (`FR-03`)
- **Endpoint:** `PATCH /api/users/me` | **Auth:** `USER`
- **Request Body (các trường tùy chọn):**
  ```json
  {
    "full_name": "Nguyễn Văn A",
    "skill_level": 3.5,
    "bank_name": "Vietcombank",
    "bank_account_number": "0071000123456",
    "bank_account_name": "NGUYEN VAN A"
  }
  ```
- **Response (`200 OK`):** Trả về đối tượng `User` sau khi cập nhật.

---

## 3. Phân hệ 2: Quản lý & Tìm kiếm Buổi đánh (`sessions`)

### 3.1. Tạo buổi đánh mới (`FR-04`)
- **Endpoint:** `POST /api/sessions` | **Auth:** `USER`
- **Ràng buộc:** Chặn nếu `user.is_locked === true` (`403 ACCOUNT_LOCKED`). Kiểm tra `cancel_policy` hợp lệ với khoảng cách `start_time - now` (`RULE-05`).
- **Request Body:**
  ```json
  {
    "title": "Giao lưu tối T3 - Sân Cầu lông Gia Định",
    "court_name": "Sân Cầu lông Gia Định",
    "address": "2A Phan Chu Trinh, Bình Thạnh, TP.HCM",
    "court_number": "Sân số 3 & 4",
    "latitude": 10.8031,
    "longitude": 106.6968,
    "start_time": "2026-11-20T19:00:00.000Z",
    "end_time": "2026-11-20T21:00:00.000Z",
    "price_per_slot": 70000,
    "min_skill_level": 2.5,
    "max_skill_level": 4.0,
    "min_players": 4,
    "max_players": 8,
    "cancel_policy": "FLEXIBLE_6H",
    "note": "Cầu Thành Công, bao nước suối."
  }
  ```
- **Response (`201 Created`):** Trả về chi tiết `Session` vừa tạo với `status: "OPEN"`, `booked_slots: 0`.

### 3.2. Tìm kiếm buổi đánh theo bán kính GPS (`FR-05`)
- **Endpoint:** `GET /api/sessions/search` | **Auth:** Public (hoặc `USER`)
- **Query Params:**
  - `lat` (bắt buộc, float): Vĩ độ tâm tìm kiếm.
  - `lng` (bắt buộc, float): Kinh độ tâm tìm kiếm.
  - `radius_km` (tùy chọn, mặc định `10`): Bán kính tìm kiếm tính bằng km.
  - `skill_level` (tùy chọn, float): Lọc các buổi đánh thỏa mãn `min_skill_level <= skill_level <= max_skill_level`.
  - `date` (tùy chọn, `YYYY-MM-DD`): Lọc theo ngày thi đấu.
- **Logic SQL:** Lọc sơ bộ theo Bounding Box + tính khoảng cách bằng công thức Haversine (`prisma.$queryRaw`), chỉ lấy `status = 'OPEN'` và `start_time > NOW()`, sắp xếp tăng dần theo `distance_km`.
- **Response (`200 OK`):**
  ```json
  {
    "items": [
      {
        "id": "uuid-session-1",
        "title": "Giao lưu tối T3 - Sân Cầu lông Gia Định",
        "court_name": "Sân Cầu lông Gia Định",
        "address": "2A Phan Chu Trinh, Bình Thạnh, TP.HCM",
        "latitude": 10.8031,
        "longitude": 106.6968,
        "distance_km": 1.42,
        "start_time": "2026-11-20T19:00:00.000Z",
        "end_time": "2026-11-20T21:00:00.000Z",
        "price_per_slot": "70000.00",
        "min_skill_level": 2.5,
        "max_skill_level": 4.0,
        "booked_slots": 5,
        "max_players": 8,
        "cancel_policy": "FLEXIBLE_6H",
        "host": {
          "id": "uuid-host-1",
          "full_name": "Trần Minh B",
          "skill_level": 3.5
        }
      }
    ]
  }
  ```

### 3.3. Xem chi tiết buổi đánh (`FR-06`, `FR-08`)
- **Endpoint:** `GET /api/sessions/:id` | **Auth:** Optional JWT (nếu có Token sẽ kiểm tra quyền mở khóa SĐT).
- **Response (`200 OK`):**
  ```json
  {
    "id": "uuid-session-1",
    "title": "Giao lưu tối T3 - Sân Cầu lông Gia Định",
    "court_name": "Sân Cầu lông Gia Định",
    "address": "2A Phan Chu Trinh, Bình Thạnh, TP.HCM",
    "court_number": "Sân số 3 & 4",
    "latitude": 10.8031,
    "longitude": 106.6968,
    "start_time": "2026-11-20T19:00:00.000Z",
    "end_time": "2026-11-20T21:00:00.000Z",
    "price_per_slot": "70000.00",
    "min_skill_level": 2.5,
    "max_skill_level": 4.0,
    "min_players": 4,
    "max_players": 8,
    "booked_slots": 5,
    "cancel_policy": "FLEXIBLE_6H",
    "status": "OPEN",
    "note": "Cầu Thành Công, bao nước suối.",
    "is_phone_unlocked": false,
    "host": {
      "id": "uuid-host-1",
      "full_name": "Trần Minh B",
      "phone_number": "090****456",
      "skill_level": 3.5
    },
    "participants": [
      {
        "booking_id": "uuid-booking-1",
        "guest_id": "uuid-guest-1",
        "full_name": "Lê Hoàng C",
        "phone_number": "091****789",
        "skill_level": 3.0,
        "slots_count": 2,
        "status": "CONFIRMED"
      }
    ]
  }
  ```

### 3.4. Lấy danh sách buổi đánh do tôi tổ chức (Host Dashboard)
- **Endpoint:** `GET /api/sessions/my-hosted` | **Auth:** `USER`
- **Response (`200 OK`):** Danh sách các `Session` có `host_id = currentUser.id`, kèm thống kê số đơn `CONFIRMED` và `CHECKED_IN`.

### 3.5. Host hủy buổi đánh hợp lệ do thiếu người (`FR-07`)
- **Endpoint:** `POST /api/sessions/:id/cancel` | **Auth:** `USER` (chỉ Host của buổi đánh)
- **Điều kiện:** `start_time - now >= 2 hours` VÀ `booked_slots < min_players`.
- **Xử lý Transaction:** Chuyển `Session.status = 'CANCELLED'`; chuyển toàn bộ `Booking` đang `CONFIRMED` sang `CANCELLED_BY_HOST`, hoàn **100%** `total_amount` về `available_balance` của từng Guest và ghi `WalletTransaction` (`BOOKING_REFUND`).
- **Response (`200 OK`):** `{ message: "Đã hủy buổi đánh và hoàn tiền 100% cho người chơi.", refunded_bookings: 3 }`.

---

## 4. Phân hệ 3: Đặt chỗ, Thanh toán & Điểm danh QR (`bookings`, `webhooks`)

### 4.1. Khởi tạo đặt chỗ (`FR-09`, `FR-10`)
- **Endpoint:** `POST /api/bookings` | **Auth:** `USER`
- **Request Body:**
  ```json
  {
    "session_id": "uuid-session-1",
    "slots_count": 2,
    "payment_method": "GATEWAY"
  }
  ```
  *(Lưu ý: `payment_method` nhận `"GATEWAY"` hoặc `"WALLET"`)*
- **Xử lý Transaction (`prisma.$transaction`):**
  1. Kiểm tra `user.is_locked === false`, `user.id !== session.host_id`, `session.status === 'OPEN'`, `session.start_time > now`.
  2. Kiểm tra `session.booked_slots + slots_count <= session.max_players` (nếu không đủ trả về `409 Conflict` `INSUFFICIENT_SLOTS`).
  3. Cộng `booked_slots += slots_count` (nếu bằng `max_players`, cập nhật `session.status = 'FULL'`).
  4. Nếu `payment_method === 'WALLET'`: Kiểm tra `available_balance >= total_amount`, trừ `available_balance`, ghi `WalletTransaction` (`BOOKING_PAYMENT_WALLET`), tạo `Booking` với `status = 'CONFIRMED'`, `paid_at = now`.
  5. Nếu `payment_method === 'GATEWAY'`: Tạo `Booking` với `status = 'PENDING_PAYMENT'`, `expires_at = now + 10m`, gọi API PayOS/VNPay lấy `checkout_url` & `qr_code_string`.
- **Response (`201 Created`):**
  ```json
  {
    "booking": {
      "id": "uuid-booking-99",
      "session_id": "uuid-session-1",
      "slots_count": 2,
      "total_amount": "140000.00",
      "payment_method": "GATEWAY",
      "status": "PENDING_PAYMENT",
      "expires_at": "2026-11-17T10:10:00.000Z"
    },
    "payment": {
      "qr_code_url": "https://img.vietqr.io/...",
      "checkout_url": "https://pay.payos.vn/web/..."
    }
  }
  ```

### 4.2. Webhook Xác nhận Thanh toán & Endpoint Giả lập Dev (`FR-10`, `NFR-02`)
- **Endpoint Thật:** `POST /api/webhooks/payment` | **Auth:** Public (xác thực chữ ký PayOS/VNPay)
- **Endpoint Giả lập Demo:** `POST /api/webhooks/mock-pay/:bookingId` | **Auth:** `USER` (chỉ bật khi `ENABLE_MOCK_PAYMENT=true`)
- **Xử lý Idempotent Transaction:**
  1. Nếu `booking.status !== 'PENDING_PAYMENT'` hoặc `external_ref_id` đã tồn tại trong `WalletTransaction` -> trả về `200 OK` ngay lập tức.
  2. Cập nhật `booking.status = 'CONFIRMED'`, `booking.paid_at = now`, `booking.expires_at = null`.
  3. Ghi nhận `WalletTransaction` loại `BOOKING_PAYMENT_GATEWAY` (không cộng vào `available_balance` vì tiền nằm trong quỹ tạm giữ Escrow).
- **Response (`200 OK`):** `{ success: true, booking_status: "CONFIRMED" }`.

### 4.3. Danh sách đơn đặt chỗ của tôi (Guest Bookings & Mã QR) (`FR-13`)
- **Endpoint:** `GET /api/bookings/my-bookings` | **Auth:** `USER`
- **Response (`200 OK`):** Danh sách `Booking` kèm thông tin `Session`, SĐT của Host (tự động mở khóa nếu nằm trong `[start_time - 30m, end_time]`), và chuỗi `qr_payload` (chính là `booking.id`) để Frontend render mã QR qua `qrcode.react`.

### 4.4. Guest hủy đặt chỗ & Hoàn tiền tự động (`FR-11`)
- **Endpoint:** `POST /api/bookings/:id/cancel` | **Auth:** `USER` (chỉ Guest sở hữu đơn)
- **Điều kiện:** `booking.status === 'CONFIRMED'` và `now < session.start_time`.
- **Logic tính tỷ lệ hoàn (`RULE-01` đến `RULE-04`):**
  1. Kiểm tra Cooling-off: Nếu `(now - paid_at <= 30 phút)` **VÀ** `(start_time - now >= 2 giờ)` -> Hoàn **100%** cho Guest.
  2. Ngược lại, đối chiếu `session.cancel_policy` (`FLEXIBLE_6H`, `MODERATE_12H`, `STRICT_24H`) với `start_time - now` -> Hoàn **100%** cho Guest, hoặc **50% Guest / 50% Host**, hoặc **0% Guest / 100% Host**.
- **Xử lý Transaction:** Cập nhật `booking.status = 'CANCELLED_BY_GUEST'`, giảm `session.booked_slots -= booking.slots_count` (chuyển `session.status` từ `FULL` về `OPEN` nếu còn trước `start_time`), cộng `available_balance` và ghi `WalletTransaction` (`BOOKING_REFUND` / `SESSION_PAYOUT`).
- **Response (`200 OK`):**
  ```json
  {
    "message": "Hủy đặt chỗ thành công.",
    "refund_percentage": 100,
    "refunded_amount": "140000.00"
  }
  ```

### 4.5. Host quét mã QR điểm danh hiện trường (`FR-14`)
- **Endpoint:** `POST /api/bookings/:id/check-in` | **Auth:** `USER` (chỉ Host của `Session` chứa đơn này)
- **Điều kiện:** `booking.status === 'CONFIRMED'` và thời gian hiện tại nằm trong `[start_time - 30 phút, end_time]`.
- **Response (`200 OK`):**
  ```json
  {
    "message": "Điểm danh thành công!",
    "booking_id": "uuid-booking-99",
    "guest_name": "Lê Hoàng C",
    "slots_count": 2,
    "checked_in_at": "2026-11-20T18:52:10.000Z"
  }
  ```

---

## 5. Phân hệ 4: Báo cáo Tranh chấp Hiện trường (`disputes`)

### 5.1. Gửi báo cáo sự cố hiện trường (`FR-15`)
- **Endpoint:** `POST /api/disputes` | **Auth:** `USER` (Guest sở hữu `booking_id` hoặc Host của buổi đánh đó)
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `booking_id` (UUID)
  - `reason` (string, mô tả sự cố)
  - `lat` (float, GPS hiện tại)
  - `lng` (float, GPS hiện tại)
  - `evidence_image` (File ảnh từ camera sau `capture="environment"`)
- **Điều kiện:** `booking.status` đang là `CONFIRMED` hoặc `CHECKED_IN`, thời gian hiện tại nằm trong `[start_time - 15 phút, end_time + 2 giờ]`.
- **Xử lý:** Upload ảnh lên Cloudinary -> tính khoảng cách Haversine `reporter_distance_m` tới tọa độ sân -> lưu `Dispute` với `reported_at = new Date()` (Server Timestamp) -> cập nhật `booking.status = 'DISPUTED'`.
- **Response (`201 Created`):** Trả về chi tiết `Dispute` với `status: "PENDING_REVIEW"`.

### 5.2. Gửi bằng chứng phản hồi đối chứng (`FR-15`, `FR-16`)
- **Endpoint:** `POST /api/disputes/:id/respond` | **Auth:** `USER` (bên còn lại trong tranh chấp)
- **Content-Type:** `multipart/form-data`
- **Form Fields:** `note` (string), `lat` (float), `lng` (float), `evidence_image` (File ảnh chụp camera sau).
- **Xử lý:** Upload ảnh lên Cloudinary -> tính `respondent_distance_m` -> cập nhật các cột `respondent_*` và `responded_at = new Date()` trên bản ghi `Dispute`.
- **Response (`200 OK`):** Trả về đối tượng `Dispute` đã cập nhật.

---

## 6. Phân hệ 5: Quản lý Ví, Rút tiền & Quản trị Admin (`wallets`, `admin`)

### 6.1. Xem lịch sử biến động số dư & Số dư tạm giữ (`FR-12`)
- **Endpoint:** `GET /api/wallets/summary` | **Auth:** `USER`
- **Response (`200 OK`):**
  ```json
  {
    "available_balance": "350000.00",
    "escrow_held_amount": "140000.00",
    "transactions": [
      {
        "id": "uuid-tx-1",
        "type": "SESSION_PAYOUT",
        "amount": "280000.00",
        "balance_before": "70000.00",
        "balance_after": "350000.00",
        "description": "Giải ngân buổi đánh Giao lưu tối T3",
        "created_at": "2026-11-16T23:05:00.000Z"
      }
    ]
  }
  ```

### 6.2. Tạo yêu cầu rút tiền (`FR-12`)
- **Endpoint:** `POST /api/wallets/withdrawals` | **Auth:** `USER`
- **Request Body:** `{ "amount": 200000 }` (yêu cầu user đã cập nhật thông tin ngân hàng trong hồ sơ và `amount >= 50000`).
- **Xử lý Transaction:** Trừ ngay `available_balance -= amount`, ghi `WalletTransaction` (`WITHDRAWAL_DEDUCT`), tạo `WithdrawalRequest` (`PENDING`).
- **Response (`201 Created`):** Chi tiết `WithdrawalRequest`.

### 6.3. Admin lấy danh sách tranh chấp & Tỷ lệ check-in (`FR-16`)
- **Endpoint:** `GET /api/admin/disputes` | **Auth:** `ADMIN`
- **Query Params:** `status` (mặc định `PENDING_REVIEW`).
- **Response (`200 OK`):** Danh sách hồ sơ tranh chấp kèm thông tin buổi đánh, ảnh bằng chứng hai bên, cờ hợp lệ GPS (`distance_m <= 200`) và trường tính toán `session_checkin_rate` (tỷ lệ `%` số người đã `CHECKED_IN` trong buổi đánh đó để Admin đối chiếu SOP).

### 6.4. Admin ra phán quyết tranh chấp theo SOP (`FR-16`, `FR-19`)
- **Endpoint:** `POST /api/admin/disputes/:id/resolve` | **Auth:** `ADMIN`
- **Request Body:**
  ```json
  {
    "decision": "RESOLVED_GUEST_WIN",
    "admin_note": "Tỷ lệ check-in 0%, Guest có mặt tại sân đúng giờ, Host không phản hồi."
  }
  ```
  *(Giá trị `decision`: `"RESOLVED_GUEST_WIN"` | `"RESOLVED_HOST_WIN"` | `"RESOLVED_SPLIT"`)*
- **Xử lý Transaction (`RULE-09` & `RULE-10`):**
  1. Cập nhật `Dispute.status = decision`, `admin_id`, `admin_note`, `resolved_at = now`; cập nhật `Booking.status = 'SETTLED'`, `settled_at = now`.
  2. Phân bổ dòng tiền từ Escrow (`BOOKING_REFUND` / `SESSION_PAYOUT`) theo tỷ lệ `100/0`, `0/100`, hoặc `50/50`.
  3. Nếu `decision` là `RESOLVED_GUEST_WIN` (Host thua) hoặc `RESOLVED_HOST_WIN` (Guest thua): tăng `violation_count += 1` cho bên thua. Nếu `violation_count >= 2`, đặt `is_locked = true` và `locked_until = now + 14 days`.
- **Response (`200 OK`):** `{ message: "Đã hoàn tất phân xử tranh chấp.", decision: "RESOLVED_GUEST_WIN" }`.

### 6.5. Admin duyệt / từ chối yêu cầu rút tiền (`FR-17`)
- **Endpoint:** `GET /api/admin/withdrawals` & `PATCH /api/admin/withdrawals/:id` | **Auth:** `ADMIN`
- **Request Body (`PATCH`):** `{ "action": "APPROVE" | "REJECT", "admin_note": "Đã chuyển khoản VCB" }`
- **Xử lý:** Nếu `APPROVE` -> `status = 'COMPLETED'`. Nếu `REJECT` -> `status = 'REJECTED'`, hoàn lại `amount` vào `user.available_balance` và ghi `WalletTransaction` (`WITHDRAWAL_REFUND`).

### 6.6. Admin kích hoạt thủ công Cronjob phục vụ Demo (`FR-18`, `FR-19`)
- **Endpoint 1:** `POST /api/admin/jobs/trigger-escrow-release` | **Auth:** `ADMIN` -> Chạy ngay logic giải ngân cho các `Booking` có `status IN ('CONFIRMED', 'CHECKED_IN')` mà `session.end_time + 2h <= now`.
- **Endpoint 2:** `POST /api/admin/jobs/trigger-unlock-users` | **Auth:** `ADMIN` -> Chạy ngay logic mở khóa cho các `User` có `is_locked = true` và `locked_until <= now` (đặt `is_locked = false`, `violation_count = 0`, `locked_until = null`).