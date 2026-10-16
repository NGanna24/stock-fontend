// pages/Auth/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import CountrySelect, { COUNTRIES } from '../../components/CountrySelect';
import {
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    AlertCircle,
    CheckCircle,
    Loader2
} from 'lucide-react';
import './LoginPages.css';

function LoginPage() {
    const { login, loading, error } = useUser();
    const navigate = useNavigate();

    const logoMiyo = '/logo/logo-miyo.png';

    const [credentials, setCredentials] = useState({
        telephone: '',
        password: ''
    });

    const [country, setCountry] = useState('CI');
    const [showPassword, setShowPassword] = useState(false);

    const [monkeyState, setMonkeyState] = useState('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [showTransition, setShowTransition] = useState(false);

    useEffect(() => {
        if (monkeyState === 'error') {
            const timer = setTimeout(() => {
                setMonkeyState('idle');
                setStatusMessage('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [monkeyState]);

    // ==================== SOUMISSION ====================
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Compose le numéro complet : +225 + 0140010385 = +2250140010385
        const dial = COUNTRIES.find(c => c.code === country)?.dial || '+225';
        const cleanedPhone = credentials.telephone.replace(/[\s\-().]/g, '');
        const fullPhone = `${dial}${cleanedPhone}`;

        const result = await login({
            telephone: fullPhone,
            password: credentials.password
        });

        if (result.success && result.data?.user?.slug) {
            setMonkeyState('success');
            setStatusMessage('Connexion réussie');

            setTimeout(() => {
                setShowTransition(true);
                setTimeout(() => {
                    navigate(`/${result.data.user.slug}/dashboard`);
                }, 2500);
            }, 900);
        } else if (result.success) {
            setMonkeyState('success');
            setStatusMessage('Connexion réussie');

            setTimeout(() => {
                setShowTransition(true);
                setTimeout(() => navigate('/dashboard'), 2500);
            }, 900);
        } else {
            setMonkeyState('error');
            setStatusMessage(result?.error || 'Identifiants incorrects');
        }
    };

    // ==================== CHANGEMENT DE CHAMP ====================
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'telephone') {
            const cleaned = value.replace(/[^\d\s\-]/g, '');
            setCredentials(prev => ({ ...prev, telephone: cleaned }));
        } else {
            setCredentials(prev => ({ ...prev, [name]: value }));
        }

        if (monkeyState === 'error') {
            setMonkeyState('idle');
            setStatusMessage('');
        }
    };

    const currentCountry = COUNTRIES.find(c => c.code === country);

    // ==================== RENDER ====================
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
                        <h2>Connexion</h2>
                        <p>Connectez-vous à votre compte</p>
                    </div>

                    {error && monkeyState !== 'error' && (
                        <div className="auth-error-split">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form-split">

                        {/* Téléphone */}
                        <div className="form-group-split">
                            <div className="phone-input-wrapper">
                                <CountrySelect
                                    value={country}
                                    onChange={setCountry}
                                    disabled={loading || monkeyState === 'success'}
                                />
                                <input
                                    type="tel"
                                    name="telephone"
                                    placeholder={currentCountry?.example || '01 40 01 03 85'}
                                    value={credentials.telephone}
                                    onChange={handleChange}
                                    disabled={loading || monkeyState === 'success'}
                                    maxLength={20}
                                    className="phone-input"
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>

                        {/* Mot de passe */}
                        <div className="form-group-split">
                            <div className="input-wrapper-split">
                                <Lock size={18} className="input-icon-left" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    placeholder="Mot de passe (4 chiffres)"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    maxLength="4"
                                    disabled={loading || monkeyState === 'success'}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle-split"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex="-1"
                                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="forgot-password-link">
                            <Link to="/forgot-password" className="auth-link-split">
                                Mot de passe oublié ?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            className={`auth-button-split ${loading ? 'loading' : ''}`}
                            disabled={loading || monkeyState === 'success'}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="spinner" />
                                    Connexion en cours...
                                </>
                            ) : monkeyState === 'success' ? (
                                <>
                                    <CheckCircle size={20} />
                                    Redirection...
                                </>
                            ) : (
                                <>
                                    Se connecter
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="auth-footer-split">
                        <p>
                            Pas encore de compte ?
                            <Link to="/register" className="auth-link-split">
                                S'inscrire
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <div className="auth-info-section">
                <div className="auth-info-content">

                    <div className={`monkey-wrapper ${monkeyState === 'error' ? 'is-error' : ''} ${monkeyState === 'success' ? 'is-success' : ''}`}>
                        <div className="monkey-circle">
                            <img src={logoMiyo} alt="Miyo Stock" />
                        </div>
                    </div>

                    {statusMessage && (
                        <div className={`monkey-status ${monkeyState === 'error' ? 'is-error' : ''} ${monkeyState === 'success' ? 'is-success' : ''}`}>
                            {monkeyState === 'error' && (
                                <>
                                    <AlertCircle size={16} />
                                    {statusMessage}
                                </>
                            )}
                            {monkeyState === 'success' && (
                                <>
                                    <CheckCircle size={16} />
                                    {statusMessage}
                                </>
                            )}
                        </div>
                    )}

                    <div className="auth-info-title">
                        <h2>
                            Gérez votre stock <br />
                            <span className="highlight">en toute simplicité.</span>
                        </h2>
                        <p className="info-subtitle">
                            Connectez-vous pour accéder à votre tableau de bord et
                            piloter votre activité en temps réel.
                        </p>
                    </div>

                    <div className="info-footer">
                        <p>© 2026 Miyo Stock. Tous droits réservés.</p>
                    </div>
                </div>
            </div>

            {showTransition && (
                <div className="auth-transition-overlay">
                    <div className="auth-transition-monkey">
                        <img src={logoMiyo} alt="Miyo" />
                    </div>
                    <div className="auth-transition-text">
                        Miyo est content de vous revoir !
                    </div>
                    <p className="auth-transition-subtext">
                        Préparation de votre tableau de bord...
                    </p>
                    <div className="auth-transition-bar">
                        <div className="auth-transition-bar-fill" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default LoginPage;