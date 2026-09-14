// components/RetourFournisseur/RetourPDFActions.jsx
import React, { useState } from 'react';
import { Download, Mail, Printer, X, Send, FileText } from 'lucide-react';
import RetourPDFService from '../../services/retourFournisseur/RetourPDFService';
import './RetourPDFActions.css';

const RetourPDFActions = ({ retourData, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailData, setEmailData] = useState({
        to: retourData?.fournisseur_email || '',
        subject: `Bon de retour N° ${retourData?.numero_retour || ''}`,
        message: `Bonjour,\n\nVeuillez trouver ci-joint le bon de retour N° ${retourData?.numero_retour || ''}.\n\nMotif: ${retourData?.motif_retour || ''}\nMontant total: ${retourData?.montant_total ? Math.round(retourData.montant_total).toLocaleString('fr-FR') + ' FCFA' : '0 FCFA'}\n\nCordialement.`
    });

    const handleDownload = async () => {
        setLoading(true);
        try {
            await RetourPDFService.downloadPDF(retourData);
        } catch (error) {
            console.error('❌ Download error:', error);
            alert('Erreur lors du téléchargement du PDF');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        setLoading(true);
        try {
            await RetourPDFService.print(retourData);
        } catch (error) {
            console.error('❌ Print error:', error);
            alert('Erreur lors de l\'impression');
        } finally {
            setLoading(false);
        }
    };

    const handleSendEmail = async () => {
        if (!emailData.to) {
            alert('Veuillez saisir une adresse email');
            return;
        }

        setLoading(true);
        try {
            await RetourPDFService.sendByEmail(retourData, emailData);
            alert('✅ Email envoyé avec succès !');
            setShowEmailModal(false);
        } catch (error) {
            console.error('❌ Email error:', error);
            alert('Erreur lors de l\'envoi de l\'email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Boutons d'actions */}
            <div className="pdf-actions-container">
                <button 
                    className="pdf-btn pdf-btn-download"
                    onClick={handleDownload}
                    disabled={loading}
                >
                    <Download size={18} />
                    <span>Télécharger PDF</span>
                </button>

                <button 
                    className="pdf-btn pdf-btn-print"
                    onClick={handlePrint}
                    disabled={loading}
                >
                    <Printer size={18} />
                    <span>Imprimer</span>
                </button>

                <button 
                    className="pdf-btn pdf-btn-email"
                    onClick={() => setShowEmailModal(true)}
                    disabled={loading}
                >
                    <Mail size={18} />
                    <span>Envoyer par email</span>
                </button>

                <button 
                    className="pdf-btn pdf-btn-close"
                    onClick={onClose}
                >
                    <X size={18} />
                    <span>Fermer</span>
                </button>
            </div>

            {/* Modal d'envoi d'email */}
            {showEmailModal && (
                <div className="email-modal-overlay" onClick={() => setShowEmailModal(false)}>
                    <div className="email-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="email-modal-header">
                            <h3>
                                <Mail size={20} />
                                Envoyer par email
                            </h3>
                            <button className="email-modal-close" onClick={() => setShowEmailModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="email-modal-body">
                            <div className="form-group">
                                <label>Email du fournisseur *</label>
                                <input
                                    type="email"
                                    value={emailData.to}
                                    onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                                    placeholder="fournisseur@email.com"
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Objet</label>
                                <input
                                    type="text"
                                    value={emailData.subject}
                                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Message</label>
                                <textarea
                                    value={emailData.message}
                                    onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                                    rows="6"
                                    className="form-textarea"
                                />
                            </div>

                            <div className="email-attachment-info">
                                <FileText size={16} />
                                <span>Pièce jointe: Bon_Retour_{retourData?.numero_retour || ''}.pdf</span>
                            </div>
                        </div>

                        <div className="email-modal-footer">
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowEmailModal(false)}
                                disabled={loading}
                            >
                                Annuler
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={handleSendEmail}
                                disabled={loading || !emailData.to}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        <span>Envoi...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        <span>Envoyer</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading overlay */}
            {loading && (
                <div className="pdf-loading-overlay">
                    <div className="pdf-loading-spinner"></div>
                    <p>Génération du PDF...</p>
                </div>
            )}
        </>
    );
};

export default RetourPDFActions;