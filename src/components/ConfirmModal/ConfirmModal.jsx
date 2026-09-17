// components/ConfirmModal/ConfirmModal.jsx
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import './ConfirmModal.css';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    details,
    type = 'warning',       // 'warning' | 'danger' | 'success' | 'info'
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    loading = false,
}) => {
    // Fermer avec ESC
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e) => {
            if (e.key === 'Escape' && !loading) onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, loading, onClose]);

    // Bloquer le scroll du body
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const config = {
        warning: { icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb' },
        danger:  { icon: XCircle,       color: '#ef4444', bg: '#fef2f2' },
        success: { icon: CheckCircle,   color: '#10b981', bg: '#ecfdf5' },
        info:    { icon: Info,          color: '#2563eb', bg: '#eff6ff' },
    }[type] || { icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb' };

    const Icon = config.icon;

    return createPortal(
        <div
            className="confirm-modal-overlay"
            onClick={() => !loading && onClose()}
        >
            <div
                className="confirm-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="confirm-modal-header"
                    style={{ background: config.bg }}
                >
                    <div
                        className="confirm-modal-icon"
                        style={{ background: config.color }}
                    >
                        <Icon size={24} color="#fff" />
                    </div>
                    <div className="confirm-modal-titles">
                        <h3>{title}</h3>
                    </div>
                    <button
                        className="confirm-modal-close"
                        onClick={() => !loading && onClose()}
                        disabled={loading}
                        aria-label="Fermer"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="confirm-modal-body">
                    {message && (
                        <p className="confirm-modal-message">{message}</p>
                    )}

                    {details && (
                        <div className="confirm-modal-details">
                            {details}
                        </div>
                    )}
                </div>

                <div className="confirm-modal-footer">
                    <button
                        className="confirm-modal-btn confirm-modal-btn-cancel"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        className={`confirm-modal-btn confirm-modal-btn-confirm confirm-modal-btn-${type}`}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="confirm-spinner"></span>
                                <span>Traitement...</span>
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmModal;