# ACTIVE CONTEXT — Trạng thái Làm việc Hiện tại

**Cập nhật lần cuối:** 2026-11-26  
**Giai đoạn hiện tại:** Đang triển khai **Milestone 3 — Đặt giữ chỗ Escrow & Chính sách Hủy** trên nhánh `feat/bookings-escrow`:
- Backend: Xây dựng `BookingsModule` (`POST /api/bookings` với `prisma.$transaction` chống Race Condition, `GET /api/bookings/my-bookings` kèm `qr_payload`), `WebhooksModule` (`POST /api/webhooks/mock-pay/:bookingId` giả lập thanh toán Idempotent cho Dev/Demo), `JobsModule` (`@Cron(EVERY_MINUTE)` hủy đơn `PENDING_PAYMENT` quá 10 phút + `POST /api/admin/jobs/trigger-expire-bookings` cho Admin kích hoạt thủ công), cài đặt `@nestjs/schedule`, đăng ký `ScheduleModule.forRoot()` trong `AppModule`, `npm run build` Backend thành công.

## 1. Những Nội dung Đã Chốt & Hoàn thành
- **Phân tích & Thiết kế Hệ thống Thông tin (Giai đoạn 1):**
  - Chuẩn hóa hệ thống thành **2 quy trình nghiệp vụ cốt lõi** (Nghiệp vụ 1: Tổ chức buổi đánh, Ghép trận GPS & Đặt giữ chỗ Escrow; Nghiệp vụ 2: Điểm danh QR hiện trường, Phân xử tranh chấp SOP & Quyết toán doanh thu).
  - Chốt 19 Yêu cầu Chức năng (`FR-01` -> `FR-19`), 11 Yêu cầu Phi chức năng (`NFR-01` -> `NFR-11`) và 10 Quy tắc Nghiệp vụ bất biến (`RULE-01` -> `RULE-10`).
- **Hoàn thiện Toàn bộ 7 File Tài liệu cho AI Coding Agent:**
  - `AGENTS.md`: Quy trình đọc/cập nhật ngữ cảnh, cấu trúc thư mục đầy đủ cho cả Backend và Frontend, cùng 6 quy tắc kỹ thuật bắt buộc.
  - `memory-bank/productContext.md`, `memory-bank/systemPatterns.md`, `memory-bank/techContext.md`.
  - `memory-bank/data-model.md`: Chốt mô hình 6 thực thể (`User`, `Session`, `Booking`, `WalletTransaction`, `Dispute`, `WithdrawalRequest`), thang đo trình độ `Float` (`1.0` - `4.0`, 7 cấp độ), toàn bộ bộ giá trị Enum và mã nguồn chuẩn `schema.prisma`.
  - `memory-bank/api-contracts.md`: Chốt danh mục đầy đủ RESTful API endpoints, JSON Request/Response, cơ chế giữ chỗ 10 phút, thanh toán độc lập `WALLET` / `GATEWAY`, ngưỡng GPS 200m khi tranh chấp và khóa Escrow theo từng đơn đặt chỗ.

## 2. Các Quyết định Kỹ thuật Bổ sung Đã Thống nhất (Key Decisions)
1. **Thang đo trình độ:** Lưu kiểu `Float` (`1.0` đến `4.0`, bước nhảy `0.5`, gồm 7 cấp độ: `Newbie`, `Yếu`, `Trung bình yếu`, `Trung bình`, `Trung bình khá`, `Khá`, `Bán chuyên`) trong PostgreSQL; Frontend ánh xạ qua `SKILL_LEVEL_OPTIONS` (`frontend/src/constants/skillLevels.ts`), Backend DTO giới hạn `@Min(1.0)` và `@Max(4.0)`.
2. **Mã QR điểm danh:** Mỗi đơn `Booking` (kể cả đặt nhiều vị trí) sinh 1 mã QR duy nhất chứa `booking.id` (`UUID`).
3. **Bằng chứng tranh chấp hai chiều:** Bảng `Dispute` lưu đồng thời bằng chứng của người khiếu nại (`reporter_*`) và bằng chứng phản hồi đối chứng từ bên còn lại (`respondent_*`) kèm khoảng cách Haversine thực tế tới sân (`<= 200m`).
4. **Thời gian giữ chỗ chờ thanh toán & Phạm vi khóa Escrow:** Đơn `PENDING_PAYMENT` giữ chỗ tối đa 10 phút trước khi Cronjob chuyển sang `EXPIRED`; khi có tranh chấp, hệ thống chỉ khóa giải ngân trên đơn `Booking` bị `DISPUTED`, không khóa cả `Session`.
5. **Webhook Idempotency (NFR-02):** `WebhooksService.confirmPayment()` kiểm tra `booking.status !== PENDING_PAYMENT` hoặc `external_ref_id` đã tồn tại trước khi xử lý, đảm bảo không cộng tiền lần hai.

## 3. Files Đã Tạo / Chỉnh sửa Trong Phiên Này
- `backend/src/modules/bookings/dto/create-booking.dto.ts` (mới)
- `backend/src/modules/bookings/bookings.service.ts` (mới)
- `backend/src/modules/bookings/bookings.controller.ts` (mới)
- `backend/src/modules/bookings/bookings.module.ts` (mới)
- `backend/src/modules/webhooks/webhooks.service.ts` (mới)
- `backend/src/modules/webhooks/webhooks.controller.ts` (mới)
- `backend/src/modules/webhooks/webhooks.module.ts` (mới)
- `backend/src/modules/jobs/jobs.service.ts` (mới)
- `backend/src/modules/jobs/jobs.controller.ts` (mới)
- `backend/src/modules/jobs/jobs.module.ts` (mới)
- `backend/src/app.module.ts` (sửa: thêm `ScheduleModule`, `BookingsModule`, `WebhooksModule`, `JobsModule`)

## 4. Trọng tâm Công việc Tiếp theo (Next Steps — Milestone 3)
1. ~~Backend: Logic đặt vị trí bọc trong `prisma.$transaction` chống Race Condition + Cronjob hủy đơn `PENDING_PAYMENT` quá 10 phút~~ *(Đã hoàn thành)*.
2. Backend + Frontend: Tích hợp tạo mã QR thanh toán PayOS/VNPay Sandbox + Endpoint nhận Webhook (`FR-10`, `NFR-02`) + Nút giả lập thanh toán cho môi trường Dev.
3. Backend + Frontend: Chức năng Guest hủy đặt chỗ tự động tính tiền hoàn (100% / 50% / 0%) theo 30 phút ân hạn và gói hủy (`FR-11`).
4. Backend + Frontend: Chức năng Host hủy buổi đánh trước 2 tiếng & Quản lý số dư / Yêu cầu rút tiền (`FR-07`, `FR-12`).
