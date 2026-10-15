// components/CommandeAchat/BonCommandePDFActions.jsx
import React, { useState } from 'react';
import { Download, Printer, X, MessageCircle, Send } from 'lucide-react';
import BonCommandePDFService from '../../services/bonCommandePDFService';
import './BonCommandePDFActions.css';

const BonCommandePDFActions = ({ commandeData, loading = false, onClose }) => {
    // ⚠️ On renomme l'état local en "busy" pour éviter le conflit avec la prop "loading"
    const [busy, setBusy] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [whatsappPhone, setWhatsappPhone] = useState('');
    const [whatsappMessage, setWhatsappMessage] = useState('');
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

    // Le PDF est prêt seulement si :
    //   - les détails sont chargés (loading === false)
    //   - les lignes existent (commandeData.lignes non vide)
    const hasLignes = Array.isArray(commandeData?.lignes) && commandeData.lignes.length > 0;
    const isReady = !loading && hasLignes;
    const isDisabled = busy || !isReady;

    // ============================================================
    // TÉLÉCHARGER
    // ============================================================
    const handleDownload = async () => {
        if (!isReady) {
            alert('Veuillez patienter, les détails de la commande sont en cours de chargement.');
            return;
        }
        setBusy(true);
        try {
            await BonCommandePDFService.downloadPDF(commandeData);
        } catch (error) {
            console.error('❌ Download error:', error);
            alert('Erreur lors du téléchargement du PDF');
        } finally {
            setBusy(false);
        }
    };

    // ============================================================
    // IMPRIMER
    // ============================================================
    const handlePrint = async () => {
        if (!isReady) {
            alert('Veuillez patienter, les détails de la commande sont en cours de chargement.');
            return;
        }
        setBusy(true);
        try {
            await BonCommandePDFService.print(commandeData);
        } catch (error) {
            console.error('❌ Print error:', error);
            alert('Erreur lors de l\'impression');
        } finally {
            setBusy(false);
        }
    };

    // ============================================================
    // WHATSAPP — OUVRIR LE MODAL
    // ============================================================
    const handleOpenWhatsApp = () => {
        if (!isReady) {
            alert('Veuillez patienter, les détails de la commande sont en cours de chargement.');
            return;
        }
        setWhatsappPhone(commandeData.fournisseur_telephone || '');
        setWhatsappMessage(BonCommandePDFService._buildDefaultMessage(commandeData));
        setShowWhatsAppModal(true);
    };

    // ============================================================
    // WHATSAPP — ENVOYER
    // ============================================================
    const handleSendWhatsApp = async () => {
        if (!whatsappPhone || whatsappPhone.replace(/\D/g, '').length < 6) {
            alert('Veuillez saisir un numéro de téléphone valide');
            return;
        }

        setSendingWhatsApp(true);
        try {
            const result = await BonCommandePDFService.shareWhatsApp(commandeData, {
                telephone: whatsappPhone,
                message: whatsappMessage,
            });

            if (result.cancelled) {
                return;
            }

            if (result.success) {
                setShowWhatsAppModal(false);
                if (result.message) {
                    setTimeout(() => {
                        alert(result.message);
                    }, 300);
                }
            }
        } catch (error) {
            console.error('❌ WhatsApp error:', error);
            alert(error.message || 'Erreur lors de l\'envoi WhatsApp');
        } finally {
            setSendingWhatsApp(false);
        }
    };

    return (
        <>
            <div className="facture-pdf-actions-container">

                {loading && (
                    <div className="pdf-actions-status">
                        <span className="spinner-small spinner-dark"></span>
                        <span>Chargement des détails…</span>
                    </div>
                )}

                {!loading && !hasLignes && (
                    <div className="pdf-actions-status pdf-actions-status--warning">
                        <span>⚠️ Aucun produit dans cette commande</span>
                    </div>
                )}

                <button
                    className="pdf-btn pdf-btn-download"
                    onClick={handleDownload}
                    disabled={isDisabled}
                    title={!isReady ? 'Chargement des détails en cours…' : 'Télécharger le PDF'}
                >
                    <Download size={18} />
                    <span>Télécharger PDF</span>
                </button>

                <button
                    className="pdf-btn pdf-btn-print"
                    onClick={handlePrint}
                    disabled={isDisabled}
                    title={!isReady ? 'Chargement des détails en cours…' : 'Imprimer'}
                >
                    <Printer size={18} />
                    <span>Imprimer</span>
                </button>

                <button
                    className="pdf-btn pdf-btn-whatsapp"
                    onClick={handleOpenWhatsApp}
                    disabled={isDisabled}
                    title={!isReady ? 'Chargement des détails en cours…' : 'Envoyer par WhatsApp'}
                >
                    <MessageCircle size={18} />
                    <span>WhatsApp</span>
                </button>

                <button
                    className="pdf-btn pdf-btn-close"
                    onClick={onClose}
                    disabled={busy}
                >
                    <X size={18} />
                    <span>Fermer</span>
                </button>
            </div>

            {/* Loading overlay pendant la génération du PDF */}
            {busy && (
                <div className="pdf-loading-overlay">
                    <div className="pdf-loading-spinner"></div>
                    <p>Génération du PDF...</p>
                </div>
            )}

            {/* ============================================================ */}
            {/* MODAL WHATSAPP                                                */}
            {/* ============================================================ */}
            {showWhatsAppModal && (
                <div
                    className="whatsapp-modal-overlay"
                    onClick={() => !sendingWhatsApp && setShowWhatsAppModal(false)}
                >
                    <div
                        className="whatsapp-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="whatsapp-modal-header">
                            <div className="whatsapp-modal-title">
                                <div className="whatsapp-icon-badge">
                                    <MessageCircle size={20} />
                                </div>
                                <div>
                                    <h3>Envoyer par WhatsApp</h3>
                                    <p className="whatsapp-subtitle">
                                        {commandeData?.numero_commande}
                                    </p>
                                </div>
                            </div>
                            <button
                                className="whatsapp-modal-close"
                                onClick={() => !sendingWhatsApp && setShowWhatsAppModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="whatsapp-modal-body">
                            <div className="form-group">
                                <label>Numéro de téléphone *</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    value={whatsappPhone}
                                    onChange={(e) => setWhatsappPhone(e.target.value)}
                                    placeholder="Ex: 2250700000000"
                                    disabled={sendingWhatsApp}
                                />
                                <small className="form-hint">
                                    Format international sans "+" ni espaces (ex: 2250700000000)
                                </small>
                            </div>

                            <div className="form-group">
                                <label>Message *</label>
                                <textarea
                                    className="form-textarea"
                                    value={whatsappMessage}
                                    onChange={(e) => setWhatsappMessage(e.target.value)}
                                    rows="6"
                                    disabled={sendingWhatsApp}
                                />
                            </div>

                            <div className="whatsapp-info-box">
                                <div className="whatsapp-info-icon">💡</div>
                                <div className="whatsapp-info-text">
                                    <strong>Sur mobile :</strong> le PDF sera joint automatiquement.<br />
                                    <strong>Sur ordinateur :</strong> le PDF sera téléchargé,
                                    puis WhatsApp Web s'ouvrira — glissez le PDF dans la conversation.
                                </div>
                            </div>
                        </div>

                        <div className="whatsapp-modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowWhatsAppModal(false)}
                                disabled={sendingWhatsApp}
                            >
                                Annuler
                            </button>
                            <button
                                className="btn btn-whatsapp"
                                onClick={handleSendWhatsApp}
                                disabled={sendingWhatsApp}
                            >
                                {sendingWhatsApp ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        <span>Envoi...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        <span>Envoyer sur WhatsApp</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BonCommandePDFActions;