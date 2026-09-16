// components/Dashboard/Header/Header.jsx
import React, { useState, useEffect } from "react";
import "./Header.css";
import { useUser } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AlerteService from "../../../services/alerteService";
import MagasinService from "../../../services/magasinService";

import {
    Search,
    Bell,
    Moon,
    Sun,
    Settings,
    Warehouse,
    TriangleAlert,
    ChevronDown,
    LogOut,
    User
} from "lucide-react";

// ✅ URL du backend
const API_BASE_URL = 'https://miyo-stock.n-double.com';

const Header = () => {
    const { user, logout } = useUser();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const [alertesCount, setAlertesCount] = useState(0);
    const [notificationsCount, setNotificationsCount] = useState(0);
    const [darkMode, setDarkMode] = useState(false);

    // ✅ État pour le magasin
    const [magasin, setMagasin] = useState(null);

    // Infos utilisateur
    const userFullname = user?.fullname || "Utilisateur";
    const userRole = user?.role || "client";
    const userSlug = user?.slug || "";
    const userTelephone = user?.telephone || "";

    // ==================== CHARGEMENT MAGASIN ====================
    useEffect(() => {
        const loadMagasin = async () => {
            const token = localStorage.getItem('token');
            if (!token || !user?.slug) return;
            try {
                const res = await MagasinService.getMonMagasin(token);
                if (res.success) setMagasin(res.magasin);
            } catch (e) {
                console.error('❌ Erreur chargement magasin:', e);
            }
        };
        loadMagasin();
    }, [user?.slug]);

    // ==================== CHARGEMENT ALERTES ====================
    useEffect(() => {
        const loadAlertesCount = async () => {
            const token = localStorage.getItem('token');
            if (!token || !user?.slug) return;

            try {
                const res = await AlerteService.getStats(token);
                if (res.success && res.data) {
                    const total =
                        (res.data.total_rupture || 0) +
                        (res.data.total_stock_bas || 0);
                    setAlertesCount(total);
                }
            } catch (e) {
                console.error('❌ Erreur chargement alertes:', e);
            }
        };

        loadAlertesCount();
        const interval = setInterval(loadAlertesCount, 60000);
        return () => clearInterval(interval);
    }, [user?.slug]);

    // ==================== MODE SOMBRE ====================
    useEffect(() => {
        const saved = localStorage.getItem('darkMode');
        if (saved === 'true') {
            setDarkMode(true);
            document.body.classList.add('dark-mode');
        }
    }, []);

    // ==================== NAVIGATIONS ====================
    const goToProfile = () => {
        navigate(`/${userSlug}/profile`);
        setShowDropdown(false);
    };

    const goToSettings = () => {
        navigate(`/${userSlug}/settings`);
        setShowDropdown(false);
    };

    const goToDashboard = () => {
        navigate(`/${userSlug}/dashboard`);
        setShowDropdown(false);
    };

    const goToAlertes = () => {
        navigate(`/${userSlug}/alertes`);
    };

    const goToNotifications = () => {
        navigate(`/${userSlug}/commandes-clients`);
    };

    const toggleDarkMode = () => {
        const newValue = !darkMode;
        setDarkMode(newValue);
        if (newValue) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        localStorage.setItem('darkMode', newValue.toString());
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // ==================== HELPERS ====================
    const getRoleLabel = (role) => {
        const roles = {
            'admin': 'Administrateur',
            'client': 'Client',
            'user': 'Utilisateur',
            'manager': 'Gestionnaire',
            'caissier': 'Caissier',
            'magasinier': 'Magasinier'
        };
        return roles[role] || role;
    };

    const getInitial = (name) => {
        if (!name) return "U";
        return name.charAt(0).toUpperCase();
    };

    // ✅ URL complète du logo
    const getLogoUrl = () => {
        // console.log("le logo ",`${API_BASE_URL}${magasin.logo_url}`);
        if (!magasin?.logo_url) return null;
        if (magasin.logo_url.startsWith('http')) return magasin.logo_url;
        return `${API_BASE_URL}${magasin.logo_url}`;
    };

    // ✅ Initiales du magasin (fallback)
    const getMagasinInitiales = () => {
        const nom = magasin?.nom_commercial || 'Mon magasin';
        return nom
            .split(' ')
            .map(w => w[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    return (
        <header className="header">
            <div className="">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher un produit, une facture, un client..."
                    />
                </div>
            </div>

            <div className="header-right">
                {/* ICÔNE 1 : Alertes de stock */}
                <button
                    className="icon-btn"
                    onClick={goToAlertes}
                    title={`${alertesCount} alerte(s) de stock`}
                    aria-label="Alertes de stock"
                >
                    <TriangleAlert size={20} />
                    {alertesCount > 0 && (
                        <span className="badge red">{alertesCount}</span>
                    )}
                </button>

                {/* ✅ ICÔNE 2 : Notifications */}
                <button
                    className="icon-btn"
                    onClick={goToNotifications}
                    title={`${notificationsCount} notification(s)`}
                    aria-label="Notifications"
                >
                    <Bell size={20} />
                    {notificationsCount > 0 && (
                        <span className="badge">{notificationsCount}</span>
                    )}
                </button>

                {/* ✅ ICÔNE 3 : Mode sombre */}
                <button
                    className="icon-btn"
                    onClick={toggleDarkMode}
                    title={darkMode ? "Mode clair" : "Mode sombre"}
                    aria-label="Basculer le thème"
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* ✅ ICÔNE 4 : Paramètres */}
                <button
                    className="icon-btn"
                    onClick={goToSettings}
                    title="Paramètres"
                    aria-label="Paramètres"
                >
                    <Settings size={20} />
                </button>

                {/* ✅ PROFIL : LOGO DU MAGASIN à la place de l'avatar */}
                <div className="profile-container">
                    <div className="profile" onClick={toggleDropdown}>
                        {/* ✅ Logo du magasin (au lieu de l'avatar utilisateur) */}
                        <div className="profile-logo">
                            {getLogoUrl() ? (
                                <img
                                    src={getLogoUrl()}
                                    alt={magasin?.nom_commercial || 'Logo'}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <span
                                className="profile-logo-initials"
                                style={{ display: getLogoUrl() ? 'none' : 'flex' }}
                            >
                                {getMagasinInitiales()}
                            </span>
                        </div>

                        <div className="profile-info">
                            <h4>{magasin?.nom_commercial || userFullname}</h4>
                            <p>{getRoleLabel(userRole)}</p>
                        </div>

                        <ChevronDown
                            size={18}
                            className={`dropdown-arrow ${showDropdown ? 'rotated' : ''}`}
                        />
                    </div>

                    {showDropdown && (
                        <div className="profile-dropdown">
                            {/* ========== HEADER DU DROPDOWN ========== */}
                            <div className="dropdown-header">
                                {/* ✅ Logo du magasin en grand */}
                                <div className="dropdown-logo">
                                    {getLogoUrl() ? (
                                        <img
                                            src={getLogoUrl()}
                                            alt={magasin?.nom_commercial || 'Logo'}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <span
                                        className="dropdown-logo-initials"
                                        style={{ display: getLogoUrl() ? 'none' : 'flex' }}
                                    >
                                        {getMagasinInitiales()}
                                    </span>
                                </div>

                                <div className="dropdown-user-info">
                                    <h4>{magasin?.nom_commercial || 'Mon magasin'}</h4>
                                    <p>{userFullname}</p>
                                    <small>{getRoleLabel(userRole)} • {userTelephone}</small>
                                </div>
                            </div>

                            <div className="dropdown-divider"></div>

                            {/* ========== ITEMS ========== */}
                            <button className="dropdown-item" onClick={goToProfile}>
                                <User size={18} />
                                <span>Mon profil</span>
                            </button>

                            <button className="dropdown-item" onClick={goToSettings}>
                                <Settings size={18} />
                                <span>Paramètres</span>
                            </button>

                            <button className="dropdown-item" onClick={goToDashboard}>
                                <Warehouse size={18} />
                                <span>Tableau de bord</span>
                            </button>

                            <button className="dropdown-item" onClick={goToAlertes}>
                                <TriangleAlert size={18} />
                                <span>Alertes de stock</span>
                                {alertesCount > 0 && (
                                    <span className="dropdown-badge">{alertesCount}</span>
                                )}
                            </button>

                            <div className="dropdown-divider"></div>

                            <button className="dropdown-item logout" onClick={handleLogout}>
                                <LogOut size={18} />
                                <span>Déconnexion</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;