// components/Dashboard/Header/Header.jsx
import React, { useState, useEffect } from "react";
import "./Header.css";
import { useUser } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AlerteService from "../../../services/alerteService";

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

const Header = () => {
    const { user, logout } = useUser();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const [alertesCount, setAlertesCount] = useState(0);
    const [notificationsCount, setNotificationsCount] = useState(0);
    const [darkMode, setDarkMode] = useState(false);

    // Infos utilisateur
    const userFullname = user?.fullname || "Utilisateur";
    const userRole = user?.role || "client";
    const userSlug = user?.slug || "";
    const userTelephone = user?.telephone || "";

    // ✅ Charger le nombre d'alertes
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

    // ✅ Gérer le mode sombre (localStorage)
    useEffect(() => {
        const saved = localStorage.getItem('darkMode');
        if (saved === 'true') {
            setDarkMode(true);
            document.body.classList.add('dark-mode');
        }
    }, []);

    // ==================== NAVIGATIONS ====================

    // ✅ Redirection vers le profil
    const goToProfile = () => {
        navigate(`/${userSlug}/profile`);
        setShowDropdown(false);
    };

    // ✅ Redirection vers les paramètres
    const goToSettings = () => {
        navigate(`/${userSlug}/settings`);
        setShowDropdown(false);
    };

    // ✅ Redirection vers le dashboard
    const goToDashboard = () => {
        navigate(`/${userSlug}/dashboard`);
        setShowDropdown(false);
    };

    // ✅ Redirection vers les alertes de stock
    const goToAlertes = () => {
        navigate(`/${userSlug}/alertes`);
    };

    // ✅ Redirection vers les notifications (commandes en attente)
    const goToNotifications = () => {
        navigate(`/${userSlug}/commandes-clients`);
    };

    // ✅ Toggle du thème sombre
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

    // ✅ Déconnexion
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
            'manager': 'Gestionnaire'
        };
        return roles[role] || role;
    };

    const getInitial = (name) => {
        if (!name) return "U";
        return name.charAt(0).toUpperCase();
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    return (
        <header className="header">
            <div className="headerleft">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher un produit, une facture, un client..."
                    />
                </div>
            </div>

            <div className="header-right">
                {/* ✅ ICÔNE 1 : Alertes de stock → /alertes */}
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

                {/* ✅ ICÔNE 2 : Notifications → /commandes-clients */}
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

                {/* ✅ ICÔNE 3 : Mode sombre (toggle, pas de redirection) */}
                <button
                    className="icon-btn"
                    onClick={toggleDarkMode}
                    title={darkMode ? "Mode clair" : "Mode sombre"}
                    aria-label="Basculer le thème"
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* ✅ ICÔNE 4 : Paramètres → /settings */}
                <button
                    className="icon-btn"
                    onClick={goToSettings}
                    title="Paramètres"
                    aria-label="Paramètres"
                >
                    <Settings size={20} />
                </button>

                {/* ✅ PROFIL avec dropdown */}
                <div className="profile-container">
                    <div className="profile" onClick={toggleDropdown}>
                        <div className="profile-avatar">
                            {getInitial(userFullname)}
                        </div>

                        <div className="profile-info">
                            <h4>{userFullname}</h4>
                            <p>{getRoleLabel(userRole)}</p>
                        </div>

                        <ChevronDown
                            size={18}
                            className={`dropdown-arrow ${showDropdown ? 'rotated' : ''}`}
                        />
                    </div>

                    {showDropdown && (
                        <div className="profile-dropdown">
                            <div className="dropdown-header">
                                <div className="dropdown-avatar">
                                    {getInitial(userFullname)}
                                </div>
                                <div className="dropdown-user-info">
                                    <h4>{userFullname}</h4>
                                    <p>{getRoleLabel(userRole)}</p>
                                    <small>{userTelephone}</small>
                                </div>
                            </div>

                            <div className="dropdown-divider"></div>

                            {/* ✅ Mon profil */}
                            <button
                                className="dropdown-item"
                                onClick={goToProfile}
                            >
                                <User size={18} />
                                <span>Mon profil</span>
                            </button>

                            {/* ✅ Paramètres */}
                            <button
                                className="dropdown-item"
                                onClick={goToSettings}
                            >
                                <Settings size={18} />
                                <span>Paramètres</span>
                            </button>

                            {/* ✅ Tableau de bord */}
                            <button
                                className="dropdown-item"
                                onClick={goToDashboard}
                            >
                                <Warehouse size={18} />
                                <span>Tableau de bord</span>
                            </button>

                            {/* ✅ Alertes de stock (avec badge) */}
                            <button
                                className="dropdown-item"
                                onClick={goToAlertes}
                            >
                                <TriangleAlert size={18} />
                                <span>Alertes de stock</span>
                                {alertesCount > 0 && (
                                    <span className="dropdown-badge">{alertesCount}</span>
                                )}
                            </button>

                            <div className="dropdown-divider"></div>

                            {/* ✅ Déconnexion */}
                            <button
                                className="dropdown-item logout"
                                onClick={handleLogout}
                            >
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