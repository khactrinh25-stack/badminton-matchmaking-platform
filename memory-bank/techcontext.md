# TECH CONTEXT — Ngăn xếp Công nghệ, Thư viện & Cấu hình Môi trường

**Dự án:** Hệ thống Ghép trận Cầu lông Vãng lai (Badminton Matchmaking Platform)

## 1. Ngăn xếp Công nghệ (Tech Stack Matrix)

| Thành phần | Công nghệ / Thư viện | Phiên bản khuyến nghị | Mục đích sử dụng trong dự án |
| :--- | :--- | :--- | :--- |
| **Frontend Core** | React + Vite + TypeScript | React `^18.2.0`, Vite `^5.x` | Xây dựng Single Page Application (SPA) tốc độ cao, kiểm tra kiểu tĩnh. |
| **Styling** | Tailwind CSS + Lucide React | `^3.4.x` | Thiết kế giao diện Mobile-First tối ưu thao tác tại sân cầu lông. |
| **Routing** | React Router DOM | `^6.x` | Điều hướng trang phía Client và bảo vệ Route theo vai trò (`USER` / `ADMIN`). |
| **Server State** | TanStack Query (`@tanstack/react-query`) | `^5.x` | Quản lý gọi API, caching và tự động làm mới số lượng chỗ trống theo chu kỳ. |
| **Client State** | Zustand | `^4.5.x` | Lưu trữ bộ lọc tìm kiếm (bán kính, trình độ, giờ) và tọa độ GPS tạm thời. |
| **Bản đồ (Map)** | Leaflet + `react-leaflet` + Nominatim / Goong | Leaflet `^1.9.x` | Hiển thị bản đồ, chọn ghim sân và tìm kiếm địa chỉ thông qua `CustomMapView` Adapter. |
| **QR & Camera** | `html5-qrcode` + `qrcode.react` | `^2.3.x` | Sinh mã QR đặt chỗ cho Guest và quét QR trực tiếp bằng camera trên máy Host. |
| **Backend Core** | Node.js + NestJS + TypeScript | Node `>=20 LTS`, NestJS `^10.x` | Xây dựng RESTful API theo kiến trúc phân tầng 3 lớp. |
| **Database & ORM** | PostgreSQL + Prisma ORM | PostgreSQL `15/16`, Prisma `^5.x` | Lưu trữ dữ liệu quan hệ, xử lý Interactive Transactions và truy vấn Haversine SQL. |
| **Auth & Security** | `@nestjs/jwt`, `passport-jwt`, `bcrypt` | Chuẩn NestJS `^10.x` | Xác thực Access Token, phân quyền `RolesGuard` và băm mật khẩu người dùng. |
| **Background Jobs** | `@nestjs/schedule` | `^4.x` | Chạy Cronjob tự động giải ngân tiền tạm giữ (Escrow) và mở khóa tài khoản hết hạn phạt. |
| **API Docs & Validation** | `@nestjs/swagger`, `class-validator`, `class-transformer` | Chuẩn NestJS `^10.x` | Kiểm tra dữ liệu đầu vào DTO và tự động sinh giao diện tài liệu Swagger UI. |
| **Upload & Cloud Storage** | `multer` + `cloudinary` | `^1.4.x` / `^2.x` | Nhận ảnh chụp hiện trường từ camera sau và tải lên Cloudinary lấy URL. |
| **Payment Gateway** | PayOS SDK (`@payos/node`) hoặc VNPay Sandbox | Môi trường Sandbox / Dev | Tạo mã QR thanh toán đơn đặt chỗ và nhận kết quả tự động qua Webhook. |

## 2. Mẫu Cấu hình Biến Môi trường (`.env.example`)

### 2.1. Backend (`backend/.env.example`)
```env
# Server & Environment
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/badminton_matchmaking?schema=public"

# JWT Authentication
JWT_SECRET="replace-with-strong-secret-key"
JWT_EXPIRES_IN="7d"

# Cloudinary (Lưu trữ ảnh bằng chứng hiện trường)
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Payment Gateway (PayOS / VNPay Sandbox)
PAYOS_CLIENT_ID="your_payos_client_id"
PAYOS_API_KEY="your_payos_api_key"
PAYOS_CHECKSUM_KEY="your_payos_checksum_key"
ENABLE_MOCK_PAYMENT="true" # Cho phép giả lập Webhook thanh toán khi test/demo đồ án
```

### 2.2. Frontend (`frontend/.env.example`)
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_MAP_PROVIDER=nominatim # Hoặc 'goong' nếu dùng Goong Maps API
VITE_GOONG_API_KEY=""
```

## 3. Lưu ý Kỹ thuật khi Phát triển & Demo Đồ án
1. **Chạy trên HTTPS khi test Camera và GPS trên điện thoại thật:** Trình duyệt di động (Chrome/Safari) chỉ cho phép gọi `navigator.geolocation` và `getUserMedia` (Camera) trên `localhost` hoặc tên miền có `HTTPS`. Khi test bằng điện thoại qua mạng LAN hoặc nộp đồ án, sử dụng `vite --https` (plugin `@vitejs/plugin-basic-ssl`) hoặc Cloudflare Tunnel / ngrok.
2. **Hỗ trợ Kiểm thử & Bảo vệ Đồ án (Demo Mode):**
   - Bật `ENABLE_MOCK_PAYMENT="true"` để hiển thị nút *"Giả lập Thanh toán Thành công"* bên cạnh mã QR thật của PayOS/VNPay nhằm phòng trường hợp cổng Sandbox bảo trì lúc chấm đồ án.
   - Cung cấp endpoint `POST /api/admin/jobs/trigger-escrow-release` và `POST /api/admin/jobs/trigger-unlock-users` trên trang Admin để kích hoạt ngay lập tức logic của Cronjob khi thuyết trình trước hội đồng mà không phải đợi 2 tiếng hoặc 14 ngày.
