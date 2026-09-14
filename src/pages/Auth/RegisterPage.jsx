// pages/Auth/RegisterPage.jsx
import React, { useState } from 'react';
import { useUser } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
    User, 
    Phone, 
    Lock, 
    Eye, 
    EyeOff,
    ArrowRight,
    CheckCircle,
    AlertCircle,
    Loader2,
    Mail,
    Shield,
    Sparkles
} from 'lucide-react';
import './RegisterPages.css';

function RegisterPage() {
    const { register, loading, error } = useUser();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        fullname: '',
        telephone: '',
        password: ''
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [touched, setTouched] = useState({});
    const [successMessage, setSuccessMessage] = useState('');

    // Validation des champs
    const validateField = (name, value) => {
        switch(name) {
            case 'fullname':
                return value.length >= 2 ? '' : 'Le nom doit contenir au moins 2 caractères';
            case 'telephone':
                return /^[0-9]{10,}$/.test(value.replace(/\s/g, '')) ? '' : 'Numéro de téléphone invalide';
            case 'password':
                if (!/^\d{4}$/.test(value)) {
                    return 'Le mot de passe doit contenir exactement 4 chiffres';
                }
                return '';
            default:
                return '';
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Valider tous les champs avant soumission
        const errors = {};
        Object.keys(formData).forEach(key => {
            const error = validateField(key, formData[key]);
            if (error) errors[key] = error;
        });

        if (Object.keys(errors).length > 0) {
            setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
            return;
        }

        setSuccessMessage('');
        const result = await register(formData);
        
        if (result.success) {
            setSuccessMessage('🎉 Inscription réussie !');
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);
        }
    };

    const getFieldError = (name) => {
        if (touched[name]) {
            return validateField(name, formData[name]);
        }
        return '';
    };

    const isFieldValid = (name) => {
        return touched[name] && !validateField(name, formData[name]) && formData[name].length > 0;
    };

    return (
        <div className="auth-page-split">
            {/* Partie gauche - Formulaire */}
            <div className="auth-form-section">
                <div className="auth-form-container">
                    {/* Logo */}
                  

                    {/* En-tête */}
                    <div className="auth-header-split">
                        <h2>Créer un compte</h2>
                        <p>ou utilisez votre email pour l'inscription :</p>
                    </div>

                    {/* Messages */}
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

                    {/* Formulaire */}
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
                                <span className="field-error-split">{getFieldError('fullname')}</span>
                            )}
                        </div>

                        {/* Téléphone */}
                        <div className="form-group-split">
                            <div className="input-wrapper-split">
                                <Phone size={18} className="input-icon-left" />
                                <input
                                    type="tel"
                                    name="telephone"
                                    placeholder="Numéro de téléphone"
                                    value={formData.telephone}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    disabled={loading}
                                    className={`
                                        ${touched.telephone ? (getFieldError('telephone') ? 'error' : '') : ''}
                                        ${isFieldValid('telephone') ? 'valid' : ''}
                                    `}
                                    required
                                />
                                {isFieldValid('telephone') && (
                                    <CheckCircle size={18} className="input-icon-right valid-icon" />
                                )}
                            </div>
                            {touched.telephone && getFieldError('telephone') && (
                                <span className="field-error-split">{getFieldError('telephone')}</span>
                            )}
                        </div>

                        {/* Mot de passe */}
                        <div className="form-group-split">
                            <div className="input-wrapper-split">
                                <Lock size={18} className="input-icon-left" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    placeholder="Mot de passe (4 chiffres)"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    maxLength="4"
                                    pattern="\d{4}"
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
                                <span className="field-error-split">{getFieldError('password')}</span>
                            )}
                        </div>

                        {/* Bouton d'inscription */}
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

                    {/* Lien vers login */}
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

            {/* Partie droite - Informations */}
            <div className="auth-info-section">
                <div className="auth-info-content">
                    <div className="info-badge">
                        <Sparkles size={24} />
                        <span>Bienvenue !</span>
                    </div>
                    
                    <h2>Pour rester connecté avec nous</h2>
                    <p className="info-subtitle">connectez-vous avec vos informations personnelles</p>

                    <div className="info-features">
                        <div className="info-feature">
                            <Shield size={20} />
                            <div>
                                <h4>Connexion sécurisée</h4>
                                <p>Vos données sont protégées avec une sécurité de niveau entreprise</p>
                            </div>
                        </div>
                        <div className="info-feature">
                            <Mail size={20} />
                            <div>
                                <h4>Notifications par email</h4>
                                <p>Restez informé avec des notifications en temps réel</p>
                            </div>
                        </div>
                    </div>

                    <Link to="/login" className="info-login-btn">
                        SE CONNECTER
                        <ArrowRight size={18} />
                    </Link>

                    <div className="info-footer">
                        <p>© 2024 StockPro. Tous droits réservés.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;