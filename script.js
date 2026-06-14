// ====================================================
// KHU VỰC DỮ LIỆU - INDEXEDDB
// Thay thế localStorage bằng IndexedDB để hỗ trợ lưu trữ lớn (hàng GB)
// localStorage chỉ chứa ~5MB — IndexedDB không giới hạn cứng
// Kiến trúc dễ dàng nâng cấp lên Firebase sau này
// ====================================================

/**
 * DB Manager - Khởi tạo và quản lý kết nối IndexedDB
 */
const DB = {
  _db: null,
  DB_NAME: 'RomanticMemoriesDB',
  DB_VERSION: 1,
  STORE_MEMORIES: 'memories',
  STORE_MEDIA: 'media',       // Lưu binary lớn (ảnh, video)
  STORE_CONFIG: 'config',     // Lưu cấu hình (video nền, ảnh tròn...)

  /**
   * Mở (hoặc tạo) database. Trả về Promise<IDBDatabase>
   */
  open() {
    if (this._db) return Promise.resolve(this._db);

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE_MEMORIES)) {
          db.createObjectStore(this.STORE_MEMORIES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(this.STORE_MEDIA)) {
          db.createObjectStore(this.STORE_MEDIA);
        }
        if (!db.objectStoreNames.contains(this.STORE_CONFIG)) {
          db.createObjectStore(this.STORE_CONFIG);
        }
      };

      req.onsuccess = (e) => {
        this._db = e.target.result;
        resolve(this._db);
      };

      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Lấy một transaction cho store(s) chỉ định
   */
  async tx(stores, mode = 'readonly') {
    const db = await this.open();
    return db.transaction(stores, mode);
  },

  /** Wrap IDBRequest thành Promise */
  req(idbRequest) {
    return new Promise((resolve, reject) => {
      idbRequest.onsuccess = () => resolve(idbRequest.result);
      idbRequest.onerror  = () => reject(idbRequest.error);
    });
  },
};

/**
 * STORAGE ADAPTER - Lớp trung gian giữa app và bộ lưu trữ
 * Tất cả phương thức đều bất đồng bộ (async/await)
 * Để chuyển sang Firebase: chỉ cần thay thế các hàm trong này
 */
const StorageAdapter = {

  // ── MEMORIES ────────────────────────────────────────

  /** Lấy toàn bộ danh sách kỷ niệm (không kèm mediaData — lưu riêng) */
  async getMemories() {
    try {
      const tx = await DB.tx(DB.STORE_MEMORIES);
      const store = tx.objectStore(DB.STORE_MEMORIES);
      return await DB.req(store.getAll());
    } catch (e) {
      console.error('Lỗi đọc kỷ niệm từ IndexedDB:', e);
      return [];
    }
  },

  /** Lưu toàn bộ danh sách kỷ niệm */
  async saveMemories(memories) {
    try {
      const tx = await DB.tx(DB.STORE_MEMORIES, 'readwrite');
      const store = tx.objectStore(DB.STORE_MEMORIES);

      // Xóa hết rồi ghi lại (đồng bộ với AppState)
      await DB.req(store.clear());
      for (const m of memories) {
        await DB.req(store.put(m));
      }
      return true;
    } catch (e) {
      console.error('Lỗi lưu kỷ niệm vào IndexedDB:', e);
      showToast('⚠️ Lỗi lưu dữ liệu!', 'error');
      return false;
    }
  },

  // ── MEDIA (ảnh / video cho từng kỷ niệm) ───────────

  /** Lưu dữ liệu media (dataUrl / Blob) theo key = memory.id */
  async saveMedia(id, dataUrl) {
    try {
      const tx = await DB.tx(DB.STORE_MEDIA, 'readwrite');
      await DB.req(tx.objectStore(DB.STORE_MEDIA).put(dataUrl, id));
      return true;
    } catch (e) {
      console.error('Lỗi lưu media:', e);
      return false;
    }
  },

  /** Lấy dữ liệu media theo id */
  async getMedia(id) {
    try {
      const tx = await DB.tx(DB.STORE_MEDIA);
      return await DB.req(tx.objectStore(DB.STORE_MEDIA).get(id));
    } catch (e) {
      return null;
    }
  },

  /** Xóa media khi xóa kỷ niệm */
  async deleteMedia(id) {
    try {
      const tx = await DB.tx(DB.STORE_MEDIA, 'readwrite');
      await DB.req(tx.objectStore(DB.STORE_MEDIA).delete(id));
    } catch (e) { /* bỏ qua */ }
  },

  // ── CONFIG (video nền, ảnh tròn...) ────────────────

  async _setConfig(key, value) {
    const tx = await DB.tx(DB.STORE_CONFIG, 'readwrite');
    await DB.req(tx.objectStore(DB.STORE_CONFIG).put(value, key));
  },

  async _getConfig(key) {
    try {
      const tx = await DB.tx(DB.STORE_CONFIG);
      return await DB.req(tx.objectStore(DB.STORE_CONFIG).get(key));
    } catch (e) { return null; }
  },

  // Lưu video nền
  async saveBgVideo(dataUrl) {
    try {
      await this._setConfig('bgVideo', dataUrl);
      return true;
    } catch (e) {
      showToast('⚠️ Không thể lưu video nền!', 'error');
      return false;
    }
  },

  // Lấy video nền đã lưu
  async getBgVideo() {
    return await this._getConfig('bgVideo') || null;
  },

  // Lưu ảnh khung tròn
  async saveCounterPhoto(dataUrl) {
    await this._setConfig('counterPhoto', dataUrl);
  },

  // Lấy ảnh khung tròn
  async getCounterPhoto() {
    return await this._getConfig('counterPhoto') || null;
  },
};

// ====================================================
// KHU VỰC QUẢN LÝ ẢNH VÀ VIDEO
// State toàn cục của ứng dụng
// ====================================================

/**
 * App State - Trạng thái toàn cục
 */
const AppState = {
  memories: [],          // Danh sách kỷ niệm
  currentMediaType: 'image', // Loại media đang chọn ('image' | 'video')
  currentMediaData: null,    // Dữ liệu base64 của media đang upload
  editingId: null,           // ID kỷ niệm đang chỉnh sửa (null = thêm mới)
  counterInterval: null,     // ID của setInterval đồng hồ đếm
};

// ====================================================
// KHU VỰC VIDEO NỀN CHÍNH
// Xử lý video nền cinematic
// ====================================================

/**
 * Khởi tạo video nền khi trang load
 */
async function initBackgroundVideo() {
  const savedBgVideo = await StorageAdapter.getBgVideo();
  if (savedBgVideo) {
    const heroVideo = document.getElementById('heroVideo');
    if (heroVideo) {
      heroVideo.src = savedBgVideo;
      heroVideo.load();
      heroVideo.play().catch(() => {
        // Autoplay bị chặn - bình thường trên một số trình duyệt
        console.log('Autoplay bị chặn, người dùng cần click để play video');
      });
    }
  }

  // Xử lý khi video không tải được - hiển thị gradient thay thế
  const heroVideo = document.getElementById('heroVideo');
  if (heroVideo) {
    heroVideo.addEventListener('error', handleVideoError);

    // Kiểm tra nếu source rỗng (chưa có video thật)
    const source = heroVideo.querySelector('source');
    if (source && (source.src.includes('background.mp4') || source.src.includes('nen(test).mp4'))) {
      document.getElementById('videoBg').classList.add('no-video');
    }
  }
}

/**
 * Xử lý lỗi video
 */
function handleVideoError() {
  console.log('Không tìm thấy video nền, sử dụng gradient thay thế');
  document.getElementById('videoBg').classList.add('no-video');
}

/**
 * Thay đổi video nền (được gọi từ admin panel)
 * @param {HTMLInputElement} input - Input file element
 */
async function changeBgVideo(input) {
  const file = input.files[0];
  if (!file) return;

  // Kiểm tra loại file
  if (!file.type.startsWith('video/')) {
    showToast('⚠️ Vui lòng chọn file video!', 'error');
    return;
  }

  showToast('⏳ Đang xử lý video...', '');

  try {
    const dataUrl = await fileToDataUrl(file);

    // Áp dụng video mới ngay lập tức
    const heroVideo = document.getElementById('heroVideo');
    if (heroVideo) {
      heroVideo.src = dataUrl;
      heroVideo.load();
      heroVideo.play();
      document.getElementById('videoBg').classList.remove('no-video');
    }

    // Lưu vào storage
    await StorageAdapter.saveBgVideo(dataUrl);
    showToast('✓ Đã cập nhật video nền!', 'success');
  } catch (e) {
    console.error('Lỗi xử lý video:', e);
    showToast('⚠️ Không thể xử lý video này!', 'error');
  }
}

// ====================================================
// KHU VỰC KHUNG ẢNH TRÒN - LOVE COUNTER PHOTO
// Upload và lưu ảnh đôi hiển thị trong section đếm ngày
// ====================================================

/**
 * Thay đổi ảnh trong khung tròn tại section đếm ngày yêu
 * @param {HTMLInputElement} input
 */
async function changeCounterPhoto(input) {
  const file = input.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('⚠️ Vui lòng chọn file ảnh!', 'error');
    return;
  }

  // IndexedDB hỗ trợ file lớn, chỉ cảnh báo nếu >200MB
  if (file.size > 200 * 1024 * 1024) {
    showToast('⚠️ Ảnh rất lớn (>200MB), có thể mất thời gian xử lý', 'error');
  }

  try {
    const dataUrl = await fileToDataUrl(file);

    // Hiển thị ảnh ngay
    applyCounterPhoto(dataUrl);

    // Lưu vào IndexedDB
    await StorageAdapter.saveCounterPhoto(dataUrl);
    showToast('✓ Đã cập nhật ảnh!', 'success');
  } catch (e) {
    showToast('⚠️ Không thể đọc file ảnh!', 'error');
  }
}

/**
 * Áp dụng ảnh vào khung tròn
 * @param {string} dataUrl
 */
function applyCounterPhoto(dataUrl) {
  const img = document.getElementById('counterPhoto');
  const placeholder = document.getElementById('counterPhotoPlaceholder');
  if (img && placeholder) {
    img.src = dataUrl;
    img.style.display = 'block';
    placeholder.style.display = 'none';
  }
}

/**
 * Tải ảnh đã lưu từ IndexedDB khi mở trang
 */
async function loadCounterPhoto() {
  const saved = await StorageAdapter.getCounterPhoto();
  if (saved) applyCounterPhoto(saved);
}



/**
 * Scroll mượt đến một phần tử
 * @param {string} selector - CSS selector của phần tử đích
 */
function smoothScroll(selector) {
  const target = document.querySelector(selector);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Xử lý navbar khi scroll (thêm class 'scrolled')
 */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // Thêm class scrolled khi đã scroll xuống
    if (currentScroll > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
  }, { passive: true });
}

// ====================================================
// KHU VỰC ĐẾM NGÀY YÊU
// Bộ đếm thời gian yêu thương
// ====================================================

/**
 * Ngày bắt đầu mối tình - Múi giờ Việt Nam (GMT+7)
 * Thay đổi ngày này theo ngày thực tế
 */
const LOVE_START_DATE = new Date('2025-07-11T00:00:00+07:00');

/**
 * Tính toán và hiển thị thời gian ĐÃ TRÔI QUA kể từ ngày kỷ niệm
 * Luôn đếm tăng lên — không đếm ngược
 */
function updateLoveCounter() {
  const now = new Date();
  const diffMs = now - LOVE_START_DATE;

  // Nếu chưa đến ngày (trong tương lai), hiển thị 0
  if (diffMs < 0) {
    setCounterValue('days', 0, 3);
    setCounterValue('hours', 0, 2);
    setCounterValue('minutes', 0, 2);
    setCounterValue('seconds', 0, 2);
    return;
  }

  // Tính toán thời gian đã trôi qua
  const totalSeconds = Math.floor(diffMs / 1000);
  const seconds      = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes      = totalMinutes % 60;
  const totalHours   = Math.floor(totalMinutes / 60);
  const hours        = totalHours % 24;
  const days         = Math.floor(totalHours / 24);

  // Cập nhật giao diện — số tăng dần theo thời gian thực
  setCounterValue('days', days, 3);
  setCounterValue('hours', hours, 2);
  setCounterValue('minutes', minutes, 2);
  setCounterValue('seconds', seconds, 2);
}

/**
 * Đặt giá trị cho ô đếm với hiệu ứng nhấp nháy khi số thay đổi
 * @param {string} id - ID của element
 * @param {number} value - Giá trị mới
 * @param {number} minDigits - Số chữ số tối thiểu (thêm số 0 đằng trước)
 */
function setCounterValue(id, value, minDigits = 2) {
  const el = document.getElementById(id);
  if (!el) return;

  const newText = String(value).padStart(minDigits, '0');

  // Chỉ cập nhật nếu giá trị thay đổi (tối ưu performance)
  if (el.textContent !== newText) {
    el.textContent = newText;

    // Hiệu ứng nhấp nháy nhẹ khi số thay đổi
    el.style.transform = 'scale(1.05)';
    el.style.transition = 'transform 0.15s';
    setTimeout(() => {
      el.style.transform = 'scale(1)';
    }, 150);
  }
}



/**
 * Khởi động bộ đếm thời gian - cập nhật mỗi giây
 */
function initLoveCounter() {
  // Chạy ngay lập tức
  updateLoveCounter();

  // Cập nhật mỗi giây
  AppState.counterInterval = setInterval(updateLoveCounter, 1000);
}

// ====================================================
// KHU VỰC DÒNG THỜI GIAN KỶ NIỆM
// Render và quản lý timeline
// ====================================================

/**
 * Render toàn bộ dòng thời gian từ dữ liệu
 * Được gọi khi: tải trang, thêm/sửa/xóa kỷ niệm
 */
function renderTimeline() {
  const container = document.getElementById('timelineContainer');
  const emptyState = document.getElementById('timelineEmpty');
  const memories = AppState.memories;

  // Sắp xếp kỷ niệm theo ngày (mới nhất lên trước)
  const sorted = [...memories].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Xóa các card cũ (giữ lại empty state)
  const oldCards = container.querySelectorAll('.timeline-item');
  oldCards.forEach(card => card.remove());

  // Hiển thị / ẩn empty state
  if (sorted.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  // Render từng kỷ niệm
  sorted.forEach((memory, index) => {
    const item = createTimelineItem(memory, index);
    container.appendChild(item);

    // Thêm hiệu ứng scroll reveal
    setTimeout(() => {
      observeScrollReveal(item);
    }, 0);
  });
}

/**
 * Tạo một phần tử timeline cho một kỷ niệm
 * @param {Object} memory - Dữ liệu kỷ niệm
 * @param {number} index - Chỉ số (để alternating layout)
 * @returns {HTMLElement}
 */
function createTimelineItem(memory, index) {
  const item = document.createElement('div');
  item.className = 'timeline-item scroll-reveal';
  item.dataset.id = memory.id;

  // Tạo phần hiển thị media (ảnh hoặc video)
  const mediaHtml = createMediaHtml(memory);

  // Format ngày hiển thị
  const dateFormatted = formatDate(memory.date);

  // Tạo badge loại media
  const badgeText = memory.mediaType === 'video' ? '🎬 Video' : '📷 Ảnh';

  item.innerHTML = `
    <!-- Card kỷ niệm -->
    <div class="timeline-card" onclick="openLightbox('${memory.id}')">
      <div class="timeline-media-wrapper">
        ${mediaHtml}
        <div class="media-badge">${badgeText}</div>
      </div>
      <div class="timeline-card-body">
        <div class="timeline-card-date">${dateFormatted}</div>
        <h3 class="timeline-card-title">${escapeHtml(memory.title)}</h3>
        <p class="timeline-card-desc">${escapeHtml(memory.description || '')}</p>
      </div>
      <div class="timeline-card-actions" onclick="event.stopPropagation()">
        <button class="action-btn action-btn-edit" onclick="openEditMemoryModal('${memory.id}')">
          ✏️ Sửa
        </button>
        <button class="action-btn action-btn-delete" onclick="confirmDeleteMemory('${memory.id}')">
          🗑 Xóa
        </button>
      </div>
    </div>

    <!-- Chấm tròn giữa timeline -->
    <div class="timeline-dot"></div>

    <!-- Ô trống bên đối diện -->
    <div class="timeline-spacer"></div>
  `;

  return item;
}

/**
 * Tạo HTML cho media (ảnh hoặc video) trong timeline card
 * @param {Object} memory - Dữ liệu kỷ niệm
 * @returns {string} HTML string
 */
function createMediaHtml(memory) {
  if (!memory.mediaData) {
    // Placeholder khi không có media
    return `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:3rem;opacity:0.3;">
      ${memory.mediaType === 'video' ? '🎬' : '📷'}
    </div>`;
  }

  if (memory.mediaType === 'video') {
    return `<video
      src="${memory.mediaData}"
      controls
      preload="none"
      style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;"
      onclick="event.stopPropagation()"
    ></video>`;
  }

  return `<img
    src="${memory.mediaData}"
    alt="${escapeHtml(memory.title)}"
    loading="lazy"
  />`;
}

/**
 * Mở lightbox để xem kỷ niệm chi tiết
 * @param {string} id - ID của kỷ niệm
 */
function openLightbox(id) {
  const memory = AppState.memories.find(m => m.id === id);
  if (!memory) return;

  const lightbox = document.getElementById('lightbox');
  const mediaContainer = document.getElementById('lightboxMedia');
  const title = document.getElementById('lightboxTitle');
  const date = document.getElementById('lightboxDate');
  const desc = document.getElementById('lightboxDesc');

  // Render media trong lightbox
  if (memory.mediaData) {
    if (memory.mediaType === 'video') {
      mediaContainer.innerHTML = `<video src="${memory.mediaData}" controls style="width:100%;max-height:60vh;object-fit:contain;"></video>`;
    } else {
      mediaContainer.innerHTML = `<img src="${memory.mediaData}" alt="${escapeHtml(memory.title)}" style="width:100%;max-height:60vh;object-fit:contain;" />`;
    }
  } else {
    mediaContainer.innerHTML = `<div style="height:200px;display:flex;align-items:center;justify-content:center;font-size:4rem;opacity:0.3;">${memory.mediaType === 'video' ? '🎬' : '📷'}</div>`;
  }

  title.textContent = memory.title;
  date.textContent = formatDate(memory.date);
  desc.textContent = memory.description || '';

  // Hiển thị lightbox
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Đóng lightbox
 */
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.body.style.overflow = '';

  // Dừng video nếu đang phát
  const video = document.querySelector('#lightboxMedia video');
  if (video) video.pause();
}

// ====================================================
// KHU VỰC QUẢN LÝ ẢNH VÀ VIDEO
// CRUD operations cho kỷ niệm
// ====================================================

/**
 * Mở admin panel bên phải
 */
function openAdminPanel() {
  document.getElementById('adminPanel').classList.add('active');
  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  renderAdminMemoryList();
}

/**
 * Đóng admin panel
 */
function closeAdminPanel() {
  document.getElementById('adminPanel').classList.remove('active');
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

/**
 * Render danh sách kỷ niệm trong admin panel
 */
function renderAdminMemoryList() {
  const list = document.getElementById('adminMemoryList');
  const memories = AppState.memories;

  if (memories.length === 0) {
    list.innerHTML = '<p style="font-size:0.82rem;color:rgba(255,255,255,0.3);text-align:center;padding:20px;">Chưa có kỷ niệm nào</p>';
    return;
  }

  // Sắp xếp theo ngày mới nhất
  const sorted = [...memories].sort((a, b) => new Date(b.date) - new Date(a.date));

  list.innerHTML = sorted.map(memory => `
    <div class="admin-memory-item">
      <!-- Ảnh thumbnail nhỏ -->
      ${memory.mediaData && memory.mediaType === 'image'
        ? `<img class="admin-memory-thumb" src="${memory.mediaData}" alt="${escapeHtml(memory.title)}" />`
        : `<div class="admin-memory-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;">${memory.mediaType === 'video' ? '🎬' : '📷'}</div>`
      }
      <div class="admin-memory-info">
        <div class="admin-memory-title">${escapeHtml(memory.title)}</div>
        <div class="admin-memory-date">${formatDate(memory.date)}</div>
      </div>
      <div class="admin-memory-btns">
        <button class="admin-mini-btn admin-mini-btn-edit" onclick="openEditMemoryModal('${memory.id}')">Sửa</button>
        <button class="admin-mini-btn admin-mini-btn-delete" onclick="confirmDeleteMemory('${memory.id}')">Xóa</button>
      </div>
    </div>
  `).join('');
}

/**
 * Mở modal thêm kỷ niệm mới
 */
function openAddMemoryModal() {
  // Đặt lại form
  resetMemoryForm();
  AppState.editingId = null;
  AppState.currentMediaData = null;

  // Đổi tiêu đề modal
  document.getElementById('memoryModalTitle').textContent = '✦ Thêm Kỷ Niệm Mới';

  // Hiển thị modal
  document.getElementById('memoryModal').classList.add('active');
  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';

  // Đặt ngày mặc định là hôm nay
  document.getElementById('memoryDate').value = getTodayVN();
}

/**
 * Mở modal chỉnh sửa kỷ niệm hiện có
 * @param {string} id - ID kỷ niệm cần sửa
 */
function openEditMemoryModal(id) {
  const memory = AppState.memories.find(m => m.id === id);
  if (!memory) return;

  // Đặt lại form
  resetMemoryForm();
  AppState.editingId = id;
  AppState.currentMediaData = memory.mediaData;

  // Điền dữ liệu vào form
  document.getElementById('memoryModalTitle').textContent = '✦ Chỉnh Sửa Kỷ Niệm';
  document.getElementById('editMemoryId').value = id;
  document.getElementById('memoryTitle').value = memory.title;
  document.getElementById('memoryDate').value = memory.date;
  document.getElementById('memoryDescription').value = memory.description || '';

  // Đặt loại media
  switchMediaType(memory.mediaType || 'image');

  // Hiển thị preview media hiện tại
  if (memory.mediaData) {
    if (memory.mediaType === 'video') {
      const preview = document.getElementById('videoPreview');
      preview.src = memory.mediaData;
      preview.style.display = 'block';
      document.getElementById('videoPlaceholder').style.display = 'none';
    } else {
      const preview = document.getElementById('imagePreview');
      preview.src = memory.mediaData;
      preview.style.display = 'block';
      document.getElementById('imagePlaceholder').style.display = 'none';
    }
  }

  // Hiển thị modal
  document.getElementById('memoryModal').classList.add('active');
  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';

  // Đóng admin panel nếu đang mở
  document.getElementById('adminPanel').classList.remove('active');
}

/**
 * Đóng modal thêm/sửa kỷ niệm
 */
function closeMemoryModal() {
  document.getElementById('memoryModal').classList.remove('active');

  // Chỉ đóng overlay nếu không còn modal nào khác mở
  if (!document.getElementById('adminPanel').classList.contains('active')) {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
  }

  resetMemoryForm();
}

/**
 * Lưu kỷ niệm (thêm mới hoặc cập nhật)
 */
async function saveMemory() {
  // Lấy dữ liệu từ form
  const title = document.getElementById('memoryTitle').value.trim();
  const date = document.getElementById('memoryDate').value;
  const description = document.getElementById('memoryDescription').value.trim();

  // Kiểm tra dữ liệu bắt buộc
  if (!title) {
    showToast('⚠️ Vui lòng nhập tiêu đề!', 'error');
    document.getElementById('memoryTitle').focus();
    return;
  }

  if (!date) {
    showToast('⚠️ Vui lòng chọn ngày!', 'error');
    document.getElementById('memoryDate').focus();
    return;
  }

  const id = AppState.editingId || generateId();

  // Tạo object kỷ niệm — mediaData KHÔNG lưu trong object chính
  // (lưu riêng trong store 'media' để tránh giới hạn kích thước)
  const memoryData = {
    id,
    title,
    date,
    description,
    mediaType: AppState.currentMediaType,
    // Chỉ lưu cờ có media hay không, dữ liệu thực lưu riêng
    hasMedia: !!AppState.currentMediaData,
    createdAt: AppState.editingId
      ? AppState.memories.find(m => m.id === AppState.editingId)?.createdAt
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Lưu mediaData riêng vào store 'media'
  if (AppState.currentMediaData) {
    await StorageAdapter.saveMedia(id, AppState.currentMediaData);
  }

  // Gắn mediaData vào object trong AppState (để render ngay)
  memoryData.mediaData = AppState.currentMediaData;

  // Thêm mới hoặc cập nhật trong danh sách
  if (AppState.editingId) {
    const index = AppState.memories.findIndex(m => m.id === AppState.editingId);
    if (index !== -1) {
      AppState.memories[index] = memoryData;
    }
    showToast('✓ Đã cập nhật kỷ niệm!', 'success');
  } else {
    AppState.memories.unshift(memoryData);
    showToast('✓ Đã thêm kỷ niệm mới!', 'success');
  }

  // Lưu metadata vào IndexedDB (không kèm mediaData để tránh duplicate)
  const memoriesForDB = AppState.memories.map(({ mediaData, ...rest }) => rest);
  const saved = await StorageAdapter.saveMemories(memoriesForDB);

  if (saved) {
    closeMemoryModal();
    renderTimeline();
    renderAdminMemoryList();
  }
}

/**
 * Xác nhận và xóa kỷ niệm
 * @param {string} id - ID kỷ niệm cần xóa
 */
async function confirmDeleteMemory(id) {
  const memory = AppState.memories.find(m => m.id === id);
  if (!memory) return;

  // Hỏi xác nhận trước khi xóa
  if (!confirm(`Bạn có chắc muốn xóa kỷ niệm "${memory.title}"?\n\nHành động này không thể hoàn tác.`)) {
    return;
  }

  // Xóa khỏi danh sách
  AppState.memories = AppState.memories.filter(m => m.id !== id);

  // Xóa media riêng và lưu metadata
  await StorageAdapter.deleteMedia(id);
  const memoriesForDB = AppState.memories.map(({ mediaData, ...rest }) => rest);
  await StorageAdapter.saveMemories(memoriesForDB);
  renderTimeline();
  renderAdminMemoryList();
  showToast('✓ Đã xóa kỷ niệm', 'success');
}

/**
 * Đặt lại form về trạng thái ban đầu
 */
function resetMemoryForm() {
  document.getElementById('editMemoryId').value = '';
  document.getElementById('memoryTitle').value = '';
  document.getElementById('memoryDate').value = '';
  document.getElementById('memoryDescription').value = '';
  document.getElementById('memoryImageInput').value = '';
  document.getElementById('memoryVideoInput').value = '';

  // Reset preview
  const imagePreview = document.getElementById('imagePreview');
  imagePreview.src = '';
  imagePreview.style.display = 'none';
  document.getElementById('imagePlaceholder').style.display = 'flex';

  const videoPreview = document.getElementById('videoPreview');
  videoPreview.src = '';
  videoPreview.style.display = 'none';
  document.getElementById('videoPlaceholder').style.display = 'flex';

  // Reset media type về ảnh
  switchMediaType('image');
  AppState.currentMediaData = null;
}

/**
 * Chuyển đổi giữa chọn ảnh và chọn video
 * @param {string} type - 'image' hoặc 'video'
 */
function switchMediaType(type) {
  AppState.currentMediaType = type;

  const imageGroup = document.getElementById('imageUploadGroup');
  const videoGroup = document.getElementById('videoUploadGroup');
  const imageBtnEl = document.getElementById('typeImageBtn');
  const videoBtnEl = document.getElementById('typeVideoBtn');

  if (type === 'image') {
    imageGroup.style.display = 'block';
    videoGroup.style.display = 'none';
    imageBtnEl.classList.add('active');
    videoBtnEl.classList.remove('active');
  } else {
    imageGroup.style.display = 'none';
    videoGroup.style.display = 'block';
    imageBtnEl.classList.remove('active');
    videoBtnEl.classList.add('active');
  }

  // Reset media data khi đổi loại
  AppState.currentMediaData = null;
}

/**
 * Preview ảnh được chọn trước khi lưu
 * @param {HTMLInputElement} input - File input element
 */
async function previewImage(input) {
  const file = input.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('⚠️ Vui lòng chọn file ảnh!', 'error');
    return;
  }

  // Cảnh báo nhẹ nếu ảnh rất lớn (>200MB) — IndexedDB hỗ trợ file lớn
  if (file.size > 200 * 1024 * 1024) {
    showToast('⚠️ Ảnh rất lớn (>200MB), có thể mất thời gian xử lý', 'error');
  }

  try {
    const dataUrl = await fileToDataUrl(file);
    AppState.currentMediaData = dataUrl;

    // Hiển thị preview
    const preview = document.getElementById('imagePreview');
    preview.src = dataUrl;
    preview.style.display = 'block';
    document.getElementById('imagePlaceholder').style.display = 'none';
  } catch (e) {
    showToast('⚠️ Không thể đọc file ảnh!', 'error');
  }
}

/**
 * Preview video được chọn trước khi lưu
 * @param {HTMLInputElement} input - File input element
 */
async function previewVideo(input) {
  const file = input.files[0];
  if (!file) return;

  if (!file.type.startsWith('video/')) {
    showToast('⚠️ Vui lòng chọn file video!', 'error');
    return;
  }

  // IndexedDB hỗ trợ file lớn (hàng GB) — chỉ cảnh báo nếu rất lớn
  if (file.size > 2 * 1024 * 1024 * 1024) {
    showToast('⚠️ Video rất lớn (>2GB), có thể mất nhiều thời gian xử lý', 'error');
  }

  try {
    showToast('⏳ Đang xử lý video...', '');
    const dataUrl = await fileToDataUrl(file);
    AppState.currentMediaData = dataUrl;

    // Hiển thị preview
    const preview = document.getElementById('videoPreview');
    preview.src = dataUrl;
    preview.style.display = 'block';
    document.getElementById('videoPlaceholder').style.display = 'none';
    showToast('✓ Video đã sẵn sàng!', 'success');
  } catch (e) {
    showToast('⚠️ Không thể đọc file video!', 'error');
  }
}

// ====================================================
// TIỆN ÍCH - Helper Functions
// ====================================================

/**
 * Chuyển đổi File object sang Data URL (base64)
 * @param {File} file - File cần chuyển đổi
 * @returns {Promise<string>} Data URL
 */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Không thể đọc file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Tạo ID duy nhất cho kỷ niệm
 * @returns {string} ID ngẫu nhiên
 */
function generateId() {
  return 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Format ngày sang tiếng Việt
 * @param {string} dateString - Chuỗi ngày (YYYY-MM-DD)
 * @returns {string} Ngày đã format đẹp
 */
function formatDate(dateString) {
  if (!dateString) return '';

  try {
    const date = new Date(dateString + 'T00:00:00');
    const options = {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    };
    return date.toLocaleDateString('vi-VN', options);
  } catch (e) {
    return dateString;
  }
}

/**
 * Lấy ngày hôm nay theo múi giờ Việt Nam (định dạng YYYY-MM-DD)
 * @returns {string}
 */
function getTodayVN() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/**
 * Escape HTML để tránh XSS
 * @param {string} str - Chuỗi cần escape
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/**
 * Hiển thị toast notification
 * @param {string} message - Nội dung thông báo
 * @param {string} type - 'success' | 'error' | '' (default)
 */
function showToast(message, type = '') {
  // Xóa toast cũ nếu còn
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Hiển thị
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
  });

  // Tự động ẩn sau 3 giây
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/**
 * Đóng tất cả modal/panel khi click overlay
 */
function closeAllModals() {
  // Chỉ đóng nếu lightbox không đang mở
  if (!document.getElementById('lightbox').classList.contains('active')) {
    closeMemoryModal();
    closeAdminPanel();
  }
}

// ====================================================
// SCROLL REVEAL ANIMATION
// Hiệu ứng xuất hiện khi scroll
// ====================================================

/**
 * Khởi tạo Intersection Observer để kích hoạt animation khi scroll
 */
let scrollObserver = null;

function initScrollReveal() {
  // Sử dụng Intersection Observer API (hiệu suất cao)
  scrollObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Thêm delay stagger cho các phần tử liên tiếp
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, i * 100);

          // Ngừng observe sau khi đã hiển thị
          scrollObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,        // Kích hoạt khi 10% phần tử hiển thị
      rootMargin: '0px 0px -40px 0px', // Kích hoạt sớm hơn 40px
    }
  );
}

/**
 * Đăng ký một phần tử để được observe scroll reveal
 * @param {HTMLElement} el - Phần tử cần observe
 */
function observeScrollReveal(el) {
  if (scrollObserver && el) {
    scrollObserver.observe(el);
  }
}

/**
 * Observe tất cả section headers và counter cards
 */
function observeStaticElements() {
  const elements = document.querySelectorAll(
    '.section-header, .counter-card, .counter-quote, .counter-separator'
  );

  elements.forEach(el => {
    el.classList.add('scroll-reveal');
    observeScrollReveal(el);
  });
}

// ====================================================
// KHỞI TẠO ỨNG DỤNG - App Initialization
// ====================================================

/**
 * Hàm khởi tạo chính - chạy khi DOM đã sẵn sàng
 */
async function init() {
  console.log('💕 Ký Ức Của Chúng Mình - Đang khởi động...');

  // 1. Khởi tạo IndexedDB và tải dữ liệu
  AppState.memories = await StorageAdapter.getMemories();

  // Tải mediaData cho từng kỷ niệm từ IndexedDB
  for (const m of AppState.memories) {
    if (!m.mediaData) {
      m.mediaData = await StorageAdapter.getMedia(m.id) || null;
    }
  }

  // 2. Khởi tạo video nền
  await initBackgroundVideo();

  // 2b. Tải ảnh khung tròn đã lưu
  await loadCounterPhoto();

  // 3. Khởi tạo navbar scroll behavior
  initNavbar();

  // 4. Khởi tạo bộ đếm thời gian yêu
  initLoveCounter();

  // 5. Khởi tạo scroll reveal animations
  initScrollReveal();

  // 6. Render dòng thời gian kỷ niệm
  renderTimeline();

  // 7. Observe static elements
  observeStaticElements();

  // 8. Gắn event listeners
  bindEventListeners();

  console.log(`💕 Đã tải ${AppState.memories.length} kỷ niệm thành công!`);
}

/**
 * Gắn các event listener cho nút và tương tác
 */
function bindEventListeners() {
  // Nút mở admin panel
  const openAdminBtn = document.getElementById('openAdminBtn');
  if (openAdminBtn) {
    openAdminBtn.addEventListener('click', openAdminPanel);
  }

  // Nút thêm kỷ niệm mới trong timeline
  const openAddMemoryBtn = document.getElementById('openAddMemoryBtn');
  if (openAddMemoryBtn) {
    openAddMemoryBtn.addEventListener('click', openAddMemoryModal);
  }

  // Phím ESC để đóng modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
      closeMemoryModal();
      closeAdminPanel();
    }
  });

  // Ngăn context menu trên ảnh (tùy chọn)
  // document.addEventListener('contextmenu', e => {
  //   if (e.target.tagName === 'IMG') e.preventDefault();
  // });
}

// ====================================================
// CHẠY KHI DOM SẴN SÀNG
// ====================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM đã sẵn sàng (script ở cuối body)
  init();
}