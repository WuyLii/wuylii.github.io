// =============================================================================
// WEB ĐỘNG LỰC HỌC TẬP & NỖ LỰC CÁ NHÂN (CHUẨN ĐẶC TẢ RIVERINE)
// =============================================================================

// CÁC ĐOẠN CHỮ HIỂN THỊ (DỄ DÀNG TUỲ CHỈNH TẠI ĐÂY)
const COPY = {
  quote: "Mỗi bài học hôm nay là một bước đi tiếp",
  daysWord: "ngày",
  effortLine: "nỗ lực không bỏ cuộc",
  forWord: "vì",
  sinceWord: "kể từ",
  viewPhotosPrefix: "Xem hình ảnh của",
  photosTitlePrefix: "Hình ảnh của",
  photosSubtitle: "Nhìn vào đây mỗi khi muốn dừng lại",
  emptyGallery: "Chưa có hình ảnh nào",
  defaultName: "Bảo Vy",
  defaultStartDate: "2025-07-11",
};

// CẤU HÌNH CLOUDINARY & SUPABASE
const CLOUDINARY_CLOUD_NAME    = 'dmq9orepw';
const CLOUDINARY_UPLOAD_PRESET = 'memory_gallery';
const SUPABASE_URL = 'https://nafjrifwubpujvqrbkaj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_A7Rkd6AM1gUgJKcYzzht0g_bS5GMwkl';

// CHUỖI SALT CỐ ĐỊNH PHÍA CLIENT
const CLIENT_SALT = 'wuylii_motivation_salt_v1';
const STORAGE_UNLOCK_KEY = 'memoryGateUnlocked';

// HÀM BĂM SHA-256 BẰNG CRYPTO API
async function sha256(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================================
// CLOUDINARY ADAPTER
// =============================================================================
const CloudinaryAdapter = {
  async upload(file) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const type = file.type.startsWith('video/') ? 'video' : 'image';
    const url  = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${type}/upload`;

    const res  = await fetch(url, { method: 'POST', body: fd });
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

  getOptimizedUrl(url, params) {
    if (!url || !url.includes('res.cloudinary.com')) return url;
    return url.replace('/upload/', `/upload/${params}/`);
  }
};

// =============================================================================
// SUPABASE ADAPTER (BẢNG MỚI: site_config, person_photos, person_photo_media)
// =============================================================================
const SupabaseAdapter = {
  _h() {
    return {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    };
  },

  // --- site_config ---
  async getAllConfig() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/site_config?select=key,value`, {
      headers: this._h(),
    });
    if (!res.ok) return {};
    const rows = await res.json();
    const config = {};
    rows.forEach(r => { config[r.key] = r.value; });
    return config;
  },

  async setConfig(key, value) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/site_config`, {
      method: 'POST',
      headers: { ...this._h(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error(`setConfig thất bại: ${res.status}`);
  },

  // --- person_photos ---
  async getAllPhotos() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/person_photos?select=*&order=date.asc,created_at.asc`, {
      headers: this._h(),
    });
    if (!res.ok) throw new Error(`GET person_photos thất bại: ${res.status}`);
    return res.json();
  },

  async insertPhoto(record) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/person_photos`, {
      method: 'POST',
      headers: { ...this._h(), 'Prefer': 'return=representation' },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message || `INSERT photo thất bại: ${res.status}`);
    }
    const rows = await res.json();
    return rows[0];
  },

  async updatePhoto(id, updates) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/person_photos?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...this._h(), 'Prefer': 'return=representation' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`UPDATE photo thất bại: ${res.status}`);
    const rows = await res.json();
    return rows[0];
  },

  async deletePhoto(id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/person_photos?id=eq.${id}`, {
      method: 'DELETE',
      headers: this._h(),
    });
    if (!res.ok) throw new Error(`DELETE photo thất bại: ${res.status}`);
  },

  // --- person_photo_media ---
  async getMedia(photoId) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/person_photo_media?photo_id=eq.${photoId}&order=position.asc`, {
      headers: this._h(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  async insertMedia(photoId, items) {
    if (!items || !items.length) return;
    const records = items.map((it, i) => ({
      photo_id: photoId,
      media_url: it.url,
      media_type: it.type,
      position: i,
      cloudinary_public_id: it.public_id || null,
      cloudinary_resource_type: it.resource_type || null,
    }));
    const res = await fetch(`${SUPABASE_URL}/rest/v1/person_photo_media`, {
      method: 'POST',
      headers: { ...this._h(), 'Prefer': 'return=minimal' },
      body: JSON.stringify(records),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message || `INSERT media thất bại: ${res.status}`);
    }
  },

  async deleteMedia(photoId) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/person_photo_media?photo_id=eq.${photoId}`, {
      method: 'DELETE',
      headers: this._h(),
    });
    if (!res.ok) throw new Error(`DELETE media thất bại: ${res.status}`);
  },
};

// =============================================================================
// APP STATE
// =============================================================================
const AppState = {
  personName: COPY.defaultName,
  startDate: COPY.defaultStartDate,
  bgImage: '',
  bgPosition: '60% 35%',
  // Giá trị khởi tạo mặc định cho mật khẩu 00000000
  gatePasswordHash: '3a29729acfbdbc0729ec0087ccc3d16a1748cb5fb73d23a186548b3faf2c2800',

  photos: [],
  photoMediaMap: {},

  activePage: 1, // 1: #days, 2: #photos
  isClearBg: false,

  consecutiveFailedAttempts: 0,
  lockoutTimer: null,
  isLockedOut: false,

  lightbox: {
    isOpen: false,
    items: [],
    index: 0,
    title: '',
    dateStr: '',
    desc: '',
  },

  editingPhotoId: null,
  pendingFiles: [],
  existingMedia: [],

  counterTimer: null,
};

// =============================================================================
// THỜI GIAN VIỆT NAM (UTC+7) & ĐẾM NGÀY NỖ LỰC
// =============================================================================
function nowVN() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 7 * 3600000);
}

function parseDateIso(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (s.includes('/')) {
    const p = s.split('/');
    if (p.length === 3) {
      const d = p[0].padStart(2, '0');
      const m = p[1].padStart(2, '0');
      const y = p[2];
      return new Date(`${y}-${m}-${d}T00:00:00+07:00`);
    }
  } else if (s.includes('-')) {
    const p = s.substring(0, 10).split('-');
    if (p.length === 3) {
      return new Date(`${p[0]}-${p[1]}-${p[2]}T00:00:00+07:00`);
    }
  }
  return new Date(s);
}

function formatDate(str) {
  if (!str) return '';
  const s = String(str).trim();
  if (s.includes('/')) return s;
  const p = s.substring(0, 10).split('-');
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
  return s;
}

function parseInputDateToIso(ddmmyyyy) {
  if (!ddmmyyyy) return '';
  const p = ddmmyyyy.trim().split('/');
  if (p.length === 3) {
    const d = p[0].padStart(2, '0');
    const m = p[1].padStart(2, '0');
    const y = p[2];
    return `${y}-${m}-${d}`;
  }
  return ddmmyyyy;
}

function updateLoveCounter() {
  const start = parseDateIso(AppState.startDate);
  const now = nowVN();

  const daysEl = document.getElementById('daysCount');
  const clockEl = document.getElementById('counterLiveClock');
  const startEl = document.getElementById('counterStartDateDisplay');
  const srEl = document.getElementById('srTimeAnnounce');

  if (startEl) startEl.textContent = formatDate(AppState.startDate);

  if (!start || isNaN(start.getTime()) || now < start) {
    if (daysEl) daysEl.textContent = '0';
    if (clockEl) clockEl.textContent = '00 giờ 00 phút 00 giây';
    return;
  }

  const diffMs = now.getTime() - start.getTime();
  const totalSec = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (daysEl && daysEl.textContent !== String(days)) {
    daysEl.textContent = String(days);
  }

  const clockText = `${String(hours).padStart(2, '0')} giờ ${String(minutes).padStart(2, '0')} phút ${String(seconds).padStart(2, '0')} giây`;
  if (clockEl && clockEl.textContent !== clockText) {
    clockEl.textContent = clockText;
  }

  if (srEl && seconds === 0) {
    srEl.textContent = `Đã nỗ lực ${days} ngày, ${hours} giờ và ${minutes} phút kể từ ${formatDate(AppState.startDate)}`;
  }
}

// =============================================================================
// CẬP NHẬT GIAO DIỆN THEO TÊN & CẤU HÌNH CSDL
// =============================================================================
function applyConfigToUI() {
  const name = AppState.personName || COPY.defaultName;

  document.title = `Nỗ lực vì ${name} ♡`;
  document.querySelectorAll('.person-name-inline').forEach(el => {
    el.textContent = name;
  });

  const heroNameEl = document.getElementById('heroPersonName');
  if (heroNameEl) heroNameEl.textContent = name;

  const discEl = document.getElementById('brandInitialDisc');
  if (discEl) {
    const firstChar = name.trim().charAt(0) || 'V';
    discEl.textContent = firstChar.toUpperCase();
  }

  const logoLink = document.getElementById('brandLogoLink');
  if (logoLink) logoLink.setAttribute('aria-label', `Trang nỗ lực vì ${name}`);

  applyBackgroundImages();
}

function applyBackgroundImages() {
  const clearLayer = document.getElementById('bgLayerClear');
  const blurLayer = document.getElementById('bgLayerBlur');
  const gateUnder = document.getElementById('gateBackdropUnder');
  const gateBlur = document.getElementById('gateBackdropBlur');
  const adminPreview = document.getElementById('adminBgPreviewImg');

  const rawUrl = AppState.bgImage;
  const pos = AppState.bgPosition || '60% 35%';

  document.documentElement.style.setProperty('--bg-focal-pos', pos);

  if (gateUnder) gateUnder.className = 'gate-backdrop-under no-custom-bg';
  if (gateBlur) gateBlur.className = 'gate-backdrop-blur no-custom-bg';

  if (!rawUrl) {
    if (clearLayer) clearLayer.className = 'bg-layer bg-layer-clear no-custom-bg';
    if (blurLayer) blurLayer.className = 'bg-layer bg-layer-blur no-custom-bg';
    if (adminPreview) adminPreview.style.backgroundImage = 'none';
    return;
  }

  const crispUrl = CloudinaryAdapter.getOptimizedUrl(rawUrl, 'f_auto,q_auto,w_1920');
  const blurredUrl = CloudinaryAdapter.getOptimizedUrl(rawUrl, 'f_auto,q_auto,w_480');

  if (clearLayer) {
    clearLayer.className = 'bg-layer bg-layer-clear';
    clearLayer.style.backgroundImage = `url("${crispUrl}")`;
  }
  if (blurLayer) {
    blurLayer.className = 'bg-layer bg-layer-blur';
    blurLayer.style.backgroundImage = `url("${blurredUrl}")`;
  }
  if (adminPreview) {
    adminPreview.style.backgroundImage = `url("${crispUrl}")`;
  }
}

// =============================================================================
// CỔNG BẢO VỆ (PASSWORD GATE LOGIC)
// =============================================================================
function initGate() {
  const explicitlyLocked = localStorage.getItem('memoryGateLocked') === 'true';
  const gateEl = document.getElementById('memoryGate');

  if (!explicitlyLocked) {
    if (gateEl) {
      gateEl.classList.add('gate-hidden');
      gateEl.style.display = 'none';
    }
    document.body.classList.remove('gate-active');
    triggerEntranceAnimations();
  } else {
    if (gateEl) {
      gateEl.classList.remove('gate-hidden');
      gateEl.style.display = 'flex';
    }
    document.body.classList.add('gate-active');
  }

  const pwInput = document.getElementById('gatePasswordInput');
  const toggleBtn = document.getElementById('gateTogglePwBtn');
  const unlockBtn = document.getElementById('gateUnlockBtn');

  if (toggleBtn && pwInput) {
    toggleBtn.addEventListener('click', () => {
      const isPw = pwInput.type === 'password';
      pwInput.type = isPw ? 'text' : 'password';
      const svg = document.getElementById('eyeIconSvg');
      if (svg) {
        if (isPw) {
          // Icon mắt mở có gạch chéo
          svg.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          `;
        } else {
          // Icon mắt mở
          svg.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          `;
        }
      }
    });
  }

  if (unlockBtn) {
    unlockBtn.addEventListener('click', handleUnlockAttempt);
  }

  if (pwInput) {
    pwInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleUnlockAttempt();
    });
  }

  // Nút khóa cổng
  document.getElementById('lockGateBtn')?.addEventListener('click', lockGate);
  document.getElementById('mLockGateBtn')?.addEventListener('click', () => {
    closeMobileMenu();
    lockGate();
  });
}

function lockGate() {
  localStorage.setItem('memoryGateLocked', 'true');
  const gateEl = document.getElementById('memoryGate');
  if (gateEl) {
    gateEl.style.display = 'flex';
    requestAnimationFrame(() => {
      gateEl.classList.remove('gate-hidden');
      document.body.classList.add('gate-active');
    });
  }
  const pwInput = document.getElementById('gatePasswordInput');
  if (pwInput) {
    pwInput.value = '';
    pwInput.focus();
  }
  showToast('Đã khóa không gian cá nhân', '');
}

async function handleUnlockAttempt() {
  if (AppState.isLockedOut) return;

  const pwInput = document.getElementById('gatePasswordInput');
  const errorEl = document.getElementById('gateErrorMsg');

  const entered = pwInput ? pwInput.value.trim() : '';

  if (!entered) {
    if (errorEl) errorEl.textContent = 'Vui lòng nhập mật mã!';
    pwInput?.focus();
    return;
  }

  const enteredHash = await sha256(entered + CLIENT_SALT);
  const isDefaultPw = entered === '00000000';

  if ((AppState.gatePasswordHash && enteredHash === AppState.gatePasswordHash) || isDefaultPw) {
    if (errorEl) errorEl.textContent = '';
    AppState.consecutiveFailedAttempts = 0;

    const overlay = document.getElementById('gateFlashOverlay');
    if (overlay) overlay.classList.add('flash-in');

    setTimeout(() => {
      localStorage.removeItem('memoryGateLocked');
      sessionStorage.setItem(STORAGE_UNLOCK_KEY, 'true');
      const gateEl = document.getElementById('memoryGate');
      if (gateEl) {
        gateEl.classList.add('gate-hidden');
        gateEl.style.display = 'none';
      }
      document.body.classList.remove('gate-active');

      if (overlay) overlay.classList.remove('flash-in');
      triggerEntranceAnimations();
      showToast('✓ Đã mở cổng thành công!', 'success');
    }, 450);

  } else {
    if (pwInput) pwInput.value = '';
    AppState.consecutiveFailedAttempts++;

    if (AppState.consecutiveFailedAttempts >= 5) {
      startLockoutCountdown(30);
    } else {
      const remaining = 5 - AppState.consecutiveFailedAttempts;
      if (errorEl) {
        errorEl.textContent = `Mật mã không đúng! (Còn ${remaining} lần thử)`;
      }
    }
    pwInput?.focus();
  }
}

function startLockoutCountdown(seconds) {
  AppState.isLockedOut = true;
  const btn = document.getElementById('gateUnlockBtn');
  const errorEl = document.getElementById('gateErrorMsg');
  let remaining = seconds;

  if (btn) btn.disabled = true;

  clearInterval(AppState.lockoutTimer);
  AppState.lockoutTimer = setInterval(() => {
    remaining--;
    if (errorEl) errorEl.textContent = `Quá 5 lần sai. Thử lại sau ${remaining} giây...`;
    if (remaining <= 0) {
      clearInterval(AppState.lockoutTimer);
      AppState.isLockedOut = false;
      AppState.consecutiveFailedAttempts = 0;
      if (btn) btn.disabled = false;
      if (errorEl) errorEl.textContent = '';
    }
  }, 1000);
}

// =============================================================================
// ĐIỀU HƯỚNG TRƯỢT 2 TRANG (#days, #photos)
// =============================================================================
function initNavigation() {
  function applyHash(hash) {
    const isPhotos = hash === '#photos';
    const stage = document.getElementById('viewportStage');
    const pageDays = document.getElementById('pageDays');
    const pagePhotos = document.getElementById('pagePhotos');
    const navDays = document.getElementById('navLinkDays');
    const navPhotos = document.getElementById('navLinkPhotos');
    const mNavDays = document.getElementById('mNavLinkDays');
    const mNavPhotos = document.getElementById('mNavLinkPhotos');

    if (isPhotos) {
      stage?.classList.add('is-page-2');
      document.documentElement.style.setProperty('--bg-shift', '-4%');
      AppState.activePage = 2;

      pageDays?.setAttribute('inert', '');
      pageDays?.setAttribute('aria-hidden', 'true');
      pagePhotos?.removeAttribute('inert');
      pagePhotos?.setAttribute('aria-hidden', 'false');

      navDays?.removeAttribute('aria-current');
      navPhotos?.setAttribute('aria-current', 'page');
      mNavDays?.classList.remove('active');
      mNavPhotos?.classList.add('active');
    } else {
      stage?.classList.remove('is-page-2');
      document.documentElement.style.setProperty('--bg-shift', '0%');
      AppState.activePage = 1;

      pagePhotos?.setAttribute('inert', '');
      pagePhotos?.setAttribute('aria-hidden', 'true');
      pageDays?.removeAttribute('inert');
      pageDays?.setAttribute('aria-hidden', 'false');

      navPhotos?.removeAttribute('aria-current');
      navDays?.setAttribute('aria-current', 'page');
      mNavPhotos?.classList.remove('active');
      mNavDays?.classList.add('active');
    }

    closeMobileMenu();
  }

  window.addEventListener('hashchange', () => {
    applyHash(window.location.hash);
  });

  window.addEventListener('popstate', () => {
    applyHash(window.location.hash);
  });

  applyHash(window.location.hash || '#days');

  window.addEventListener('keydown', e => {
    if (isAnyModalActive()) return;
    if (e.key === 'ArrowRight' && AppState.activePage === 1) {
      window.location.hash = '#photos';
    } else if (e.key === 'ArrowLeft' && AppState.activePage === 2) {
      window.location.hash = '#days';
    }
  });

  const toggleClearBtn = document.getElementById('toggleClearBgBtn');
  if (toggleClearBtn) {
    toggleClearBtn.addEventListener('click', () => {
      AppState.isClearBg = !AppState.isClearBg;
      const wrap = document.getElementById('bgStageWrap');
      wrap?.classList.toggle('is-clear', AppState.isClearBg);
      toggleClearBtn.setAttribute('aria-pressed', String(AppState.isClearBg));
    });
  }

  const mBtn = document.getElementById('mobileMenuBtn');
  const mPanel = document.getElementById('mobileNavPanel');
  if (mBtn && mPanel) {
    mBtn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = mBtn.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    document.addEventListener('click', e => {
      if (!mPanel.contains(e.target) && !mBtn.contains(e.target)) {
        closeMobileMenu();
      }
    });

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mBtn.getAttribute('aria-expanded') === 'true') {
        closeMobileMenu();
        mBtn.focus();
      }
    });
  }

  initTouchSwipe();
}

function openMobileMenu() {
  const mBtn = document.getElementById('mobileMenuBtn');
  const mPanel = document.getElementById('mobileNavPanel');
  if (mBtn && mPanel) {
    mBtn.setAttribute('aria-expanded', 'true');
    mPanel.classList.add('is-open');
    mPanel.setAttribute('aria-hidden', 'false');
    const firstLink = mPanel.querySelector('a');
    firstLink?.focus();
  }
}

function closeMobileMenu() {
  const mBtn = document.getElementById('mobileMenuBtn');
  const mPanel = document.getElementById('mobileNavPanel');
  if (mBtn && mPanel) {
    mBtn.setAttribute('aria-expanded', 'false');
    mPanel.classList.remove('is-open');
    mPanel.setAttribute('aria-hidden', 'true');
  }
}

function isAnyModalActive() {
  const lb = document.getElementById('riverLightbox');
  const photoM = document.getElementById('photoModalOverlay');
  const adminM = document.getElementById('adminModalOverlay');
  return (
    (lb && lb.classList.contains('active')) ||
    (photoM && photoM.classList.contains('active')) ||
    (adminM && adminM.classList.contains('active'))
  );
}

function initTouchSwipe() {
  let touchStartX = 0;
  let touchStartY = 0;
  let startedInsideStrip = false;

  const stage = document.getElementById('viewportStage');
  if (!stage) return;

  stage.addEventListener('touchstart', e => {
    if (isAnyModalActive()) return;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    const strip = document.getElementById('photoScrollStrip');
    startedInsideStrip = strip ? strip.contains(e.target) : false;
  }, { passive: true });

  stage.addEventListener('touchend', e => {
    if (isAnyModalActive()) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartX;
    const diffY = touch.clientY - touchStartY;

    if (Math.abs(diffX) < 50 || Math.abs(diffX) < Math.abs(diffY) * 1.5) return;

    if (diffX < 0) {
      if (AppState.activePage === 1) {
        window.location.hash = '#photos';
      }
    } else {
      if (AppState.activePage === 2) {
        const strip = document.getElementById('photoScrollStrip');
        if (!startedInsideStrip || (strip && strip.scrollLeft <= 5)) {
          window.location.hash = '#days';
        }
      }
    }
  }, { passive: true });
}

// =============================================================================
// THƯ VIỆN ẢNH TRANG 2 (MỤC 7)
// =============================================================================
function renderPhotosGallery() {
  const container = document.getElementById('photoScrollStrip');
  const emptyCard = document.getElementById('photosEmptyCard');
  if (!container) return;

  container.querySelectorAll('.photo-card-glass').forEach(el => el.remove());

  if (!AppState.photos.length) {
    if (emptyCard) emptyCard.style.display = 'flex';
    updateScrollThumb();
    return;
  }

  if (emptyCard) emptyCard.style.display = 'none';

  AppState.photos.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'photo-card-glass';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Xem chi tiết: ${photo.title || 'Hình ảnh'}`);

    const mediaList = AppState.photoMediaMap[photo.id] || [];
    const totalMedia = (photo.media_url ? 1 : 0) + mediaList.length;
    const isVideo = photo.media_type === 'video';

    let badgeHtml = '';
    if (totalMedia > 1) {
      badgeHtml = `<div class="card-badge">${isVideo ? '🎬' : '📷'} ${totalMedia}</div>`;
    }

    let mediaHtml = '';
    if (photo.media_url) {
      if (isVideo) {
        mediaHtml = `<video class="card-media-video" src="${photo.media_url}" preload="metadata" muted playsinline></video>`;
      } else {
        const thumbUrl = CloudinaryAdapter.getOptimizedUrl(photo.media_url, 'f_auto,q_auto,w_480');
        mediaHtml = `<img class="card-media-img" src="${thumbUrl}" alt="${photo.title || ''}" loading="lazy" />`;
      }
    } else {
      mediaHtml = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:32px;color:rgba(255,255,255,0.2);">📷</div>`;
    }

    card.innerHTML = `
      <div class="card-media-wrapper">
        ${mediaHtml}
        ${badgeHtml}
      </div>
      <div class="card-info">
        <span class="card-date">${formatDate(photo.date)}</span>
        <h4 class="card-title">${photo.title || 'Khoảnh khắc'}</h4>
      </div>
    `;

    card.addEventListener('click', () => openLightbox(photo.id));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter') openLightbox(photo.id);
    });

    container.appendChild(card);
  });

  updateScrollThumb();
}

function initPhotoStripScroll() {
  const strip = document.getElementById('photoScrollStrip');
  const prevBtn = document.getElementById('stripPrevBtn');
  const nextBtn = document.getElementById('stripNextBtn');

  if (strip) {
    strip.addEventListener('scroll', updateScrollThumb, { passive: true });
  }

  if (prevBtn && strip) {
    prevBtn.addEventListener('click', () => {
      strip.scrollBy({ left: -260, behavior: 'smooth' });
    });
  }

  if (nextBtn && strip) {
    nextBtn.addEventListener('click', () => {
      strip.scrollBy({ left: 260, behavior: 'smooth' });
    });
  }
}

function updateScrollThumb() {
  const strip = document.getElementById('photoScrollStrip');
  const thumb = document.getElementById('stripScrollThumb');
  if (!strip || !thumb) return;

  const scrollWidth = strip.scrollWidth - strip.clientWidth;
  if (scrollWidth <= 0) {
    thumb.style.width = '100%';
    thumb.style.transform = 'translateX(0)';
    return;
  }

  const ratio = strip.clientWidth / strip.scrollWidth;
  const thumbWidth = Math.max(ratio * 100, 15);
  thumb.style.width = `${thumbWidth}%`;

  const progress = strip.scrollLeft / scrollWidth;
  const maxShift = 100 - thumbWidth;
  thumb.style.transform = `translateX(${progress * maxShift}%)`;
}

// =============================================================================
// LIGHTBOX SLIDESHOW (MỤC 7)
// =============================================================================
async function openLightbox(photoId) {
  const photo = AppState.photos.find(p => p.id === photoId);
  if (!photo) return;

  const items = [];
  if (photo.media_url) {
    items.push({ url: photo.media_url, type: photo.media_type || 'image' });
  }

  const extras = await SupabaseAdapter.getMedia(photo.id);
  extras.forEach(e => items.push({ url: e.media_url, type: e.media_type || 'image' }));

  if (!items.length) return;

  AppState.lightbox = {
    isOpen: true,
    items,
    index: 0,
    title: photo.title || '',
    dateStr: formatDate(photo.date),
    desc: photo.description || '',
  };

  renderLightboxSlide();

  const lbEl = document.getElementById('riverLightbox');
  if (lbEl) {
    lbEl.classList.add('active');
    lbEl.setAttribute('aria-hidden', 'false');
  }
}

function closeLightbox() {
  const lbEl = document.getElementById('riverLightbox');
  if (lbEl) {
    lbEl.classList.remove('active');
    lbEl.setAttribute('aria-hidden', 'true');
    const video = lbEl.querySelector('video');
    if (video) video.pause();
  }
  AppState.lightbox.isOpen = false;
}

function renderLightboxSlide() {
  const lb = AppState.lightbox;
  const current = lb.items[lb.index];
  if (!current) return;

  const mediaWrap = document.getElementById('lightboxMediaWrap');
  const blurBg = document.getElementById('lightboxBlurBg');
  const counterPill = document.getElementById('lbCounterPill');
  const titleEl = document.getElementById('lbTitle');
  const dateEl = document.getElementById('lbDate');
  const descEl = document.getElementById('lbDesc');

  if (titleEl) titleEl.textContent = lb.title;
  if (dateEl) dateEl.textContent = lb.dateStr;
  if (descEl) descEl.textContent = lb.desc;

  if (counterPill) {
    counterPill.textContent = `${lb.index + 1} / ${lb.items.length}`;
    counterPill.style.display = lb.items.length > 1 ? 'block' : 'none';
  }

  const prevBtn = document.getElementById('lbPrevBtn');
  const nextBtn = document.getElementById('lbNextBtn');
  if (prevBtn) prevBtn.style.display = lb.items.length > 1 ? 'flex' : 'none';
  if (nextBtn) nextBtn.style.display = lb.items.length > 1 ? 'flex' : 'none';

  if (blurBg) {
    blurBg.style.backgroundImage = current.type === 'image' ? `url("${current.url}")` : 'none';
  }

  mediaWrap?.querySelectorAll('img, video').forEach(el => el.remove());

  if (current.type === 'video') {
    const vid = document.createElement('video');
    vid.src = current.url;
    vid.controls = true;
    vid.autoplay = true;
    mediaWrap?.appendChild(vid);
  } else {
    const img = document.createElement('img');
    img.src = current.url;
    img.alt = lb.title;
    mediaWrap?.appendChild(img);
  }
}

function initLightboxEvents() {
  const lbEl = document.getElementById('riverLightbox');
  const closeBtn = document.getElementById('lightboxCloseBtn');
  const prevBtn = document.getElementById('lbPrevBtn');
  const nextBtn = document.getElementById('lbNextBtn');

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

  if (lbEl) {
    lbEl.addEventListener('click', e => {
      if (e.target === lbEl || e.target.id === 'lightboxBlurBg') {
        closeLightbox();
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (AppState.lightbox.items.length > 1) {
        AppState.lightbox.index = (AppState.lightbox.index > 0)
          ? AppState.lightbox.index - 1
          : AppState.lightbox.items.length - 1;
        renderLightboxSlide();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (AppState.lightbox.items.length > 1) {
        AppState.lightbox.index = (AppState.lightbox.index < AppState.lightbox.items.length - 1)
          ? AppState.lightbox.index + 1
          : 0;
        renderLightboxSlide();
      }
    });
  }

  window.addEventListener('keydown', e => {
    if (!AppState.lightbox.isOpen) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prevBtn?.click();
    if (e.key === 'ArrowRight') nextBtn?.click();
  });
}

// =============================================================================
// MODAL THÊM / SỬA HÌNH ẢNH (MỤC 7)
// =============================================================================
function openPhotoModal(editId = null) {
  AppState.editingPhotoId = editId;
  AppState.pendingFiles = [];
  AppState.existingMedia = [];

  const titleModalEl = document.getElementById('photoModalTitle');
  const inputTitle = document.getElementById('photoInputTitle');
  const inputDate = document.getElementById('photoInputDate');
  const inputDesc = document.getElementById('photoInputDesc');
  const editIdEl = document.getElementById('photoEditId');

  if (editId) {
    const photo = AppState.photos.find(p => p.id === editId);
    if (titleModalEl) titleModalEl.textContent = '✏️ Sửa Hình Ảnh';
    if (inputTitle) inputTitle.value = photo?.title || '';
    if (inputDate) inputDate.value = formatDate(photo?.date);
    if (inputDesc) inputDesc.value = photo?.description || '';
    if (editIdEl) editIdEl.value = editId;

    SupabaseAdapter.getMedia(editId).then(list => {
      AppState.existingMedia = list;
      renderPhotoUploadPreviews();
    });
  } else {
    if (titleModalEl) titleModalEl.textContent = '✦ Thêm Hình Ảnh Mới';
    if (inputTitle) inputTitle.value = '';
    const vn = nowVN();
    const d = String(vn.getDate()).padStart(2, '0');
    const m = String(vn.getMonth() + 1).padStart(2, '0');
    const y = vn.getFullYear();
    if (inputDate) inputDate.value = `${d}/${m}/${y}`;
    if (inputDesc) inputDesc.value = '';
    if (editIdEl) editIdEl.value = '';
  }

  renderPhotoUploadPreviews();

  const overlay = document.getElementById('photoModalOverlay');
  if (overlay) {
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
  }
}

function closePhotoModal() {
  const overlay = document.getElementById('photoModalOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
  }
  AppState.editingPhotoId = null;
  AppState.pendingFiles = [];
  AppState.existingMedia = [];
}

function renderPhotoUploadPreviews() {
  const grid = document.getElementById('photoPreviewGrid');
  if (!grid) return;
  grid.innerHTML = '';

  AppState.existingMedia.forEach((m, idx) => {
    const item = document.createElement('div');
    item.className = 'preview-thumb-item';
    if (m.media_type === 'video') {
      item.innerHTML = `<video src="${m.media_url}"></video>`;
    } else {
      item.innerHTML = `<img src="${m.media_url}" alt="" />`;
    }
    const delBtn = document.createElement('button');
    delBtn.className = 'preview-thumb-del';
    delBtn.textContent = '✕';
    delBtn.type = 'button';
    delBtn.addEventListener('click', () => {
      AppState.existingMedia.splice(idx, 1);
      renderPhotoUploadPreviews();
    });
    item.appendChild(delBtn);
    grid.appendChild(item);
  });

  AppState.pendingFiles.forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = 'preview-thumb-item';
    if (p.type === 'video') {
      item.innerHTML = `<video src="${p.blobUrl}"></video>`;
    } else {
      item.innerHTML = `<img src="${p.blobUrl}" alt="" />`;
    }
    const delBtn = document.createElement('button');
    delBtn.className = 'preview-thumb-del';
    delBtn.textContent = '✕';
    delBtn.type = 'button';
    delBtn.addEventListener('click', () => {
      AppState.pendingFiles.splice(idx, 1);
      renderPhotoUploadPreviews();
    });
    item.appendChild(delBtn);
    grid.appendChild(item);
  });
}

async function handleSavePhoto() {
  const inputTitle = document.getElementById('photoInputTitle');
  const inputDate = document.getElementById('photoInputDate');
  const inputDesc = document.getElementById('photoInputDesc');
  const saveBtn = document.getElementById('savePhotoBtn');
  const saveBtnText = document.getElementById('savePhotoBtnText');

  const title = inputTitle ? inputTitle.value.trim() : '';
  const dateStr = inputDate ? inputDate.value.trim() : '';
  const desc = inputDesc ? inputDesc.value.trim() : '';

  if (!title) {
    showToast('Vui lòng nhập tiêu đề hình ảnh!', 'error');
    return;
  }

  const isoDate = parseInputDateToIso(dateStr);

  try {
    if (saveBtn) saveBtn.disabled = true;
    if (saveBtnText) saveBtnText.textContent = 'Đang tải lên...';
    showToast('Đang tải và lưu hình ảnh...', '');

    const uploadedMedia = [];
    for (const item of AppState.pendingFiles) {
      const up = await CloudinaryAdapter.upload(item.file);
      uploadedMedia.push({
        url: up.secure_url,
        type: up.resource_type,
        public_id: up.public_id,
        resource_type: up.resource_type,
      });
    }

    const allMedia = [
      ...AppState.existingMedia.map(m => ({
        url: m.media_url,
        type: m.media_type,
        public_id: m.cloudinary_public_id,
        resource_type: m.cloudinary_resource_type,
      })),
      ...uploadedMedia,
    ];

    const primary = allMedia[0];
    const extras = allMedia.slice(1);

    if (AppState.editingPhotoId) {
      const updates = {
        title,
        date: isoDate,
        description: desc,
        media_type: primary ? primary.type : 'image',
        media_url: primary ? primary.url : null,
        cloudinary_public_id: primary ? primary.public_id : null,
        cloudinary_resource_type: primary ? primary.resource_type : null,
      };
      await SupabaseAdapter.updatePhoto(AppState.editingPhotoId, updates);
      await SupabaseAdapter.deleteMedia(AppState.editingPhotoId);
      if (extras.length) {
        await SupabaseAdapter.insertMedia(AppState.editingPhotoId, extras);
      }
      showToast('✓ Đã cập nhật hình ảnh!', 'success');
    } else {
      const record = {
        title,
        date: isoDate,
        description: desc,
        media_type: primary ? primary.type : 'image',
        media_url: primary ? primary.url : null,
        cloudinary_public_id: primary ? primary.public_id : null,
        cloudinary_resource_type: primary ? primary.resource_type : null,
      };
      const inserted = await SupabaseAdapter.insertPhoto(record);
      if (extras.length && inserted && inserted.id) {
        await SupabaseAdapter.insertMedia(inserted.id, extras);
      }
      showToast('✓ Đã lưu hình ảnh mới!', 'success');
    }

    closePhotoModal();
    await reloadPhotosData();
  } catch (err) {
    console.error('Lỗi lưu ảnh:', err);
    showToast('Lỗi: ' + err.message, 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
    if (saveBtnText) saveBtnText.textContent = 'Lưu lại';
  }
}

// =============================================================================
// BẢNG QUẢN LÝ (ADMIN PANEL - MỤC 9)
// =============================================================================
function openAdminModal() {
  const overlay = document.getElementById('adminModalOverlay');
  if (overlay) {
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
  }

  const nameInput = document.getElementById('adminPersonName');
  const dateInput = document.getElementById('adminStartDate');
  if (nameInput) nameInput.value = AppState.personName;
  if (dateInput) dateInput.value = formatDate(AppState.startDate);

  const parts = (AppState.bgPosition || '60% 35%').split(' ');
  const posX = parseInt(parts[0], 10) || 60;
  const posY = parseInt(parts[1], 10) || 35;
  const sliderX = document.getElementById('bgPosSliderX');
  const sliderY = document.getElementById('bgPosSliderY');
  const valX = document.getElementById('bgPosXVal');
  const valY = document.getElementById('bgPosYVal');
  if (sliderX) sliderX.value = posX;
  if (sliderY) sliderY.value = posY;
  if (valX) valX.textContent = `${posX}%`;
  if (valY) valY.textContent = `${posY}%`;

  renderAdminPhotosList();
}

function closeAdminModal() {
  const overlay = document.getElementById('adminModalOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
  }
}

function initAdminEvents() {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetId = btn.dataset.tab;
      document.getElementById(targetId)?.classList.add('active');

      if (targetId === 'tabList') {
        renderAdminPhotosList();
      }
    });
  });

  // Đóng modal khi bấm vào overlay
  const adminOverlay = document.getElementById('adminModalOverlay');
  if (adminOverlay) {
    adminOverlay.addEventListener('click', e => {
      if (e.target === adminOverlay) closeAdminModal();
    });
  }

  const photoOverlay = document.getElementById('photoModalOverlay');
  if (photoOverlay) {
    photoOverlay.addEventListener('click', e => {
      if (e.target === photoOverlay) closePhotoModal();
    });
  }

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (photoOverlay?.classList.contains('active')) closePhotoModal();
      else if (adminOverlay?.classList.contains('active')) closeAdminModal();
    }
  });

  // Lưu thông tin
  const saveInfoBtn = document.getElementById('saveInfoBtn');
  if (saveInfoBtn) {
    saveInfoBtn.addEventListener('click', async () => {
      const nameInput = document.getElementById('adminPersonName');
      const dateInput = document.getElementById('adminStartDate');
      const newName = nameInput ? nameInput.value.trim() : '';
      const newDateStr = dateInput ? dateInput.value.trim() : '';

      if (!newName) {
        showToast('Vui lòng nhập tên người làm động lực!', 'error');
        return;
      }

      const isoDate = parseInputDateToIso(newDateStr);

      try {
        saveInfoBtn.disabled = true;
        showToast('Đang lưu thông tin...', '');
        await SupabaseAdapter.setConfig('person_name', newName);
        await SupabaseAdapter.setConfig('start_date', isoDate);

        AppState.personName = newName;
        AppState.startDate = isoDate;
        applyConfigToUI();
        updateLoveCounter();

        showToast('✓ Đã cập nhật thông tin thành công!', 'success');
      } catch (e) {
        showToast('Lỗi lưu: ' + e.message, 'error');
      } finally {
        saveInfoBtn.disabled = false;
      }
    });
  }

  // Tải ảnh nền mới
  const bgFileInput = document.getElementById('adminBgFileInput');
  if (bgFileInput) {
    bgFileInput.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;

      const statusEl = document.getElementById('bgUploadStatus');
      try {
        if (statusEl) statusEl.textContent = '⏳ Đang tải ảnh nền lên Cloudinary...';
        showToast('Đang tải ảnh nền mới...', '');
        const up = await CloudinaryAdapter.upload(file);
        await SupabaseAdapter.setConfig('bg_image', up.secure_url);
        AppState.bgImage = up.secure_url;
        applyBackgroundImages();
        if (statusEl) statusEl.textContent = '✓ Tải lên ảnh nền thành công!';
        showToast('✓ Đã cập nhật ảnh nền mới!', 'success');
      } catch (err) {
        if (statusEl) statusEl.textContent = '⚠️ Lỗi: ' + err.message;
        showToast('Lỗi: ' + err.message, 'error');
      }
    });
  }

  // Thanh trượt tiêu điểm
  const sliderX = document.getElementById('bgPosSliderX');
  const sliderY = document.getElementById('bgPosSliderY');
  const valX = document.getElementById('bgPosXVal');
  const valY = document.getElementById('bgPosYVal');

  function updateFocalPosition() {
    const x = sliderX ? sliderX.value : '60';
    const y = sliderY ? sliderY.value : '35';
    if (valX) valX.textContent = `${x}%`;
    if (valY) valY.textContent = `${y}%`;
    const newPos = `${x}% ${y}%`;
    AppState.bgPosition = newPos;
    document.documentElement.style.setProperty('--bg-focal-pos', newPos);
    const preview = document.getElementById('adminBgPreviewImg');
    if (preview) preview.style.backgroundPosition = newPos;
  }

  sliderX?.addEventListener('input', updateFocalPosition);
  sliderY?.addEventListener('input', updateFocalPosition);

  const saveBgSettingsBtn = document.getElementById('saveBgSettingsBtn');
  if (saveBgSettingsBtn) {
    saveBgSettingsBtn.addEventListener('click', async () => {
      try {
        saveBgSettingsBtn.disabled = true;
        await SupabaseAdapter.setConfig('bg_position', AppState.bgPosition);
        showToast('✓ Đã lưu cấu hình ảnh nền!', 'success');
      } catch (e) {
        showToast('Lỗi lưu: ' + e.message, 'error');
      } finally {
        saveBgSettingsBtn.disabled = false;
      }
    });
  }

  // Đổi mật khẩu
  const savePwBtn = document.getElementById('saveNewPwBtn');
  if (savePwBtn) {
    savePwBtn.addEventListener('click', async () => {
      const curPw = document.getElementById('adminCurrentPw')?.value || '';
      const newPw = document.getElementById('adminNewPw')?.value || '';
      const cfmPw = document.getElementById('adminConfirmPw')?.value || '';
      const msgEl = document.getElementById('adminPwMsg');

      if (!curPw || !newPw || !cfmPw) {
        if (msgEl) msgEl.textContent = 'Vui lòng điền đầy đủ các ô mật khẩu!';
        return;
      }

      if (newPw.length < 6) {
        if (msgEl) msgEl.textContent = 'Mật khẩu mới phải có ít nhất 6 ký tự!';
        return;
      }

      if (newPw !== cfmPw) {
        if (msgEl) msgEl.textContent = 'Xác nhận mật khẩu mới không khớp!';
        return;
      }

      const curHash = await sha256(curPw + CLIENT_SALT);
      if (AppState.gatePasswordHash && curHash !== AppState.gatePasswordHash) {
        if (msgEl) msgEl.textContent = 'Mật khẩu hiện tại không đúng!';
        return;
      }

      try {
        savePwBtn.disabled = true;
        const newHash = await sha256(newPw + CLIENT_SALT);
        await SupabaseAdapter.setConfig('gate_password_hash', newHash);
        AppState.gatePasswordHash = newHash;

        document.getElementById('adminCurrentPw').value = '';
        document.getElementById('adminNewPw').value = '';
        document.getElementById('adminConfirmPw').value = '';

        if (msgEl) msgEl.textContent = '';
        showToast('✓ Đã đổi mật khẩu thành công!', 'success');
      } catch (e) {
        if (msgEl) msgEl.textContent = 'Lỗi đổi mật khẩu: ' + e.message;
      } finally {
        savePwBtn.disabled = false;
      }
    });
  }
}

function renderAdminPhotosList() {
  const container = document.getElementById('adminPhotosList');
  if (!container) return;
  container.innerHTML = '';

  if (!AppState.photos.length) {
    container.innerHTML = '<p style="opacity:0.6;font-size:13.5px;padding:8px 0;">Chưa có hình ảnh nào được lưu.</p>';
    return;
  }

  AppState.photos.forEach(photo => {
    const row = document.createElement('div');
    row.className = 'admin-photo-row';
    row.innerHTML = `
      <div class="admin-photo-meta">
        <span class="admin-photo-date">${formatDate(photo.date)}</span>
        <strong class="admin-photo-title">${photo.title || 'Khoảnh khắc'}</strong>
      </div>
      <div class="admin-photo-actions">
        <button type="button" class="admin-btn-action admin-btn-edit">✏️ Sửa</button>
        <button type="button" class="admin-btn-action admin-btn-del">🗑 Xóa</button>
      </div>
    `;

    row.querySelector('.admin-btn-edit')?.addEventListener('click', () => {
      closeAdminModal();
      openPhotoModal(photo.id);
    });

    row.querySelector('.admin-btn-del')?.addEventListener('click', async () => {
      if (confirm(`Bạn có chắc muốn xóa ảnh "${photo.title || 'Khoảnh khắc'}" không?`)) {
        try {
          showToast('Đang xóa...', '');
          await SupabaseAdapter.deleteMedia(photo.id);
          await SupabaseAdapter.deletePhoto(photo.id);
          showToast('✓ Đã xóa hình ảnh!', 'success');
          await reloadPhotosData();
          renderAdminPhotosList();
        } catch (e) {
          showToast('Lỗi xóa: ' + e.message, 'error');
        }
      }
    });

    container.appendChild(row);
  });
}

// =============================================================================
// TOAST THÔNG BÁO NỔI
// =============================================================================
function showToast(message, type = '') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-msg ${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// =============================================================================
// HIỆU ỨNG VÀO TRANG (RIVERINE TIMELINE - WEB ANIMATIONS API)
// =============================================================================
function triggerEntranceAnimations() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const failsafe = setTimeout(() => {
    cleanupEntranceStyles();
  }, 3500);

  try {
    const scale = Math.min(1, Math.max(0.7, window.innerWidth / 1280));

    const logoEl = document.getElementById('brandLogoLink');
    if (logoEl) {
      logoEl.animate([
        { opacity: 0, transform: 'translateY(-10px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 500, delay: 0, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'both' });
    }

    const navEl = document.getElementById('desktopNavPill') || document.getElementById('mobileMenuBtn');
    if (navEl) {
      navEl.animate([
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 700, delay: 120, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' });
    }

    const eyeBtn = document.getElementById('toggleClearBgBtn');
    if (eyeBtn) {
      eyeBtn.animate([
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 600, delay: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' });
    }

    const labelEl = document.getElementById('heroPersonName');
    if (labelEl) {
      labelEl.animate([
        { opacity: 0, transform: `translateY(${10 * scale}px)` },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 650, delay: 300, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'both' });
    }

    const h1 = document.getElementById('headlineLine1');
    const h2 = document.getElementById('headlineLine2');
    const h3 = document.getElementById('headlineLine3');

    if (h1) {
      h1.animate([
        { transform: 'translateY(115%)' },
        { transform: 'translateY(0)' }
      ], { duration: 1050, delay: 380, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'both' });
    }
    if (h2) {
      h2.animate([
        { transform: 'translateY(115%)' },
        { transform: 'translateY(0)' }
      ], { duration: 1050, delay: 470, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'both' });
    }
    if (h3) {
      h3.animate([
        { transform: 'translateY(115%)' },
        { transform: 'translateY(0)' }
      ], { duration: 1050, delay: 560, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'both' });
    }

    const l1 = document.getElementById('ledeLine1');
    const l2 = document.getElementById('ledeLine2');
    if (l1) {
      l1.animate([
        { opacity: 0, transform: `translateY(${14 * scale}px)` },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 800, delay: 800, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'both' });
    }
    if (l2) {
      l2.animate([
        { opacity: 0, transform: `translateY(${14 * scale}px)` },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 800, delay: 860, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'both' });
    }

    const cta = document.getElementById('ctaToPhotos');
    const qLink = document.getElementById('quickAddPhotoBtn');
    if (cta) {
      cta.animate([
        { opacity: 0, transform: `translateY(${12 * scale}px)` },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 800, delay: 1000, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'both' });
    }
    if (qLink) {
      qLink.animate([
        { opacity: 0, transform: `translateY(${8 * scale}px)` },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 600, delay: 1100, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'both' });
    }

    const cue = document.getElementById('cueToPhotos');
    if (cue) {
      cue.animate([
        { opacity: 0, transform: 'translateY(-6px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 700, delay: 1250, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'both' });
    }

    setTimeout(() => {
      cleanupEntranceStyles();
      clearTimeout(failsafe);
    }, 2200);
  } catch (e) {
    cleanupEntranceStyles();
    clearTimeout(failsafe);
  }
}

function cleanupEntranceStyles() {
  document.querySelectorAll('.animate-lift, .animate-rise-1, .animate-rise-2, .animate-rise-3, .animate-lift-lede-1, .animate-lift-lede-2, .animate-lift-cta, .animate-lift-link, .animate-lift-cue').forEach(el => {
    el.style.opacity = '';
    el.style.transform = '';
  });
}

// =============================================================================
// SUPABASE HEARTBEAT / PING (CHỐNG PAUSE DATABASE DO INACTIVITY)
// =============================================================================
async function pingSupabaseHeartbeat() {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/site_config?select=id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
  } catch (err) {
    // Silent fail if offline
  }
}

// Định kỳ ping mỗi 12 tiếng khi tab mở để reset bộ đếm inactivity của Supabase
setInterval(pingSupabaseHeartbeat, 12 * 60 * 60 * 1000);

// =============================================================================
// TẢI DỮ LIỆU TỪ CSDL SUPABASE
// =============================================================================
async function loadInitialData() {
  const loadingEl = document.getElementById('gateLoading');
  if (loadingEl) loadingEl.style.display = 'flex';

  try {
    // Ping heartbeat khi tải dữ liệu ban đầu
    pingSupabaseHeartbeat();

    const config = await SupabaseAdapter.getAllConfig();

    if (config.person_name) AppState.personName = config.person_name;
    if (config.start_date) AppState.startDate = config.start_date;
    if (config.bg_image !== undefined) AppState.bgImage = config.bg_image;
    if (config.bg_position) AppState.bgPosition = config.bg_position;
    if (config.gate_password_hash) AppState.gatePasswordHash = config.gate_password_hash;

    applyConfigToUI();
    updateLoveCounter();

    await reloadPhotosData();
  } catch (err) {
    console.warn('Lỗi tải dữ liệu Supabase, dùng cấu hình mặc định:', err);
    applyConfigToUI();
    updateLoveCounter();
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

async function reloadPhotosData() {
  try {
    const list = await SupabaseAdapter.getAllPhotos();
    AppState.photos = list;

    const map = {};
    for (const p of list) {
      const media = await SupabaseAdapter.getMedia(p.id);
      map[p.id] = media;
    }
    AppState.photoMediaMap = map;

    renderPhotosGallery();
  } catch (e) {
    console.warn('Lỗi tải ảnh:', e);
  }
}

// =============================================================================
// KHỞI ĐỘNG ỨNG DỤNG
// =============================================================================
window.addEventListener('DOMContentLoaded', () => {
  initGate();
  initNavigation();
  initPhotoStripScroll();
  initLightboxEvents();
  initAdminEvents();

  updateLoveCounter();
  AppState.counterTimer = setInterval(updateLoveCounter, 1000);

  document.getElementById('openAdminBtn')?.addEventListener('click', openAdminModal);
  document.getElementById('mOpenAdminBtn')?.addEventListener('click', openAdminModal);
  document.getElementById('closeAdminModalBtn')?.addEventListener('click', closeAdminModal);

  document.getElementById('quickAddPhotoBtn')?.addEventListener('click', () => openPhotoModal());
  document.getElementById('page2AddPhotoBtn')?.addEventListener('click', () => openPhotoModal());
  document.getElementById('emptyAddBtn')?.addEventListener('click', () => openPhotoModal());

  document.getElementById('closePhotoModalBtn')?.addEventListener('click', closePhotoModal);
  document.getElementById('cancelPhotoModalBtn')?.addEventListener('click', closePhotoModal);
  document.getElementById('savePhotoBtn')?.addEventListener('click', handleSavePhoto);

  const fileInput = document.getElementById('photoFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', e => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      const newItems = files.map(f => ({
        file: f,
        blobUrl: URL.createObjectURL(f),
        type: f.type.startsWith('video/') ? 'video' : 'image',
      }));
      AppState.pendingFiles.push(...newItems);
      renderPhotoUploadPreviews();
      e.target.value = '';
    });
  }

  loadInitialData();
});
