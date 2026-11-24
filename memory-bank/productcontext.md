# PRODUCT CONTEXT — Nghiệp vụ Cốt lõi & Yêu cầu Chức năng

**Dự án:** Hệ thống Ghép trận Cầu lông Vãng lai (Badminton Matchmaking Platform)

## 1. Mục tiêu Sản phẩm & Cấu trúc 2 Nghiệp vụ Cốt lõi
- **Bài toán thực tế:** Hoạt động tuyển người chơi cầu lông vãng lai hiện tại qua Facebook/Zalo gặp điểm nghẽn ở công nghệ (bài đăng văn bản phi cấu trúc, không lọc được bán kính GPS, phải nhắn tin hỏi chỗ thủ công gây nhận lố người, rủi ro khách "bùng kèo" sát giờ hoặc chủ kèo lừa tiền cọc, không có bằng chứng số khi tranh chấp tại sân).
- **Giải pháp phần mềm:** Nền tảng Web App kết nối trực tiếp chủ kèo (**Host**) và người chơi vãng lai (**Guest**), được tổ chức thành **2 quy trình nghiệp vụ cốt lõi nối tiếp nhau**:
  1. **Nghiệp vụ 1 — Tổ chức buổi đánh, Ghép trận và Đặt giữ chỗ trước trận (Pre-match Matchmaking & Escrow Booking):** Từ lúc Host tạo buổi đánh chuẩn hóa -> Guest tìm sân theo bán kính GPS (Haversine) -> Đặt chỗ *First-come, First-served* & Thanh toán vào quỹ tạm giữ (**Escrow**) -> Xử lý tự động các nhánh hủy lịch trước trận (Guest hủy theo 30 phút ân hạn / gói hủy cố định 6h-12h-24h, hoặc Host hủy trước 2 tiếng do chưa đủ người tối thiểu).
  2. **Nghiệp vụ 2 — Điểm danh hiện trường, Phân xử tranh chấp và Quyết toán doanh thu (On-site Check-in, Dispute Resolution & Settlement):** Từ mốc 30 phút trước giờ đánh (mở khóa SĐT liên lạc) -> Điểm danh bằng mã QR trực tiếp tại sân -> Tự động giải ngân từ Escrow vào số dư khả dụng của Host sau giờ kết thúc 2 tiếng (luồng chuẩn), hoặc thu thập bộ 3 bằng chứng số (**GPS + Server Timestamp + Ảnh chụp camera sau**) để khóa giao dịch và chuyển Admin phân xử theo SOP 3 phán quyết kèm chế tài cộng gậy phạt Strike (luồng ngoại lệ).

## 2. Phân quyền & Vai trò Hệ thống
Hệ thống sử dụng 2 nhóm quyền (`Role`) trong bảng `User`:
1. **`USER`:** Người dùng thông thường (định danh duy nhất bằng Số điện thoại 10 số Việt Nam). Trong từng buổi đánh cụ thể, `USER` có thể đóng vai trò:
   - **Host (Người tạo buổi đánh):** Đã tự đặt sân vật lý bên ngoài trước, lên hệ thống tạo buổi đánh (`Session`) để tuyển vãng lai.
   - **Guest (Người tham gia):** Tìm kiếm buổi đánh xung quanh, đặt vị trí (`Booking`) và thanh toán vào quỹ tạm giữ.
2. **`ADMIN`:** Quản trị viên vận hành hệ thống, chịu trách nhiệm phân xử các báo cáo tranh chấp (`PENDING_REVIEW`) theo quy trình chuẩn (SOP) và duyệt lệnh rút tiền từ số dư khả dụng.

## 3. Bộ Tham số Thời gian & Quy tắc Nghiệp vụ Bất biến (Business Rules)

| Mã quy tắc | Thuộc Nghiệp vụ | Tên quy tắc | Giá trị cố định | Logic thực thi tại Backend Service |
| :--- | :--- | :--- | :--- | :--- |
| **RULE-01** | Nghiệp vụ 1 | Thời gian ân hạn mặc định (Cooling-off Period) | **30 phút** sau thanh toán & cách `start_time >= 2h` | Khi Guest bấm hủy: Nếu `(now - paid_at <= 30 phút)` **VÀ** `(start_time - now >= 2 giờ)` -> Hoàn **100%** tiền từ Escrow về số dư khả dụng của Guest (ưu tiên kiểm tra trước gói hủy của sân). |
| **RULE-02** | Nghiệp vụ 1 | **Gói hủy 1: Linh hoạt (`FLEXIBLE_6H`)** | Mốc 100%: **6h** \| Mốc 50%: **2h** | - Hủy khi `start_time - now >= 6h`: Hoàn **100%** cho Guest.<br>- Hủy khi `2h <= start_time - now < 6h`: Hoàn **50%** cho Guest, **50%** giải ngân cho Host.<br>- Hủy khi `start_time - now < 2h`: Hoàn **0%** (Host nhận 100%). |
| **RULE-03** | Nghiệp vụ 1 | **Gói hủy 2: Tiêu chuẩn (`MODERATE_12H`)** | Mốc 100%: **12h** \| Mốc 50%: **4h** | - Hủy khi `start_time - now >= 12h`: Hoàn **100%** cho Guest.<br>- Hủy khi `4h <= start_time - now < 12h`: Hoàn **50%** cho Guest, **50%** cho Host.<br>- Hủy khi `start_time - now < 4h`: Hoàn **0%**. |
| **RULE-04** | Nghiệp vụ 1 | **Gói hủy 3: Nghiêm ngặt (`STRICT_24H`)** | Mốc 100%: **24h** \| Mốc 50%: **12h** | - Hủy khi `start_time - now >= 24h`: Hoàn **100%** cho Guest.<br>- Hủy khi `12h <= start_time - now < 24h`: Hoàn **50%** cho Guest, **50%** cho Host.<br>- Hủy khi `start_time - now < 12h`: Hoàn **0%**. |
| **RULE-05** | Nghiệp vụ 1 | Khóa gói hủy khi tạo Session | Theo `start_time - now` | Khi Host tạo buổi đánh, tự động khóa (không cho chọn) gói hủy nào có mốc hoàn 100% lớn hơn khoảng thời gian từ lúc tạo đến `start_time`. |
| **RULE-06** | Nghiệp vụ 1 | Host hủy hợp lệ do thiếu người | Cách `start_time >= 2h` & `booked_slots < min_players` | Cho phép Host hủy buổi đánh mà không bị phạt Strike; hệ thống hoàn **100%** tiền từ Escrow về số dư khả dụng của tất cả Guest đã đặt. |
| **RULE-07** | Nghiệp vụ 2 | Mở khóa SĐT liên lạc & Check-in | Từ `start_time - 30 phút` đến `end_time` | Hiển thị SĐT thật của Host và Guest dưới dạng `<a href="tel:...">`; mở chức năng quét QR điểm danh. Trước mốc này, SĐT bị che (`090****123`). |
| **RULE-08** | Nghiệp vụ 2 | Cửa sổ Báo cáo tranh chấp & Giải ngân tự động | **2 giờ** sau `end_time` | Cho phép gửi Báo cáo sự cố từ `start_time - 15 phút` đến `end_time + 2 giờ`. Sau `end_time + 2 giờ`, nếu đơn không ở trạng thái `PENDING_REVIEW`, Cronjob tự động giải ngân 100% từ Escrow vào số dư khả dụng của Host. |
| **RULE-09** | Nghiệp vụ 2 | Quy trình SOP phân xử tranh chấp của Admin (SLA 24-48h) | 3 phán quyết cố định | 1. `RESOLVED_GUEST_WIN`: Tỷ lệ check-in buổi đánh = 0%, Guest có GPS & ảnh hợp lệ, Host không có bằng chứng -> Hoàn 100% Guest, **Host +1 vi phạm**.<br>2. `RESOLVED_HOST_WIN`: Tỷ lệ check-in >= 50%, hoặc GPS/thời gian của Guest sai, hoặc Host có ảnh trận đấu đúng sân -> Giải ngân 100% Host, **Guest khiếu nại sai +1 vi phạm**.<br>3. `RESOLVED_SPLIT`: Cả 2 bên đều có GPS & ảnh hợp lệ đầu giờ nhưng không gặp nhau -> Hoàn 50% Guest, Giải ngân 50% Host, **0 vi phạm**. |
| **RULE-10** | Nghiệp vụ 2 | Chế tài xử phạt tự động (Strike System) | Đủ **2 lần vi phạm** -> Khóa **14 ngày** | Khi `violation_count >= 2` -> Đặt `is_locked = true` và `locked_until = now + 14 days`. Tài khoản bị khóa bị chặn quyền tạo Session mới và đặt Booking mới. Sau 14 ngày, Cronjob tự động mở khóa (`is_locked = false`, `violation_count = 0`). |

## 4. Danh mục 19 Yêu cầu Chức năng (Functional Requirements Summary)

### Phân hệ 1: Tài khoản & Định danh (`auth`, `users` — Nền tảng chung)
- **FR-01:** Đăng ký bằng Số điện thoại (`UNIQUE`), Họ tên, Mật khẩu (`bcrypt`), Trình độ tự đánh giá ban đầu; khởi tạo số dư khả dụng `0 VNĐ`.
- **FR-02:** Đăng nhập bằng SĐT + Mật khẩu; cấp `JWT Access Token` kèm trạng thái khóa tài khoản.
- **FR-03:** Xem điểm uy tín (`violation_count`), **cập nhật lại trình độ tự đánh giá** khi người chơi lên trình, và cập nhật tài khoản ngân hàng thụ hưởng.

### Phân hệ 2: Tìm kiếm Không gian & Quản lý Buổi đánh (`sessions` — Thuộc Nghiệp vụ 1)
- **FR-04:** Tạo buổi đánh mới (chặn nếu `is_locked = true`): chọn tọa độ sân trên bản đồ, số sân con, `start_time`, `end_time`, giá/vị trí, trình độ min-max, số người min-max, chọn 1 trong 3 gói hủy cố định hợp lệ.
- **FR-05:** Tìm kiếm buổi đánh theo bán kính GPS bằng công thức lượng giác **Haversine** (`prisma.$queryRaw`) kết hợp lọc khung giờ, giá, trình độ.
- **FR-06:** Xem chi tiết buổi đánh, vị trí bản đồ, số chỗ trống và chính sách hủy.
- **FR-07:** Host hủy buổi đánh không phạt trước 2 tiếng nếu chưa đủ `min_players` (hoàn 100% cho các Guest đã đặt).
- **FR-08:** Tự động hiển thị SĐT liên lạc (`<a href="tel:...">`) giữa Host và Guest từ mốc 30 phút trước `start_time` (cầu nối chuyển sang Nghiệp vụ 2).

### Phân hệ 3: Đặt chỗ, Thanh toán Tạm giữ & Số dư (`bookings`, `wallets`, `webhooks` — Kết nối Nghiệp vụ 1 & 2)
- **FR-09:** Đặt vị trí theo cơ chế *First-come, First-served* bọc trong `prisma.$transaction` để kiểm soát đồng thời.
- **FR-10:** Thanh toán 100% qua mã QR PayOS/VNPay Sandbox (hoặc trừ số dư khả dụng); xác nhận qua Webhook để khóa chỗ (`CONFIRMED`) và đưa tiền vào trạng thái tạm giữ (`ESCROW_HELD`). Hỗ trợ nút giả lập Webhook trên môi trường Dev/Demo.
- **FR-11:** Guest hủy đặt chỗ và tự động hoàn tiền (100%, 50%, hoặc 0%) vào số dư khả dụng theo `RULE-01` đến `RULE-04`, trả lại chỗ trống cho buổi đánh.
- **FR-12:** Xem số dư tạm giữ, số dư khả dụng, lịch sử dòng tiền và gửi yêu cầu rút tiền (`WithdrawalRequest`).

### Phân hệ 4: Điểm danh QR & Báo cáo Tranh chấp Hiện trường (`check-in`, `disputes` — Thuộc Nghiệp vụ 2)
- **FR-13:** Hiển thị mã QR tĩnh chứa `booking_id` trên màn hình của Guest.
- **FR-14:** Host quét mã QR trực tiếp bằng camera trình duyệt (`html5-qrcode`, khóa tải ảnh từ thư viện) để chuyển trạng thái sang `CHECKED_IN`.
- **FR-15:** Gửi báo cáo sự cố hiện trường: bắt buộc thu thập đồng thời **Tọa độ GPS + Server Timestamp + Ảnh chụp trực tiếp từ camera sau (`capture="environment"`)** đẩy lên Cloudinary; khóa giao dịch sang `PENDING_REVIEW`.

### Phân hệ 5: Quản trị, Phân xử SOP & Tiến trình Tự động (`admin`, `jobs` — Thuộc Nghiệp vụ 2)
- **FR-16:** Admin xem bằng chứng (GPS, Timestamp, Ảnh Cloudinary, tỷ lệ `% check-in` của buổi đánh) và chọn 1 trong 3 phán quyết SOP (`RESOLVED_GUEST_WIN`, `RESOLVED_HOST_WIN`, `RESOLVED_SPLIT`).
- **FR-17:** Admin đối soát và xác nhận hoàn tất yêu cầu rút tiền của người dùng.
- **FR-18:** Cronjob (`@nestjs/schedule`) tự động giải ngân tiền từ Escrow vào số dư khả dụng của Host sau `end_time + 2h` (kèm API kích hoạt thủ công cho Admin khi demo).
- **FR-19:** Tự động khóa tài khoản 14 ngày khi chạm ngưỡng 2 lần vi phạm và Cronjob tự động mở khóa khi hết hạn phạt.
