import React, { useState, useEffect } from 'react';

interface HeaderProps {
  personName: string;
  activePage: number; // 1 for days, 2 for photos
  isClearBg: boolean;
  onToggleClearBg: () => void;
  onLockGate: () => void;
  onOpenAdmin: () => void;
  onNavigate: (page: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  personName,
  activePage,
  isClearBg,
  onToggleClearBg,
  onLockGate,
  onOpenAdmin,
  onNavigate,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const initialChar = personName.trim().charAt(0).toUpperCase() || 'Đ';

  const handleNavClick = (page: number, e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="river-header" id="riverHeader">
        {/* Pill kính trên cùng bên trái */}
        <a
          href="#days"
          onClick={(e) => handleNavClick(1, e)}
          className="pill-glass-brand"
          id="brandLogoLink"
          aria-label={`Trang ${personName}`}
        >
          <span className="brand-disc" id="brandInitialDisc">
            {initialChar}
          </span>
          <svg className="brand-star-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="#315352" />
          </svg>
        </a>

        {/* Nav pill đen trung tâm (desktop) */}
        <nav className="nav-pill-black" id="desktopNavPill" aria-label="Thanh điều hướng chính">
          <a
            href="#days"
            onClick={(e) => handleNavClick(1, e)}
            className="nav-pill-link"
            id="navLinkDays"
            aria-current={activePage === 1 ? 'page' : undefined}
          >
            Số ngày nỗ lực
          </a>
          <a
            href="#photos"
            onClick={(e) => handleNavClick(2, e)}
            className="nav-pill-link"
            id="navLinkPhotos"
            aria-current={activePage === 2 ? 'page' : undefined}
          >
            <span>Hình ảnh của </span>
            <span className="person-name-inline">{personName}</span>
          </a>
          <button
            type="button"
            className="pill-cream-admin"
            id="openAdminBtn"
            title="Bảng quản lý"
            onClick={onOpenAdmin}
          >
            <span>Quản lý</span>
            <span className="btn-disc-pine">
              <svg width="6" height="7" viewBox="0 0 6 7" fill="none">
                <path d="M.6.6 4 4 .6 7.4" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        </nav>

        {/* Nhóm nút góc trên phải */}
        <div className="header-right">
          {/* Nút khóa cổng */}
          <button
            type="button"
            className="circle-blur-btn"
            id="lockGateBtn"
            aria-label="Khóa cổng cá nhân"
            title="Khóa cổng cá nhân"
            onClick={onLockGate}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </button>

          {/* Nút xem rõ ảnh nền */}
          <button
            type="button"
            className="circle-blur-btn"
            id="toggleClearBgBtn"
            aria-label="Xem rõ ảnh nền"
            aria-pressed={isClearBg}
            title="Xem rõ hoặc làm mờ ảnh nền"
            onClick={onToggleClearBg}
          >
            <svg className="eye-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {/* Nút menu mobile */}
          <button
            type="button"
            className="mobile-menu-btn"
            id="mobileMenuBtn"
            aria-label="Mở menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="menu-bar bar-1" />
            <span className="menu-bar bar-2" />
            <span className="menu-bar bar-3" />
          </button>
        </div>
      </header>

      {/* Menu trượt mobile */}
      <div
        className={`mobile-nav-panel ${mobileMenuOpen ? 'is-open' : ''}`}
        id="mobileNavPanel"
        aria-hidden={!mobileMenuOpen}
      >
        <div className="mobile-nav-inner">
          <a
            href="#days"
            className={`mobile-nav-link ${activePage === 1 ? 'active' : ''}`}
            onClick={(e) => handleNavClick(1, e)}
          >
            Số ngày nỗ lực
          </a>
          <a
            href="#photos"
            className={`mobile-nav-link ${activePage === 2 ? 'active' : ''}`}
            onClick={(e) => handleNavClick(2, e)}
          >
            <span>Hình ảnh của </span>
            <span className="person-name-inline">{personName}</span>
          </a>
          <button
            type="button"
            className="mobile-nav-link"
            style={{
              background: 'none',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              width: '100%',
            }}
            onClick={() => {
              setMobileMenuOpen(false);
              onLockGate();
            }}
          >
            <span>🔒 Khóa cổng</span>
          </button>
          <button
            type="button"
            className="mobile-admin-btn"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenAdmin();
            }}
          >
            <span>Quản lý</span>
            <span className="btn-disc-pine">
              <svg width="6" height="7" viewBox="0 0 6 7" fill="none">
                <path d="M.6.6 4 4 .6 7.4" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
