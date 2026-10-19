const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export interface UploadResult {
  secure_url: string;
  resource_type: 'image' | 'video';
  public_id: string;
}

export const CloudinaryAdapter = {
  isConfigured(): boolean {
    return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
  },

  async upload(file: File): Promise<UploadResult> {
    const isVideo = file.type.startsWith('video/');
    const type: 'image' | 'video' = isVideo ? 'video' : 'image';

    if (!this.isConfigured()) {
      // Fallback: convert file to local Data URL for storage if Cloudinary is not configured
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            secure_url: reader.result as string,
            resource_type: type,
            public_id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          });
        };
        reader.onerror = () => reject(new Error('Không thể đọc file'));
        reader.readAsDataURL(file);
      });
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`;

    const res = await fetch(url, { method: 'POST', body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error('Cloudinary: ' + (err.error?.message || `HTTP ${res.status}`));
    }
    const data = await res.json();
    return {
      secure_url: data.secure_url,
      resource_type: type,
      public_id: data.public_id,
    };
  },

  getOptimizedUrl(url: string, params: string): string {
    if (!url || !url.includes('res.cloudinary.com')) return url;
    return url.replace('/upload/', `/upload/${params}/`);
  },
};
