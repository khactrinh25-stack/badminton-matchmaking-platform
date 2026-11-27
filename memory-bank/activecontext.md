# ACTIVE CONTEXT — Trạng thái Làm việc Hiện tại

**Cập nhật lần cuối:** 2026-11-27
**Giai đoạn hiện tại:** Hoàn thành **Milestone 3** trên nhánh `feat/host-cancel-wallet-withdrawal` (chưa commit, đã kiểm thử thực tế đạt 100%, chờ commit & push):
- **Lượt 1 (`FR-07`) — Host hủy buổi đánh:** `POST /api/sessions/:id/cancel` kiểm tra cách giờ bắt đầu `>= 2h` và `booked_slots < min_players`, chuyển `Session` sang `CANCELLED`, hoàn 100% cho Guest với `BOOKING_REFUND` trong `prisma.$transaction`; Frontend có `HostManageSessionPage.tsx` tại `/sessions/host` kèm xác nhận và invalidate query liên quan.
- **Lượt 2 (`FR-12`) — Quản lý số dư / Rút tiền:** `GET /api/wallets/summary` và `POST /api/wallets/withdrawals` theo đúng hợp đồng; Frontend có route `/wallet` và mục điều hướng "Ví".
- Kiểm chứng: `npm run build` thành công ở cả `backend/` và `frontend/` (frontend chỉ còn cảnh báo chunk > 500 kB cũ). Không đụng schema/migration; không commit, push hay merge.

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
8. **Host hủy buổi đánh (`FR-07`):** Chỉ hủy khi `start_time - now >= 2h` và `booked_slots < min_players`; `session.updateMany({ where: { id, status: OPEN } })` đóng vai trò claim chống double-cancel, hoàn 100% `total_amount` cho từng Guest trong cùng transaction.
9. **`escrow_held_amount` (`FR-12`):** Dùng **một** `booking.aggregate` với `status IN (CONFIRMED, CHECKED_IN, DISPUTED)` và `OR: [{ guest_id: userId }, { session: { host_id: userId } }]` để mỗi `Booking` chỉ được cộng đúng 1 lần dù người dùng vừa là Guest vừa là Host.
10. **Tạo lệnh rút tiền (`FR-12`):** Trừ số dư an toàn bằng `user.updateMany({ where: { id, available_balance: { gte: amount } }, data: { available_balance: { decrement: amount } } })`, chỉ tiếp tục khi `count === 1`; tạo `WithdrawalRequest` (`PENDING`) trước rồi ghi `WalletTransaction` (`WITHDRAWAL_DEDUCT`, kèm `withdrawal_id`); `balance_before = balance_after + amount`. Ngưỡng tối thiểu 50.000 VNĐ do DTO (`@Min`) và service cùng kiểm tra; thiếu 3 trường ngân hàng -> `BANK_INFO_REQUIRED`. Giữ nguyên JSON contract (không thêm field/endpoint), lịch sử rút tiền suy từ `transactions` và kết quả mutation; UI chỉ hiển thị `message`, không hiển thị `errorCode`.

## 3. Files Đã Tạo / Chỉnh sửa Trong Phiên Này
- **Lượt 1 (`FR-07`):** `backend/src/modules/sessions/sessions.service.ts`, `backend/src/modules/sessions/sessions.controller.ts`, `frontend/src/services/sessionService.ts`, `frontend/src/pages/sessions/HostManageSessionPage.tsx`, `frontend/src/pages/sessions/SessionDetailPage.tsx`, `frontend/src/App.tsx`, `frontend/src/components/layout/AppLayout.tsx` (đều còn uncommitted trên nhánh hiện tại).
- **Lượt 2 (`FR-12`) — Backend:** `backend/src/app.module.ts` (đăng ký `WalletsModule`), `backend/src/modules/wallets/wallets.module.ts`, `wallets.controller.ts`, `wallets.service.ts`, `dto/create-withdrawal.dto.ts` (4 tệp mới).
- **Lượt 2 (`FR-12`) — Frontend:** `frontend/src/services/walletService.ts`, `frontend/src/pages/wallet/WalletPage.tsx` (2 tệp mới), `frontend/src/App.tsx`, `frontend/src/components/layout/AppLayout.tsx` (thêm route `/wallet` và nav "Ví");
- **Memory Bank:** `memory-bank/progress.md` (đánh dấu `[x]` dòng FR-07/FR-12), `memory-bank/activecontext.md` (trạng thái mới nhất).

## 4. Trọng tâm Công việc Tiếp theo (Next Steps)
1. ~~Backend: Logic đặt vị trí bọc trong `prisma.$transaction` chống Race Condition + Cronjob hủy đơn `PENDING_PAYMENT` quá 10 phút~~ *(Đã hoàn thành)*.
2. ~~Backend + Frontend: Tích hợp tạo mã QR thanh toán PayOS/VNPay Sandbox + Endpoint nhận Webhook (`FR-10`, `NFR-02`) + Nút giả lập thanh toán cho môi trường Dev~~ *(Đã hoàn thành ở chế độ fallback mock; webhook thật trả 503 khi chưa có khóa)*.
3. ~~Backend + Frontend: Chức năng Guest hủy đặt chỗ tự động tính tiền hoàn (100% / 50% / 0%) theo 30 phút ân hạn và gói hủy (`FR-11`)~~ *(Đã hoàn thành)*.
4. ~~Backend + Frontend: Host hủy buổi đánh trước 2 tiếng (`FR-07`) và Quản lý số dư / Yêu cầu rút tiền (`FR-12`)~~ *(Đã hoàn thành cả 2 lượt; build xanh cả backend/frontend)*.
5. **Hiện tại:** Đã kiểm thử thực tế đạt 100% (API + UI `/wallet`, `/sessions/host`); commit theo Conventional Commits rồi push nhánh `feat/host-cancel-wallet-withdrawal`; **không merge**. Tiếp theo là Milestone 4 (`FR-08`, `FR-13` → `FR-19`).
