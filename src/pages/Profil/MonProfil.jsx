// pages/Profil/MonProfil.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Phone, Mail, Save, RefreshCw, CheckCircle, AlertCircle,
  Loader2, ArrowLeft, Shield, Award, Calendar, Clock,
  AtSign, Lock, Sparkles, Circle, Check
} from "lucide-react";
import axios from "axios";
import API_URL from "../../config/api";
import { useUser } from "../../context/AuthContext";
import "./MonProfil.css";

// ==================== ÉTAT INITIAL ====================
const INITIAL_FORM = {
  fullname: "",
  telephone: "",
  email: "",
};

// ==================== SECTIONS ====================
const SECTIONS = [
  {
    id: "identity",
    label: "Identité",
    hint: "Nom complet",
    icon: User,
    fields: ["fullname"],
  },
  {
    id: "contact",
    label: "Contact",
    hint: "Téléphone, email",
    icon: Phone,
    fields: ["telephone", "email"],
  },
];

// ==================== COMPOSANT ====================
const MonProfil = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useUser();
  const token = localStorage.getItem("token");

  // ==================== ÉTATS ====================
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [initialData, setInitialData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [touched, setTouched] = useState({});
  const [activeSection, setActiveSection] = useState("identity");

  // ==================== CHARGEMENT ====================
  useEffect(() => {
    if (token) loadProfile();
  }, [token]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(API_URL.AUTH.PROFILE, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        const u = res.data.user;
        setProfile(u);
        const loaded = {
          fullname: u.fullname || "",
          telephone: u.telephone || "",
          email: u.email || "",
        };
        setFormData(loaded);
        setInitialData(loaded);
      } else {
        setError("Profil introuvable");
      }
    } catch (e) {
      console.error("❌ LoadProfile:", e);
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== CHANGEMENTS ====================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  // ==================== DÉTECTION MODIFICATIONS ====================
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  // ==================== COMPLÉTION ====================
  const globalProgress = useMemo(() => {
    const allFields = SECTIONS.flatMap((s) => s.fields);
    const filled = allFields.filter((f) => {
      const val = formData[f];
      return val !== null && val !== undefined && String(val).trim() !== "";
    }).length;
    return Math.round((filled / allFields.length) * 100);
  }, [formData]);

  const getSectionProgress = (section) => {
    const filled = section.fields.filter((f) => {
      const val = formData[f];
      return val !== null && val !== undefined && String(val).trim() !== "";
    }).length;
    return {
      filled,
      total: section.fields.length,
      percent: Math.round((filled / section.fields.length) * 100),
    };
  };

  // ==================== VALIDATION ====================
  const validateField = (name, value) => {
    switch (name) {
      case "fullname":
        if (!value) return "Le nom est obligatoire";
        return value.length >= 2 ? "" : "Minimum 2 caractères";
      case "telephone":
        if (!value) return "";
        return /^[0-9 +\-()]{10,20}$/.test(value) ? "" : "Numéro invalide";
      case "email":
        if (!value) return "";
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Email invalide";
      default:
        return "";
    }
  };

  const getFieldError = (name) => {
    return touched[name] ? validateField(name, formData[name]) : "";
  };

  // ==================== SOUMISSION ====================
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Valider tous les champs touchés
    const errors = {};
    Object.keys(formData).forEach((k) => {
      const err = validateField(k, formData[k]);
      if (err) errors[k] = err;
    });
    if (Object.keys(errors).length > 0) {
      setTouched(Object.keys(formData).reduce((a, k) => ({ ...a, [k]: true }), {}));
      setError("Veuillez corriger les erreurs avant d'enregistrer");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage("");

    try {
      const res = await axios.put(API_URL.AUTH.UPDATE_PROFILE, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setProfile(res.data.user);
        setInitialData(formData);
        setSuccessMessage("Profil mis à jour avec succès");

        // Mettre à jour le contexte utilisateur
        if (updateUser) updateUser(res.data.user);

        setTimeout(() => setSuccessMessage(""), 3500);
      } else {
        setError(res.data.message || "Erreur lors de la mise à jour");
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (isDirty && !window.confirm("Annuler les modifications non enregistrées ?")) return;
    setFormData(initialData);
    setTouched({});
    setError(null);
  };

  // ==================== SCROLL SECTION ====================
  const scrollToSection = (id) => {
    setActiveSection(id);
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ==================== RENDER LOADING ====================
  if (loading) {
    return (
      <div className="mp-page">
        <div className="mp-loading">
          <div className="mp-spinner" />
          <p>Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="mp-page">
        <div className="mp-error-screen">
          <div className="mp-error-screen-icon">
            <AlertCircle size={28} />
          </div>
          <h2>Impossible de charger le profil</h2>
          <p>{error}</p>
          <div className="mp-error-screen-actions">
            <button className="mp-btn mp-btn--outline" onClick={loadProfile}>
              <RefreshCw size={16} />
              Réessayer
            </button>
            <button className="mp-btn mp-btn--ghost" onClick={() => navigate(`/${user?.slug}/dashboard`)}>
              <ArrowLeft size={16} />
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== RENDER PRINCIPAL ====================
  return (
    <div className="mp-page">
      {/* HEADER */}
      <header className="mp-header">
        <div className="mp-header-left">
          <div className="mp-header-icon">
            <User size={22} />
          </div>
          <div>
            <h1 className="mp-title">Mon profil</h1>
            <p className="mp-subtitle">Gérez vos informations personnelles</p>
          </div>
        </div>
        <div className="mp-header-actions">
          {isDirty && (
            <span className="mp-dirty-badge">
              <span className="mp-dirty-dot" />
              Modifications en cours
            </span>
          )}
          <button
            className="mp-btn mp-btn--ghost mp-btn--icon"
            onClick={loadProfile}
            disabled={loading}
            title="Rafraîchir"
          >
            <RefreshCw size={16} className={loading ? "mp-spin" : ""} />
          </button>
        </div>
      </header>

      {/* MESSAGES */}
      {successMessage && (
        <div className="mp-alert mp-alert--success">
          <CheckCircle size={18} />
          <span>{successMessage}</span>
        </div>
      )}
      {error && profile && (
        <div className="mp-alert mp-alert--error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* HERO */}
      <section className="mp-hero">
        <div className="mp-hero-layout">
          <div className="mp-hero-avatar">
            {profile?.fullname ? (
              <span>{profile.fullname.charAt(0).toUpperCase()}</span>
            ) : (
              <User size={32} />
            )}
          </div>
          <div className="mp-hero-info">
            <h2 className="mp-hero-name">{profile?.fullname || "Utilisateur"}</h2>
            <div className="mp-hero-meta">
              <span className="mp-hero-badge">
                <Shield size={12} />
                {profile?.role || "client"}
              </span>
              {profile?.telephone && (
                <span className="mp-hero-meta-item">
                  <Phone size={13} />
                  {profile.telephone}
                </span>
              )}
              {profile?.email ? (
                <span className="mp-hero-meta-item">
                  <Mail size={13} />
                  {profile.email}
                </span>
              ) : (
                <span className="mp-hero-meta-item mp-hero-meta-item--warning">
                  <AlertCircle size={13} />
                  Email non renseigné
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mp-hero-progress">
          <span className="mp-hero-progress-label">Complétion du profil</span>
          <div className="mp-hero-progress-track">
            <div className="mp-hero-progress-fill" style={{ width: `${globalProgress}%` }} />
          </div>
          <span className="mp-hero-progress-percent">{globalProgress}%</span>
        </div>

        {/* Alerte email manquant */}
        {!profile?.email && (
          <div className="mp-hero-alert">
            <AlertCircle size={16} />
            <div>
              <strong>Ajoutez votre email</strong>
              <p>
                Il vous permettra de récupérer votre compte en cas d'oubli de mot de passe.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* LAYOUT */}
      <div className="mp-layout">
        {/* SIDEBAR */}
        <nav className="mp-sidebar" aria-label="Sections">
          {SECTIONS.map((section) => {
            const progress = getSectionProgress(section);
            const isDone = progress.percent === 100;
            const isPartial = progress.percent > 0 && !isDone;
            const Icon = section.icon;

            return (
              <button
                key={section.id}
                className={`mp-nav-item ${activeSection === section.id ? "is-active" : ""}`}
                onClick={() => scrollToSection(section.id)}
              >
                <span className="mp-nav-icon">
                  <Icon size={16} />
                </span>
                <span className="mp-nav-content">
                  <span className="mp-nav-label">{section.label}</span>
                  <span className="mp-nav-hint">
                    {progress.filled}/{progress.total} champs
                  </span>
                </span>
                <span
                  className={`mp-nav-check ${isDone ? "is-done" : ""} ${isPartial ? "is-partial" : ""}`}
                >
                  {isDone ? <Check size={11} /> : <Circle size={9} />}
                </span>
              </button>
            );
          })}
        </nav>

        {/* CONTENU */}
        <form className="mp-content" onSubmit={handleSubmit}>
          {/* ==================== IDENTITÉ ==================== */}
          <section
            id="section-identity"
            className={`mp-section ${activeSection === "identity" ? "is-highlighted" : ""}`}
          >
            <div className="mp-section-head">
              <div className="mp-section-icon mp-section-icon--identity">
                <User size={18} />
              </div>
              <div className="mp-section-title-group">
                <h3 className="mp-section-title">Identité</h3>
                <p className="mp-section-desc">Votre nom complet</p>
              </div>
              <span className="mp-section-counter">
                {getSectionProgress(SECTIONS[0]).filled}/{SECTIONS[0].fields.length}
              </span>
            </div>

            <div className="mp-section-body">
              <div className="mp-form-grid">
                <div className="mp-field mp-field--full">
                  <label htmlFor="fullname">Nom complet</label>
                  <div className="mp-input-wrap">
                    <User size={16} className="mp-input-icon" />
                    <input
                      type="text"
                      id="fullname"
                      name="fullname"
                      className={`mp-input ${getFieldError("fullname") ? "has-error" : ""}`}
                      placeholder="Ex: Jean Dupont"
                      value={formData.fullname}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                      maxLength={100}
                    />
                  </div>
                  {getFieldError("fullname") ? (
                    <span className="mp-field-error">
                      <AlertCircle size={12} />
                      {getFieldError("fullname")}
                    </span>
                  ) : (
                    <span className="mp-field-hint">
                      Ce nom apparaîtra dans l'application
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ==================== CONTACT ==================== */}
          <section
            id="section-contact"
            className={`mp-section ${activeSection === "contact" ? "is-highlighted" : ""}`}
          >
            <div className="mp-section-head">
              <div className="mp-section-icon mp-section-icon--contact">
                <Phone size={18} />
              </div>
              <div className="mp-section-title-group">
                <h3 className="mp-section-title">Contact</h3>
                <p className="mp-section-desc">Téléphone et email</p>
              </div>
              <span className="mp-section-counter">
                {getSectionProgress(SECTIONS[1]).filled}/{SECTIONS[1].fields.length}
              </span>
            </div>

            <div className="mp-section-body">
              <div className="mp-form-grid">
                <div className="mp-field">
                  <label htmlFor="telephone">Téléphone</label>
                  <div className="mp-input-wrap">
                    <Phone size={16} className="mp-input-icon" />
                    <input
                      type="tel"
                      id="telephone"
                      name="telephone"
                      className={`mp-input ${getFieldError("telephone") ? "has-error" : ""}`}
                      placeholder="Ex: 0707070707"
                      value={formData.telephone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                    />
                  </div>
                  {getFieldError("telephone") && (
                    <span className="mp-field-error">
                      <AlertCircle size={12} />
                      {getFieldError("telephone")}
                    </span>
                  )}
                </div>

                <div className="mp-field">
                  <label htmlFor="email">
                    Email
                    {!formData.email && (
                      <span className="mp-label-optional">— recommandé</span>
                    )}
                  </label>
                  <div className="mp-input-wrap">
                    <AtSign size={16} className="mp-input-icon" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className={`mp-input ${getFieldError("email") ? "has-error" : ""}`}
                      placeholder="Ex: jean@exemple.com"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                    />
                  </div>
                  {getFieldError("email") ? (
                    <span className="mp-field-error">
                      <AlertCircle size={12} />
                      {getFieldError("email")}
                    </span>
                  ) : (
                    <span className="mp-field-hint">
                      Utilisé pour récupérer votre compte
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </form>
      </div>

      {/* BARRE D'ACTIONS FLOTTANTE */}
      {isDirty && (
        <div className="mp-action-bar">
          <div className="mp-action-bar-inner">
            <span className="mp-action-text">
              <strong>Modifications non enregistrées</strong>
            </span>
            <div className="mp-action-buttons">
              <button
                type="button"
                className="mp-action-btn mp-action-btn--ghost"
                onClick={handleReset}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                type="button"
                className="mp-action-btn mp-action-btn--primary"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="mp-spinner mp-spinner--sm mp-spinner--light" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonProfil;