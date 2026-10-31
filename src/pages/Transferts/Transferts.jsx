// pages/Transferts/Transferts.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowRightLeft, Plus, Check, X, AlertCircle, CheckCircle,
    RefreshCw, Loader, Store, Warehouse
} from 'lucide-react';
import TransfertService from '../../services/transfertService';
import EntrepotService from '../../services/entrepotService';
import { useUser } from '../../context/AuthContext';
import './Transferts.css';

const STATUTS = [
    { id: '', label: 'Tous' },
    { id: 'en_attente', label: 'En attente' },
    { id: 'valide', label: 'Validés' },
    { id: 'refuse', label: 'Refusés' },
    { id: 'annule', label: 'Annulés' },
];

export default function Transferts() {
    const { user, entrepots } = useUser();
    const token = localStorage.getItem('token');

    const [statut, setStatut] = useState('');
    const [transferts, setTransferts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [showCreate, setShowCreate] = useState(false);

    // Données pour le formulaire
    const [entrepotsDispo, setEntrepotsDispo] = useState([]);
    const [stockEntrepot, setStockEntrepot] = useState([]);
    const [idEntrepotSource, setIdEntrepotSource] = useState('');
    const [magasins, setMagasins] = useState([]);

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3500);
    };

    const loadTransferts = useCallback(async () => {
        if (!user?.id_magasin) return;
        setLoading(true);
        try {
            const r = await TransfertService.getByMagasin(token, user.id_magasin, statut || null);
            setTransferts(r.data || []);
        } catch (e) {
            showToast('error', e.message);
        } finally {
            setLoading(false);
        }
    }, [token, user, statut]);

    useEffect(() => { loadTransferts(); }, [loadTransferts]);

    // Charge les entrepôts + magasins + stock pour le formulaire de création
    useEffect(() => {
        (async () => {
            try {
                const rEntrepots = await EntrepotService.getMesEntrepots(token);
                setEntrepotsDispo(rEntrepots.data || []);
            } catch { /* ignore */ }
        })();
    }, [token]);

    const loadStockSource = async (idEntrepot) => {
        if (!idEntrepot) return setStockEntrepot([]);
        try {
            const r = await EntrepotService.getStock(token, idEntrepot);
            setStockEntrepot(r.data || []);
        } catch { setStockEntrepot([]); }
    };

    const handleValider = async (t) => {
        try {
            await TransfertService.valider(token, t.id_transfert);
            showToast('success', 'Transfert validé');
            loadTransferts();
        } catch (e) { showToast('error', e.message); }
    };

    const handleRefuser = async (t) => {
        const motif = window.prompt('Motif du refus :');
        if (!motif) return;
        try {
            await TransfertService.refuser(token, t.id_transfert, motif);
            showToast('success', 'Transfert refusé');
            loadTransferts();
        } catch (e) { showToast('error', e.message); }
    };

    const handleAnnuler = async (t) => {
        if (!window.confirm(`Annuler le transfert ${t.numero_transfert} ?`)) return;
        try {
            await TransfertService.annuler(token, t.id_transfert);
            showToast('success', 'Transfert annulé');
            loadTransferts();
        } catch (e) { showToast('error', e.message); }
    };

    if (!user) return null;

    return (
        <div className="tr-root">
            {toast && (
                <div className={`tr-toast tr-toast--${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span>{toast.message}</span>
                </div>
            )}

            <header className="tr-head">
                <div className="tr-head-id">
                    <span className="tr-head-mark"><ArrowRightLeft size={22} /></span>
                    <div>
                        <h1>Transferts</h1>
                        <p>Gérez les demandes de transfert entre magasins et entrepôts.</p>
                    </div>
                </div>
                <div className="tr-head-actions">
                    <button className="tr-btn tr-btn--icon" onClick={loadTransferts} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'tr-spin' : ''} />
                    </button>
                    <button className="tr-btn tr-btn--signal" onClick={() => setShowCreate(true)}>
                        <Plus size={16} /> Nouveau transfert
                    </button>
                </div>
            </header>

            <nav className="tr-tabs">
                {STATUTS.map((s) => (
                    <button
                        key={s.id}
                        className={`tr-tab ${statut === s.id ? 'is-active' : ''}`}
                        onClick={() => setStatut(s.id)}
                    >
                        {s.label}
                    </button>
                ))}
            </nav>

            <div className="tr-content">
                {loading && <div className="tr-loading"><Loader className="tr-spin" size={20} /> Chargement…</div>}

                {!loading && transferts.length === 0 && (
                    <p className="tr-hint">Aucun transfert {statut ? `avec le statut "${statut}"` : ''}.</p>
                )}

                {!loading && transferts.length > 0 && (
                    <div className="tr-tablewrap">
                        <table className="tr-table">
                            <thead>
                                <tr>
                                    <th>N°</th>
                                    <th>Produit</th>
                                    <th className="tr-num">Qté</th>
                                    <th>Source</th>
                                    <th>Destination</th>
                                    <th>Statut</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {transferts.map((t) => (
                                    <tr key={t.id_transfert}>
                                        <td><strong>{t.numero_transfert}</strong></td>
                                        <td>{t.produit_nom}</td>
                                        <td className="tr-num">{parseFloat(t.quantite)}</td>
                                        <td>{t.entrepot_nom || '—'}</td>
                                        <td>{t.magasin_nom || '—'}</td>
                                        <td><span className={`tr-tag tr-tag--${t.statut}`}>{t.statut}</span></td>
                                        <td className="tr-num">
                                            {t.statut === 'en_attente' && (
                                                <>
                                                    <button className="tr-ibtn tr-ibtn--ok" title="Valider" onClick={() => handleValider(t)}>
                                                        <Check size={14} />
                                                    </button>
                                                    <button className="tr-ibtn tr-ibtn--danger" title="Refuser" onClick={() => handleRefuser(t)}>
                                                        <X size={14} />
                                                    </button>
                                                    <button className="tr-ibtn" title="Annuler" onClick={() => handleAnnuler(t)}>
                                                        <X size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showCreate && (
                <Modal onClose={() => setShowCreate(false)} title="Nouveau transfert">
                    <form
                        className="tr-form"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            const fd = new FormData(e.target);
                            setLoading(true);
                            try {
                                await TransfertService.create(token, {
                                    id_entrepot: parseInt(fd.get('id_entrepot')),
                                    id_produit: parseInt(fd.get('id_produit')),
                                    quantite: parseFloat(fd.get('quantite')),
                                    id_magasin_destination: parseInt(fd.get('id_magasin_destination')),
                                });
                                setShowCreate(false);
                                showToast('success', 'Transfert créé !');
                                loadTransferts();
                            } catch (err) { showToast('error', err.message); }
                            finally { setLoading(false); }
                        }}
                    >
                        <label className="tr-field">
                            <span>Entrepôt source *</span>
                            <select
                                name="id_entrepot"
                                required
                                className="tr-input"
                                value={idEntrepotSource}
                                onChange={(e) => {
                                    setIdEntrepotSource(e.target.value);
                                    loadStockSource(e.target.value);
                                }}
                            >
                                <option value="">— Choisir —</option>
                                {entrepotsDispo.map((ep) => (
                                    <option key={ep.id_entrepot} value={ep.id_entrepot}>{ep.nom}</option>
                                ))}
                            </select>
                        </label>

                        <label className="tr-field">
                            <span>Produit *</span>
                            <select name="id_produit" required className="tr-input" disabled={!idEntrepotSource}>
                                <option value="">— Choisir un produit —</option>
                                {stockEntrepot.map((s) => (
                                    <option key={s.id_stock_entrepot} value={s.id_produit}>
                                        {s.produit_nom} (dispo : {parseFloat(s.quantite) || 0})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="tr-field">
                            <span>Quantité *</span>
                            <input name="quantite" type="number" min="1" step="1" required className="tr-input" placeholder="10" />
                        </label>

                        <label className="tr-field">
                            <span>Magasin destination *</span>
                            <select name="id_magasin_destination" required className="tr-input">
                                <option value="">— Choisir —</option>
                                {magasins.map((m) => (
                                    <option key={m.id_magasin} value={m.id_magasin}>{m.nom}</option>
                                ))}
                            </select>
                        </label>

                        <div className="tr-form-actions">
                            <button type="button" className="tr-btn" onClick={() => setShowCreate(false)}>Annuler</button>
                            <button type="submit" className="tr-btn tr-btn--signal" disabled={loading}>
                                {loading ? <Loader className="tr-spin" size={15} /> : <ArrowRightLeft size={15} />} Créer
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}

function Modal({ title, onClose, children }) {
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return createPortal(
        <div className="tr-modal-overlay" onMouseDown={onClose}>
            <div className="tr-modal" onMouseDown={(e) => e.stopPropagation()}>
                <header className="tr-modal-head">
                    <h3>{title}</h3>
                    <button className="tr-modal-close" onClick={onClose}><X size={18} /></button>
                </header>
                <div className="tr-modal-body">{children}</div>
            </div>
        </div>,
        document.body
    );
}