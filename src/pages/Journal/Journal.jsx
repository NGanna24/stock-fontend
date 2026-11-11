// pages/Journal/Journal.jsx
//
// Journal d'activité : « qui a fait quoi, et quand ».
// Chaque action réussie (création, modification, suppression, annulation, encaissement,
// ouverture / clôture de caisse, connexion…) est enregistrée automatiquement par le serveur.
// Lecture seule, réservée à l'administrateur. Conservation : 12 mois.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshCw, Download, X, AlertTriangle, History, ChevronLeft, ChevronRight, Eye, LogIn,
  PlusCircle, Pencil, Trash2, Ban, Wallet, Lock, Unlock, CheckCircle, XCircle, ShieldCheck, Activity, Loader, BellRing,
} from 'lucide-react';
import JournalService from '../../services/journalService';
import { useUser } from '../../context/AuthContext';
import { libelleMode } from '../../config/modesPaiement';
import '../Ventes/Ventes.css';
import './Journal.css';

// ============================================================
// HELPERS
// ============================================================
const pad = (n) => String(n).padStart(2, '0');
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const aujourdhui = () => isoLocal(new Date());
const heure = (d) => { const x = new Date(d); return isNaN(x) ? '-' : `${pad(x.getHours())}:${pad(x.getMinutes())}`; };
const dateHeure = (d) => {
  const x = new Date(d);
  return isNaN(x) ? '-' : `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()} à ${pad(x.getHours())}:${pad(x.getMinutes())}`;
};
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const libelleJour = (d) => {
  const x = new Date(d);
  if (isNaN(x)) return '';
  const jour = isoLocal(x);
  const hier = new Date(); hier.setDate(hier.getDate() - 1);
  const base = `${JOURS[x.getDay()]} ${x.getDate()} ${MOIS[x.getMonth()]}${x.getFullYear() !== new Date().getFullYear() ? ` ${x.getFullYear()}` : ''}`;
  if (jour === aujourdhui()) return `Aujourd'hui · ${base}`;
  if (jour === isoLocal(hier)) return `Hier · ${base}`;
  return base.charAt(0).toUpperCase() + base.slice(1);
};

const ROLES = { admin: 'Administrateur', manager: 'Manager', caissier: 'Caissier', magasinier: 'Magasinier' };
const roleLabel = (r) => ROLES[r] || r || '-';

// Familles d'actions (couleur + icône) ; les 6 premières forment le rail de filtres
const ACTIONS = {
  creation: { label: 'Créations', un: 'Création', Icon: PlusCircle },
  modification: { label: 'Modifications', un: 'Modification', Icon: Pencil },
  suppression: { label: 'Suppressions', un: 'Suppression', Icon: Trash2 },
  annulation: { label: 'Annulations', un: 'Annulation', Icon: Ban },
  paiement: { label: 'Paiements', un: 'Paiement', Icon: Wallet },
  connexion: { label: 'Connexions', un: 'Connexion', Icon: LogIn },
  ouverture: { label: 'Ouvertures', un: 'Ouverture de caisse', Icon: Unlock },
  cloture: { label: 'Clôtures', un: 'Clôture de caisse', Icon: Lock },
  validation: { label: 'Validations', un: 'Validation', Icon: CheckCircle },
  refus: { label: 'Refus', un: 'Refus', Icon: XCircle },
  statut: { label: 'Statuts', un: 'Changement de statut', Icon: Activity },
  securite: { label: 'Sécurité', un: 'Sécurité', Icon: ShieldCheck },
  relance: { label: 'Relances', un: 'Relance client', Icon: BellRing },
  autre: { label: 'Autres', un: 'Autre', Icon: Activity },
};
const RAIL = ['creation', 'modification', 'suppression', 'annulation', 'paiement', 'connexion'];
const actionInfo = (a) => ACTIONS[a] || ACTIONS.autre;

const PERIODES = [
  { id: 'jour', label: "Aujourd'hui" },
  { id: '7j', label: '7 jours' },
  { id: 'mois', label: 'Ce mois' },
  { id: 'perso', label: 'Personnalisée' },
];
const bornesPeriode = (id, perso) => {
  const now = new Date();
  switch (id) {
    case 'jour': return { debut: aujourdhui(), fin: aujourdhui() };
    case '7j': { const d = new Date(); d.setDate(d.getDate() - 6); return { debut: isoLocal(d), fin: aujourdhui() }; }
    case 'perso': return { debut: perso.debut, fin: perso.fin };
    case 'mois':
    default: return { debut: isoLocal(new Date(now.getFullYear(), now.getMonth(), 1)), fin: aujourdhui() };
  }
};

/** Navigateur / appareil lisible à partir du User-Agent */
const appareil = (ua) => {
  if (!ua) return '-';
  if (/Electron|Miyo-Desktop/i.test(ua)) return 'Application Miyo (ordinateur)';
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iPhone / iPad' : /Windows/i.test(ua) ? 'Windows'
    : /Mac OS/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : null;
  const nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : null;
  if (!os && !nav) return ua.length > 60 ? `${ua.slice(0, 57)}…` : ua;
  return [nav, os].filter(Boolean).join(' sur ');
};

// Libellés lisibles pour les champs envoyés (les autres : « mode_paiement » → « Mode paiement »)
const CHAMPS = {
  montant: 'Montant', libelle: 'Libellé', nom: 'Nom', nomclient: 'Client', telephone: 'Téléphone',
  date_depense: 'Date', date_paiement: 'Date', date_commande: 'Date', mode_paiement: 'Mode de paiement',
  fond_initial: 'Fond de caisse', montant_compte: 'Montant compté', note: 'Note', notes: 'Notes',
  quantite: 'Quantité', prix_vente: 'Prix de vente', prix_achat: 'Prix d\'achat', statut: 'Statut',
  motif: 'Motif', reference: 'Référence', description: 'Description', email: 'E-mail', fullname: 'Nom complet',
  lignes: 'Lignes', id_categorie_depense: 'Catégorie', id_fournisseur: 'Fournisseur', id_produit: 'Produit',
};
const nomChamp = (k) => CHAMPS[k] || (k.replace(/_/g, ' ').replace(/^id /, 'N° ').replace(/^./, (c) => c.toUpperCase()));
const MODES_PAIEMENT = new Proxy({}, { get: (_, code) => (typeof code === 'string' ? libelleMode(code) : undefined) });
const CHAMPS_MONTANT = /^(montant|fond_initial|prix|total|remise|solde|montant_compte)/;
const valeurChamp = (v, k = '') => {
  if (v === null || v === undefined || v === '') return '-';
  if (k === 'mode_paiement' && MODES_PAIEMENT[v]) return MODES_PAIEMENT[v];
  if (CHAMPS_MONTANT.test(k) && v !== '' && !isNaN(Number(v))) {
    return `${Math.round(Number(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')}\u00a0FCFA`;
  }
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  if (Array.isArray(v)) return `${v.length} élément${v.length > 1 ? 's' : ''}`;
  if (typeof v === 'object') return Object.entries(v).map(([c, x]) => `${nomChamp(c)} : ${valeurChamp(x, c)}`).join(' · ');
  return String(v);
};

/** Vrai sur petit écran (les colonnes « Qui » et « Module » sont alors repliées) */
const useEtroit = () => {
  const requete = '(max-width: 640px)';
  const [etroit, setEtroit] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(requete).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(requete);
    if (!mq) return undefined;
    const maj = () => setEtroit(mq.matches);
    mq.addEventListener?.('change', maj);
    return () => mq.removeEventListener?.('change', maj);
  }, []);
  return etroit;
};

// ============================================================
// MODAL (même comportement que la page Ventes)
// ============================================================
let lockDepth = 0;
const lockScroll = () => { if (lockDepth++ === 0) document.body.style.overflow = 'hidden'; };
const unlockScroll = () => { lockDepth = Math.max(0, lockDepth - 1); if (lockDepth === 0) document.body.style.overflow = ''; };

const Modal = ({ onClose, size = 'md', busy = false, labelledBy, children }) => {
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
    const onKey = (e) => { if (e.key === 'Escape' && !e.defaultPrevented) onCloseRef.current?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="vt-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCloseRef.current?.(); }}>
      <div ref={ref} className={`vt-modal vt-modal--${size}`} role="dialog" aria-modal="true"
           aria-labelledby={labelledBy} aria-busy={busy || undefined} tabIndex={-1}>
        {busy && <div className="vt-busybar" />}
        {children}
      </div>
    </div>
  );
};

const ActionTag = ({ action }) => {
  const { un, Icon } = actionInfo(action);
  return <span className="jr-tag" data-a={action}><Icon size={13} /> {un}</span>;
};

// ============================================================
// MODAL : DÉTAIL D'UNE ACTION
// ============================================================
function ModalDetail({ ligne, detail, chargement, erreur, onClose }) {
  const d = detail || ligne;
  const donnees = detail?.details && typeof detail.details === 'object' ? detail.details.donnees : null;
  const message = detail?.details && typeof detail.details === 'object' ? detail.details.message : null;
  const champs = donnees && typeof donnees === 'object' && !Array.isArray(donnees)
    ? Object.entries(donnees).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    : [];

  return (
    <Modal size="md" labelledBy="jr-det-title" onClose={onClose} busy={chargement}>
      <div className="vt-modal-head">
        <div className="vt-modal-titles">
          <h2 id="jr-det-title" className="vt-modal-title">
            {d.acteur_nom || 'Utilisateur'} {d.libelle}{d.reference ? ` « ${d.reference} »` : ''}
          </h2>
          <p className="vt-modal-sub">{dateHeure(d.date_action)}</p>
        </div>
        <button type="button" className="vt-iconbtn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
      </div>
      <div className="vt-modal-body">
        <dl className="vt-facts jr-facts">
          <div><dt>Personne</dt><dd>{d.acteur_nom || '-'}</dd></div>
          <div><dt>Rôle</dt><dd>{roleLabel(d.acteur_role)}</dd></div>
          <div><dt>Module</dt><dd>{d.module}</dd></div>
          <div><dt>Action</dt><dd><ActionTag action={d.action} /></dd></div>
        </dl>

        {erreur && <div className="vt-error" role="alert"><AlertTriangle size={16} /><span>{erreur}</span></div>}

        {message && <p className="jr-message"><CheckCircle size={15} /> Réponse du logiciel : {message}</p>}

        {champs.length > 0 && (
          <div className="jr-block">
            <h3 className="vt-section-title">Informations saisies</h3>
            <dl className="jr-kv">
              {champs.map(([k, v]) => (
                <div key={k}><dt>{nomChamp(k)}</dt><dd>{v === '***' ? <span className="vt-muted">masqué</span> : valeurChamp(v, k)}</dd></div>
              ))}
            </dl>
          </div>
        )}

        <div className="jr-block">
          <h3 className="vt-section-title">Où et comment</h3>
          <dl className="jr-kv">
            <div><dt>Appareil</dt><dd>{chargement && !detail ? '…' : appareil(detail?.user_agent)}</dd></div>
            <div><dt>Adresse IP</dt><dd className="vt-num">{d.ip || '-'}</dd></div>
            <div><dt>Opération technique</dt><dd className="jr-tech">{d.methode} {d.chemin}</dd></div>
          </dl>
        </div>
      </div>
      <div className="vt-modal-foot vt-modal-foot--end">
        <button type="button" className="vt-btn" onClick={onClose}>Fermer</button>
      </div>
    </Modal>
  );
}

// ============================================================
// PAGE
// ============================================================
const PAR_PAGE = 50;

export default function Journal() {
  const { user } = useUser();
  const token = localStorage.getItem('token');
  const autorise = user?.role === 'admin';

  const [periode, setPeriode] = useState('7j');
  const [perso, setPerso] = useState({ debut: aujourdhui(), fin: aujourdhui() });
  const [acteur, setActeur] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [recherche, setRecherche] = useState('');
  const [rechercheDiff, setRechercheDiff] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [facettes, setFacettes] = useState({ acteurs: [], modules: [], actions: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [ouvert, setOuvert] = useState(null); // { ligne, detail, chargement, erreur }
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const reqId = useRef(0);
  const etroit = useEtroit();

  const showToast = (message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Recherche différée (évite une requête par touche)
  useEffect(() => {
    const t = setTimeout(() => setRechercheDiff(recherche.trim()), 350);
    return () => clearTimeout(t);
  }, [recherche]);

  const { debut, fin } = bornesPeriode(periode, perso);
  const filtres = useMemo(
    () => ({ dateDebut: debut, dateFin: fin, acteur, module, action, search: rechercheDiff }),
    [debut, fin, acteur, module, action, rechercheDiff]
  );

  // Toute modification des filtres ramène à la page 1
  useEffect(() => { setPage(1); }, [filtres]);

  const charger = useCallback(async () => {
    if (!autorise) return;
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const [liste, fac] = await Promise.all([
        JournalService.lister(token, { ...filtres, page, limit: PAR_PAGE }),
        JournalService.facettes(token, { dateDebut: filtres.dateDebut, dateFin: filtres.dateFin }),
      ]);
      if (id !== reqId.current) return; // une requête plus récente a été lancée
      setData(liste.data);
      setFacettes(fac.data || { acteurs: [], modules: [], actions: [], total: 0 });
    } catch (e) {
      if (id === reqId.current) setError(e.message || 'Impossible de charger le journal');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [autorise, token, filtres, page]);

  useEffect(() => { charger(); }, [charger]);

  const ouvrir = async (ligne) => {
    setOuvert({ ligne, detail: null, chargement: true, erreur: null });
    try {
      const res = await JournalService.detail(token, ligne.id_journal);
      setOuvert((o) => (o && o.ligne.id_journal === ligne.id_journal ? { ...o, detail: res.data, chargement: false } : o));
    } catch (e) {
      setOuvert((o) => (o && o.ligne.id_journal === ligne.id_journal ? { ...o, chargement: false, erreur: e.message } : o));
    }
  };

  const exporter = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await JournalService.exporter(token, filtres);
      const lignes = res.data || [];
      const clean = (v) => String(v ?? '').replace(/"/g, '""');
      let csv = ['Date', 'Heure', 'Personne', 'Rôle', 'Module', 'Action', 'Description', 'Référence', 'Adresse IP']
        .map((h) => `"${h}"`).join(';') + '\n';
      lignes.forEach((l) => {
        const x = new Date(l.date_action);
        csv += [isoLocal(x).split('-').reverse().join('/'), heure(l.date_action), l.acteur_nom, roleLabel(l.acteur_role),
          l.module, actionInfo(l.action).un, `${l.acteur_nom || ''} ${l.libelle}`.trim(), l.reference, l.ip]
          .map((c) => `"${clean(c)}"`).join(';') + '\n';
      });
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journal_activite_${debut}_${fin}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`${lignes.length} action${lignes.length > 1 ? 's' : ''} exportée${lignes.length > 1 ? 's' : ''}${lignes.length >= 5000 ? ' (limite de 5 000 atteinte)' : ''}`);
    } catch (e) {
      showToast(e.message || "Erreur lors de l'export", 'error');
    } finally {
      setExporting(false);
    }
  };

  const compteAction = (a) => facettes.actions.find((x) => x.action === a)?.nb || 0;
  const nbPersonnes = facettes.acteurs.length;
  const lignes = useMemo(() => data?.lignes || [], [data]);
  const nbPages = data?.pages || 1;
  const filtresActifs = !!(acteur || module || action || rechercheDiff);

  // Regroupement par jour (en-têtes intercalés)
  const groupes = useMemo(() => {
    const out = [];
    lignes.forEach((l) => {
      const jour = isoLocal(new Date(l.date_action));
      if (!out.length || out[out.length - 1].jour !== jour) out.push({ jour, titre: libelleJour(l.date_action), lignes: [] });
      out[out.length - 1].lignes.push(l);
    });
    return out;
  }, [lignes]);

  const reinitialiser = () => { setActeur(''); setModule(''); setAction(''); setRecherche(''); setRechercheDiff(''); };

  if (!autorise) {
    return (
      <div className="ventes-container vt jr">
        <div className="vt-empty">
          <History size={30} />
          <p className="vt-empty-title">Accès réservé</p>
          <p className="vt-empty-text">Le journal d'activité est consultable uniquement par l'administrateur du compte.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ventes-container vt jr">
      <header className="vt-head">
        <div>
          <h1 className="vt-title">Journal d'activité</h1>
          <p className="vt-sub">Qui a fait quoi, et quand. Chaque action est enregistrée automatiquement et conservée 12 mois.</p>
        </div>
        <div className="vt-head-actions">
          <button type="button" className="vt-btn" onClick={exporter} disabled={exporting || !data || data.total === 0}>
            {exporting ? <Loader size={16} className="vt-spin" /> : <Download size={16} />} Exporter
          </button>
          <button type="button" className="vt-btn vt-btn--icon" onClick={charger} disabled={loading} aria-label="Rafraîchir" title="Rafraîchir">
            <RefreshCw size={16} className={loading ? 'vt-spin' : ''} />
          </button>
        </div>
      </header>

      {/* ---------- Synthèse + filtre par type d'action ---------- */}
      <section className="vt-overview" aria-label="Synthèse">
        <div className="vt-ca">
          <span className="vt-label">Actions sur la période</span>
          <strong className="vt-ca-value vt-num">{facettes.total.toLocaleString('fr-FR')}</strong>
          <span className="vt-ca-note">
            {nbPersonnes === 0 ? 'Aucune personne active' : `par ${nbPersonnes} personne${nbPersonnes > 1 ? 's' : ''}`}
          </span>
        </div>
        <div className="vt-rail" role="group" aria-label="Filtrer par type d'action">
          <button type="button" className="vt-stage" data-a="all" aria-pressed={action === ''} onClick={() => setAction('')}>
            <span className="vt-stage-count vt-num">{facettes.total}</span>
            <span className="vt-stage-label">Toutes</span>
          </button>
          {RAIL.map((a) => (
            <button key={a} type="button" className="vt-stage" data-a={a} aria-pressed={action === a}
                    onClick={() => setAction(action === a ? '' : a)}>
              <span className="vt-stage-count vt-num">{compteAction(a)}</span>
              <span className="vt-stage-label">{ACTIONS[a].label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ---------- Filtres ---------- */}
      <div className="vt-toolbar jr-toolbar">
        <div className="vt-seg" role="group" aria-label="Période">
          {PERIODES.map((p) => (
            <button key={p.id} type="button" aria-pressed={periode === p.id}
                    onClick={() => { if (p.id === 'perso') setPerso({ debut, fin }); setPeriode(p.id); }}>
              {p.label}
            </button>
          ))}
        </div>
        {periode === 'perso' && (
          <div className="jr-dates">
            <input type="date" className="vt-input" value={perso.debut} max={perso.fin || undefined}
                   onChange={(e) => e.target.value && setPerso((p) => ({ ...p, debut: e.target.value }))} aria-label="Du" />
            <span className="vt-muted">au</span>
            <input type="date" className="vt-input" value={perso.fin} min={perso.debut || undefined}
                   onChange={(e) => e.target.value && setPerso((p) => ({ ...p, fin: e.target.value }))} aria-label="Au" />
          </div>
        )}
        <select className="vt-input jr-select" value={acteur} onChange={(e) => setActeur(e.target.value)} aria-label="Personne">
          <option value="">Toutes les personnes</option>
          {facettes.acteurs.map((a) => (
            <option key={`${a.acteur_type}:${a.acteur_id}`} value={`${a.acteur_type}:${a.acteur_id}`}>
              {a.acteur_nom || 'Sans nom'} ({roleLabel(a.acteur_role)}) · {a.nb}
            </option>
          ))}
          {acteur && !facettes.acteurs.some((a) => `${a.acteur_type}:${a.acteur_id}` === acteur) && (
            <option value={acteur}>Personne sélectionnée</option>
          )}
        </select>
        <select className="vt-input jr-select" value={module} onChange={(e) => setModule(e.target.value)} aria-label="Module">
          <option value="">Tous les modules</option>
          {facettes.modules.map((m) => <option key={m.module} value={m.module}>{m.module} · {m.nb}</option>)}
          {module && !facettes.modules.some((m) => m.module === module) && <option value={module}>{module}</option>}
        </select>
        <div className="vt-search jr-search">
          <input type="text" className="vt-input vt-search-input" placeholder="N° de vente, nom, produit…"
                 aria-label="Rechercher dans le journal" value={recherche} onChange={(e) => setRecherche(e.target.value)} spellCheck={false} />
          {recherche && (
            <button type="button" className="vt-search-clear" onClick={() => setRecherche('')} aria-label="Effacer la recherche"><X size={14} /></button>
          )}
        </div>
      </div>

      {error && !loading && (
        <div className="vt-error" role="alert">
          <AlertTriangle size={16} /><span>{error}</span>
          <button type="button" className="vt-btn vt-btn--sm" onClick={charger}>Réessayer</button>
        </div>
      )}

      {/* ---------- Liste ---------- */}
      <div className="vt-table-wrap jr-wrap" aria-busy={loading || undefined}>
        {loading && data && <div className="vt-busybar" />}
        <table className="vt-table jr-table">
          <thead>
            <tr>
              <th className="jr-col-heure">Heure</th>
              <th className="jr-col-qui">Qui</th>
              <th>Ce qui a été fait</th>
              <th className="jr-col-hide">Module</th>
              <th className="vt-th-right"><span className="jr-sr">Détail</span></th>
            </tr>
          </thead>
          <tbody style={{ counterReset: `ligne ${(page - 1) * PAR_PAGE}` }}>
            {loading && !data
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="vt-skel-row" aria-hidden="true">
                    {(etroit ? [40, 80, 20] : [40, 60, 80, 40, 20]).map((w, k) => <td key={k}><span className="vt-skel" style={{ width: `${w}%` }} /></td>)}
                  </tr>
                ))
              : groupes.map((g) => (
                  <React.Fragment key={g.jour}>
                    <tr className="jr-day vt-row-groupe"><th colSpan={etroit ? 3 : 5} scope="colgroup">{g.titre}</th></tr>
                    {g.lignes.map((l) => {
                      const { Icon } = actionInfo(l.action);
                      return (
                        <tr key={l.id_journal} className="jr-row" onClick={() => ouvrir(l)}>
                          <td className="vt-num jr-heure">{heure(l.date_action)}</td>
                          <td className="jr-col-qui">
                            <div className="vt-cell-main">{l.acteur_nom || 'Sans nom'}</div>
                            <div className="vt-cell-sub">{roleLabel(l.acteur_role)}</div>
                          </td>
                          <td>
                            <div className="jr-quoi">
                              <span className="jr-ico" data-a={l.action} title={actionInfo(l.action).un}><Icon size={15} /></span>
                              <span>
                                {etroit && <strong className="jr-qui-m">{l.acteur_nom || 'Sans nom'} </strong>}
                                <span className="jr-libelle">{l.libelle}</span>
                                {l.reference && <strong className="jr-ref"> {l.reference}</strong>}
                              </span>
                            </div>
                          </td>
                          <td className="jr-col-hide"><span className="jr-module">{l.module}</span></td>
                          <td className="vt-td-right">
                            <button type="button" className="vt-iconbtn vt-iconbtn--sm" aria-label="Voir le détail"
                                    onClick={(e) => { e.stopPropagation(); ouvrir(l); }}>
                              <Eye size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
          </tbody>
        </table>
        {!loading && lignes.length === 0 && (
          <div className="vt-empty">
            <History size={30} />
            <p className="vt-empty-title">{filtresActifs ? 'Aucune action ne correspond' : 'Aucune action sur cette période'}</p>
            <p className="vt-empty-text">
              {filtresActifs
                ? 'Modifiez les filtres ou la recherche.'
                : 'Les ventes, encaissements, modifications et connexions apparaîtront ici dès qu\'ils seront faits.'}
            </p>
            {filtresActifs && <button type="button" className="vt-btn vt-btn--sm" onClick={reinitialiser}>Effacer les filtres</button>}
          </div>
        )}
      </div>

      {data && data.total > PAR_PAGE && (
        <nav className="vt-pager" aria-label="Pagination">
          <span className="vt-pager-info">{data.total.toLocaleString('fr-FR')} actions</span>
          <div className="vt-pager-ctrl">
            <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || loading} aria-label="Page précédente"><ChevronLeft size={18} /></button>
            <span className="vt-pager-page">Page {page} sur {nbPages}</span>
            <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage((p) => p + 1)} disabled={page >= nbPages || loading} aria-label="Page suivante"><ChevronRight size={18} /></button>
          </div>
        </nav>
      )}

      {ouvert && <ModalDetail {...ouvert} onClose={() => setOuvert(null)} />}

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
