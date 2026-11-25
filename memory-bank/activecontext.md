# ACTIVE CONTEXT — Trạng thái Làm việc Hiện tại

**Cập nhật lần cuối:** 2026-11-25  
**Giai đoạn hiện tại:** Đã hoàn tất **Bước 3: Nền tảng Frontend Auth & Profile** trên nhánh `feat/frontend-auth` — Cài đặt `react-router-dom`, `@tanstack/react-query`, `zustand`, `axios`, `lucide-react`, cấu hình Tailwind CSS, xây dựng Axios interceptor (`VITE_API_URL` + JWT + xử lý `401`), `useAuthStore`, `ProtectedRoute`, 3 trang (`LoginPage`, `RegisterPage`, `ProfilePage`) và `npm run build` Frontend thành công.

## 1. Những Nội dung Đã Chốt & Hoàn thành
- **Phân tích & Thiết kế Hệ thống Thông tin (Giai đoạn 1):**
  - Chuẩn hóa hệ thống thành **2 quy trình nghiệp vụ cốt lõi** (Nghiệp vụ 1: Tổ chức buổi đánh, Ghép trận GPS & Đặt giữ chỗ Escrow; Nghiệp vụ 2: Điểm danh QR hiện trường, Phân xử tranh chấp SOP & Quyết toán doanh thu).
  - Chốt 19 Yêu cầu Chức năng (`FR-01` -> `FR-19`), 11 Yêu cầu Phi chức năng (`NFR-01` -> `NFR-11`) và 10 Quy tắc Nghiệp vụ bất biến (`RULE-01` -> `RULE-10`).
- **Hoàn thiện Toàn bộ 7 File Tài liệu cho AI Coding Agent:**
  - `AGENTS.md`: Quy trình đọc/cập nhật ngữ cảnh, cấu trúc thư mục đầy đủ cho cả Backend và Frontend, cùng 6 quy tắc kỹ thuật bắt buộc.
  - `memory-bank/productContext.md`, `memory-bank/systemPatterns.md`, `memory-bank/techContext.md`.
  - `memory-bank/data-model.md`: Chốt mô hình 6 thực thể (`User`, `Session`, `Booking`, `WalletTransaction`, `Dispute`, `WithdrawalRequest`), thang đo trình độ `Float` (`1.0` - `5.0`), toàn bộ bộ giá trị Enum và mã nguồn chuẩn `schema.prisma`.
  - `memory-bank/api-contracts.md`: Chốt danh mục đầy đủ RESTful API endpoints, JSON Request/Response, cơ chế giữ chỗ 10 phút, thanh toán độc lập `WALLET` / `GATEWAY`, ngưỡng GPS 200m khi tranh chấp và khóa Escrow theo từng đơn đặt chỗ.

## 2. Các Quyết định Kỹ thuật Bổ sung Đã Thống nhất (Key Decisions)
1. **Thang đo trình độ:** Lưu kiểu `Float` (`1.0` đến `5.0`, bước nhảy `0.5`) trong PostgreSQL; Frontend ánh xạ sang nhãn tiếng Việt.
2. **Mã QR điểm danh:** Mỗi đơn `Booking` (kể cả đặt nhiều vị trí) sinh 1 mã QR duy nhất chứa `booking.id` (`UUID`).
3. **Bằng chứng tranh chấp hai chiều:** Bảng `Dispute` lưu đồng thời bằng chứng của người khiếu nại (`reporter_*`) và bằng chứng phản hồi đối chứng từ bên còn lại (`respondent_*`) kèm khoảng cách Haversine thực tế tới sân (`<= 200m`).
4. **Thời gian giữ chỗ chờ thanh toán & Phạm vi khóa Escrow:** Đơn `PENDING_PAYMENT` giữ chỗ tối đa 10 phút trước khi Cronjob chuyển sang `EXPIRED`; khi có tranh chấp, hệ thống chỉ khóa giải ngân trên đơn `Booking` bị `DISPUTED`, không khóa cả `Session`.

## 3. Trọng tâm Công việc Tiếp theo (Next Steps — Milestone 1)
1. ~~Cài đặt Prisma ORM, viết `backend/prisma/schema.prisma`, chạy `npx prisma migrate dev --name init` và `backend/prisma/seed.ts`~~ *(Đã hoàn thành: cài `@prisma/client@^5.22.0`, `prisma@^5.22.0`, `bcrypt`, `@types/bcrypt`; chạy migration `20261125095957_init`; nạp 1 Admin `0900000001`, 2 Host `0901000001`/`0901000002`, 3 Guest `0902000001`-`0902000003`, 3 buổi đánh tại TP.HCM; `npm run build` thành công).*
2. ~~Xây dựng nền tảng Backend Auth & Users (`FR-01` -> `FR-03`)~~ *(Đã hoàn thành trên nhánh `feat/auth-users`: cài `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `class-validator`, `class-transformer`, `@nestjs/swagger`, `@types/passport-jwt`; cấu hình global prefix `/api`, CORS, `ValidationPipe(whitelist, transform)`, `HttpExceptionFilter` và Swagger UI `/api/docs` trong `backend/src/main.ts`; tạo `PrismaModule`, `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`, `AuthModule` (`POST /api/auth/register`, `POST /api/auth/login`), `UsersModule` (`GET /api/users/me`, `PATCH /api/users/me`); `npm run build` thành công).*
3. ~~Khởi tạo thư mục `frontend/` bằng Vite (`react-ts`), cài đặt Tailwind CSS, React Router DOM, TanStack Query, Zustand, `axios` và `lucide-react`; xây dựng Axios client, Auth store và 3 trang Đăng nhập, Đăng ký, Hồ sơ cá nhân~~ *(Đã hoàn thành trên nhánh `feat/frontend-auth`: cấu hình `tailwind.config.js`, `postcss.config.js`, `src/services/api.ts`, `src/stores/authStore.ts`, `src/components/auth/ProtectedRoute.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`, `ProfilePage.tsx`; `npm run build` thành công).*
4. Tiếp tục phát triển các phân hệ Backend tiếp theo (`sessions`, `bookings`, `disputes`, `wallets`, `admin`), cài đặt thư viện bản đồ/QR (`react-leaflet`, `html5-qrcode`, `qrcode.react`) và xây dựng `CustomMapView` Adapter ở Frontend.