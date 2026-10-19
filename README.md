# Trang Web Động Lực của Wuylii (React + Vite)

Trang web cá nhân truyền cảm hứng và động lực học tập, nỗ lực không ngừng vì người bạn yêu thương. Thiết kế theo phong cách đặc tả **Riverine** được viết lại bằng **React + TypeScript + Vite**, với bố cục 2 trang trượt ngang 100dvh, hiệu ứng mờ 2 lớp ảnh nền parallax, đếm ngày nỗ lực theo thời gian thực (UTC+7) và thư viện hình ảnh/video truyền cảm hứng.

---

## 1. Mục Đích & Cấu Trúc Trang Web

- **Trang 1: Số ngày nỗ lực (`#days`)**:
  - Tiêu đề 3 dòng phong cách Riverine: số ngày nỗ lực, "nỗ lực không bỏ cuộc", "vì [Tên]".
  - Đồng hồ đếm thời gian thực theo múi giờ Việt Nam (UTC+7): số ngày, giờ, phút, giây kể từ ngày bắt đầu.
  - Lời nhắc nhở động lực: *"Mỗi ngày đều đang nổ lực vì em"*.
  - Nút chuyển sang thư viện hình ảnh và nút thêm nhanh hình ảnh.
  - Nút đổi nhanh ngày bắt đầu nỗ lực trực tiếp trên thanh đếm thời gian.

- **Trang 2: Hình ảnh của [Tên] (`#photos`)**:
  - Dải thẻ kính cuộn ngang (tỉ lệ 3:4) chứa hình ảnh và video của người làm động lực.
  - Thanh cuộn tùy chỉnh và nút điều hướng trái/phải.
  - Lightbox toàn màn hình xem ảnh/video với nền mờ làm từ chính bức ảnh đang xem, hỗ trợ phím mũi tên và phím Escape.

- **Cổng Mật Khẩu (Password Gate)**:
  - Màn hình khoá tối giản phong cách Riverine, kiểm tra mật khẩu bằng thuật toán băm SHA-256 kèm salt phía client.
  - Mật khẩu khởi tạo mặc định: `00000000` (8 số 0).
  - Tự động khoá nút mở 30 giây nếu nhập sai 5 lần liên tiếp.

- **Bảng Quản Lý (Admin Panel)**:
  - Tab Thông tin: Đổi tên người làm động lực và ngày bắt đầu (cập nhật tức thì).
  - Tab Ảnh nền: Tải lên ảnh nền mới và chỉnh 2 thanh trượt tiêu điểm khuôn mặt (Object Position X/Y) với khung xem trước.
  - Tab Mật khẩu: Đổi mật khẩu mở cổng bảo vệ.
  - Tab Quản lý ảnh: Quản lý, chỉnh sửa và xoá hình ảnh/video trong thư viện.

---

## 2. Kiến Trúc Kỹ Thuật

- **Frontend Framework**: React 19 + TypeScript + Vite
- **Thiết Kế**: Hệ thống tokens và quy chuẩn Riverine Design System (responsive `--u` đơn vị đo linh hoạt, glassmorphism, parallax background, typography display & brand).
- **Lưu Trữ & Dữ Liệu**:
  - Hỗ trợ đồng bộ REST API với Supabase (`site_config`, `person_photos`, `person_photo_media`).
  - Tự động tích hợp LocalStorage fallback để ứng dụng luôn hoạt động mượt mà ngay cả khi chưa thiết lập API keys hoặc khi offline.
- **Tải Ảnh & Media**:
  - Hỗ trợ Cloudinary Adapter tải trực tiếp ảnh/video và tạo biến đổi ảnh tối ưu (`f_auto,q_auto,w_1920` / `w_480`).
  - Tích hợp fallback data URL khi chưa cấu hình Cloudinary.

---

## 3. Khởi Chạy Ứng Dụng

Cài đặt các gói phụ thuộc và chạy môi trường dev:
```bash
npm install
npm run dev
```

Build cho môi trường production:
```bash
npm run build
```