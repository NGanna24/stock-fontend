// services/facture/facturePDFService.js
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import FacturePDF from '../components/Facture/FacturePDF';

class FacturePDFService {
    /**
     * Génère le blob PDF à partir des données de la facture.
     * Méthode utilitaire privée pour éviter la répétition.
     * ⚠️ Pas de JSX ici : on utilise React.createElement
     */
    static async _generateBlob(factureData) {
        if (!factureData) {
            throw new Error('Aucune donnée de facture fournie');
        }
        const doc = React.createElement(FacturePDF, { data: factureData });
        return await pdf(doc).toBlob();
    }

    /**
     * Télécharger le PDF
     */
    static async downloadPDF(factureData) {
        try {
            const blob = await this._generateBlob(factureData);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Facture_${factureData.numero_facture}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            return { success: true };
        } catch (error) {
            console.error('❌ Download PDF error:', error);
            throw new Error('Erreur lors du téléchargement du PDF');
        }
    }

    /**
     * Imprimer le PDF
     */
    static async print(factureData) {
        try {
            const blob = await this._generateBlob(factureData);
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (win) {
                win.onload = () => {
                    setTimeout(() => win.print(), 500);
                };
            } else {
                throw new Error("Impossible d'ouvrir la fenêtre d'impression");
            }
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            return { success: true };
        } catch (error) {
            console.error('❌ Print error:', error);
            throw new Error("Erreur lors de l'impression");
        }
    }

    /**
     * Envoyer par email (ouverture du client email)
     */
    static async sendByEmail(factureData, emailData) {
        try {
            const blob = await this._generateBlob(factureData);
            const url = URL.createObjectURL(blob);

            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `Facture_${factureData.numero_facture}.pdf`;
            downloadLink.click();

            const mailtoLink = document.createElement('a');
            const encodedSubject = encodeURIComponent(emailData.subject);
            const encodedBody = encodeURIComponent(
                emailData.message +
                '\n\n📎 Pièce jointe: Facture_' + factureData.numero_facture + '.pdf\n\n---\nCe message a été généré automatiquement.'
            );
            mailtoLink.href = `mailto:${emailData.to}?subject=${encodedSubject}&body=${encodedBody}`;
            mailtoLink.click();

            setTimeout(() => URL.revokeObjectURL(url), 5000);
            return { success: true, message: 'Client email ouvert' };
        } catch (error) {
            console.error('❌ Email error:', error);
            throw new Error("Erreur lors de l'envoi de l'email");
        }
    }

    /**
     * Afficher le PDF en aperçu
     */
    static async preview(factureData) {
        try {
            const blob = await this._generateBlob(factureData);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            return { success: true };
        } catch (error) {
            console.error('❌ Preview error:', error);
            throw new Error("Erreur lors de l'aperçu du PDF");
        }
    }
}

export default FacturePDFService;