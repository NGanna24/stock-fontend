// pages/Relances/Relances.jsx
//
// Relances clients : qui vous doit de l'argent, depuis quand, et un rappel en un clic.
//   - le message est préparé par Miyo (modifiable), puis WhatsApp (ou l'application SMS)
//     s'ouvre avec le texte déjà rempli : il ne reste qu'à appuyer sur « Envoyer » ;
//   - chaque relance est enregistrée (qui, quand, par quel moyen, pour quel montant)
//     pour éviter de relancer deux fois le même client le même jour.
// Droits : admin, manager, caissier.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshCw, X, AlertTriangle, BellRing, Eye, MessageCircle, MessageSquare, Phone, Copy, Loader,
  ChevronLeft, ChevronRight, Info, CheckCircle,
} from 'lucide-react';
import RelanceService from '../../services/relanceService';
import { useUser } from '../../context/AuthContext';
import '../Ventes/Ventes.css';
import './Relances.css';

// ============================================================
// HELPERS
// ============================================================
const NBSP = ' ';
const montant = (v) => Math.round(Math.abs(Number(v) || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
const fm = (v) => `${montant(v)}${NBSP}FCFA`;
const pad = (n) => String(n).padStart(2, '0');
const jourISO = (d) => {
  if (!d) return null;
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const x = new Date(d);
  return isNaN(x) ? null : `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
const dateFR = (d) => { const j = jourISO(d); if (!j) return '-'; const [y, m, dd] = j.split('-'); return `${dd}/${m}/${y}`; };
const dateCourte = (d) => { const j = jourISO(d); if (!j) return '-'; const [, m, dd] = j.split('-'); return `${dd}/${m}`; };
const dateHeure = (d) => {
  const x = new Date(d);
  return isNaN(x) ? '-' : `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()} à ${pad(x.getHours())}:${pad(x.getMinutes())}`;
};
const joursDepuis = (d) => {
  const x = new Date(d);
  if (isNaN(x)) return null;
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(x); b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / 86400000);
};
const ilYa = (d) => {
  const j = joursDepuis(d);
  if (j === null) return '-';
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return 'hier';
  return `il y a ${j} jours`;
};
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const prenom = (nom) => String(nom || '').trim().split(/\s+/)[0] || '';

/**
 * Numéro au format international sans « + » (pour wa.me et sms:).
 * Côte d'Ivoire par défaut : 07 07 08 09 10 → 2250707080910
 */
export const numeroInternational = (tel) => {
  let d = String(tel || '').trim();
  const plus = d.startsWith('+');
  d = d.replace(/\D/g, '');
  if (!d) return '';
  if (plus) return d;
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('225') && d.length >= 11) return d;
  if (d.length === 10 || d.length === 8) return `225${d}`;
  return d;
};

const CANAUX = {
  whatsapp: { label: 'WhatsApp', Icon: MessageCircle },
  sms: { label: 'SMS', Icon: MessageSquare },
  appel: { label: 'Appel', Icon: Phone },
  autre: { label: 'Autre', Icon: BellRing },
};

// ============================================================
// MODÈLES DE MESSAGE
// ============================================================
const MODELES = [
  { id: 'rappel', label: 'Rappel courtois' },
  { id: 'retard', label: 'Échéance dépassée' },
  { id: 'ferme', label: 'Dernier rappel' },
];

const construireMessage = (modele, client, factures, magasin) => {
  const nom = prenom(client.nomclient) || 'cher client';
  const boutique = magasin?.nom || 'notre boutique';
  const contact = magasin?.telephone ? ` au ${magasin.telephone}` : '';
  const total = fm(client.total_du);
  const n = factures.length;
  const liste = factures.slice(0, 5).map((f) => `• ${f.numero_facture} du ${dateCourte(f.date_facture)} : ${fm(f.reste)}`).join('\n');
  const suite = n > 5 ? `\n• … et ${n - 5} autre${n - 5 > 1 ? 's' : ''}` : '';
  const detail = n ? `\n\n${liste}${suite}` : '';
  const retard = factures.filter((f) => f.jours_retard > 0);
  const plusAncienne = retard.length ? retard[0] : null;

  if (modele === 'ferme') {
    return `Bonjour ${nom},\n\nMalgré nos précédents rappels, la somme de ${total} reste due à ${boutique}${plusAncienne ? `, dont une partie depuis le ${dateFR(plusAncienne.date_echeance)}` : ''}.${detail}\n\nMerci de régler cette somme au plus vite ou de nous contacter${contact} pour convenir d'une solution.\n\n${boutique}`;
  }
  if (modele === 'retard') {
    return `Bonjour ${nom},\n\nSauf erreur de notre part, ${n > 1 ? `${n} factures restent` : 'une facture reste'} à régler chez ${boutique}, pour un total de ${total}${plusAncienne ? ` (échéance dépassée depuis le ${dateFR(plusAncienne.date_echeance)})` : ''}.${detail}\n\nMerci de passer nous voir ou de nous contacter${contact}. Si le paiement a déjà été fait, ne tenez pas compte de ce message.\n\nMerci et bonne journée,\n${boutique}`;
  }
  return `Bonjour ${nom},\n\nC'est ${boutique}. Petit rappel : il reste ${total} à régler sur ${n > 1 ? `vos ${n} achats` : 'votre achat'}.${detail}\n\nVous pouvez passer à la boutique ou nous joindre${contact}. Merci pour votre confiance !`;
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

const Retard = ({ jours, echeance }) => (jours > 0
  ? <span className="rl-retard" data-r={jours > 30 ? 'fort' : 'oui'}>{jours} jour{jours > 1 ? 's' : ''} de retard</span>
  : <span className="rl-retard" data-r="non">Échéance le {dateFR(echeance)}</span>);

const DerniereRelance = ({ c }) => {
  if (!c.derniere_relance) return <span className="vt-muted">Jamais relancé</span>;
  const C = CANAUX[c.dernier_canal] || CANAUX.autre;
  return (
    <>
      <div className="rl-last"><C.Icon size={13} /> {ilYa(c.derniere_relance)}</div>
      <div className="vt-cell-sub">{[c.dernier_par, `${c.nb_relances} relance${c.nb_relances > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}</div>
    </>
  );
};

// ============================================================
// MODAL : RELANCER UN CLIENT
// ============================================================
function ModalRelance({ token, client, onClose, onRelance }) {
  const [detail, setDetail] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [modele, setModele] = useState(client.du_en_retard > 0.009 ? (client.nb_relances >= 2 ? 'ferme' : 'retard') : 'rappel');
  const [message, setMessage] = useState('');
  const [modifie, setModifie] = useState(false);
  const [envoi, setEnvoi] = useState(null); // canal en cours d'enregistrement
  const [noteAppel, setNoteAppel] = useState('');
  const [modeAppel, setModeAppel] = useState(false);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    let actif = true;
    RelanceService.client(token, client.telephone)
      .then((res) => { if (actif) setDetail(res.data); })
      .catch((e) => { if (actif) setErreur(e.message || 'Impossible de charger les factures du client'); })
      .finally(() => { if (actif) setChargement(false); });
    return () => { actif = false; };
  }, [token, client.telephone]);

  // (Re)génère le message tant que l'utilisateur ne l'a pas modifié à la main
  useEffect(() => {
    if (!detail || modifie) return;
    setMessage(construireMessage(modele, { ...client, total_du: detail.total_du }, detail.factures, detail.magasin));
  }, [detail, modele, client, modifie]);

  const numero = numeroInternational(client.telephone);
  const recent = detail?.relances?.[0];
  const relanceRecente = recent && joursDepuis(recent.date_relance) !== null && joursDepuis(recent.date_relance) < 2;

  const enregistrer = async (canal, note = null) => {
    setEnvoi(canal);
    setErreur(null);
    try {
      await RelanceService.enregistrer(token, { telephone: client.telephone, canal, message: canal === 'appel' ? null : message, note });
      onRelance(canal);
    } catch (e) {
      setErreur(e.message || "La relance n'a pas pu être enregistrée");
      setEnvoi(null);
    }
  };

  // On ouvre WhatsApp / SMS AVANT l'appel serveur (sinon le navigateur bloque la fenêtre)
  const ouvrirWhatsApp = () => {
    if (!message.trim() || envoi) return;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    enregistrer('whatsapp');
  };
  const ouvrirSMS = () => {
    if (!message.trim() || envoi) return;
    const a = document.createElement('a');
    a.href = `sms:+${numero}?body=${encodeURIComponent(message)}`;
    a.click();
    enregistrer('sms');
  };
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setErreur('Copie impossible : sélectionnez le texte et copiez-le à la main.');
    }
  };

  return (
    <Modal size="md" labelledBy="rl-rel-title" onClose={onClose} dismissable={!envoi} busy={chargement || !!envoi}>
      <ModalHead id="rl-rel-title" title={`Relancer ${client.nomclient || 'le client'}`}
                 sub={`${client.telephone} · ${fm(detail?.total_du ?? client.total_du)} à régler`} onClose={onClose} disabled={!!envoi} />
      <div className="vt-modal-body">
        {relanceRecente && (
          <p className="rl-avert"><Info size={15} /> Déjà relancé {ilYa(recent.date_relance)} par {recent.par_nom || 'un membre de l\'équipe'} ({(CANAUX[recent.canal] || CANAUX.autre).label}). Laissez-lui un peu de temps avant de le relancer à nouveau.</p>
        )}
        {erreur && <div className="vt-error" role="alert"><AlertTriangle size={16} /><span>{erreur}</span></div>}

        {modeAppel ? (
          <div className="vt-field">
            <label htmlFor="rl-note">Ce que le client a répondu (facultatif)</label>
            <input id="rl-note" className="vt-input" maxLength={255} value={noteAppel} autoFocus
                   placeholder="Ex. : promet de passer payer samedi" onChange={(e) => setNoteAppel(e.target.value)} />
            <p className="vt-hint">L'appel sera noté dans l'historique des relances de ce client.</p>
          </div>
        ) : (
          <>
            <div className="vt-seg rl-modeles" role="group" aria-label="Modèle de message">
              {MODELES.map((m) => (
                <button key={m.id} type="button" aria-pressed={modele === m.id}
                        onClick={() => { setModele(m.id); setModifie(false); }}>{m.label}</button>
              ))}
            </div>
            <div className="vt-field">
              <label htmlFor="rl-msg" className="rl-msg-label">
                Message <span className="vt-muted">{modifie ? '· modifié par vous' : '· vous pouvez le modifier'}</span>
              </label>
              {chargement && !detail ? (
                <div className="rl-msg rl-msg--skel"><span className="vt-skel" style={{ width: '70%' }} /><span className="vt-skel" style={{ width: '90%' }} /><span className="vt-skel" style={{ width: '50%' }} /></div>
              ) : (
                <textarea id="rl-msg" className="vt-input rl-msg" rows={10} value={message} maxLength={2000}
                          onChange={(e) => { setMessage(e.target.value); setModifie(true); }} />
              )}
            </div>
            {!numero && <p className="rl-avert"><AlertTriangle size={15} /> Le numéro de ce client semble invalide : vérifiez-le dans ses ventes.</p>}
          </>
        )}
      </div>
      <div className="vt-modal-foot rl-foot">
        {modeAppel ? (
          <>
            <button type="button" className="vt-btn" onClick={() => setModeAppel(false)} disabled={!!envoi}>Retour</button>
            <button type="button" className="vt-btn vt-btn--primary" onClick={() => enregistrer('appel', noteAppel.trim() || null)} disabled={!!envoi}>
              {envoi === 'appel' ? <Loader size={16} className="vt-spin" /> : <Phone size={16} />} Noter l'appel
            </button>
          </>
        ) : (
          <>
            <div className="rl-foot-left">
              <button type="button" className="vt-btn vt-btn--sm" onClick={copier} disabled={!message || !!envoi}>
                {copie ? <CheckCircle size={14} /> : <Copy size={14} />} {copie ? 'Copié' : 'Copier'}
              </button>
              <button type="button" className="vt-btn vt-btn--sm" onClick={() => setModeAppel(true)} disabled={!!envoi || !detail}>
                <Phone size={14} /> J'ai appelé
              </button>
            </div>
            <button type="button" className="vt-btn" onClick={ouvrirSMS} disabled={!message.trim() || !numero || !!envoi || !detail}>
              {envoi === 'sms' ? <Loader size={16} className="vt-spin" /> : <MessageSquare size={16} />} SMS
            </button>
            <button type="button" className="vt-btn rl-btn-wa" onClick={ouvrirWhatsApp} disabled={!message.trim() || !numero || !!envoi || !detail}>
              {envoi === 'whatsapp' ? <Loader size={16} className="vt-spin" /> : <MessageCircle size={16} />} Ouvrir WhatsApp
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

// ============================================================
// MODAL : DÉTAIL D'UN CLIENT
// ============================================================
function ModalDetail({ token, client, version, onClose, onRelancer }) {
  const [detail, setDetail] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    let actif = true;
    RelanceService.client(token, client.telephone)
      .then((res) => { if (actif) setDetail(res.data); })
      .catch((e) => { if (actif) setErreur(e.message || 'Impossible de charger le client'); });
    return () => { actif = false; };
  }, [token, client.telephone, version]);

  const factures = detail?.factures || [];
  const relances = detail?.relances || [];

  return (
    <Modal size="lg" labelledBy="rl-det-title" onClose={onClose} busy={!detail && !erreur}>
      <ModalHead id="rl-det-title" title={client.nomclient || 'Client'} sub={client.telephone} onClose={onClose} />
      <div className="vt-modal-body">
        {erreur && <div className="vt-error" role="alert"><AlertTriangle size={16} /><span>{erreur}</span></div>}
        <dl className="vt-facts rl-facts">
          <div><dt>Reste à régler</dt><dd className="rl-du">{fm(detail?.total_du ?? client.total_du)}</dd></div>
          <div><dt>Factures non soldées</dt><dd>{detail ? factures.length : client.nb_factures}</dd></div>
          <div><dt>Plus ancien retard</dt><dd>{client.jours_retard > 0 ? `${client.jours_retard} jours` : 'Aucun'}</dd></div>
          <div><dt>Relances</dt><dd>{detail ? relances.length : client.nb_relances}</dd></div>
        </dl>

        <h3 className="vt-section-title">Factures à régler</h3>
        <div className="vt-table-wrap rl-sub">
          <table className="vt-table rl-sub-table">
            <thead>
              <tr>
                <th>Facture</th>
                <th className="rl-col-hide">Date</th>
                <th>Échéance</th>
                <th className="vt-th-right rl-col-hide">Total</th>
                <th className="vt-th-right rl-col-hide">Déjà payé</th>
                <th className="vt-th-right">Reste</th>
              </tr>
            </thead>
            <tbody>
              {!detail && !erreur
                ? <tr className="vt-skel-row"><td colSpan={6}><span className="vt-skel" style={{ width: '60%' }} /></td></tr>
                : factures.map((f) => (
                    <tr key={f.id_facture}>
                      <td><div className="vt-cell-main">{f.numero_facture}</div><div className="vt-cell-sub">{f.numero_commande}</div></td>
                      <td className="vt-num rl-col-hide">{dateFR(f.date_facture)}</td>
                      <td><Retard jours={f.jours_retard} echeance={f.date_echeance} /></td>
                      <td className="vt-td-right vt-num rl-col-hide">{fm(f.montant_total)}</td>
                      <td className="vt-td-right vt-num rl-col-hide">{f.paye > 0 ? fm(f.paye) : '-'}</td>
                      <td className="vt-td-right vt-num"><strong>{fm(f.reste)}</strong></td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {detail && factures.length === 0 && (
            <div className="vt-empty"><CheckCircle size={26} /><p className="vt-empty-title">Ce client ne doit plus rien</p></div>
          )}
        </div>

        <h3 className="vt-section-title rl-gap">Historique des relances</h3>
        {detail && relances.length === 0 && <p className="vt-muted rl-none">Ce client n'a encore jamais été relancé.</p>}
        {relances.length > 0 && (
          <ol className="rl-histo">
            {relances.map((r) => {
              const C = CANAUX[r.canal] || CANAUX.autre;
              return (
                <li key={r.id_relance}>
                  <span className="rl-histo-ico" data-c={r.canal}><C.Icon size={14} /></span>
                  <div>
                    <div className="rl-histo-main">
                      <strong>{C.label}</strong> par {r.par_nom || '-'} · {dateHeure(r.date_relance)}
                    </div>
                    <div className="vt-cell-sub">
                      Dû à ce moment : {fm(r.montant_du)} ({r.nb_factures} facture{r.nb_factures > 1 ? 's' : ''})
                      {r.note ? ` · « ${r.note} »` : ''}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <div className="vt-modal-foot vt-modal-foot--end">
        <button type="button" className="vt-btn" onClick={onClose}>Fermer</button>
        {factures.length > 0 && (
          <button type="button" className="vt-btn rl-btn-wa" onClick={onRelancer}><BellRing size={16} /> Relancer</button>
        )}
      </div>
    </Modal>
  );
}

// ============================================================
// PAGE
// ============================================================
const PAR_PAGE = 25;
const FILTRES = [
  { id: 'tous', label: 'À recouvrer', data: 'all' },
  { id: 'retard', label: 'En retard', data: 'retard' },
  { id: 'jamais', label: 'Jamais relancés', data: 'jamais' },
  { id: 'recents', label: 'Relancés cette semaine', data: 'recents' },
];

export default function Relances() {
  const { user } = useUser();
  const token = localStorage.getItem('token');
  const autorise = ['admin', 'manager', 'caissier'].includes(user?.role);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtre, setFiltre] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);
  const [aRelancer, setARelancer] = useState(null);
  const [enDetail, setEnDetail] = useState(null);
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const charger = useCallback(async () => {
    if (!autorise) return;
    setLoading(true);
    setError(null);
    try {
      const res = await RelanceService.liste(token);
      setData(res.data);
    } catch (e) {
      setError(e.message || 'Impossible de charger les clients à relancer');
    } finally {
      setLoading(false);
    }
  }, [autorise, token]);

  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { setPage(1); }, [filtre, recherche]);

  const clients = useMemo(() => data?.clients || [], [data]);
  const test = useMemo(() => ({
    tous: () => true,
    retard: (c) => c.du_en_retard > 0.009,
    jamais: (c) => !c.derniere_relance,
    recents: (c) => c.derniere_relance && joursDepuis(c.derniere_relance) < 7,
  }), []);
  const compte = (id) => clients.filter(test[id]).length;

  const filtres = useMemo(() => {
    const q = norm(recherche.trim());
    const qChiffres = recherche.replace(/\D/g, '');
    return clients.filter((c) => {
      if (!test[filtre](c)) return false;
      if (!q) return true;
      return norm(c.nomclient).includes(q) || (qChiffres.length >= 3 && String(c.telephone).replace(/\D/g, '').includes(qChiffres));
    });
  }, [clients, filtre, recherche, test]);

  const nbPages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const pageCourante = Math.min(page, nbPages);
  const visibles = filtres.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);
  const totaux = data?.totaux || { total_du: 0, du_en_retard: 0, nb_clients: 0, nb_en_retard: 0, sans_telephone: { nb_factures: 0, montant: 0 } };

  const apresRelance = (canal) => {
    const nom = aRelancer?.nomclient || 'le client';
    setARelancer(null);
    setVersion((v) => v + 1);
    showToast(canal === 'appel' ? `Appel à ${nom} noté` : `Relance de ${nom} enregistrée (${CANAUX[canal].label})`);
    charger();
  };

  if (!autorise) {
    return (
      <div className="ventes-container vt rl">
        <div className="vt-empty">
          <BellRing size={30} />
          <p className="vt-empty-title">Accès réservé</p>
          <p className="vt-empty-text">Les relances clients sont faites par l'administrateur, les managers et les caissiers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ventes-container vt rl">
      <header className="vt-head">
        <div>
          <h1 className="vt-title">Relances clients</h1>
          <p className="vt-sub">Les clients qui vous doivent de l'argent, et un rappel en un clic par WhatsApp ou SMS</p>
        </div>
        <div className="vt-head-actions">
          <button type="button" className="vt-btn vt-btn--icon" onClick={charger} disabled={loading} aria-label="Rafraîchir" title="Rafraîchir">
            <RefreshCw size={16} className={loading ? 'vt-spin' : ''} />
          </button>
        </div>
      </header>

      <section className="vt-overview" aria-label="Synthèse">
        <div className="vt-ca">
          <span className="vt-label">À recouvrer</span>
          <strong className="vt-ca-value vt-num">{fm(totaux.total_du)}</strong>
          <span className="vt-ca-note">
            {totaux.du_en_retard > 0.009 ? `dont ${fm(totaux.du_en_retard)} en retard` : 'Aucun retard de paiement'}
          </span>
        </div>
        <div className="vt-rail" role="group" aria-label="Filtrer les clients">
          {FILTRES.map((f) => (
            <button key={f.id} type="button" className="vt-stage" data-r={f.data} aria-pressed={filtre === f.id}
                    onClick={() => setFiltre(filtre === f.id && f.id !== 'tous' ? 'tous' : f.id)}>
              <span className="vt-stage-count vt-num">{compte(f.id)}</span>
              <span className="vt-stage-label">{f.id === 'tous' ? `Client${compte('tous') > 1 ? 's' : ''} à recouvrer` : f.label}</span>
            </button>
          ))}
        </div>
      </section>

      {totaux.sans_telephone.nb_factures > 0 && (
        <p className="rl-info">
          <Info size={15} />
          <span>
            {totaux.sans_telephone.nb_factures} facture{totaux.sans_telephone.nb_factures > 1 ? 's' : ''} non soldée{totaux.sans_telephone.nb_factures > 1 ? 's' : ''} ({fm(totaux.sans_telephone.montant)}) sans numéro de téléphone : impossible de les relancer d'ici. Pensez à toujours saisir le téléphone du client lors d'une vente à crédit.
          </span>
        </p>
      )}

      <div className="vt-toolbar">
        <div className="vt-search rl-search">
          <input type="text" className="vt-input vt-search-input" placeholder="Nom ou téléphone du client"
                 aria-label="Rechercher un client" value={recherche} onChange={(e) => setRecherche(e.target.value)} spellCheck={false} />
          {recherche && <button type="button" className="vt-search-clear" onClick={() => setRecherche('')} aria-label="Effacer"><X size={14} /></button>}
        </div>
        <span className="vt-count">{filtres.length} client{filtres.length > 1 ? 's' : ''}</span>
      </div>

      {error && !loading && (
        <div className="vt-error" role="alert">
          <AlertTriangle size={16} /><span>{error}</span>
          <button type="button" className="vt-btn vt-btn--sm" onClick={charger}>Réessayer</button>
        </div>
      )}

      <div className="vt-table-wrap rl-wrap" aria-busy={loading || undefined}>
        {loading && data && <div className="vt-busybar" />}
        <table className="vt-table rl-table">
          <thead>
            <tr>
              <th>Client</th>
              <th className="vt-th-right">Reste à régler</th>
              <th className="rl-col-hide">Retard</th>
              <th className="rl-col-hide">Dernière relance</th>
              <th className="vt-th-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="vt-skel-row" aria-hidden="true">
                    {[60, 50, 50, 50, 40].map((w, k) => <td key={k}><span className="vt-skel" style={{ width: `${w}%` }} /></td>)}
                  </tr>
                ))
              : visibles.map((c) => (
                  <tr key={c.telephone}>
                    <td>
                      <button type="button" className="vt-link vt-cell-main" onClick={() => setEnDetail(c)}>{c.nomclient || 'Client sans nom'}</button>
                      <div className="vt-cell-sub">{c.telephone}</div>
                    </td>
                    <td className="vt-td-right">
                      <div className="vt-num rl-du">{fm(c.total_du)}</div>
                      <div className="vt-cell-sub">
                        {c.nb_factures} facture{c.nb_factures > 1 ? 's' : ''}
                        {c.du_en_retard > 0.009 && c.du_en_retard < c.total_du - 0.009 ? ` · ${fm(c.du_en_retard)} en retard` : ''}
                      </div>
                    </td>
                    <td className="rl-col-hide"><Retard jours={c.jours_retard} echeance={c.plus_ancienne_echeance} /></td>
                    <td className="rl-col-hide"><DerniereRelance c={c} /></td>
                    <td className="vt-td-right">
                      <div className="vt-actions">
                        <button type="button" className="vt-btn vt-btn--sm rl-btn-wa" onClick={() => setARelancer(c)}
                                aria-label={`Relancer ${c.nomclient || 'ce client'}`}>
                          <MessageCircle size={14} /><span className="rl-wa-txt"> Relancer</span>
                        </button>
                        <button type="button" className="vt-iconbtn vt-iconbtn--sm" onClick={() => setEnDetail(c)} aria-label={`Détail de ${c.nomclient || 'ce client'}`}>
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && visibles.length === 0 && (
          <div className="vt-empty">
            <CheckCircle size={30} />
            <p className="vt-empty-title">
              {clients.length === 0 ? 'Aucun client ne vous doit d\'argent' : 'Aucun client ne correspond'}
            </p>
            <p className="vt-empty-text">
              {clients.length === 0
                ? 'Les ventes non soldées (à crédit ou payées en partie) apparaîtront ici.'
                : 'Modifiez la recherche ou le filtre.'}
            </p>
            {clients.length > 0 && filtre !== 'tous' && (
              <button type="button" className="vt-btn vt-btn--sm" onClick={() => setFiltre('tous')}>Voir tous les clients</button>
            )}
          </div>
        )}
      </div>

      {filtres.length > PAR_PAGE && (
        <nav className="vt-pager" aria-label="Pagination">
          <span className="vt-pager-info">{filtres.length} clients</span>
          <div className="vt-pager-ctrl">
            <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage(pageCourante - 1)} disabled={pageCourante === 1} aria-label="Page précédente"><ChevronLeft size={18} /></button>
            <span className="vt-pager-page">Page {pageCourante} sur {nbPages}</span>
            <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage(pageCourante + 1)} disabled={pageCourante === nbPages} aria-label="Page suivante"><ChevronRight size={18} /></button>
          </div>
        </nav>
      )}

      {enDetail && !aRelancer && (
        <ModalDetail token={token} client={enDetail} version={version} onClose={() => setEnDetail(null)}
                     onRelancer={() => setARelancer(clients.find((c) => c.telephone === enDetail.telephone) || enDetail)} />
      )}
      {aRelancer && <ModalRelance token={token} client={aRelancer} onClose={() => setARelancer(null)} onRelance={apresRelance} />}

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
