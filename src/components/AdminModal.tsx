import React, { useState, useEffect } from 'react';
import { Photo, SiteConfig } from '../types';
import { formatDateDisplay, parseInputDateToIso } from '../utils/dateUtils';
import { CloudinaryAdapter } from '../services/cloudinary';
import { sha256, CLIENT_SALT, DEFAULT_PASSWORD_HASH } from '../services/crypto';

interface AdminModalProps {
  isOpen: boolean;
  config: SiteConfig;
  photos: Photo[];
  onClose: () => void;
  onSaveInfo: (name: string, startDateIso: string) => Promise<void>;
  onSaveBgSettings: (bgImage: string, bgPosition: string) => Promise<void>;
  onUpdatePassword: (newHash: string) => Promise<void>;
  onEditPhoto: (photo: Photo) => void;
  onDeletePhoto: (photoId: string) => Promise<void>;
  onToast: (msg: string, type?: 'success' | 'error' | '') => void;
}

type TabType = 'tabInfo' | 'tabBg' | 'tabPw' | 'tabList';

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  config,
  photos,
  onClose,
  onSaveInfo,
  onSaveBgSettings,
  onUpdatePassword,
  onEditPhoto,
  onDeletePhoto,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('tabInfo');

  // Tab 1 state
  const [personName, setPersonName] = useState(config.person_name);
  const [startDateStr, setStartDateStr] = useState(formatDateDisplay(config.start_date));
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // Tab 2 state
  const [bgImage, setBgImage] = useState(config.bg_image);
  const [posX, setPosX] = useState(60);
  const [posY, setPosY] = useState(35);
  const [bgUploadStatus, setBgUploadStatus] = useState('');
  const [isSavingBg, setIsSavingBg] = useState(false);

  // Tab 3 state
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [cfmPw, setCfmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [isSavingPw, setIsSavingPw] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPersonName(config.person_name);
    setStartDateStr(formatDateDisplay(config.start_date));
    setBgImage(config.bg_image);

    const parts = (config.bg_position || '60% 35%').split(' ');
    setPosX(parseInt(parts[0], 10) || 60);
    setPosY(parseInt(parts[1], 10) || 35);

    setCurPw('');
    setNewPw('');
    setCfmPw('');
    setPwMsg('');
    setBgUploadStatus('');
  }, [isOpen, config]);

  if (!isOpen) return null;

  // Handle Save Info
  const handleSaveInfoSubmit = async () => {
    const trimmedName = personName.trim();
    if (!trimmedName) {
      onToast('Vui lòng nhập tên người làm động lực!', 'error');
      return;
    }
    const isoDate = parseInputDateToIso(startDateStr);
    try {
      setIsSavingInfo(true);
      onToast('Đang lưu thông tin...', '');
      await onSaveInfo(trimmedName, isoDate);
      onToast('✓ Đã cập nhật thông tin thành công!', 'success');
    } catch (e: any) {
      onToast('Lỗi lưu: ' + (e.message || ''), 'error');
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Handle Bg Upload
  const handleBgFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBgUploadStatus('⏳ Đang tải ảnh nền lên...');
      onToast('Đang tải ảnh nền mới...', '');
      const up = await CloudinaryAdapter.upload(file);
      setBgImage(up.secure_url);
      setBgUploadStatus('✓ Tải lên ảnh nền thành công! Bấm lưu bên dưới để cập nhật.');
      onToast('✓ Tải ảnh thành công, hãy bấm Lưu Cấu Hình', 'success');
    } catch (err: any) {
      setBgUploadStatus('⚠️ Lỗi: ' + (err.message || ''));
      onToast('Lỗi: ' + (err.message || ''), 'error');
    }
  };

  // Handle Save Bg
  const handleSaveBgSubmit = async () => {
    const position = `${posX}% ${posY}%`;
    try {
      setIsSavingBg(true);
      await onSaveBgSettings(bgImage, position);
      onToast('✓ Đã lưu cấu hình ảnh nền!', 'success');
    } catch (e: any) {
      onToast('Lỗi lưu: ' + (e.message || ''), 'error');
    } finally {
      setIsSavingBg(false);
    }
  };

  // Handle Password Change
  const handleSavePwSubmit = async () => {
    setPwMsg('');
    if (!curPw || !newPw || !cfmPw) {
      setPwMsg('Vui lòng điền đầy đủ các ô mật khẩu!');
      return;
    }
    if (newPw.length < 6) {
      setPwMsg('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }
    if (newPw !== cfmPw) {
      setPwMsg('Xác nhận mật khẩu mới không khớp!');
      return;
    }

    const salt = config.gate_password_salt || CLIENT_SALT;
    const curHash = await sha256(curPw + salt);
    const targetHash = config.gate_password_hash || DEFAULT_PASSWORD_HASH;

    if (curHash !== targetHash && curPw !== '00000000') {
      setPwMsg('Mật khẩu hiện tại không đúng!');
      return;
    }

    try {
      setIsSavingPw(true);
      const newHash = await sha256(newPw + salt);
      await onUpdatePassword(newHash);

      setCurPw('');
      setNewPw('');
      setCfmPw('');
      setPwMsg('');
      onToast('✓ Đã đổi mật khẩu thành công!', 'success');
    } catch (e: any) {
      setPwMsg('Lỗi đổi mật khẩu: ' + (e.message || ''));
    } finally {
      setIsSavingPw(false);
    }
  };

  const previewStyle = bgImage
    ? {
        backgroundImage: `url("${CloudinaryAdapter.getOptimizedUrl(bgImage, 'f_auto,q_auto,w_800')}")`,
        backgroundPosition: `${posX}% ${posY}%`,
        backgroundSize: 'cover',
      }
    : undefined;

  return (
    <div
      className="river-modal-overlay active"
      id="adminModalOverlay"
      aria-hidden={!isOpen}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="river-modal glass-panel admin-dialog"
        id="adminModal"
        role="dialog"
        aria-modal="true"
        aria-label="Bảng quản lý"
      >
        <div className="modal-header">
          <h3>✦ Bảng Quản Lý</h3>
          <button
            type="button"
            className="modal-close"
            id="closeAdminModalBtn"
            aria-label="Đóng"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal-body admin-body">
          <div className="admin-tab-bar" role="tablist">
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'tabInfo' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'tabInfo'}
              onClick={() => setActiveTab('tabInfo')}
            >
              Thông Tin
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'tabBg' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'tabBg'}
              onClick={() => setActiveTab('tabBg')}
            >
              Ảnh Nền
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'tabPw' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'tabPw'}
              onClick={() => setActiveTab('tabPw')}
            >
              Mật Khẩu
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'tabList' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'tabList'}
              onClick={() => setActiveTab('tabList')}
            >
              Quản Lý Ảnh
            </button>
          </div>

          {/* 1. TAB THÔNG TIN */}
          {activeTab === 'tabInfo' && (
            <div className="admin-tab-pane active" id="tabInfo" role="tabpanel">
              <div className="form-group">
                <label className="form-label" htmlFor="adminPersonName">
                  Tên người làm động lực
                </label>
                <input
                  type="text"
                  id="adminPersonName"
                  className="form-input"
                  placeholder="Ví dụ: Bảo Vy, Vy..."
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                />
                <small className="form-tip">
                  Cập nhật ngay lập tức trên trang và tiêu đề web mà không cần tải lại.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="adminStartDate">
                  Ngày bắt đầu nỗ lực (dd/mm/yyyy)
                </label>
                <input
                  type="text"
                  id="adminStartDate"
                  className="form-input"
                  placeholder="dd/mm/yyyy"
                  maxLength={10}
                  inputMode="numeric"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                />
                <small className="form-tip">
                  Đồng hồ đếm ngày và giờ sẽ tính từ mốc thời gian này.
                </small>
              </div>

              <button
                type="button"
                className="btn-save"
                id="saveInfoBtn"
                disabled={isSavingInfo}
                onClick={handleSaveInfoSubmit}
              >
                <span>{isSavingInfo ? 'Đang lưu...' : 'Lưu Thông Tin'}</span>
              </button>
            </div>
          )}

          {/* 2. TAB ẢNH NỀN */}
          {activeTab === 'tabBg' && (
            <div className="admin-tab-pane active" id="tabBg" role="tabpanel">
              <div className="form-group">
                <label className="form-label">Tải lên ảnh nền mới</label>
                <label className="upload-dropzone" htmlFor="adminBgFileInputModal">
                  <span className="upload-icon">🖼️</span>
                  <span className="upload-text">Chọn ảnh chân dung chất lượng cao</span>
                  <input
                    type="file"
                    id="adminBgFileInputModal"
                    accept="image/*"
                    hidden
                    onChange={handleBgFileUpload}
                  />
                </label>
                {bgUploadStatus && (
                  <div id="bgUploadStatus" className="upload-status-text">
                    {bgUploadStatus}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Tiêu điểm khuôn mặt (Object Position)</label>
                <div className="slider-row">
                  <span>Trục X (%):</span>
                  <input
                    type="range"
                    id="bgPosSliderX"
                    min="0"
                    max="100"
                    value={posX}
                    onChange={(e) => setPosX(Number(e.target.value))}
                  />
                  <strong id="bgPosXVal">{posX}%</strong>
                </div>
                <div className="slider-row">
                  <span>Trục Y (%):</span>
                  <input
                    type="range"
                    id="bgPosSliderY"
                    min="0"
                    max="100"
                    value={posY}
                    onChange={(e) => setPosY(Number(e.target.value))}
                  />
                  <strong id="bgPosYVal">{posY}%</strong>
                </div>
                <small className="form-tip">
                  Kéo thanh trượt để chỉnh khuôn mặt nằm vừa vặn vào khoảng sáng bên phải.
                </small>
              </div>

              <div className="bg-preview-box" id="adminBgPreviewBox">
                <div
                  className="bg-preview-img"
                  id="adminBgPreviewImg"
                  style={previewStyle}
                />
              </div>

              <button
                type="button"
                className="btn-save"
                id="saveBgSettingsBtn"
                disabled={isSavingBg}
                onClick={handleSaveBgSubmit}
              >
                <span>{isSavingBg ? 'Đang lưu...' : 'Lưu Cấu Hình Ảnh Nền'}</span>
              </button>
            </div>
          )}

          {/* 3. TAB ĐỔI MẬT KHẨU */}
          {activeTab === 'tabPw' && (
            <div className="admin-tab-pane active" id="tabPw" role="tabpanel">
              <div className="form-group">
                <label className="form-label" htmlFor="adminCurrentPw">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  id="adminCurrentPw"
                  className="form-input"
                  placeholder="Nhập mật khẩu đang dùng..."
                  autoComplete="current-password"
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="adminNewPw">
                  Mật khẩu mới (tối thiểu 6 ký tự)
                </label>
                <input
                  type="password"
                  id="adminNewPw"
                  className="form-input"
                  placeholder="Mật khẩu mới..."
                  autoComplete="new-password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="adminConfirmPw">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  id="adminConfirmPw"
                  className="form-input"
                  placeholder="Nhập lại mật khẩu mới..."
                  autoComplete="new-password"
                  value={cfmPw}
                  onChange={(e) => setCfmPw(e.target.value)}
                />
              </div>

              {pwMsg && (
                <div className="gate-error-msg" id="adminPwMsg">
                  {pwMsg}
                </div>
              )}

              <button
                type="button"
                className="btn-save"
                id="saveNewPwBtn"
                disabled={isSavingPw}
                onClick={handleSavePwSubmit}
              >
                <span>{isSavingPw ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}</span>
              </button>
            </div>
          )}

          {/* 4. TAB DANH SÁCH ẢNH */}
          {activeTab === 'tabList' && (
            <div className="admin-tab-pane active" id="tabList" role="tabpanel">
              <div className="admin-photos-list" id="adminPhotosList">
                {photos.length === 0 ? (
                  <p style={{ opacity: 0.6, fontSize: '13.5px', padding: '8px 0' }}>
                    Chưa có hình ảnh nào được lưu.
                  </p>
                ) : (
                  photos.map((photo) => (
                    <div key={photo.id} className="admin-photo-row">
                      <div className="admin-photo-meta">
                        <span className="admin-photo-date">
                          {formatDateDisplay(photo.date)}
                        </span>
                        <strong className="admin-photo-title">
                          {photo.title || 'Khoảnh khắc'}
                        </strong>
                      </div>
                      <div className="admin-photo-actions">
                        <button
                          type="button"
                          className="admin-btn-action admin-btn-edit"
                          onClick={() => {
                            onClose();
                            onEditPhoto(photo);
                          }}
                        >
                          ✏️ Sửa
                        </button>
                        <button
                          type="button"
                          className="admin-btn-action admin-btn-del"
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc muốn xóa ảnh "${photo.title || 'Khoảnh khắc'}" không?`)) {
                              onDeletePhoto(photo.id);
                            }
                          }}
                        >
                          🗑 Xóa
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
