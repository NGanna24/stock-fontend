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
        
        const result = await login(credentials);
        
        if (result.success && result.data?.user?.slug) {
            // ✅ Rediriger vers le dashboard avec le slug
            navigate(`/${result.data.user.slug}/dashboard`);
        } else if (result.success) {
            navigate('/dashboard');
        }
    };

    const handleChange = (e) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="auth-page-split">
            {/* Partie gauche - Formulaire */}
            <div className="auth-form-section">
                <div className="auth-form-container">
                    {/* Logo */}
                    <div className="auth-brand">
                        <span className="brand-name">StockPro</span>
                    </div>

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