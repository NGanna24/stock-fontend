// pages/Recettes/Recettes.jsx
//
// Recettes : l'argent reçu des clients sur une période.
//   - encaissements (paiements de factures) et remboursements (retours clients remboursés),
//     net = encaissé − remboursé ;
//   - répartition par mode de paiement (cliquable pour filtrer), évolution jour par jour,
//     meilleurs clients ;
//   - « Encaisser une facture » : choisir une facture qui reste à payer, le montant ne peut
//     pas dépasser le reste, la facture passe automatiquement en partielle / payée ;
//   - suppression d'un encaissement (erreur de saisie) : admin et manager ; la facture est
//     remise au bon statut. Les remboursements se gèrent depuis les retours clients.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Download, RefreshCw, X, AlertTriangle, Loader, Trash2, Banknote, CreditCard, Building2,
  FileText, Wallet, ChevronLeft, ChevronRight, Info, CheckCircle, Undo2, Search,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import RecetteService from '../../services/recetteService';
import { useUser } from '../../context/AuthContext';
import '../Ventes/Ventes.css';
import './Recettes.css';

// ============================================================
// HELPERS
// ============================================================
const NBSP = ' ';
const grouper = (n) => Math.round(Math.abs(Number(n) || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
const fm = (v) => `${Number(v) < 0 ? '−' : ''}${grouper(v)}${NBSP}FCFA`;
const court = (v) => {
  const n = Math.abs(Number(v) || 0);
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',')}${NBSP}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}${NBSP}k`;
  return String(Math.round(n));
};
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const aujourdhui = () => iso(new Date());
const dateFR = (s) => { if (!s) return '-'; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const toNum = (v) => (v === '' || v == null ? NaN : parseFloat(String(v).replace(/\s/g, '').replace(',', '.')));
const DECIMAL_RE = /^\d*[.,]?\d*$/;
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const MODES = [
  { value: 'especes', label: 'Espèces', Icon: Banknote, c: '#16a34a' },
  { value: 'carte', label: 'Carte', Icon: CreditCard, c: '#2563eb' },
  { value: 'virement', label: 'Virement', Icon: Building2, c: '#7c3aed' },
  { value: 'cheque', label: 'Chèque', Icon: FileText, c: '#d97706' },
  { value: 'autre', label: 'Autre / Mobile money', court: 'Autre', Icon: Wallet, c: '#64748b' },
];
const modeInfo = (v) => MODES.find((m) => m.value === v) || MODES[4];

const PERIODES = [
  { id: 'jour', label: "Aujourd'hui" },
  { id: 'semaine', label: 'Cette semaine' },
  { id: 'mois', label: 'Ce mois' },
  { id: 'mois_dernier', label: 'Mois dernier' },
  { id: 'annee', label: 'Cette année' },
  { id: 'perso', label: 'Personnalisée' },
];
const bornes = (id, perso) => {
  const n = new Date();
  const y = n.getFullYear();
  const m = n.getMonth();
  switch (id) {
    case 'jour': return { debut: aujourdhui(), fin: aujourdhui() };
    case 'semaine': { const d = new Date(n); d.setDate(n.getDate() - ((n.getDay() + 6) % 7)); return { debut: iso(d), fin: aujourdhui() }; }
    case 'mois_dernier': return { debut: iso(new Date(y, m - 1, 1)), fin: iso(new Date(y, m, 0)) };
    case 'annee': return { debut: `${y}-01-01`, fin: aujourdhui() };
    case 'perso': return { debut: perso.debut, fin: perso.fin };
    case 'mois':
    default: return { debut: iso(new Date(y, m, 1)), fin: aujourdhui() };
  }
};

const ModeTag = ({ mode }) => {
  const { Icon, label, court: c } = modeInfo(mode);
  return <span className="rc-mode" style={{ '--c': modeInfo(mode).c }}><Icon size={13} /> {c || label}</span>;
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

const ModalHead = ({ id, title, sub, onClose, disabled }) => (
  <div className="vt-modal-head">
    <div className="vt-modal-titles">
      <h2 id={id} className="vt-modal-title">{title}</h2>
      {sub && <p className="vt-modal-sub">{sub}</p>}
    </div>
    <button type="button" className="vt-iconbtn" onClick={() => !disabled && onClose()} aria-label="Fermer"><X size={18} /></button>
  </div>
);

// ============================================================
// MODAL : ENCAISSER UNE FACTURE
// ============================================================
function ModalEncaisser({ token, onClose, onEncaisse }) {
  const [factures, setFactures] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [choisie, setChoisie] = useState(null);
  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState('especes');
  const [date, setDate] = useState(aujourdhui());
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    RecetteService.getFacturesImpayees(token)
      .then((r) => setFactures(r.data || []))
      .catch((e) => { setFactures([]); setErreur(e.message || 'Impossible de charger les factures à encaisser'); });
  }, [token]);

  const liste = useMemo(() => {
    const q = norm(recherche.trim());
    const chiffres = recherche.replace(/\D/g, '');
    return (factures || []).filter((f) => !q
      || norm(`${f.numero_facture} ${f.numero_commande || ''} ${f.nomclient || ''}`).includes(q)
      || (chiffres.length >= 3 && String(f.telephone || '').replace(/\D/g, '').includes(chiffres)));
  }, [factures, recherche]);

  const valeur = montant === '' ? choisie?.montant_restant || 0 : toNum(montant);
  const depasse = !!choisie && valeur > choisie.montant_restant + 0.009;

  const choisir = (f) => { setChoisie(f); setMontant(''); setErreur(null); };

  const enregistrer = async () => {
    if (!choisie || saving) return;
    if (!(valeur > 0)) { setErreur('Saisissez un montant supérieur à 0.'); return; }
    if (depasse) { setErreur(`Le montant dépasse le reste à payer (${fm(choisie.montant_restant)}).`); return; }
    setSaving(true);
    setErreur(null);
    try {
      await RecetteService.createRecette(token, {
        id_facture: choisie.id_facture, montant: valeur, mode_paiement: mode,
        date_paiement: date, reference: reference.trim() || null, note: note.trim() || null,
      });
      onEncaisse(`${fm(valeur)} encaissés sur ${choisie.numero_facture}`
        + (valeur >= choisie.montant_restant - 0.009 ? ' : facture soldée' : ''));
    } catch (e) {
      setErreur(e.message || "L'encaissement n'a pas pu être enregistré");
      setSaving(false);
    }
  };

  return (
    <Modal size="lg" labelledBy="rc-enc-title" onClose={onClose} dismissable={!saving} busy={saving || factures === null}>
      <ModalHead id="rc-enc-title" title="Encaisser une facture"
                 sub={choisie ? `${choisie.numero_facture} · ${choisie.nomclient || 'Client'}` : 'Choisissez la facture que le client règle'}
                 onClose={onClose} disabled={saving} />
      <div className="vt-modal-body rc-enc">
        {erreur && <div className="vt-error" role="alert"><AlertTriangle size={16} /><span>{erreur}</span></div>}

        {!choisie ? (
          <>
            <div className="vt-search rc-enc-search">
              <Search size={16} className="vt-search-icon" />
              <input type="text" className="vt-input vt-search-input" placeholder="Client, téléphone, n° de facture ou de vente"
                     value={recherche} onChange={(e) => setRecherche(e.target.value)} autoFocus aria-label="Rechercher une facture" />
            </div>
            {factures === null ? (
              <p className="vt-muted rc-enc-vide"><Loader size={15} className="vt-spin" /> Chargement des factures…</p>
            ) : liste.length === 0 ? (
              <p className="vt-muted rc-enc-vide">
                {factures.length === 0 ? <><CheckCircle size={15} /> Toutes les factures sont payées.</> : 'Aucune facture ne correspond.'}
              </p>
            ) : (
              <ul className="rc-enc-liste" role="listbox" aria-label="Factures à encaisser">
                {liste.slice(0, 100).map((f) => {
                  const retard = f.date_echeance && f.date_echeance < aujourdhui();
                  return (
                    <li key={f.id_facture}>
                      <button type="button" className="rc-enc-item" onClick={() => choisir(f)}>
                        <span className="rc-enc-main">
                          <strong>{f.nomclient || 'Client sans nom'}</strong>
                          <span className="vt-cell-sub">
                            {f.numero_facture}{f.numero_commande ? ` · ${f.numero_commande}` : ''}{f.telephone ? ` · ${f.telephone}` : ''}
                          </span>
                        </span>
                        <span className="rc-enc-right">
                          <strong className="vt-num">{fm(f.montant_restant)}</strong>
                          <span className={`vt-cell-sub ${retard ? 'rc-retard' : ''}`}>
                            {f.montant_paye > 0 ? `payé ${fm(f.montant_paye)} · ` : ''}{retard ? 'échue le ' : 'échéance '}{dateFR(f.date_echeance)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <>
            <dl className="vt-facts rc-facts">
              <div><dt>Total facture</dt><dd className="vt-num">{fm(choisie.montant_total)}</dd></div>
              <div><dt>Déjà payé</dt><dd className="vt-num">{fm(choisie.montant_paye)}</dd></div>
              <div><dt>Reste à payer</dt><dd className="vt-num rc-reste">{fm(choisie.montant_restant)}</dd></div>
              <div><dt>Échéance</dt><dd>{dateFR(choisie.date_echeance)}</dd></div>
            </dl>
            <button type="button" className="vt-link rc-changer" onClick={() => setChoisie(null)} disabled={saving}>Choisir une autre facture</button>

            <div className="vt-field rc-gap">
              <label htmlFor="rc-montant">Montant reçu</label>
              <input id="rc-montant" className="vt-input vt-num" inputMode="decimal" autoFocus
                     placeholder={grouper(choisie.montant_restant)} value={montant}
                     onChange={(e) => DECIMAL_RE.test(e.target.value) && setMontant(e.target.value)} />
              <p className={`vt-hint ${depasse ? 'rc-warn' : ''}`}>
                {depasse ? `Maximum : ${fm(choisie.montant_restant)}`
                  : valeur > 0 && valeur < choisie.montant_restant - 0.009
                    ? `Paiement partiel : il restera ${fm(choisie.montant_restant - valeur)}`
                    : 'Laissez vide pour encaisser tout le reste.'}
              </p>
            </div>

            <div className="vt-field rc-gap">
              <span className="vt-field-label" id="rc-mode-label">Mode de paiement</span>
              <div className="vt-modes rc-modes" role="radiogroup" aria-labelledby="rc-mode-label">
                {MODES.map(({ value, label, court: c, Icon }) => (
                  <button key={value} type="button" role="radio" aria-checked={mode === value}
                          className={`vt-mode ${mode === value ? 'is-active' : ''}`} onClick={() => setMode(value)} disabled={saving}>
                    <Icon size={18} /><span>{c || label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="vt-grid-2 rc-gap">
              <div className="vt-field">
                <label htmlFor="rc-date">Date du paiement</label>
                <input id="rc-date" type="date" className="vt-input" value={date} max={aujourdhui()}
                       onChange={(e) => e.target.value && setDate(e.target.value)} />
              </div>
              <div className="vt-field">
                <label htmlFor="rc-ref">Référence <span className="vt-muted">(facultatif)</span></label>
                <input id="rc-ref" className="vt-input" maxLength={100} value={reference} placeholder="N° de transaction, chèque…"
                       onChange={(e) => setReference(e.target.value)} />
              </div>
            </div>
            <div className="vt-field rc-gap">
              <label htmlFor="rc-note">Note <span className="vt-muted">(facultatif)</span></label>
              <input id="rc-note" className="vt-input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </>
        )}
      </div>
      <div className="vt-modal-foot vt-modal-foot--end">
        <button type="button" className="vt-btn" onClick={onClose} disabled={saving}>Annuler</button>
        {choisie && (
          <button type="button" className="vt-btn vt-btn--cash" onClick={enregistrer} disabled={saving || depasse || !(valeur > 0)}>
            {saving ? <Loader size={16} className="vt-spin" /> : <Wallet size={16} />} Encaisser {valeur > 0 ? fm(valeur) : ''}
          </button>
        )}
      </div>
    </Modal>
  );
}

// ============================================================
// PAGE
// ============================================================
const PAR_PAGE = 25;
const TYPES = [
  { id: 'tous', label: 'Tout' },
  { id: 'encaissement', label: 'Encaissements' },
  { id: 'remboursement', label: 'Remboursements' },
];

export default function Recettes() {
  const { user } = useUser();
  const token = localStorage.getItem('token');
  const peutSupprimer = user?.role === 'admin' || user?.role === 'manager';

  const [periode, setPeriode] = useState('mois');
  const [perso, setPerso] = useState({ debut: aujourdhui(), fin: aujourdhui() });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('');
  const [type, setType] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);
  const [encaisser, setEncaisser] = useState(false);
  const [aSupprimer, setASupprimer] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const reqId = useRef(0);

  const showToast = useCallback((message, t = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type: t });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const { debut, fin } = bornes(periode, perso);

  const charger = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await RecetteService.getAllRecettes(token, { dateDebut: debut, dateFin: fin });
      if (id === reqId.current) setData(res.data);
    } catch (e) {
      if (id === reqId.current) setError(e.message || 'Impossible de charger les recettes');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [token, debut, fin]);

  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { setPage(1); }, [mode, type, recherche, debut, fin]);

  const recettes = useMemo(() => data?.recettes || [], [data]);
  const stats = data?.stats || { total_encaisse: 0, total_rembourse: 0, net: 0, nombre_encaissements: 0, nombre_remboursements: 0, nombre_factures: 0, moyenne_paiement: 0, nb_ventes_supprimees: 0, par_mode: {} };

  const filtrees = useMemo(() => {
    const q = norm(recherche.trim());
    const chiffres = recherche.replace(/\D/g, '');
    return recettes.filter((r) => {
      if (mode && r.mode_paiement !== mode) return false;
      if (type !== 'tous' && r.type !== type) return false;
      if (!q) return true;
      return norm(`${r.nomclient || ''} ${r.numero_facture || ''} ${r.numero_commande || ''} ${r.reference || ''} ${r.note || ''}`).includes(q)
        || (chiffres.length >= 3 && String(r.telephone || '').replace(/\D/g, '').includes(chiffres));
    });
  }, [recettes, mode, type, recherche]);
  const totalFiltre = filtrees.reduce((s, r) => s + r.montant, 0);
  const filtreActif = !!(mode || type !== 'tous' || recherche.trim());

  const nbPages = Math.max(1, Math.ceil(filtrees.length / PAR_PAGE));
  const pageCourante = Math.min(page, nbPages);
  const visibles = filtrees.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);

  // Courbe : par jour, ou par mois si la période dépasse ~2 mois
  const courbe = useMemo(() => {
    const jours = data?.par_jour || [];
    if (jours.length <= 62) {
      return jours.map((j) => ({ cle: j.date, label: `${j.date.slice(8, 10)}/${j.date.slice(5, 7)}`, net: j.net, encaisse: j.encaisse, rembourse: j.rembourse }));
    }
    const mois = new Map();
    jours.forEach((j) => {
      const k = j.date.slice(0, 7);
      const x = mois.get(k) || { cle: k, label: `${MOIS[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`, net: 0, encaisse: 0, rembourse: 0 };
      x.net += j.net; x.encaisse += j.encaisse; x.rembourse += j.rembourse;
      mois.set(k, x);
    });
    return [...mois.values()];
  }, [data]);
  const meilleurJour = courbe.reduce((b, x) => (x.net > (b?.net || 0) ? x : b), null);

  const exporter = async () => {
    setExporting(true);
    try {
      const res = await RecetteService.exportRecettes(token, { dateDebut: debut, dateFin: fin, modePaiement: mode || undefined });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `recettes_${debut}_${fin}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showToast(e.message || "Erreur lors de l'export", 'error');
    } finally {
      setExporting(false);
    }
  };

  const supprimer = async () => {
    if (!aSupprimer || deleting) return;
    setDeleting(true);
    try {
      await RecetteService.deleteRecette(token, aSupprimer.id_paiement);
      showToast(`Encaissement de ${fm(aSupprimer.montant)} supprimé, facture ${aSupprimer.numero_facture || ''} mise à jour`);
      setASupprimer(null);
      charger();
    } catch (e) {
      showToast(e.message || 'Suppression impossible', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const libellePeriode = periode === 'jour' ? "aujourd'hui" : debut === fin ? `le ${dateFR(debut)}` : `du ${dateFR(debut)} au ${dateFR(fin)}`;

  return (
    <div className="ventes-container vt rc">
      <header className="vt-head">
        <div>
          <h1 className="vt-title">Recettes</h1>
          <p className="vt-sub">L'argent reçu de vos clients, {libellePeriode}</p>
        </div>
        <div className="vt-head-actions">
          <button type="button" className="vt-btn" onClick={exporter} disabled={exporting || recettes.length === 0}>
            {exporting ? <Loader size={16} className="vt-spin" /> : <Download size={16} />} Exporter
          </button>
          <button type="button" className="vt-btn vt-btn--icon" onClick={charger} disabled={loading} aria-label="Rafraîchir" title="Rafraîchir">
            <RefreshCw size={16} className={loading ? 'vt-spin' : ''} />
          </button>
          <button type="button" className="vt-btn vt-btn--primary" onClick={() => setEncaisser(true)}>
            <Plus size={16} /> Encaisser une facture
          </button>
        </div>
      </header>

      {/* ---------- Période ---------- */}
      <div className="vt-toolbar rc-periode">
        <div className="vt-seg" role="group" aria-label="Période">
          {PERIODES.map((p) => (
            <button key={p.id} type="button" aria-pressed={periode === p.id}
                    onClick={() => { if (p.id === 'perso') setPerso({ debut, fin }); setPeriode(p.id); }}>
              {p.label}
            </button>
          ))}
        </div>
        {periode === 'perso' && (
          <div className="rc-dates">
            <input type="date" className="vt-input" value={perso.debut} max={perso.fin || undefined} aria-label="Du"
                   onChange={(e) => e.target.value && setPerso((x) => ({ ...x, debut: e.target.value }))} />
            <span className="vt-muted">au</span>
            <input type="date" className="vt-input" value={perso.fin} min={perso.debut || undefined} aria-label="Au"
                   onChange={(e) => e.target.value && setPerso((x) => ({ ...x, fin: e.target.value }))} />
          </div>
        )}
      </div>

      {/* ---------- Synthèse + modes (cliquables) ---------- */}
      <section className="vt-overview rc-overview" aria-label="Synthèse">
        <div className="vt-ca">
          <span className="vt-label">Net encaissé</span>
          <strong className="vt-ca-value vt-num">{fm(stats.net)}</strong>
          <span className="vt-ca-note">
            {stats.nombre_encaissements} encaissement{stats.nombre_encaissements > 1 ? 's' : ''} · {stats.nombre_factures} facture{stats.nombre_factures > 1 ? 's' : ''}
            {stats.total_rembourse > 0 && <> · <span className="rc-rembourse">remboursé {fm(stats.total_rembourse)}</span></>}
          </span>
        </div>
        <div className="vt-rail" role="group" aria-label="Filtrer par mode de paiement">
          <button type="button" className="vt-stage" data-s="all" aria-pressed={mode === ''} onClick={() => setMode('')}>
            <span className="vt-stage-count vt-num rc-stage-val">{court(stats.total_encaisse)}</span>
            <span className="vt-stage-label">Tous les modes</span>
          </button>
          {MODES.map((m) => (
            <button key={m.value} type="button" className="vt-stage" style={{ '--c': m.c }} aria-pressed={mode === m.value}
                    onClick={() => setMode(mode === m.value ? '' : m.value)} title={fm(stats.par_mode?.[m.value] || 0)}>
              <span className="vt-stage-count vt-num rc-stage-val">{court(stats.par_mode?.[m.value] || 0)}</span>
              <span className="vt-stage-label">{m.court || m.label}</span>
            </button>
          ))}
        </div>
      </section>

      {stats.nb_ventes_supprimees > 0 && (
        <p className="rc-info">
          <Info size={15} />
          <span>
            {stats.nb_ventes_supprimees} encaissement{stats.nb_ventes_supprimees > 1 ? 's' : ''} de la période concerne{stats.nb_ventes_supprimees > 1 ? 'nt' : ''} une
            vente <strong>supprimée</strong> (marqué{stats.nb_ventes_supprimees > 1 ? 's' : ''} ci-dessous). Si l'argent n'a pas réellement été reçu,
            {peutSupprimer ? ' supprimez ces encaissements.' : ' demandez à un responsable de les supprimer.'}
          </span>
        </p>
      )}

      {/* ---------- Évolution + meilleurs clients ---------- */}
      <div className="rc-panels">
        <section className="rc-card rc-chart" aria-label="Évolution des recettes">
          <div className="rc-card-head">
            <h2>Évolution {courbe.length > 0 && courbe[0].cle.length === 7 ? 'par mois' : 'par jour'}</h2>
            {meilleurJour && meilleurJour.net > 0 && (
              <span className="vt-muted">Meilleur : {meilleurJour.label} · {fm(meilleurJour.net)}</span>
            )}
          </div>
          <div className="rc-chart-zone">
            {loading && !data ? <span className="vt-skel rc-chart-skel" /> : stats.total_encaisse === 0 && stats.total_rembourse === 0 ? (
              <p className="vt-muted rc-vide">Aucune recette sur cette période.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courbe} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--miyo-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--miyo-text-tertiary)' }} tickLine={false} axisLine={false}
                         interval="preserveStartEnd" minTickGap={14} />
                  <YAxis tickFormatter={court} tick={{ fontSize: 11, fill: 'var(--miyo-text-tertiary)' }} tickLine={false} axisLine={false} width={44} />
                  <ReferenceLine y={0} stroke="var(--miyo-border-strong)" />
                  <Tooltip cursor={{ fill: 'var(--miyo-primary-soft)' }}
                           formatter={(v, k) => [fm(v), k === 'net' ? 'Net' : k]}
                           labelFormatter={(l) => l}
                           contentStyle={{ borderRadius: 8, border: '1px solid var(--miyo-border)', fontSize: 12.5 }} />
                  <Bar dataKey="net" fill="var(--miyo-primary)" radius={[4, 4, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rc-card rc-top" aria-label="Meilleurs clients">
          <div className="rc-card-head"><h2>Meilleurs clients</h2></div>
          {(data?.top_clients || []).length === 0 ? (
            <p className="vt-muted rc-vide">—</p>
          ) : (
            <ol className="rc-top-liste">
              {data.top_clients.slice(0, 5).map((c, i) => (
                <li key={`${c.telephone}-${c.nomclient}`}>
                  <span className="rc-rang">{i + 1}</span>
                  <span className="rc-top-nom">
                    <strong>{c.nomclient || 'Client'}</strong>
                    <span className="vt-cell-sub">{c.nombre_factures} facture{c.nombre_factures > 1 ? 's' : ''}{c.telephone ? ` · ${c.telephone}` : ''}</span>
                  </span>
                  <strong className="vt-num">{fm(c.total_recettes)}</strong>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* ---------- Liste ---------- */}
      <div className="vt-toolbar rc-toolbar">
        <div className="vt-search rc-search">
          <input type="text" className="vt-input vt-search-input" placeholder="Client, téléphone, n° de facture, référence…"
                 aria-label="Rechercher une recette" value={recherche} onChange={(e) => setRecherche(e.target.value)} spellCheck={false} />
          {recherche && <button type="button" className="vt-search-clear" onClick={() => setRecherche('')} aria-label="Effacer"><X size={14} /></button>}
        </div>
        <div className="vt-seg rc-types" role="group" aria-label="Type">
          {TYPES.map((t) => (
            <button key={t.id} type="button" aria-pressed={type === t.id} onClick={() => setType(t.id)}>{t.label}</button>
          ))}
        </div>
        <span className="vt-count">
          {filtrees.length} ligne{filtrees.length > 1 ? 's' : ''}{filtreActif && filtrees.length > 0 ? ` · ${fm(totalFiltre)}` : ''}
        </span>
      </div>

      {error && !loading && (
        <div className="vt-error" role="alert">
          <AlertTriangle size={16} /><span>{error}</span>
          <button type="button" className="vt-btn vt-btn--sm" onClick={charger}>Réessayer</button>
        </div>
      )}

      <div className="vt-table-wrap rc-wrap" aria-busy={loading || undefined}>
        {loading && data && <div className="vt-busybar" />}
        <table className="vt-table rc-table">
          <thead>
            <tr>
              <th className="rc-col-date">Date</th>
              <th>Client</th>
              <th className="rc-col-hide">Facture · vente</th>
              <th className="rc-col-hide">Mode</th>
              <th className="vt-th-right">Montant</th>
              <th className="vt-th-right rc-col-act"><span className="rc-sr">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && !data
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="vt-skel-row" aria-hidden="true">
                    {[50, 70, 60, 40, 50, 20].map((w, k) => <td key={k}><span className="vt-skel" style={{ width: `${w}%` }} /></td>)}
                  </tr>
                ))
              : visibles.map((r) => (
                  <tr key={r.id_paiement} className={r.type === 'remboursement' ? 'rc-row-remb' : ''}>
                    <td className="vt-num rc-col-date">
                      {dateFR(r.date_paiement)}
                      {r.date_creation_formatee && <div className="vt-cell-sub">saisi à {r.date_creation_formatee.slice(11)}</div>}
                    </td>
                    <td>
                      <div className="vt-cell-main">{r.nomclient || (r.vente_supprimee ? 'Vente supprimée' : 'Client')}</div>
                      <div className="vt-cell-sub">{r.telephone || r.reference || '-'}</div>
                    </td>
                    <td className="rc-col-hide">
                      <div className="vt-cell-main vt-cell-main--plain">{r.numero_facture || '-'}</div>
                      <div className="vt-cell-sub">
                        {r.vente_supprimee ? <span className="rc-tag rc-tag--ko">vente supprimée</span>
                          : r.vente_annulee ? <span className="rc-tag rc-tag--warn">vente annulée</span>
                          : r.numero_commande || '-'}
                      </div>
                    </td>
                    <td className="rc-col-hide"><ModeTag mode={r.mode_paiement} /></td>
                    <td className="vt-td-right">
                      <div className={`vt-num rc-montant ${r.type === 'remboursement' ? 'is-remb' : ''}`}>{fm(r.montant)}</div>
                      <div className="vt-cell-sub">
                        {r.type === 'remboursement' ? <><Undo2 size={11} /> remboursement</> : <span className="rc-mobile-mode">{modeInfo(r.mode_paiement).court || modeInfo(r.mode_paiement).label}</span>}
                      </div>
                    </td>
                    <td className="vt-td-right rc-col-act">
                      {peutSupprimer && r.type === 'encaissement' && (
                        <button type="button" className="vt-iconbtn vt-iconbtn--sm rc-del" onClick={() => setASupprimer(r)}
                                aria-label={`Supprimer l'encaissement de ${fm(r.montant)}`} title="Supprimer (erreur de saisie)">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && visibles.length === 0 && (
          <div className="vt-empty">
            <Banknote size={30} />
            <p className="vt-empty-title">{recettes.length === 0 ? 'Aucune recette sur cette période' : 'Aucune ligne ne correspond'}</p>
            <p className="vt-empty-text">
              {recettes.length === 0 ? 'Les paiements des ventes et des factures apparaissent ici automatiquement.' : 'Modifiez la recherche ou les filtres.'}
            </p>
            {filtreActif && recettes.length > 0 && (
              <button type="button" className="vt-btn vt-btn--sm" onClick={() => { setMode(''); setType('tous'); setRecherche(''); }}>Effacer les filtres</button>
            )}
          </div>
        )}
      </div>

      {filtrees.length > PAR_PAGE && (
        <nav className="vt-pager" aria-label="Pagination">
          <span className="vt-pager-info">{filtrees.length} lignes</span>
          <div className="vt-pager-ctrl">
            <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage(pageCourante - 1)} disabled={pageCourante === 1} aria-label="Page précédente"><ChevronLeft size={18} /></button>
            <span className="vt-pager-page">Page {pageCourante} sur {nbPages}</span>
            <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage(pageCourante + 1)} disabled={pageCourante === nbPages} aria-label="Page suivante"><ChevronRight size={18} /></button>
          </div>
        </nav>
      )}

      {encaisser && (
        <ModalEncaisser token={token} onClose={() => setEncaisser(false)}
                        onEncaisse={(msg) => { setEncaisser(false); showToast(msg); charger(); }} />
      )}

      {aSupprimer && (
        <Modal size="sm" labelledBy="rc-del-title" onClose={() => !deleting && setASupprimer(null)} dismissable={!deleting} busy={deleting}>
          <ModalHead id="rc-del-title" title="Supprimer cet encaissement ?" onClose={() => setASupprimer(null)} disabled={deleting} />
          <div className="vt-modal-body">
            <p className="rc-del-txt">
              <strong>{fm(aSupprimer.montant)}</strong> ({modeInfo(aSupprimer.mode_paiement).label}) du {dateFR(aSupprimer.date_paiement)}
              {aSupprimer.nomclient ? <> — {aSupprimer.nomclient}</> : null}.
            </p>
            <p className="vt-danger-note">
              À faire seulement en cas d'erreur de saisie. {aSupprimer.numero_facture && !aSupprimer.vente_supprimee
                ? `La facture ${aSupprimer.numero_facture} repassera en « non payée » ou « partielle ».` : ''}
              {' '}L'action est enregistrée dans le journal d'activité.
            </p>
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
