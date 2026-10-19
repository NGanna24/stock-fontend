// components/SuperAdmin/Header/Header.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../../context/AuthContext";
import ConfirmModal from "../../ConfirmModal/ConfirmModal";
import { findSuperAdminEntry, SUPER_ADMIN_MENU } from "../Sidebar/Sidebar";
import {
  Search, Settings, ChevronDown, LogOut, User, Lock,
  Shield, CheckCircle, X, LayoutDashboard, AlertTriangle
} from "lucide-react";
import "./Header.css";

// Pages hors menu
const EXTRA_TITLES = {
  "/profil": "Mon profil admin",
};

const SuperAdminHeader = ({ secretCode }) => {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const profileRef = useRef(null);
  const inputRef = useRef(null);

  const userName = user?.fullname || "Super Admin";
  const userEmail = user?.email || "";

  const basePath = `/super-admin/${secretCode}`;

  /* ---------- Fil d'Ariane ---------- */
  const crumb = useMemo(() => {
    const rel = location.pathname.replace(basePath, "").replace(/\/+$/, "") || "/dashboard";
    const entry = findSuperAdminEntry(rel, SUPER_ADMIN_MENU);
    if (entry) {
      return {
        section: entry.section.section === "Principal" ? null : entry.section.section,
        title: entry.item.title,
      };
    }
    return EXTRA_TITLES[rel]
      ? { section: null, title: EXTRA_TITLES[rel] }
      : { section: null, title: "Console" };
  }, [location.pathname, basePath]);

  /* ---------- Fermeture au clic extérieur ---------- */
  useEffect(() => {
    const onDown = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setShowDropdown(false);
      const tag = e.target.tagName;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(tag) || e.target.isContentEditable;
      const isSlash = e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey;
      const isK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isSlash || isK) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* ---------- Navigation ---------- */
  const go = (path) => {
    navigate(`${basePath}${path}`);
    setShowDropdown(false);
  };

  /* ---------- Déconnexion ---------- */
  const handleLogoutConfirm = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Erreur déconnexion:", err);
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  /* ---------- Recherche ---------- */
  const handleSearch = (e) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      console.log("Recherche admin :", searchTerm.trim());
      // À brancher sur un endpoint de recherche globale admin plus tard
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    inputRef.current?.focus();
  };

  const initials = userName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "SA";

  return (
    <>
      <header className="sa-hd">
        {/* Fil d'Ariane */}
        <div className="sa-hd-crumb">
          {crumb.section && <span className="sa-hd-crumb-section">{crumb.section}</span>}
          <h1>{crumb.title}</h1>
        </div>

        {/* Badge sécurisé */}
        <span className="sa-hd-badge">
          <CheckCircle size={12} />
          Session sécurisée
        </span>

        {/* Recherche */}
        <div className="sa-hd-search">
          <Search size={18} className="sa-hd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher un patron, un magasin, une facture…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
            aria-label="Recherche globale admin"
            autoComplete="off"
          />
          {searchTerm && (
            <button className="sa-hd-search-clear" onClick={clearSearch} aria-label="Effacer">
              <X size={14} />
            </button>
          )}
          {!searchTerm && <kbd className="sa-hd-search-kbd" aria-hidden="true">/</kbd>}
        </div>

        {/* Actions */}
        <div className="sa-hd-actions">
          <button
            className="sa-hd-btn"
            onClick={() => go("/alertes")}
            title="Alertes plateforme"
            aria-label="Alertes"
          >
            <AlertTriangle size={20} />
          </button>

          <button
            className="sa-hd-btn"
            onClick={() => go("/parametres")}
            title="Paramètres système"
            aria-label="Paramètres"
          >
            <Settings size={20} />
          </button>

          {/* Profil */}
          <div className="sa-hd-profile" ref={profileRef}>
            <button
              className={`sa-hd-profile-btn ${showDropdown ? "is-open" : ""}`}
              onClick={() => setShowDropdown((s) => !s)}
              aria-haspopup="menu"
              aria-expanded={showDropdown}
            >
              <span className="sa-hd-logo">{initials}</span>
              <span className="sa-hd-profile-text">
                <strong>{userName}</strong>
                <small>Super Admin</small>
              </span>
              <ChevronDown size={17} className={`sa-hd-chev ${showDropdown ? "is-open" : ""}`} />
            </button>

            {showDropdown && (
              <div className="sa-hd-menu" role="menu">
                <div className="sa-hd-menu-head">
                  <span className="sa-hd-logo">{initials}</span>
                  <div>
                    <strong>Miyo Admin</strong>
                    <span>{userName}</span>
                    <small>{userEmail}</small>
                  </div>
                </div>
                <div className="sa-hd-menu-body">
                  <button
                    className="sa-hd-menu-item"
                    role="menuitem"
                    onClick={() => go("/profil")}
                  >
                    <User size={17} />
                    <span>Mon profil admin</span>
                  </button>
                  <button
                    className="sa-hd-menu-item"
                    role="menuitem"
                    onClick={() => go("/dashboard")}
                  >
                    <LayoutDashboard size={17} />
                    <span>Vue d'ensemble</span>
                  </button>
                  <button
                    className="sa-hd-menu-item"
                    role="menuitem"
                    onClick={() => go("/securite")}
                  >
                    <Shield size={17} />
                    <span>Sécurité</span>
                  </button>
                  <div className="sa-hd-menu-sep" />
                  <button
                    className="sa-hd-menu-item sa-hd-menu-item--logout"
                    role="menuitem"
                    onClick={() => {
                      setShowDropdown(false);
                      setShowLogoutModal(true);
                    }}
                  >
                    <LogOut size={17} />
                    <span>Déconnexion</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => !loggingOut && setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        title="Se déconnecter ?"
        message="Vous allez être redirigé vers la page de connexion."
        type="warning"
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        loading={loggingOut}
      />
    </>
  );
};

export default SuperAdminHeader;