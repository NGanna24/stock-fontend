// pages/SuperAdmin/Magasins/MagasinDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Store, MapPin, Phone, Mail, User, Calendar,
  Power, RefreshCw, AlertCircle, CheckCircle2, XCircle,
  Package, Users, ShoppingCart, Receipt, UserCheck,
  ExternalLink, Copy, Check, MapPinOff, Building2, Globe,
  Pencil, X, Navigation
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import MagasinAdminService from "../../../services/superAdmin/magasinAdminService";
import "leaflet/dist/leaflet.css";
import "./MagasinDetail.css";

// ==================== UTILS ====================
const formatDate = (d, withTime = false) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date)) return "—";
  const opts = { day: "2-digit", month: "long", year: "numeric" };
  if (withTime) { opts.hour = "2-digit"; opts.minute = "2-digit"; }
  return date.toLocaleDateString("fr-FR", opts);
};

const getInitials = (name) => {
  if (!name) return "??";
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").substring(0, 2).toUpperCase();
};

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
  });
};

// ==================== PAGE ====================
const MagasinDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [magasin, setMagasin] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  // Modale GPS
  const [editGeoOpen, setEditGeoOpen] = useState(false);
  const [geoForm, setGeoForm] = useState({ latitude: "", longitude: "" });
  const [savingGeo, setSavingGeo] = useState(false);
  const [geoError, setGeoError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await MagasinAdminService.getDetail(id);
      if (res.success) setMagasin(res.magasin);
      else setError(res.message || "Erreur de chargement");
    } catch (e) {
      console.error("❌ load detail:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const handleToggle = async () => {
    if (!magasin) return;
    setToggling(true);
    try {
      const newActif = !magasin.actif;
      const res = await MagasinAdminService.toggleActif(magasin.id_magasin, newActif);
      if (res.success) setMagasin(prev => ({ ...prev, actif: newActif }));
    } catch (e) {
      console.error("❌ toggle:", e);
    } finally {
      setToggling(false);
    }
  };

  const openEditGeo = () => {
    setGeoForm({
      latitude: magasin?.latitude ?? "",
      longitude: magasin?.longitude ?? "",
    });
    setGeoError(null);
    setEditGeoOpen(true);
  };

  const saveGeo = async () => {
    const lat = parseFloat(geoForm.latitude);
    const lng = parseFloat(geoForm.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setGeoError("Latitude invalide (entre -90 et 90)");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setGeoError("Longitude invalide (entre -180 et 180)");
      return;
    }
    setSavingGeo(true);
    setGeoError(null);
    try {
      const res = await MagasinAdminService.updateGeolocalisation(magasin.id_magasin, {
        latitude: lat,
        longitude: lng,
        position_source: "manuel",
      });
      if (res.success) {
        setMagasin(prev => ({ ...prev, latitude: lat, longitude: lng, position_source: "manuel" }));
        setEditGeoOpen(false);
      } else {
        setGeoError(res.message || "Erreur");
      }
    } catch (e) {
      setGeoError(e.message);
    } finally {
      setSavingGeo(false);
    }
  };

  const copyGPS = async () => {
    if (!magasin?.latitude || !magasin?.longitude) return;
    try {
      await navigator.clipboard.writeText(`${magasin.latitude}, ${magasin.longitude}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const mapCenter = useMemo(() => {
    if (magasin?.latitude && magasin?.longitude) {
      return [magasin.latitude, magasin.longitude];
    }
    return [5.3599, -4.0083];
  }, [magasin]);

  // ==================== ÉTATS ====================
  if (loading) {
    return (
      <div className="md-page">
        <div className="md-loading">
          <div className="md-spinner" />
          <p>Chargement de la fiche…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="md-page">
        <div className="md-error">
          <AlertCircle size={40} />
          <h2>Impossible de charger le magasin</h2>
          <p>{error}</p>
          <div className="md-error-actions">
            <button className="md-btn md-btn--outline" onClick={() => navigate("/super-admin/magasins")}>
              <ArrowLeft size={14} /> Retour
            </button>
            <button className="md-btn md-btn--primary" onClick={load}>
              <RefreshCw size={14} /> Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!magasin) return null;

  const hasGPS = magasin.latitude != null && magasin.longitude != null;

  // ==================== RENDER ====================
  return (
    <div className="md-page">

      {/* ==================== HEADER ==================== */}
      <header className="md-header">
        <button className="md-btn md-btn--ghost" onClick={() => navigate("/super-admin/magasins")}>
          <ArrowLeft size={16} /> Magasins
        </button>

        <div className="md-identity">
          <div className="md-logo">
            {magasin.logo_url ? (
              <img src={magasin.logo_url} alt="" onError={(e) => { e.target.style.display = "none"; }} />
            ) : (
              <span>{getInitials(magasin.nom_commercial)}</span>
            )}
          </div>
          <div className="md-identity-text">
            <h1>{magasin.nom_commercial || "Sans nom"}</h1>
            <p>
              {magasin.slogan && <span>{magasin.slogan}</span>}
              {magasin.slogan && (magasin.ville || magasin.pays) && " • "}
              {(magasin.ville || magasin.pays) && (
                <span>{[magasin.ville, magasin.pays].filter(Boolean).join(", ")}</span>
              )}
            </p>
          </div>
          <span className={`md-status ${magasin.actif ? "is-on" : "is-off"}`}>
            {magasin.actif ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {magasin.actif ? "Actif" : "Inactif"}
          </span>
        </div>

        <div className="md-actions">
          <button
            className={`md-btn ${magasin.actif ? "md-btn--danger" : "md-btn--success"}`}
            onClick={handleToggle}
            disabled={toggling}
          >
            <Power size={14} className={toggling ? "md-spin" : ""} />
            {magasin.actif ? "Désactiver" : "Activer"}
          </button>
        </div>
      </header>

      {/* ==================== GRID ==================== */}
      <div className="md-grid">

        {/* ---------- COLONNE GAUCHE ---------- */}
        <div className="md-col">

          {/* Identité */}
          <section className="md-section">
            <h3 className="md-section-title"><Store size={16} /> Identité commerciale</h3>
            <dl className="md-dl">
              <Field label="Nom commercial" value={magasin.nom_commercial} />
              <Field label="Slogan" value={magasin.slogan} />
              <Field label="Description" value={magasin.description} full />
              <Field label="ID magasin" value={`#${magasin.id_magasin}`} mono />
            </dl>
          </section>

          {/* Localisation */}
          <section className="md-section">
            <div className="md-section-head">
              <h3 className="md-section-title"><MapPin size={16} /> Localisation</h3>
              <button className="md-btn md-btn--sm md-btn--outline" onClick={openEditGeo}>
                <Pencil size={12} /> Modifier GPS
              </button>
            </div>
            <dl className="md-dl">
              <Field label="Quartier" value={magasin.quartier} />
              <Field label="Ville" value={magasin.ville} />
              <Field label="Pays" value={magasin.pays} />
              <Field label="Adresse complète" value={magasin.adresse_complete} full />
              <Field label="Source GPS" value={magasin.position_source} />
              <Field label="Précision GPS" value={magasin.precision_gps ? `${magasin.precision_gps} m` : null} />

              <div className="md-field md-field--full">
                <dt>Coordonnées GPS</dt>
                <dd>
                  {hasGPS ? (
                    <div className="md-gps">
                      <span className="md-gps-value">
                        <Navigation size={12} /> {magasin.latitude.toFixed(6)}, {magasin.longitude.toFixed(6)}
                      </span>
                      <button className="md-btn md-btn--sm md-btn--ghost" onClick={copyGPS} title="Copier">
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? "Copié" : "Copier"}
                      </button>
                    </div>
                  ) : (
                    <span className="md-gps-missing">
                      <MapPinOff size={14} /> Non renseignées
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {/* Contact */}
          <section className="md-section">
            <h3 className="md-section-title"><Phone size={16} /> Contact</h3>
            <dl className="md-dl">
              <Field label="Téléphone" value={magasin.telephone} link={magasin.telephone ? `tel:${magasin.telephone}` : null} />
              <Field label="Téléphone 2" value={magasin.telephone2} />
              <Field label="WhatsApp" value={magasin.whatsapp} link={magasin.whatsapp ? `https://wa.me/${magasin.whatsapp.replace(/\D/g, "")}` : null} />
              <Field label="Email" value={magasin.email} link={magasin.email ? `mailto:${magasin.email}` : null} />
            </dl>
          </section>

          {/* Infos légales */}
          <section className="md-section">
            <h3 className="md-section-title"><Building2 size={16} /> Informations légales</h3>
            <dl className="md-dl">
              <Field label="RCCM" value={magasin.numero_rccm} />
              <Field label="NIF" value={magasin.numero_nif} />
              <Field label="N° contribuable" value={magasin.numero_contribuable} />
              <Field label="Régime fiscal" value={magasin.regime_fiscal} />
            </dl>
          </section>
        </div>

        {/* ---------- COLONNE DROITE ---------- */}
        <div className="md-col">

          {/* Carte */}
          <section className="md-section md-section--map">
            <div className="md-map-wrap">
              {hasGPS ? (
                <MapContainer center={mapCenter} zoom={14} scrollWheelZoom className="md-map">
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={mapCenter} icon={buildIcon(magasin)}>
                    <Popup>
                      <strong>{magasin.nom_commercial}</strong><br />
                      {[magasin.ville, magasin.pays].filter(Boolean).join(", ")}
                    </Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="md-map-empty">
                  <MapPinOff size={36} />
                  <p>Aucune coordonnée GPS</p>
                  <button className="md-btn md-btn--sm md-btn--outline" onClick={openEditGeo}>
                    <Pencil size={12} /> Ajouter GPS
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Patron */}
          <section className="md-section">
            <div className="md-section-head">
              <h3 className="md-section-title"><User size={16} /> Patron</h3>
              <button
                className="md-btn md-btn--sm md-btn--ghost"
                onClick={() => navigate(`/super-admin/utilisateurs/${magasin.id_utilisateur}`)}
                title="Voir la fiche utilisateur"
              >
                <ExternalLink size={12} /> Fiche
              </button>
            </div>
            <div className="md-patron">
              <div className="md-patron-avatar">
                {getInitials(magasin.nom_patron)}
              </div>
              <div className="md-patron-info">
                <strong>{magasin.nom_patron || "—"}</strong>
                <span>{magasin.email_patron || "—"}</span>
                <span>{magasin.telephone_patron || "—"}</span>
              </div>
            </div>
            <dl className="md-dl md-dl--sm">
              <Field label="Inscrit le" value={formatDate(magasin.patron_date_creation)} />
              <Field label="Dernière connexion" value={formatDate(magasin.patron_derniere_connexion, true)} />
              <Field label="Compte" value={magasin.patron_actif ? "Actif" : "Désactivé"} />
            </dl>
          </section>

          {/* Stats tenant */}
          <section className="md-section">
            <h3 className="md-section-title"><Globe size={16} /> Activité du compte</h3>
            <div className="md-stats-grid">
              <StatTile icon={Package} label="Produits" value={magasin.stats?.nb_produits} />
              <StatTile icon={Users} label="Clients" value={magasin.stats?.nb_clients} />
              <StatTile icon={ShoppingCart} label="Commandes" value={magasin.stats?.nb_commandes} />
              <StatTile icon={Receipt} label="Factures" value={magasin.stats?.nb_factures} />
              <StatTile icon={UserCheck} label="Employés" value={magasin.stats?.nb_employes} />
            </div>
          </section>

          {/* Métadonnées */}
          <section className="md-section">
            <h3 className="md-section-title"><Calendar size={16} /> Métadonnées</h3>
            <dl className="md-dl md-dl--sm">
              <Field label="Créé le" value={formatDate(magasin.date_creation, true)} />
              <Field label="Modifié le" value={formatDate(magasin.date_modification, true)} />
            </dl>
          </section>
        </div>
      </div>

      {/* ==================== MODALE GPS ==================== */}
      {editGeoOpen && (
        <div className="md-modal-bg" onClick={() => !savingGeo && setEditGeoOpen(false)}>
          <div className="md-modal" onClick={(e) => e.stopPropagation()}>
            <div className="md-modal-head">
              <h3><MapPin size={16} /> Modifier la géolocalisation</h3>
              <button
                className="md-modal-close"
                onClick={() => !savingGeo && setEditGeoOpen(false)}
                disabled={savingGeo}
              >
                <X size={16} />
              </button>
            </div>
            <div className="md-modal-body">
              {geoError && (
                <div className="md-alert md-alert--error">
                  <AlertCircle size={14} /> {geoError}
                </div>
              )}
              <div className="md-form-row">
                <label>
                  Latitude
                  <input
                    type="number"
                    step="any"
                    value={geoForm.latitude}
                    onChange={(e) => setGeoForm(f => ({ ...f, latitude: e.target.value }))}
                    placeholder="5.359952"
                    disabled={savingGeo}
                  />
                </label>
                <label>
                  Longitude
                  <input
                    type="number"
                    step="any"
                    value={geoForm.longitude}
                    onChange={(e) => setGeoForm(f => ({ ...f, longitude: e.target.value }))}
                    placeholder="-4.008256"
                    disabled={savingGeo}
                  />
                </label>
              </div>
              <p className="md-hint">
                Astuce : sur Google Maps, clic droit sur le lieu → "Plus d'infos sur cet endroit" → copie les coordonnées.
              </p>
            </div>
            <div className="md-modal-foot">
              <button
                className="md-btn md-btn--outline"
                onClick={() => setEditGeoOpen(false)}
                disabled={savingGeo}
              >
                Annuler
              </button>
              <button
                className="md-btn md-btn--primary"
                onClick={saveGeo}
                disabled={savingGeo}
              >
                {savingGeo && <RefreshCw size={12} className="md-spin" />}
                {savingGeo ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== SOUS-COMPOSANTS ====================

const Field = ({ label, value, link, full, mono }) => (
  <div className={`md-field ${full ? "md-field--full" : ""}`}>
    <dt>{label}</dt>
    <dd className={mono ? "md-mono" : ""}>
      {value ? (
        link ? <a href={link} target="_blank" rel="noreferrer">{value}</a> : value
      ) : (
        <span className="md-empty">—</span>
      )}
    </dd>
  </div>
);

const StatTile = ({ icon: Icon, label, value }) => (
  <div className="md-stat-tile">
    <Icon size={16} className="md-stat-icon" />
    <div>
      <strong>{parseInt(value) || 0}</strong>
      <span>{label}</span>
    </div>
  </div>
);

export default MagasinDetail;