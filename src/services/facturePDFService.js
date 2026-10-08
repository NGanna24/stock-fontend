// services/facture/facturePDFService.js
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import FacturePDF from '../components/Facture/FacturePDF';

const PRINTER_STORAGE_KEY = 'printer_facture';

class FacturePDFService {
    // ============================================================
    // UTILITAIRES
    // ============================================================

    /**
     * Génère le blob PDF à partir des données de la facture.
     * ⚠️ Pas de JSX ici : on utilise React.createElement
     */
    static async _generateBlob(factureData) {
        if (!factureData) {
            throw new Error('Aucune donnée de facture fournie');
        }
        const doc = React.createElement(FacturePDF, { data: factureData });
        return await pdf(doc).toBlob();
    }

    /** Appareil mobile : l'impression via iframe y est mal supportée. */
    static _isMobile() {
        if (typeof navigator === 'undefined') return false;
        return /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
    }

    /** Application Electron avec le preload à jour (impression directe disponible). */
    static _hasElectronPrint() {
        return typeof window !== 'undefined' && typeof window.electronAPI?.printPdf === 'function';
    }

    static _hasElectronOpen() {
        return typeof window !== 'undefined' && typeof window.electronAPI?.openPdf === 'function';
    }

    static _fileName(factureData) {
        return `Facture_${factureData?.numero_facture || 'sans-numero'}.pdf`;
    }

    // ============================================================
    // IMPRIMANTES (Electron uniquement)
    // ============================================================

    /** Liste des imprimantes installées. Tableau vide hors Electron. */
    static async getPrinters() {
        if (typeof window === 'undefined' || typeof window.electronAPI?.listPrinters !== 'function') {
            return [];
        }
        try {
            return await window.electronAPI.listPrinters();
        } catch (error) {
            console.error('❌ getPrinters error:', error);
            return [];
        }
    }

    /** Imprimante choisie pour les factures ('' = imprimante par défaut de Windows). */
    static getSelectedPrinter() {
        try {
            return localStorage.getItem(PRINTER_STORAGE_KEY) || '';
        } catch {
            return '';
        }
    }

    static setSelectedPrinter(name) {
        try {
            if (name) localStorage.setItem(PRINTER_STORAGE_KEY, name);
            else localStorage.removeItem(PRINTER_STORAGE_KEY);
        } catch {
            /* stockage indisponible */
        }
    }

    // ============================================================
    // TÉLÉCHARGER
    // ============================================================
    static async downloadPDF(factureData) {
        try {
            const blob = await this._generateBlob(factureData);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = this._fileName(factureData);
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

    // ============================================================
    // IMPRIMER
    // ============================================================

    /**
     * Electron : le PDF est envoyé au process principal qui l'imprime directement
     * (aucune iframe, aucun window.open, aucune boîte de dialogue).
     * Navigateur desktop : iframe cachée + print().
     * Mobile : téléchargement.
     */
    static async print(factureData) {
        try {
            // ─── Electron : impression directe ───
            if (this._hasElectronPrint()) {
                const blob = await this._generateBlob(factureData);
                const buffer = await blob.arrayBuffer();
                const res = await window.electronAPI.printPdf(buffer, {
                    printer: this.getSelectedPrinter() || undefined,
                });

                if (!res?.success) {
                    throw new Error(res?.error || "Échec de l'impression");
                }
                // fallback = le PDF a été ouvert dans le lecteur (hors Windows)
                return { success: true, fallback: !!res.fallback, reason: res.reason };
            }

            // ─── Fallback mobile : télécharger au lieu d'imprimer ───
            if (this._isMobile()) {
                await this.downloadPDF(factureData);
                return { success: true, fallback: true, reason: 'mobile' };
            }

            // ─── Navigateur desktop : iframe cachée ───
            return await this._printViaIframe(factureData);
        } catch (error) {
            console.error('❌ Print error:', error);
            throw new Error(error?.message || "Erreur lors de l'impression");
        }
    }

    /** Impression navigateur (Chrome, Edge, Firefox). Non utilisée dans Electron. */
    static async _printViaIframe(factureData) {
        const blob = await this._generateBlob(factureData);
        const url = URL.createObjectURL(blob);

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

        return await new Promise((resolve) => {
            let resolved = false;
            const safeResolve = (value) => {
                if (resolved) return;
                resolved = true;
                resolve(value);
            };

            const cleanup = () => {
                if (document.body.contains(iframe)) document.body.removeChild(iframe);
                URL.revokeObjectURL(url);
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
                        setTimeout(cleanup, 1000);
                    }
                }, 300);
            };

            // Sécurité : si onload ne se déclenche jamais → téléchargement
            setTimeout(() => {
                if (resolved) return;
                console.warn('⚠️ Print iframe timeout — fallback download');
                cleanup();
                try {
                    const dlUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = dlUrl;
                    link.download = this._fileName(factureData);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(dlUrl), 5000);
                    safeResolve({ success: true, fallback: true, reason: 'timeout' });
                } catch {
                    safeResolve({ success: false, error: 'Timeout' });
                }
            }, 10000);
        });
    }

    // ============================================================
    // EMAIL
    // ============================================================
    static async sendByEmail(factureData, emailData) {
        try {
            const blob = await this._generateBlob(factureData);
            const url = URL.createObjectURL(blob);

            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = this._fileName(factureData);
            downloadLink.click();

            const mailtoLink = document.createElement('a');
            const encodedSubject = encodeURIComponent(emailData.subject);
            const encodedBody = encodeURIComponent(
                emailData.message +
                '\n\n📎 Pièce jointe: ' + this._fileName(factureData) + '\n\n---\nCe message a été généré automatiquement.'
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

    // ============================================================
    // APERÇU
    // ============================================================

    /**
     * Electron : ouvre le PDF dans le lecteur par défaut du système.
     * Navigateur : nouvel onglet.
     */
    static async preview(factureData) {
        try {
            const blob = await this._generateBlob(factureData);

            if (this._hasElectronOpen()) {
                const res = await window.electronAPI.openPdf(await blob.arrayBuffer());
                if (!res?.success) throw new Error(res?.error || "Impossible d'ouvrir le PDF");
                return { success: true };
            }

            const url = URL.createObjectURL(blob);
            const popup = window.open(url, '_blank');
            if (!popup) {
                // Popup bloquée : on télécharge pour ne pas laisser l'utilisateur sans rien
                URL.revokeObjectURL(url);
                await this.downloadPDF(factureData);
                return { success: true, fallback: true, reason: 'popup-blocked' };
            }
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            return { success: true };
        } catch (error) {
            console.error('❌ Preview error:', error);
            throw new Error(error?.message || "Erreur lors de l'aperçu du PDF");
        }
    }
}

export default FacturePDFService;
