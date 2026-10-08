// pages/Auth/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
    Phone,
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
    const [showPassword, setShowPassword] = useState(false);

    // États pour les animations du singe
    const [monkeyState, setMonkeyState] = useState('idle'); // 'idle' | 'error' | 'success'
    const [statusMessage, setStatusMessage] = useState('');
    const [showTransition, setShowTransition] = useState(false);

    // Reset l'état du singe après une erreur
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

        const result = await login(credentials);

        if (result.success && result.data?.user?.slug) {
            // ✅ SUCCÈS avec slug
            setMonkeyState('success');
            setStatusMessage('Connexion réussie');

            // Séquence :
            // 1. Animation du singe (900ms)
            // 2. Overlay de transition (2500ms)
            // 3. Redirection dashboard
            setTimeout(() => {
                setShowTransition(true);

                setTimeout(() => {
                    navigate(`/${result.data.user.slug}/dashboard`);
                }, 2500);

            }, 900);

        } else if (result.success) {
            // ✅ SUCCÈS sans slug (fallback)
            setMonkeyState('success');
            setStatusMessage('Connexion réussie');

            setTimeout(() => {
                setShowTransition(true);
                setTimeout(() => navigate('/dashboard'), 2500);
            }, 900);

        } else {
            // ❌ ÉCHEC
            setMonkeyState('error');
            setStatusMessage(result?.error || 'Identifiants incorrects');
            // Le reset est géré par useEffect (3s)
        }
    };

    // ==================== CHANGEMENT DE CHAMP ====================
    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials({
            ...credentials,
            [name]: value
        });

        // Effacer l'état d'erreur dès que l'utilisateur retape
        if (monkeyState === 'error') {
            setMonkeyState('idle');
            setStatusMessage('');
        }
    };

    // ==================== RENDER ====================
    return (
        <div className="auth-page-split">

            {/* ============================================ */}
            {/* PARTIE GAUCHE — FORMULAIRE                   */}
            {/* ============================================ */}
            <div className="auth-form-section">
                <div className="auth-form-container">

                    {/* Petit badge Miyo */}
                    <div className="auth-brand">
                        <div className="auth-brand-logo">
                            <img src={logoMiyo} alt="Miyo" />
                        </div>
                        <span className="auth-brand-name">Miyo Stock</span>
                    </div>

                    {/* En-tête */}
                    <div className="auth-header-split">
                        <h2>Connexion</h2>
                        <p>Connectez-vous à votre compte</p>
                    </div>

                    {/* Message d'erreur global (AuthContext) */}
                    {error && monkeyState !== 'error' && (
                        <div className="auth-error-split">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    )}

                   
                    {/* Formulaire */}
                    <form onSubmit={handleSubmit} className="auth-form-split">
                        {/* Téléphone */}
                        <div className="form-group-split">
                            <div className="input-wrapper-split">
                                <Phone size={18} className="input-icon-left" />
                                <input
                                    type="tel"
                                    name="telephone"
                                    placeholder="Numéro de téléphone"
                                    value={credentials.telephone}
                                    onChange={handleChange}
                                    disabled={loading || monkeyState === 'success'}
                                    required
                                    autoFocus
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

                        {/* ✅ Lien Mot de passe oublié */}
                        <div className="forgot-password-link">
                            <Link to="/forgot-password" className="auth-link-split">
                                Mot de passe oublié ?
                            </Link>
                        </div>

                        {/* Bouton de connexion */}
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

                    {/* Lien vers inscription */}
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

            {/* ============================================ */}
            {/* PARTIE DROITE — PANNEAU AVEC LE SINGE         */}
            {/* ============================================ */}
            <div className="auth-info-section">
                <div className="auth-info-content">

                    {/* Le singe animé */}
                    <div className={`monkey-wrapper ${monkeyState === 'error' ? 'is-error' : ''} ${monkeyState === 'success' ? 'is-success' : ''}`}>
                        <div className="monkey-circle">
                            <img src={logoMiyo} alt="Miyo Stock" />
                        </div>
                    </div>

                    {/* Message d'état (erreur ou succès) */}
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

                    {/* Titre */}
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

                    {/* Footer */}
                    <div className="info-footer">
                        <p>© 2026 Miyo Stock. Tous droits réservés.</p>
                    </div>
                </div>
            </div>

            {/* ============================================ */}
            {/* OVERLAY DE TRANSITION (après succès)         */}
            {/* ============================================ */}
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