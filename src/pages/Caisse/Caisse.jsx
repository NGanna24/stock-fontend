// pages/Caisse/Caisse.jsx
//
// Caisse journalière : ouverture avec fond de caisse → suivi en direct → clôture avec comptage.
// Espèces attendues = fond + encaissements espèces − remboursements − dépenses espèces.
// Les autres modes (carte, virement, chèque, mobile money) sont affichés « hors tiroir ».
//
// Droits : caissier, manager et admin ouvrent / clôturent ; l'historique est réservé
// au manager et à l'admin (le serveur applique les mêmes règles).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import {
  Lock, Unlock, RefreshCw, X, Check, Loader, AlertTriangle, Printer, Calculator, History,
  ArrowDownLeft, ArrowUpRight, Undo2, Eye, ChevronLeft, ChevronRight, Info,
} from 'lucide-react';
import CaisseService from '../../services/caisseService';
import MagasinService from '../../services/magasinService';
import FacturePDFService from '../../services/facturePDFService';
import ApercuImpression from '../../components/Impression/ApercuImpression';
import RapportCaissePDF, { COUPURES } from '../../components/Caisse/RapportCaissePDF';
import { useUser } from '../../context/AuthContext';
import '../Ventes/Ventes.css';
import './Caisse.css';

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
const fmSigne = (v) => (Number(v) > 0 ? `+${fm(v)}` : fm(v));
const pad = (n) => String(n).padStart(2, '0');
const heure = (d) => { const x = new Date(d); return isNaN(x) ? '-' : `${pad(x.getHours())}:${pad(x.getMinutes())}`; };
const dateHeure = (d) => {
  const x = new Date(d);
  return isNaN(x) ? '-' : `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()} ${pad(x.getHours())}:${pad(x.getMinutes())}`;
};
const dureeDepuis = (debut, maintenant) => {
  const ms = new Date(maintenant || Date.now()) - new Date(debut);
  if (isNaN(ms)) return '';
  if (ms < 60000) return "moins d'une minute";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h ? `${h}${NBSP}h${NBSP}${pad(m)}` : `${m}${NBSP}min`;
};
const toNum = (v) => {
  if (v === '' || v === null || v === undefined) return NaN;
  return parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
};
const DECIMAL_RE = /^\d*[.,]?\d*$/;
const ENTIER_RE = /^\d*$/;

const MODES = { especes: 'Espèces', carte: 'Carte', virement: 'Virement', cheque: 'Chèque', autre: 'Mobile money / autre', mobile_money: 'Mobile money' };
const modeLabel = (m) => MODES[m] || m || '-';

const ecartInfo = (e) => {
  const v = Number(e) || 0;
  if (Math.abs(v) < 1) return { cle: 'ok', label: 'Caisse juste' };
  return v < 0 ? { cle: 'manque', label: `Manque ${fm(-v)}` } : { cle: 'surplus', label: `Excédent ${fm(v)}` };
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

const EcartTag = ({ ecart }) => {
  const i = ecartInfo(ecart);
  return <span className="cs-ecart" data-e={i.cle}>{i.label}</span>;
};

// ============================================================
// Liste des mouvements (encaissements, remboursements, dépenses)
// ============================================================
const Mouvements = ({ mouvements, especesSeulement }) => {
  const liste = especesSeulement ? mouvements.filter((m) => m.mode_paiement === 'especes') : mouvements;
  if (liste.length === 0) {
    return (
      <div className="vt-empty cs-empty-mvt">
        <Calculator size={26} />
        <p className="vt-empty-title">Aucun mouvement{especesSeulement ? ' en espèces' : ''} pour l'instant</p>
        <p className="vt-empty-text">Les encaissements et dépenses apparaissent ici au fur et à mesure.</p>
      </div>
    );
  }
  return (
    <div className="vt-doc-scroll">
      <table className="vt-doc cs-mvt">
        <thead>
          <tr>
            <th>Heure</th><th>Mouvement</th><th>Détail</th><th>Mode</th>
            <th className="vt-th-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          {liste.map((m) => {
            const sortie = m.type !== 'encaissement';
            const Icon = m.type === 'encaissement' ? ArrowDownLeft : m.type === 'remboursement' ? Undo2 : ArrowUpRight;
            return (
              <tr key={`${m.type}-${m.id}`} className={m.mode_paiement !== 'especes' ? 'cs-hors-tiroir' : ''}>
                <td className="vt-num">{heure(m.date)}</td>
                <td>
                  <span className="cs-type" data-t={m.type}>
                    <Icon size={13} />
                    {m.type === 'encaissement' ? 'Encaissement' : m.type === 'remboursement' ? 'Remboursement' : 'Dépense'}
                  </span>
                </td>
                <td className="cs-libelle" title={m.libelle}>{m.libelle}{m.categorie_nom ? <span className="vt-muted"> · {m.categorie_nom}</span> : null}</td>
                <td>{modeLabel(m.mode_paiement)}</td>
                <td className={`vt-td-right vt-num ${sortie ? 'cs-moins' : 'cs-plus'}`}>{sortie ? '−' : '+'}{fm(m.montant)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================
// PAGE
// ============================================================
const PAR_PAGE = 15;

export default function Caisse() {
  const { user } = useUser();
  const token = localStorage.getItem('token');
  const role = user?.role;
  const peutUtiliser = ['admin', 'manager', 'caissier'].includes(role);
  const responsable = role === 'admin' || role === 'manager';

  const [vue, setVue] = useState('jour'); // 'jour' | 'historique'
  const [etat, setEtat] = useState(null);  // { session, mouvements, derniere_cloture }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [magasin, setMagasin] = useState(null);
  const [especesSeulement, setEspecesSeulement] = useState(false);

  // Ouverture
  const [fond, setFond] = useState('');
  const [noteOuverture, setNoteOuverture] = useState('');
  const [ouverture, setOuverture] = useState(false);

  // Clôture
  const [clotureOuverte, setClotureOuverte] = useState(false);
  const [modeComptage, setModeComptage] = useState('coupures'); // 'coupures' | 'total'
  const [comptage, setComptage] = useState({});
  const [totalDirect, setTotalDirect] = useState('');
  const [noteCloture, setNoteCloture] = useState('');
  const [cloturing, setCloturing] = useState(false);
  const [erreurCloture, setErreurCloture] = useState(null);
  const [resultat, setResultat] = useState(null); // session clôturée

  // Historique
  const [historique, setHistorique] = useState([]);
  const [loadingHisto, setLoadingHisto] = useState(false);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(null);

  // Impression du Z
  const [zAImprimer, setZAImprimer] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = useCallback((message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // ============================================================
  // CHARGEMENT
  // ============================================================
  const charger = useCallback(async (silencieux = false) => {
    if (!token) return;
    if (!silencieux) setLoading(true);
    setError(null);
    try {
      const res = await CaisseService.courante(token);
      setEtat(res.data);
      if (!res.data?.session) {
        // Fond proposé : celui de la dernière ouverture
        setFond((f) => (f === '' && res.data?.derniere_cloture ? String(Math.round(res.data.derniere_cloture.fond_initial || 0)) : f));
      }
    } catch (err) {
      if (!silencieux) setError(err.message || 'Erreur lors du chargement de la caisse');
    } finally {
      if (!silencieux) setLoading(false);
    }
  }, [token]);

  const chargerHistorique = useCallback(async () => {
    if (!responsable) return;
    setLoadingHisto(true);
    try {
      const res = await CaisseService.historique(token);
      setHistorique(res.data || []);
    } catch (err) {
      showToast(err.message || "Erreur lors du chargement de l'historique", 'error');
    } finally {
      setLoadingHisto(false);
    }
  }, [token, responsable, showToast]);

  useEffect(() => { if (peutUtiliser) charger(); }, [charger, peutUtiliser]);
  useEffect(() => {
    if (!token || !peutUtiliser) return;
    MagasinService.getMonMagasin(token).then((r) => { if (r.success) setMagasin(r.magasin); }).catch(() => {});
  }, [token, peutUtiliser]);
  useEffect(() => { if (vue === 'historique') chargerHistorique(); }, [vue, chargerHistorique]);

  // Rafraîchissement automatique toutes les 30 s quand la caisse est ouverte
  const session = etat?.session || null;
  useEffect(() => {
    if (!session || vue !== 'jour') return undefined;
    const t = setInterval(() => charger(true), 30000);
    return () => clearInterval(t);
  }, [session, vue, charger]);

  // ============================================================
  // ACTIONS
  // ============================================================
  const ouvrir = async (e) => {
    e?.preventDefault();
    const montant = fond === '' ? 0 : toNum(fond);
    if (isNaN(montant) || montant < 0) { showToast('Fond de caisse invalide', 'error'); return; }
    setOuverture(true);
    try {
      const res = await CaisseService.ouvrir(token, montant, noteOuverture.trim());
      setEtat(res.data);
      setNoteOuverture('');
      showToast(`Caisse ouverte avec ${fm(montant)}`);
    } catch (err) {
      showToast(err.message || "Erreur lors de l'ouverture", 'error');
      if (err.status === 409) charger();
    } finally {
      setOuverture(false);
    }
  };

  const totalCompte = useMemo(() => {
    if (modeComptage === 'total') return totalDirect === '' ? NaN : toNum(totalDirect);
    return COUPURES.reduce((s, c) => s + c.valeur * (parseInt(comptage[c.cle], 10) || 0), 0);
  }, [modeComptage, comptage, totalDirect]);

  const ecartPrevu = session && !isNaN(totalCompte) ? Math.round((totalCompte - session.montant_theorique) * 100) / 100 : null;
  const noteObligatoire = ecartPrevu !== null && Math.abs(ecartPrevu) >= 1;

  const ouvrirCloture = async () => {
    await charger(true); // chiffres à jour au moment du comptage
    setErreurCloture(null);
    setComptage({});
    setTotalDirect('');
    setNoteCloture('');
    setModeComptage('coupures');
    setClotureOuverte(true);
  };

  const cloturer = async () => {
    if (!session || cloturing) return;
    if (isNaN(totalCompte) || totalCompte < 0) { setErreurCloture('Saisissez le montant compté dans le tiroir.'); return; }
    if (noteObligatoire && !noteCloture.trim()) { setErreurCloture("Expliquez l'écart avant de clôturer."); return; }
    setCloturing(true);
    setErreurCloture(null);
    try {
      const detailComptage = modeComptage === 'coupures'
        ? Object.fromEntries(COUPURES.filter((c) => parseInt(comptage[c.cle], 10) > 0).map((c) => [c.cle, parseInt(comptage[c.cle], 10)]))
        : null;
      const res = await CaisseService.cloturer(token, session.id_session, {
        montant_compte: totalCompte,
        detail_comptage: detailComptage,
        note: noteCloture.trim(),
      });
      setClotureOuverte(false);
      setResultat(res.data?.session || null);
      showToast('Caisse clôturée');
      charger(true);
    } catch (err) {
      setErreurCloture(err.message || 'Erreur lors de la clôture');
    } finally {
      setCloturing(false);
    }
  };

  const voirDetail = async (s) => {
    setLoadingDetail(s.id_session);
    try {
      const res = await CaisseService.detail(token, s.id_session);
      setDetail(res.data);
    } catch (err) {
      showToast(err.message || 'Impossible de charger la session', 'error');
    } finally {
      setLoadingDetail(null);
    }
  };

  const imprimerZ = async (s) => {
    // Pour le Z on a besoin des autres modes : on recharge le détail si nécessaire
    let complete = s;
    if (!s.autres_modes && responsable) {
      try { complete = (await CaisseService.detail(token, s.id_session)).data.session; } catch { /* on imprime ce qu'on a */ }
    }
    setZAImprimer(complete);
  };

  // ============================================================
  // DÉRIVÉS
  // ============================================================
  const nbPages = Math.max(1, Math.ceil(historique.length / PAR_PAGE));
  const pageCourante = Math.min(page, nbPages);
  const histoVisibles = historique.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);
  const totauxHisto = useMemo(() => {
    const closes = historique.filter((h) => h.statut === 'cloturee');
    return {
      nb: closes.length,
      ecarts: closes.reduce((s, h) => s + (Number(h.ecart) || 0), 0),
      avecEcart: closes.filter((h) => Math.abs(Number(h.ecart) || 0) >= 1).length,
    };
  }, [historique]);

  if (!peutUtiliser) {
    return (
      <div className="ventes-container vt cs">
        <div className="vt-empty">
          <Lock size={30} />
          <p className="vt-empty-title">Accès réservé</p>
          <p className="vt-empty-text">La caisse est gérée par les caissiers, managers et administrateurs.</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="ventes-container vt cs">
      {/* ---------- En-tête ---------- */}
      <header className="vt-head">
        <div>
          <h1 className="vt-title">Caisse</h1>
          <p className="vt-sub">
            {session
              ? <>Ouverte à {heure(session.date_ouverture)} par {session.ouvert_par_nom || '-'} · depuis {dureeDepuis(session.date_ouverture, session.maintenant)}</>
              : 'Ouverture, suivi et clôture du tiroir-caisse'}
          </p>
        </div>
        <div className="vt-head-actions">
          {responsable && (
            <div className="vt-seg cs-seg" role="group" aria-label="Vue">
              <button type="button" aria-pressed={vue === 'jour'} onClick={() => setVue('jour')}>
                <Calculator size={15} /> Aujourd'hui
              </button>
              <button type="button" aria-pressed={vue === 'historique'} onClick={() => setVue('historique')}>
                <History size={15} /> Historique
              </button>
            </div>
          )}
          <button type="button" className="vt-btn vt-btn--icon" onClick={() => (vue === 'jour' ? charger() : chargerHistorique())}
                  disabled={loading || loadingHisto} aria-label="Rafraîchir" title="Rafraîchir">
            <RefreshCw size={16} className={loading || loadingHisto ? 'vt-spin' : ''} />
          </button>
          {vue === 'jour' && session && (
            <button type="button" className="vt-btn vt-btn--primary" onClick={ouvrirCloture}>
              <Lock size={16} /> Clôturer la caisse
            </button>
          )}
        </div>
      </header>

      {error && !loading && (
        <div className="vt-error" role="alert">
          <AlertTriangle size={16} /><span>{error}</span>
          <button type="button" className="vt-btn vt-btn--sm" onClick={() => charger()}>Réessayer</button>
        </div>
      )}

      {/* ============================================================
          VUE DU JOUR
          ============================================================ */}
      {vue === 'jour' && (
        loading && !etat ? (
          <div className="cs-loading"><Loader size={20} className="vt-spin" /> Chargement de la caisse…</div>
        ) : !session ? (
          /* ---------- Caisse fermée : ouverture ---------- */
          <section className="cs-ferme">
            <div className="cs-ferme-card">
              <div className="cs-ferme-icon"><Lock size={26} /></div>
              <h2>La caisse est fermée</h2>
              <p className="vt-muted">Comptez le fond de caisse (la monnaie de départ) puis ouvrez la caisse.</p>
              <form className="cs-ouvrir" onSubmit={ouvrir}>
                <div className="vt-field">
                  <label htmlFor="cs-fond">Fond de caisse (FCFA)</label>
                  <input id="cs-fond" className="vt-input vt-num cs-gros" inputMode="decimal" placeholder="0"
                         value={fond} onChange={(e) => DECIMAL_RE.test(e.target.value.replace(/\s/g, '')) && setFond(e.target.value.replace(/\s/g, ''))}
                         autoFocus autoComplete="off" disabled={ouverture} />
                </div>
                <div className="vt-field">
                  <label htmlFor="cs-note-o">Note <span className="vt-muted">(facultatif)</span></label>
                  <input id="cs-note-o" className="vt-input" placeholder="Ex. : caisse du matin" value={noteOuverture}
                         onChange={(e) => setNoteOuverture(e.target.value)} disabled={ouverture} autoComplete="off" />
                </div>
                <button type="submit" className="vt-btn vt-btn--primary vt-btn--lg cs-btn-ouvrir" disabled={ouverture}>
                  {ouverture ? <Loader size={16} className="vt-spin" /> : <Unlock size={16} />}
                  Ouvrir la caisse{fond !== '' && !isNaN(toNum(fond)) ? ` avec ${fm(toNum(fond))}` : ''}
                </button>
              </form>
            </div>

            {etat?.derniere_cloture && (
              <div className="cs-derniere">
                <span className="vt-label">Dernière clôture</span>
                <strong>{dateHeure(etat.derniere_cloture.date_cloture)}</strong>
                <span className="vt-muted">par {etat.derniere_cloture.cloture_par_nom || '-'}</span>
                <dl className="vt-kv">
                  <div><dt>Attendu</dt><dd className="vt-num">{fm(etat.derniere_cloture.montant_theorique)}</dd></div>
                  <div><dt>Compté</dt><dd className="vt-num">{fm(etat.derniere_cloture.montant_compte)}</dd></div>
                  <div><dt>Écart</dt><dd><EcartTag ecart={etat.derniere_cloture.ecart} /></dd></div>
                </dl>
                <button type="button" className="vt-btn vt-btn--sm" onClick={() => imprimerZ(etat.derniere_cloture)}>
                  <Printer size={14} /> Réimprimer le Z
                </button>
              </div>
            )}
          </section>
        ) : (
          /* ---------- Caisse ouverte ---------- */
          <>
            <section className="vt-overview cs-overview" aria-label="Situation de la caisse">
              <div className="vt-ca">
                <span className="vt-label">Espèces attendues dans le tiroir</span>
                <strong className="vt-ca-value vt-num">{fm(session.montant_theorique)}</strong>
                <span className="vt-ca-note">Mis à jour à {heure(session.maintenant)} · actualisation automatique</span>
              </div>
              <div className="cs-calc" aria-label="Détail du calcul">
                <div><span>Fond initial</span><strong className="vt-num">{fm(session.fond_initial)}</strong></div>
                <div className="cs-plus"><span>+ Encaissements espèces</span><strong className="vt-num">{fm(session.especes_encaissees)}</strong></div>
                {session.especes_remboursees > 0 && (
                  <div className="cs-moins"><span>− Remboursements</span><strong className="vt-num">{fm(session.especes_remboursees)}</strong></div>
                )}
                <div className="cs-moins"><span>− Dépenses espèces</span><strong className="vt-num">{fm(session.depenses_especes)}</strong></div>
              </div>
              <div className="cs-autres">
                <span className="vt-label">Hors tiroir</span>
                {session.autres_modes?.length ? session.autres_modes.map((a) => (
                  <div key={a.mode_paiement}><span>{modeLabel(a.mode_paiement)}</span><span className="vt-num">{fm(a.encaisse)}</span></div>
                )) : <span className="vt-muted cs-petit">Aucun paiement par carte, virement, chèque ou mobile money.</span>}
              </div>
            </section>

            <div className="vt-toolbar">
              <h2 className="vt-section-title cs-titre-mvt">Mouvements depuis l'ouverture</h2>
              <span className="vt-count">{session.nb_paiements} paiement{session.nb_paiements > 1 ? 's' : ''} · {session.nb_depenses} dépense{session.nb_depenses > 1 ? 's' : ''}</span>
              <label className="cs-check">
                <input type="checkbox" checked={especesSeulement} onChange={(e) => setEspecesSeulement(e.target.checked)} />
                Espèces seulement
              </label>
            </div>
            <div className="cs-mvt-wrap">
              <Mouvements mouvements={etat.mouvements || []} especesSeulement={especesSeulement} />
            </div>
          </>
        )
      )}

      {/* ============================================================
          HISTORIQUE
          ============================================================ */}
      {vue === 'historique' && responsable && (
        <>
          <section className="vt-overview cs-histo-synth">
            <div className="vt-ca">
              <span className="vt-label">Cumul des écarts</span>
              <strong className={`vt-ca-value vt-num ${totauxHisto.ecarts < -0.5 ? 'cs-txt-manque' : totauxHisto.ecarts > 0.5 ? 'cs-txt-surplus' : ''}`}>
                {fmSigne(Math.round(totauxHisto.ecarts))}
              </strong>
              <span className="vt-ca-note">{totauxHisto.nb} clôture{totauxHisto.nb > 1 ? 's' : ''} · {totauxHisto.avecEcart} avec écart</span>
            </div>
          </section>

          <div className="vt-table-wrap cs-histo-wrap" aria-busy={loadingHisto || undefined}>
            {loadingHisto && historique.length > 0 && <div className="vt-busybar" />}
            <table className="vt-table cs-histo">
              <thead>
                <tr>
                  <th>Journée</th><th>Ouverte par</th>
                  <th className="vt-th-right">Fond</th><th className="vt-th-right">Attendu</th>
                  <th className="vt-th-right">Compté</th><th>Écart</th><th>Clôturée par</th>
                  <th className="vt-th-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {histoVisibles.map((h) => (
                  <tr key={h.id_session}>
                    <td>
                      <div className="vt-cell-main vt-num">{dateHeure(h.date_ouverture).slice(0, 10)}</div>
                      <div className="vt-cell-sub vt-num">{heure(h.date_ouverture)} → {h.date_cloture ? heure(h.date_cloture) : 'en cours'}</div>
                    </td>
                    <td>{h.ouvert_par_nom || '-'}</td>
                    <td className="vt-td-right vt-num">{fm(h.fond_initial)}</td>
                    <td className="vt-td-right vt-num">{h.statut === 'cloturee' ? fm(h.montant_theorique) : '-'}</td>
                    <td className="vt-td-right vt-num">{h.statut === 'cloturee' ? fm(h.montant_compte) : '-'}</td>
                    <td>{h.statut === 'cloturee' ? <EcartTag ecart={h.ecart} /> : <span className="cs-ecart" data-e="ouverte">Ouverte</span>}</td>
                    <td>{h.cloture_par_nom || '-'}</td>
                    <td className="vt-td-right">
                      <div className="vt-actions">
                        <button type="button" className="vt-iconbtn" title="Détail" aria-label="Détail" onClick={() => voirDetail(h)}
                                disabled={loadingDetail === h.id_session}>
                          {loadingDetail === h.id_session ? <Loader size={15} className="vt-spin" /> : <Eye size={15} />}
                        </button>
                        {h.statut === 'cloturee' && (
                          <button type="button" className="vt-iconbtn" title="Imprimer le Z" aria-label="Imprimer le Z" onClick={() => imprimerZ(h)}>
                            <Printer size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loadingHisto && historique.length === 0 && (
              <div className="vt-empty">
                <History size={30} />
                <p className="vt-empty-title">Aucune journée de caisse</p>
                <p className="vt-empty-text">Les ouvertures et clôtures apparaîtront ici.</p>
              </div>
            )}
          </div>
          {historique.length > PAR_PAGE && (
            <nav className="vt-pager" aria-label="Pagination">
              <span className="vt-pager-info">{historique.length} journées</span>
              <div className="vt-pager-ctrl">
                <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage(pageCourante - 1)} disabled={pageCourante === 1} aria-label="Page précédente"><ChevronLeft size={18} /></button>
                <span className="vt-pager-page">Page {pageCourante} sur {nbPages}</span>
                <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage(pageCourante + 1)} disabled={pageCourante === nbPages} aria-label="Page suivante"><ChevronRight size={18} /></button>
              </div>
            </nav>
          )}
        </>
      )}

      {/* ============================================================
          MODAL : CLÔTURE
          ============================================================ */}
      {clotureOuverte && session && (
        <Modal size="lg" busy={cloturing} labelledBy="cs-clo-title" dismissable={!cloturing} onClose={() => setClotureOuverte(false)}>
          <ModalHead id="cs-clo-title" title="Clôturer la caisse"
                     sub={`Ouverte à ${heure(session.date_ouverture)} par ${session.ouvert_par_nom || '-'} · comptez l'argent du tiroir`}
                     onClose={() => setClotureOuverte(false)} disabled={cloturing} />
          <div className="vt-modal-body cs-clo">
            {erreurCloture && <div className="vt-error" role="alert"><AlertTriangle size={16} /><span>{erreurCloture}</span></div>}

            <div className="cs-clo-grid">
              <div>
                <div className="vt-seg cs-seg cs-seg-comptage" role="group" aria-label="Méthode de comptage">
                  <button type="button" aria-pressed={modeComptage === 'coupures'} onClick={() => setModeComptage('coupures')}>Billets et pièces</button>
                  <button type="button" aria-pressed={modeComptage === 'total'} onClick={() => setModeComptage('total')}>Total directement</button>
                </div>

                {modeComptage === 'coupures' ? (
                  <div className="cs-coupures">
                    {COUPURES.map((c) => {
                      const n = parseInt(comptage[c.cle], 10) || 0;
                      return (
                        <label key={c.cle} className={`cs-coupure ${n > 0 ? 'is-set' : ''}`}>
                          <span className="cs-coupure-label">{c.label}</span>
                          <input className="vt-input vt-num" inputMode="numeric" placeholder="0" value={comptage[c.cle] || ''}
                                 onChange={(e) => ENTIER_RE.test(e.target.value) && setComptage((p) => ({ ...p, [c.cle]: e.target.value }))}
                                 aria-label={`Nombre de ${c.label}`} disabled={cloturing} />
                          <span className="cs-coupure-total vt-num">{n > 0 ? fm(n * c.valeur) : ''}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="vt-field">
                    <label htmlFor="cs-total">Montant total compté (FCFA)</label>
                    <input id="cs-total" className="vt-input vt-num cs-gros" inputMode="decimal" placeholder="0" value={totalDirect}
                           onChange={(e) => DECIMAL_RE.test(e.target.value.replace(/\s/g, '')) && setTotalDirect(e.target.value.replace(/\s/g, ''))}
                           autoFocus disabled={cloturing} />
                  </div>
                )}
              </div>

              <aside className="cs-bilan">
                <div className="cs-bilan-row"><span>Attendu</span><strong className="vt-num">{fm(session.montant_theorique)}</strong></div>
                <div className="cs-bilan-row"><span>Compté</span><strong className="vt-num">{isNaN(totalCompte) ? '—' : fm(totalCompte)}</strong></div>
                <div className="cs-bilan-ecart" data-e={ecartPrevu === null ? 'vide' : ecartInfo(ecartPrevu).cle}>
                  <span>Écart</span>
                  <strong className="vt-num">{ecartPrevu === null ? '—' : Math.abs(ecartPrevu) < 1 ? '0 FCFA' : fmSigne(ecartPrevu)}</strong>
                  <small>{ecartPrevu === null ? 'Saisissez le comptage' : ecartInfo(ecartPrevu).label}</small>
                </div>
                <div className="vt-field">
                  <label htmlFor="cs-note-c">
                    Explication {noteObligatoire ? <span className="cs-requis">(obligatoire : écart)</span> : <span className="vt-muted">(facultatif)</span>}
                  </label>
                  <textarea id="cs-note-c" className="vt-input cs-note" rows={3} value={noteCloture}
                            placeholder={noteObligatoire ? 'Ex. : erreur de rendu de monnaie, billet abîmé…' : ''}
                            onChange={(e) => setNoteCloture(e.target.value)} disabled={cloturing} />
                </div>
                <p className="cs-info"><Info size={13} /> Les montants sont figés à la clôture : une vente enregistrée après ira dans la caisse suivante.</p>
              </aside>
            </div>
          </div>
          <div className="vt-modal-foot vt-modal-foot--end">
            <button type="button" className="vt-btn" onClick={() => setClotureOuverte(false)} disabled={cloturing}>Annuler</button>
            <button type="button" className="vt-btn vt-btn--primary vt-btn--lg" onClick={cloturer}
                    disabled={cloturing || isNaN(totalCompte) || (noteObligatoire && !noteCloture.trim())}>
              {cloturing ? <Loader size={16} className="vt-spin" /> : <Lock size={16} />}
              Clôturer{!isNaN(totalCompte) ? ` avec ${fm(totalCompte)}` : ''}
            </button>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL : RÉSULTAT DE LA CLÔTURE
          ============================================================ */}
      {resultat && !zAImprimer && (
        <Modal size="sm" labelledBy="cs-res-title" onClose={() => setResultat(null)}>
          <ModalHead id="cs-res-title" title="Caisse clôturée" sub={dateHeure(resultat.date_cloture)} onClose={() => setResultat(null)} />
          <div className="vt-modal-body">
            <div className="cs-res-ecart" data-e={ecartInfo(resultat.ecart).cle}>
              {Math.abs(resultat.ecart) < 1 ? <Check size={22} /> : <AlertTriangle size={22} />}
              <div>
                <strong>{ecartInfo(resultat.ecart).label}</strong>
                <span>Attendu {fm(resultat.montant_theorique)} · compté {fm(resultat.montant_compte)}</span>
              </div>
            </div>
            <dl className="vt-kv">
              <div><dt>Fond initial</dt><dd className="vt-num">{fm(resultat.fond_initial)}</dd></div>
              <div><dt>Encaissements espèces</dt><dd className="vt-num">{fm(resultat.especes_encaissees)}</dd></div>
              <div><dt>Dépenses espèces</dt><dd className="vt-num">{fm(resultat.depenses_especes)}</dd></div>
              <div><dt>Autres modes (hors tiroir)</dt><dd className="vt-num">{fm(resultat.autres_encaissements)}</dd></div>
            </dl>
          </div>
          <div className="vt-modal-foot vt-modal-foot--end">
            <button type="button" className="vt-btn" onClick={() => setResultat(null)}>Fermer</button>
            <button type="button" className="vt-btn vt-btn--primary" onClick={() => setZAImprimer(resultat)}>
              <Printer size={16} /> Imprimer le Z de caisse
            </button>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL : DÉTAIL D'UNE JOURNÉE (historique)
          ============================================================ */}
      {detail && !zAImprimer && (
        <Modal size="lg" labelledBy="cs-det-title" onClose={() => setDetail(null)}>
          <ModalHead id="cs-det-title" title={`Caisse du ${dateHeure(detail.session.date_ouverture).slice(0, 10)}`}
                     sub={`${heure(detail.session.date_ouverture)} → ${detail.session.date_cloture ? heure(detail.session.date_cloture) : 'en cours'} · ouverte par ${detail.session.ouvert_par_nom || '-'}`}
                     onClose={() => setDetail(null)}>
            {detail.session.statut === 'cloturee' && <div className="vt-head-tags"><EcartTag ecart={detail.session.ecart} /></div>}
          </ModalHead>
          <div className="vt-modal-body">
            <dl className="vt-facts cs-det-facts">
              <div><dt>Fond</dt><dd className="vt-num">{fm(detail.session.fond_initial)}</dd></div>
              <div><dt>+ Espèces</dt><dd className="vt-num">{fm(detail.session.especes_encaissees)}</dd></div>
              <div><dt>− Dépenses</dt><dd className="vt-num">{fm(detail.session.depenses_especes)}</dd></div>
              <div><dt>Attendu</dt><dd className="vt-num">{fm(detail.session.montant_theorique)}</dd></div>
              {detail.session.statut === 'cloturee' && <div><dt>Compté</dt><dd className="vt-num">{fm(detail.session.montant_compte)}</dd></div>}
            </dl>
            {detail.session.note_cloture && <p className="cs-note-aff"><strong>Explication :</strong> {detail.session.note_cloture}</p>}
            <h3 className="vt-section-title">Mouvements</h3>
            <Mouvements mouvements={detail.mouvements || []} especesSeulement={false} />
          </div>
          <div className="vt-modal-foot vt-modal-foot--end">
            <button type="button" className="vt-btn" onClick={() => setDetail(null)}>Fermer</button>
            {detail.session.statut === 'cloturee' && (
              <button type="button" className="vt-btn vt-btn--primary" onClick={() => setZAImprimer(detail.session)}>
                <Printer size={16} /> Imprimer le Z
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* ---------- Aperçu + impression du Z (ticket 80 mm) ---------- */}
      {zAImprimer && (
        <ApercuImpression
          titre="Z de caisse"
          sousTitre={`Session n° ${zAImprimer.id_session} · ${dateHeure(zAImprimer.date_cloture)}`}
          etroit
          getBlob={() => pdf(React.createElement(RapportCaissePDF, { data: { session: zAImprimer, magasin } })).toBlob()}
          fileName={`Z_caisse_${zAImprimer.id_session}.pdf`}
          printOptions={(taille) => FacturePDFService.optionsTicketElectron(taille)}
          onClose={() => setZAImprimer(null)}
          onPrinted={() => showToast('Z de caisse imprimé')}
        />
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
