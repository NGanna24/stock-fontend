// services/retourPDFService.js
import { pdf } from '@react-pdf/renderer';
import RetourPDF from '../../components/RetourFournisseur/RetourPDF';

// Configuration EmailJS (remplacez par vos clés)
const EMAILJS_CONFIG = {
    serviceId: 'service_votre_id',
    templateId: 'template_votre_id',
    publicKey: 'votre_cle_publique'
};

class RetourPDFService {
    /**
     * Télécharger le PDF
     */
    static async downloadPDF(retourData) {
        try {
            const blob = await pdf(<RetourPDF data={retourData} />).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Bon_Retour_${retourData.numero_retour}.pdf`;
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
            const blob = await pdf(<RetourPDF data={retourData} />).toBlob();
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
     * Envoyer par email via EmailJS
     */
    static async sendByEmail(retourData, emailData) {
        try {
            // Générer le PDF en base64
            const pdfBlob = await pdf(<RetourPDF data={retourData} />).toBlob();
            const reader = new FileReader();
            
            const base64Promise = new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(pdfBlob);
            });

            const base64Data = await base64Promise;
            const base64String = base64Data.split(',')[1];

            // Utilisation d'EmailJS
            const emailjs = await import('@emailjs/browser');
            
            const templateParams = {
                to_email: emailData.to,
                subject: emailData.subject,
                message: emailData.message,
                pdf_base64: base64String,
                pdf_filename: `Bon_Retour_${retourData.numero_retour}.pdf`,
                retour_numero: retourData.numero_retour,
                retour_date: new Date(retourData.date_retour).toLocaleDateString('fr-FR'),
                fournisseur: retourData.fournisseur?.nom || 'Fournisseur',
                montant_total: Math.round(retourData.montant_total || 0).toLocaleString('fr-FR') + ' FCFA',
                motif: retourData.motif_retour || 'Non spécifié'
            };

            const response = await emailjs.send(
                EMAILJS_CONFIG.serviceId,
                EMAILJS_CONFIG.templateId,
                templateParams,
                EMAILJS_CONFIG.publicKey
            );

            if (response.status === 200) {
                return { success: true, message: 'Email envoyé avec succès' };
            } else {
                throw new Error(`Erreur EmailJS: ${response.text}`);
            }
        } catch (error) {
            console.error('❌ Send email error:', error);
            
            // Fallback: méthode alternative avec mailto
            if (!error.message?.includes('EmailJS')) {
                try {
                    return await this.sendByEmailFallback(retourData, emailData);
                } catch (fallbackError) {
                    throw new Error('Erreur lors de l\'envoi de l\'email');
                }
            }
            throw new Error(error.message || 'Erreur lors de l\'envoi de l\'email');
        }
    }

    /**
     * Fallback: Envoyer par email via mailto (ouvre le client email par défaut)
     */
    static async sendByEmailFallback(retourData, emailData) {
        try {
            const blob = await pdf(<RetourPDF data={retourData} />).toBlob();
            const url = URL.createObjectURL(blob);
            
            // Ouvrir le client email par défaut
            const mailtoLink = document.createElement('a');
            mailtoLink.href = `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.message + '\n\nPièce jointe: Bon_Retour_' + retourData.numero_retour + '.pdf')}`;
            mailtoLink.click();
            
            // Télécharger le PDF en parallèle pour l'attacher manuellement
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `Bon_Retour_${retourData.numero_retour}.pdf`;
            downloadLink.click();
            
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            return { success: true, message: 'Client email ouvert' };
        } catch (error) {
            console.error('❌ Fallback email error:', error);
            throw new Error('Erreur lors de l\'ouverture du client email');
        }
    }

    /**
     * Afficher le PDF en aperçu
     */
    static async preview(retourData) {
        try {
            const blob = await pdf(<RetourPDF data={retourData} />).toBlob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            return { success: true };
        } catch (error) {
            console.error('❌ Preview error:', error);
            throw new Error('Erreur lors de l\'aperçu du PDF');
        }
    }
}

export default RetourPDFService;