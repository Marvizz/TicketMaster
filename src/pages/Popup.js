// Popup.js
import React from 'react';
import '../styles/Popup.css';

const Popup = ({ message, type, isOpen, onClose, onConfirm, confirmText, cancelText }) => {
  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className={`popup ${type}`} onClick={e => e.stopPropagation()}>
        <div className="popup-message">{message}</div>
        {onConfirm && (
          <button className="popup-confirm-btn" onClick={onConfirm}>
            {confirmText || 'Potwierdź'}
          </button>
        )}
        {cancelText && (
          <button className="popup-cancel-btn" onClick={onClose}>
            {cancelText}
          </button>
        )}
        {!onConfirm && !cancelText && (
          <button className="popup-close-btn" onClick={onClose}>
            Zamknij
          </button>
        )}
      </div>
    </div>
  );
};

export default Popup;