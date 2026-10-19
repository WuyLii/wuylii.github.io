import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Photo, PhotoMediaItem, SiteConfig, ToastItem, LightboxState } from './types';
import { StorageService, DEFAULT_CONFIG } from './services/storage';
import { formatDateDisplay } from './utils/dateUtils';
import { BackgroundLayers } from './components/BackgroundLayers';
import { Header } from './components/Header';
import { DaysPage } from './components/DaysPage';
import { PhotosPage } from './components/PhotosPage';
import { PasswordGate } from './components/PasswordGate';
import { Lightbox } from './components/Lightbox';
import { PhotoModal } from './components/PhotoModal';
import { AdminModal } from './components/AdminModal';
import { Toast } from './components/Toast';

export const App: React.FC = () => {
  // Gate Unlock State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('memoryGateUnlocked') === 'true';
  });

  // Config State
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);

  // Photos & Media
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, PhotoMediaItem[]>>({});

  // Active page: 1 (#days) or 2 (#photos)
  const [activePage, setActivePage] = useState<number>(() => {
    return window.location.hash === '#photos' ? 2 : 1;
  });

  // Background state
  const [isClearBg, setIsClearBg] = useState<boolean>(false);

  // Modals state
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);

  // Lightbox state
  const [lightbox, setLightbox] = useState<LightboxState>({
    isOpen: false,
    items: [],
    index: 0,
    title: '',
    dateStr: '',
    desc: '',
  });

  // Toast stack
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Toast trigger
  const showToast = useCallback((message: string, type: 'success' | 'error' | '' = '') => {
    const id = `${Date.now()}_${Math.random()}`;
    const newToast: ToastItem = { id, message, type };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // Sync body class for gate active
  useEffect(() => {
    if (isUnlocked) {
      document.body.classList.remove('gate-active');
    } else {
      document.body.classList.add('gate-active');
    }
  }, [isUnlocked]);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoadingConfig(true);
      const loadedConfig = await StorageService.loadConfig();
      setConfig(loadedConfig);

      const { photos: loadedPhotos, mediaMap: loadedMediaMap } = await StorageService.getPhotos();
      setPhotos(loadedPhotos);
      setMediaMap(loadedMediaMap);
    } catch (e) {
      console.warn('Lỗi tải dữ liệu ban đầu:', e);
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    StorageService.pingHeartbeat();
  }, [loadData]);

  // Hash & Navigation synchronization
  const navigateToPage = useCallback((pageNum: number) => {
    setActivePage(pageNum);
    const targetHash = pageNum === 2 ? '#photos' : '#days';
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }, []);

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#photos') {
        setActivePage(2);
      } else {
        setActivePage(1);
      }
    };

    window.addEventListener('hashchange', handleHash);
    window.addEventListener('popstate', handleHash);
    handleHash();

    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('popstate', handleHash);
    };
  }, []);

  // Update root CSS variable --bg-shift based on active page
  useEffect(() => {
    document.documentElement.style.setProperty('--bg-shift', activePage === 2 ? '-4%' : '0%');
  }, [activePage]);

  // Keyboard navigation for pages
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate pages if modal/lightbox is active or user is typing
      if (
        lightbox.isOpen ||
        isPhotoModalOpen ||
        isAdminOpen ||
        !isUnlocked ||
        ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      ) {
        return;
      }

      if (e.key === 'ArrowRight' && activePage === 1) {
        navigateToPage(2);
      } else if (e.key === 'ArrowLeft' && activePage === 2) {
        navigateToPage(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox.isOpen, isPhotoModalOpen, isAdminOpen, isUnlocked, activePage, navigateToPage]);

  // Touch Swipe for pages
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startedInsideStripRef = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (lightbox.isOpen || isPhotoModalOpen || isAdminOpen || !isUnlocked) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    const strip = document.getElementById('photoScrollStrip');
    startedInsideStripRef.current = strip ? strip.contains(e.target as Node) : false;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (lightbox.isOpen || isPhotoModalOpen || isAdminOpen || !isUnlocked) return;
    const t = e.changedTouches[0];
    const diffX = t.clientX - touchStartRef.current.x;
    const diffY = t.clientY - touchStartRef.current.y;

    if (Math.abs(diffX) < 50 || Math.abs(diffX) < Math.abs(diffY) * 1.5) return;

    if (diffX < 0) {
      // Swipe left -> page 2
      if (activePage === 1) {
        navigateToPage(2);
      }
    } else {
      // Swipe right -> page 1
      if (activePage === 2) {
        const strip = document.getElementById('photoScrollStrip');
        if (!startedInsideStripRef.current || (strip && strip.scrollLeft <= 5)) {
          navigateToPage(1);
        }
      }
    }
  };

  // Lock Gate Handler
  const handleLockGate = () => {
    sessionStorage.removeItem('memoryGateUnlocked');
    setIsUnlocked(false);
    showToast('Đã khóa không gian cá nhân', '');
  };

  // Lightbox handlers
  const handleSelectPhoto = (photo: Photo) => {
    const items: Array<{ url: string; type: 'image' | 'video' }> = [];
    if (photo.media_url) {
      items.push({ url: photo.media_url, type: photo.media_type || 'image' });
    }
    const extras = mediaMap[photo.id] || [];
    extras.forEach((m) => {
      items.push({ url: m.media_url, type: m.media_type || 'image' });
    });

    if (!items.length) return;

    setLightbox({
      isOpen: true,
      items,
      index: 0,
      title: photo.title || 'Khoảnh khắc',
      dateStr: formatDateDisplay(photo.date),
      desc: photo.description || '',
    });
  };

  const handleLightboxClose = () => {
    setLightbox((prev) => ({ ...prev, isOpen: false }));
  };

  const handleLightboxPrev = () => {
    setLightbox((prev) => ({
      ...prev,
      index: prev.index > 0 ? prev.index - 1 : prev.items.length - 1,
    }));
  };

  const handleLightboxNext = () => {
    setLightbox((prev) => ({
      ...prev,
      index: prev.index < prev.items.length - 1 ? prev.index + 1 : 0,
    }));
  };

  // Quick Date Change from Page 1
  const handleQuickDateChange = async (newDateIso: string) => {
    try {
      showToast('Đang cập nhật ngày nỗ lực...', '');
      await StorageService.setConfig('start_date', newDateIso);
      setConfig((prev) => ({ ...prev, start_date: newDateIso }));
      showToast('✓ Đã cập nhật ngày nỗ lực!', 'success');
    } catch (e: any) {
      showToast('Lỗi: ' + (e.message || ''), 'error');
    }
  };

  // Admin Save Info
  const handleSaveInfo = async (name: string, startDateIso: string) => {
    await StorageService.setConfig('person_name', name);
    await StorageService.setConfig('start_date', startDateIso);
    setConfig((prev) => ({ ...prev, person_name: name, start_date: startDateIso }));
  };

  // Admin Save Bg
  const handleSaveBgSettings = async (bgImg: string, bgPos: string) => {
    await StorageService.setConfig('bg_image', bgImg);
    await StorageService.setConfig('bg_position', bgPos);
    setConfig((prev) => ({ ...prev, bg_image: bgImg, bg_position: bgPos }));
  };

  // Admin Update Password
  const handleUpdatePassword = async (newHash: string) => {
    await StorageService.setConfig('gate_password_hash', newHash);
    setConfig((prev) => ({ ...prev, gate_password_hash: newHash }));
  };

  // Photo Save (Add or Update)
  const handleSavePhoto = async (
    photoData: Omit<Photo, 'id'>,
    extras: PhotoMediaItem[],
    editId?: string
  ) => {
    if (editId) {
      await StorageService.updatePhoto(editId, photoData, extras);
    } else {
      await StorageService.insertPhoto(photoData, extras);
    }
    const refreshed = await StorageService.getPhotos();
    setPhotos(refreshed.photos);
    setMediaMap(refreshed.mediaMap);
  };

  // Photo Delete
  const handleDeletePhoto = async (photoId: string) => {
    try {
      showToast('Đang xóa...', '');
      await StorageService.deletePhoto(photoId);
      const refreshed = await StorageService.getPhotos();
      setPhotos(refreshed.photos);
      setMediaMap(refreshed.mediaMap);
      showToast('✓ Đã xóa hình ảnh!', 'success');
    } catch (e: any) {
      showToast('Lỗi xóa: ' + (e.message || ''), 'error');
    }
  };

  return (
    <>
      {/* Password Gate */}
      <PasswordGate
        isUnlocked={isUnlocked}
        expectedHash={config.gate_password_hash}
        salt={config.gate_password_salt}
        isLoading={isLoadingConfig}
        onUnlockSuccess={() => setIsUnlocked(true)}
        onToast={showToast}
      />

      {/* Main Viewport Stage */}
      <div
        className={`viewport-stage ${activePage === 2 ? 'is-page-2' : ''}`}
        id="viewportStage"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Parallax & Dual Blur Background */}
        <BackgroundLayers
          bgImage={config.bg_image}
          bgPosition={config.bg_position}
          isClearBg={isClearBg}
        />

        {/* Navigation Header */}
        <Header
          personName={config.person_name}
          activePage={activePage}
          isClearBg={isClearBg}
          onToggleClearBg={() => setIsClearBg(!isClearBg)}
          onLockGate={handleLockGate}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onNavigate={navigateToPage}
        />

        {/* 200% Horizontal Sliding Pages Track */}
        <main
          className="pages-track"
          id="pagesTrack"
          style={{
            transform: activePage === 2 ? 'translateX(-50%)' : 'translateX(0)',
          }}
        >
          {/* Page 1: Days Counter */}
          <DaysPage
            personName={config.person_name}
            startDate={config.start_date}
            active={activePage === 1}
            onNavigate={navigateToPage}
            onOpenAddPhoto={() => {
              setEditingPhoto(null);
              setIsPhotoModalOpen(true);
            }}
            onQuickDateChange={handleQuickDateChange}
          />

          {/* Page 2: Photos Gallery */}
          <PhotosPage
            personName={config.person_name}
            photos={photos}
            mediaMap={mediaMap}
            active={activePage === 2}
            onNavigate={navigateToPage}
            onOpenAddPhoto={() => {
              setEditingPhoto(null);
              setIsPhotoModalOpen(true);
            }}
            onSelectPhoto={handleSelectPhoto}
          />
        </main>
      </div>

      {/* Fullscreen Lightbox */}
      <Lightbox
        lightbox={lightbox}
        onClose={handleLightboxClose}
        onPrev={handleLightboxPrev}
        onNext={handleLightboxNext}
      />

      {/* Photo Add / Edit Modal */}
      <PhotoModal
        isOpen={isPhotoModalOpen}
        editingPhoto={editingPhoto}
        initialMedia={editingPhoto ? mediaMap[editingPhoto.id] || [] : []}
        onClose={() => {
          setIsPhotoModalOpen(false);
          setEditingPhoto(null);
        }}
        onSave={handleSavePhoto}
        onToast={showToast}
      />

      {/* Admin Panel Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        config={config}
        photos={photos}
        onClose={() => setIsAdminOpen(false)}
        onSaveInfo={handleSaveInfo}
        onSaveBgSettings={handleSaveBgSettings}
        onUpdatePassword={handleUpdatePassword}
        onEditPhoto={(photo) => {
          setEditingPhoto(photo);
          setIsPhotoModalOpen(true);
        }}
        onDeletePhoto={handleDeletePhoto}
        onToast={showToast}
      />

      {/* Toasts */}
      <Toast toasts={toasts} />
    </>
  );
};
