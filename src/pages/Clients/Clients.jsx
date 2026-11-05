// pages/Clients/Clients.jsx
//
// Liste des fiches clients : ce qu'ils achètent, ce qu'ils doivent (et leur plafond de crédit),
// leur dernière visite. Création et modification de fiches.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus, Download, RefreshCw, X, AlertTriangle, Loader, Users, Eye, Pencil, ChevronLeft, ChevronRight,
  Store, Building2,
} from 'lucide-react';
import ClientService from '../../services/clientService';
import ModalClient from '../../components/Clients/ModalClient';
import { useUser } from '../../context/AuthContext';
import '../Ventes/Ventes.css';
import './Clients.css';

const NBSP = ' ';
const fm = (v) => `${Math.round(Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)}${NBSP}FCFA`;
const ilYa = (d) => {
  if (!d) return null;
  const j = Math.round((new Date(new Date().toDateString()) - new Date(`${String(d).slice(0, 10)}T00:00:00`)) / 86400000);
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return 'hier';
  if (j < 30) return `il y a ${j} jours`;
  if (j < 365) return `il y a ${Math.round(j / 30)} mois`;
  return `il y a ${Math.floor(j / 365)} an${j >= 730 ? 's' : ''}`;
};

const FILTRES = [
  { id: '', label: 'Tous les clients', cle: 'nb_clients', data: 'all' },
  { id: 'dette', label: "Doivent de l'argent", cle: 'nb_avec_dette', data: 'dette' },
  { id: 'depasse', label: 'Plafond dépassé', cle: 'nb_depasse', data: 'depasse' },
  { id: 'inactifs', label: 'Inactifs (+60 j)', cle: 'nb_inactifs', data: 'inactifs' },
  { id: 'nouveaux', label: 'Nouveaux ce mois', cle: 'nouveaux_mois', data: 'nouveaux' },
];
const TYPES = [
  { id: '', label: 'Tous' },
  { id: 'particulier', label: 'Particuliers' },
  { id: 'revendeur', label: 'Revendeurs' },
  { id: 'entreprise', label: 'Entreprises' },
];
const TRIS = [
  { id: 'recent', label: 'Dernière visite' },
  { id: 'nom', label: 'Nom (A → Z)' },
  { id: 'du', label: 'Doit le plus' },
  { id: 'achats', label: 'Achète le plus' },
  { id: 'nouveaux', label: 'Plus récents' },
];
const PAR_PAGE = 25;

export const TypeTag = ({ type }) => {
  if (type === 'revendeur') return <span className="cl-type" data-t="revendeur"><Store size={12} /> Revendeur</span>;
  if (type === 'entreprise') return <span className="cl-type" data-t="entreprise"><Building2 size={12} /> Entreprise</span>;
  return null;
};

export const Doit = ({ du, plafond }) => {
  if (!(du > 0.009)) return <span className="vt-muted">-</span>;
  const pct = plafond > 0 ? Math.min(100, (du / plafond) * 100) : null;
  const depasse = plafond != null && du > plafond + 0.009;
  return (
    <div className="cl-doit">
      <span className={`vt-num cl-du ${depasse ? 'is-ko' : ''}`}>{fm(du)}</span>
      {plafond != null && (
        <>
          <span className="cl-plafond-bar" aria-hidden="true"><i style={{ width: `${pct ?? 100}%` }} data-ko={depasse || undefined} /></span>
          <span className="vt-cell-sub">{depasse ? 'plafond dépassé' : 'plafond'} {fm(plafond)}</span>
        </>
      )}
    </div>
  );
};

export default function Clients() {
  const { user } = useUser();
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const { slug } = useParams();
  const responsable = user?.role === 'admin' || user?.role === 'manager';

  const [clients, setClients] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statut, setStatut] = useState('');
  const [type, setType] = useState('');
  const [tri, setTri] = useState('recent');
  const [recherche, setRecherche] = useState('');
  const [rechercheDiff, setRechercheDiff] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { client } | { client: null }
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const reqId = useRef(0);

  const showToast = useCallback((message, t = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type: t });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(() => {
    const t = setTimeout(() => setRechercheDiff(recherche.trim()), 300);
    return () => clearTimeout(t);
  }, [recherche]);

  const charger = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const [liste, st] = await Promise.all([
        ClientService.getAll(token, { statut, type, tri, search: rechercheDiff }),
        ClientService.getStats(token),
      ]);
      if (id !== reqId.current) return;
      setClients(liste.data || []);
      setStats(st.data || null);
    } catch (e) {
      if (id === reqId.current) setError(e.message || 'Impossible de charger les clients');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [token, statut, type, tri, rechercheDiff]);

  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { setPage(1); }, [statut, type, tri, rechercheDiff]);

  const liste = useMemo(() => clients || [], [clients]);
  const nbPages = Math.max(1, Math.ceil(liste.length / PAR_PAGE));
  const pageCourante = Math.min(page, nbPages);
  const visibles = liste.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);
  const ouvrir = (c) => navigate(`/${slug}/clients/${c.id_client}`);
  const filtreActif = !!(statut || type || rechercheDiff);

  const exporter = async () => {
    setExporting(true);
    try {
      await ClientService.export(token, { statut, type, tri, search: rechercheDiff });
    } catch (e) {
      showToast(e.message || "Erreur lors de l'export", 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="ventes-container vt cl">
      <header className="vt-head">
        <div>
          <h1 className="vt-title">Clients</h1>
          <p className="vt-sub">Vos clients, ce qu'ils achètent et ce qu'ils vous doivent</p>
        </div>
        <div className="vt-head-actions">
          <button type="button" className="vt-btn" onClick={exporter} disabled={exporting || liste.length === 0}>
            {exporting ? <Loader size={16} className="vt-spin" /> : <Download size={16} />} Exporter
          </button>
          <button type="button" className="vt-btn vt-btn--icon" onClick={charger} disabled={loading} aria-label="Rafraîchir" title="Rafraîchir">
            <RefreshCw size={16} className={loading ? 'vt-spin' : ''} />
          </button>
          <button type="button" className="vt-btn vt-btn--primary" onClick={() => setModal({ client: null })}>
            <Plus size={16} /> Nouveau client
          </button>
        </div>
      </header>

      <section className="vt-overview" aria-label="Synthèse">
        <div className="vt-ca">
          <span className="vt-label">Total dû par vos clients</span>
          <strong className="vt-ca-value vt-num">{fm(stats?.total_du)}</strong>
          <span className="vt-ca-note">
            {stats?.total_du_retard > 0.009 ? `dont ${fm(stats.total_du_retard)} en retard` : 'Aucun retard de paiement'}
          </span>
        </div>
        <div className="vt-rail" role="group" aria-label="Filtrer les clients">
          {FILTRES.map((f) => (
            <button key={f.id || 'tous'} type="button" className="vt-stage" data-c={f.data} aria-pressed={statut === f.id}
                    onClick={() => setStatut(statut === f.id ? '' : f.id)}>
              <span className="vt-stage-count vt-num">{stats ? stats[f.cle] : '-'}</span>
              <span className="vt-stage-label">{f.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="vt-toolbar cl-toolbar">
        <div className="vt-search cl-search">
          <input type="text" className="vt-input vt-search-input" placeholder="N° client, nom, téléphone, quartier…"
                 aria-label="Rechercher un client" value={recherche} onChange={(e) => setRecherche(e.target.value)} spellCheck={false} />
          {recherche && <button type="button" className="vt-search-clear" onClick={() => setRecherche('')} aria-label="Effacer"><X size={14} /></button>}
        </div>
        <div className="vt-seg cl-seg" role="group" aria-label="Type de client">
          {TYPES.map((t) => <button key={t.id || 'tous'} type="button" aria-pressed={type === t.id} onClick={() => setType(t.id)}>{t.label}</button>)}
        </div>
        <select className="vt-input cl-tri" value={tri} onChange={(e) => setTri(e.target.value)} aria-label="Trier par">
          {TRIS.map((t) => <option key={t.id} value={t.id}>Trier : {t.label}</option>)}
        </select>
        <span className="vt-count">{liste.length} client{liste.length > 1 ? 's' : ''}</span>
      </div>

      {error && !loading && (
        <div className="vt-error" role="alert">
          <AlertTriangle size={16} /><span>{error}</span>
          <button type="button" className="vt-btn vt-btn--sm" onClick={charger}>Réessayer</button>
        </div>
      )}

      <div className="vt-table-wrap cl-wrap" aria-busy={loading || undefined}>
        {loading && clients && <div className="vt-busybar" />}
        <table className="vt-table cl-table">
          <thead>
            <tr>
              <th>Client</th>
              <th className="cl-col-hide">Quartier</th>
              <th className="vt-th-right cl-col-hide">Achats</th>
              <th className="vt-th-right">Doit</th>
              <th className="cl-col-hide">Dernière visite</th>
              <th className="vt-th-right cl-col-act"><span className="cl-sr">Actions</span></th>
            </tr>
          </thead>
          <tbody style={{ counterReset: `ligne ${(pageCourante - 1) * PAR_PAGE}` }}>
            {loading && !clients
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="vt-skel-row" aria-hidden="true">
                    {[70, 40, 50, 50, 50, 30].map((w, k) => <td key={k}><span className="vt-skel" style={{ width: `${w}%` }} /></td>)}
                  </tr>
                ))
              : visibles.map((c) => (
                  <tr key={c.id_client} className={!c.actif ? 'cl-inactif' : ''}>
                    <td>
                      <button type="button" className="vt-link vt-cell-main" onClick={() => ouvrir(c)}>{c.nom}</button>
                      <div className="vt-cell-sub cl-sub">
                        {c.code_client && <span className="cl-code">{c.code_client}</span>}
                        <span>{c.telephone || 'Pas de téléphone'}</span>
                        <TypeTag type={c.type_client} />
                      </div>
                    </td>
                    <td className="cl-col-hide">{[c.quartier, c.ville].filter(Boolean).join(', ') || <span className="vt-muted">-</span>}</td>
                    <td className="vt-td-right cl-col-hide">
                      <div className="vt-num">{c.total_achats > 0 ? fm(c.total_achats) : '-'}</div>
                      <div className="vt-cell-sub">{c.nb_ventes} vente{c.nb_ventes > 1 ? 's' : ''}</div>
                    </td>
                    <td className="vt-td-right"><Doit du={c.du} plafond={c.plafond_credit} /></td>
                    <td className="cl-col-hide">{c.derniere_vente ? ilYa(c.derniere_vente) : <span className="vt-muted">Jamais</span>}</td>
                    <td className="vt-td-right">
                      <div className="vt-actions">
                        <button type="button" className="vt-iconbtn vt-iconbtn--sm" onClick={() => setModal({ client: c })} aria-label={`Modifier ${c.nom}`} title="Modifier">
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="vt-iconbtn vt-iconbtn--sm" onClick={() => ouvrir(c)} aria-label={`Fiche de ${c.nom}`} title="Voir la fiche">
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && liste.length === 0 && (
          <div className="vt-empty">
            <Users size={30} />
            <p className="vt-empty-title">{filtreActif ? 'Aucun client ne correspond' : 'Aucun client pour le moment'}</p>
            <p className="vt-empty-text">
              {filtreActif ? 'Modifiez la recherche ou les filtres.' : 'Les clients sont créés automatiquement à chaque vente avec un numéro de téléphone, ou ici avec « Nouveau client ».'}
            </p>
            {filtreActif && (
              <button type="button" className="vt-btn vt-btn--sm" onClick={() => { setStatut(''); setType(''); setRecherche(''); }}>Effacer les filtres</button>
            )}
          </div>
        )}
      </div>

      {liste.length > PAR_PAGE && (
        <nav className="vt-pager" aria-label="Pagination">
          <span className="vt-pager-info">{liste.length} clients</span>
          <div className="vt-pager-ctrl">
            <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage(pageCourante - 1)} disabled={pageCourante === 1} aria-label="Page précédente"><ChevronLeft size={18} /></button>
            <span className="vt-pager-page">Page {pageCourante} sur {nbPages}</span>
            <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage(pageCourante + 1)} disabled={pageCourante === nbPages} aria-label="Page suivante"><ChevronRight size={18} /></button>
          </div>
        </nav>
      )}

      {modal && (
        <ModalClient token={token} client={modal.client} peutFixerPlafond={responsable}
                     onClose={() => setModal(null)}
                     onVoirExistant={(id) => { setModal(null); navigate(`/${slug}/clients/${id}`); }}
                     onSaved={(c) => {
                       setModal(null);
                       showToast(modal.client ? 'Fiche client modifiée' : `Client « ${c.nom} » créé`);
                       charger();
                     }} />
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
