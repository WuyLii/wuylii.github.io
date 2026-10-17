# Trang Web Động Lực (wuylii_github_io)

Trang web cá nhân truyền cảm hứng và động lực học tập, nỗ lực không ngừng vì người bạn yêu thương. Thiết kế theo phong cách đặc tả **Riverine** (HTML, CSS, JavaScript thuần) với bố cục 2 trang trượt ngang 100dvh, hiệu ứng mờ 2 lớp ảnh nền, đếm ngày nỗ lực theo thời gian thực và thư viện hình ảnh truyền cảm hứng.

---

## 1. Mục Đích & Cấu Trúc Trang Web

- **Trang 1: Số ngày nỗ lực (`#days`)**:
  - Tiêu đề 3 dòng thiết kế Riverine: số ngày nỗ lực, "nỗ lực không bỏ cuộc", "vì [Tên]".
  - Đồng hồ đếm thời gian thực theo giờ Việt Nam (UTC+7): giờ, phút, giây kể từ ngày bắt đầu.
  - Lời nhắc nhở động lực: *"Mỗi bài học hôm nay là một bước đi tiếp"*.
  - Nút chuyển sang thư viện hình ảnh và liên kết thêm nhanh hình ảnh.
- **Trang 2: Hình ảnh của [Tên] (`#photos`)**:
  - Dải thẻ kính cuộn ngang (tỉ lệ 3:4) chứa hình ảnh/video của người làm động lực.
  - Lightbox toàn màn hình xem ảnh/video với nền mờ làm từ chính bức ảnh đang xem.
- **Cổng mật khẩu (Password Gate)**:
  - Màn hình khoá tối giản phong cách Riverine, kiểm tra mật khẩu bằng thuật toán băm SHA-256 kèm salt phía client.
  - Mật khẩu khởi tạo: `00000000` (8 số 0).
  - Tự động khoá nút mở 30 giây nếu nhập sai 5 lần liên tiếp.
- **Bảng Quản Lý (Admin Panel)**:
  - Đổi tên người làm động lực và ngày bắt đầu (cập nhật tức thì không cần tải lại trang).
  - Tải lên ảnh nền mới qua Cloudinary và chỉnh 2 thanh trượt tiêu điểm (Object Position X/Y).
  - Đổi mật khẩu mở cổng.
  - Quản lý, chỉnh sửa và xoá hình ảnh trong thư viện.

---

## 2. Hướng Dẫn Cấu Hình Cơ Sở Dữ Liệu (Supabase)

Website kết nối trực tiếp qua Supabase REST API (sử dụng `fetch` thuần, không cần SDK):

1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard).
2. Mở project của bạn (`nafjrifwubpujvqrbkaj`).
3. Chọn mục **SQL Editor** ở thanh công cụ bên trái.
4. Mở file `supabase/schema.sql` trong mã nguồn, sao chép toàn bộ nội dung và dán vào SQL Editor, sau đó bấm **Run**.
5. Script sẽ tự động tạo:
   - `site_config`: Bảng lưu tên, ngày bắt đầu, hash mật khẩu, URL ảnh nền và vị trí tiêu điểm.
   - `person_photos`: Bảng lưu thông tin các cột mốc/hình ảnh.
   - `person_photo_media`: Bảng lưu danh sách media (ảnh, video) chi tiết liên kết với `person_photos`.
   - Bật RLS và các policy cho phép truy cập qua khóa `anon`.
   - Seed sẵn mật khẩu `00000000` ban đầu.

*Lưu ý: Không xoá các bảng cũ (memories, photobooth, journey...); website mới hoạt động độc lập trên các bảng mới.*

---

## 3. Cấu Hình Tải Ảnh (Cloudinary)

- **Cloud Name**: `dmq9orepw`
- **Upload Preset**: `memory_gallery` (loại unsigned preset).
- Ảnh và video được tải trực tiếp lên Cloudinary thông qua `CloudinaryAdapter` và lưu URL trả về vào Supabase.
- Tự động chèn tham số biến đổi `f_auto,q_auto,w_1920` cho lớp ảnh nét và `w_480` cho lớp ảnh mờ để tối ưu tốc độ tải.

---

## 4. Hướng Dẫn Triển Khai Lên Vercel (Static Site)

Dự án sử dụng **HTML, CSS, JavaScript thuần**, không sử dụng framework hay bước build phức tạp, hoàn toàn tương thích để chạy như site tĩnh trên Vercel:

1. Đẩy mã nguồn lên repository GitHub của bạn (`wuylii/wuylii.github.io`).
2. Đăng nhập vào [Vercel](https://vercel.com) và chọn **Add New Project** -> **Import Git Repository**.
3. Tại phần **Framework Preset**, chọn **Other** (hoặc để mặc định).
4. Phần **Build and Output Settings**:
   - **Build Command**: Để trống.
   - **Output Directory**: Để trống (hoặc `.`).
5. Bấm **Deploy**. Trang web sẽ được triển khai trực tiếp tức thì.