// pages/SuperAdmin/Magasins/Magasins.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Store, Search, RefreshCw, MapPin, Phone, Mail, User,
  LayoutGrid, List, Map as MapIcon, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, MapPinOff, ExternalLink, Power,
  Building2, Filter, X, AlertCircle
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import MagasinAdminService from "../../../services/superAdmin/magasinAdminService";
import "leaflet/dist/leaflet.css";
import "./Magasins.css";

// ==================== UTILS ====================
const formatDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date)) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

const getInitials = (name) => {
  if (!name) return "??";
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").substring(0, 2).toUpperCase();
};

// ==================== ICÔNE CARTE (logo + nom) ====================
const buildIcon = (m) => {
  const initiales = getInitials(m.nom_commercial || "??");
  const logoHtml = m.logo_url
    ? `<img src="${m.logo_url}" alt="" onerror="this.style.display='none';this.parentNode.classList.add('no-logo')" />`
    : `<span class="mk-fallback">${initiales}</span>`;
  const nom = (m.nom_commercial || "Sans nom")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return L.divIcon({
    html: `<div class="mk-pin"><div class="mk-logo">${logoHtml}</div><div class="mk-name">${nom}</div><div class="mk-tip"></div></div>`,
    className: "mk-wrapper",
    iconSize: [140, 64],
    iconAnchor: [70, 64],
    popupAnchor: [0, -60],
  });
};

const FitAllButton = ({ magasins }) => {
  const map = useMap();
  if (!magasins.length) return null;
  const fit = () => {
    const bounds = L.latLngBounds(magasins.map(m => [m.latitude, m.longitude]));
    map.fitBounds(bounds, { padding: [40, 40] });
  };
  return (
    <button type="button" className="mg-fit-btn" onClick={fit} title="Recentrer">
      <MapPin size={16} /> Recentrer
    </button>
  );
};

// ==================== PAGE ====================
const Magasins = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Vue : 'table' | 'cards' | 'map'
  const [view, setView] = useState(searchParams.get("view") || "table");

  // Filtres
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("tous");        // tous | actif | inactif
  const [geolocalise, setGeolocalise] = useState("tous"); // tous | oui | non
  const [pays, setPays] = useState("");
  const [ville, setVille] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Données
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ magasins: [], total: 0, totalPages: 1 });

  // Carte (vue map)
  const [mapData, setMapData] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);

  // Stats header
  const [stats, setStats] = useState(null);

  // Filtres disponibles
  const [filtres, setFiltres] = useState({ pays: [], villes: [] });

  // Actions
  const [togglingId, setTogglingId] = useState(null);

  // Debounce recherche
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

  // Reset page quand filtres changent
  useEffect(() => { setPage(1); }, [statut, geolocalise, pays, ville]);

  // Charger stats + filtres (une fois)
  useEffect(() => {
    (async () => {
      try {
        const [s, f] = await Promise.all([
          MagasinAdminService.getStats(),
          MagasinAdminService.getFiltres(),
        ]);
        if (s.success) setStats(s.stats);
        if (f.success) setFiltres({ pays: f.pays || [], villes: f.villes || [] });
      } catch (e) {
        console.error("❌ stats/filtres:", e);
      }
    })();
  }, []);

  // Charger villes quand pays change
  useEffect(() => {
    (async () => {
      try {
        const f = await MagasinAdminService.getFiltres(pays || null);
        if (f.success) setFiltres(prev => ({ ...prev, villes: f.villes || [] }));
        if (!pays) setVille("");
      } catch (e) { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pays]);

  // Charger la liste
  const loadListe = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await MagasinAdminService.getListe({
        page, limit, search: debouncedSearch,
        statut, geolocalise, pays: pays || undefined, ville: ville || undefined,
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

  // Charger la carte (vue map)
  const loadMap = async () => {
    setMapLoading(true);
    try {
      const res = await MagasinAdminService.getCarte(1000);
      if (res.success) setMapData(res.magasins || []);
    } catch (e) {
      console.error("❌ loadMap:", e);
    } finally {
      setMapLoading(false);
    }
  };

  useEffect(() => {
    if (view === "map") loadMap();
    else loadListe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, page, debouncedSearch, statut, geolocalise, pays, ville]);

  // Toggle actif
  const handleToggle = async (m) => {
    setTogglingId(m.id_magasin);
    try {
      const newActif = !m.actif;
      const res = await MagasinAdminService.toggleActif(m.id_magasin, newActif);
      if (res.success) {
        setData(prev => ({
          ...prev,
          magasins: prev.magasins.map(x =>
            x.id_magasin === m.id_magasin ? { ...x, actif: newActif } : x
          ),
        }));
        // Mettre à jour stats
        if (stats) {
          setStats(s => ({
            ...s,
            total_actifs: (parseInt(s.total_actifs) || 0) + (newActif ? 1 : -1),
            total_inactifs: (parseInt(s.total_inactifs) || 0) + (newActif ? -1 : 1),
          }));
        }
      }
    } catch (e) {
      console.error("❌ toggle:", e);
    } finally {
      setTogglingId(null);
    }
  };

  // Changer de vue
  const changeView = (v) => {
    setView(v);
    const params = new URLSearchParams(searchParams);
    params.set("view", v);
    setSearchParams(params, { replace: true });
  };

  // Reset filtres
  const resetFiltres = () => {
    setSearch(""); setStatut("tous"); setGeolocalise("tous");
    setPays(""); setVille(""); setPage(1);
  };

  const hasActiveFilters =
    search || statut !== "tous" || geolocalise !== "tous" || pays || ville;

  // Centre par défaut
  const mapCenter = useMemo(() => {
    if (!mapData.length) return [5.3599, -4.0083];
    const lat = mapData.reduce((s, m) => s + m.latitude, 0) / mapData.length;
    const lng = mapData.reduce((s, m) => s + m.longitude, 0) / mapData.length;
    return [lat, lng];
  }, [mapData]);

  // ==================== RENDER ====================
  return (
    <div className="mg-page">

      {/* ==================== HEADER ==================== */}
      <header className="mg-header">
        <div>
          <h1 className="mg-title">Magasins</h1>
          <p className="mg-subtitle">
            Toutes les boutiques inscrites sur Miyo
          </p>
        </div>
        <div className="mg-header-actions">
          <div className="mg-view-switch">
            <button
              className={`mg-view-btn ${view === "table" ? "is-active" : ""}`}
              onClick={() => changeView("table")}
              title="Vue tableau"
            >
              <List size={16} /> Tableau
            </button>
            <button
              className={`mg-view-btn ${view === "cards" ? "is-active" : ""}`}
              onClick={() => changeView("cards")}
              title="Vue cartes"
            >
              <LayoutGrid size={16} /> Cartes
            </button>
            <button
              className={`mg-view-btn ${view === "map" ? "is-active" : ""}`}
              onClick={() => changeView("map")}
              title="Vue carte"
            >
              <MapIcon size={16} /> Carte
            </button>
          </div>
          <button
            className="mg-btn mg-btn--outline"
            onClick={() => (view === "map" ? loadMap() : loadListe(true))}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "mg-spin" : ""} />
            {refreshing ? "…" : "Actualiser"}
          </button>
        </div>
      </header>

      {/* ==================== STATS ==================== */}
      {stats && (
        <section className="mg-stats">
          <StatCard
            icon={Building2}
            label="Total"
            value={stats.total}
            color="brand"
          />
          <StatCard
            icon={CheckCircle2}
            label="Actifs"
            value={stats.total_actifs}
            color="success"
          />
          <StatCard
            icon={XCircle}
            label="Inactifs"
            value={stats.total_inactifs}
            color="danger"
          />
          <StatCard
            icon={MapPin}
            label="Géolocalisés"
            value={stats.total_geolocalises}
            color="info"
          />
          <StatCard
            icon={MapPinOff}
            label="Sans GPS"
            value={stats.total_sans_gps}
            color="warning"
          />
          <StatCard
            icon={MapPin}
            label="Pays / Villes"
            value={`${stats.nb_pays} / ${stats.nb_villes}`}
            color="neutral"
          />
        </section>
      )}

      {/* ==================== ONGLETS STATUT ==================== */}
      <nav className="mg-tabs">
        <TabBtn active={statut === "tous"} onClick={() => setStatut("tous")}>Tous</TabBtn>
        <TabBtn active={statut === "actif"} onClick={() => setStatut("actif")}>Actifs</TabBtn>
        <TabBtn active={statut === "inactif"} onClick={() => setStatut("inactif")}>Inactifs</TabBtn>
        <TabBtn active={geolocalise === "non"} onClick={() => {
          setGeolocalise(geolocalise === "non" ? "tous" : "non");
          setStatut("tous");
        }}>
          Sans GPS
        </TabBtn>
      </nav>

      {/* ==================== BARRE FILTRES ==================== */}
      <div className="mg-toolbar">
        <div className="mg-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Rechercher par nom, patron, email, téléphone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="mg-search-clear" onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          )}
        </div>

        <select className="mg-select" value={pays} onChange={(e) => setPays(e.target.value)}>
          <option value="">Tous les pays</option>
          {filtres.pays.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select className="mg-select" value={ville} onChange={(e) => setVille(e.target.value)}>
          <option value="">Toutes les villes</option>
          {filtres.villes.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select className="mg-select" value={geolocalise} onChange={(e) => setGeolocalise(e.target.value)}>
          <option value="tous">GPS : tous</option>
          <option value="oui">Géolocalisés</option>
          <option value="non">Sans GPS</option>
        </select>

        {hasActiveFilters && (
          <button className="mg-btn mg-btn--ghost" onClick={resetFiltres}>
            <Filter size={14} /> Réinitialiser
          </button>
        )}

        <span className="mg-toolbar-count">
          {data.total} magasin{data.total > 1 ? "s" : ""}
        </span>
      </div>

      {/* ==================== CONTENU ==================== */}
      {error ? (
        <div className="mg-error">
          <AlertCircle size={32} />
          <p>{error}</p>
          <button className="mg-btn mg-btn--primary" onClick={() => loadListe()}>
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      ) : view === "map" ? (
        <MapView
          loading={mapLoading}
          magasins={mapData}
          center={mapCenter}
          onSelect={(id) => navigate(`/super-admin/magasins/${id}`)}
        />
      ) : loading ? (
        <div className="mg-loading">
          <div className="mg-spinner" />
          <p>Chargement…</p>
        </div>
      ) : data.magasins.length === 0 ? (
        <div className="mg-empty">
          <Store size={48} />
          <h3>Aucun magasin trouvé</h3>
          <p>Essaie d'ajuster tes filtres ou ta recherche.</p>
          {hasActiveFilters && (
            <button className="mg-btn mg-btn--outline" onClick={resetFiltres}>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : view === "cards" ? (
        <CardsView
          magasins={data.magasins}
          onSelect={(id) => navigate(`/super-admin/magasins/${id}`)}
          onToggle={handleToggle}
          togglingId={togglingId}
        />
      ) : (
        <TableView
          magasins={data.magasins}
          onSelect={(id) => navigate(`/super-admin/magasins/${id}`)}
          onToggle={handleToggle}
          togglingId={togglingId}
        />
      )}

      {/* ==================== PAGINATION ==================== */}
      {view !== "map" && data.totalPages > 1 && (
        <nav className="mg-pagination">
          <button
            className="mg-btn mg-btn--outline"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} /> Précédent
          </button>
          <span className="mg-page-info">
            Page <strong>{page}</strong> / {data.totalPages}
          </span>
          <button
            className="mg-btn mg-btn--outline"
            disabled={page >= data.totalPages}
            onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
          >
            Suivant <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
};

// ==================== SOUS-COMPOSANTS ====================

const StatCard = ({ icon: Icon, label, value, color = "brand" }) => (
  <div className={`mg-stat mg-stat--${color}`}>
    <div className="mg-stat-icon"><Icon size={18} /></div>
    <div className="mg-stat-body">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  </div>
);

const TabBtn = ({ active, onClick, children }) => (
  <button className={`mg-tab ${active ? "is-active" : ""}`} onClick={onClick}>
    {children}
  </button>
);

// ---------- TABLE ----------
const TableView = ({ magasins, onSelect, onToggle, togglingId }) => (
  <div className="mg-table-wrap">
    <table className="mg-table">
      <thead>
        <tr>
          <th>Magasin</th>
          <th>Patron</th>
          <th>Localisation</th>
          <th>Contact</th>
          <th>GPS</th>
          <th>Statut</th>
          <th>Créé le</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {magasins.map((m) => (
          <tr key={m.id_magasin} onClick={() => onSelect(m.id_magasin)}>
            <td>
              <div className="mg-cell-store">
                <div className="mg-logo">
                  {m.logo_url
                    ? <img src={m.logo_url} alt="" onError={(e) => { e.target.style.display = "none"; }} />
                    : <span>{getInitials(m.nom_commercial)}</span>}
                </div>
                <div>
                  <strong>{m.nom_commercial || "Sans nom"}</strong>
                  <small>#{m.id_magasin}</small>
                </div>
              </div>
            </td>
            <td>
              <strong className="mg-cell-strong">{m.nom_patron || "—"}</strong>
              <small className="mg-cell-sub">{m.telephone_patron || m.email_patron || ""}</small>
            </td>
            <td>
              <span>{[m.quartier, m.ville, m.pays].filter(Boolean).join(", ") || "—"}</span>
            </td>
            <td>
              <span className="mg-cell-strong">{m.telephone || "—"}</span>
            </td>
            <td>
              {m.latitude && m.longitude ? (
                <span className="mg-badge mg-badge--success">
                  <MapPin size={11} /> OK
                </span>
              ) : (
                <span className="mg-badge mg-badge--warning">
                  <MapPinOff size={11} /> Non
                </span>
              )}
            </td>
            <td>
              {m.actif ? (
                <span className="mg-badge mg-badge--success">Actif</span>
              ) : (
                <span className="mg-badge mg-badge--danger">Inactif</span>
              )}
            </td>
            <td className="mg-cell-date">{formatDate(m.date_creation)}</td>
            <td onClick={(e) => e.stopPropagation()}>
              <div className="mg-row-actions">
                <button
                  className="mg-icon-btn"
                  title={m.actif ? "Désactiver" : "Activer"}
                  disabled={togglingId === m.id_magasin}
                  onClick={() => onToggle(m)}
                >
                  <Power size={14} className={togglingId === m.id_magasin ? "mg-spin" : ""} />
                </button>
                <button
                  className="mg-icon-btn"
                  title="Voir la fiche"
                  onClick={() => onSelect(m.id_magasin)}
                >
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

// ---------- CARDS ----------
const CardsView = ({ magasins, onSelect, onToggle, togglingId }) => (
  <div className="mg-cards">
    {magasins.map((m) => (
      <article
        key={m.id_magasin}
        className="mg-card"
        onClick={() => onSelect(m.id_magasin)}
      >
        <div className="mg-card-head">
          <div className="mg-logo mg-logo--lg">
            {m.logo_url
              ? <img src={m.logo_url} alt="" onError={(e) => { e.target.style.display = "none"; }} />
              : <span>{getInitials(m.nom_commercial)}</span>}
          </div>
          <div className="mg-card-title">
            <strong>{m.nom_commercial || "Sans nom"}</strong>
            <span>{m.nom_patron || "—"}</span>
          </div>
          <button
            className={`mg-power ${m.actif ? "is-on" : "is-off"}`}
            title={m.actif ? "Désactiver" : "Activer"}
            disabled={togglingId === m.id_magasin}
            onClick={(e) => { e.stopPropagation(); onToggle(m); }}
          >
            <Power size={14} />
          </button>
        </div>

        <div className="mg-card-body">
          {m.ville || m.pays ? (
            <div className="mg-card-line">
              <MapPin size={13} />
              {[m.ville, m.pays].filter(Boolean).join(", ")}
            </div>
          ) : null}
          {m.telephone && (
            <div className="mg-card-line">
              <Phone size={13} /> {m.telephone}
            </div>
          )}
          {m.email && (
            <div className="mg-card-line">
              <Mail size={13} /> {m.email}
            </div>
          )}
        </div>

        <div className="mg-card-foot">
          <span className={`mg-badge ${m.actif ? "mg-badge--success" : "mg-badge--danger"}`}>
            {m.actif ? "Actif" : "Inactif"}
          </span>
          {m.latitude && m.longitude ? (
            <span className="mg-badge mg-badge--success">
              <MapPin size={11} /> GPS
            </span>
          ) : (
            <span className="mg-badge mg-badge--warning">
              <MapPinOff size={11} /> Sans GPS
            </span>
          )}
          <span className="mg-card-date">{formatDate(m.date_creation)}</span>
        </div>
      </article>
    ))}
  </div>
);

// ---------- MAP ----------
const MapView = ({ loading, magasins, center, onSelect }) => {
  if (loading) {
    return (
      <div className="mg-loading">
        <div className="mg-spinner" />
        <p>Chargement de la carte…</p>
      </div>
    );
  }
  if (!magasins.length) {
    return (
      <div className="mg-empty">
        <MapPinOff size={48} />
        <h3>Aucun magasin géolocalisé</h3>
        <p>Les magasins apparaîtront ici dès qu'ils auront renseigné leur position.</p>
      </div>
    );
  }
  return (
    <div className="mg-map-wrap">
      <MapContainer center={center} zoom={6} scrollWheelZoom className="mg-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {magasins.map((m) => (
          <Marker key={m.id_magasin} position={[m.latitude, m.longitude]} icon={buildIcon(m)}>
            <Popup>
              <div className="mg-popup">
                <div className="mg-popup-head">
                  {m.logo_url ? (
                    <img src={m.logo_url} alt="" className="mg-popup-logo"
                      onError={(e) => { e.target.style.display = "none"; }} />
                  ) : (
                    <div className="mg-popup-logo mg-popup-logo--fallback">
                      {getInitials(m.nom_commercial)}
                    </div>
                  )}
                  <div>
                    <strong>{m.nom_commercial || "Sans nom"}</strong>
                    <span>{[m.ville, m.pays].filter(Boolean).join(", ") || "—"}</span>
                  </div>
                </div>
                {m.telephone && <p>📞 {m.telephone}</p>}
                {m.nom_patron && <p>👤 {m.nom_patron}</p>}
                <button className="mg-popup-btn" onClick={() => onSelect(m.id_magasin)}>
                  Voir la fiche
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
        <FitAllButton magasins={magasins} />
      </MapContainer>
    </div>
  );
};

export default Magasins;