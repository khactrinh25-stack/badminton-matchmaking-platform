# SYSTEM PATTERNS — Kiến trúc Hệ thống, Mẫu Thiết kế & Yêu cầu Phi chức năng

**Dự án:** Hệ thống Ghép trận Cầu lông Vãng lai (Badminton Matchmaking Platform)

## 1. Kiến trúc Tổng thể (High-Level Architecture)
- **Decoupled Client-Server Architecture:** Frontend (React SPA) và Backend (NestJS RESTful API) tách biệt hoàn toàn, giao tiếp qua HTTP/HTTPS với định dạng JSON.
- **MVP Không dùng WebSockets:** Không sử dụng Socket.io hay WebSockets ở giai đoạn đầu để giảm độ phức tạp vận hành. Đồng bộ trạng thái chỗ trống thông qua cơ chế polling thông minh và cache invalidation của `TanStack Query`.

## 2. Kiến trúc Phía Backend (NestJS 3-Layer Architecture)
Mỗi module nghiệp vụ trong NestJS bắt buộc tuân thủ phân tầng 3 lớp:
1. **Presentation Layer (`*.controller.ts`):**
   - Định tuyến RESTful API, kiểm tra tính hợp lệ dữ liệu đầu vào bằng `DTO` (`class-validator`, `class-transformer`).
   - Áp dụng `JwtAuthGuard` và `RolesGuard` (`@Roles(Role.USER, Role.ADMIN)`).
   - Xử lý upload file ảnh bằng chứng qua middleware `multer` và tài liệu hóa bằng `@nestjs/swagger`.
2. **Business Logic Layer (`*.service.ts`):**
   - Thực thi toàn bộ quy tắc tính toán thời gian hủy sân, kiểm tra điều kiện khóa tài khoản (`is_locked`), che số điện thoại trước mốc 30 phút, tính tỷ lệ `% check-in` và điều phối luồng tiền Ví nội bộ / Escrow.
   - Chứa các tiến trình nền `@Cron()` của `@nestjs/schedule` (tách hàm xử lý logic riêng để vừa gọi tự động theo lịch, vừa gọi trực tiếp qua API của Admin khi cần demo).
3. **Data Access Layer (`PrismaService`):**
   - Sử dụng Prisma ORM để truy vấn PostgreSQL.
   - Không viết logic nghiệp vụ trong tầng truy cập dữ liệu.

## 3. Các Mẫu Thiết kế & Giải pháp Kỹ thuật Trọng tâm (Core Technical Patterns)

### 3.1. Kiểm soát đồng thời bằng Interactive Transaction (`NFR-01`)
Khi xử lý đặt chỗ (`createBooking`), hủy chỗ (`cancelBooking`), giải ngân (`releaseEscrow`) hoặc phân xử tranh chấp (`resolveDispute`), bắt buộc gom toàn bộ thao tác đọc-kiểm tra-ghi vào trong `prisma.$transaction`:
```typescript
await this.prisma.$transaction(async (tx) => {
  // 1. Đọc và kiểm tra số chỗ trống thực tế của buổi đánh
  // 2. Cập nhật tăng booked_slots (đảm bảo booked_slots + slots <= max_players)
  // 3. Tạo bản ghi Booking / Cập nhật trạng thái Escrow
  // 4. Ghi nhận biến động vào bảng WalletTransaction & Cập nhật available_balance
});
```

### 3.2. Truy vấn Bán kính Địa lý bằng Haversine + Bounding Box (`NFR-06`)
- Không tải toàn bộ danh sách buổi đánh về Node.js để lọc.
- Bước 1: Tính khung tọa độ sơ bộ (`minLat`, `maxLat`, `minLng`, `maxLng`) từ tọa độ tâm `(userLat, userLng)` và bán kính `radiusKm` để tận dụng B-Tree Index trên PostgreSQL.
- Bước 2: Dùng `prisma.$queryRaw` tính khoảng cách chính xác bằng công thức lượng giác cầu **Haversine**:
  $$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
  (với $R = 6371\text{ km}$).

### 3.3. Mẫu Thiết kế Adapter cho Bản đồ (`CustomMapView` - `NFR-10`)
- Phía Frontend đóng gói toàn bộ thư viện **Leaflet** và dịch vụ tìm kiếm địa chỉ (**Goong Maps API** hoặc **Nominatim**) vào bên trong component duy nhất `src/components/map/CustomMapView.tsx`.
- Các trang `CreateSessionPage`, `SearchSessionPage`, `SessionDetailPage` chỉ giao tiếp với `CustomMapView` qua Props chuẩn hóa:
  - Input: `center: { lat: number; lng: number }`, `markers: MapMarker[]`, `radiusKm?: number`.
  - Output: `onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void`.

### 3.4. Tính Bất biến khi Xử lý Webhook Thanh toán (`Webhook Idempotency` - `NFR-02`)
- Khi nhận POST request từ PayOS/VNPay tại `/api/webhooks/payment`:
  1. Xác thực chữ ký bảo mật (`signature` / `checksum`).
  2. Kiểm tra trong Transaction: nếu `booking.status !== 'PENDING_PAYMENT'` hoặc mã giao dịch đã được xử lý trước đó thì trả về `200 OK` ngay lập tức, tuyệt đối không cộng tiền lần hai.

### 3.5. Chống Giả mạo Bằng chứng Hiện trường (`Anti-Spoofing` - `NFR-04`)
- **Quét QR Check-in:** Khởi tạo `Html5Qrcode` chỉ sử dụng `start(cameraIdOrConfig, ...)` từ camera thiết bị, ẩn/khóa hoàn toàn chức năng `scanFile()`.
- **Chụp ảnh Báo cáo Tranh chấp:** Dùng `<input type="file" accept="image/*" capture="environment">` kết hợp gọi `navigator.geolocation.getCurrentPosition()` ngay thời điểm gửi form; thời gian báo cáo lấy từ `new Date()` trên máy chủ NestJS.

## 4. Tóm tắt 11 Yêu cầu Phi chức năng theo chuẩn ISO/IEC 25010
- **Reliability:** `NFR-01` (Chống Race Condition bằng Prisma Transaction, Overbooking = 0%), `NFR-02` (Webhook Idempotency, xử lý đúng 1 lần).
- **Security:** `NFR-03` (JWT + RolesGuard + bcrypt), `NFR-04` (Ép dùng camera trực tiếp + Server Timestamp), `NFR-05` (Che SĐT ngoài khung 30 phút trước giờ đánh).
- **Performance Efficiency:** `NFR-06` (Truy vấn Haversine `< 500ms`), `NFR-07` (Caching & Auto-refetch bằng TanStack Query).
- **Usability:** `NFR-08` (Giao diện Mobile-First 360px–430px bằng Tailwind CSS, thao tác tại sân tối đa 3 chạm).
- **Compatibility:** `NFR-09` (Chạy trên HTTPS, tương thích Chrome Android & Safari iOS để cấp quyền GPS/Camera).
- **Maintainability:** `NFR-10` (Kiến trúc 3 lớp NestJS & Adapter `CustomMapView`), `NFR-11` (100% API có tài liệu `@nestjs/swagger`).
