import React, { useState, useEffect } from 'react';
import { calculateEffort } from '../utils/dateUtils';

interface DaysPageProps {
  personName: string;
  startDate: string;
  active: boolean;
  onNavigate: (page: number) => void;
  onOpenAddPhoto: () => void;
  onQuickDateChange: (newDateIso: string) => void;
}

export const DaysPage: React.FC<DaysPageProps> = ({
  personName,
  startDate,
  active,
  onNavigate,
  onOpenAddPhoto,
  onQuickDateChange,
}) => {
  const [effort, setEffort] = useState(() => calculateEffort(startDate));

  useEffect(() => {
    setEffort(calculateEffort(startDate));
    const timer = setInterval(() => {
      setEffort(calculateEffort(startDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [startDate]);

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onQuickDateChange(e.target.value);
    }
  };

  return (
    <section
      className="page-pane page-days"
      id="pageDays"
      aria-label="Trang số ngày nỗ lực"
      inert={!active}
      aria-hidden={!active}
    >
      <div className="hero-bottom-left" id="heroLeft">
        {/* Nhãn teal tên người */}
        <div className="hero-teal-label mask-clip-row">
          <span className="animate-lift" id="heroPersonName">
            {personName}
          </span>
        </div>

        {/* Tiêu đề 3 dòng, mỗi dòng trong mask cắt riêng */}
        <h1 className="hero-headline">
          <div className="headline-mask-line">
            <span className="headline-text animate-rise-1" id="headlineLine1">
              <span className="days-num" id="daysCount">
                {effort.days}
              </span>{' '}
              ngày
            </span>
          </div>
          <div className="headline-mask-line">
            <span className="headline-text animate-rise-2" id="headlineLine2">
              nỗ lực không bỏ cuộc
            </span>
          </div>
          <div className="headline-mask-line">
            <span className="headline-text animate-rise-3" id="headlineLine3">
              vì <span className="person-name-inline">{personName}</span>
            </span>
          </div>
        </h1>

        {/* Lede 2 dòng kèm mốc thời gian và nút đổi ngày trực tiếp */}
        <div className="hero-lede">
          <div className="lede-mask-line">
            <div className="lede-time-row animate-lift-lede-1" id="ledeLine1">
              <span className="live-clock-pill">
                <span className="live-pulse-dot" aria-hidden="true" />
                <span id="counterLiveClock">{effort.clockText}</span>
              </span>
              <span className="time-since-label">kể từ</span>
              <span className="date-chip" id="counterStartDateDisplay">
                {effort.formattedStartDate || '--/--/----'}
              </span>
              <label className="btn-inline-date-edit" title="Bấm để đổi ngày bắt đầu nỗ lực (tự động lưu vào CSDL)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Đổi ngày</span>
                <input
                  type="date"
                  id="quickDateInput"
                  className="sr-only"
                  aria-label="Chọn ngày bắt đầu nỗ lực mới"
                  onChange={handleDateInput}
                  value={startDate.substring(0, 10)}
                />
              </label>
            </div>
          </div>
          <div className="lede-mask-line">
            <p className="lede-text lede-quote animate-lift-lede-2" id="ledeLine2">
              Mỗi ngày đều đang nổ lực vì em
            </p>
          </div>
        </div>

        {/* Đoạn chữ cập nhật cho trình đọc màn hình */}
        <div className="sr-only" id="srTimeAnnounce">
          Đã nỗ lực {effort.days} ngày, {effort.hours} giờ và {effort.minutes} phút kể từ {effort.formattedStartDate}
        </div>

        {/* Nút hành động */}
        <div className="hero-actions-row">
          <a
            href="#photos"
            className="pill-cream-cta animate-lift-cta"
            id="ctaToPhotos"
            onClick={(e) => {
              e.preventDefault();
              onNavigate(2);
            }}
          >
            <span>Xem hình ảnh của </span>
            <span className="person-name-inline">{personName}</span>
            <span className="btn-disc-dark">
              <svg width="6" height="7" viewBox="0 0 6 7" fill="none">
                <path d="M.6.6 4 4 .6 7.4" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </a>
          <button
            type="button"
            className="text-link-teal animate-lift-link"
            id="quickAddPhotoBtn"
            onClick={onOpenAddPhoto}
          >
            Thêm hình ảnh
          </button>
        </div>
      </div>

      {/* Cue góc dưới phải trang 1 */}
      <a
        href="#photos"
        className="scroll-cue-btn cue-right animate-lift-cue"
        id="cueToPhotos"
        aria-label="Sang trang hình ảnh"
        onClick={(e) => {
          e.preventDefault();
          onNavigate(2);
        }}
      >
        <span className="cue-label">Vuốt sang phải</span>
        <svg className="cue-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4 2L8 6L4 10" stroke="#7CCBBA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </section>
  );
};
