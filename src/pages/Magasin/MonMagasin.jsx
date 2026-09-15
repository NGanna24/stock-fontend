// pages/Magasin/MonMagasin.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Store, MapPin, Phone, Mail, Save, RefreshCw,
    CheckCircle, AlertCircle, Loader2, Building2,
    User, Hash, ArrowLeft, MessageCircle, FileText,
    ScrollText, IdCard, Palette, Tag,
    Upload, Image as ImageIcon, Trash2, Camera
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

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 Mo
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];

// ==================== COMPOSANT ====================
const MonMagasin = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();
    const token = localStorage.getItem('token');

    // ==================== ÉTATS ====================
    const [magasin, setMagasin] = useState(null);
    const [formData, setFormData] = useState(INITIAL_FORM);
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
                setFormData({
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
                });
                setLogoPreview(null); // reset preview après chargement
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

    // ==================== LOGO : GESTION ====================
    const handleLogoClick = () => {
        if (!uploadingLogo) fileInputRef.current?.click();
    };

    const handleLogoChange = async (e) => {
        const file = e.target.files?.[0];
        if (file) await processLogoUpload(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const processLogoUpload = async (file) => {
        // Validations client
        if (file.size > MAX_LOGO_SIZE) {
            setError('Le fichier est trop volumineux (max 2 Mo)');
            return;
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            setError('Format non autorisé. Utilisez JPG, PNG, WEBP ou SVG.');
            return;
        }

        // Preview immédiate
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result);
        reader.readAsDataURL(file);

        // Upload serveur
        setUploadingLogo(true);
        setError(null);
        try {
            const res = await MagasinService.uploadLogo(token, file);
            if (res.success) {
                setMagasin(res.magasin);
                setFormData(prev => ({ ...prev, logo_url: res.logo_url }));
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

    // Drag & Drop
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
                setLogoPreview(null);
                setSuccessMessage('Logo supprimé');
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    // URL complète du logo pour l'affichage
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
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccessMessage('');

        try {
            const res = await MagasinService.updateMonMagasin(token, formData);
            if (res.success) {
                setMagasin(res.magasin);
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

    // ==================== RENDER LOADING ====================
    if (loading) {
        return (
            <div className="magasin-container">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Chargement du magasin...</p>
                </div>
            </div>
        );
    }

    // ==================== RENDER ERREUR GLOBALE ====================
    if (error && !magasin) {
        return (
            <div className="magasin-container">
                <div className="error-container">
                    <AlertCircle size={40} />
                    <p className="error-message">{error}</p>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-secondary" onClick={loadMagasin}>
                            <RefreshCw size={18} /> Réessayer
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate(`/${slug}/dashboard`)}>
                            <ArrowLeft size={18} /> Retour
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== RENDER PRINCIPAL ====================
    return (
        <div className="magasin-container">
            {/* ==================== EN-TÊTE ==================== */}
            <div className="magasin-header">
                <div className="magasin-header-left">
                    <div className="magasin-icon-large">
                        <Store size={28} />
                    </div>
                    <div>
                        <h1 className="magasin-title">Mon magasin</h1>
                        <p className="magasin-subtitle">
                            Complétez les informations de votre établissement
                        </p>
                    </div>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={loadMagasin}
                    disabled={loading}
                    title="Rafraîchir"
                >
                    <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                </button>
            </div>

            {/* ==================== MESSAGES ==================== */}
            {successMessage && (
                <div className="alert alert-success">
                    <CheckCircle size={20} />
                    <span>{successMessage}</span>
                </div>
            )}

            {error && magasin && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* ==================== SECTION 1 : IDENTITÉ ==================== */}
                <div className="dashboard-card">
                    <div className="card-header">
                        <h3><Palette size={16} /> Identité commerciale</h3>
                    </div>
                    <div className="card-body">

                        {/* ==================== LOGO UPLOAD ==================== */}
                        <div className="logo-section">
                            <label className="logo-section-label">Logo du magasin</label>

                            <div className="logo-upload-layout">
                                {/* Zone de prévisualisation / drop */}
                                <div
                                    className={`logo-dropzone ${dragOver ? 'drag-over' : ''} ${uploadingLogo ? 'uploading' : ''} ${getLogoFullUrl() ? 'has-image' : ''}`}
                                    onClick={handleLogoClick}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    {getLogoFullUrl() ? (
                                        <img
                                            src={getLogoFullUrl()}
                                            alt="Logo du magasin"
                                            onError={() => setLogoPreview(null)}
                                        />
                                    ) : (
                                        <div className="logo-dropzone-empty">
                                            <div className="logo-dropzone-icon">
                                                <ImageIcon size={28} />
                                            </div>
                                            <span>Cliquez ou déposez votre logo</span>
                                            <small>JPG, PNG, WEBP, SVG • Max 2 Mo</small>
                                        </div>
                                    )}

                                    {/* Overlay au survol */}
                                    <div className="logo-hover-overlay">
                                        <Camera size={20} />
                                        <span>{getLogoFullUrl() ? 'Changer' : 'Ajouter'}</span>
                                    </div>

                                    {/* Overlay d'upload */}
                                    {uploadingLogo && (
                                        <div className="logo-uploading-overlay">
                                            <Loader2 size={24} className="spinner" />
                                            <span>Upload...</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions à droite */}
                                <div className="logo-actions">
                                    <p className="logo-actions-title">Votre logo</p>
                                    <p className="logo-actions-desc">
                                        Il apparaîtra sur vos factures et documents.
                                    </p>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={ALLOWED_TYPES.join(',')}
                                        onChange={handleLogoChange}
                                        style={{ display: 'none' }}
                                    />

                                    <div className="logo-actions-buttons">
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={handleLogoClick}
                                            disabled={uploadingLogo}
                                        >
                                            <Upload size={16} />
                                            {getLogoFullUrl() ? 'Changer le logo' : 'Choisir un fichier'}
                                        </button>

                                        {getLogoFullUrl() && (
                                            <button
                                                type="button"
                                                className="btn btn-danger-outline btn-sm"
                                                onClick={handleDeleteLogo}
                                                disabled={uploadingLogo}
                                                title="Supprimer le logo"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ==================== CHAMPS TEXTE ==================== */}
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label htmlFor="nom_commercial">Nom commercial</label>
                                <div className="input-wrapper">
                                    <Store size={18} className="input-icon-left" />
                                    <input
                                        type="text"
                                        id="nom_commercial"
                                        name="nom_commercial"
                                        placeholder="Ex: Boutique Miyo"
                                        value={formData.nom_commercial}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={saving}
                                        maxLength={200}
                                        className={getFieldError('nom_commercial') ? 'error' : ''}
                                    />
                                </div>
                                {getFieldError('nom_commercial') && (
                                    <span className="field-error">{getFieldError('nom_commercial')}</span>
                                )}
                                <small>Le nom qui apparaîtra sur vos factures</small>
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="slogan">Slogan</label>
                                <div className="input-wrapper">
                                    <Tag size={18} className="input-icon-left" />
                                    <input
                                        type="text"
                                        id="slogan"
                                        name="slogan"
                                        placeholder="Ex: Votre partenaire de confiance"
                                        value={formData.slogan}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={saving}
                                        maxLength={200}
                                        className={getFieldError('slogan') ? 'error' : ''}
                                    />
                                </div>
                                {getFieldError('slogan') && (
                                    <span className="field-error">{getFieldError('slogan')}</span>
                                )}
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="description">Description</label>
                                <div className="input-wrapper">
                                    <ScrollText size={18} className="input-icon-left" />
                                    <textarea
                                        id="description"
                                        name="description"
                                        placeholder="Présentation courte de votre activité..."
                                        value={formData.description}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={saving}
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ==================== SECTION 2 : LOCALISATION ==================== */}
                <div className="dashboard-card">
                    <div className="card-header">
                        <h3><MapPin size={16} /> Localisation</h3>
                    </div>
                    <div className="card-body">
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="quartier">Quartier</label>
                                <div className="input-wrapper">
                                    <MapPin size={18} className="input-icon-left" />
                                    <input
                                        type="text"
                                        id="quartier"
                                        name="quartier"
                                        placeholder="Ex: Cocody"
                                        value={formData.quartier}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={saving}
                                        maxLength={100}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="ville">Ville</label>
                                <div className="input-wrapper">
                                    <Building2 size={18} className="input-icon-left" />
                                    <input
                                        type="text"
                                        id="ville"
                                        name="ville"
                                        placeholder="Ex: Abidjan"
                                        value={formData.ville}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={saving}
                                        maxLength={100}
                                    />
                                </div>
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="pays">Pays</label>
                                <div className="input-wrapper">
                                    <MapPin size={18} className="input-icon-left" />
                                    <input
                                        type="text"
                                        id="pays"
                                        name="pays"
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
                </div>

                {/* ==================== SECTION 3 : CONTACT ==================== */}
                <div className="dashboard-card">
                    <div className="card-header">
                        <h3><Phone size={16} /> Contact</h3>
                    </div>
                    <div className="card-body">
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="telephone">Téléphone principal</label>
                                <div className="input-wrapper">
                                    <Phone size={18} className="input-icon-left" />
                                    <input
                                        type="tel"
                                        id="telephone"
                                        name="telephone"
                                        placeholder="Ex: 0707070707"
                                        value={formData.telephone}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={saving}
                                        className={getFieldError('telephone') ? 'error' : ''}
                                    />
                                </div>
                                {getFieldError('telephone') && (
                                    <span className="field-error">{getFieldError('telephone')}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="telephone2">Téléphone secondaire</label>
                                <div className="input-wrapper">
                                    <Phone size={18} className="input-icon-left" />
                                    <input
                                        type="tel"
                                        id="telephone2"
                                        name="telephone2"
                                        placeholder="Ex: 0505050505"
                                        value={formData.telephone2}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={saving}
                                        className={getFieldError('telephone2') ? 'error' : ''}
                                    />
                                </div>
                                {getFieldError('telephone2') && (
                                    <span className="field-error">{getFieldError('telephone2')}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="whatsapp">WhatsApp Business</label>
                                <div className="input-wrapper">
                                    <MessageCircle size={18} className="input-icon-left" />
                                    <input
                                        type="tel"
                                        id="whatsapp"
                                        name="whatsapp"
                                        placeholder="Ex: 0707070707"
                                        value={formData.whatsapp}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={saving}
                                        className={getFieldError('whatsapp') ? 'error' : ''}
                                    />
                                </div>
                                {getFieldError('whatsapp') && (
                                    <span className="field-error">{getFieldError('whatsapp')}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <div className="input-wrapper">
                                    <Mail size={18} className="input-icon-left" />
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        placeholder="Ex: contact@boutique.ci"
                                        value={formData.email}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={saving}
                                        className={getFieldError('email') ? 'error' : ''}
                                    />
                                </div>
                                {getFieldError('email') && (
                                    <span className="field-error">{getFieldError('email')}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ==================== SECTION 4 : INFORMATIONS LÉGALES ==================== */}
                <div className="dashboard-card">
                    <div className="card-header">
                        <h3><IdCard size={16} /> Informations légales</h3>
                    </div>
                    <div className="card-body">
                        <p className="section-hint">
                            Ces informations sont optionnelles. Elles apparaîtront sur vos factures si vous les renseignez.
                        </p>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="numero_rccm">N° RCCM</label>
                                <div className="input-wrapper">
                                    <Hash size={18} className="input-icon-left" />
                                    <input
                                        type="text"
                                        id="numero_rccm"
                                        name="numero_rccm"
                                        placeholder="Ex: CI-ABJ-2024-B-12345"
                                        value={formData.numero_rccm}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={saving}
                                        maxLength={50}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="numero_nif">N° NIF</label>
                                <div className="input-wrapper">
                                    <Hash size={18} className="input-icon-left" />
                                    <input
                                        type="text"
                                        id="numero_nif"
                                        name="numero_nif"
                                        placeholder="Ex: 2024-1234567"
                                        value={formData.numero_nif}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={saving}
                                        maxLength={50}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="numero_contribuable">N° Contribuable</label>
                                <div className="input-wrapper">
                                    <Hash size={18} className="input-icon-left" />
                                    <input
                                        type="text"
                                        id="numero_contribuable"
                                        name="numero_contribuable"
                                        placeholder="Ex: 1234567890"
                                        value={formData.numero_contribuable}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={saving}
                                        maxLength={50}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="regime_fiscal">Régime fiscal</label>
                                <div className="input-wrapper">
                                    <ScrollText size={18} className="input-icon-left" />
                                    <select
                                        id="regime_fiscal"
                                        name="regime_fiscal"
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
                </div>

                {/* ==================== ACTIONS ==================== */}
                <div className="form-footer-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={loadMagasin}
                        disabled={saving}
                    >
                        <RefreshCw size={18} /> Annuler
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <Loader2 size={18} className="spinner" />
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Enregistrer
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default MonMagasin;