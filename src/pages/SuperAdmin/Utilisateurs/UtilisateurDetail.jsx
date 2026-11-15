// pages/SuperAdmin/Utilisateurs/UtilisateurDetail.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, User, Mail, Phone, Store, MapPin, Clock,
  CheckCircle2, XCircle, Power, RefreshCw, AlertCircle,
  Package, Users, ShoppingCart, Receipt, UserCheck, Truck,
  Calendar, Shield, ExternalLink, MapPinOff, CreditCard, Activity
} from "lucide-react";
import UtilisateurAdminService from "../../../services/superAdmin/utilisateurAdminService";
import AbonnementAdminService from "../../../services/superAdmin/abonnementAdminService";
import SuiviAdminService from "../../../services/superAdmin/suiviAdminService";
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
  const [abo, setAbo] = useState(undefined);        // undefined = chargement
  const [activite, setActivite] = useState(undefined);

  useEffect(() => {
    setAbo(undefined);
    setActivite(undefined);
    AbonnementAdminService.detail(id)
      .then((r) => setAbo(r?.success ? r : null))
      .catch(() => setAbo(null));
    SuiviAdminService.activite({ patron: id, jours: 90, limite: 8 })
      .then((r) => setActivite(r?.evenements || []))
      .catch(() => setActivite(null));
  }, [id]);

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

        {/* ---------- COLONNE DROITE ---------- */}
        <div className="ud-col">

          {/* Abonnement */}
          <section className="ud-section">
            <div className="ud-section-head">
              <h3 className="ud-section-title"><CreditCard size={16} /> Abonnement</h3>
              <button className="ud-btn ud-btn--primary ud-btn--sm"
                      onClick={() => navigate(`/super-admin/abonnements?patron=${utilisateur.id_utilisateur}`)}>
                Prolonger
              </button>
            </div>
            <AbonnementBloc data={abo} />
          </section>

          {/* Activité récente */}
          <section className="ud-section">
            <div className="ud-section-head">
              <h3 className="ud-section-title"><Activity size={16} /> Activité récente</h3>
              <span className="ud-count-badge">90 derniers jours</span>
            </div>
            <ActiviteBloc evenements={activite} />
          </section>
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

const fcfa = (n) => `${Math.round(Number(n) || 0).toLocaleString("fr-FR")} FCFA`;

const AbonnementBloc = ({ data }) => {
  if (data === undefined) return <p className="ud-muted-line">Chargement…</p>;
  if (!data?.abonnement) return <p className="ud-muted-line">Abonnement indisponible.</p>;
  const a = data.abonnement;
  const j = a.jours_restants;
  let cls = "ok", txt = "Abonné";
  if (a.statut === "expire") { cls = "expire"; txt = "Expiré"; }
  else if (j <= 5) { cls = "bientot"; txt = a.statut === "essai" ? "Essai, bientôt fini" : "Bientôt fini"; }
  else if (a.statut === "essai") { cls = "essai"; txt = "Essai gratuit"; }
  const echeance = a.statut === "expire"
    ? `Expiré depuis ${Math.abs(j)} jour${Math.abs(j) > 1 ? "s" : ""}`
    : j === 0 ? "Dernier jour aujourd'hui" : `${j} jour${j > 1 ? "s" : ""} restant${j > 1 ? "s" : ""}`;
  const historique = data.historique || [];
  const total = historique.reduce((s, h) => s + (Number(h.montant) || 0), 0);
  return (
    <div className="ud-abo">
      <div className="ud-abo-tete">
        <span className={`ud-abo-badge ud-abo--${cls}`}>{txt}</span>
        <div>
          <strong>{a.statut === "expire" ? "Fin le" : "Valable jusqu'au"} {formatDate(a.date_fin)}</strong>
          <small>{echeance}</small>
        </div>
      </div>
      <dl className="ud-dl ud-dl--sm">
        <Field label="Paiements" value={String(historique.length)} />
        <Field label="Total payé" value={fcfa(total)} />
      </dl>
      {historique.length > 0 && (
        <ol className="ud-liste-num">
          {historique.slice(0, 3).map((h, i) => (
            <li key={h.id_abonnement || i}>
              <span>{formatDate(h.date_creation)}</span>
              <span>{h.nb_mois} mois</span>
              <strong>{fcfa(h.montant)}</strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

const ActiviteBloc = ({ evenements }) => {
  if (evenements === undefined) return <p className="ud-muted-line">Chargement…</p>;
  if (evenements === null) return <p className="ud-muted-line">Activité indisponible.</p>;
  if (evenements.length === 0) return <p className="ud-muted-line">Aucune action enregistrée sur cette période.</p>;
  return (
    <ol className="ud-liste-num ud-fil">
      {evenements.map((e, i) => (
        <li key={i}>
          <div>
            <strong>
              {e.acteur_nom && /^[a-zà-ÿ]/.test(e.libelle || "") ? `${e.acteur_nom} ${e.libelle}` : e.libelle}
            </strong>
            <small>{[e.module && e.source === "journal" ? e.module.replace(/-/g, " ") : null, e.nom_magasin].filter(Boolean).join(" · ")}</small>
          </div>
          <span className="ud-fil-date">{formatRelative(e.date_action)}</span>
        </li>
      ))}
    </ol>
  );
};

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