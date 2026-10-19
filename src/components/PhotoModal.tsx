import React, { useState, useEffect } from 'react';
import { Photo, PhotoMediaItem, PendingUploadFile } from '../types';
import { formatDateDisplay, parseInputDateToIso, nowVN } from '../utils/dateUtils';
import { CloudinaryAdapter } from '../services/cloudinary';

interface PhotoModalProps {
  isOpen: boolean;
  editingPhoto: Photo | null;
  initialMedia?: PhotoMediaItem[];
  onClose: () => void;
  onSave: (
    photoData: Omit<Photo, 'id'>,
    extras: PhotoMediaItem[],
    editId?: string
  ) => Promise<void>;
  onToast: (msg: string, type?: 'success' | 'error' | '') => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  editingPhoto,
  initialMedia = [],
  onClose,
  onSave,
  onToast,
}) => {
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [desc, setDesc] = useState('');
  const [existingMedia, setExistingMedia] = useState<PhotoMediaItem[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingUploadFile[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (editingPhoto) {
      setTitle(editingPhoto.title || '');
      setDateStr(formatDateDisplay(editingPhoto.date));
      setDesc(editingPhoto.description || '');

      const baseList: PhotoMediaItem[] = [];
      if (editingPhoto.media_url) {
        baseList.push({
          media_url: editingPhoto.media_url,
          media_type: editingPhoto.media_type || 'image',
          cloudinary_public_id: editingPhoto.cloudinary_public_id,
          cloudinary_resource_type: editingPhoto.cloudinary_resource_type,
        });
      }
      // Combine with extra media if not already included
      initialMedia.forEach((m) => {
        if (!baseList.some((b) => b.media_url === m.media_url)) {
          baseList.push(m);
        }
      });
      setExistingMedia(baseList);
      setPendingFiles([]);
    } else {
      setTitle('');
      const vn = nowVN();
      const d = String(vn.getDate()).padStart(2, '0');
      const m = String(vn.getMonth() + 1).padStart(2, '0');
      const y = vn.getFullYear();
      setDateStr(`${d}/${m}/${y}`);
      setDesc('');
      setExistingMedia([]);
      setPendingFiles([]);
    }
  }, [isOpen, editingPhoto, initialMedia]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems: PendingUploadFile[] = files.map((f) => ({
      file: f,
      blobUrl: URL.createObjectURL(f),
      type: f.type.startsWith('video/') ? 'video' : 'image',
    }));
    setPendingFiles((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const handleRemoveExistingMedia = (index: number) => {
    setExistingMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      const target = prev[index];
      if (target?.blobUrl) URL.revokeObjectURL(target.blobUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      onToast('Vui lòng nhập tiêu đề hình ảnh!', 'error');
      return;
    }

    const isoDate = parseInputDateToIso(dateStr);

    try {
      setIsSaving(true);
      onToast('Đang tải và lưu hình ảnh...', '');

      const uploadedMedia: PhotoMediaItem[] = [];
      for (const item of pendingFiles) {
        const up = await CloudinaryAdapter.upload(item.file);
        uploadedMedia.push({
          media_url: up.secure_url,
          media_type: up.resource_type,
          cloudinary_public_id: up.public_id,
          cloudinary_resource_type: up.resource_type,
        });
      }

      const allMedia = [...existingMedia, ...uploadedMedia];
      const primary = allMedia[0];
      const extras = allMedia.slice(1);

      const record: Omit<Photo, 'id'> = {
        title: trimmedTitle,
        date: isoDate,
        description: desc.trim(),
        media_type: primary ? primary.media_type : 'image',
        media_url: primary ? primary.media_url : null,
        cloudinary_public_id: primary ? primary.cloudinary_public_id : null,
        cloudinary_resource_type: primary ? primary.cloudinary_resource_type : null,
      };

      await onSave(record, extras, editingPhoto?.id);
      onToast(editingPhoto ? '✓ Đã cập nhật hình ảnh!' : '✓ Đã lưu hình ảnh mới!', 'success');
      onClose();
    } catch (err: any) {
      console.error('Lỗi lưu ảnh:', err);
      onToast('Lỗi: ' + (err.message || 'Không thể lưu'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="river-modal-overlay active"
      id="photoModalOverlay"
      aria-hidden={!isOpen}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        className="river-modal glass-panel"
        id="photoModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photoModalTitle"
      >
        <div className="modal-header">
          <h3 id="photoModalTitle">
            {editingPhoto ? '✏️ Sửa Hình Ảnh' : '✦ Thêm Hình Ảnh'}
          </h3>
          <button
            type="button"
            className="modal-close"
            id="closePhotoModalBtn"
            aria-label="Đóng"
            disabled={isSaving}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Tải lên ảnh & video</label>
            <label className="upload-dropzone" htmlFor="photoFileInputModal">
              <span className="upload-icon">📷</span>
              <span className="upload-text">Bấm để chọn một hoặc nhiều file</span>
              <span className="upload-hint">JPG, PNG, WebP, MP4...</span>
              <input
                type="file"
                id="photoFileInputModal"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={handleFileChange}
                disabled={isSaving}
              />
            </label>

            <div className="upload-preview-grid" id="photoPreviewGrid">
              {existingMedia.map((m, idx) => (
                <div key={`exist-${idx}`} className="preview-thumb-item">
                  {m.media_type === 'video' ? (
                    <video src={m.media_url} />
                  ) : (
                    <img src={m.media_url} alt="" />
                  )}
                  <button
                    type="button"
                    className="preview-thumb-del"
                    disabled={isSaving}
                    onClick={() => handleRemoveExistingMedia(idx)}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {pendingFiles.map((p, idx) => (
                <div key={`pending-${idx}`} className="preview-thumb-item">
                  {p.type === 'video' ? (
                    <video src={p.blobUrl} />
                  ) : (
                    <img src={p.blobUrl} alt="" />
                  )}
                  <button
                    type="button"
                    className="preview-thumb-del"
                    disabled={isSaving}
                    onClick={() => handleRemovePendingFile(idx)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="photoInputTitle">
              Tiêu đề
            </label>
            <input
              type="text"
              id="photoInputTitle"
              className="form-input"
              placeholder="Ví dụ: Nụ cười ngày ấy..."
              value={title}
              disabled={isSaving}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="photoInputDate">
              Ngày (dd/mm/yyyy)
            </label>
            <input
              type="text"
              id="photoInputDate"
              className="form-input"
              placeholder="dd/mm/yyyy"
              maxLength={10}
              inputMode="numeric"
              value={dateStr}
              disabled={isSaving}
              onChange={(e) => setDateStr(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="photoInputDesc">
              Ghi chú / Cảm xúc
            </label>
            <textarea
              id="photoInputDesc"
              className="form-textarea"
              rows={3}
              placeholder="Nhìn vào đây để nhớ lý do bắt đầu..."
              value={desc}
              disabled={isSaving}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-cancel"
            id="cancelPhotoModalBtn"
            disabled={isSaving}
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn-save"
            id="savePhotoBtn"
            disabled={isSaving}
            onClick={handleSubmit}
          >
            <span id="savePhotoBtnText">
              {isSaving ? 'Đang tải lên...' : 'Lưu lại'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
