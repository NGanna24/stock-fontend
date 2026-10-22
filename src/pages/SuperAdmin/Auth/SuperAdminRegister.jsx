// pages/SuperAdmin/Login/SuperAdminRegister.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock, Mail, Phone, User, Eye, EyeOff, AlertCircle,
  RefreshCw, ShieldCheck, Key
} from "lucide-react";
import { useSuperAdmin } from "../../../context/SuperAdminAuthContext";
import "./SuperAdminLogin.css";

const SuperAdminRegister = () => {
  const navigate = useNavigate();
  const { register } = useSuperAdmin();

  const [form, setForm] = useState({
    fullname: "", telephone: "", email: "",
    password: "", inviteCode: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await register({
        fullname: form.fullname.trim(),
        telephone: form.telephone.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        inviteCode: form.inviteCode.trim(),
      });
      if (res.success) {
        navigate("/super-admin/dashboard", { replace: true });
      } else {
        setError(res.message || "Inscription impossible");
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sal-page">
      <div className="sal-card">
        <div className="sal-header">
          <div className="sal-logo"><ShieldCheck size={28} /></div>
          <h1>Créer un super-admin</h1>
          <p>Code d'invitation requis</p>
        </div>

        <form className="sal-form" onSubmit={handleSubmit}>
          {error && (
            <div className="sal-alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <label className="sal-field">
            <span className="sal-label">Nom complet</span>
            <div className="sal-input-wrap">
              <User size={16} className="sal-input-icon" />
              <input
                type="text"
                value={form.fullname}
                onChange={update("fullname")}
                placeholder="Jean Dupont"
                required
                disabled={loading}
              />
            </div>
          </label>

          <label className="sal-field">
            <span className="sal-label">Email</span>
            <div className="sal-input-wrap">
              <Mail size={16} className="sal-input-icon" />
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder="email@exemple.com"
                required
                disabled={loading}
              />
            </div>
          </label>

          <label className="sal-field">
            <span className="sal-label">Téléphone</span>
            <div className="sal-input-wrap">
              <Phone size={16} className="sal-input-icon" />
              <input
                type="tel"
                value={form.telephone}
                onChange={update("telephone")}
                placeholder="+225 07 00 00 00 00"
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
                value={form.password}
                onChange={update("password")}
                placeholder="8 car. min, 1 majuscule, 1 chiffre"
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

          <label className="sal-field">
            <span className="sal-label">Code d'invitation</span>
            <div className="sal-input-wrap">
              <Key size={16} className="sal-input-icon" />
              <input
                type="text"
                value={form.inviteCode}
                onChange={update("inviteCode")}
                placeholder="Code fourni par le propriétaire"
                required
                disabled={loading}
              />
            </div>
          </label>

          <button type="submit" className="sal-btn" disabled={loading}>
            {loading && <RefreshCw size={16} className="sal-spin" />}
            {loading ? "Création…" : "Créer le compte"}
          </button>
        </form>

        <div className="sal-footer">
          <ShieldCheck size={14} />
          <span>Inscription sécurisée par code</span>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminRegister;