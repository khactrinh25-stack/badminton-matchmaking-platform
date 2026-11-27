# ACTIVE CONTEXT — Trạng thái Làm việc Hiện tại

**Cập nhật lần cuối:** 2026-11-27
**Giai đoạn hiện tại:** Hoàn thành bước thứ ba của **Milestone 3** — hủy đặt chỗ tự động hoàn tiền (`FR-11`) trên nhánh `feat/guest-booking-cancellation` (chưa commit):
- Backend: `POST /api/bookings/:id/cancel` tính hoàn 100% / 50% / 0% theo ân hạn 30 phút và 3 gói hủy, ghi `BOOKING_REFUND` / `SESSION_PAYOUT` trong `prisma.$transaction`, chặn double-cancel, trả chỗ về `Session`; `npm run build` backend thành công.
- Frontend: Trang `/bookings` có nút "Hủy đặt chỗ" kèm xác nhận, hiển thị chính sách hủy thân thiện và thông báo tỷ lệ/số tiền hoàn; TanStack Query invalidate danh sách đơn và chi tiết sân; `npm run build` frontend thành công.
- Kiểm chứng: lint backend chỉ còn 1 warning cũ; lint frontend còn 4 lỗi cũ ở `CustomMapView.tsx`/`CreateSessionPage.tsx`, không phát sinh từ bước này.

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
6. **Thanh toán Demo:** Không có khóa PayOS thật; `qr_code_url` là `booking.id`, `checkout_url = null`, luồng webhook thật trả `PAYMENT_GATEWAY_NOT_CONFIGURED`. Chỉ bổ sung xác thực chữ ký khi có khóa.
7. **Hủy đặt chỗ của Guest (`FR-11`):** Ưu tiên ân hạn 30 phút nếu `now - paid_at <= 30p` và cách giờ đánh `>= 2h`; ngược lại đối chiếu mốc `6/2`, `12/4`, `24/12` giờ. Phần không hoàn cho Guest (50% hoặc 100%) được ghi `SESSION_PAYOUT` cho Host trong cùng `prisma.$transaction` với `BOOKING_REFUND`.

## 3. Files Đã Tạo / Chỉnh sửa Trong Phiên Này
- `backend/src/modules/bookings/bookings.service.ts` (sửa: thêm `cancelBooking()` với tính hoàn/giải ngân trong transaction)
- `backend/src/modules/bookings/bookings.controller.ts` (sửa: thêm `POST /api/bookings/:id/cancel`)
- `frontend/src/services/bookingService.ts` (sửa: thêm `cancelBooking()` và kiểu phản hồi hoàn tiền)
- `frontend/src/pages/bookings/MyBookingsPage.tsx` (sửa: nút hủy, xác nhận, thông báo kết quả và đồng hồ cập nhật trạng thái)
- `memory-bank/progress.md` (cập nhật: hoàn thành bước FR-11)
- `memory-bank/activeContext.md` (cập nhật: trạng thái mới nhất sau build)

## 4. Trọng tâm Công việc Tiếp theo (Next Steps — Milestone 3)
1. ~~Backend: Logic đặt vị trí bọc trong `prisma.$transaction` chống Race Condition + Cronjob hủy đơn `PENDING_PAYMENT` quá 10 phút~~ *(Đã hoàn thành)*.
2. ~~Backend + Frontend: Tích hợp tạo mã QR thanh toán PayOS/VNPay Sandbox + Endpoint nhận Webhook (`FR-10`, `NFR-02`) + Nút giả lập thanh toán cho môi trường Dev~~ *(Đã hoàn thành ở chế độ fallback mock; webhook thật trả 503 khi chưa có khóa)*.
3. ~~Backend + Frontend: Chức năng Guest hủy đặt chỗ tự động tính tiền hoàn (100% / 50% / 0%) theo 30 phút ân hạn và gói hủy (`FR-11`)~~ *(Đã hoàn thành: transaction hoàn/giải ngân 100/50/0, UI nút hủy và thông báo kết quả)*.
4. Backend + Frontend: Chức năng Host hủy buổi đánh trước 2 tiếng & Quản lý số dư / Yêu cầu rút tiền (`FR-07`, `FR-12`).
