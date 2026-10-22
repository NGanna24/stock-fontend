// pages/SuperAdmin/Utilisateurs/Utilisateurs.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users, Search, RefreshCw, List, LayoutGrid, Store, MapPin,
  CheckCircle2, XCircle, UserX, UserCheck, Clock,
  ChevronLeft, ChevronRight, Power, ExternalLink, X,
  AlertCircle, Mail, Phone, UserPlus, Calendar
} from "lucide-react";
import UtilisateurAdminService from "../../../services/superAdmin/utilisateurAdminService";
import "./Utilisateurs.css";

// ==================== UTILS ====================
const formatDate = (d) => {
  if (!d) return "Jamais";
  const date = new Date(d);
  if (isNaN(date)) return "—";
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

const getInitials = (name) => {
  if (!name) return "??";
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").substring(0, 2).toUpperCase();
};

// ==================== PAGE ====================
const Utilisateurs = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState(searchParams.get("view") || "table");

  // Filtres
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("tous");
  const [jamaisConnecte, setJamaisConnecte] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Données
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ utilisateurs: [], total: 0, totalPages: 1 });
  const [stats, setStats] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Debounce
  const searchTimer = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => { setPage(1); }, [statut, jamaisConnecte]);

  // Stats (une fois)
  useEffect(() => {
    (async () => {
      try {
        const s = await UtilisateurAdminService.getStats();
        if (s.success) setStats(s.stats);
      } catch (e) { console.error(e); }
    })();
  }, []);

  // Liste
  const loadListe = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await UtilisateurAdminService.getListe({
        page, limit, search: debouncedSearch, statut,
        jamaisConnecte: jamaisConnecte ? 1 : undefined,
      });
      if (res.success) setData(res);
      else setError(res.message || "Erreur de chargement");
    } catch (e) {
      console.error("❌ loadListe:", e);
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadListe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, statut, jamaisConnecte]);

  // Toggle actif
  const handleToggle = async (u) => {
    setTogglingId(u.id_utilisateur);
    try {
      const newActif = !u.actif;
      const res = await UtilisateurAdminService.toggleActif(u.id_utilisateur, newActif);
      if (res.success) {
        setData(prev => ({
          ...prev,
          utilisateurs: prev.utilisateurs.map(x =>
            x.id_utilisateur === u.id_utilisateur ? { ...x, actif: newActif } : x
          ),
        }));
        if (stats) {
          setStats(s => ({
            ...s,
            total_actifs: (parseInt(s.total_actifs) || 0) + (newActif ? 1 : -1),
            total_inactifs: (parseInt(s.total_inactifs) || 0) + (newActif ? -1 : 1),
          }));
        }
      }
    } catch (e) { console.error(e); }
    finally { setTogglingId(null); }
  };

  const changeView = (v) => {
    setView(v);
    const params = new URLSearchParams(searchParams);
    params.set("view", v);
    setSearchParams(params, { replace: true });
  };

  const resetFiltres = () => {
    setSearch(""); setStatut("tous"); setJamaisConnecte(false); setPage(1);
  };

  const hasActiveFilters = search || statut !== "tous" || jamaisConnecte;

  // ==================== RENDER ====================
  return (
    <div className="us-page">

      {/* HEADER */}
      <header className="us-header">
        <div>
          <h1 className="us-title">Utilisateurs</h1>
          <p className="us-subtitle">Tous les patrons inscrits sur Miyo</p>
        </div>
        <div className="us-header-actions">
          <div className="us-view-switch">
            <button className={`us-view-btn ${view === "table" ? "is-active" : ""}`} onClick={() => changeView("table")}>
              <List size={16} /> Tableau
            </button>
            <button className={`us-view-btn ${view === "cards" ? "is-active" : ""}`} onClick={() => changeView("cards")}>
              <LayoutGrid size={16} /> Cartes
            </button>
          </div>
          <button className="us-btn us-btn--outline" onClick={() => loadListe(true)} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? "us-spin" : ""} />
            {refreshing ? "…" : "Actualiser"}
          </button>
        </div>
      </header>

      {/* STATS */}
      {stats && (
        <section className="us-stats">
          <StatCard icon={Users} label="Total" value={stats.total} color="brand" />
          <StatCard icon={UserCheck} label="Actifs" value={stats.total_actifs} color="success" />
          <StatCard icon={UserX} label="Inactifs" value={stats.total_inactifs} color="danger" />
          <StatCard icon={UserPlus} label="Nouveaux 7j" value={stats.nouveaux_7j} color="info" />
          <StatCard icon={Clock} label="Jamais connectés" value={stats.jamais_connectes} color="warning" />
        </section>
      )}

      {/* TABS */}
      <nav className="us-tabs">
        <TabBtn active={statut === "tous" && !jamaisConnecte} onClick={() => { setStatut("tous"); setJamaisConnecte(false); }}>Tous</TabBtn>
        <TabBtn active={statut === "actif" && !jamaisConnecte} onClick={() => { setStatut("actif"); setJamaisConnecte(false); }}>Actifs</TabBtn>
        <TabBtn active={statut === "inactif" && !jamaisConnecte} onClick={() => { setStatut("inactif"); setJamaisConnecte(false); }}>Inactifs</TabBtn>
        <TabBtn active={jamaisConnecte} onClick={() => { setStatut("tous"); setJamaisConnecte(true); }}>Jamais connectés</TabBtn>
      </nav>

      {/* TOOLBAR */}
      <div className="us-toolbar">
        <div className="us-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Rechercher par nom, email, téléphone, slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="us-search-clear" onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <button className="us-btn us-btn--ghost" onClick={resetFiltres}>Réinitialiser</button>
        )}
        <span className="us-toolbar-count">
          {data.total} utilisateur{data.total > 1 ? "s" : ""}
        </span>
      </div>

      {/* CONTENU */}
      {error ? (
        <div className="us-error">
          <AlertCircle size={32} />
          <p>{error}</p>
          <button className="us-btn us-btn--primary" onClick={() => loadListe()}>
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      ) : loading ? (
        <div className="us-loading">
          <div className="us-spinner" />
          <p>Chargement…</p>
        </div>
      ) : data.utilisateurs.length === 0 ? (
        <div className="us-empty">
          <Users size={48} />
          <h3>Aucun utilisateur trouvé</h3>
          <p>Essaie d'ajuster tes filtres ou ta recherche.</p>
          {hasActiveFilters && (
            <button className="us-btn us-btn--outline" onClick={resetFiltres}>Réinitialiser</button>
          )}
        </div>
      ) : view === "cards" ? (
        <CardsView
          utilisateurs={data.utilisateurs}
          onSelect={(id) => navigate(`/super-admin/utilisateurs/${id}`)}
          onToggle={handleToggle}
          togglingId={togglingId}
        />
      ) : (
        <TableView
          utilisateurs={data.utilisateurs}
          onSelect={(id) => navigate(`/super-admin/utilisateurs/${id}`)}
          onToggle={handleToggle}
          togglingId={togglingId}
        />
      )}

      {/* PAGINATION */}
      {data.totalPages > 1 && (
        <nav className="us-pagination">
          <button className="us-btn us-btn--outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            <ChevronLeft size={16} /> Précédent
          </button>
          <span className="us-page-info">Page <strong>{page}</strong> / {data.totalPages}</span>
          <button className="us-btn us-btn--outline" disabled={page >= data.totalPages} onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}>
            Suivant <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
};

// ==================== SOUS-COMPOSANTS ====================

const StatCard = ({ icon: Icon, label, value, color = "brand" }) => (
  <div className={`us-stat us-stat--${color}`}>
    <div className="us-stat-icon"><Icon size={18} /></div>
    <div className="us-stat-body">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  </div>
);

const TabBtn = ({ active, onClick, children }) => (
  <button className={`us-tab ${active ? "is-active" : ""}`} onClick={onClick}>{children}</button>
);

const TableView = ({ utilisateurs, onSelect, onToggle, togglingId }) => (
  <div className="us-table-wrap">
    <table className="us-table">
      <thead>
        <tr>
          <th>Utilisateur</th>
          <th>Contact</th>
          <th>Magasin</th>
          <th>Localisation</th>
          <th>Statut</th>
          <th>Dernière connexion</th>
          <th>Inscrit le</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {utilisateurs.map((u) => (
          <tr key={u.id_utilisateur} onClick={() => onSelect(u.id_utilisateur)}>
            <td>
              <div className="us-cell-user">
                <div className="us-avatar">{getInitials(u.fullname)}</div>
                <div>
                  <strong>{u.fullname}</strong>
                  <small>{u.slug || `#${u.id_utilisateur}`}</small>
                </div>
              </div>
            </td>
            <td>
              <div className="us-cell-contact">
                {u.email && <span><Mail size={11} /> {u.email}</span>}
                {u.telephone && <span><Phone size={11} /> {u.telephone}</span>}
              </div>
            </td>
            <td>
              {u.nom_magasin ? (
                <div className="us-cell-magasin">
                  <div className="us-magasin-logo">
                    {u.logo_magasin
                      ? <img src={u.logo_magasin} alt="" onError={(e) => { e.target.style.display = "none"; }} />
                      : <Store size={14} />}
                  </div>
                  <span>{u.nom_magasin}</span>
                </div>
              ) : (
                <span className="us-muted">—</span>
              )}
            </td>
            <td>
              {u.ville_magasin || u.pays_magasin ? (
                <span className="us-cell-loc">
                  <MapPin size={11} />
                  {[u.ville_magasin, u.pays_magasin].filter(Boolean).join(", ")}
                </span>
              ) : <span className="us-muted">—</span>}
            </td>
            <td>
              {u.actif
                ? <span className="us-badge us-badge--success"><CheckCircle2 size={11} /> Actif</span>
                : <span className="us-badge us-badge--danger"><XCircle size={11} /> Inactif</span>}
            </td>
            <td className="us-cell-date">{formatDate(u.derniere_connexion)}</td>
            <td className="us-cell-date">{formatDate(u.date_creation)}</td>
            <td onClick={(e) => e.stopPropagation()}>
              <div className="us-row-actions">
                <button className="us-icon-btn" title={u.actif ? "Désactiver" : "Activer"} disabled={togglingId === u.id_utilisateur} onClick={() => onToggle(u)}>
                  <Power size={14} className={togglingId === u.id_utilisateur ? "us-spin" : ""} />
                </button>
                <button className="us-icon-btn" title="Voir la fiche" onClick={() => onSelect(u.id_utilisateur)}>
                  <ExternalLink size={14} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CardsView = ({ utilisateurs, onSelect, onToggle, togglingId }) => (
  <div className="us-cards">
    {utilisateurs.map((u) => (
      <article key={u.id_utilisateur} className="us-card" onClick={() => onSelect(u.id_utilisateur)}>
        <div className="us-card-head">
          <div className="us-avatar us-avatar--lg">{getInitials(u.fullname)}</div>
          <div className="us-card-title">
            <strong>{u.fullname}</strong>
            <span>{u.email || u.telephone || "—"}</span>
          </div>
          <button
            className={`us-power ${u.actif ? "is-on" : "is-off"}`}
            title={u.actif ? "Désactiver" : "Activer"}
            disabled={togglingId === u.id_utilisateur}
            onClick={(e) => { e.stopPropagation(); onToggle(u); }}
          >
            <Power size={14} />
          </button>
        </div>

        <div className="us-card-body">
          {u.nom_magasin && (
            <div className="us-card-line">
              <Store size={13} /> {u.nom_magasin}
            </div>
          )}
          {(u.ville_magasin || u.pays_magasin) && (
            <div className="us-card-line">
              <MapPin size={13} /> {[u.ville_magasin, u.pays_magasin].filter(Boolean).join(", ")}
            </div>
          )}
          {u.derniere_connexion && (
            <div className="us-card-line">
              <Clock size={13} /> {formatDate(u.derniere_connexion)}
            </div>
          )}
        </div>

        <div className="us-card-foot">
          <span className={`us-badge ${u.actif ? "us-badge--success" : "us-badge--danger"}`}>
            {u.actif ? "Actif" : "Inactif"}
          </span>
          <span className="us-card-date">
            <Calendar size={11} /> {formatDate(u.date_creation)}
          </span>
        </div>
      </article>
    ))}
  </div>
);

export default Utilisateurs;