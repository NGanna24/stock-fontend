// pages/Auth/RegisterPage.jsx
import React, { useState } from 'react';
import { useUser } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import CountrySelect, { COUNTRIES } from '../../components/CountrySelect';
import {
    User,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    CheckCircle,
    AlertCircle,
    Loader2
} from 'lucide-react';
import './RegisterPages.css';

function RegisterPage() {
    const logoMiyo = '/logo/logo-miyo.png';
    const { register, loading, error } = useUser();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fullname: '',
        telephone: '', // ← chiffres bruts, ex: "0140010385"
        password: ''
    });

    const [country, setCountry] = useState('CI');
    const [showPassword, setShowPassword] = useState(false);
    const [touched, setTouched] = useState({});
    const [successMessage, setSuccessMessage] = useState('');

    // ============================================================
    // VALIDATION TÉLÉPHONE — SIMPLE
    // ============================================================
    const validatePhone = (value) => {
        if (!value || value.trim() === '') {
            return 'Numéro de téléphone requis';
        }
        const cleaned = value.replace(/[\s\-().]/g, '');
        // 8 à 15 chiffres, le 0 initial est OK
        if (!/^\d{8,15}$/.test(cleaned)) {
            return 'Le numéro doit contenir 8 à 15 chiffres';
        }
        return '';
    };

    // ============================================================
    // VALIDATION DES CHAMPS
    // ============================================================
    const validateField = (name, value) => {
        switch (name) {
            case 'fullname':
                return value.length >= 2
                    ? ''
                    : 'Le nom doit contenir au moins 2 caractères';
            case 'telephone':
                return validatePhone(value);
            case 'password':
                return /^\d{4}$/.test(value)
                    ? ''
                    : 'Le mot de passe doit contenir exactement 4 chiffres';
            default:
                return '';
        }
    };

    // ============================================================
    // HANDLERS
    // ============================================================
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'telephone') {
            // Autoriser uniquement chiffres, espaces, tirets
            const cleaned = value.replace(/[^\d\s\-]/g, '');
            setFormData(prev => ({ ...prev, telephone: cleaned }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = {};
        Object.keys(formData).forEach(key => {
            const err = validateField(key, formData[key]);
            if (err) errors[key] = err;
        });

        if (Object.keys(errors).length > 0) {
            setTouched(
                Object.keys(formData).reduce(
                    (acc, key) => ({ ...acc, [key]: true }),
                    {}
                )
            );
            return;
        }

        // Compose le numéro complet : +225 + 0140010385 = +2250140010385
        const dial = COUNTRIES.find(c => c.code === country)?.dial || '+225';
        const cleanedPhone = formData.telephone.replace(/[\s\-().]/g, '');
        const fullPhone = `${dial}${cleanedPhone}`;

        setSuccessMessage('');
        const result = await register({
            ...formData,
            telephone: fullPhone
        });

        if (result.success) {
            setSuccessMessage('Inscription réussie !');
            setTimeout(() => navigate('/dashboard'), 1500);
        }
    };

    const getFieldError = (name) => {
        if (touched[name]) return validateField(name, formData[name]);
        return '';
    };

    const isFieldValid = (name) => {
        return (
            touched[name] &&
            !validateField(name, formData[name]) &&
            formData[name].length > 0
        );
    };

    const currentCountry = COUNTRIES.find(c => c.code === country);

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div className="auth-page-split">
            <div className="auth-form-section">
                <div className="auth-form-container">

                    <div className="auth-brand">
                        <div className="auth-brand-logo">
                            <img src={logoMiyo} alt="Miyo" />
                        </div>
                        <span className="auth-brand-name">Miyo Stock</span>
                    </div>

                    <div className="auth-header-split">
                        <h2>Créer un compte</h2>
                        <p>Rejoignez la nouvelle génération de gestion de stock.</p>
                    </div>

                    {successMessage && (
                        <div className="auth-success-split">
                            <CheckCircle size={20} />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {error && (
                        <div className="auth-error-split">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form-split">

                        {/* Nom complet */}
                        <div className="form-group-split">
                            <div className="input-wrapper-split">
                                <User size={18} className="input-icon-left" />
                                <input
                                    type="text"
                                    name="fullname"
                                    placeholder="Nom complet"
                                    value={formData.fullname}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    disabled={loading}
                                    className={`
                                        ${touched.fullname ? (getFieldError('fullname') ? 'error' : '') : ''}
                                        ${isFieldValid('fullname') ? 'valid' : ''}
                                    `}
                                    required
                                />
                                {isFieldValid('fullname') && (
                                    <CheckCircle size={18} className="input-icon-right valid-icon" />
                                )}
                            </div>
                            {touched.fullname && getFieldError('fullname') && (
                                <span className="field-error-split">
                                    {getFieldError('fullname')}
                                </span>
                            )}
                        </div>

                        {/* Téléphone */}
                        <div className="form-group-split">
                            <div className={`phone-input-wrapper ${touched.telephone && getFieldError('telephone') ? 'error' : ''} ${isFieldValid('telephone') ? 'valid' : ''}`}>
                                <CountrySelect
                                    value={country}
                                    onChange={setCountry}
                                    disabled={loading}
                                />
                                <input
                                    type="tel"
                                    name="telephone"
                                    placeholder={currentCountry?.example || '01 40 01 03 85'}
                                    value={formData.telephone}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    disabled={loading}
                                    maxLength={20}
                                    className="phone-input"
                                    required
                                />
                                {isFieldValid('telephone') && (
                                    <CheckCircle size={18} className="phone-valid-icon" />
                                )}
                            </div>
                            {touched.telephone && getFieldError('telephone') && (
                                <span className="field-error-split">
                                    {getFieldError('telephone')}
                                </span>
                            )}
                        </div>

                        {/* Mot de passe */}
                        <div className="form-group-split">
                            <div className="input-wrapper-split">
                                <Lock size={18} className="input-icon-left" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    placeholder="Code PIN (4 chiffres)"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    maxLength="4"
                                    disabled={loading}
                                    className={`
                                        ${touched.password ? (getFieldError('password') ? 'error' : '') : ''}
                                        ${isFieldValid('password') ? 'valid' : ''}
                                    `}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle-split"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex="-1"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                                {isFieldValid('password') && (
                                    <CheckCircle size={18} className="input-icon-right valid-icon" />
                                )}
                            </div>
                            {touched.password && getFieldError('password') && (
                                <span className="field-error-split">
                                    {getFieldError('password')}
                                </span>
                            )}
                        </div>

                        <button
                            type="submit"
                            className={`auth-button-split ${loading ? 'loading' : ''}`}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="spinner" />
                                    Création du compte...
                                </>
                            ) : (
                                "S'INSCRIRE"
                            )}
                        </button>
                    </form>

                    <div className="auth-footer-split">
                        <p>
                            Vous avez déjà un compte ?
                            <Link to="/login" className="auth-link-split">
                                Se connecter
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <div className="auth-info-section">
                <div className="auth-info-content">
                    <div className="auth-info-logo">
                        <img src={logoMiyo} alt="Miyo Stock" />
                    </div>

                    <div className="auth-info-title">
                        <h2>
                            Gérez votre stock <br />
                            <span className="highlight">sans effort.</span>
                        </h2>
                        <p className="info-subtitle">
                            Une plateforme moderne pour suivre vos produits, vos ventes et vos
                            approvisionnements en temps réel.
                        </p>
                    </div>

                    <Link to="/login" className="info-login-btn">
                        SE CONNECTER
                        <ArrowRight size={18} />
                    </Link>

                    <div className="info-footer">
                        <p>© 2026 Miyo Stock. Tous droits réservés.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;