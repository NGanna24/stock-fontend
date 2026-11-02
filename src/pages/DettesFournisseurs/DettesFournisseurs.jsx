// pages/DettesFournisseurs/DettesFournisseurs.jsx
//
// Ce que l'on doit à chaque fournisseur, calculé sur la marchandise réellement REÇUE :
//   reste à payer = réceptions − retours traités − paiements
// Payer sans choisir de commande = répartition automatique sur les commandes les plus
// anciennes ; le surplus éventuel reste en avance chez le fournisseur.
// Droits : admin et manager (suppression d'un paiement : admin).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshCw, Download, X, Loader, AlertTriangle, HandCoins, Wallet, Eye, Trash2, Info,
  Coins, Smartphone, Building, FileText, CreditCard, MoreHorizontal, CheckCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import DetteFournisseurService from '../../services/detteFournisseurService';
import { useUser } from '../../context/AuthContext';
import '../Ventes/Ventes.css';
import './DettesFournisseurs.css';

// ============================================================
// HELPERS
// ============================================================
const NBSP = ' ';
const fm = (v) => {
  const n = Number(v);
  if (isNaN(n)) return `0${NBSP}FCFA`;
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${n < 0 ? '-' : ''}${s}${NBSP}FCFA`;
};
const pad = (n) => String(n).padStart(2, '0');
const dateFR = (d) => {
  if (!d) return '-';
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const [y, m, j] = s.split('-'); return `${j}/${m}/${y}`; }
  const x = new Date(d);
  return isNaN(x) ? '-' : `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}`;
};
const aujourdhui = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const toNum = (v) => {
  if (v === '' || v === null || v === undefined) return NaN;
  return parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
};
const DECIMAL_RE = /^\d*[.,]?\d*$/;
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const MODES = [
  { value: 'especes', label: 'Espèces', Icon: Coins },
  { value: 'mobile_money', label: 'Mobile money', Icon: Smartphone },
  { value: 'virement', label: 'Virement', Icon: Building },
  { value: 'cheque', label: 'Chèque', Icon: FileText },
  { value: 'carte', label: 'Carte', Icon: CreditCard },
  { value: 'autre', label: 'Autre', Icon: MoreHorizontal },
];
const modeLabel = (v) => MODES.find((m) => m.value === v)?.label || v || '-';

const SoldeTag = ({ f }) => {
  if (f.reste_a_payer > 0.009) return <span className="df-solde" data-s="du">{fm(f.reste_a_payer)}</span>;
  if (f.avance > 0.009) return <span className="df-solde" data-s="avance">Avance {fm(f.avance)}</span>;
  return <span className="df-solde" data-s="solde"><CheckCircle size={13} /> Soldé</span>;
};

// ============================================================
// MODAL (même comportement que la page Ventes)
// ============================================================
let lockDepth = 0;
const lockScroll = () => { if (lockDepth++ === 0) document.body.style.overflow = 'hidden'; };
const unlockScroll = () => { lockDepth = Math.max(0, lockDepth - 1); if (lockDepth === 0) document.body.style.overflow = ''; };

const Modal = ({ onClose, dismissable = true, size = 'md', busy = false, labelledBy, children }) => {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    lockScroll();
    if (ref.current && !ref.current.contains(document.activeElement)) ref.current.focus({ preventScroll: true });
    return () => {
      unlockScroll();
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (!dismissable) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !e.defaultPrevented) onCloseRef.current?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dismissable]);
  return (
    <div className="vt-overlay" onMouseDown={(e) => { if (dismissable && e.target === e.currentTarget) onCloseRef.current?.(); }}>
      <div ref={ref} className={`vt-modal vt-modal--${size}`} role="dialog" aria-modal="true"
           aria-labelledby={labelledBy} aria-busy={busy || undefined} tabIndex={-1}>
        {busy && <div className="vt-busybar" />}
        {children}
      </div>
    </div>
  );
};

const ModalHead = ({ id, title, sub, onClose, disabled, children }) => (
  <div className="vt-modal-head">
    <div className="vt-modal-titles">
      <h2 id={id} className="vt-modal-title">{title}</h2>
      {sub && <p className="vt-modal-sub">{sub}</p>}
    </div>
    {children}
    <button type="button" className="vt-iconbtn" onClick={() => !disabled && onClose()} aria-label="Fermer"><X size={18} /></button>
  </div>
);

// ============================================================
// MODAL : PAYER UN FOURNISSEUR
// ============================================================
function ModalPaiement({ token, fournisseur, commandes, commandeInitiale, onClose, onPaye }) {
  const dues = commandes.filter((c) => c.reste > 0.009);
  const [cible, setCible] = useState(commandeInitiale ? String(commandeInitiale) : 'auto');
  const commande = dues.find((c) => String(c.id_commande_achat) === cible);
  const plafond = commande ? commande.reste : fournisseur.reste_a_payer;
  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState('especes');
  const [date, setDate] = useState(aujourdhui());
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState(null);

  const valeur = montant === '' ? plafond : toNum(montant);
  const depasse = !!commande && valeur > commande.reste + 0.009;
  const avance = !commande && valeur > fournisseur.reste_a_payer + 0.009 ? valeur - fournisseur.reste_a_payer : 0;

  const payer = async () => {
    if (saving) return;
    if (!(valeur > 0)) { setErreur('Saisissez un montant supérieur à 0.'); return; }
    if (depasse) { setErreur(`Ce montant dépasse le reste de la commande (${fm(commande.reste)}).`); return; }
    setSaving(true);
    setErreur(null);
    try {
      const res = await DetteFournisseurService.payer(token, {
        id_fournisseur: fournisseur.id_fournisseur,
        id_commande_achat: commande ? commande.id_commande_achat : null,
        montant: valeur,
        date_paiement: date,
        mode_paiement: mode,
        reference: reference.trim(),
        note: note.trim(),
      });
      onPaye(res?.message || 'Paiement enregistré');
    } catch (e) {
      setErreur(e.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal size="md" busy={saving} labelledBy="df-pay-title" dismissable={!saving} onClose={onClose}>
      <ModalHead id="df-pay-title" title={`Payer ${fournisseur.nom}`} sub="Paiement hors caisse (n'affecte pas le tiroir)"
                 onClose={onClose} disabled={saving} />
      <div className="vt-modal-body">
        {erreur && <div className="vt-error" role="alert"><AlertTriangle size={16} /><span>{erreur}</span></div>}

        <div className="vt-due">
          <span className="vt-due-client"><HandCoins size={15} /> {fournisseur.nom}</span>
          <span className="vt-due-label">{commande ? `Reste sur ${commande.numero_commande}` : 'Reste à payer'}</span>
          <strong className="vt-due-amount vt-num">{fm(plafond)}</strong>
          <dl className="vt-due-detail">
            <div><dt>Marchandise reçue</dt><dd className="vt-num">{fm(commande ? commande.recu : fournisseur.recu)}</dd></div>
            <div><dt>Déjà payé</dt><dd className="vt-num">{fm(commande ? commande.paye : fournisseur.paye)}</dd></div>
          </dl>
        </div>

        <div className="vt-field vt-field--spaced">
          <label htmlFor="df-cible">Payer</label>
          <select id="df-cible" className="vt-input" value={cible} onChange={(e) => setCible(e.target.value)} disabled={saving}>
            <option value="auto">Répartition automatique (commandes les plus anciennes d'abord)</option>
            {dues.map((c) => (
              <option key={c.id_commande_achat} value={c.id_commande_achat}>
                {c.numero_commande} · reste {fm(c.reste)}
              </option>
            ))}
          </select>
        </div>

        <div className="vt-field vt-field--spaced">
          <label htmlFor="df-montant">Montant payé</label>
          <div className="vt-inline">
            <input id="df-montant" className="vt-input vt-num" inputMode="decimal" placeholder={String(Math.round(plafond))}
                   value={montant} onChange={(e) => DECIMAL_RE.test(e.target.value.replace(/\s/g, '')) && setMontant(e.target.value.replace(/\s/g, ''))}
                   autoFocus autoComplete="off" disabled={saving} />
            <button type="button" className="vt-btn" onClick={() => setMontant('')} disabled={saving || !montant}>Tout le solde</button>
          </div>
          <small className="vt-hint">
            {depasse
              ? <span className="df-warn">Dépasse le reste de cette commande : choisissez « Répartition automatique ».</span>
              : avance > 0
                ? <span className="df-warn">{fm(avance)} seront gardés en avance chez ce fournisseur.</span>
                : 'Laissez vide pour payer la totalité du reste.'}
          </small>
        </div>

        <div className="vt-field">
          <span className="vt-field-label" id="df-mode-label">Mode de paiement</span>
          <div className="vt-modes df-modes" role="radiogroup" aria-labelledby="df-mode-label">
            {MODES.map(({ value, label, Icon }) => (
              <button key={value} type="button" role="radio" aria-checked={mode === value}
                      className={`vt-mode ${mode === value ? 'is-active' : ''}`} onClick={() => setMode(value)} disabled={saving}>
                <Icon size={18} /><span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="vt-grid-2 df-grid">
          <div className="vt-field">
            <label htmlFor="df-date">Date</label>
            <input id="df-date" type="date" className="vt-input" value={date} max={aujourdhui()}
                   onChange={(e) => e.target.value && setDate(e.target.value)} disabled={saving} />
          </div>
          <div className="vt-field">
            <label htmlFor="df-ref">Référence <span className="vt-muted">(facultatif)</span></label>
            <input id="df-ref" className="vt-input" maxLength={100} placeholder="N° de transaction, de chèque…"
                   value={reference} onChange={(e) => setReference(e.target.value)} disabled={saving} autoComplete="off" />
          </div>
        </div>
        <div className="vt-field df-note">
          <label htmlFor="df-note">Note <span className="vt-muted">(facultatif)</span></label>
          <input id="df-note" className="vt-input" value={note} onChange={(e) => setNote(e.target.value)} disabled={saving} autoComplete="off" />
        </div>
      </div>
      <div className="vt-modal-foot vt-modal-foot--end">
        <button type="button" className="vt-btn" onClick={onClose} disabled={saving}>Annuler</button>
        <button type="button" className="vt-btn vt-btn--cash vt-btn--lg" onClick={payer} disabled={saving || depasse || !(valeur > 0)}>
          {saving ? <Loader size={16} className="vt-spin" /> : <Wallet size={16} />}
          {saving ? 'Enregistrement' : `Payer ${fm(valeur > 0 ? valeur : 0)}`}
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// PAGE
// ============================================================
const PAR_PAGE = 12;

export default function DettesFournisseurs() {
  const { user } = useUser();
  const token = localStorage.getItem('token');
  const role = user?.role;
  const autorise = role === 'admin' || role === 'manager';
  const estAdmin = role === 'admin';

  const [data, setData] = useState(null); // { fournisseurs, totaux }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('dus'); // 'dus' | 'tous'
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState(null);         // réponse détail
  const [loadingDetail, setLoadingDetail] = useState(null);
  const [paiement, setPaiement] = useState(null);     // { fournisseur, commandes, commande }
  const [aSupprimer, setASupprimer] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = useCallback((message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const charger = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await DetteFournisseurService.liste(token);
      setData(res.data);
    } catch (e) {
      setError(e.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (autorise) charger(); }, [charger, autorise]);
  useEffect(() => { setPage(1); }, [recherche, filtre]);

  const chargerDetail = useCallback(async (id) => {
    const res = await DetteFournisseurService.detail(token, id);
    return res.data;
  }, [token]);

  const ouvrirDetail = async (f) => {
    setLoadingDetail(f.id_fournisseur);
    try {
      setDetail(await chargerDetail(f.id_fournisseur));
    } catch (e) {
      showToast(e.message || 'Impossible de charger le fournisseur', 'error');
    } finally {
      setLoadingDetail(null);
    }
  };

  const ouvrirPaiement = async (f, commande = null) => {
    try {
      const d = detail && detail.fournisseur.id_fournisseur === f.id_fournisseur ? detail : await chargerDetail(f.id_fournisseur);
      setPaiement({ fournisseur: d.fournisseur, commandes: d.commandes, commande });
    } catch (e) {
      showToast(e.message || 'Impossible de préparer le paiement', 'error');
    }
  };

  const apresPaiement = async (message) => {
    const id = paiement?.fournisseur.id_fournisseur;
    setPaiement(null);
    showToast(message);
    charger();
    if (detail && id && detail.fournisseur.id_fournisseur === id) {
      try { setDetail(await chargerDetail(id)); } catch { /* le détail sera rechargé à la prochaine ouverture */ }
    }
  };

  const supprimer = async () => {
    if (!aSupprimer || deleting) return;
    setDeleting(true);
    try {
      await DetteFournisseurService.supprimerPaiement(token, aSupprimer.id_paiement_fournisseur);
      showToast('Paiement supprimé');
      setASupprimer(null);
      charger();
      if (detail) setDetail(await chargerDetail(detail.fournisseur.id_fournisseur));
    } catch (e) {
      showToast(e.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filtres = useMemo(() => {
    const q = norm(recherche.trim());
    return (data?.fournisseurs || []).filter((f) => {
      if (filtre === 'dus' && !(f.reste_a_payer > 0.009)) return false;
      return !q || norm([f.nom, f.telephone, f.ville].join(' ')).includes(q);
    });
  }, [data, recherche, filtre]);

  const nbPages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const pageCourante = Math.min(page, nbPages);
  const visibles = filtres.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);
  const totaux = data?.totaux || { total_du: 0, total_avances: 0, nb_fournisseurs_dus: 0, total_recu: 0, total_paye: 0 };

  const exporter = () => {
    const clean = (v) => String(v ?? '').replace(/"/g, '""');
    let csv = ['Fournisseur', 'Téléphone', 'Reçu', 'Retours', 'Payé', 'Reste à payer', 'Avance', 'Commandes dues', 'Dernier paiement']
      .map((h) => `"${h}"`).join(';') + '\n';
    filtres.forEach((f) => {
      csv += [f.nom, f.telephone, Math.round(f.recu), Math.round(f.retours), Math.round(f.paye), Math.round(f.reste_a_payer),
        Math.round(f.avance), f.nb_commandes_dues, f.dernier_paiement ? dateFR(f.dernier_paiement) : '']
        .map((c) => `"${clean(c)}"`).join(';') + '\n';
    });
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dettes_fournisseurs_${aujourdhui()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!autorise) {
    return (
      <div className="ventes-container vt df">
        <div className="vt-empty">
          <HandCoins size={30} />
          <p className="vt-empty-title">Accès réservé</p>
          <p className="vt-empty-text">Les dettes fournisseurs sont gérées par les administrateurs et les managers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ventes-container vt df">
      <header className="vt-head">
        <div>
          <h1 className="vt-title">Dettes fournisseurs</h1>
          <p className="vt-sub">Ce que vous devez, calculé sur la marchandise réellement reçue</p>
        </div>
        <div className="vt-head-actions">
          <button type="button" className="vt-btn" onClick={exporter} disabled={filtres.length === 0}><Download size={16} /> Exporter</button>
          <button type="button" className="vt-btn vt-btn--icon" onClick={charger} disabled={loading} aria-label="Rafraîchir" title="Rafraîchir">
            <RefreshCw size={16} className={loading ? 'vt-spin' : ''} />
          </button>
        </div>
      </header>

      <section className="vt-overview df-overview" aria-label="Synthèse">
        <div className="vt-ca">
          <span className="vt-label">Total à payer</span>
          <strong className="vt-ca-value vt-num">{fm(totaux.total_du)}</strong>
          <span className="vt-ca-note">
            {totaux.nb_fournisseurs_dus} fournisseur{totaux.nb_fournisseurs_dus > 1 ? 's' : ''} à payer
          </span>
        </div>
        <div className="df-kpis">
          <div><span>Marchandise reçue</span><strong className="vt-num">{fm(totaux.total_recu)}</strong></div>
          <div><span>Déjà payé</span><strong className="vt-num">{fm(totaux.total_paye)}</strong></div>
          <div><span>Avances chez les fournisseurs</span><strong className="vt-num">{fm(totaux.total_avances)}</strong></div>
        </div>
      </section>

      <div className="vt-toolbar">
        <div className="vt-search">
          <input type="text" className="vt-input vt-search-input df-search" placeholder="Rechercher un fournisseur"
                 aria-label="Rechercher un fournisseur" value={recherche} onChange={(e) => setRecherche(e.target.value)} spellCheck={false} />
          {recherche && <button type="button" className="vt-search-clear" onClick={() => setRecherche('')} aria-label="Effacer"><X size={14} /></button>}
        </div>
        <span className="vt-count">{filtres.length} fournisseur{filtres.length > 1 ? 's' : ''}</span>
        <div className="vt-seg df-seg" role="group" aria-label="Filtre">
          <button type="button" aria-pressed={filtre === 'dus'} onClick={() => setFiltre('dus')}>À payer</button>
          <button type="button" aria-pressed={filtre === 'tous'} onClick={() => setFiltre('tous')}>Tous</button>
        </div>
      </div>

      {error && !loading && (
        <div className="vt-error" role="alert">
          <AlertTriangle size={16} /><span>{error}</span>
          <button type="button" className="vt-btn vt-btn--sm" onClick={charger}>Réessayer</button>
        </div>
      )}

      <div className="vt-table-wrap df-wrap" aria-busy={loading || undefined}>
        {loading && data && <div className="vt-busybar" />}
        <table className="vt-table df-table">
          <thead>
            <tr>
              <th>Fournisseur</th>
              <th className="vt-th-right df-col-hide">Reçu</th>
              <th className="vt-th-right df-col-hide">Retours</th>
              <th className="vt-th-right df-col-hide">Payé</th>
              <th className="vt-th-right">Reste à payer</th>
              <th className="df-col-hide">Commandes dues</th>
              <th className="df-col-hide">Dernier paiement</th>
              <th className="vt-th-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="vt-skel-row" aria-hidden="true">
                    {[70, 50, 40, 50, 60, 30, 40, 50].map((w, k) => <td key={k}><span className="vt-skel" style={{ width: `${w}%` }} /></td>)}
                  </tr>
                ))
              : visibles.map((f) => (
                  <tr key={f.id_fournisseur}>
                    <td>
                      <button type="button" className="vt-link vt-cell-main" onClick={() => ouvrirDetail(f)}>{f.nom}</button>
                      <div className="vt-cell-sub">{[f.telephone, f.ville].filter(Boolean).join(' · ') || '-'}</div>
                    </td>
                    <td className="vt-td-right vt-num df-col-hide">{fm(f.recu)}</td>
                    <td className="vt-td-right vt-num df-col-hide">{f.retours > 0 ? `−${fm(f.retours)}` : '-'}</td>
                    <td className="vt-td-right vt-num df-col-hide">{fm(f.paye)}</td>
                    <td className="vt-td-right"><SoldeTag f={f} /></td>
                    <td className="df-col-hide">
                      {f.nb_commandes_dues > 0 ? `${f.nb_commandes_dues} commande${f.nb_commandes_dues > 1 ? 's' : ''}` : <span className="vt-muted">-</span>}
                      {f.nb_retours_en_cours > 0 && <div className="vt-cell-sub df-retours-cours">{f.nb_retours_en_cours} retour(s) en cours</div>}
                    </td>
                    <td className="vt-num df-col-hide">{f.dernier_paiement ? dateFR(f.dernier_paiement) : <span className="vt-muted">Jamais</span>}</td>
                    <td className="vt-td-right">
                      <div className="vt-actions">
                        {f.reste_a_payer > 0.009 && (
                          <button type="button" className="vt-btn vt-btn--sm vt-btn--cash" onClick={() => ouvrirPaiement(f)}>
                            <Wallet size={14} /> Payer
                          </button>
                        )}
                        <button type="button" className="vt-btn vt-btn--sm" onClick={() => ouvrirDetail(f)} disabled={loadingDetail === f.id_fournisseur}>
                          {loadingDetail === f.id_fournisseur ? <Loader size={14} className="vt-spin" /> : <Eye size={14} />} Détail
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && visibles.length === 0 && (
          <div className="vt-empty">
            <HandCoins size={30} />
            <p className="vt-empty-title">{filtre === 'dus' && !recherche ? 'Vous ne devez rien à vos fournisseurs' : 'Aucun fournisseur ne correspond'}</p>
            <p className="vt-empty-text">
              {filtre === 'dus' && !recherche
                ? 'Les dettes apparaissent dès qu\'une réception de marchandise est enregistrée.'
                : 'Modifiez la recherche ou affichez « Tous ».'}
            </p>
            {filtre === 'dus' && (data?.fournisseurs?.length || 0) > 0 && (
              <button type="button" className="vt-btn vt-btn--sm" onClick={() => setFiltre('tous')}>Afficher tous les fournisseurs</button>
            )}
          </div>
        )}
      </div>

      {filtres.length > PAR_PAGE && (
        <nav className="vt-pager" aria-label="Pagination">
          <span className="vt-pager-info">{filtres.length} fournisseurs</span>
          <div className="vt-pager-ctrl">
            <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage(pageCourante - 1)} disabled={pageCourante === 1} aria-label="Page précédente"><ChevronLeft size={18} /></button>
            <span className="vt-pager-page">Page {pageCourante} sur {nbPages}</span>
            <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage(pageCourante + 1)} disabled={pageCourante === nbPages} aria-label="Page suivante"><ChevronRight size={18} /></button>
          </div>
        </nav>
      )}

      {/* ---------- Détail d'un fournisseur ---------- */}
      {detail && !paiement && !aSupprimer && (() => {
        const f = detail.fournisseur;
        return (
          <Modal size="lg" labelledBy="df-det-title" onClose={() => setDetail(null)}>
            <ModalHead id="df-det-title" title={f.nom} sub={[f.telephone, f.ville].filter(Boolean).join(' · ') || 'Fournisseur'} onClose={() => setDetail(null)}>
              <div className="vt-head-tags"><SoldeTag f={f} /></div>
            </ModalHead>
            <div className="vt-modal-body">
              <dl className="vt-facts df-facts">
                <div><dt>Reçu</dt><dd className="vt-num">{fm(f.recu)}</dd></div>
                <div><dt>Retours traités</dt><dd className="vt-num">{f.retours > 0 ? `−${fm(f.retours)}` : fm(0)}</dd></div>
                <div><dt>Payé</dt><dd className="vt-num">{fm(f.paye)}</dd></div>
                <div><dt>{f.avance > 0.009 ? 'Avance' : 'Reste à payer'}</dt><dd className="vt-num df-reste">{fm(f.avance > 0.009 ? f.avance : f.reste_a_payer)}</dd></div>
              </dl>

              {(f.avances_non_affectees > 0.009 || f.nb_retours_en_cours > 0 || detail.commandes_sans_reception > 0) && (
                <div className="df-infos">
                  {f.avances_non_affectees > 0.009 && (
                    <p><Info size={14} /> {fm(f.avances_non_affectees)} ont été versés sans être rattachés à une commande (avance) : ils sont déjà déduits du reste à payer.</p>
                  )}
                  {f.nb_retours_en_cours > 0 && (
                    <p><Info size={14} /> {f.nb_retours_en_cours} retour(s) en cours ({fm(f.retours_en_cours)}) : ils seront déduits quand ils passeront à « traité ».</p>
                  )}
                  {detail.commandes_sans_reception > 0 && (
                    <p><Info size={14} /> {detail.commandes_sans_reception} commande(s) pas encore reçue(s) : rien n'est dû tant que la marchandise n'est pas réceptionnée.</p>
                  )}
                </div>
              )}

              <h3 className="vt-section-title">Commandes</h3>
              {detail.commandes.length === 0 ? (
                <p className="vt-muted">Aucune commande reçue pour l'instant.</p>
              ) : (
                <div className="vt-doc-scroll">
                  <table className="vt-doc">
                    <thead>
                      <tr>
                        <th>Commande</th><th>Date</th>
                        <th className="vt-th-right">Reçu</th><th className="vt-th-right">Retours</th>
                        <th className="vt-th-right">Payé</th><th className="vt-th-right">Reste</th><th />
                      </tr>
                    </thead>
                    <tbody>
                      {detail.commandes.map((c) => (
                        <tr key={c.id_commande_achat}>
                          <td><strong>{c.numero_commande}</strong></td>
                          <td className="vt-num">{dateFR(c.date_commande)}</td>
                          <td className="vt-td-right vt-num">{fm(c.recu)}</td>
                          <td className="vt-td-right vt-num">{c.retours > 0 ? `−${fm(c.retours)}` : '-'}</td>
                          <td className="vt-td-right vt-num">{fm(c.paye)}</td>
                          <td className="vt-td-right vt-num">
                            {c.reste > 0.009 ? <strong className="df-du">{fm(c.reste)}</strong> : <span className="df-ok">Payée</span>}
                          </td>
                          <td className="vt-td-right">
                            {c.reste > 0.009 && (
                              <button type="button" className="vt-btn vt-btn--sm vt-btn--cash" onClick={() => ouvrirPaiement(f, c.id_commande_achat)}>Payer</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <section className="vt-det-block">
                <h3 className="vt-section-title">Paiements</h3>
                {detail.paiements.length === 0 ? (
                  <p className="vt-muted">Aucun paiement enregistré.</p>
                ) : (
                  <div className="vt-doc-scroll">
                    <table className="vt-doc">
                      <thead>
                        <tr><th>Date</th><th>Mode</th><th>Référence</th><th>Affecté à</th><th>Par</th><th className="vt-th-right">Montant</th>{estAdmin && <th />}</tr>
                      </thead>
                      <tbody>
                        {detail.paiements.map((p) => (
                          <tr key={p.id_paiement_fournisseur}>
                            <td className="vt-num">{dateFR(p.date_paiement)}</td>
                            <td>{modeLabel(p.mode_paiement)}</td>
                            <td>{p.reference || '-'}</td>
                            <td>{p.numero_commande || <span className="df-avance-tag">Avance</span>}</td>
                            <td>{p.cree_par_nom || '-'}</td>
                            <td className="vt-td-right vt-num">{fm(p.montant)}</td>
                            {estAdmin && (
                              <td className="vt-td-right">
                                <button type="button" className="vt-iconbtn df-del" title="Supprimer ce paiement" aria-label="Supprimer ce paiement"
                                        onClick={() => setASupprimer(p)}>
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
            <div className="vt-modal-foot vt-modal-foot--end">
              <button type="button" className="vt-btn" onClick={() => setDetail(null)}>Fermer</button>
              {f.reste_a_payer > 0.009 && (
                <button type="button" className="vt-btn vt-btn--cash" onClick={() => ouvrirPaiement(f)}>
                  <Wallet size={16} /> Payer {fm(f.reste_a_payer)}
                </button>
              )}
            </div>
          </Modal>
        );
      })()}

      {paiement && (
        <ModalPaiement token={token} fournisseur={paiement.fournisseur} commandes={paiement.commandes}
                       commandeInitiale={paiement.commande} onClose={() => setPaiement(null)} onPaye={apresPaiement} />
      )}

      {aSupprimer && (
        <Modal size="sm" busy={deleting} labelledBy="df-del-title" dismissable={!deleting} onClose={() => setASupprimer(null)}>
          <ModalHead id="df-del-title" title="Supprimer ce paiement ?" onClose={() => setASupprimer(null)} disabled={deleting} />
          <div className="vt-modal-body">
            <div className="vt-danger-note">
              <AlertTriangle size={20} />
              <div>
                <p><strong>{fm(aSupprimer.montant)}</strong> du {dateFR(aSupprimer.date_paiement)} ({modeLabel(aSupprimer.mode_paiement)}{aSupprimer.numero_commande ? `, ${aSupprimer.numero_commande}` : ''})</p>
                <p className="vt-danger-warn">À utiliser pour corriger une erreur de saisie. Le montant redeviendra dû.</p>
              </div>
            </div>
          </div>
          <div className="vt-modal-foot vt-modal-foot--end">
            <button type="button" className="vt-btn" onClick={() => setASupprimer(null)} disabled={deleting}>Annuler</button>
            <button type="button" className="vt-btn vt-btn--danger" onClick={supprimer} disabled={deleting}>
              {deleting ? <Loader size={16} className="vt-spin" /> : <Trash2 size={16} />} Supprimer
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="vt-toast" data-type={toast.type} role="status" aria-live="polite">
          <span className="vt-toast-bar" />
          <span className="vt-toast-msg">{toast.message}</span>
          <button type="button" className="vt-iconbtn vt-iconbtn--sm" onClick={() => setToast(null)} aria-label="Fermer"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}
