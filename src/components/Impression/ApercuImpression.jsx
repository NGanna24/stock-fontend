// components/Impression/ApercuImpression.jsx
// Fenêtre d'aperçu avant impression, commune aux factures A4, tickets et bons de transfert.
//  - Affiche le PDF tel qu'il sortira de l'imprimante (rendu page par page avec pdf.js :
//    ne dépend PAS du lecteur PDF intégré, qui reste blanc dans Electron).
//  - Electron : choix de l'imprimante + impression directe (aucune pop-up, aucun window.open).
//  - Navigateur : bouton Imprimer = boîte d'impression du navigateur sur le PDF affiché.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ExternalLink, Loader, Printer, X } from 'lucide-react';
import FacturePDFService from '../../services/facturePDFService';
import './ApercuImpression.css';

/**
 * @param {string}   titre         ex. « Facture FAC-0012 »
 * @param {string}   sousTitre     texte secondaire (facultatif)
 * @param {() => Promise<Blob>} getBlob  génère le PDF
 * @param {string}   fileName      nom du fichier si téléchargé
 * @param {object}   printOptions  options transmises à l'impression Electron (pageSize, margins…)
 * @param {boolean}  etroit        true pour un ticket (aperçu plus étroit)
 * @param {() => void} onClose
 * @param {(msg: string) => void} onError   (facultatif)
 * @param {(res: object) => void} onPrinted (facultatif)
 */
export default function ApercuImpression({
    titre = 'Aperçu avant impression',
    sousTitre,
    getBlob,
    fileName = 'document.pdf',
    printOptions,
    etroit = false,
    onClose,
    onError,
    onPrinted,
}) {
    const [blob, setBlob] = useState(null);
    const [url, setUrl] = useState(null);
    const [erreur, setErreur] = useState('');
    const [info, setInfo] = useState('');
    const [action, setAction] = useState(null); // 'print' | 'download' | 'open' | null
    const [imprimantes, setImprimantes] = useState([]);
    const [imprimante, setImprimante] = useState(() => FacturePDFService.getSelectedPrinter());
    const pagesRef = useRef(null);
    const [rendu, setRendu] = useState('attente'); // 'attente' | 'ok' | 'echec'
    const electron = FacturePDFService.isElectron();

    // Génération du PDF
    const getBlobRef = useRef(getBlob);
    getBlobRef.current = getBlob;
    useEffect(() => {
        let annule = false;
        let objectUrl = null;
        setBlob(null); setUrl(null); setErreur('');
        (async () => {
            try {
                const b = await getBlobRef.current();
                if (annule) return;
                objectUrl = URL.createObjectURL(b);
                setBlob(b);
                setUrl(objectUrl);
            } catch (e) {
                console.error('Aperçu impression :', e);
                if (!annule) setErreur(e?.message || "Impossible de préparer le document");
            }
        })();
        return () => {
            annule = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, []);

    // Rendu de l'aperçu (pdf.js → canvas)
    useEffect(() => {
        if (!blob || !pagesRef.current) return;
        let annule = false;
        let doc = null;
        const zone = pagesRef.current;
        zone.innerHTML = '';
        setRendu('attente');
        (async () => {
            try {
                const pdfjs = await import('pdfjs-dist');
                pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ''}/pdf.worker.min.js`;
                const data = new Uint8Array(await blob.arrayBuffer());
                doc = await pdfjs.getDocument({ data }).promise;
                const dpr = window.devicePixelRatio || 1;
                for (let i = 1; i <= doc.numPages; i++) {
                    const page = await doc.getPage(i);
                    if (annule) return;
                    const base = page.getViewport({ scale: 1 });
                    const largeur = Math.max(240, zone.clientWidth - 32);
                    const echelle = Math.min(largeur / base.width, 2);
                    const vp = page.getViewport({ scale: echelle * dpr });
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.floor(vp.width);
                    canvas.height = Math.floor(vp.height);
                    canvas.style.width = `${Math.floor(vp.width / dpr)}px`;
                    canvas.style.height = `${Math.floor(vp.height / dpr)}px`;
                    canvas.className = 'apimp-page';
                    zone.appendChild(canvas);
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
                }
                if (!annule) setRendu('ok');
            } catch (e) {
                console.error('Aperçu pdf.js :', e);
                if (!annule) setRendu('echec');
            }
        })();
        return () => {
            annule = true;
            try { doc?.destroy(); } catch { /* déjà détruit */ }
        };
    }, [blob]);

    // Imprimantes (Electron)
    useEffect(() => {
        if (!electron) return;
        let annule = false;
        FacturePDFService.getPrinters().then((liste) => {
            if (annule) return;
            setImprimantes(liste);
            // l'imprimante mémorisée n'existe plus → imprimante par défaut
            setImprimante((cur) => (cur && !liste.some((p) => p.name === cur) ? '' : cur));
        });
        return () => { annule = true; };
    }, [electron]);

    // Échap pour fermer
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && !action) onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, action]);

    const signaler = useCallback((msg) => {
        setErreur(msg);
        onError?.(msg);
    }, [onError]);

    const changerImprimante = (nom) => {
        setImprimante(nom);
        FacturePDFService.setSelectedPrinter(nom);
    };

    const telecharger = useCallback(() => {
        if (!blob) return;
        FacturePDFService.downloadBlob(blob, fileName);
    }, [blob, fileName]);

    const imprimer = async () => {
        if (!blob || action) return;
        setErreur(''); setInfo(''); setAction('print');
        try {
            if (electron) {
                const res = await FacturePDFService.printBlobElectron(blob, {
                    ...(printOptions || {}),
                    printer: imprimante || undefined,
                });
                if (res.fallback) {
                    setInfo("Le PDF a été ouvert dans votre lecteur : lancez l'impression depuis celui-ci.");
                } else {
                    setInfo(`Envoyé à ${imprimante || "l'imprimante par défaut"}.`);
                }
                onPrinted?.(res);
            } else if (FacturePDFService.isMobile()) {
                telecharger();
                setInfo("Impression non disponible sur mobile : le PDF a été téléchargé.");
            } else {
                await FacturePDFService.printBlobBrowser(blob, fileName);
                onPrinted?.({ success: true });
            }
        } catch (e) {
            console.error('Impression :', e);
            signaler(e?.message || "Erreur lors de l'impression");
        } finally {
            setAction(null);
        }
    };

    const ouvrir = async () => {
        if (!blob || action) return;
        setAction('open'); setErreur('');
        try { await FacturePDFService.openBlobElectron(blob); }
        catch (e) { signaler(e?.message || "Impossible d'ouvrir le PDF"); }
        finally { setAction(null); }
    };

    const pret = !!blob && !erreur;

    return createPortal(
        <div className="apimp-overlay" onClick={() => !action && onClose?.()}>
            <div
                className={`apimp-modal${etroit ? ' apimp-modal--etroit' : ''}`}
                role="dialog" aria-modal="true" aria-label={titre}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="apimp-head">
                    <div className="apimp-head-txt">
                        <h2>{titre}</h2>
                        {sousTitre && <p>{sousTitre}</p>}
                    </div>
                    <button type="button" className="apimp-x" onClick={onClose} disabled={!!action} aria-label="Fermer">
                        <X size={20} />
                    </button>
                </header>

                <div className="apimp-body">
                    <div className="apimp-preview">
                        {(!url || rendu === 'attente') && !erreur && (
                            <div className="apimp-wait"><Loader size={22} className="apimp-spin" /> Préparation de l'aperçu…</div>
                        )}
                        <div ref={pagesRef} className="apimp-pages" hidden={rendu === 'echec'} />
                        {rendu === 'echec' && (
                            <div className="apimp-wait apimp-wait--col">
                                <p>L'aperçu ne peut pas s'afficher ici, mais l'impression reste possible.</p>
                                <p className="apimp-hint">Pour l'activer : <code>npm i pdfjs-dist@3.11.174</code> puis copier <code>node_modules/pdfjs-dist/build/pdf.worker.min.js</code> dans le dossier <code>public</code>.</p>
                            </div>
                        )}
                    </div>

                    <aside className="apimp-side">
                        {electron && (
                            <label className="apimp-field">
                                <span>Imprimante</span>
                                <select
                                    value={imprimante}
                                    onChange={(e) => changerImprimante(e.target.value)}
                                    disabled={!!action}
                                >
                                    <option value="">Imprimante par défaut de Windows</option>
                                    {imprimantes.map((p) => (
                                        <option key={p.name} value={p.name}>
                                            {p.displayName}{p.isDefault ? ' (par défaut)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}

                        {erreur && <div className="apimp-msg apimp-msg--err" role="alert">{erreur}</div>}
                        {info && !erreur && <div className="apimp-msg apimp-msg--ok" role="status">{info}</div>}

                        <div className="apimp-actions">
                            <button type="button" className="apimp-btn apimp-btn--main" onClick={imprimer} disabled={!pret || !!action}>
                                {action === 'print' ? <Loader size={16} className="apimp-spin" /> : <Printer size={16} />}
                                Imprimer
                            </button>
                            <button type="button" className="apimp-btn" onClick={telecharger} disabled={!pret || !!action}>
                                <Download size={16} /> Télécharger le PDF
                            </button>
                            {electron && (
                                <button type="button" className="apimp-btn" onClick={ouvrir} disabled={!pret || !!action}>
                                    <ExternalLink size={16} /> Ouvrir dans le lecteur PDF
                                </button>
                            )}
                            <button type="button" className="apimp-btn apimp-btn--ghost" onClick={onClose} disabled={!!action}>
                                Fermer
                            </button>
                        </div>
                    </aside>
                </div>
            </div>
        </div>,
        document.body
    );
}