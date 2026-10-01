// pages/Auth/LoginPage.jsx
import React, { useState } from 'react';
import { useUser } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
    Phone,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    AlertCircle,
    Loader2
} from 'lucide-react';
import './LoginPages.css';

function LoginPage() {
    const { login, loading, error } = useUser();
    const navigate = useNavigate();

    const [credentials, setCredentials] = useState({
        telephone: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // ==================== 🔍 LOGS DÉBUT ====================
        console.group('🔐 [LOGIN] Tentative de connexion');
        console.log('📤 Données envoyées :', {
            telephone: credentials.telephone,
            telephoneJSON: JSON.stringify(credentials.telephone),
            telephoneLength: credentials.telephone.length,
            password: credentials.password ? '***' + credentials.password.slice(-2) : '(vide)',
            passwordLength: credentials.password.length,
        });
        console.log('🌐 Environnement :', {
            hostname: window.location.hostname,
            origin: window.location.origin,
            pathname: window.location.pathname,
            isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
        });
        console.log('🕒 Timestamp :', new Date().toISOString());
        // =========================================================

        const startTime = performance.now();
        const result = await login(credentials);
        const duration = Math.round(performance.now() - startTime);

        // ==================== 🔍 LOGS RÉSULTAT ====================
        console.log(`⏱️ Durée de la requête : ${duration}ms`);
        console.log('📥 Résultat brut du login :', result);
        console.log('   result.success :', result?.success);
        console.log('   result.data :', result?.data);
        console.log('   result.data.user :', result?.data?.user);
        console.log('   result.data.user.slug :', result?.data?.user?.slug);
        console.log('   result.data.token :', result?.data?.token ? '***présent***' : '(absent)');
        console.log('   result.error :', result?.error);
        console.log('   result.message :', result?.message);
        // =========================================================

        if (result.success && result.data?.user?.slug) {
            console.log('✅ Succès → redirection vers :', `/${result.data.user.slug}/dashboard`);
            console.groupEnd();
            navigate(`/${result.data.user.slug}/dashboard`);
        } else if (result.success) {
            console.log('⚠️ Succès mais pas de slug → redirection vers /dashboard');
            console.groupEnd();
            navigate('/dashboard');
        } else {
            console.error('❌ Échec du login');
            console.error('   Raison :', result?.error || result?.message || 'Inconnue');
            console.groupEnd();
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        // ==================== 🔍 LOG SAISIE ====================
        console.log(`✏️ Champ "${name}" :`, {
            valeur: name === 'password' ? '***' : value,
            longueur: value.length,
            type: typeof value,
        });
        // ======================================================

        setCredentials({
            ...credentials,
            [name]: value
        });
    };

    // ==================== 🔍 LOG ERREUR CONTEXTE ====================
    React.useEffect(() => {
        if (error) {
            console.group('🚨 [LOGIN] Erreur remontée par AuthContext');
            console.error('   error :', error);
            console.error('   typeof :', typeof error);
            console.groupEnd();
        }
    }, [error]);
    // =============================================================

    return (
        <div className="auth-page-split">
            {/* Partie gauche - Formulaire */}
            <div className="auth-form-section">
                <div className="auth-form-container">


                    {/* En-tête */}
                    <div className="auth-header-split">
                        <h2>Connexion</h2>
                        <p>Connectez-vous à votre compte</p>
                    </div>

                    {/* Message d'erreur */}
                    {error && (
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
                                    disabled={loading}
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
                                    disabled={loading}
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
                            </div>
                        </div>

                        {/* Bouton de connexion */}
                        <button
                            type="submit"
                            className={`auth-button-split ${loading ? 'loading' : ''}`}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="spinner" />
                                    Connexion en cours...
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

            {/* Partie droite - Information */}
            <div className="auth-info-section">
                <div className="auth-info-content">

                    <h2>Gérez votre stock en toute simplicité</h2>
                    <p className="info-subtitle">
                        Connectez-vous pour accéder à votre tableau de bord
                    </p>

                    <div className="info-features">
                        <div className="info-feature">
                            <div>
                                <h4>Gestion de stock</h4>
                                <p>Suivez vos produits en temps réel</p>
                            </div>
                        </div>
                        <div className="info-feature">
                            <div>
                                <h4>Rapports détaillés</h4>
                                <p>Analysez vos ventes et vos achats</p>
                            </div>
                        </div>
                    </div>

                    <div className="info-footer">
                        <p>© 2026 miyo. Tous droits réservés.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;