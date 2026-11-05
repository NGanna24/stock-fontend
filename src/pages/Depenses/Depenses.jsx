// pages/Depenses/Depenses.jsx
//
// Dépenses de fonctionnement : loyer, salaires, électricité, transport…
// (les achats de marchandises passent par les commandes fournisseurs, pas ici).
//
// Droits : admin = tout ; manager = consulter / ajouter / modifier (pas de suppression,
// pas de gestion des catégories). Le backend applique les mêmes règles.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Plus, Download, RefreshCw, X, Check, Loader, Pencil, Trash2, AlertTriangle,
    ChevronLeft, ChevronRight, Wallet, Tags, CalendarClock, Coins, CreditCard,
    Building, FileText, Smartphone, TrendingUp, TrendingDown, Info,
} from 'lucide-react';
import DepenseService from '../../services/depenseService';
import { useUser } from '../../context/AuthContext';
import '../Ventes/Ventes.css';
import './Depenses.css';

// ============================================================
// HELPERS
// ============================================================
const NBSP = ' ';

const formatMontant = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return `0${NBSP}FCFA`;
    const neg = num < 0;
    const s = Math.round(Math.abs(num)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
    return `${neg ? '-' : ''}${s}${NBSP}FCFA`;
};

const pad = (n) => String(n).padStart(2, '0');
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const aujourdhui = () => isoLocal(new Date());

const formatDateFR = (iso) => {
    if (!iso) return '-';
    const [y, m, d] = String(iso).slice(0, 10).split('-');
    return d && m && y ? `${d}/${m}/${y}` : '-';
};

const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const libelleMois = (yyyymm) => {
    const [y, m] = String(yyyymm || '').split('-');
    return m ? `${MOIS_FR[parseInt(m, 10) - 1]} ${y}` : '';
};

const formatPct = (v) => `${(Number(v) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}${NBSP}%`;

const toNum = (v) => {
    if (v === '' || v === null || v === undefined) return NaN;
    return parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
};
const DECIMAL_RE = /^\d*[.,]?\d*$/;
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ============================================================
// PÉRIODES
// ============================================================
const PERIODES = [
    { id: 'mois', label: 'Ce mois' },
    { id: 'mois_dernier', label: 'Mois dernier' },
    { id: 'annee', label: 'Cette année' },
    { id: 'perso', label: 'Personnalisée' },
];

const bornesPeriode = (id, perso) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    switch (id) {
        case 'mois_dernier':
            return { debut: isoLocal(new Date(y, m - 1, 1)), fin: isoLocal(new Date(y, m, 0)) };
        case 'annee':
            return { debut: `${y}-01-01`, fin: `${y}-12-31` };
        case 'perso':
            return { debut: perso.debut, fin: perso.fin };
        case 'mois':
        default:
            return { debut: isoLocal(new Date(y, m, 1)), fin: isoLocal(new Date(y, m + 1, 0)) };
    }
};

// ============================================================
// MODES DE PAIEMENT (valeurs de la colonne existante)
// ============================================================
const MODES = [
    { value: 'especes', label: 'Espèces', Icon: Coins },
    { value: 'autre', label: 'Mobile money', Icon: Smartphone, hint: 'Orange Money, Wave, MTN… (précisez dans la référence)' },
    { value: 'virement', label: 'Virement', Icon: Building },
    { value: 'cheque', label: 'Chèque', Icon: FileText },
    { value: 'carte', label: 'Carte', Icon: CreditCard },
];
const modeLabel = (v) => MODES.find((m) => m.value === v)?.label || v || '-';

// ============================================================
// COULEURS DE CATÉGORIES (stables par id)
// ============================================================
const PALETTE = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#0891b2', '#dc2626', '#ca8a04', '#db2777', '#4f46e5', '#059669', '#64748b'];
const couleurCat = (id) => (id ? PALETTE[(Number(id) - 1) % (PALETTE.length - 1)] : PALETTE[PALETTE.length - 1]);

// ============================================================
// MODAL (même comportement que la page Ventes)
// ============================================================
let lockDepth = 0;
const lockScroll = () => { if (lockDepth++ === 0) document.body.style.overflow = 'hidden'; };
const unlockScroll = () => {
    lockDepth = Math.max(0, lockDepth - 1);
    if (lockDepth === 0) document.body.style.overflow = '';
};

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
            if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
                previous.focus({ preventScroll: true });
            }
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

const ModalHead = ({ id, title, sub, onClose, disabled }) => (
    <div className="vt-modal-head">
        <div className="vt-modal-titles">
            <h2 id={id} className="vt-modal-title">{title}</h2>
            {sub && <p className="vt-modal-sub">{sub}</p>}
        </div>
        <button type="button" className="vt-iconbtn" onClick={() => !disabled && onClose()} aria-label="Fermer">
            <X size={18} />
        </button>
    </div>
);

const CatChip = ({ id, nom }) => (
    <span className="dp-cat" style={{ '--cc': couleurCat(id) }}>
        <i className="dp-cat-dot" />
        {nom || 'Sans catégorie'}
    </span>
);

// ============================================================
// FORMULAIRE : nouvelle dépense / modification
// ============================================================
const DEPENSE_VIDE = {
    montant: '', libelle: '', id_categorie_depense: '', date_depense: '',
    mode_paiement: 'especes', reference: '', note: '',
};

function ModalDepense({ token, depense, categories, onClose, onSaved }) {
    const edition = !!depense?.id_depense;
    const [form, setForm] = useState(() => (edition
        ? {
            montant: String(depense.montant ?? ''),
            libelle: depense.libelle || '',
            id_categorie_depense: depense.id_categorie_depense ? String(depense.id_categorie_depense) : '',
            date_depense: depense.date_depense || aujourdhui(),
            mode_paiement: depense.mode_paiement || 'especes',
            reference: depense.reference || '',
            note: depense.note || '',
        }
        : { ...DEPENSE_VIDE, date_depense: aujourdhui() }));
    const [saving, setSaving] = useState(false);
    const [erreur, setErreur] = useState(null);

    const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErreur(null); };

    // Catégories proposées : actives + celle déjà utilisée (même si désactivée depuis)
    const options = categories.filter((c) => c.actif || String(c.id_categorie_depense) === form.id_categorie_depense);

    const montant = toNum(form.montant);
    const manques = [];
    if (!(montant > 0)) manques.push('le montant');
    if (!form.libelle.trim()) manques.push('le libellé');
    if (!form.date_depense) manques.push('la date');

    const enregistrer = async (e) => {
        e?.preventDefault();
        if (manques.length || saving) return;
        setSaving(true);
        setErreur(null);
        try {
            const payload = {
                ...form,
                montant,
                libelle: form.libelle.trim(),
                id_categorie_depense: form.id_categorie_depense || null,
            };
            const res = edition
                ? await DepenseService.update(token, depense.id_depense, payload)
                : await DepenseService.create(token, payload);
            onSaved(res?.message || (edition ? 'Dépense modifiée' : 'Dépense enregistrée'));
        } catch (err) {
            setErreur(err.message || "Erreur lors de l'enregistrement");
        } finally {
            setSaving(false);
        }
    };

    const modeActif = MODES.find((m) => m.value === form.mode_paiement);

    return (
        <Modal size="md" busy={saving} labelledBy="dp-form-title" dismissable={!saving} onClose={onClose}>
            <ModalHead
                id="dp-form-title"
                title={edition ? 'Modifier la dépense' : 'Nouvelle dépense'}
                sub="Frais de fonctionnement : loyer, salaires, factures, transport…"
                onClose={onClose}
                disabled={saving}
            />
            <form className="vt-modal-body dp-form" onSubmit={enregistrer}>
                {erreur && (
                    <div className="vt-error" role="alert"><AlertTriangle size={16} /><span>{erreur}</span></div>
                )}

                <div className="vt-field">
                    <label htmlFor="dp-montant">Montant (FCFA)</label>
                    <input
                        id="dp-montant"
                        className="vt-input vt-num dp-montant"
                        inputMode="decimal"
                        placeholder="0"
                        value={form.montant}
                        onChange={(e) => DECIMAL_RE.test(e.target.value.replace(/\s/g, '')) && set('montant', e.target.value.replace(/\s/g, ''))}
                        autoFocus
                        autoComplete="off"
                    />
                </div>

                <div className="vt-field">
                    <label htmlFor="dp-libelle">Libellé</label>
                    <input
                        id="dp-libelle"
                        className="vt-input"
                        placeholder="Ex. : Loyer de novembre, Facture CIE, Taxi livraison…"
                        maxLength={200}
                        value={form.libelle}
                        onChange={(e) => set('libelle', e.target.value)}
                        autoComplete="off"
                    />
                </div>

                <div className="vt-grid-2">
                    <div className="vt-field">
                        <label htmlFor="dp-cat">Catégorie</label>
                        <select id="dp-cat" className="vt-input" value={form.id_categorie_depense}
                                onChange={(e) => set('id_categorie_depense', e.target.value)}>
                            <option value="">Sans catégorie</option>
                            {options.map((c) => (
                                <option key={c.id_categorie_depense} value={c.id_categorie_depense}>
                                    {c.nom}{!c.actif ? ' (désactivée)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="vt-field">
                        <label htmlFor="dp-date">Date</label>
                        <input id="dp-date" type="date" className="vt-input" value={form.date_depense}
                               max={aujourdhui()} onChange={(e) => set('date_depense', e.target.value)} />
                    </div>
                </div>

                <div className="vt-field">
                    <span className="vt-field-label" id="dp-mode-label">Mode de paiement</span>
                    <div className="vt-modes dp-modes" role="radiogroup" aria-labelledby="dp-mode-label">
                        {MODES.map(({ value, label, Icon }) => (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={form.mode_paiement === value}
                                className={`vt-mode ${form.mode_paiement === value ? 'is-active' : ''}`}
                                onClick={() => set('mode_paiement', value)}
                            >
                                <Icon size={15} /> {label}
                            </button>
                        ))}
                    </div>
                    {modeActif?.hint && <small className="dp-hint">{modeActif.hint}</small>}
                </div>

                <div className="vt-grid-2">
                    <div className="vt-field">
                        <label htmlFor="dp-ref">Référence <span className="vt-muted">(facultatif)</span></label>
                        <input id="dp-ref" className="vt-input" maxLength={100} placeholder="N° de facture, de reçu, de transaction…"
                               value={form.reference} onChange={(e) => set('reference', e.target.value)} autoComplete="off" />
                    </div>
                    <div className="vt-field">
                        <label htmlFor="dp-note">Note <span className="vt-muted">(facultatif)</span></label>
                        <input id="dp-note" className="vt-input" value={form.note}
                               onChange={(e) => set('note', e.target.value)} autoComplete="off" />
                    </div>
                </div>

                <p className="dp-info">
                    <Info size={14} />
                    <span>
                        Pour un achat de marchandises, utilisez plutôt <strong>Commandes fournisseurs</strong> :
                        il est déjà compté dans le coût des ventes.
                    </span>
                </p>
                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
            <div className="vt-modal-foot">
                <p className="vt-foot-hint" aria-live="polite">
                    {manques.length ? `Il manque ${manques.join(', ')}.` : `${formatMontant(montant)} · ${form.libelle.trim()}`}
                </p>
                <div className="vt-foot-actions">
                    <button type="button" className="vt-btn" onClick={onClose} disabled={saving}>Annuler</button>
                    <button type="button" className="vt-btn vt-btn--primary" onClick={enregistrer} disabled={!!manques.length || saving}>
                        {saving ? <Loader size={16} className="vt-spin" /> : <Check size={16} />}
                        {edition ? 'Enregistrer' : 'Ajouter la dépense'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ============================================================
// REPRISE : recopier les dépenses fixes du mois précédent
// ============================================================
function ModalReprise({ token, moisCible, categories, onClose, onSaved }) {
    const [mois, setMois] = useState(moisCible);
    const [info, setInfo] = useState(null);
    const [lignes, setLignes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [erreur, setErreur] = useState(null);

    useEffect(() => {
        let annule = false;
        setLoading(true);
        setErreur(null);
        (async () => {
            try {
                const res = await DepenseService.reprise(token, mois);
                if (annule) return;
                const d = res.data;
                setInfo(d);
                setLignes(d.depenses.map((x) => {
                    const jour = Math.min(parseInt(String(x.date_depense).slice(8, 10), 10) || 1, d.dernier_jour_cible);
                    return {
                        cle: x.id_depense,
                        coche: false,
                        libelle: x.libelle,
                        montant: String(x.montant),
                        date_depense: `${d.mois_cible}-${pad(jour)}`,
                        id_categorie_depense: x.id_categorie_depense,
                        categorie_nom: x.categorie_nom,
                        mode_paiement: x.mode_paiement,
                        reference: '',
                        note: x.note || '',
                    };
                }));
            } catch (err) {
                if (!annule) { setErreur(err.message); setLignes([]); }
            } finally {
                if (!annule) setLoading(false);
            }
        })();
        return () => { annule = true; };
    }, [token, mois]);

    const maj = (cle, k, v) => setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, [k]: v } : l)));
    const choisies = lignes.filter((l) => l.coche);
    const total = choisies.reduce((s, l) => s + (toNum(l.montant) || 0), 0);
    const invalide = choisies.some((l) => !(toNum(l.montant) > 0) || !l.libelle.trim() || !l.date_depense);
    const tout = lignes.length > 0 && lignes.every((l) => l.coche);

    const valider = async () => {
        if (!choisies.length || invalide || saving) return;
        setSaving(true);
        setErreur(null);
        try {
            const actives = new Set(categories.filter((c) => c.actif).map((c) => c.id_categorie_depense));
            const res = await DepenseService.createLot(token, choisies.map((l) => ({
                libelle: l.libelle.trim(),
                montant: toNum(l.montant),
                date_depense: l.date_depense,
                id_categorie_depense: actives.has(l.id_categorie_depense) ? l.id_categorie_depense : null,
                mode_paiement: l.mode_paiement,
                note: l.note,
            })));
            onSaved(res?.message || `${choisies.length} dépense(s) enregistrée(s)`);
        } catch (err) {
            setErreur(err.message || "Erreur lors de l'enregistrement");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal size="lg" busy={saving} labelledBy="dp-rep-title" dismissable={!saving} onClose={onClose}>
            <ModalHead
                id="dp-rep-title"
                title="Reprendre les dépenses du mois précédent"
                sub="Cochez les dépenses fixes (loyer, salaires…), ajustez les montants, puis validez."
                onClose={onClose}
                disabled={saving}
            />
            <div className="vt-modal-body">
                <div className="dp-rep-head">
                    <label className="vt-field dp-rep-mois">
                        <span className="vt-field-label">Enregistrer sur le mois de</span>
                        <input type="month" className="vt-input" value={mois} onChange={(e) => e.target.value && setMois(e.target.value)} />
                    </label>
                    {info && <span className="vt-muted">Copié depuis {libelleMois(info.mois_source)}</span>}
                </div>

                {erreur && <div className="vt-error" role="alert"><AlertTriangle size={16} /><span>{erreur}</span></div>}

                {loading ? (
                    <div className="dp-state"><Loader size={18} className="vt-spin" /> Chargement…</div>
                ) : lignes.length === 0 ? (
                    <div className="vt-empty">
                        <CalendarClock size={28} />
                        <p className="vt-empty-title">Aucune dépense en {libelleMois(info?.mois_source)}</p>
                        <p className="vt-empty-text">Il n'y a rien à reprendre pour ce mois.</p>
                    </div>
                ) : (
                    <div className="vt-doc-scroll">
                        <table className="vt-doc dp-rep-table">
                            <thead>
                                <tr>
                                    <th className="dp-col-check">
                                        <input type="checkbox" checked={tout} aria-label="Tout cocher"
                                               onChange={() => setLignes((ls) => ls.map((l) => ({ ...l, coche: !tout })))} />
                                    </th>
                                    <th>Libellé</th>
                                    <th>Catégorie</th>
                                    <th>Date</th>
                                    <th className="vt-th-right">Montant</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lignes.map((l) => (
                                    <tr key={l.cle} className={l.coche ? 'is-checked' : ''}>
                                        <td className="dp-col-check">
                                            <input type="checkbox" checked={l.coche} aria-label={`Reprendre ${l.libelle}`}
                                                   onChange={() => maj(l.cle, 'coche', !l.coche)} />
                                        </td>
                                        <td>
                                            <input className="vt-input dp-inline" value={l.libelle} disabled={!l.coche}
                                                   onChange={(e) => maj(l.cle, 'libelle', e.target.value)} maxLength={200} />
                                        </td>
                                        <td><CatChip id={l.id_categorie_depense} nom={l.categorie_nom} /></td>
                                        <td>
                                            <input type="date" className="vt-input dp-inline dp-inline--date" value={l.date_depense}
                                                   disabled={!l.coche} min={`${info.mois_cible}-01`}
                                                   max={`${info.mois_cible}-${pad(info.dernier_jour_cible)}`}
                                                   onChange={(e) => maj(l.cle, 'date_depense', e.target.value)} />
                                        </td>
                                        <td className="vt-td-right">
                                            <input className="vt-input vt-num dp-inline dp-inline--num" inputMode="decimal"
                                                   value={l.montant} disabled={!l.coche}
                                                   onChange={(e) => DECIMAL_RE.test(e.target.value) && maj(l.cle, 'montant', e.target.value)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <div className="vt-modal-foot">
                <p className="vt-foot-hint" aria-live="polite">
                    {choisies.length
                        ? (invalide ? 'Vérifiez les montants et libellés des lignes cochées.'
                            : `${choisies.length} dépense(s) · ${formatMontant(total)} sur ${libelleMois(info?.mois_cible)}`)
                        : 'Cochez au moins une dépense.'}
                </p>
                <div className="vt-foot-actions">
                    <button type="button" className="vt-btn" onClick={onClose} disabled={saving}>Annuler</button>
                    <button type="button" className="vt-btn vt-btn--primary" onClick={valider}
                            disabled={!choisies.length || invalide || saving}>
                        {saving ? <Loader size={16} className="vt-spin" /> : <Check size={16} />}
                        Enregistrer {choisies.length || ''}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ============================================================
// CATÉGORIES (admin)
// ============================================================
function ModalCategories({ token, categories, onClose, onChanged }) {
    const [nouveau, setNouveau] = useState('');
    const [edit, setEdit] = useState(null); // { id, nom }
    const [busy, setBusy] = useState(false);
    const [erreur, setErreur] = useState(null);

    const run = async (fn) => {
        setBusy(true);
        setErreur(null);
        try {
            await fn();
            await onChanged();
            return true;
        } catch (err) {
            setErreur(err.message || 'Erreur');
            return false;
        } finally {
            setBusy(false);
        }
    };

    const ajouter = async (e) => {
        e.preventDefault();
        if (!nouveau.trim()) return;
        if (await run(() => DepenseService.createCategorie(token, { nom: nouveau.trim() }))) setNouveau('');
    };

    const renommer = async () => {
        if (!edit?.nom.trim()) return;
        if (await run(() => DepenseService.updateCategorie(token, edit.id, { nom: edit.nom.trim() }))) setEdit(null);
    };

    return (
        <Modal size="md" busy={busy} labelledBy="dp-cat-title" dismissable={!busy} onClose={onClose}>
            <ModalHead id="dp-cat-title" title="Catégories de dépenses"
                       sub="Une catégorie désactivée n'est plus proposée, mais ses dépenses restent comptées."
                       onClose={onClose} disabled={busy} />
            <div className="vt-modal-body">
                {erreur && <div className="vt-error" role="alert"><AlertTriangle size={16} /><span>{erreur}</span></div>}

                <form className="dp-cat-add" onSubmit={ajouter}>
                    <input className="vt-input" placeholder="Nouvelle catégorie (ex. : Publicité)" maxLength={100}
                           value={nouveau} onChange={(e) => setNouveau(e.target.value)} disabled={busy} />
                    <button type="submit" className="vt-btn vt-btn--primary" disabled={busy || !nouveau.trim()}>
                        <Plus size={16} /> Ajouter
                    </button>
                </form>

                <ul className="dp-cat-list">
                    {categories.map((c) => (
                        <li key={c.id_categorie_depense} className={c.actif ? '' : 'is-off'}>
                            {edit?.id === c.id_categorie_depense ? (
                                <>
                                    <input className="vt-input dp-inline" value={edit.nom} maxLength={100} autoFocus
                                           onChange={(e) => setEdit({ ...edit, nom: e.target.value })}
                                           onKeyDown={(e) => {
                                               if (e.key === 'Enter') { e.preventDefault(); renommer(); }
                                               if (e.key === 'Escape') { e.preventDefault(); setEdit(null); }
                                           }} />
                                    <button type="button" className="vt-iconbtn" onClick={renommer} disabled={busy} aria-label="Valider"><Check size={16} /></button>
                                    <button type="button" className="vt-iconbtn" onClick={() => setEdit(null)} disabled={busy} aria-label="Annuler"><X size={16} /></button>
                                </>
                            ) : (
                                <>
                                    <CatChip id={c.id_categorie_depense} nom={c.nom} />
                                    <span className="vt-muted dp-cat-n">{c.nb_depenses} dépense{c.nb_depenses > 1 ? 's' : ''}</span>
                                    <button type="button" className="vt-iconbtn" title="Renommer" aria-label={`Renommer ${c.nom}`}
                                            onClick={() => setEdit({ id: c.id_categorie_depense, nom: c.nom })} disabled={busy}>
                                        <Pencil size={15} />
                                    </button>
                                    <button type="button" className="vt-btn vt-btn--sm" disabled={busy}
                                            onClick={() => run(() => DepenseService.updateCategorie(token, c.id_categorie_depense, { actif: !c.actif }))}>
                                        {c.actif ? 'Désactiver' : 'Réactiver'}
                                    </button>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="vt-modal-foot vt-modal-foot--end">
                <button type="button" className="vt-btn" onClick={onClose} disabled={busy}>Fermer</button>
            </div>
        </Modal>
    );
}

// ============================================================
// PAGE
// ============================================================
const PAR_PAGE = 15;

export default function Depenses() {
    const { user } = useUser();
    const token = localStorage.getItem('token');
    const role = user?.role;
    const estAdmin = role === 'admin';
    const peutEditer = estAdmin || role === 'manager';

    // Données
    const [depenses, setDepenses] = useState([]);
    const [stats, setStats] = useState(null);
    const [precedente, setPrecedente] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(!!token);
    const [error, setError] = useState(null);

    // Filtres
    const [periode, setPeriode] = useState('mois');
    const [perso, setPerso] = useState(() => bornesPeriode('mois', {}));
    const [filtreCat, setFiltreCat] = useState('');
    const [filtreMode, setFiltreMode] = useState('');
    const [recherche, setRecherche] = useState('');
    const [page, setPage] = useState(1);

    // Modales
    const [formDepense, setFormDepense] = useState(null); // {} = nouvelle, objet = modification
    const [aSupprimer, setASupprimer] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [repriseOuverte, setRepriseOuverte] = useState(false);
    const [catsOuvertes, setCatsOuvertes] = useState(false);

    // Toast
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);
    const showToast = useCallback((message, type = 'success') => {
        clearTimeout(toastTimer.current);
        setToast({ message, type });
        toastTimer.current = setTimeout(() => setToast(null), 4000);
    }, []);
    useEffect(() => () => clearTimeout(toastTimer.current), []);

    const { debut, fin } = bornesPeriode(periode, perso);

    const loadCategories = useCallback(async () => {
        try {
            const res = await DepenseService.categories(token);
            setCategories(res.data || []);
        } catch (err) {
            console.error('Catégories :', err);
        }
    }, [token]);

    const loadDepenses = useCallback(async () => {
        if (!token || !debut || !fin) return;
        setLoading(true);
        setError(null);
        try {
            const res = await DepenseService.list(token, {
                dateDebut: debut, dateFin: fin, id_categorie: filtreCat, mode_paiement: filtreMode,
            });
            setDepenses(res.data?.depenses || []);
            setStats(res.data?.stats || null);
            setPrecedente(res.data?.periode_precedente || null);
        } catch (err) {
            setError(err.message || 'Erreur lors du chargement des dépenses');
        } finally {
            setLoading(false);
        }
    }, [token, debut, fin, filtreCat, filtreMode]);

    useEffect(() => { if (peutEditer) loadCategories(); }, [loadCategories, peutEditer]);
    useEffect(() => { if (peutEditer) loadDepenses(); }, [loadDepenses, peutEditer]);
    useEffect(() => { setPage(1); }, [debut, fin, filtreCat, filtreMode, recherche]);

    // Recherche locale (libellé, référence, note, catégorie)
    const filtrees = useMemo(() => {
        const q = norm(recherche.trim());
        if (!q) return depenses;
        return depenses.filter((d) => norm([d.libelle, d.reference, d.note, d.categorie_nom].join(' ')).includes(q));
    }, [depenses, recherche]);

    const totalAffiche = useMemo(() => filtrees.reduce((s, d) => s + (parseFloat(d.montant) || 0), 0), [filtrees]);
    const nbPages = Math.max(1, Math.ceil(filtrees.length / PAR_PAGE));
    const pageCourante = Math.min(page, nbPages);
    const debutIdx = (pageCourante - 1) * PAR_PAGE;
    const visibles = filtrees.slice(debutIdx, debutIdx + PAR_PAGE);

    // Évolution vs période précédente
    const evolution = useMemo(() => {
        if (!stats || !precedente) return null;
        if (!(precedente.total > 0)) return stats.total > 0 ? { nouveau: true } : null;
        return { pct: ((stats.total - precedente.total) / precedente.total) * 100 };
    }, [stats, precedente]);

    const moisCible = periode === 'mois_dernier' || periode === 'perso' ? String(debut).slice(0, 7) : aujourdhui().slice(0, 7);

    const apresEnregistrement = (message) => {
        setFormDepense(null);
        setRepriseOuverte(false);
        showToast(message);
        loadDepenses();
        loadCategories();
    };

    const supprimer = async () => {
        if (!aSupprimer || deleting) return;
        setDeleting(true);
        try {
            await DepenseService.remove(token, aSupprimer.id_depense);
            setASupprimer(null);
            showToast('Dépense supprimée');
            loadDepenses();
            loadCategories();
        } catch (err) {
            showToast(err.message || 'Erreur lors de la suppression', 'error');
        } finally {
            setDeleting(false);
        }
    };

    const exporter = () => {
        const clean = (v) => String(v ?? '').replace(/"/g, '""');
        let csv = ['Date', 'Libellé', 'Catégorie', 'Mode de paiement', 'Référence', 'Note', 'Montant (FCFA)']
            .map((h) => `"${h}"`).join(';') + '\n';
        filtrees.forEach((d) => {
            csv += [formatDateFR(d.date_depense), d.libelle, d.categorie_nom || 'Sans catégorie',
                modeLabel(d.mode_paiement), d.reference || '', d.note || '', Math.round(d.montant)]
                .map((c) => `"${clean(c)}"`).join(';') + '\n';
        });
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `depenses_${debut}_${fin}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const libellePeriode = periode === 'perso'
        ? `du ${formatDateFR(debut)} au ${formatDateFR(fin)}`
        : periode === 'annee' ? `année ${debut.slice(0, 4)}` : libelleMois(debut.slice(0, 7));

    // Accès refusé (le menu ne l'affiche normalement pas, mais un lien direct reste possible)
    if (!peutEditer) {
        return (
            <div className="ventes-container vt dp">
                <div className="vt-empty">
                    <Wallet size={30} />
                    <p className="vt-empty-title">Accès réservé</p>
                    <p className="vt-empty-text">Les dépenses sont gérées par les administrateurs et les managers.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ventes-container vt dp">
            {/* ---------- En-tête ---------- */}
            <header className="vt-head">
                <div>
                    <h1 className="vt-title">Dépenses</h1>
                    <p className="vt-sub">Frais de fonctionnement · {libellePeriode}</p>
                </div>
                <div className="vt-head-actions">
                    {estAdmin && (
                        <button type="button" className="vt-btn" onClick={() => setCatsOuvertes(true)}>
                            <Tags size={16} /> Catégories
                        </button>
                    )}
                    <button type="button" className="vt-btn" onClick={exporter} disabled={filtrees.length === 0}>
                        <Download size={16} /> Exporter
                    </button>
                    <button type="button" className="vt-btn vt-btn--icon" onClick={loadDepenses} disabled={loading}
                            aria-label="Rafraîchir" title="Rafraîchir">
                        <RefreshCw size={16} className={loading ? 'vt-spin' : ''} />
                    </button>
                    <button type="button" className="vt-btn" onClick={() => setRepriseOuverte(true)}
                            title="Recopier le loyer, les salaires… du mois précédent">
                        <CalendarClock size={16} /> Reprendre le mois dernier
                    </button>
                    <button type="button" className="vt-btn vt-btn--primary" onClick={() => setFormDepense({})}>
                        <Plus size={16} /> Nouvelle dépense
                    </button>
                </div>
            </header>

            {/* ---------- Synthèse ---------- */}
            <section className="vt-overview dp-overview" aria-label="Synthèse des dépenses">
                <div className="vt-ca">
                    <span className="vt-label">Total des dépenses</span>
                    <strong className="vt-ca-value vt-num">{formatMontant(stats?.total || 0)}</strong>
                    <span className="vt-ca-note">
                        {stats?.nombre || 0} dépense{(stats?.nombre || 0) > 1 ? 's' : ''}
                        {evolution && !evolution.nouveau && (
                            <span className={`dp-evo ${evolution.pct > 0 ? 'is-up' : 'is-down'}`}>
                                {evolution.pct > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                {evolution.pct > 0 ? '+' : ''}{evolution.pct.toFixed(0)}{NBSP}% vs période précédente
                            </span>
                        )}
                        {evolution?.nouveau && <span className="dp-evo">Aucune dépense la période précédente</span>}
                    </span>
                </div>

                <div className="dp-repart">
                    {stats?.par_categorie?.length ? (
                        <>
                            <div className="dp-bar" role="img" aria-label="Répartition par catégorie">
                                {stats.par_categorie.map((c) => (
                                    <span key={c.id_categorie_depense ?? 'none'}
                                          style={{ width: `${Math.max(c.part, 0.8)}%`, background: couleurCat(c.id_categorie_depense) }}
                                          title={`${c.categorie_nom} : ${formatMontant(c.total)} (${formatPct(c.part)})`} />
                                ))}
                            </div>
                            <ul className="dp-legend">
                                {stats.par_categorie.slice(0, 6).map((c) => (
                                    <li key={c.id_categorie_depense ?? 'none'}>
                                        <button type="button"
                                                className={`dp-legend-item ${String(filtreCat) === String(c.id_categorie_depense ?? 'aucune') ? 'is-active' : ''}`}
                                                onClick={() => setFiltreCat((f) => (String(f) === String(c.id_categorie_depense ?? 'aucune') ? '' : String(c.id_categorie_depense ?? 'aucune')))}
                                                title="Filtrer sur cette catégorie">
                                            <i style={{ background: couleurCat(c.id_categorie_depense) }} />
                                            <span className="dp-legend-name">{c.categorie_nom}</span>
                                            <span className="vt-num">{formatMontant(c.total)}</span>
                                            <span className="vt-muted vt-num">{formatPct(c.part)}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : (
                        <p className="vt-muted dp-repart-empty">La répartition par catégorie apparaîtra ici.</p>
                    )}
                </div>
            </section>

            {/* ---------- Filtres ---------- */}
            <div className="vt-toolbar dp-toolbar">
                <div className="vt-seg" role="group" aria-label="Période">
                    {PERIODES.map((p) => (
                        <button key={p.id} type="button" aria-pressed={periode === p.id}
                                onClick={() => { if (p.id === 'perso') setPerso({ debut, fin }); setPeriode(p.id); }}>
                            {p.label}
                        </button>
                    ))}
                </div>
                {periode === 'perso' && (
                    <div className="dp-dates">
                        <input type="date" className="vt-input" value={perso.debut} max={perso.fin || undefined}
                               onChange={(e) => e.target.value && setPerso((p) => ({ ...p, debut: e.target.value }))} aria-label="Du" />
                        <span className="vt-muted">au</span>
                        <input type="date" className="vt-input" value={perso.fin} min={perso.debut || undefined}
                               onChange={(e) => e.target.value && setPerso((p) => ({ ...p, fin: e.target.value }))} aria-label="Au" />
                    </div>
                )}
                <select className="vt-input dp-select" value={filtreCat} onChange={(e) => setFiltreCat(e.target.value)} aria-label="Catégorie">
                    <option value="">Toutes les catégories</option>
                    {categories.map((c) => <option key={c.id_categorie_depense} value={c.id_categorie_depense}>{c.nom}</option>)}
                    <option value="aucune">Sans catégorie</option>
                </select>
                <select className="vt-input dp-select" value={filtreMode} onChange={(e) => setFiltreMode(e.target.value)} aria-label="Mode de paiement">
                    <option value="">Tous les modes</option>
                    {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <div className="vt-search dp-search">
                    <input type="text" className="vt-input vt-search-input" placeholder="Libellé, référence, note…"
                           aria-label="Rechercher une dépense" value={recherche} onChange={(e) => setRecherche(e.target.value)} spellCheck={false} />
                    {recherche && (
                        <button type="button" className="vt-search-clear" onClick={() => setRecherche('')} aria-label="Effacer la recherche">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {error && !loading && (
                <div className="vt-error" role="alert">
                    <AlertTriangle size={16} /><span>{error}</span>
                    <button type="button" className="vt-btn vt-btn--sm" onClick={loadDepenses}>Réessayer</button>
                </div>
            )}

            {/* ---------- Tableau ---------- */}
            <div className="vt-table-wrap" aria-busy={loading || undefined}>
                {loading && depenses.length > 0 && <div className="vt-busybar" />}
                <table className="vt-table dp-table">
                    <colgroup>
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '34%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '9%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="dp-col-hide">Date</th>
                            <th>Libellé</th>
                            <th className="dp-col-hide">Catégorie</th>
                            <th className="dp-col-hide">Mode</th>
                            <th className="vt-th-right">Montant</th>
                            <th className="vt-th-right"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody style={{ counterReset: `ligne ${debutIdx}` }}>
                        {loading && depenses.length === 0
                            ? Array.from({ length: 6 }).map((_, i) => (
                                <tr key={`sk-${i}`} className="vt-skel-row" aria-hidden="true">
                                    {[60, 80, 60, 50, 60, 30].map((w, j) => <td key={j}><span className="vt-skel" style={{ width: `${w}%` }} /></td>)}
                                </tr>
                            ))
                            : visibles.map((d) => (
                                <tr key={d.id_depense}>
                                    <td className="vt-num dp-col-hide">{formatDateFR(d.date_depense)}</td>
                                    <td>
                                        <div className="vt-cell-main" title={d.libelle}>{d.libelle}</div>
                                        <div className="dp-mobile-only">
                                            <span className="vt-cell-sub vt-num">{formatDateFR(d.date_depense)}</span>
                                            <CatChip id={d.id_categorie_depense} nom={d.categorie_nom} />
                                        </div>
                                        {(d.reference || d.note) && (
                                            <div className="vt-cell-sub" title={[d.reference, d.note].filter(Boolean).join(' · ')}>
                                                {[d.reference, d.note].filter(Boolean).join(' · ')}
                                            </div>
                                        )}
                                    </td>
                                    <td className="dp-col-hide"><CatChip id={d.id_categorie_depense} nom={d.categorie_nom} /></td>
                                    <td className="vt-muted dp-col-hide">{modeLabel(d.mode_paiement)}</td>
                                    <td className="vt-td-right"><span className="vt-cell-main vt-num">{formatMontant(d.montant)}</span></td>
                                    <td className="vt-td-right">
                                        <div className="vt-actions dp-actions">
                                            <button type="button" className="vt-iconbtn" title="Modifier" aria-label={`Modifier ${d.libelle}`}
                                                    onClick={() => setFormDepense(d)}>
                                                <Pencil size={15} />
                                            </button>
                                            {estAdmin && (
                                                <button type="button" className="vt-iconbtn dp-del" title="Supprimer" aria-label={`Supprimer ${d.libelle}`}
                                                        onClick={() => setASupprimer(d)}>
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                    {!loading && filtrees.length > 0 && (
                        <tfoot>
                            <tr className="dp-total-row">
                                <td className="dp-col-hide" />
                                <td>
                                    Total{filtrees.length !== depenses.length ? ' (recherche)' : ''} · {filtrees.length} dépense{filtrees.length > 1 ? 's' : ''}
                                </td>
                                <td className="dp-col-hide" />
                                <td className="dp-col-hide" />
                                <td className="vt-td-right vt-num"><strong>{formatMontant(totalAffiche)}</strong></td>
                                <td />
                            </tr>
                        </tfoot>
                    )}
                </table>
                {!loading && filtrees.length === 0 && (
                    <div className="vt-empty">
                        <Wallet size={30} />
                        <p className="vt-empty-title">{depenses.length === 0 ? 'Aucune dépense sur cette période' : 'Aucune dépense ne correspond'}</p>
                        <p className="vt-empty-text">
                            {depenses.length === 0
                                ? 'Ajoutez une dépense, ou reprenez celles du mois précédent.'
                                : 'Modifiez la recherche ou les filtres.'}
                        </p>
                        {depenses.length === 0 && (
                            <button type="button" className="vt-btn vt-btn--sm vt-btn--primary" onClick={() => setFormDepense({})}>
                                <Plus size={14} /> Nouvelle dépense
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ---------- Pagination ---------- */}
            {filtrees.length > PAR_PAGE && (
                <nav className="vt-pager" aria-label="Pagination">
                    <span className="vt-pager-info">
                        {debutIdx + 1} à {Math.min(debutIdx + PAR_PAGE, filtrees.length)} sur {filtrees.length}
                    </span>
                    <div className="vt-pager-ctrl">
                        <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage(pageCourante - 1)}
                                disabled={pageCourante === 1} aria-label="Page précédente"><ChevronLeft size={18} /></button>
                        <span className="vt-pager-page">Page {pageCourante} sur {nbPages}</span>
                        <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage(pageCourante + 1)}
                                disabled={pageCourante === nbPages} aria-label="Page suivante"><ChevronRight size={18} /></button>
                    </div>
                </nav>
            )}

            {/* ---------- Modales ---------- */}
            {formDepense && (
                <ModalDepense token={token} depense={formDepense} categories={categories}
                              onClose={() => setFormDepense(null)} onSaved={apresEnregistrement} />
            )}

            {repriseOuverte && (
                <ModalReprise token={token} moisCible={moisCible} categories={categories}
                              onClose={() => setRepriseOuverte(false)} onSaved={apresEnregistrement} />
            )}

            {catsOuvertes && estAdmin && (
                <ModalCategories token={token} categories={categories} onClose={() => setCatsOuvertes(false)}
                                 onChanged={async () => { await loadCategories(); loadDepenses(); }} />
            )}

            {aSupprimer && (
                <Modal size="sm" busy={deleting} labelledBy="dp-del-title" dismissable={!deleting} onClose={() => setASupprimer(null)}>
                    <ModalHead id="dp-del-title" title="Supprimer cette dépense ?" onClose={() => setASupprimer(null)} disabled={deleting} />
                    <div className="vt-modal-body">
                        <div className="vt-danger-note">
                            <AlertTriangle size={20} />
                            <div>
                                <p><strong>{aSupprimer.libelle}</strong> · {formatMontant(aSupprimer.montant)} · {formatDateFR(aSupprimer.date_depense)}</p>
                                <p className="vt-danger-warn">Cette action est irréversible.</p>
                            </div>
                        </div>
                    </div>
                    <div className="vt-modal-foot vt-modal-foot--end">
                        <button type="button" className="vt-btn" onClick={() => setASupprimer(null)} disabled={deleting}>Annuler</button>
                        <button type="button" className="vt-btn vt-btn--danger" onClick={supprimer} disabled={deleting}>
                            {deleting ? <Loader size={16} className="vt-spin" /> : <Trash2 size={16} />}
                            Supprimer
                        </button>
                    </div>
                </Modal>
            )}

            {toast && (
                <div className="vt-toast" data-type={toast.type} role="status" aria-live="polite">
                    <span className="vt-toast-bar" />
                    <span className="vt-toast-msg">{toast.message}</span>
                    <button type="button" className="vt-iconbtn vt-iconbtn--sm" onClick={() => setToast(null)} aria-label="Fermer">
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
