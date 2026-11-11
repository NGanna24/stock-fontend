// pages/Clients/ClientDetail.jsx
//
// Fiche client : coordonnées, ce qu'il doit (et son plafond), ses ventes, ses produits préférés,
// les relances faites. Relevé de compte (PDF / impression / WhatsApp), modification, fusion d'un
// doublon et désactivation (admin, manager).
// L'adresse /clients/:telephone accepte l'id du client OU son téléphone (anciens liens).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { 
  ArrowLeft, Pencil, FileText, MessageCircle, X, AlertTriangle, Loader, Merge, UserX, UserCheck,
  ShoppingBag, Package, BellRing, StickyNote, MapPin, Phone, Search, Printer,
} from 'lucide-react';
import ClientService from '../../services/clientService';
import MagasinService from '../../services/magasinService';
import ModalClient from '../../components/Clients/ModalClient';
import RelevePDF from '../../components/Clients/RelevePDF';
import ApercuImpression from '../../components/Impression/ApercuImpression';
import { TypeTag, Doit } from './Clients';
import { useUser } from '../../context/AuthContext';
import '../Ventes/Ventes.css';
import './Clients.css';

const NBSP = ' ';
const fm = (v) => `${Number(v) < 0 ? '−' : ''}${Math.round(Math.abs(Number(v) || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)}${NBSP}FCFA`;
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateFR = (s) => { if (!s) return '-'; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
const numeroWa = (tel) => {
  let d = String(tel || '').trim();
  const plus = d.startsWith('+');
  d = d.replace(/\D/g, '');
  if (!d) return '';
  if (plus) return d;
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('225') && d.length >= 11) return d;
  return d.length === 10 || d.length === 8 ? `225${d}` : d;
};
const CANAUX = { whatsapp: 'WhatsApp', sms: 'SMS', appel: 'Appel', autre: 'Autre' };

const PERIODES_RELEVE = [
  { id: 'mois', label: 'Ce mois' },
  { id: '3mois', label: '3 derniers mois' },
  { id: 'annee', label: 'Cette année' },
  { id: 'tout', label: 'Tout' },
];
const bornesReleve = (id) => {
  const n = new Date();
  if (id === 'mois') return { dateDebut: iso(new Date(n.getFullYear(), n.getMonth(), 1)), dateFin: iso(n) };
  if (id === '3mois') return { dateDebut: iso(new Date(n.getFullYear(), n.getMonth() - 2, 1)), dateFin: iso(n) };
  if (id === 'annee') return { dateDebut: `${n.getFullYear()}-01-01`, dateFin: iso(n) };
  return {};
};

const StatutVente = ({ v }) => {
  if (v.annulee) return <span className="cl-st" data-s="annulee">Annulée</span>;
  if (v.reste <= 0.009) return <span className="cl-st" data-s="payee">Payée</span>;
  if (v.paye > 0.009) return <span className="cl-st" data-s="partielle">Reste {fm(v.reste)}</span>;
  return <span className="cl-st" data-s="due">Non payée</span>;
};

// ------------------------------------------------------------
// Petite modale générique
// ------------------------------------------------------------
let lockDepth = 0;
const Modal = ({ onClose, size = 'md', busy, labelledBy, children }) => {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (lockDepth++ === 0) document.body.style.overflow = 'hidden';
    ref.current?.focus({ preventScroll: true });
    const onKey = (e) => { if (e.key === 'Escape' && !e.defaultPrevented) onCloseRef.current?.(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      lockDepth = Math.max(0, lockDepth - 1);
      if (lockDepth === 0) document.body.style.overflow = '';
    };
  }, []);
  return (
    <div className="vt-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCloseRef.current?.(); }}>
      <div ref={ref} className={`vt-modal vt-modal--${size}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}>
        {busy && <div className="vt-busybar" />}
        {children}
      </div>
    </div>
  );
};
const Head = ({ id, title, sub, onClose }) => (
  <div className="vt-modal-head">
    <div className="vt-modal-titles">
      <h2 id={id} className="vt-modal-title">{title}</h2>
      {sub && <p className="vt-modal-sub">{sub}</p>}
    </div>
    <button type="button" className="vt-iconbtn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
  </div>
);

// ------------------------------------------------------------
// Relevé de compte
// ------------------------------------------------------------
function ModalReleve({ token, client, magasin, onClose }) {
  const [periode, setPeriode] = useState('3mois');
  const [releve, setReleve] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [apercu, setApercu] = useState(false);

  useEffect(() => {
    let actif = true;
    setReleve(null);
    setErreur(null);
    ClientService.releve(token, client.id_client, bornesReleve(periode))
      .then((r) => { if (actif) setReleve(r.data); })
      .catch((e) => { if (actif) setErreur(e.message || 'Impossible de calculer le relevé'); });
    return () => { actif = false; };
  }, [token, client.id_client, periode]);

  const nomMagasin = magasin?.nom_commercial || magasin?.nom || '';
  const message = releve ? [
    `Bonjour ${String(client.nom).split(/\s+/)[0]},`,
    '',
    `Voici votre relevé de compte${nomMagasin ? ` chez ${nomMagasin}` : ''}${releve.periode?.debut ? ` du ${dateFR(releve.periode.debut)} au ${dateFR(releve.periode.fin)}` : ''} :`,
    `• Solde au début : ${fm(releve.solde_ouverture)}`,
    `• Achats : ${fm(releve.total_debit)}`,
    `• Paiements : ${fm(releve.total_credit)}`,
    releve.solde_cloture >= 0 ? `• Reste à payer : ${fm(releve.solde_cloture)}` : `• Votre avance : ${fm(-releve.solde_cloture)}`,
    '',
    'Merci pour votre confiance.',
  ].join('\n') : '';

  if (apercu && releve) {
    return (
      <ApercuImpression
        titre="Relevé de compte"
        sousTitre={client.nom}
        typeDocument="releve_client"
        getBlob={() => pdf(React.createElement(RelevePDF, { data: releve, magasin })).toBlob()}
        fileName={`releve_${String(client.nom).replace(/[^\w-]+/g, '_')}.pdf`}
        onClose={() => setApercu(false)}
      />
    );
  }

  return (
    <Modal size="lg" labelledBy="cl-rel-title" onClose={onClose} busy={!releve && !erreur}>
      <Head id="cl-rel-title" title="Relevé de compte" sub={client.nom} onClose={onClose} />
      <div className="vt-modal-body">
        <div className="vt-seg cl-seg cl-releve-seg" role="group" aria-label="Période">
          {PERIODES_RELEVE.map((p) => <button key={p.id} type="button" aria-pressed={periode === p.id} onClick={() => setPeriode(p.id)}>{p.label}</button>)}
        </div>
        {erreur && <div className="vt-error" role="alert"><AlertTriangle size={16} /><span>{erreur}</span></div>}
        {releve && (
          <>
            <dl className="vt-facts cl-facts">
              <div><dt>Solde au début</dt><dd className="vt-num">{fm(releve.solde_ouverture)}</dd></div>
              <div><dt>Achats</dt><dd className="vt-num">{fm(releve.total_debit)}</dd></div>
              <div><dt>Paiements</dt><dd className="vt-num">{fm(releve.total_credit)}</dd></div>
              <div><dt>{releve.solde_cloture >= 0 ? 'Reste à payer' : 'Avance du client'}</dt><dd className="vt-num cl-solde">{fm(Math.abs(releve.solde_cloture))}</dd></div>
            </dl>
            <div className="vt-table-wrap cl-sub-wrap">
              <table className="vt-table cl-sub-table">
                <thead><tr><th>Date</th><th>Opération</th><th className="vt-th-right">Achat</th><th className="vt-th-right">Paiement</th><th className="vt-th-right">Solde</th></tr></thead>
                <tbody>
                  {releve.lignes.map((l, i) => (
                    <tr key={i}>
                      <td className="vt-num">{dateFR(l.date)}</td>
                      <td>{l.type === 'vente' ? 'Achat' : l.type === 'remboursement' ? 'Remboursement' : 'Paiement'} <span className="vt-muted">{l.reference}</span></td>
                      <td className="vt-td-right vt-num">{l.debit ? fm(l.debit) : ''}</td>
                      <td className="vt-td-right vt-num">{l.credit ? fm(l.credit) : ''}</td>
                      <td className="vt-td-right vt-num"><strong>{fm(l.solde)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {releve.lignes.length === 0 && <p className="vt-muted cl-vide">Aucune opération sur cette période.</p>}
            </div>
          </>
        )}
      </div>
      <div className="vt-modal-foot vt-modal-foot--end">
        <button type="button" className="vt-btn" onClick={onClose}>Fermer</button>
        {client.telephone && (
          <a className={`vt-btn cl-btn-wa ${!releve ? 'is-disabled' : ''}`} target="_blank" rel="noopener noreferrer"
             href={releve ? `https://wa.me/${numeroWa(client.telephone)}?text=${encodeURIComponent(message)}` : undefined}>
            <MessageCircle size={16} /> Envoyer par WhatsApp
          </a>
        )}
        <button type="button" className="vt-btn vt-btn--primary" onClick={() => setApercu(true)} disabled={!releve}>
          <Printer size={16} /> Imprimer / PDF
        </button>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------
// Fusion d'un doublon
// ------------------------------------------------------------
function ModalFusion({ token, client, onClose, onFusion }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  const [choix, setChoix] = useState(null);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return undefined; }
    const t = setTimeout(() => {
      ClientService.search(token, q.trim(), 15)
        .then((r) => setRes((r.data || []).filter((c) => c.id_client !== client.id_client)))
        .catch(() => setRes([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, token, client.id_client]);

  const fusionner = async () => {
    setSaving(true);
    setErreur(null);
    try {
      const r = await ClientService.fusionner(token, client.id_client, choix.id_client);
      onFusion(r.message);
    } catch (e) {
      setErreur(e.message || 'Fusion impossible');
      setSaving(false);
    }
  };

  return (
    <Modal size="md" labelledBy="cl-fus-title" onClose={() => !saving && onClose()} busy={saving}>
      <Head id="cl-fus-title" title="Fusionner un doublon" sub={`Garder la fiche « ${client.nom} »`} onClose={() => !saving && onClose()} />
      <div className="vt-modal-body">
        {erreur && <div className="vt-error" role="alert"><AlertTriangle size={16} /><span>{erreur}</span></div>}
        {!choix ? (
          <>
            <p className="cl-aide">Cherchez l'autre fiche du même client (autre numéro, nom écrit autrement…).</p>
            <div className="vt-search">
              <Search size={16} className="vt-search-icon" />
              <input className="vt-input vt-search-input cl-search-ic" autoFocus placeholder="Nom ou téléphone" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <ul className="cl-choix">
              {res.map((c) => (
                <li key={c.id_client}>
                  <button type="button" onClick={() => setChoix(c)}>
                    <strong>{c.nom} {c.code_client && <span className="cl-code">{c.code_client}</span>}</strong>
                    <span className="vt-cell-sub">{c.telephone || '-'} · {c.nb_ventes} vente{c.nb_ventes > 1 ? 's' : ''}{c.du > 0 ? ` · doit ${fm(c.du)}` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="cl-fusion-recap">
            <p>Les <strong>{choix.nb_ventes} vente{choix.nb_ventes > 1 ? 's' : ''}</strong> de « {choix.nom} » ({choix.telephone || 'sans téléphone'}) passeront sur la fiche « <strong>{client.nom}</strong> ».</p>
            <p>Son numéro deviendra le 2e numéro de {client.nom} s'il est libre, et la fiche « {choix.nom} » sera désactivée. Les prochaines ventes à ce numéro iront sur « {client.nom} ».</p>
            <button type="button" className="vt-link" onClick={() => setChoix(null)} disabled={saving}>Choisir une autre fiche</button>
          </div>
        )}
      </div>
      <div className="vt-modal-foot vt-modal-foot--end">
        <button type="button" className="vt-btn" onClick={onClose} disabled={saving}>Annuler</button>
        <button type="button" className="vt-btn vt-btn--primary" onClick={fusionner} disabled={!choix || saving}>
          {saving ? <Loader size={16} className="vt-spin" /> : <Merge size={16} />} Fusionner
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function ClientDetail() {
  const { telephone: cle, slug } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const token = localStorage.getItem('token');
  const responsable = user?.role === 'admin' || user?.role === 'manager';

  const [fiche, setFiche] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [magasin, setMagasin] = useState(null);
  const [modal, setModal] = useState(null); // 'edit' | 'releve' | 'fusion'
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, t = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type: t });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const charger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await ClientService.getFiche(token, cle);
      setFiche(r.data?.fiche || null);
    } catch (e) {
      setError(e.message || 'Client introuvable');
    } finally {
      setLoading(false);
    }
  }, [token, cle]);

  useEffect(() => { charger(); }, [charger]);
  useEffect(() => {
    MagasinService.getMonMagasin(token).then((r) => setMagasin(r.magasin || null)).catch(() => {});
  }, [token]);

  const c = fiche?.client;
  const ventesAPayer = useMemo(() => (fiche?.ventes || []).filter((v) => v.reste > 0.009), [fiche]);

  const basculerActif = async () => {
    setBusy(true);
    try {
      await ClientService.setActif(token, c.id_client, !c.actif);
      showToast(c.actif ? 'Client désactivé : il n\'apparaît plus dans la liste' : 'Client réactivé');
      charger();
    } catch (e) {
      showToast(e.message || 'Opération impossible', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !fiche) {
    return <div className="ventes-container vt cl"><div className="vt-empty"><Loader size={26} className="vt-spin" /><p className="vt-empty-title">Chargement de la fiche…</p></div></div>;
  }
  if (error || !c) {
    return (
      <div className="ventes-container vt cl">
        <div className="vt-empty">
          <AlertTriangle size={28} />
          <p className="vt-empty-title">{error || 'Client introuvable'}</p>
          <button type="button" className="vt-btn vt-btn--sm" onClick={() => navigate(`/${slug}/clients`)}>Retour aux clients</button>
        </div>
      </div>
    );
  }

  const lieu = [c.adresse, c.quartier, c.ville].filter(Boolean).join(', ');

  return (
    <div className="ventes-container vt cl">
      <button type="button" className="vt-link cl-retour" onClick={() => navigate(`/${slug}/clients`)}><ArrowLeft size={15} /> Clients</button>

      <header className="vt-head cl-head">
        <div>
          <h1 className="vt-title cl-titre">{c.nom} {c.code_client && <span className="cl-code cl-code--lg">{c.code_client}</span>} <TypeTag type={c.type_client} />{!c.actif && <span className="cl-st" data-s="annulee">Désactivé</span>}</h1>
          <p className="vt-sub cl-coord">
            {[c.telephone, c.telephone2].filter(Boolean).length > 0 && <span><Phone size={13} /> {[c.telephone, c.telephone2].filter(Boolean).join(' · ')}</span>}
            {lieu && <span><MapPin size={13} /> {lieu}</span>}
            {c.email && <span>{c.email}</span>}
          </p>
        </div>
        <div className="vt-head-actions">
          {c.telephone && (
            <a className="vt-btn cl-btn-wa" href={`https://wa.me/${numeroWa(c.telephone)}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} /> WhatsApp
            </a>
          )}
          <button type="button" className="vt-btn" onClick={() => setModal('releve')}><FileText size={16} /> Relevé</button>
          <button type="button" className="vt-btn vt-btn--primary" onClick={() => setModal('edit')}><Pencil size={16} /> Modifier</button>
        </div>
      </header>

      <section className="vt-overview cl-kpis" aria-label="Synthèse">
        <div className="vt-ca">
          <span className="vt-label">Doit</span>
          <strong className={`vt-ca-value vt-num ${c.depasse_plafond ? 'cl-ko' : ''}`}>{fm(c.du)}</strong>
          <span className="vt-ca-note">
            {c.du_en_retard > 0.009 ? `dont ${fm(c.du_en_retard)} en retard` : c.du > 0 ? 'Rien en retard' : 'Aucune dette'}
          </span>
        </div>
        <div className="cl-kpi-grid">
          <div><span>Plafond de crédit</span><strong>{c.plafond_credit != null ? <Doit du={c.du || 0.01} plafond={c.plafond_credit} /> : <span className="vt-muted">Aucun</span>}</strong></div>
          <div><span>Total des achats</span><strong className="vt-num">{fm(c.total_achats)}</strong><em>{c.nb_ventes} vente{c.nb_ventes > 1 ? 's' : ''}</em></div>
          <div><span>Dernière visite</span><strong>{c.derniere_vente ? dateFR(c.derniere_vente) : '-'}</strong><em>client depuis {dateFR(typeof c.date_creation === 'string' ? c.date_creation : c.premiere_vente)}</em></div>
        </div>
      </section>

      {c.depasse_plafond && (
        <p className="cl-alerte"><AlertTriangle size={15} /> Ce client dépasse son plafond de crédit de {fm(c.du - c.plafond_credit)}. Un avertissement s'affiche à chaque nouvelle vente.</p>
      )}
      {c.note && <p className="cl-note"><StickyNote size={15} /> {c.note}</p>}

      <div className="cl-cols">
        <section className="cl-card" aria-label="Ventes">
          <div className="cl-card-head">
            <h2><ShoppingBag size={16} /> Ventes</h2>
            {ventesAPayer.length > 0 && <span className="vt-muted">{ventesAPayer.length} à régler</span>}
          </div>
          {fiche.ventes.length === 0 ? <p className="vt-muted cl-vide">Aucune vente pour ce client.</p> : (
            <div className="cl-sub-wrap">
              <table className="vt-table cl-sub-table">
                <thead><tr><th>Date</th><th>Vente</th><th className="vt-th-right">Montant</th><th className="vt-th-right">Paiement</th></tr></thead>
                <tbody>
                  {fiche.ventes.map((v) => (
                    <tr key={v.id_commande} className={v.annulee ? 'cl-inactif' : ''}>
                      <td className="vt-num">{dateFR(v.date_commande)}</td>
                      <td><div className="vt-cell-main vt-cell-main--plain">{v.numero_commande}</div><div className="vt-cell-sub">{v.numero_facture}</div></td>
                      <td className="vt-td-right vt-num">{fm(v.montant_total)}</td>
                      <td className="vt-td-right"><StatutVente v={v} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="cl-side">
          <section className="cl-card" aria-label="Produits préférés">
            <div className="cl-card-head"><h2><Package size={16} /> Produits préférés</h2></div>
            {fiche.produits.length === 0 ? <p className="vt-muted cl-vide">-</p> : (
              <ol className="cl-liste">
                {fiche.produits.slice(0, 6).map((p) => (
                  <li key={p.id_produit}>
                    <span><strong>{p.nom}</strong><em className="vt-cell-sub">{p.quantite} {p.unite || ''} · {p.nb_ventes} fois</em></span>
                    <span className="vt-num">{fm(p.montant)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className="cl-card" aria-label="Relances">
            <div className="cl-card-head"><h2><BellRing size={16} /> Relances</h2></div>
            {fiche.relances.length === 0 ? <p className="vt-muted cl-vide">Jamais relancé.</p> : (
              <ol className="cl-liste">
                {fiche.relances.slice(0, 5).map((r) => (
                  <li key={r.id_relance}>
                    <span><strong>{CANAUX[r.canal] || r.canal}</strong><em className="vt-cell-sub">{dateFR(String(r.date_relance).slice(0, 10))} · {r.par_nom || ''}{r.note ? ` · « ${r.note} »` : ''}</em></span>
                    <span className="vt-num">{fm(r.montant_du)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          {responsable && (
            <section className="cl-card cl-gestion" aria-label="Gestion de la fiche">
              <button type="button" className="vt-btn vt-btn--sm" onClick={() => setModal('fusion')} disabled={busy}><Merge size={14} /> Fusionner un doublon</button>
              <button type="button" className="vt-btn vt-btn--sm" onClick={basculerActif} disabled={busy}>
                {c.actif ? <><UserX size={14} /> Désactiver</> : <><UserCheck size={14} /> Réactiver</>}
              </button>
            </section>
          )}
        </div>
      </div>

      {modal === 'edit' && (
        <ModalClient token={token} client={c} peutFixerPlafond={responsable}
                     onClose={() => setModal(null)}
                     onVoirExistant={(id) => { setModal(null); navigate(`/${slug}/clients/${id}`); }}
                     onSaved={() => { setModal(null); showToast('Fiche client modifiée'); charger(); }} />
      )}
      {modal === 'releve' && <ModalReleve token={token} client={c} magasin={magasin} onClose={() => setModal(null)} />}
      {modal === 'fusion' && (
        <ModalFusion token={token} client={c} onClose={() => setModal(null)}
                     onFusion={(msg) => { setModal(null); showToast(msg); charger(); }} />
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
