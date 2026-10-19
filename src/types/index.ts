export interface Photo {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  description?: string;
  media_url?: string | null;
  media_type?: 'image' | 'video';
  cloudinary_public_id?: string | null;
  cloudinary_resource_type?: string | null;
  created_at?: string;
}

export interface PhotoMediaItem {
  id?: string;
  photo_id?: string;
  media_url: string;
  media_type: 'image' | 'video';
  position?: number;
  cloudinary_public_id?: string | null;
  cloudinary_resource_type?: string | null;
}

export interface PendingUploadFile {
  file: File;
  blobUrl: string;
  type: 'image' | 'video';
}

export interface SiteConfig {
  person_name: string;
  start_date: string; // YYYY-MM-DD
  bg_image: string;
  bg_position: string; // e.g. "60% 35%"
  gate_password_hash: string;
  gate_password_salt: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'error' | '';
}

export interface LightboxState {
  isOpen: boolean;
  items: Array<{ url: string; type: 'image' | 'video' }>;
  index: number;
  title: string;
  dateStr: string;
  desc: string;
}
