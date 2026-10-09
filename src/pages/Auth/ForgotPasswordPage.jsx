// pages/Auth/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft,
    AlertCircle, CheckCircle, Loader2, KeyRound
} from 'lucide-react';
import API_URL from '../../config/api';
import './LoginPages.css';

function ForgotPasswordPage() {
    const navigate = useNavigate();
    const logoMiyo = '/logo/logo-miyo.png';

    const [step, setStep] = useState(1); // 1: email | 2: code | 3: nouveau PIN
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // ==================== ÉTAPE 1 : Demander le code ====================
    const handleRequestCode = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(API_URL.AUTH.FORGOT_PASSWORD, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (data.success) {
                setSuccess('Si votre email est enregistré, un code à 6 chiffres vient d\'être envoyé.');
                setStep(2);
            } else {
                setError(data.message || 'Erreur lors de l\'envoi du code');
            }
        } catch (err) {
            setError('Erreur réseau. Vérifiez votre connexion.');
        } finally {
            setLoading(false);
        }
    };

    // ==================== ÉTAPE 2 : Vérifier le code ====================
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(API_URL.AUTH.VERIFY_RESET_CODE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            const data = await res.json();

            if (data.success) {
                setSuccess('Code vérifié ! Choisissez un nouveau code PIN.');
                setStep(3);
            } else {
                setError(data.message || 'Code invalide');
            }
        } catch (err) {
            setError('Erreur réseau.');
        } finally {
            setLoading(false);
        }
    };

    // ==================== ÉTAPE 3 : Réinitialiser ====================
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (!/^\d{4}$/.test(newPassword)) {
            setError('Le mot de passe doit contenir exactement 4 chiffres');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(API_URL.AUTH.RESET_PASSWORD, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword })
            });
            const data = await res.json();

            if (data.success) {
                setSuccess('Mot de passe réinitialisé ! Redirection...');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(data.message || 'Erreur lors de la réinitialisation');
            }
        } catch (err) {
            setError('Erreur réseau.');
        } finally {
            setLoading(false);
        }
    };

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

                    {/* Indicateur d'étapes */}
                    <div className="steps-indicator">
                        <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
                        <div className={`step-line ${step >= 2 ? 'active' : ''}`} />
                        <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
                        <div className={`step-line ${step >= 3 ? 'active' : ''}`} />
                        <div className={`step-dot ${step >= 3 ? 'active' : ''}`}>3</div>
                    </div>

                    <div className="auth-header-split">
                        <h2>
                            {step === 1 && 'Mot de passe oublié'}
                            {step === 2 && 'Vérification'}
                            {step === 3 && 'Nouveau code PIN'}
                        </h2>
                        <p>
                            {step === 1 && 'Entrez votre email pour recevoir un code'}
                            {step === 2 && `Code envoyé à ${email}`}
                            {step === 3 && 'Choisissez un code à 4 chiffres'}
                        </p>
                    </div>

                    {error && (
                        <div className="auth-error-split">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="auth-success-split">
                            <CheckCircle size={20} />
                            <span>{success}</span>
                        </div>
                    )}

                    {/* ÉTAPE 1 */}
                    {step === 1 && (
                        <form onSubmit={handleRequestCode} className="auth-form-split">
                            <div className="form-group-split">
                                <div className="input-wrapper-split">
                                    <Mail size={18} className="input-icon-left" />
                                    <input
                                        type="email"
                                        placeholder="Adresse email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <button type="submit" className="auth-button-split" disabled={loading}>
                                {loading
                                    ? <><Loader2 size={20} className="spinner" /> Envoi...</>
                                    : <>Envoyer le code <ArrowRight size={20} /></>}
                            </button>
                        </form>
                    )}

                    {/* ÉTAPE 2 */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyCode} className="auth-form-split">
                            <div className="form-group-split">
                                <div className="input-wrapper-split">
                                    <KeyRound size={18} className="input-icon-left" />
                                    <input
                                        type="text"
                                        placeholder="Code à 6 chiffres"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                        maxLength="6"
                                        disabled={loading}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <button type="submit" className="auth-button-split" disabled={loading}>
                                {loading
                                    ? <><Loader2 size={20} className="spinner" /> Vérification...</>
                                    : <>Vérifier <ArrowRight size={20} /></>}
                            </button>
                            <button
                                type="button"
                                className="link-btn"
                                onClick={() => {
                                    setStep(1);
                                    setCode('');
                                    setError('');
                                    setSuccess('');
                                }}
                            >
                                <ArrowLeft size={16} /> Changer d'email
                            </button>
                        </form>
                    )}

                    {/* ÉTAPE 3 */}
                    {step === 3 && (
                        <form onSubmit={handleResetPassword} className="auth-form-split">
                            <div className="form-group-split">
                                <div className="input-wrapper-split">
                                    <Lock size={18} className="input-icon-left" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Nouveau PIN (4 chiffres)"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, ''))}
                                        maxLength="4"
                                        disabled={loading}
                                        required
                                        autoFocus
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
                            <button type="submit" className="auth-button-split" disabled={loading}>
                                {loading
                                    ? <><Loader2 size={20} className="spinner" /> Réinitialisation...</>
                                    : <>Réinitialiser <CheckCircle size={20} /></>}
                            </button>
                        </form>
                    )}

                    <div className="auth-footer-split">
                        <p>
                            <Link to="/login" className="auth-link-split">
                                <ArrowLeft size={14} /> Retour à la connexion
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* PARTIE DROITE */}
            <div className="auth-info-section">
                <div className="auth-info-content">
                    <div className="auth-info-logo">
                        <img src={logoMiyo} alt="Miyo Stock" />
                    </div>
                    <div className="auth-info-title">
                        <h2>
                            Récupérez l'accès à <br />
                            <span className="highlight">votre compte.</span>
                        </h2>
                        <p className="info-subtitle">
                            Un code de vérification vous sera envoyé par email pour
                            sécuriser la réinitialisation.
                        </p>
                    </div>
                    <div className="info-footer">
                        <p>© 2026 Miyo Stock. Tous droits réservés.</p>
                    </div>
                </div>
            </div>
        </div>
    ); 
}

export default ForgotPasswordPage;