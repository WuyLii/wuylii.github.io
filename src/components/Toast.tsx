import React from 'react';
import { ToastItem } from '../types';

interface ToastProps {
  toasts: ToastItem[];
}

export const Toast: React.FC<ToastProps> = ({ toasts }) => {
  return (
    <div className="toast-container" id="toastContainer" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-msg ${toast.type || ''}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
};
