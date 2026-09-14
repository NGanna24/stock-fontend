// services/retourClient/retourClientPDFService.js
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import RetourClientPDF from '../../components/RetourClient/RetourClientPDF';  // ✅ Ce composant existe maintenant

class RetourClientPDFService {

    /**
     * ✅ Créer l'élément React SANS JSX
     * Utilise React.createElement au lieu de <RetourClientPDF />
     */
    static createPDFElement(retourData) {
        return React.createElement(RetourClientPDF, { data: retourData });
    }

    /**
     * Télécharger le PDF
     */
    static async downloadPDF(retourData) {
        try {
            const element = this.createPDFElement(retourData);
            const blob = await pdf(element).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Bon_Retour_Client_${retourData.numero_retour}.pdf`;
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
    static async print(retourData) {
        try {
            const element = this.createPDFElement(retourData);
            const blob = await pdf(element).toBlob();
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (win) {
                win.onload = () => {
                    setTimeout(() => win.print(), 500);
                };
            } else {
                throw new Error('Impossible d\'ouvrir la fenêtre d\'impression');
            }
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            return { success: true };
        } catch (error) {
            console.error('❌ Print error:', error);
            throw new Error('Erreur lors de l\'impression');
        }
    }

    /**
     * Envoyer par email (ouverture du client email)
     */
    static async sendByEmail(retourData, emailData) {
        try {
            const element = this.createPDFElement(retourData);
            const blob = await pdf(element).toBlob();
            const url = URL.createObjectURL(blob);

            // Télécharger le PDF automatiquement
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `Bon_Retour_Client_${retourData.numero_retour}.pdf`;
            downloadLink.click();

            // Ouvrir le client email par défaut
            const mailtoLink = document.createElement('a');
            const encodedSubject = encodeURIComponent(emailData.subject);
            const encodedBody = encodeURIComponent(
                emailData.message +
                '\n\n📎 Pièce jointe: Bon_Retour_Client_' + retourData.numero_retour + '.pdf\n\n---\nCe message a été généré automatiquement.'
            );
            mailtoLink.href = `mailto:${emailData.to}?subject=${encodedSubject}&body=${encodedBody}`;
            mailtoLink.click();

            setTimeout(() => URL.revokeObjectURL(url), 5000);
            return { success: true, message: 'Client email ouvert' };
        } catch (error) {
            console.error('❌ Email error:', error);
            throw new Error('Erreur lors de l\'envoi de l\'email');
        }
    }
}

export default RetourClientPDFService;