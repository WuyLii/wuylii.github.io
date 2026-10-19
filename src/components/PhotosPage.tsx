import React, { useRef, useState, useEffect } from 'react';
import { Photo, PhotoMediaItem } from '../types';
import { formatDateDisplay } from '../utils/dateUtils';
import { CloudinaryAdapter } from '../services/cloudinary';

interface PhotosPageProps {
  personName: string;
  photos: Photo[];
  mediaMap: Record<string, PhotoMediaItem[]>;
  active: boolean;
  onNavigate: (page: number) => void;
  onOpenAddPhoto: () => void;
  onSelectPhoto: (photo: Photo) => void;
}

export const PhotosPage: React.FC<PhotosPageProps> = ({
  personName,
  photos,
  mediaMap,
  active,
  onNavigate,
  onOpenAddPhoto,
  onSelectPhoto,
}) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const [thumbStyle, setThumbStyle] = useState<{ width: string; transform: string }>({
    width: '100%',
    transform: 'translateX(0)',
  });

  const updateScrollThumb = () => {
    const strip = stripRef.current;
    if (!strip) return;

    const scrollWidth = strip.scrollWidth - strip.clientWidth;
    if (scrollWidth <= 0) {
      setThumbStyle({ width: '100%', transform: 'translateX(0)' });
      return;
    }

    const ratio = strip.clientWidth / strip.scrollWidth;
    const thumbWidth = Math.max(ratio * 100, 15);
    const progress = strip.scrollLeft / scrollWidth;
    const maxShift = 100 - thumbWidth;

    setThumbStyle({
      width: `${thumbWidth}%`,
      transform: `translateX(${progress * maxShift}%)`,
    });
  };

  useEffect(() => {
    updateScrollThumb();
  }, [photos]);

  const handleScroll = () => {
    updateScrollThumb();
  };

  const scrollLeft = () => {
    stripRef.current?.scrollBy({ left: -280, behavior: 'smooth' });
  };

  const scrollRight = () => {
    stripRef.current?.scrollBy({ left: 280, behavior: 'smooth' });
  };

  return (
    <section
      className="page-pane page-photos"
      id="pagePhotos"
      aria-label="Trang hình ảnh"
      inert={!active}
      aria-hidden={!active}
    >
      <div className="photos-container">
        <div className="photos-header">
          <div className="photos-header-text">
            <h2 className="photos-title">
              Hình ảnh của <span className="person-name-inline">{personName}</span>
            </h2>
            <p className="photos-subtitle">
              Nhìn vào đây mỗi khi muốn dừng lại
            </p>
          </div>
          <button
            type="button"
            className="btn-add-photo-primary"
            id="page2AddPhotoBtn"
            onClick={onOpenAddPhoto}
          >
            <span>+ Thêm hình ảnh</span>
          </button>
        </div>

        {/* Dải ảnh cuộn ngang với scroll-snap */}
        <div className="photo-strip-wrapper">
          <button
            type="button"
            className="strip-nav-btn strip-prev"
            id="stripPrevBtn"
            aria-label="Cuộn sang trái"
            title="Trước"
            onClick={scrollLeft}
          >
            &#10094;
          </button>

          <div
            ref={stripRef}
            className="photo-scroll-strip"
            id="photoScrollStrip"
            tabIndex={0}
            aria-label="Danh sách hình ảnh"
            onScroll={handleScroll}
          >
            {photos.length === 0 ? (
              <div className="photos-empty-card" id="photosEmptyCard" style={{ display: 'flex' }}>
                <div className="empty-icon-star">✦</div>
                <p>Chưa có hình ảnh nào</p>
                <button
                  type="button"
                  className="btn-empty-add"
                  id="emptyAddBtn"
                  onClick={onOpenAddPhoto}
                >
                  + Thêm hình ảnh đầu tiên
                </button>
              </div>
            ) : (
              photos.map((photo) => {
                const extras = mediaMap[photo.id] || [];
                const totalMedia = (photo.media_url ? 1 : 0) + extras.length;
                const isVideo = photo.media_type === 'video';
                const thumbUrl = photo.media_url
                  ? CloudinaryAdapter.getOptimizedUrl(photo.media_url, 'f_auto,q_auto,w_480')
                  : '';

                return (
                  <div
                    key={photo.id}
                    className="photo-card-glass"
                    role="button"
                    tabIndex={0}
                    aria-label={`Xem chi tiết: ${photo.title || 'Hình ảnh'}`}
                    onClick={() => onSelectPhoto(photo)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSelectPhoto(photo);
                    }}
                  >
                    <div className="card-media-wrapper">
                      {photo.media_url ? (
                        isVideo ? (
                          <video
                            className="card-media-video"
                            src={photo.media_url}
                            preload="metadata"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            className="card-media-img"
                            src={thumbUrl}
                            alt={photo.title || ''}
                            loading="lazy"
                          />
                        )
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px',
                            color: 'rgba(255,255,255,0.2)',
                          }}
                        >
                          📷
                        </div>
                      )}

                      {totalMedia > 1 && (
                        <div className="card-badge">
                          {isVideo ? '🎬' : '📷'} {totalMedia}
                        </div>
                      )}
                    </div>

                    <div className="card-info">
                      <span className="card-date">{formatDateDisplay(photo.date)}</span>
                      <h4 className="card-title">{photo.title || 'Khoảnh khắc'}</h4>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            type="button"
            className="strip-nav-btn strip-next"
            id="stripNextBtn"
            aria-label="Cuộn sang phải"
            title="Tiếp"
            onClick={scrollRight}
          >
            &#10095;
          </button>
        </div>

        {/* Chỉ báo cuộn mảnh */}
        <div className="strip-scroll-bar">
          <div
            className="strip-scroll-thumb"
            id="stripScrollThumb"
            style={{
              width: thumbStyle.width,
              transform: thumbStyle.transform,
            }}
          />
        </div>
      </div>

      {/* Cue góc dưới phải trang 2 */}
      <a
        href="#days"
        className="scroll-cue-btn cue-left"
        id="cueToDays"
        aria-label="Về trang số ngày nỗ lực"
        onClick={(e) => {
          e.preventDefault();
          onNavigate(1);
        }}
      >
        <svg className="cue-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6L8 10" stroke="#7CCBBA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="cue-label">Về số ngày nỗ lực</span>
      </a>
    </section>
  );
};
