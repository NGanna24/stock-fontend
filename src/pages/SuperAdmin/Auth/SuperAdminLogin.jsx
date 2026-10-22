// pages/SuperAdmin/Auth/SuperAdminLogin.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock, Mail, Eye, EyeOff, AlertCircle, RefreshCw, ShieldCheck
} from "lucide-react";
import { useSuperAdmin } from "../../../context/SuperAdminAuthContext";
import "./SuperAdminLogin.css";

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isInitialized } = useSuperAdmin();

  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Si déjà connecté → redirection dashboard
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      navigate("/super-admin/dashboard", { replace: true });
    }
  }, [isInitialized, isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(identifiant.trim(), password);
      if (res.success) {
        navigate("/super-admin/dashboard", { replace: true });
      } else {
        setError(res.message || "Connexion impossible");
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sal-page">
      <div className="sal-card">
        <div className="sal-header">
          <div className="sal-logo"><Lock size={28} /></div>
          <h1>Console Super Admin</h1>
          <p>Accès réservé au propriétaire</p>
        </div>

        <form className="sal-form" onSubmit={handleSubmit}>
          {error && (
            <div className="sal-alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <label className="sal-field">
            <span className="sal-label">Email ou téléphone</span>
            <div className="sal-input-wrap">
              <Mail size={16} className="sal-input-icon" />
              <input
                type="text"
                placeholder="email@exemple.com ou +225..."
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                autoComplete="username"
                required
                disabled={loading}
              />
            </div>
          </label>

          <label className="sal-field">
            <span className="sal-label">Mot de passe</span>
            <div className="sal-input-wrap">
              <Lock size={16} className="sal-input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="sal-toggle-password"
                onClick={() => setShowPassword(s => !s)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <button type="submit" className="sal-btn" disabled={loading}>
            {loading && <RefreshCw size={16} className="sal-spin" />}
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <div className="sal-footer">
          <ShieldCheck size={14} />
          <span>Connexion sécurisée</span>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;