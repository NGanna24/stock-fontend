// components/Facture/FacturePDFActions.jsx
import React, { useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import FacturePDFService from '../../services/facturePDFService';
import ApercuImpression from '../Impression/ApercuImpression';

const FacturePDFActions = ({ factureData, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [apercu, setApercu] = useState(false);

    const handleDownload = async () => {
        if (!factureData) {
            alert('Aucune facture à télécharger');
            return;
        }

        setLoading(true);
        try {
            await FacturePDFService.downloadPDF(factureData);
        } catch (error) {
            console.error('❌ Download error:', error);
            alert('Erreur lors du téléchargement du PDF');
        } finally {
            setLoading(false);
        }
    };

    // « Imprimer » ouvre l'aperçu : le choix de l'imprimante et l'impression s'y font.
    const handlePrint = () => {
        if (!factureData) {
            alert('Aucune facture à imprimer');
            return;
        }
        setApercu(true);
    };

    return (
        <>
            <div className="facture-pdf-actions-container">
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
                    className="pdf-btn pdf-btn-close"
                    onClick={onClose}
                    disabled={loading}
                >
                    <X size={18} />
                    <span>Fermer</span>
                </button>
            </div>

            {loading && (
                <div className="pdf-loading-overlay">
                    <div className="pdf-loading-spinner"></div>
                    <p>Génération du PDF...</p>
                </div>
            )}

            {apercu && (
                <ApercuImpression
                    titre="Facture"
                    sousTitre={factureData?.numero_facture}
                    getBlob={() => FacturePDFService.getBlob(factureData, 'a4')}
                    fileName={FacturePDFService.fileNameFor(factureData, 'a4')}
                    onClose={() => setApercu(false)}
                />
            )}
        </>
    );
};

export default FacturePDFActions;