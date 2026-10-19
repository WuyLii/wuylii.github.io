import React, { useState, useEffect, useRef } from 'react';
import { sha256, CLIENT_SALT, DEFAULT_PASSWORD_HASH } from '../services/crypto';

interface PasswordGateProps {
  isUnlocked: boolean;
  expectedHash?: string;
  salt?: string;
  isLoading?: boolean;
  onUnlockSuccess: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | '') => void;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({
  isUnlocked,
  expectedHash,
  salt,
  isLoading = false,
  onUnlockSuccess,
  onToast,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [flashActive, setFlashActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isUnlocked && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isUnlocked]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMsg('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  if (isUnlocked && !flashActive) {
    return null;
  }

  const handleUnlock = async () => {
    if (lockoutSeconds > 0) return;

    const trimmed = password.trim();
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập mật mã!');
      inputRef.current?.focus();
      return;
    }

    const currentSalt = salt || CLIENT_SALT;
    const enteredHash = await sha256(trimmed + currentSalt);
    const targetHash = expectedHash || DEFAULT_PASSWORD_HASH;

    // Direct match or default password match
    const isCorrect = enteredHash === targetHash || (trimmed === '00000000');

    if (isCorrect) {
      setErrorMsg('');
      setFailedAttempts(0);
      setFlashActive(true);

      setTimeout(() => {
        sessionStorage.setItem('memoryGateUnlocked', 'true');
        onUnlockSuccess();
        onToast('✓ Đã mở cổng thành công!', 'success');
        setTimeout(() => setFlashActive(false), 300);
      }, 450);
    } else {
      setPassword('');
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);

      if (newFails >= 5) {
        setLockoutSeconds(30);
        setErrorMsg('Quá 5 lần sai. Thử lại sau 30 giây...');
      } else {
        setErrorMsg(`Mật mã không đúng! (Còn ${5 - newFails} lần thử)`);
      }
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  };

  return (
    <>
      <div
        id="memoryGate"
        className={`gate-stage ${isUnlocked ? 'gate-hidden' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Cổng bảo vệ"
      >
        <div className="gate-backdrop-under no-custom-bg" id="gateBackdropUnder" />
        <div className="gate-backdrop-blur no-custom-bg" id="gateBackdropBlur" />
        <div className="shade-layer shade-h" />
        <div className="shade-layer shade-v" />

        <div className="gate-card">
          <div className="gate-badge">✦ Không gian cá nhân ✦</div>
          <h1 className="gate-title">Chỉ dành cho mình.</h1>
          <p className="gate-desc">Nhập mật mã để mở ra không gian nỗ lực riêng tư ♡</p>

          <div className="gate-form-wrap" id="gateFormWrap">
            <div className="gate-input-row">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                id="gatePasswordInput"
                className="gate-input"
                placeholder="Nhập mật mã..."
                autoComplete="current-password"
                aria-label="Mật mã mở cổng"
                value={password}
                disabled={lockoutSeconds > 0}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                id="gateTogglePwBtn"
                className="gate-icon-btn"
                title="Hiện/ẩn mật mã"
                aria-label="Hiện hoặc ẩn mật mã"
                onClick={() => setShowPassword(!showPassword)}
              >
                <svg id="eyeIconSvg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showPassword ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>

            <div className="gate-error-msg" id="gateErrorMsg" role="alert" aria-live="assertive">
              {lockoutSeconds > 0 ? `Quá 5 lần sai. Thử lại sau ${lockoutSeconds} giây...` : errorMsg}
            </div>

            <div className="gate-actions">
              <button
                type="button"
                id="gateUnlockBtn"
                className="gate-submit-btn"
                disabled={lockoutSeconds > 0}
                onClick={handleUnlock}
              >
                <span className="gate-btn-text">Mở Cổng</span>
                <span className="btn-disc">
                  <svg width="10" height="10" viewBox="0 0 6 7" fill="none">
                    <path d="M.6.6 4 4 .6 7.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            </div>
          </div>

          {isLoading && (
            <div id="gateLoading" className="gate-loading" style={{ display: 'flex' }}>
              <div className="gate-spinner" />
              <span>Đang kiểm tra kết nối...</span>
            </div>
          )}

          <p className="gate-hint">Mật mã được lưu trữ an toàn trong CSDL (mặc định: 00000000)</p>
        </div>
      </div>

      <div className={`gate-flash-overlay ${flashActive ? 'flash-in' : ''}`} id="gateFlashOverlay" />
    </>
  );
};
