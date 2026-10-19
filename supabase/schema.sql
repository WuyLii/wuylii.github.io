-- =============================================================================
-- CẬP NHẬT CƠ SỞ DỮ LIỆU SUPABASE - WEB ĐỘNG LỰC
-- (Dọn dẹp các bảng cũ không cần thiết & Khởi tạo cấu trúc mới)
-- =============================================================================
-- HƯỚNG DẪN THỰC HIỆN:
-- 1. Vào Supabase Dashboard: https://supabase.com/dashboard
-- 2. Chọn project của bạn (nafjrifwubpujvqrbkaj) -> Mục "SQL Editor" ở cột trái.
-- 3. Bấm "New Query", dán toàn bộ đoạn mã bên dưới và bấm "Run" (hoặc Ctrl + Enter).
-- =============================================================================

-- BƯỚC 1: XOÁ CÁC BẢNG CŨ KHÔNG CÒN SỬ DỤNG
-- Dùng CASCADE để tự động gỡ các khoá ngoại liên kết
DROP TABLE IF EXISTS public.memory_media CASCADE;
DROP TABLE IF EXISTS public.memories CASCADE;
DROP TABLE IF EXISTS public.photobooth_media CASCADE;
DROP TABLE IF EXISTS public.photobooth_events CASCADE;
DROP TABLE IF EXISTS public.journey_media CASCADE;
DROP TABLE IF EXISTS public.journey_events CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- =============================================================================
-- BƯỚC 2: TẠO CÁC BẢNG MỚI CHO WEB ĐỘNG LỰC
-- =============================================================================

-- 1. BẢNG CẤU HÌNH HỆ THỐNG (site_config)
-- Lưu: tên người làm động lực, ngày bắt đầu, hash mật khẩu cổng, ảnh nền, tiêu điểm
CREATE TABLE IF NOT EXISTS public.site_config (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on site_config" ON public.site_config;
CREATE POLICY "Allow anon all on site_config"
  ON public.site_config
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 2. BẢNG HÌNH ẢNH CỦA NGƯỜI LÀM ĐỘNG LỰC (person_photos)
-- Lưu: tiêu đề, ngày tháng, mô tả/ghi chú, ảnh đại diện, thông tin Cloudinary
CREATE TABLE IF NOT EXISTS public.person_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  date date,
  description text DEFAULT '',
  media_url text,
  media_type text DEFAULT 'image',
  cloudinary_public_id text,
  cloudinary_resource_type text DEFAULT 'image',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.person_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on person_photos" ON public.person_photos;
CREATE POLICY "Allow anon all on person_photos"
  ON public.person_photos
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. BẢNG MEDIA CHI TIẾT ĐI KÈM HÌNH ẢNH (person_photo_media)
-- Cho phép mỗi bài đăng có nhiều ảnh/video cùng lúc
CREATE TABLE IF NOT EXISTS public.person_photo_media (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id uuid REFERENCES public.person_photos(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text DEFAULT 'image',
  position integer DEFAULT 0,
  cloudinary_public_id text,
  cloudinary_resource_type text DEFAULT 'image',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.person_photo_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on person_photo_media" ON public.person_photo_media;
CREATE POLICY "Allow anon all on person_photo_media"
  ON public.person_photo_media
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- BƯỚC 3: SEED DỮ LIỆU CẤU HÌNH KHỞI TẠO
-- Mật khẩu ban đầu: 00000000 (Đã băm SHA-256 kèm salt 'wuylii_motivation_salt_v1')
-- =============================================================================

INSERT INTO public.site_config (key, value)
VALUES
  ('gate_password_hash', '3a29729acfbdbc0729ec0087ccc3d16a1748cb5fb73d23a186548b3faf2c2800'),
  ('gate_password_salt', 'wuylii_motivation_salt_v1'),
  ('person_name', 'Bảo Vy'),
  ('start_date', '2025-07-11'),
  ('bg_image', ''),
  ('bg_position', '60% 35%')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();
