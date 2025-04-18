import React from "react";
import "./styles.css";

const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  type = "warning", // warning, success, error, info
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`confirmation-header ${type}`}>
          <h2>{title}</h2>
        </div>
        <div className="confirmation-content">
          <p>{message}</p>
        </div>
        <div className="confirmation-actions">
          {cancelText && (
            <button className="cancel-button" onClick={onCancel}>
              {cancelText}
            </button>
          )}
          {confirmText && (
            <button className={`confirm-button ${type}`} onClick={onConfirm}>
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
