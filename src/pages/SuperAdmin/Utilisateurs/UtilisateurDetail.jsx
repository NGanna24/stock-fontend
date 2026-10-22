// pages/SuperAdmin/Utilisateurs/UtilisateurDetail.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, User, Mail, Phone, Store, MapPin, Clock,
  CheckCircle2, XCircle, Power, RefreshCw, AlertCircle,
  Package, Users, ShoppingCart, Receipt, UserCheck, Truck,
  Calendar, Shield, ExternalLink, MapPinOff
} from "lucide-react";
import UtilisateurAdminService from "../../../services/superAdmin/utilisateurAdminService";
import "./UtilisateurDetail.css";

// ==================== UTILS ====================
const formatDate = (d, withTime = false) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date)) return "—";
  const opts = { day: "2-digit", month: "long", year: "numeric" };
  if (withTime) { opts.hour = "2-digit"; opts.minute = "2-digit"; }
  return date.toLocaleDateString("fr-FR", opts);
};

const formatRelative = (d) => {
  if (!d) return "Jamais connecté";
  const date = new Date(d);
  if (isNaN(date)) return "—";
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return date.toLocaleDateString("fr-FR");
};

const getInitials = (name) => {
  if (!name) return "??";
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").substring(0, 2).toUpperCase();
};

// ==================== PAGE ====================
const UtilisateurDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [toggling, setToggling] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await UtilisateurAdminService.getDetail(id);
      if (res.success) setData(res);
      else setError(res.message || "Erreur de chargement");
    } catch (e) {
      console.error("❌ load detail utilisateur:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const handleToggle = async () => {
    if (!data?.utilisateur) return;
    setToggling(true);
    try {
      const newActif = !data.utilisateur.actif;
      const res = await UtilisateurAdminService.toggleActif(data.utilisateur.id_utilisateur, newActif);
      if (res.success) {
        setData(prev => ({
          ...prev,
          utilisateur: { ...prev.utilisateur, actif: newActif },
        }));
      }
    } catch (e) {
      console.error("❌ toggle:", e);
    } finally {
      setToggling(false);
    }
  };

  // ==================== ÉTATS ====================
  if (loading) {
    return (
      <div className="ud-page">
        <div className="ud-loading">
          <div className="ud-spinner" />
          <p>Chargement de la fiche…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ud-page">
        <div className="ud-error">
          <AlertCircle size={40} />
          <h2>Impossible de charger l'utilisateur</h2>
          <p>{error}</p>
          <div className="ud-error-actions">
            <button className="ud-btn ud-btn--outline" onClick={() => navigate("/super-admin/utilisateurs")}>
              <ArrowLeft size={14} /> Retour
            </button>
            <button className="ud-btn ud-btn--primary" onClick={load}>
              <RefreshCw size={14} /> Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.utilisateur) return null;

  const { utilisateur, magasins = [], stats = {} } = data;

  // ==================== RENDER ====================
  return (
    <div className="ud-page">

      {/* ==================== HEADER ==================== */}
      <header className="ud-header">
        <button className="ud-btn ud-btn--ghost" onClick={() => navigate("/super-admin/utilisateurs")}>
          <ArrowLeft size={16} /> Utilisateurs
        </button>

        <div className="ud-identity">
          <div className="ud-avatar">{getInitials(utilisateur.fullname)}</div>
          <div className="ud-identity-text">
            <h1>{utilisateur.fullname || "Sans nom"}</h1>
            <p>
              {utilisateur.email && <span>{utilisateur.email}</span>}
              {utilisateur.email && utilisateur.slug && " • "}
              {utilisateur.slug && <span>/{utilisateur.slug}</span>}
            </p>
          </div>
          <span className={`ud-status ${utilisateur.actif ? "is-on" : "is-off"}`}>
            {utilisateur.actif ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {utilisateur.actif ? "Actif" : "Inactif"}
          </span>
        </div>

        <div className="ud-actions">
          <button
            className={`ud-btn ${utilisateur.actif ? "ud-btn--danger" : "ud-btn--success"}`}
            onClick={handleToggle}
            disabled={toggling}
          >
            <Power size={14} className={toggling ? "ud-spin" : ""} />
            {utilisateur.actif ? "Désactiver" : "Activer"}
          </button>
        </div>
      </header>

      {/* ==================== GRID ==================== */}
      <div className="ud-grid">

        {/* ---------- COLONNE GAUCHE ---------- */}
        <div className="ud-col">

          {/* Identité */}
          <section className="ud-section">
            <h3 className="ud-section-title"><User size={16} /> Identité</h3>
            <dl className="ud-dl">
              <Field label="Nom complet" value={utilisateur.fullname} />
              <Field label="Slug" value={utilisateur.slug} mono />
              <Field label="Email" value={utilisateur.email} link={utilisateur.email ? `mailto:${utilisateur.email}` : null} />
              <Field label="Téléphone" value={utilisateur.telephone} link={utilisateur.telephone ? `tel:${utilisateur.telephone}` : null} />
              <Field label="Rôle" value={utilisateur.role} />
              <Field label="ID" value={`#${utilisateur.id_utilisateur}`} mono />
            </dl>
          </section>

          {/* Activité du compte */}
          <section className="ud-section">
            <h3 className="ud-section-title"><Package size={16} /> Activité du compte</h3>
            <div className="ud-stats-grid">
              <StatTile icon={Package} label="Produits" value={stats.nb_produits} />
              <StatTile icon={Users} label="Clients" value={stats.nb_clients} />
              <StatTile icon={ShoppingCart} label="Commandes" value={stats.nb_commandes} />
              <StatTile icon={Receipt} label="Factures" value={stats.nb_factures} />
              <StatTile icon={Truck} label="Fournisseurs" value={stats.nb_fournisseurs} />
              <StatTile icon={UserCheck} label="Employés" value={stats.nb_employes} />
            </div>
          </section>

          {/* Sécurité / Métadonnées */}
          <section className="ud-section">
            <h3 className="ud-section-title"><Shield size={16} /> Compte</h3>
            <dl className="ud-dl ud-dl--sm">
              <div className="ud-field ud-field--full">
                <dt>Dernière connexion</dt>
                <dd>
                  {utilisateur.derniere_connexion ? (
                    <span className="ud-relative">
                      <Clock size={12} /> {formatRelative(utilisateur.derniere_connexion)}
                      <small>({formatDate(utilisateur.derniere_connexion, true)})</small>
                    </span>
                  ) : (
                    <span className="ud-empty">Jamais connecté</span>
                  )}
                </dd>
              </div>
              <Field label="Inscrit le" value={formatDate(utilisateur.date_creation, true)} />
              <Field label="Statut" value={utilisateur.actif ? "Actif" : "Désactivé"} />
            </dl>
          </section>
        </div>

        {/* ---------- COLONNE DROITE : MAGASINS ---------- */}
        <div className="ud-col">
          <section className="ud-section">
            <div className="ud-section-head">
              <h3 className="ud-section-title"><Store size={16} /> Magasins</h3>
              <span className="ud-count-badge">
                {magasins.length} magasin{magasins.length > 1 ? "s" : ""}
              </span>
            </div>

            {magasins.length === 0 ? (
              <div className="ud-empty-block">
                <Store size={32} />
                <p>Aucun magasin enregistré</p>
              </div>
            ) : (
              <div className="ud-magasins">
                {magasins.map((m) => (
                  <article
                    key={m.id_magasin}
                    className="ud-magasin"
                    onClick={() => navigate(`/super-admin/magasins/${m.id_magasin}`)}
                  >
                    <div className="ud-magasin-logo">
                      {m.logo_url
                        ? <img src={m.logo_url} alt="" onError={(e) => { e.target.style.display = "none"; }} />
                        : <Store size={18} />}
                    </div>
                    <div className="ud-magasin-info">
                      <strong>{m.nom_commercial || "Sans nom"}</strong>
                      <span>
                        {[m.quartier, m.ville, m.pays].filter(Boolean).join(", ") || "—"}
                      </span>
                    </div>
                    <div className="ud-magasin-tags">
                      <span className={`ud-badge ${m.actif ? "ud-badge--success" : "ud-badge--danger"}`}>
                        {m.actif ? "Actif" : "Inactif"}
                      </span>
                      {m.latitude && m.longitude ? (
                        <span className="ud-badge ud-badge--info">
                          <MapPin size={11} /> GPS
                        </span>
                      ) : (
                        <span className="ud-badge ud-badge--warning">
                          <MapPinOff size={11} /> Sans GPS
                        </span>
                      )}
                    </div>
                    <ExternalLink size={14} className="ud-magasin-arrow" />
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

// ==================== SOUS-COMPOSANTS ====================

const Field = ({ label, value, link, full, mono }) => (
  <div className={`ud-field ${full ? "ud-field--full" : ""}`}>
    <dt>{label}</dt>
    <dd className={mono ? "ud-mono" : ""}>
      {value ? (
        link ? <a href={link} target="_blank" rel="noreferrer">{value}</a> : value
      ) : (
        <span className="ud-empty">—</span>
      )}
    </dd>
  </div>
);

const StatTile = ({ icon: Icon, label, value }) => (
  <div className="ud-stat-tile">
    <Icon size={16} className="ud-stat-icon" />
    <div>
      <strong>{parseInt(value) || 0}</strong>
      <span>{label}</span>
    </div>
  </div>
);

export default UtilisateurDetail;