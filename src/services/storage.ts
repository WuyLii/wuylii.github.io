import { Photo, PhotoMediaItem, SiteConfig } from '../types';
import { CLIENT_SALT, DEFAULT_PASSWORD_HASH } from './crypto';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const LOCAL_STORAGE_CONFIG_KEY = 'wuylii_site_config';
const LOCAL_STORAGE_PHOTOS_KEY = 'wuylii_person_photos';
const LOCAL_STORAGE_MEDIA_KEY = 'wuylii_person_media';

export const DEFAULT_CONFIG: SiteConfig = {
  person_name: 'Bảo Vy',
  start_date: '2025-07-11',
  bg_image: '',
  bg_position: '60% 35%',
  gate_password_hash: DEFAULT_PASSWORD_HASH,
  gate_password_salt: CLIENT_SALT,
};

function hasSupabase(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.startsWith('http'));
}

function getSupabaseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };
}

export const StorageService = {
  // --- SITE CONFIG ---
  async loadConfig(): Promise<SiteConfig> {
    const local = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
    let config: SiteConfig = local ? { ...DEFAULT_CONFIG, ...JSON.parse(local) } : { ...DEFAULT_CONFIG };

    if (!hasSupabase()) {
      return config;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/site_config?select=key,value`, {
        headers: getSupabaseHeaders(),
      });
      if (res.ok) {
        const rows = await res.json();
        const remoteMap: Record<string, string> = {};
        rows.forEach((r: { key: string; value: string }) => {
          remoteMap[r.key] = r.value;
        });

        if (remoteMap.person_name) config.person_name = remoteMap.person_name;
        if (remoteMap.start_date) config.start_date = remoteMap.start_date;
        if (remoteMap.bg_image !== undefined) config.bg_image = remoteMap.bg_image;
        if (remoteMap.bg_position) config.bg_position = remoteMap.bg_position;
        if (remoteMap.gate_password_hash) config.gate_password_hash = remoteMap.gate_password_hash;
        if (remoteMap.gate_password_salt) config.gate_password_salt = remoteMap.gate_password_salt;

        localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
      }
    } catch (err) {
      console.warn('Không thể kết nối Supabase cho cấu hình, dùng dữ liệu local:', err);
    }

    return config;
  },

  async setConfig(key: keyof SiteConfig, value: string): Promise<void> {
    // Save to local first
    const current = await this.loadConfig();
    (current as any)[key] = value;
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(current));

    if (!hasSupabase()) return;

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/site_config`, {
        method: 'POST',
        headers: {
          ...getSupabaseHeaders(),
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify({ key, value }),
      });
    } catch (err) {
      console.warn('Lỗi đồng bộ Supabase config:', err);
    }
  },

  // --- PHOTOS ---
  async getPhotos(): Promise<{ photos: Photo[]; mediaMap: Record<string, PhotoMediaItem[]> }> {
    const localPhotosStr = localStorage.getItem(LOCAL_STORAGE_PHOTOS_KEY);
    const localMediaStr = localStorage.getItem(LOCAL_STORAGE_MEDIA_KEY);
    let photos: Photo[] = localPhotosStr ? JSON.parse(localPhotosStr) : [];
    let mediaMap: Record<string, PhotoMediaItem[]> = localMediaStr ? JSON.parse(localMediaStr) : {};

    if (!hasSupabase()) {
      return { photos, mediaMap };
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/person_photos?select=*&order=date.asc,created_at.asc`, {
        headers: getSupabaseHeaders(),
      });
      if (res.ok) {
        photos = await res.json();
        const newMap: Record<string, PhotoMediaItem[]> = {};

        for (const p of photos) {
          const mRes = await fetch(`${SUPABASE_URL}/rest/v1/person_photo_media?photo_id=eq.${p.id}&order=position.asc`, {
            headers: getSupabaseHeaders(),
          });
          if (mRes.ok) {
            newMap[p.id] = await mRes.json();
          } else {
            newMap[p.id] = [];
          }
        }
        mediaMap = newMap;
        localStorage.setItem(LOCAL_STORAGE_PHOTOS_KEY, JSON.stringify(photos));
        localStorage.setItem(LOCAL_STORAGE_MEDIA_KEY, JSON.stringify(mediaMap));
      }
    } catch (err) {
      console.warn('Lỗi lấy ảnh từ Supabase, dùng dữ liệu local:', err);
    }

    return { photos, mediaMap };
  },

  async insertPhoto(record: Omit<Photo, 'id'>, extras: PhotoMediaItem[]): Promise<Photo> {
    const id = (typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newPhoto: Photo = { ...record, id, created_at: new Date().toISOString() };

    // Update local storage
    const current = await this.getPhotos();
    const updatedPhotos = [...current.photos, newPhoto].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const updatedMedia = { ...current.mediaMap, [id]: extras };

    localStorage.setItem(LOCAL_STORAGE_PHOTOS_KEY, JSON.stringify(updatedPhotos));
    localStorage.setItem(LOCAL_STORAGE_MEDIA_KEY, JSON.stringify(updatedMedia));

    if (!hasSupabase()) return newPhoto;

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/person_photos`, {
        method: 'POST',
        headers: { ...getSupabaseHeaders(), Prefer: 'return=representation' },
        body: JSON.stringify(record),
      });

      if (res.ok) {
        const rows = await res.json();
        const insertedPhoto = rows[0] || newPhoto;

        if (extras.length) {
          const mediaRecords = extras.map((it, i) => ({
            photo_id: insertedPhoto.id,
            media_url: it.media_url,
            media_type: it.media_type,
            position: i,
            cloudinary_public_id: it.cloudinary_public_id || null,
            cloudinary_resource_type: it.cloudinary_resource_type || null,
          }));
          await fetch(`${SUPABASE_URL}/rest/v1/person_photo_media`, {
            method: 'POST',
            headers: { ...getSupabaseHeaders(), Prefer: 'return=minimal' },
            body: JSON.stringify(mediaRecords),
          });
        }
        return insertedPhoto;
      }
    } catch (e) {
      console.warn('Lỗi lưu ảnh lên Supabase:', e);
    }

    return newPhoto;
  },

  async updatePhoto(id: string, updates: Partial<Photo>, extras: PhotoMediaItem[]): Promise<void> {
    const current = await this.getPhotos();
    const updatedPhotos = current.photos.map(p => (p.id === id ? { ...p, ...updates } : p));
    const updatedMedia = { ...current.mediaMap, [id]: extras };

    localStorage.setItem(LOCAL_STORAGE_PHOTOS_KEY, JSON.stringify(updatedPhotos));
    localStorage.setItem(LOCAL_STORAGE_MEDIA_KEY, JSON.stringify(updatedMedia));

    if (!hasSupabase()) return;

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/person_photos?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...getSupabaseHeaders(), Prefer: 'return=representation' },
        body: JSON.stringify(updates),
      });

      await fetch(`${SUPABASE_URL}/rest/v1/person_photo_media?photo_id=eq.${id}`, {
        method: 'DELETE',
        headers: getSupabaseHeaders(),
      });

      if (extras.length) {
        const mediaRecords = extras.map((it, i) => ({
          photo_id: id,
          media_url: it.media_url,
          media_type: it.media_type,
          position: i,
          cloudinary_public_id: it.cloudinary_public_id || null,
          cloudinary_resource_type: it.cloudinary_resource_type || null,
        }));
        await fetch(`${SUPABASE_URL}/rest/v1/person_photo_media`, {
          method: 'POST',
          headers: { ...getSupabaseHeaders(), Prefer: 'return=minimal' },
          body: JSON.stringify(mediaRecords),
        });
      }
    } catch (e) {
      console.warn('Lỗi cập nhật ảnh trên Supabase:', e);
    }
  },

  async deletePhoto(id: string): Promise<void> {
    const current = await this.getPhotos();
    const updatedPhotos = current.photos.filter(p => p.id !== id);
    const updatedMedia = { ...current.mediaMap };
    delete updatedMedia[id];

    localStorage.setItem(LOCAL_STORAGE_PHOTOS_KEY, JSON.stringify(updatedPhotos));
    localStorage.setItem(LOCAL_STORAGE_MEDIA_KEY, JSON.stringify(updatedMedia));

    if (!hasSupabase()) return;

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/person_photo_media?photo_id=eq.${id}`, {
        method: 'DELETE',
        headers: getSupabaseHeaders(),
      });
      await fetch(`${SUPABASE_URL}/rest/v1/person_photos?id=eq.${id}`, {
        method: 'DELETE',
        headers: getSupabaseHeaders(),
      });
    } catch (e) {
      console.warn('Lỗi xóa ảnh trên Supabase:', e);
    }
  },

  async pingHeartbeat(): Promise<void> {
    if (!hasSupabase()) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/site_config?select=key&limit=1`, {
        method: 'GET',
        headers: getSupabaseHeaders(),
      });
    } catch {
      // ignore
    }
  },
};
