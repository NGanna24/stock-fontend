// services/bonCommandePDFService.js
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import BonCommandePDF from '../components/commande/BonCommandePDF';

class BonCommandePDFService {

    // ============================================================
    // GÉNÉRATION DU BLOB (méthode privée)
    // ============================================================
    static async _generateBlob(commandeData) {
        if (!commandeData) {
            throw new Error('Aucune donnée de commande fournie');
        }
        const doc = React.createElement(BonCommandePDF, { data: commandeData });
        return await pdf(doc).toBlob();
    }

    // ============================================================
    // TÉLÉCHARGER LE PDF
    // ============================================================
    static async downloadPDF(commandeData) {
        try {
            const blob = await this._generateBlob(commandeData);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `BonCommande_${commandeData.numero_commande}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            return { success: true };
        } catch (error) {
            console.error('❌ Download BC PDF error:', error);
            throw new Error('Erreur lors du téléchargement du bon de commande');
        }
    }

    // ============================================================
    // IMPRIMER LE PDF
    // ============================================================
    static async print(commandeData) {
        try {
            const blob = await this._generateBlob(commandeData);
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
            console.error('❌ Print BC error:', error);
            throw new Error("Erreur lors de l'impression");
        }
    }

    // ============================================================
    // APERÇU
    // ============================================================
    static async preview(commandeData) {
        try {
            const blob = await this._generateBlob(commandeData);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            return { success: true };
        } catch (error) {
            console.error('❌ Preview BC error:', error);
            throw new Error("Erreur lors de l'aperçu du PDF");
        }
    }

    // ============================================================
    // ✅ ENVOYER VIA WHATSAPP
    // ------------------------------------------------------------
    // Mobile  : Web Share API → WhatsApp avec PDF joint
    // Desktop : télécharge le PDF + ouvre wa.me avec message pré-rempli
    // ============================================================
    static async shareWhatsApp(commandeData, options = {}) {
        try {
            const {
                telephone = commandeData.fournisseur_telephone || '',
                message = '',
            } = options;

            // Nettoyer le numéro (garder uniquement les chiffres)
            const cleanPhone = (telephone || '').replace(/\D/g, '');

            if (!cleanPhone) {
                throw new Error('Numéro de téléphone du fournisseur manquant');
            }

            // Message par défaut si non fourni
            const finalMessage = message || this._buildDefaultMessage(commandeData);

            // Générer le PDF
            const blob = await this._generateBlob(commandeData);
            const fileName = `BonCommande_${commandeData.numero_commande}.pdf`;
            const file = new File([blob], fileName, { type: 'application/pdf' });

            // ✅ Détection mobile (Web Share API avec fichiers)
            const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
            const canShareFiles = navigator.canShare && navigator.canShare({ files: [file] });

            if (isMobile && canShareFiles) {
                // === MOBILE : partage natif avec PDF joint ===
                try {
                    await navigator.share({
                        files: [file],
                        title: `Bon de commande ${commandeData.numero_commande}`,
                        text: finalMessage,
                    });
                    return { success: true, method: 'share' };
                } catch (err) {
                    // L'utilisateur a annulé le partage
                    if (err.name === 'AbortError') {
                        return { success: false, cancelled: true };
                    }
                    // Sinon fallback desktop
                    console.warn('⚠️ Share échoué, fallback wa.me:', err);
                }
            }

            // === DESKTOP (ou fallback) : télécharger + ouvrir wa.me ===
            // 1. Télécharger le PDF
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 5000);

            // 2. Ouvrir WhatsApp Web avec message pré-rempli
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMessage)}`;
            window.open(whatsappUrl, '_blank');

            return {
                success: true,
                method: 'download+wa.me',
                message: 'PDF téléchargé. Glissez-le dans la conversation WhatsApp.'
            };

        } catch (error) {
            console.error('❌ WhatsApp share error:', error);
            throw new Error(error.message || "Erreur lors de l'envoi WhatsApp");
        }
    }

    // ============================================================
    // MESSAGE PAR DÉFAUT
    // ============================================================
    static _buildDefaultMessage(commandeData) {
        const numero = commandeData.numero_commande || 'N/A';
        const date = commandeData.date_commande
            ? new Date(commandeData.date_commande).toLocaleDateString('fr-FR')
            : '-';
        const nomMagasin = commandeData.magasin?.nom_commercial || 'notre magasin';

        return (
            `Bonjour ${commandeData.fournisseur_nom || ''},\n\n` +
            `Veuillez trouver ci-joint notre bon de commande N° ${numero} du ${date}.\n\n` +
            `Merci de nous confirmer sa réception et les délais de livraison.\n\n` +
            `Cordialement,\n${nomMagasin}`
        );
    }
}

export default BonCommandePDFService;