// pages/Magasin/MonMagasin.jsx — Refonte complète
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Store, MapPin, Phone, Mail, Save, RefreshCw,
  CheckCircle, AlertCircle, Loader2, Building2,
  User, Hash, ArrowLeft, MessageCircle, FileText,
  ScrollText, IdCard, Palette, Tag,
  Upload, Image as ImageIcon, Trash2, Camera,
  Sparkles, Circle, Check
} from "lucide-react";
import MagasinService from "../../services/magasinService";
import API_URL from "../../config/api";
import { useUser } from "../../context/AuthContext";
import "./MonMagasin.css";

// ==================== ÉTAT INITIAL ====================
const INITIAL_FORM = {
  nom_commercial: '',
  slogan: '',
  logo_url: '',
  description: '',
  quartier: '',
  ville: '',
  pays: '',
  telephone: '',
  telephone2: '',
  whatsapp: '',
  email: '',
  numero_rccm: '',
  numero_nif: '',
  numero_contribuable: '',
  regime_fiscal: ''
};

const REGIMES_FISCAUX = [
  { value: '', label: 'Non défini' },
  { value: 'forfait', label: 'Forfait' },
  { value: 'simplifie', label: 'Simplifié' },
  { value: 'reel', label: 'Réel' },
];

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];

// ==================== SECTIONS ====================
const SECTIONS = [
  {
    id: 'identity',
    label: 'Identité',
    hint: 'Nom, slogan, logo',
    icon: Palette,
    fields: ['nom_commercial', 'slogan', 'logo_url', 'description'],
  },
  {
    id: 'location',
    label: 'Localisation',
    hint: 'Adresse du magasin',
    icon: MapPin,
    fields: ['quartier', 'ville', 'pays'],
  },
  {
    id: 'contact',
    label: 'Contact',
    hint: 'Téléphones, email',
    icon: Phone,
    fields: ['telephone', 'telephone2', 'whatsapp', 'email'],
  },
  {
    id: 'legal',
    label: 'Informations légales',
    hint: 'RCCM, NIF, régime',
    icon: IdCard,
    fields: ['numero_rccm', 'numero_nif', 'numero_contribuable', 'regime_fiscal'],
  },
];

// ==================== COMPOSANT ====================
const MonMagasin = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const token = localStorage.getItem('token');

  // ==================== ÉTATS ====================
  const [magasin, setMagasin] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [initialData, setInitialData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [touched, setTouched] = useState({});

  // Logo
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Navigation section active
  const [activeSection, setActiveSection] = useState('identity');
  const sectionRefs = {
    identity: useRef(null),
    location: useRef(null),
    contact: useRef(null),
    legal: useRef(null),
  };

  // ==================== CHARGEMENT ====================
  useEffect(() => {
    if (token) loadMagasin();
  }, [token]);

  const loadMagasin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await MagasinService.getMonMagasin(token);
      if (res.success && res.magasin) {
        setMagasin(res.magasin);
        const loaded = {
          nom_commercial: res.magasin.nom_commercial || '',
          slogan: res.magasin.slogan || '',
          logo_url: res.magasin.logo_url || '',
          description: res.magasin.description || '',
          quartier: res.magasin.quartier || '',
          ville: res.magasin.ville || '',
          pays: res.magasin.pays || '',
          telephone: res.magasin.telephone || '',
          telephone2: res.magasin.telephone2 || '',
          whatsapp: res.magasin.whatsapp || '',
          email: res.magasin.email || '',
          numero_rccm: res.magasin.numero_rccm || '',
          numero_nif: res.magasin.numero_nif || '',
          numero_contribuable: res.magasin.numero_contribuable || '',
          regime_fiscal: res.magasin.regime_fiscal || '',
        };
        setFormData(loaded);
        setInitialData(loaded);
        setLogoPreview(null);
      } else {
        setError('Magasin introuvable');
      }
    } catch (e) {
      console.error('❌ LoadMagasin:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== CHANGEMENTS ====================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  };

  // ==================== DÉTECTION MODIFICATIONS ====================
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  // ==================== VALIDATION ====================
  const validateField = (name, value) => {
    switch (name) {
      case 'email':
        if (!value) return '';
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Email invalide';
      case 'telephone':
      case 'telephone2':
      case 'whatsapp':
        if (!value) return '';
        return /^[0-9 +\-()]{6,20}$/.test(value) ? '' : 'Numéro invalide';
      case 'nom_commercial':
        if (!value) return '';
        return value.length <= 200 ? '' : 'Trop long (max 200)';
      case 'slogan':
        return value.length <= 200 ? '' : 'Trop long (max 200)';
      case 'quartier':
      case 'ville':
      case 'pays':
        return value.length <= 100 ? '' : 'Trop long (max 100)';
      default:
        return '';
    }
  };

  const getFieldError = (name) => {
    return touched[name] ? validateField(name, formData[name]) : '';
  };

  // ==================== COMPLÉTION PAR SECTION ====================
  const getSectionProgress = useCallback((section) => {
    const fields = section.fields;
    const filled = fields.filter(f => {
      const val = formData[f];
      return val !== null && val !== undefined && String(val).trim() !== '';
    }).length;
    return {
      filled,
      total: fields.length,
      percent: Math.round((filled / fields.length) * 100),
    };
  }, [formData]);

  const globalProgress = useMemo(() => {
    const allFields = SECTIONS.flatMap(s => s.fields);
    const filled = allFields.filter(f => {
      const val = formData[f];
      return val !== null && val !== undefined && String(val).trim() !== '';
    }).length;
    return Math.round((filled / allFields.length) * 100);
  }, [formData]);

  // ==================== LOGO ====================
  const handleLogoClick = () => {
    if (!uploadingLogo) fileInputRef.current?.click();
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) await processLogoUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processLogoUpload = async (file) => {
    if (file.size > MAX_LOGO_SIZE) {
      setError('Le fichier est trop volumineux (max 2 Mo)');
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Format non autorisé. Utilisez JPG, PNG, WEBP ou SVG.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);

    setUploadingLogo(true);
    setError(null);
    try {
      const res = await MagasinService.uploadLogo(token, file);
      if (res.success) {
        setMagasin(res.magasin);
        const newLogo = res.logo_url;
        setFormData(prev => ({ ...prev, logo_url: newLogo }));
        setInitialData(prev => ({ ...prev, logo_url: newLogo }));
        setSuccessMessage('Logo mis à jour avec succès');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError(err.message);
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!uploadingLogo) setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    if (uploadingLogo) return;
    const file = e.dataTransfer.files?.[0];
    if (file) await processLogoUpload(file);
  };

  const handleDeleteLogo = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer le logo ?')) return;

    try {
      const res = await MagasinService.deleteLogo(token);
      if (res.success) {
        setMagasin(prev => ({ ...prev, logo_url: null }));
        setFormData(prev => ({ ...prev, logo_url: '' }));
        setInitialData(prev => ({ ...prev, logo_url: '' }));
        setLogoPreview(null);
        setSuccessMessage('Logo supprimé');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const getLogoFullUrl = () => {
    if (logoPreview) return logoPreview;
    if (magasin?.logo_url) {
      if (magasin.logo_url.startsWith('http')) return magasin.logo_url;
      const base = API_URL.MAGASIN.GET_MON_MAGASIN.replace('/api/magasin/mon-magasin', '');
      return `${base}${magasin.logo_url}`;
    }
    return null;
  };

  // ==================== SOUMISSION ====================
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage('');

    try {
      const res = await MagasinService.updateMonMagasin(token, formData);
      if (res.success) {
        setMagasin(res.magasin);
        setInitialData(formData);
        setSuccessMessage('Informations enregistrées avec succès');
        setTimeout(() => setSuccessMessage(''), 3500);
      } else {
        setError(res.message || 'Erreur lors de la mise à jour');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (isDirty && !window.confirm('Annuler les modifications non enregistrées ?')) return;
    setFormData(initialData);
    setTouched({});
    setError(null);
  };

  // ==================== NAVIGATION SECTION ====================
  const scrollToSection = (id) => {
    setActiveSection(id);
    sectionRefs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ==================== RENDER LOADING ====================
  if (loading) {
    return (
      <div className="mg-page">
        <div className="mg-loading">
          <div className="mg-spinner" />
          <p>Chargement du magasin...</p>
        </div>
      </div>
    );
  }

  // ==================== RENDER ERREUR GLOBALE ====================
  if (error && !magasin) {
    return (
      <div className="mg-page">
        <div className="mg-error-screen">
          <div className="mg-error-screen-icon">
            <AlertCircle size={28} />
          </div>
          <h2>Impossible de charger le magasin</h2>
          <p>{error}</p>
          <div className="mg-error-screen-actions">
            <button className="mg-btn mg-btn--outline" onClick={loadMagasin}>
              <RefreshCw size={16} />
              Réessayer
            </button>
            <button className="mg-btn mg-btn--ghost" onClick={() => navigate(`/${slug}/dashboard`)}>
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
    <div className="mg-page">
      {/* ==================== HEADER ==================== */}
      <header className="mg-header">
        <div className="mg-header-left">
          <div className="mg-header-icon">
            <Store size={22} />
          </div>
          <div>
            <h1 className="mg-title">Mon magasin</h1>
            <p className="mg-subtitle">
              Personnalisez l'identité de votre établissement
            </p>
          </div>
        </div>

        <div className="mg-header-actions">
          {isDirty && (
            <span className="mg-dirty-badge">
              <span className="mg-dirty-dot" />
              Modifications en cours
            </span>
          )}
          <button
            className="mg-btn mg-btn--ghost mg-btn--icon"
            onClick={loadMagasin}
            disabled={loading}
            title="Rafraîchir"
            aria-label="Rafraîchir"
          >
            <RefreshCw size={16} className={loading ? 'mg-spin' : ''} />
          </button>
        </div>
      </header>

      {/* ==================== MESSAGES ==================== */}
      {successMessage && (
        <div className="mg-alert mg-alert--success">
          <CheckCircle size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && magasin && (
        <div className="mg-alert mg-alert--error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ==================== HERO — VITRINE ==================== */}
      <section className="mg-hero">
        <div className="mg-hero-layout">
          {/* Logo */}
          <div
            className="mg-hero-logo"
            onClick={handleLogoClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {getLogoFullUrl() ? (
              <img src={getLogoFullUrl()} alt="Logo du magasin" />
            ) : (
              <div className="mg-hero-logo-empty">
                <ImageIcon size={26} />
                <span>Ajouter un logo</span>
              </div>
            )}
            <div className="mg-hero-logo-overlay">
              <Camera size={16} />
              <span>{getLogoFullUrl() ? 'Changer' : 'Ajouter'}</span>
            </div>
            {uploadingLogo && (
              <div className="mg-logo-uploading">
                <Loader2 size={20} className="mg-spin" />
                <span>Upload...</span>
              </div>
            )}
          </div>

          {/* Infos */}
          <div className="mg-hero-info">
            <h2 className={`mg-hero-name ${!formData.nom_commercial ? 'mg-hero-name--placeholder' : ''}`}>
              {formData.nom_commercial || 'Nom de votre magasin'}
            </h2>
            {(formData.slogan || !formData.nom_commercial) && (
              <p className="mg-hero-slogan">
                {formData.slogan || 'Votre slogan apparaîtra ici'}
              </p>
            )}
            <div className="mg-hero-meta">
              {(formData.ville || formData.pays) && (
                <span className="mg-hero-meta-item">
                  <MapPin size={13} />
                  {[formData.quartier, formData.ville, formData.pays].filter(Boolean).join(', ')}
                </span>
              )}
              {formData.telephone && (
                <span className="mg-hero-meta-item">
                  <Phone size={13} />
                  {formData.telephone}
                </span>
              )}
              {formData.email && (
                <span className="mg-hero-meta-item">
                  <Mail size={13} />
                  {formData.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Barre de progression globale */}
        <div className="mg-hero-progress">
          <span className="mg-hero-progress-label">
            Complétion du profil
          </span>
          <div className="mg-hero-progress-track">
            <div
              className="mg-hero-progress-fill"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
          <span className="mg-hero-progress-percent">{globalProgress}%</span>
        </div>
      </section>

      {/* ==================== LAYOUT ==================== */}
      <div className="mg-layout">
        {/* SIDEBAR */}
        <nav className="mg-sidebar" aria-label="Sections">
          {SECTIONS.map(section => {
            const progress = getSectionProgress(section);
            const isDone = progress.percent === 100;
            const isPartial = progress.percent > 0 && !isDone;
            const Icon = section.icon;

            return (
              <button
                key={section.id}
                className={`mg-nav-item ${activeSection === section.id ? 'is-active' : ''}`}
                onClick={() => scrollToSection(section.id)}
              >
                <span className="mg-nav-icon">
                  <Icon size={16} />
                </span>
                <span className="mg-nav-content">
                  <span className="mg-nav-label">{section.label}</span>
                  <span className="mg-nav-hint">
                    {progress.filled}/{progress.total} champs
                  </span>
                </span>
                <span
                  className={`mg-nav-check ${isDone ? 'is-done' : ''} ${isPartial ? 'is-partial' : ''}`}
                  aria-hidden="true"
                >
                  {isDone ? <Check size={11} /> : <Circle size={9} />}
                </span>
              </button>
            );
          })}
        </nav>

        {/* CONTENU */}
        <form className="mg-content" onSubmit={handleSubmit}>
          {/* ==================== SECTION IDENTITÉ ==================== */}
          <section
            ref={sectionRefs.identity}
            className={`mg-section ${activeSection === 'identity' ? 'is-highlighted' : ''}`}
          >
            <div className="mg-section-head">
              <div className="mg-section-icon mg-section-icon--identity">
                <Palette size={18} />
              </div>
              <div className="mg-section-title-group">
                <h3 className="mg-section-title">Identité commerciale</h3>
                <p className="mg-section-desc">Comment votre magasin se présente</p>
              </div>
              <SectionCounter section={SECTIONS[0]} formData={formData} />
            </div>

            <div className="mg-section-body">
              {/* Ligne Logo */}
              <div className="mg-logo-row">
                <div
                  className={`mg-logo-drop ${dragOver ? 'is-drag-over' : ''} ${uploadingLogo ? 'is-uploading' : ''} ${getLogoFullUrl() ? 'has-image' : ''}`}
                  onClick={handleLogoClick}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {getLogoFullUrl() ? (
                    <img src={getLogoFullUrl()} alt="Logo" />
                  ) : (
                    <div className="mg-logo-drop-empty">
                      <ImageIcon size={24} />
                      <span>Déposer ici</span>
                      <small>ou cliquer</small>
                    </div>
                  )}
                  <div className="mg-logo-hover">
                    <Camera size={18} />
                    <span>{getLogoFullUrl() ? 'Changer' : 'Ajouter'}</span>
                  </div>
                  {uploadingLogo && (
                    <div className="mg-logo-uploading">
                      <Loader2 size={22} className="mg-spin" />
                      <span>Upload...</span>
                    </div>
                  )}
                </div>

                <div className="mg-logo-info">
                  <h4>Logo du magasin</h4>
                  <p>
                    Ce logo apparaîtra sur vos factures, tickets et documents officiels.
                    Format carré recommandé.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_TYPES.join(',')}
                    onChange={handleLogoChange}
                    style={{ display: 'none' }}
                  />
                  <div className="mg-logo-actions">
                    <button
                      type="button"
                      className="mg-btn mg-btn--primary mg-btn--sm"
                      onClick={handleLogoClick}
                      disabled={uploadingLogo}
                    >
                      <Upload size={14} />
                      {getLogoFullUrl() ? 'Changer' : 'Choisir un fichier'}
                    </button>
                    {getLogoFullUrl() && (
                      <button
                        type="button"
                        className="mg-btn mg-btn--danger-outline mg-btn--sm"
                        onClick={handleDeleteLogo}
                        disabled={uploadingLogo}
                        title="Supprimer le logo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Champs texte */}
              <div className="mg-form-grid">
                <div className="mg-field mg-field--full">
                  <label htmlFor="nom_commercial">
                    Nom commercial
                  </label>
                  <div className="mg-input-wrap">
                    <Store size={16} className="mg-input-icon" />
                    <input
                      type="text"
                      id="nom_commercial"
                      name="nom_commercial"
                      className={`mg-input ${getFieldError('nom_commercial') ? 'has-error' : ''}`}
                      placeholder="Ex: Boutique Miyo"
                      value={formData.nom_commercial}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                      maxLength={200}
                    />
                  </div>
                  {getFieldError('nom_commercial') ? (
                    <span className="mg-field-error">
                      <AlertCircle size={12} />
                      {getFieldError('nom_commercial')}
                    </span>
                  ) : (
                    <span className="mg-field-hint">
                      Le nom qui apparaîtra sur vos factures
                    </span>
                  )}
                </div>

                <div className="mg-field mg-field--full">
                  <label htmlFor="slogan">Slogan</label>
                  <div className="mg-input-wrap">
                    <Tag size={16} className="mg-input-icon" />
                    <input
                      type="text"
                      id="slogan"
                      name="slogan"
                      className={`mg-input ${getFieldError('slogan') ? 'has-error' : ''}`}
                      placeholder="Ex: Votre partenaire de confiance"
                      value={formData.slogan}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                      maxLength={200}
                    />
                  </div>
                  {getFieldError('slogan') && (
                    <span className="mg-field-error">
                      <AlertCircle size={12} />
                      {getFieldError('slogan')}
                    </span>
                  )}
                </div>

                <div className="mg-field mg-field--full">
                  <label htmlFor="description">Description</label>
                  <div className="mg-input-wrap">
                    <ScrollText size={16} className="mg-input-icon" />
                    <textarea
                      id="description"
                      name="description"
                      className="mg-textarea"
                      placeholder="Présentation courte de votre activité..."
                      value={formData.description}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                      rows={3}
                    />
                  </div>
                  <span className="mg-field-hint">
                    Quelques phrases pour décrire votre activité
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ==================== SECTION LOCALISATION ==================== */}
          <section
            ref={sectionRefs.location}
            className={`mg-section ${activeSection === 'location' ? 'is-highlighted' : ''}`}
          >
            <div className="mg-section-head">
              <div className="mg-section-icon mg-section-icon--location">
                <MapPin size={18} />
              </div>
              <div className="mg-section-title-group">
                <h3 className="mg-section-title">Localisation</h3>
                <p className="mg-section-desc">Où se trouve votre magasin</p>
              </div>
              <SectionCounter section={SECTIONS[1]} formData={formData} />
            </div>

            <div className="mg-section-body">
              <div className="mg-form-grid">
                <div className="mg-field">
                  <label htmlFor="quartier">Quartier</label>
                  <div className="mg-input-wrap">
                    <MapPin size={16} className="mg-input-icon" />
                    <input
                      type="text"
                      id="quartier"
                      name="quartier"
                      className="mg-input"
                      placeholder="Ex: Cocody"
                      value={formData.quartier}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="mg-field">
                  <label htmlFor="ville">Ville</label>
                  <div className="mg-input-wrap">
                    <Building2 size={16} className="mg-input-icon" />
                    <input
                      type="text"
                      id="ville"
                      name="ville"
                      className="mg-input"
                      placeholder="Ex: Abidjan"
                      value={formData.ville}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="mg-field mg-field--full">
                  <label htmlFor="pays">Pays</label>
                  <div className="mg-input-wrap">
                    <MapPin size={16} className="mg-input-icon" />
                    <input
                      type="text"
                      id="pays"
                      name="pays"
                      className="mg-input"
                      placeholder="Ex: Côte d'Ivoire"
                      value={formData.pays}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                      maxLength={100}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ==================== SECTION CONTACT ==================== */}
          <section
            ref={sectionRefs.contact}
            className={`mg-section ${activeSection === 'contact' ? 'is-highlighted' : ''}`}
          >
            <div className="mg-section-head">
              <div className="mg-section-icon mg-section-icon--contact">
                <Phone size={18} />
              </div>
              <div className="mg-section-title-group">
                <h3 className="mg-section-title">Contact</h3>
                <p className="mg-section-desc">Comment vos clients vous joignent</p>
              </div>
              <SectionCounter section={SECTIONS[2]} formData={formData} />
            </div>

            <div className="mg-section-body">
              <div className="mg-form-grid">
                <div className="mg-field">
                  <label htmlFor="telephone">Téléphone principal</label>
                  <div className="mg-input-wrap">
                    <Phone size={16} className="mg-input-icon" />
                    <input
                      type="tel"
                      id="telephone"
                      name="telephone"
                      className={`mg-input ${getFieldError('telephone') ? 'has-error' : ''}`}
                      placeholder="Ex: 0707070707"
                      value={formData.telephone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                    />
                  </div>
                  {getFieldError('telephone') && (
                    <span className="mg-field-error">
                      <AlertCircle size={12} />
                      {getFieldError('telephone')}
                    </span>
                  )}
                </div>

                <div className="mg-field">
                  <label htmlFor="telephone2">Téléphone secondaire</label>
                  <div className="mg-input-wrap">
                    <Phone size={16} className="mg-input-icon" />
                    <input
                      type="tel"
                      id="telephone2"
                      name="telephone2"
                      className={`mg-input ${getFieldError('telephone2') ? 'has-error' : ''}`}
                      placeholder="Ex: 0505050505"
                      value={formData.telephone2}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                    />
                  </div>
                  {getFieldError('telephone2') && (
                    <span className="mg-field-error">
                      <AlertCircle size={12} />
                      {getFieldError('telephone2')}
                    </span>
                  )}
                </div>

                <div className="mg-field">
                  <label htmlFor="whatsapp">WhatsApp Business</label>
                  <div className="mg-input-wrap">
                    <MessageCircle size={16} className="mg-input-icon" />
                    <input
                      type="tel"
                      id="whatsapp"
                      name="whatsapp"
                      className={`mg-input ${getFieldError('whatsapp') ? 'has-error' : ''}`}
                      placeholder="Ex: 0707070707"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                    />
                  </div>
                  {getFieldError('whatsapp') && (
                    <span className="mg-field-error">
                      <AlertCircle size={12} />
                      {getFieldError('whatsapp')}
                    </span>
                  )}
                </div>

                <div className="mg-field">
                  <label htmlFor="email">Email</label>
                  <div className="mg-input-wrap">
                    <Mail size={16} className="mg-input-icon" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className={`mg-input ${getFieldError('email') ? 'has-error' : ''}`}
                      placeholder="Ex: contact@boutique.ci"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                    />
                  </div>
                  {getFieldError('email') && (
                    <span className="mg-field-error">
                      <AlertCircle size={12} />
                      {getFieldError('email')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ==================== SECTION LÉGAL ==================== */}
          <section
            ref={sectionRefs.legal}
            className={`mg-section ${activeSection === 'legal' ? 'is-highlighted' : ''}`}
          >
            <div className="mg-section-head">
              <div className="mg-section-icon mg-section-icon--legal">
                <IdCard size={18} />
              </div>
              <div className="mg-section-title-group">
                <h3 className="mg-section-title">Informations légales</h3>
                <p className="mg-section-desc">Mentions obligatoires sur vos factures</p>
              </div>
              <SectionCounter section={SECTIONS[3]} formData={formData} />
            </div>

            <div className="mg-section-body">
              <div className="mg-alert mg-alert--info" style={{ marginBottom: 20 }}>
                <span>
                  Ces informations sont optionnelles. Elles apparaîtront sur vos factures si renseignées.
                </span>
              </div>

              <div className="mg-form-grid mg-form-grid--3">
                <div className="mg-field">
                  <label htmlFor="numero_rccm">N° RCCM</label>
                  <div className="mg-input-wrap">
                    <Hash size={16} className="mg-input-icon" />
                    <input
                      type="text"
                      id="numero_rccm"
                      name="numero_rccm"
                      className="mg-input"
                      placeholder="CI-ABJ-2024-B-12345"
                      value={formData.numero_rccm}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                      maxLength={50}
                    />
                  </div>
                </div>

                <div className="mg-field">
                  <label htmlFor="numero_nif">N° NIF</label>
                  <div className="mg-input-wrap">
                    <Hash size={16} className="mg-input-icon" />
                    <input
                      type="text"
                      id="numero_nif"
                      name="numero_nif"
                      className="mg-input"
                      placeholder="2024-1234567"
                      value={formData.numero_nif}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                      maxLength={50}
                    />
                  </div>
                </div>

                <div className="mg-field">
                  <label htmlFor="numero_contribuable">N° Contribuable</label>
                  <div className="mg-input-wrap">
                    <Hash size={16} className="mg-input-icon" />
                    <input
                      type="text"
                      id="numero_contribuable"
                      name="numero_contribuable"
                      className="mg-input"
                      placeholder="1234567890"
                      value={formData.numero_contribuable}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                      maxLength={50}
                    />
                  </div>
                </div>

                <div className="mg-field">
                  <label htmlFor="regime_fiscal">Régime fiscal</label>
                  <div className="mg-input-wrap">
                    <ScrollText size={16} className="mg-input-icon" />
                    <select
                      id="regime_fiscal"
                      name="regime_fiscal"
                      className="mg-select"
                      value={formData.regime_fiscal}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={saving}
                    >
                      {REGIMES_FISCAUX.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </form>
      </div>

      {/* ==================== BARRE D'ACTIONS FLOTTANTE ==================== */}
      {isDirty && (
        <div className="mg-action-bar">
          <div className="mg-action-bar-inner">
            <span className="mg-action-text">
              <strong>Modifications non enregistrées</strong>
            </span>
            <div className="mg-action-buttons">
              <button
                type="button"
                className="mg-action-btn mg-action-btn--ghost"
                onClick={handleReset}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                type="button"
                className="mg-action-btn mg-action-btn--primary"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="mg-spinner mg-spinner--sm mg-spinner--light" />
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

// ==================== SOUS-COMPOSANT : COMPTEUR DE SECTION ====================
const SectionCounter = ({ section, formData }) => {
  const filled = section.fields.filter(f => {
    const val = formData[f];
    return val !== null && val !== undefined && String(val).trim() !== '';
  }).length;
  const total = section.fields.length;
  const isDone = filled === total;
  const isPartial = filled > 0 && !isDone;

  return (
    <span className={`mg-section-counter ${isDone ? 'is-done' : ''} ${isPartial ? 'is-partial' : ''}`}>
      {isDone ? <CheckCircle size={12} /> : <Circle size={10} />}
      {filled}/{total}
    </span>
  );
};

export default MonMagasin;