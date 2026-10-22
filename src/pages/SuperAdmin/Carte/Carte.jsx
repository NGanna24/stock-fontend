// pages/SuperAdmin/Carte/Carte.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, RefreshCw, Search, X, Store, MapPinOff,
  Filter, ExternalLink, Phone, User, AlertCircle, Navigation
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import MagasinAdminService from "../../../services/superAdmin/magasinAdminService";
import "leaflet/dist/leaflet.css";
import "./Carte.css";

// ==================== UTILS ====================
const getInitials = (name) => {
  if (!name) return "??";
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").substring(0, 2).toUpperCase();
};

// ==================== ICÔNE PIN (logo + nom) ====================
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

// ==================== BOUTON RECENTRER ====================
const FitAllButton = ({ magasins }) => {
  const map = useMap();
  if (!magasins.length) return null;
  const fit = () => {
    const bounds = L.latLngBounds(magasins.map(m => [m.latitude, m.longitude]));
    map.fitBounds(bounds, { padding: [40, 40] });
  };
  return (
    <button type="button" className="ct-fit-btn" onClick={fit} title="Recentrer">
      <Navigation size={14} /> Recentrer
    </button>
  );
};

// ==================== PAGE ====================
const Carte = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [magasins, setMagasins] = useState([]);

  // Filtres
  const [search, setSearch] = useState("");
  const [pays, setPays] = useState("");

  // Liste des pays (dérivée des magasins)
  const paysDisponibles = useMemo(() => {
    const set = new Set();
    magasins.forEach(m => { if (m.pays) set.add(m.pays); });
    return Array.from(set).sort();
  }, [magasins]);

  // Charger
  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await MagasinAdminService.getCarte(2000);
      if (res.success) setMagasins(res.magasins || []);
      else setError(res.message || "Erreur de chargement");
    } catch (e) {
      console.error("❌ load carte:", e);
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Filtrer
  const filtered = useMemo(() => {
    let result = magasins;

    if (pays) {
      result = result.filter(m => m.pays === pays);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        (m.nom_commercial || "").toLowerCase().includes(q) ||
        (m.ville || "").toLowerCase().includes(q) ||
        (m.nom_patron || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [magasins, search, pays]);

  // Centre par défaut
  const mapCenter = useMemo(() => {
    if (!filtered.length) return [5.3599, -4.0083];
    const lat = filtered.reduce((s, m) => s + m.latitude, 0) / filtered.length;
    const lng = filtered.reduce((s, m) => s + m.longitude, 0) / filtered.length;
    return [lat, lng];
  }, [filtered]);

  const resetFiltres = () => { setSearch(""); setPays(""); };
  const hasFilters = search || pays;

  // ==================== RENDER ====================
  return (
    <div className="ct-page">

      {/* ==================== HEADER ==================== */}
      <header className="ct-header">
        <div className="ct-header-left">
          <h1 className="ct-title">
            <MapPin size={20} /> Carte globale
          </h1>
          <p className="ct-subtitle">
            {magasins.length} magasin{magasins.length > 1 ? "s" : ""} géolocalisé{magasins.length > 1 ? "s" : ""}
            {hasFilters && ` • ${filtered.length} affiché${filtered.length > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="ct-header-right">
          <div className="ct-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Rechercher une boutique, une ville, un patron…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="ct-search-clear" onClick={() => setSearch("")}>
                <X size={13} />
              </button>
            )}
          </div>

          {paysDisponibles.length > 0 && (
            <select
              className="ct-select"
              value={pays}
              onChange={(e) => setPays(e.target.value)}
            >
              <option value="">Tous les pays</option>
              {paysDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}

          {hasFilters && (
            <button className="ct-btn ct-btn--ghost" onClick={resetFiltres}>
              <Filter size={13} /> Effacer
            </button>
          )}

          <button
            className="ct-btn ct-btn--outline"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "ct-spin" : ""} />
            {refreshing ? "…" : "Actualiser"}
          </button>
        </div>
      </header>

      {/* ==================== CONTENU ==================== */}
      {loading ? (
        <div className="ct-state">
          <div className="ct-spinner" />
          <p>Chargement de la carte…</p>
        </div>
      ) : error ? (
        <div className="ct-state ct-state--error">
          <AlertCircle size={40} />
          <p>{error}</p>
          <button className="ct-btn ct-btn--primary" onClick={() => load()}>
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      ) : magasins.length === 0 ? (
        <div className="ct-state">
          <MapPinOff size={48} />
          <h3>Aucun magasin géolocalisé</h3>
          <p>Les boutiques apparaîtront ici dès qu'elles auront renseigné leur position GPS.</p>
          <button className="ct-btn ct-btn--outline" onClick={() => navigate("/super-admin/magasins")}>
            <Store size={14} /> Voir tous les magasins
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ct-state">
          <Search size={48} />
          <h3>Aucun résultat</h3>
          <p>Aucune boutique ne correspond à tes filtres.</p>
          <button className="ct-btn ct-btn--outline" onClick={resetFiltres}>
            Réinitialiser
          </button>
        </div>
      ) : (
        <div className="ct-map-wrap">
          <MapContainer
            center={mapCenter}
            zoom={filtered.length === 1 ? 13 : 6}
            scrollWheelZoom
            className="ct-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {filtered.map((m) => (
              <Marker
                key={m.id_magasin}
                position={[m.latitude, m.longitude]}
                icon={buildIcon(m)}
              >
                <Popup>
                  <div className="ct-popup">
                    <div className="ct-popup-head">
                      {m.logo_url ? (
                        <img
                          src={m.logo_url}
                          alt=""
                          className="ct-popup-logo"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      ) : (
                        <div className="ct-popup-logo ct-popup-logo--fallback">
                          {getInitials(m.nom_commercial)}
                        </div>
                      )}
                      <div className="ct-popup-title">
                        <strong>{m.nom_commercial || "Sans nom"}</strong>
                        <span>{[m.ville, m.pays].filter(Boolean).join(", ") || "—"}</span>
                      </div>
                    </div>

                    <div className="ct-popup-body">
                      {m.nom_patron && (
                        <div className="ct-popup-line">
                          <User size={12} /> {m.nom_patron}
                        </div>
                      )}
                      {m.telephone && (
                        <div className="ct-popup-line">
                          <Phone size={12} /> {m.telephone}
                        </div>
                      )}
                    </div>

                    <button
                      className="ct-popup-btn"
                      onClick={() => navigate(`/super-admin/magasins/${m.id_magasin}`)}
                    >
                      <ExternalLink size={12} /> Voir la fiche
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            <FitAllButton magasins={filtered} />
          </MapContainer>

          {/* Légende flottante */}
          <div className="ct-legend">
            <span className="ct-legend-dot" />
            <span>{filtered.length} boutique{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Carte;