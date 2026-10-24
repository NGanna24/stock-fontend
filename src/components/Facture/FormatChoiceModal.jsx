// components/Facture/FormatChoiceModal.jsx
import React, { useState } from 'react';
import { Receipt, FileText, Download, Printer, Loader, X } from 'lucide-react';
import FacturePDFService from '../../services/facturePDFService';
import './FormatChoiceModal.css';

const FormatChoiceModal = ({ isOpen, factureData, action = 'print', onClose, onDone }) => {
  const [loading, setLoading] = useState(null); // 'ticket' | 'a4' | null
  const [error, setError] = useState(null);

  if (!isOpen || !factureData) return null;

  const isDownload = action === 'download';

  const title = isDownload
    ? 'Télécharger quelle version ?'
    : 'Imprimer quelle version ?';

  const subtitle = isDownload
    ? 'Choisissez le format du fichier PDF'
    : 'Choisissez le format à imprimer';

  const handleChoice = async (format) => {
    setLoading(format);
    setError(null);
    try {
      if (isDownload) {
        // Téléchargement
        if (format === 'ticket') {
          await FacturePDFService.downloadTicketPDF(factureData);
        } else {
          await FacturePDFService.downloadPDF(factureData);
        }
      } else {
        // Impression
        let res;
        if (format === 'ticket') {
          res = await FacturePDFService.printTicket(factureData);
        } else {
          res = await FacturePDFService.print(factureData);
        }
        if (res?.fallback) {
          setError(
            "Impression directe indisponible : le PDF a été téléchargé à la place."
          );
          setLoading(null);
          return;
        }
      }
      onDone?.(format);
    } catch (e) {
      console.error('FormatChoiceModal error:', e);
      setError(e.message || 'Erreur lors de l\'opération');
      setLoading(null);
    }
  };

  const canClose = !loading;

  return (
    <div
      className="fcm-overlay"
      onClick={() => canClose && onClose?.()}
    >
      <div className="fcm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fcm-header">
          <div className="fcm-header-text">
            <h2>{title}</h2>
            <p className="fcm-sub">
              Facture <strong>{factureData.numero_facture || '-'}</strong>
            </p>
          </div>
          <button
            type="button"
            className="fcm-close"
            onClick={() => canClose && onClose?.()}
            disabled={!canClose}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="fcm-body">
          <p className="fcm-question">{subtitle}</p>

          {error && (
            <div className="fcm-error" role="alert">
              {error}
            </div>
          )}

          <div className="fcm-choices">
            <button
              type="button"
              className="fcm-choice fcm-choice--ticket"
              onClick={() => handleChoice('ticket')}
              disabled={!!loading}
            >
              <span className="fcm-choice-icon">
                {loading === 'ticket' ? (
                  <Loader size={26} className="fcm-spin" />
                ) : (
                  <Receipt size={26} />
                )}
              </span>
              <span className="fcm-choice-title">Ticket</span>
              <span className="fcm-choice-sub">80mm thermique</span>
              <span className="fcm-choice-action">
                {isDownload ? (
                  <><Download size={13} /> Télécharger</>
                ) : (
                  <><Printer size={13} /> Imprimer</>
                )}
              </span>
            </button>

            <button
              type="button"
              className="fcm-choice fcm-choice--a4"
              onClick={() => handleChoice('a4')}
              disabled={!!loading}
            >
              <span className="fcm-choice-icon">
                {loading === 'a4' ? (
                  <Loader size={26} className="fcm-spin" />
                ) : (
                  <FileText size={26} />
                )}
              </span>
              <span className="fcm-choice-title">Facture A4</span>
              <span className="fcm-choice-sub">Format classique</span>
              <span className="fcm-choice-action">
                {isDownload ? (
                  <><Download size={13} /> Télécharger</>
                ) : (
                  <><Printer size={13} /> Imprimer</>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormatChoiceModal;