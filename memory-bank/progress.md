# PROGRESS — Bảng Theo dõi Tiến độ Dự án

**Dự án:** Hệ thống Ghép trận Cầu lông Vãng lai (Badminton Matchmaking Platform)

## Giai đoạn 1: Phân tích & Thiết kế Hệ thống Thông tin (Môn PTTK HTTT)
- [x] Khảo sát hiện trạng hệ thống ghép trận truyền thống (As-Is) và xác định điểm nghẽn công nghệ trên cả 2 quy trình nghiệp vụ cốt lõi.
- [x] Thiết kế lại 2 quy trình nghiệp vụ cải tiến (To-Be) và xây dựng 4 sơ đồ chuẩn BPMN 2.0 trên SAP PowerDesigner.
- [x] Đặc tả chi tiết 19 Yêu cầu Chức năng (`FR-01` -> `FR-19`), 11 Yêu cầu Phi chức năng (`NFR-01` -> `NFR-11`) và Kiến trúc Hệ thống 3 lớp.
- [x] Khởi tạo và đồng bộ bộ tài liệu Memory Bank nền tảng (`AGENTS.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`).
- [x] Hoàn thiện đặc tả Cơ sở dữ liệu vật lý, Enums và mã nguồn `schema.prisma` chuẩn trong `memory-bank/data-model.md`.
- [x] Hoàn thiện đặc tả RESTful API, JSON Request/Response và các quy tắc biên trong `memory-bank/api-contracts.md`.

## Giai đoạn 2: Xây dựng Cơ sở Dữ liệu & Khung Dự án (Milestone 1)
- [x] Khởi tạo dự án Backend NestJS + Cấu hình Prisma ORM kết nối PostgreSQL.
- [x] Đưa `schema.prisma` từ `memory-bank/data-model.md` vào `backend/prisma/schema.prisma` và chạy Migration đầu tiên.
- [x] Viết dữ liệu mẫu (`backend/prisma/seed.ts`) gồm tài khoản Admin, Host, Guest và các sân cầu lông mẫu tại TP.HCM.
- [x] Khởi tạo dự án Frontend React 18 + Vite + TypeScript + Tailwind CSS + TanStack Query + Zustand.

## Giai đoạn 3: Nền tảng Tài khoản & Nghiệp vụ 1 — Tạo sân, Tìm sân GPS (Milestone 2)
- [x] Backend: API Đăng ký (SĐT Unique + bcrypt), Đăng nhập JWT, Guards phân quyền `USER`/`ADMIN`, Cập nhật hồ sơ & trình độ (`FR-01` -> `FR-03`).
- [x] Frontend: Xây dựng `CustomMapView` Adapter bọc thư viện Leaflet + tìm kiếm địa chỉ Nominatim/Goong (`NFR-10`).
- [x] Backend + Frontend: Chức năng Tạo buổi đánh mới (`FR-04`) kèm kiểm tra khóa tự động các gói thời gian hủy (`FLEXIBLE_6H`, `MODERATE_12H`, `STRICT_24H`).
- [x] Backend + Frontend: Truy vấn tìm kiếm buổi đánh theo bán kính GPS bằng công thức Haversine SQL (`FR-05`, `NFR-06`) và xem chi tiết sân (`FR-06`).

## Giai đoạn 4: Hoàn thiện Nghiệp vụ 1 — Đặt giữ chỗ Escrow & Chính sách Hủy (Milestone 3)
- [x] Backend: Logic đặt vị trí bọc trong `prisma.$transaction` chống Race Condition + Cronjob hủy đơn `PENDING_PAYMENT` quá 10 phút (`FR-09`, `NFR-01`).
- [x] Backend + Frontend: Tích hợp tạo mã QR thanh toán PayOS/VNPay Sandbox + Endpoint nhận Webhook (`FR-10`, `NFR-02`) + Nút giả lập thanh toán cho môi trường Dev.
- [ ] Backend + Frontend: Chức năng Guest hủy đặt chỗ tự động tính tiền hoàn (100% / 50% / 0%) theo 30 phút ân hạn (Cooling-off) và gói hủy của buổi đánh (`FR-11`).
- [ ] Backend + Frontend: Chức năng Host hủy buổi đánh trước 2 tiếng khi chưa đủ người tối thiểu (`FR-07`) và Quản lý số dư / Yêu cầu rút tiền (`FR-12`).

## Giai đoạn 5: Nghiệp vụ 2 — Điểm danh QR, Báo cáo Hiện trường & Phân xử SOP (Milestone 4)
- [ ] Backend + Frontend: Logic ẩn/hiện SĐT liên lạc (`<a href="tel:...">`) đúng 30 phút trước giờ bắt đầu (`FR-08`, `NFR-05`).
- [ ] Frontend + Backend: Hiển thị mã QR đặt chỗ của Guest (`FR-13`) và màn hình Host quét QR bằng luồng camera trực tiếp trên `html5-qrcode` (`FR-14`, `NFR-04`).
- [ ] Frontend + Backend: Chức năng gửi Báo cáo sự cố hiện trường & Phản hồi đối chứng thu thập đồng thời GPS + Server Timestamp + Ảnh chụp camera sau (`capture="environment"`) đẩy lên Cloudinary (`FR-15`).
- [ ] Backend + Frontend (Admin): Trang quản trị phân xử tranh chấp theo 3 phán quyết SOP (`FR-16`), cộng gậy phạt Strike & khóa tài khoản 14 ngày (`FR-19`), duyệt rút tiền (`FR-17`) và Cronjob giải ngân tự động (`FR-18`).