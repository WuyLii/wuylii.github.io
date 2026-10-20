import React, { useEffect } from 'react';
import { LightboxState } from '../types';
import { CloudinaryAdapter } from '../services/cloudinary';

interface LightboxProps {
  lightbox: LightboxState;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({
  lightbox,
  onClose,
  onPrev,
  onNext,
}) => {
  useEffect(() => {
    if (!lightbox.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox.isOpen, onPrev, onNext, onClose]);

  if (!lightbox.isOpen) return null;

  const current = lightbox.items[lightbox.index];
  const hasMultiple = lightbox.items.length > 1;

  return (
    <div
      className="river-lightbox active"
      id="riverLightbox"
      role="dialog"
      aria-modal="true"
      aria-hidden={!lightbox.isOpen}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="lightbox-blur-bg"
        id="lightboxBlurBg"
        style={{
          backgroundImage: current?.type === 'image' ? `url("${CloudinaryAdapter.getHighResUrl(current.url)}")` : 'none',
        }}
        onClick={onClose}
      />

      <button
        type="button"
        className="lightbox-close-btn"
        id="lightboxCloseBtn"
        aria-label="Đóng xem ảnh"
        onClick={onClose}
      >
        ✕
      </button>

      <div className="lightbox-content-box">
        <div className="lightbox-media-wrap" id="lightboxMediaWrap">
          {hasMultiple && (
            <button
              type="button"
              className="lb-arrow lb-arrow-prev"
              id="lbPrevBtn"
              aria-label="Xem ảnh trước"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
            >
              &#10094;
            </button>
          )}

          {current && (
            current.type === 'video' ? (
              <video
                key={current.url}
                src={current.url}
                controls
                autoPlay
                playsInline
                className="lightbox-media-element"
              />
            ) : (
              <img
                key={current.url}
                src={CloudinaryAdapter.getHighResUrl(current.url)}
                alt={lightbox.title}
                className="lightbox-media-element"
                loading="eager"
                decoding="async"
              />
            )
          )}

          {hasMultiple && (
            <button
              type="button"
              className="lb-arrow lb-arrow-next"
              id="lbNextBtn"
              aria-label="Xem ảnh sau"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
            >
              &#10095;
            </button>
          )}

          {hasMultiple && (
            <div className="lb-counter-pill" id="lbCounterPill">
              {lightbox.index + 1} / {lightbox.items.length}
            </div>
          )}
        </div>

        <div className="lightbox-meta">
          <span className="lightbox-date" id="lbDate">
            {lightbox.dateStr}
          </span>
          <h3 className="lightbox-title" id="lbTitle">
            {lightbox.title}
          </h3>
          {lightbox.desc && (
            <p className="lightbox-desc" id="lbDesc">
              {lightbox.desc}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
