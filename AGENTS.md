# AGENTS.md — Hướng dẫn dành cho AI Coding Agent

**Dự án:** Hệ thống Ghép trận Cầu lông Vãng lai (Badminton Matchmaking Platform)  
**Vai trò của Agent:** Kỹ sư Phần mềm Full-stack (TypeScript, React 18, NestJS, PostgreSQL, Prisma ORM)

## 1. Quy trình Đọc & Cập nhật Ngữ cảnh (Memory Bank Protocol)

Để tiết kiệm Token và đảm bảo không bao giờ làm sai lệch nghiệp vụ dự án giữa các phiên làm việc, Agent **BẮT BUỘC** tuân thủ quy trình sau:

1. **Khi bắt đầu mỗi phiên làm việc (Start of Session):**
   - Đọc `CONTRIBUTING.md`, `memory-bank/activeContext.md` và `memory-bank/progress.md` đầu tiên để nắm quy ước nhánh Git, trạng thái hiện tại và công việc đang làm dở.
   - Đọc thêm các tệp chuyên biệt trong `memory-bank/` khi tác vụ có liên quan đến nghiệp vụ, kiến trúc, công nghệ, cơ sở dữ liệu hoặc hợp đồng API.
   - Đọc các file đặc tả chuyên biệt trước khi viết mã nguồn tương ứng:
     - Liên quan đến nghiệp vụ, luật hủy sân, tranh chấp, gậy phạt -> Đọc `memory-bank/productContext.md`.
     - Liên quan đến kiến trúc, xử lý đồng thời, truy vấn bản đồ, bảo mật -> Đọc `memory-bank/systemPatterns.md`.
     - Liên quan đến cài đặt thư viện, cấu hình môi trường, tích hợp bên thứ ba -> Đọc `memory-bank/techContext.md`.
     - Liên quan đến thiết kế bảng, Prisma Schema, Enum, quan hệ CSDL -> Đọc `memory-bank/data-model.md`.
     - Liên quan đến RESTful API endpoint, DTO, JSON Request/Response, Guards -> Đọc `memory-bank/api-contracts.md`.
2. **Khi kết thúc mỗi tác vụ lớn hoặc cuối phiên (End of Task / Session):**
   - Cập nhật ngay `memory-bank/activeContext.md` (ghi rõ file vừa sửa, quyết định kỹ thuật mới, việc tiếp theo cần làm).
   - Đánh dấu `[x]` vào các hạng mục đã hoàn thành trong `memory-bank/progress.md`.

## 2. Cấu trúc Thư mục Dự án (Project Structure)

```text
badminton-matchmaking/
├── AGENTS.md                        # File chỉ dẫn gốc cho AI Agent (đặt ở root)
├── memory-bank/                     # Bộ nhớ ngữ cảnh đầy đủ của dự án
│   ├── productContext.md            # Quy tắc nghiệp vụ cốt lõi, 19 FR & Tham số thời gian
│   ├── systemPatterns.md            # Kiến trúc 3 lớp, Design Patterns & 11 NFR
│   ├── techContext.md               # Tech stack, Thư viện, Biến môi trường (.env)
│   ├── data-model.md                # Thiết kế ERD, Enums & mã nguồn chuẩn schema.prisma
│   ├── api-contracts.md             # Đặc tả đầy đủ RESTful API, JSON Request/Response & Quy tắc biên
│   ├── activeContext.md             # Trạng thái làm việc hiện tại (cập nhật liên tục)
│   └── progress.md                  # Tiến độ từng giai đoạn (cập nhật liên tục)
├── backend/                         # Mã nguồn NestJS + Prisma ORM
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── common/                  # Guards (JWT, Roles), Decorators, Exception Filters
│       ├── modules/                 # auth, users, sessions, bookings, disputes, wallets, webhooks, admin, jobs
│       └── main.ts
└── frontend/                        # Mã nguồn React 18 + Vite + TypeScript + Tailwind CSS
    └── src/
        ├── components/
        │   └── map/CustomMapView.tsx # Adapter chuẩn hóa bản đồ Leaflet + Goong/Nominatim
        ├── pages/
        │   ├── auth/                # LoginPage.tsx, RegisterPage.tsx
        │   ├── sessions/            # SearchSessionsPage.tsx, SessionDetailPage.tsx, CreateSessionPage.tsx, HostManageSessionPage.tsx
        │   ├── bookings/            # MyBookingsPage.tsx (Hiển thị QR Code, hủy chỗ, gọi SĐT)
        │   ├── disputes/            # CreateDisputePage.tsx (Camera sau + GPS gửi/phản hồi tranh chấp)
        │   ├── wallet/              # WalletPage.tsx (Số dư, lịch sử giao dịch, rút tiền)
        │   ├── profile/             # ProfilePage.tsx (Cập nhật trình độ, tài khoản ngân hàng, điểm uy tín)
        │   └── admin/               # AdminDashboardPage.tsx (Phân xử SOP, duyệt rút tiền, trigger Cronjob)
        ├── services/                # Cấu hình Axios + TanStack Query hooks
        └── stores/                  # Zustand stores (bộ lọc tìm kiếm, tọa độ GPS tạm)
```

## 3. Các Quy tắc Cốt lõi Tuyệt đối Không được Vi phạm (Hard Guardrails)

1. **KHÔNG sử dụng WebSockets ở giai đoạn MVP:** Mọi giao tiếp Client - Server đều qua HTTP RESTful API. Phía Frontend dùng `TanStack Query` (`refetchInterval`, `invalidateQueries`) để làm mới số lượng chỗ trống.
2. **BẮT BUỘC dùng `prisma.$transaction` cho Đặt chỗ & Tiền tệ:** Mọi thao tác giữ vị trí trống, trừ/cộng số dư khả dụng (`available_balance`) và giải ngân/hoàn tiền tạm giữ (`Escrow`) phải nằm trong Interactive Transaction để chống lỗi Race Condition.
3. **BẮT BUỘC đi qua Adapter `CustomMapView` ở Frontend:** Tuyệt đối không nhúng trực tiếp thư viện Leaflet hay gọi API bản đồ rải rác trong các trang giao diện; mọi thao tác bản đồ phải gọi qua component wrapper `CustomMapView`.
4. **Chống giả mạo tại sân (Anti-Spoofing):**
   - Quét QR điểm danh (`html5-qrcode`): Chỉ cho phép luồng camera trực tiếp, khóa hoàn toàn chức năng tải ảnh từ thư viện máy.
   - Chụp ảnh báo cáo tranh chấp: Bắt buộc dùng `<input type="file" accept="image/*" capture="environment">` kết hợp lấy tọa độ GPS và dùng thời gian của Server (`new Date()` tại Backend), không tin tưởng timestamp từ Client gửi lên.
   - Lưu trữ ảnh: Đẩy ảnh qua `multer` lên **Cloudinary**, chỉ lưu chuỗi URL vào PostgreSQL.
5. **Không cho phép Host tự nhập số giờ hủy tùy ý:** Host chỉ được chọn 1 trong 3 gói `Enum` cố định (`FLEXIBLE_6H`, `MODERATE_12H`, `STRICT_24H`).
6. **Che thông tin Số điện thoại:** Backend chỉ trả về SĐT thật của Host và Guest khi đơn đặt chỗ đã `CONFIRMED` hoặc `CHECKED_IN` và thời gian hiện tại nằm trong khung `[start_time - 30 phút, end_time]`.

## 4. Các Lệnh Làm việc Thường dùng (Common Commands)

- **Backend (`cd backend`):**
  - Chạy môi trường dev: `npm run start:dev`
  - Kiểm tra kiểu TypeScript & Build: `npm run build`
  - Đồng bộ Prisma Schema vào DB: `npx prisma migrate dev`
  - Sinh Prisma Client: `npx prisma generate`
  - Nạp dữ liệu mẫu: `npx prisma db seed`
- **Frontend (`cd frontend`):**
  - Chạy môi trường dev: `npm run dev`
  - Kiểm tra lỗi TypeScript & Build: `npm run build`

## 5. Quy trình Thực thi & Kiểm chứng Mã nguồn (Execution & Verification Protocol)

1. **Giới hạn phạm vi mỗi lượt sinh mã:** Chỉ thực hiện 1 phân hệ Backend hoặc 1 đến 2 trang giao diện Frontend trong mỗi lần yêu cầu, giới hạn tối đa 3 đến 6 tệp tạo mới hoặc chỉnh sửa để kiểm soát lỗi.
2. **Bám sát đặc tả đã chốt:** Tuyệt đối không tự ý đổi tên bảng, tên cột, giá trị Enum trong `memory-bank/data-model.md` hoặc đường dẫn URL, cấu trúc JSON trong `memory-bank/api-contracts.md`.
3. **Cổng kiểm chứng biên dịch bắt buộc:** Sau khi viết hoặc sửa mã nguồn ở `backend/` hoặc `frontend/`, Agent bắt buộc phải chạy lệnh `npm run build` tại thư mục tương ứng và sửa toàn bộ lỗi kiểu dữ liệu TypeScript trước khi báo cáo hoàn thành hoặc cập nhật tiến độ.
4. **Cập nhật bộ nhớ sau mỗi bước:** Sau khi `npm run build` chạy thành công không có lỗi, cập nhật trạng thái vào `memory-bank/activeContext.md` và đánh dấu hoàn thành vào `memory-bank/progress.md`.
5. **Bắt buộc xuất hướng dẫn chạy thử và kiểm thử sau khi hoàn thành:** Tại cuối mỗi phản hồi sau khi biên dịch thành công, Agent bắt buộc phải cung cấp mục **Hướng dẫn Kiểm thử Thủ công** gồm:
   - Các lệnh Terminal chính xác để khởi động cơ sở dữ liệu Docker, máy chủ Backend và giao diện Frontend.
   - Địa chỉ URL cụ thể trên trình duyệt hoặc trang tài liệu Swagger UI cần truy cập.
   - Thông tin tài khoản mẫu lấy từ tệp `backend/prisma/seed.ts` để đăng nhập thử nghiệm.
   - Danh sách từng bước thao tác kiểm thử cho cả trường hợp hợp lệ lẫn trường hợp báo lỗi nghiệp vụ của tính năng vừa xây dựng.

## 6. Quy tắc Quản lý Mã nguồn Git (Git Guardrails)

1. **Kiểm tra nhánh bắt buộc trước khi viết mã:** Trước khi tạo mới hoặc chỉnh sửa bất kỳ tệp mã nguồn nào, Agent bắt buộc phải chạy lệnh `git branch --show-current`. Nếu kết quả trả về là `main`, Agent không được phép viết mã trên nhánh này mà phải tự động chạy lệnh `git checkout -b feat/<ten-tinh-nang>` dựa trên yêu cầu của người dùng rồi mới tiến hành lập trình.
2. **Không tự ý đẩy mã hoặc gộp nhánh:** Agent tuyệt đối không được tự ý chạy các lệnh `git push`, `git merge` hoặc `git reset --hard` nếu chưa có yêu cầu trực tiếp từ lập trình viên.
3. **Tuân thủ chuẩn Conventional Commits và cổng biên dịch:** Chỉ đề xuất commit message tiếng Anh theo định dạng `<type>(<scope>): <description>` sau khi lệnh `npm run build` tại `backend/` hoặc `frontend/` chạy thành công không có lỗi.