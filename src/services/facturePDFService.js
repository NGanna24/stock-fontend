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
     * Détecte si on est sur un appareil mobile
     * (où l'impression via iframe est mal supportée)
     */
    static _isMobile() {
        if (typeof navigator === 'undefined') return false;
        return /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
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
     * Imprimer le PDF via un iframe caché.
     * ✅ Aucun blocage popup — fonctionne sur tous les navigateurs desktop.
     * ✅ Fallback automatique en téléchargement sur mobile.
     */
    static async print(factureData) {
        try {
            // ─── Fallback mobile : télécharger au lieu d'imprimer ───
            if (this._isMobile()) {
                await this.downloadPDF(factureData);
                return { success: true, fallback: true, reason: 'mobile' };
            }

            const blob = await this._generateBlob(factureData);
            const url = URL.createObjectURL(blob);

            // Créer un iframe caché
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.style.visibility = 'hidden';
            iframe.src = url;

            document.body.appendChild(iframe);

            // Attendre le chargement puis imprimer
            return await new Promise((resolve) => {
                let resolved = false;
                const safeResolve = (value) => {
                    if (resolved) return;
                    resolved = true;
                    resolve(value);
                };

                iframe.onload = () => {
                    setTimeout(() => {
                        try {
                            iframe.contentWindow.focus();
                            iframe.contentWindow.print();
                            safeResolve({ success: true, fallback: false });
                        } catch (e) {
                            console.error('❌ Print iframe error:', e);
                            safeResolve({ success: false, error: e.message });
                        } finally {
                            // Nettoyer après un délai
                            setTimeout(() => {
                                if (document.body.contains(iframe)) {
                                    document.body.removeChild(iframe);
                                }
                                URL.revokeObjectURL(url);
                            }, 1000);
                        }
                    }, 300);
                };

                // Sécurité : timeout si onload ne se déclenche jamais
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        console.warn('⚠️ Print iframe timeout — fallback download');
                        document.body.removeChild(iframe);
                        URL.revokeObjectURL(url);

                        // Fallback silencieux : télécharger
                        try {
                            const dlUrl = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = dlUrl;
                            link.download = `Facture_${factureData.numero_facture}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            setTimeout(() => URL.revokeObjectURL(dlUrl), 5000);
                            safeResolve({ success: true, fallback: true, reason: 'timeout' });
                        } catch (e) {
                            safeResolve({ success: false, error: 'Timeout' });
                        }
                    }
                }, 10000);
            });

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