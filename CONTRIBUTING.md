# Quy ước Làm việc Nhóm & Quản lý Mã nguồn (Git Workflow)

Dự án áp dụng mô hình **GitHub Flow** kết hợp chuẩn **Conventional Commits** để đảm bảo nhánh `main` luôn ở trạng thái biên dịch và chạy ổn định.

## 1. Quy tắc Phân nhánh (Branching Strategy)

* Tuyệt đối không viết mã nguồn hoặc đẩy commit trực tiếp lên nhánh `main`.
* Trước khi bắt đầu một tác vụ mới, luôn cập nhật nhánh `main` mới nhất và tạo nhánh riêng theo quy tắc đặt tên sau:
  * `feat/<ten-tinh-nang>`: Phát triển tính năng mới (ví dụ: `feat/auth-module`, `feat/map-view`).
  * `fix/<ten-loi>`: Sửa lỗi phát sinh (ví dụ: `fix/booking-transaction`).
  * `docs/<noi-dung>`: Cập nhật tài liệu đặc tả hoặc hướng dẫn (ví dụ: `docs/git-workflow`).
  * `chore/<noi-dung>`: Cấu hình công cụ, thư viện hoặc Docker (ví dụ: `chore/prisma-setup`).

## 2. Quy chuẩn Thông điệp Commit (Conventional Commits)

Mọi commit message bắt buộc viết bằng tiếng Anh ngắn gọn, dùng động từ nguyên mẫu theo cấu trúc `<type>(<scope>): <description>`:

* `feat`: Thêm chức năng nghiệp vụ mới.
* `fix`: Sửa lỗi logic hoặc giao diện.
* `refactor`: Tái cấu trúc mã nguồn nhưng không làm thay đổi hành vi chức năng.
* `docs`: Thêm hoặc chỉnh sửa tài liệu.
* `chore`: Thay đổi cấu hình build, thư viện phụ thuộc hoặc Docker.

**Ví dụ hợp lệ:**
* `feat(bookings): implement escrow booking with Prisma interactive transaction`
* `fix(sessions): mask host phone number before 30 minutes of start time`

## 3. Quy trình Pull Request và Gộp nhánh (Merge)

1. Hoàn thành mã nguồn trên nhánh chức năng và đảm bảo chạy thành công lệnh `npm run build` ở cả thư mục `backend` và `frontend`.
2. Đẩy nhánh chức năng lên GitHub bằng lệnh `git push -u origin <ten-nhanh>`.
3. Tạo **Pull Request** trên GitHub hướng vào nhánh `main`, mô tả ngắn gọn các chức năng đã hoàn thành và kết quả kiểm thử.
4. Thành viên còn lại kiểm tra mã nguồn trên Pull Request và thực hiện gộp nhánh vào `main`, sau đó xóa nhánh chức năng đã hoàn thành.

## 4. Quy tắc Đồng bộ Cơ sở Dữ liệu Prisma

* Không bao giờ chỉnh sửa trực tiếp các tệp lịch sử migration đã được đẩy lên nhánh `main`.
* Sau khi kéo mã nguồn mới từ nhánh `main` về máy bằng lệnh `git pull origin main`, nếu có thay đổi trong thư mục `backend/prisma`, bắt buộc chạy hai lệnh sau trong thư mục `backend` để đồng bộ bảng dữ liệu:
  ```bash
  npx prisma migrate dev
  npx prisma generate