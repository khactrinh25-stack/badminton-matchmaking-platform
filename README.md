# 🏸 Badminton Matchmaking Platform — Nền tảng Ghép trận Cầu lông Vãng lai

Nền tảng Web App kết nối trực tiếp chủ sân/chủ kèo (**Host**) và người chơi cầu lông tự do (**Guest**), giải quyết triệt để các điểm nghẽn của việc ghép trận thủ công qua mạng xã hội như tìm sân theo vị trí địa lý, kiểm soát chỗ trống thời gian thực, bảo lãnh thanh toán tạm giữ (**Escrow**) và xác thực bằng chứng hiện trường khi xảy ra tranh chấp.

---

## 🎯 Các Quy trình Nghiệp vụ Cốt lõi

Hệ thống được thiết kế xoay quanh **2 quy trình nghiệp vụ nối tiếp nhau**:

1. **Nghiệp vụ 1 — Tổ chức buổi đánh, Ghép trận GPS & Đặt giữ chỗ Tạm giữ (Pre-match):**
   - **Tạo & Tìm sân theo bán kính GPS:** Host khởi tạo buổi đánh với tọa độ bản đồ chuẩn xác, khung giờ, khoảng trình độ (`1.0` – `5.0`) và chọn 1 trong 3 gói chính sách hủy cố định (`FLEXIBLE_6H`, `MODERATE_12H`, `STRICT_24H`). Guest tìm kiếm các buổi đánh xung quanh theo bán kính thực tế tính bằng công thức lượng giác cầu **Haversine** trực tiếp trên PostgreSQL.
   - **Đặt chỗ nguyên tử & Thanh toán Escrow:** Cơ chế *First-come, First-served* được bọc trong `prisma.$transaction` để chống tuyệt đối lỗi đặt trùng chỗ cuối cùng (Overbooking = 0%). Tiền thanh toán qua mã QR (PayOS/VNPay) hoặc số dư khả dụng được khóa vào quỹ tạm giữ trung gian.
   - **Tự động hóa hủy lịch & hoàn tiền:** Áp dụng quy tắc 30 phút ân hạn mặc định (*Cooling-off Period*) hoặc đối chiếu tự động mốc thời gian của gói hủy để hoàn tiền (`100%`, `50%`, hoặc `0%`) về số dư khả dụng của người chơi.

2. **Nghiệp vụ 2 — Điểm danh Hiện trường, Phân xử SOP & Quyết toán Doanh thu (On-site & Post-match):**
   - **Bảo mật liên lạc theo thời gian:** Số điện thoại thật của Host và Guest chỉ được mở khóa hiển thị từ mốc **30 phút trước giờ bắt đầu** cho đến khi kết thúc buổi đánh.
   - **Điểm danh QR chống giả mạo:** Host sử dụng trình quét camera trực tiếp trên trình duyệt (`html5-qrcode`, khóa tải ảnh từ thư viện máy) để quét mã QR đặt chỗ của Guest.
   - **Báo cáo sự cố & Phân xử SOP:** Khi xảy ra tranh chấp tại sân, hệ thống bắt buộc thu thập đồng thời **Tọa độ GPS + Dấu thời gian máy chủ (Server Timestamp) + Ảnh chụp camera sau** đẩy lên Cloudinary. Admin đối chiếu bằng chứng hai chiều và tỷ lệ check-in để ra 1 trong 3 phán quyết chuẩn (`RESOLVED_GUEST_WIN`, `RESOLVED_HOST_WIN`, `RESOLVED_SPLIT`), kết hợp cơ chế tự động khóa tài khoản 14 ngày nếu tích lũy đủ 2 lần vi phạm (*Strike System*).
   - **Quyết toán tự động:** Tiến trình nền (`Cronjob`) tự động giải ngân 100% tiền từ quỹ tạm giữ vào số dư khả dụng của Host sau giờ kết thúc buổi đánh 2 tiếng đối với các đơn không có khiếu nại.

---

## 🛠️ Ngăn xếp Công nghệ & Kiến trúc Hệ thống

Hệ thống được xây dựng theo kiến trúc **Decoupled Client-Server** kết hợp **Modular Monolith 3 lớp** ở phía Backend:

| Thành phần | Công nghệ sử dụng | Vai trò kỹ thuật |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS | Xây dựng giao diện SPA theo hướng Mobile-First. |
| **State & Data Fetching** | TanStack Query (React Query), Zustand | Quản lý bộ nhớ đệm Server State, tự động làm mới chỗ trống và lưu bộ lọc tìm kiếm. |
| **Bản đồ & Phần cứng** | Leaflet (`CustomMapView` Adapter), `html5-qrcode`, `qrcode.react` | Chuẩn hóa tích hợp bản đồ, định vị GPS và quét/sinh mã QR điểm danh. |
| **Backend** | Node.js (v20 LTS), NestJS, TypeScript | Kiến trúc 3 lớp (`Controller` -> `Service` -> `Prisma ORM`), phân quyền JWT & RBAC. |
| **Database & ORM** | PostgreSQL 16, Prisma ORM | Lưu trữ dữ liệu quan hệ, xử lý Interactive Transactions (ACID) và truy vấn Haversine SQL. |
| **Background Jobs & Docs** | `@nestjs/schedule`, `@nestjs/swagger` | Chạy Cronjob giải ngân/mở khóa tài khoản tự động và sinh tài liệu Swagger UI. |
| **Dịch vụ bên thứ ba** | Cloudinary, PayOS / VNPay Sandbox | Lưu trữ ảnh bằng chứng hiện trường và xử lý thanh toán QR qua Webhook Idempotent. |
| **Hạ tầng Dev** | Docker, Docker Compose | Đóng gói và đồng bộ môi trường cơ sở dữ liệu PostgreSQL 16. |

---

## 📂 Cấu trúc Thư mục Dự án

```text
badminton-matchmaking/
├── AGENTS.md                        # Quy tắc kiến trúc & hướng dẫn chuẩn cho AI Coding Agent
├── docker-compose.yml               # Cấu hình khởi chạy PostgreSQL 16 bằng Docker
├── memory-bank/                     # Bộ tài liệu Phân tích, Thiết kế Hệ thống & Đặc tả kỹ thuật
│   ├── productContext.md            # Nghiệp vụ cốt lõi, 19 Functional Requirements & 10 Business Rules
│   ├── systemPatterns.md            # Kiến trúc 3 lớp, Design Patterns & 11 Non-Functional Requirements
│   ├── techContext.md               # Ngăn xếp công nghệ, thư viện & cấu hình biến môi trường
│   ├── data-model.md                # Thiết kế ERD, Enums & mã nguồn chuẩn schema.prisma
│   ├── api-contracts.md             # Đặc tả RESTful API endpoints & cấu trúc JSON Request/Response
│   ├── activeContext.md             # Trạng thái phát triển hiện tại của dự án
│   └── progress.md                  # Lộ trình và tiến độ từng Milestone
├── backend/                         # Mã nguồn API Server (NestJS + Prisma ORM)
│   ├── prisma/                      # Schema định nghĩa CSDL, Migrations & Seed data
│   ├── src/
│   │   ├── common/                  # Guards (JWT, Roles), Decorators, Exception Filters
│   │   └── modules/                 # auth, users, sessions, bookings, disputes, wallets, webhooks, admin, jobs
│   └── .env.example                 # Mẫu biến môi trường cho Backend
└── frontend/                        # Mã nguồn Client Web App (React 18 + Vite + Tailwind CSS)
    ├── src/
    │   ├── components/map/          # CustomMapView Adapter bọc thư viện Leaflet
    │   ├── pages/                   # Các màn hình giao diện theo từng phân hệ
    │   ├── services/                # Cấu hình Axios & TanStack Query hooks
    │   └── stores/                  # Zustand stores
    └── .env.example                 # Mẫu biến môi trường cho Frontend
```

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy Môi trường Phát triển

### 1. Yêu cầu Hệ thống
- **Node.js:** Phiên bản `20 LTS` trở lên.
- **Docker & Docker Compose:** Đã cài đặt Docker Desktop (Windows/macOS) hoặc Docker Engine (Linux).

### 2. Khởi chạy Cơ sở dữ liệu PostgreSQL bằng Docker
Tại thư mục gốc của dự án, khởi chạy container PostgreSQL 16 ở chế độ chạy ngầm:
```bash
docker compose up -d
```
Kiểm tra trạng thái container (đảm bảo trạng thái hiển thị `healthy`):
```bash
docker compose ps
```

### 3. Cài đặt và Chạy Backend (NestJS)
```bash
cd backend

# Tạo tệp cấu hình môi trường từ tệp mẫu
cp .env.example .env

# Cài đặt thư viện phụ thuộc
npm install

# Đồng bộ cấu trúc bảng vào PostgreSQL và sinh Prisma Client
npx prisma migrate dev

# Nạp dữ liệu mẫu (Tài khoản Admin, Host, Guest và các sân mẫu)
npx prisma db seed

# Khởi chạy máy chủ Backend ở chế độ Development (http://localhost:3000)
npm run start:dev
```
> **Tài liệu API (Swagger UI):** Sau khi Backend khởi chạy, truy cập `http://localhost:3000/api/docs` để xem và kiểm thử trực tiếp các endpoint.

### 4. Cài đặt và Chạy Frontend (React + Vite)
Mở một cửa sổ dòng lệnh mới tại thư mục gốc của dự án:
```bash
cd frontend

# Tạo tệp cấu hình môi trường từ tệp mẫu
cp .env.example .env

# Cài đặt thư viện phụ thuộc
npm install

# Khởi chạy giao diện ở chế độ Development (http://localhost:5173)
npm run dev
```

---

## 📖 Tài liệu Thiết kế Chi tiết
Toàn bộ đặc tả yêu cầu chức năng, yêu cầu phi chức năng theo chuẩn **ISO/IEC 25010**, mô hình thực thể kết hợp (**ERD**) và hợp đồng giao tiếp **RESTful API** được lưu trữ đầy đủ trong thư mục [`memory-bank/`](./memory-bank/).