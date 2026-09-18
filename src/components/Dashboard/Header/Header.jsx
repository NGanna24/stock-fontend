// components/Dashboard/Header/Header.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "./Header.css";
import { useUser } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AlerteService from "../../../services/alerteService";
import MagasinService from "../../../services/magasinService";
import SearchService from "../../../services/searchService";

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
    User,
    Package,
    Receipt,
    ShoppingCart,
    Truck,
    Users,
    Loader,
    X,
    ArrowRight,
} from "lucide-react";
const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
   window.location.hostname === "127.0.0.1" ||
   window.location.hostname.startsWith("192.168."));

const API_BASE_URL = isLocal
  ? "http://192.168.187.1:8080"
  : "https://miyo.n-double.com";


// ============ HELPERS ============
const formatMontant = (v) => {
    const n = parseFloat(v) || 0;
    return Math.round(n).toLocaleString('fr-FR') + ' FCFA';
};

const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('fr-FR');
};

const Header = () => {
    const { user, logout } = useUser();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const [alertesCount, setAlertesCount] = useState(0);
    const [notificationsCount, setNotificationsCount] = useState(0);
    const [darkMode, setDarkMode] = useState(false);

    // ✅ État magasin
    const [magasin, setMagasin] = useState(null);

    // ✅ ÉTATS RECHERCHE DYNAMIQUE
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const searchDebounce = useRef(null);
    const searchRef = useRef(null);
    const inputRef = useRef(null);

    // Infos utilisateur
    const userFullname = user?.fullname || "Utilisateur";
    const userRole = user?.role || "client";
    const userSlug = user?.slug || "";
    const userTelephone = user?.telephone || "";

    // ==================== CHARGEMENT MAGASIN ====================
useEffect(() => {
    const loadMagasin = async () => {
        console.log('═══════════════════════════════════════');
        console.log('🏪 [LOG M1] Chargement magasin...');

        const token = localStorage.getItem('token');
        console.log('   token présent:', !!token);
        console.log('   user.slug:', user?.slug);

        if (!token || !user?.slug) {
            console.log('   ⚠️ SKIP : token ou slug manquant');
            return;
        }

        try {
            const res = await MagasinService.getMonMagasin(token);
            console.log('📥 [LOG M2] Réponse getMonMagasin:');
            console.log('   res complet:', res);
            console.log('   res.success:', res?.success);
            console.log('   res.magasin:', res?.magasin);
            console.log('   res.data:', res?.data);
            console.log('   res.magasin?.logo_url:', res?.magasin?.logo_url);
            console.log('   res.data?.logo_url:', res?.data?.logo_url);

            if (res.success) {
                const mag = res.magasin || res.data;
                console.log('   ✅ setMagasin avec:', mag);
                setMagasin(mag);
            } else {
                console.log('   ❌ res.success = false');
            }
        } catch (e) {
            console.error('❌ [LOG M2] Erreur chargement magasin:', e);
            console.error('   Stack:', e.stack);
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

    // ==================== RECHERCHE DYNAMIQUE ====================
    const performSearch = useCallback(async (query) => {
        const token = localStorage.getItem('token');
        if (!token || !query || query.trim().length < 2) {
            setSearchResults(null);
            setSearchLoading(false);
            return;
        }

        setSearchLoading(true);
        try {
            const res = await SearchService.searchGlobal(token, query.trim(), 5);
            if (res.success) {
                setSearchResults(res.data);
                setSelectedIndex(-1);
            }
        } catch (e) {
            console.error('❌ search error:', e);
        } finally {
            setSearchLoading(false);
        }
    }, []);

    // Debounce la recherche
    useEffect(() => {
        if (searchDebounce.current) clearTimeout(searchDebounce.current);

        if (!searchTerm || searchTerm.trim().length < 2) {
            setSearchResults(null);
            setSearchOpen(false);
            return;
        }

        setSearchOpen(true);
        setSearchLoading(true);

        searchDebounce.current = setTimeout(() => {
            performSearch(searchTerm);
        }, 300);

        return () => {
            if (searchDebounce.current) clearTimeout(searchDebounce.current);
        };
    }, [searchTerm, performSearch]);

    // Fermer au clic extérieur
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ==================== LISTE PLATE DES RÉSULTATS ====================
    const flatResults = useMemo(() => {
        if (!searchResults) return [];
        const items = [];

        (searchResults.produits || []).forEach(p => {
            items.push({ type: 'produit', data: p });
        });
        (searchResults.clients || []).forEach(c => {
            items.push({ type: 'client', data: c });
        });
        (searchResults.factures || []).forEach(f => {
            items.push({ type: 'facture', data: f });
        });
        (searchResults.commandes || []).forEach(c => {
            items.push({ type: 'commande', data: c });
        });
        (searchResults.commandes_achat || []).forEach(c => {
            items.push({ type: 'commande_achat', data: c });
        });
        (searchResults.fournisseurs || []).forEach(f => {
            items.push({ type: 'fournisseur', data: f });
        });

        return items;
    }, [searchResults]);

    // ==================== NAVIGATION RÉSULTAT ====================
    const goToResult = useCallback((item) => {
        if (!item) return;

        switch (item.type) {
            case 'produit':
                navigate(`/${userSlug}/produits`);
                break;
            case 'client':
                if (item.data.telephone) {
                    navigate(`/${userSlug}/clients/${encodeURIComponent(item.data.telephone)}`);
                } else {
                    navigate(`/${userSlug}/clients`);
                }
                break;
            case 'facture':
                navigate(`/${userSlug}/factures`);
                break;
            case 'commande':
                navigate(`/${userSlug}/commandes-clients`);
                break;
            case 'commande_achat':
                navigate(`/${userSlug}/commandes-achat`);
                break;
            case 'fournisseur':
                navigate(`/${userSlug}/fournisseurs`);
                break;
            default:
                break;
        }

        setSearchOpen(false);
        setSearchTerm("");
        setSearchResults(null);
    }, [navigate, userSlug]);

    // ==================== CLAVIER ====================
    const handleKeyDown = (e) => {
        if (!searchOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            goToResult(flatResults[selectedIndex]);
        } else if (e.key === 'Escape') {
            setSearchOpen(false);
            inputRef.current?.blur();
        }
    };

    // ==================== CLEAR ====================
    const clearSearch = () => {
        setSearchTerm("");
        setSearchResults(null);
        setSearchOpen(false);
        inputRef.current?.focus();
    };

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

    const getLogoUrl = () => {
        if (!magasin?.logo_url) return null;
        if (magasin.logo_url.startsWith('http')) return magasin.logo_url;
        return `${API_BASE_URL}${magasin.logo_url}`;
    };

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

    // ==================== RENDER DU DROPDOWN DE RECHERCHE ====================
    const renderSearchDropdown = () => {
        if (!searchOpen) return null;

        const counts = {
            produits: searchResults?.produits?.length || 0,
            clients: searchResults?.clients?.length || 0,
            factures: searchResults?.factures?.length || 0,
            commandes: searchResults?.commandes?.length || 0,
            commandes_achat: searchResults?.commandes_achat?.length || 0,
            fournisseurs: searchResults?.fournisseurs?.length || 0,
        };
        const totalResults = Object.values(counts).reduce((a, b) => a + b, 0);

        // Chargement
        if (searchLoading && !searchResults) {
            return (
                <div className="search-dropdown">
                    <div className="search-loading">
                        <Loader size={18} className="spinning" />
                        <span>Recherche en cours...</span>
                    </div>
                </div>
            );
        }

        // Aucun résultat
        if (!searchLoading && totalResults === 0) {
            return (
                <div className="search-dropdown">
                    <div className="search-empty">
                        <Search size={32} />
                        <p>Aucun résultat pour "{searchTerm}"</p>
                        <small>Essayez un autre mot-clé</small>
                    </div>
                </div>
            );
        }

        // Résultats
        let flatIndex = -1;

        return (
            <div className="search-dropdown">
                {/* PRODUITS */}
                {counts.produits > 0 && (
                    <div className="search-section">
                        <div className="search-section-header">
                            <Package size={14} />
                            <span>Produits</span>
                            <span className="search-count">{counts.produits}</span>
                        </div>
                        {searchResults.produits.map(p => {
                            flatIndex++;
                            const idx = flatIndex;
                            return (
                                <button
                                    key={`p-${p.id}`}
                                    className={`search-item ${selectedIndex === idx ? 'selected' : ''}`}
                                    onClick={() => goToResult({ type: 'produit', data: p })}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    <div className="search-item-icon produit">
                                        <Package size={16} />
                                    </div>
                                    <div className="search-item-content">
                                        <span className="search-item-title">
                                            {p.nom}
                                            {p.modele_nom && <small> · {p.modele_nom}</small>}
                                        </span>
                                        <span className="search-item-sub">
                                            {p.categorie_nom || 'Sans catégorie'}
                                            {p.marque_nom && ` • ${p.marque_nom}`}
                                        </span>
                                    </div>
                                    <div className="search-item-right">
                                        <span className="search-item-montant">
                                            {formatMontant(p.prix_vente)}
                                        </span>
                                        <span className={`search-item-stock ${p.quantite_stock <= 0 ? 'low' : ''}`}>
                                            Stock: {p.quantite_stock}
                                        </span>
                                    </div>
                                    <ArrowRight size={14} className="search-item-arrow" />
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* CLIENTS */}
                {counts.clients > 0 && (
                    <div className="search-section">
                        <div className="search-section-header">
                            <Users size={14} />
                            <span>Clients</span>
                            <span className="search-count">{counts.clients}</span>
                        </div>
                        {searchResults.clients.map((c) => {
                            flatIndex++;
                            const idx = flatIndex;
                            return (
                                <button
                                    key={`c-${c.id}`}
                                    className={`search-item ${selectedIndex === idx ? 'selected' : ''}`}
                                    onClick={() => goToResult({ type: 'client', data: c })}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    <div className="search-item-icon client">
                                        <Users size={16} />
                                    </div>
                                    <div className="search-item-content">
                                        <span className="search-item-title">{c.nom}</span>
                                        <span className="search-item-sub">
                                            {c.telephone || 'Sans téléphone'}
                                            {c.ville && ` • ${c.ville}`}
                                        </span>
                                    </div>
                                    <div className="search-item-right">
                                        <span className="search-item-montant">
                                            {c.nb_commandes} cmd
                                        </span>
                                    </div>
                                    <ArrowRight size={14} className="search-item-arrow" />
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* FACTURES */}
                {counts.factures > 0 && (
                    <div className="search-section">
                        <div className="search-section-header">
                            <Receipt size={14} />
                            <span>Factures</span>
                            <span className="search-count">{counts.factures}</span>
                        </div>
                        {searchResults.factures.map(f => {
                            flatIndex++;
                            const idx = flatIndex;
                            return (
                                <button
                                    key={`f-${f.id}`}
                                    className={`search-item ${selectedIndex === idx ? 'selected' : ''}`}
                                    onClick={() => goToResult({ type: 'facture', data: f })}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    <div className="search-item-icon facture">
                                        <Receipt size={16} />
                                    </div>
                                    <div className="search-item-content">
                                        <span className="search-item-title">{f.numero}</span>
                                        <span className="search-item-sub">
                                            {f.client || '-'} • {formatDate(f.date)}
                                        </span>
                                    </div>
                                    <div className="search-item-right">
                                        <span className="search-item-montant">
                                            {formatMontant(f.montant)}
                                        </span>
                                    </div>
                                    <ArrowRight size={14} className="search-item-arrow" />
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* COMMANDES DE VENTE */}
                {counts.commandes > 0 && (
                    <div className="search-section">
                        <div className="search-section-header">
                            <ShoppingCart size={14} />
                            <span>Commandes</span>
                            <span className="search-count">{counts.commandes}</span>
                        </div>
                        {searchResults.commandes.map(c => {
                            flatIndex++;
                            const idx = flatIndex;
                            return (
                                <button
                                    key={`cmd-${c.id}`}
                                    className={`search-item ${selectedIndex === idx ? 'selected' : ''}`}
                                    onClick={() => goToResult({ type: 'commande', data: c })}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    <div className="search-item-icon commande">
                                        <ShoppingCart size={16} />
                                    </div>
                                    <div className="search-item-content">
                                        <span className="search-item-title">{c.numero}</span>
                                        <span className="search-item-sub">
                                            {c.client || '-'} • {formatDate(c.date)}
                                        </span>
                                    </div>
                                    <div className="search-item-right">
                                        <span className="search-item-montant">
                                            {formatMontant(c.montant)}
                                        </span>
                                    </div>
                                    <ArrowRight size={14} className="search-item-arrow" />
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* COMMANDES D'ACHAT */}
                {counts.commandes_achat > 0 && (
                    <div className="search-section">
                        <div className="search-section-header">
                            <Package size={14} />
                            <span>Commandes d'achat</span>
                            <span className="search-count">{counts.commandes_achat}</span>
                        </div>
                        {searchResults.commandes_achat.map(c => {
                            flatIndex++;
                            const idx = flatIndex;
                            return (
                                <button
                                    key={`ca-${c.id}`}
                                    className={`search-item ${selectedIndex === idx ? 'selected' : ''}`}
                                    onClick={() => goToResult({ type: 'commande_achat', data: c })}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    <div className="search-item-icon commande-achat">
                                        <Package size={16} />
                                    </div>
                                    <div className="search-item-content">
                                        <span className="search-item-title">{c.numero}</span>
                                        <span className="search-item-sub">
                                            {c.fournisseur || '-'} • {formatDate(c.date)}
                                        </span>
                                    </div>
                                    <div className="search-item-right">
                                        <span className="search-item-montant">
                                            {formatMontant(c.montant)}
                                        </span>
                                    </div>
                                    <ArrowRight size={14} className="search-item-arrow" />
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* FOURNISSEURS */}
                {counts.fournisseurs > 0 && (
                    <div className="search-section">
                        <div className="search-section-header">
                            <Truck size={14} />
                            <span>Fournisseurs</span>
                            <span className="search-count">{counts.fournisseurs}</span>
                        </div>
                        {searchResults.fournisseurs.map(f => {
                            flatIndex++;
                            const idx = flatIndex;
                            return (
                                <button
                                    key={`four-${f.id}`}
                                    className={`search-item ${selectedIndex === idx ? 'selected' : ''}`}
                                    onClick={() => goToResult({ type: 'fournisseur', data: f })}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    <div className="search-item-icon fournisseur">
                                        <Truck size={16} />
                                    </div>
                                    <div className="search-item-content">
                                        <span className="search-item-title">{f.nom}</span>
                                        <span className="search-item-sub">
                                            {f.ville || '-'}
                                            {f.telephone && ` • ${f.telephone}`}
                                        </span>
                                    </div>
                                    <ArrowRight size={14} className="search-item-arrow" />
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* FOOTER */}
                <div className="search-dropdown-footer">
                    <span>
                        {totalResults} résultat{totalResults > 1 ? 's' : ''}
                        {' '}pour "<strong>{searchTerm}</strong>"
                    </span>
                    <div className="search-hints">
                        <kbd>↑</kbd><kbd>↓</kbd> naviguer
                        <kbd>↵</kbd> ouvrir
                        <kbd>Échap</kbd> fermer
                    </div>
                </div>
            </div>
        );
    };

    return (
        <header className="header">
            <div className="headerleft">
                {/* ✅ SEARCH BOX AVEC DROPDOWN */}
                <div className="search-box" ref={searchRef}>
                    <Search size={18} className="search-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Rechercher un produit, un client, une facture..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => {
                            if (searchTerm.trim().length >= 2) setSearchOpen(true);
                        }}
                        onKeyDown={handleKeyDown}
                    />
                    {searchLoading && (
                        <Loader size={16} className="search-loading-icon spinning" />
                    )}
                    {searchTerm && !searchLoading && (
                        <button
                            className="search-clear"
                            onClick={clearSearch}
                            aria-label="Effacer"
                        >
                            <X size={14} />
                        </button>
                    )}
                    {renderSearchDropdown()}
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

                <button
                    className="icon-btn"
                    onClick={toggleDarkMode}
                    title={darkMode ? "Mode clair" : "Mode sombre"}
                    aria-label="Basculer le thème"
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <button
                    className="icon-btn"
                    onClick={goToSettings}
                    title="Paramètres"
                    aria-label="Paramètres"
                >
                    <Settings size={20} />
                </button>

                {/* PROFIL */}
                <div className="profile-container">
                    <div className="profile" onClick={toggleDropdown}>
                        {/* ✅ LOGO DU MAGASIN */}
                        <div className="profile-logo">
                            {getLogoUrl() ? (
                                <img
                                    src={getLogoUrl()}
                                    alt={magasin?.nom_commercial || 'Logo'}
                                    onLoad={() => console.log('✅ [LOG L4] IMG chargée')}
                                    onError={(e) => {
                                        console.error('❌ [LOG L4] Erreur IMG:', e.target.src);
                                        e.target.style.display = 'none';
                                        if (e.target.nextSibling) {
                                            e.target.nextSibling.style.display = 'flex';
                                        }
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
                            <div className="dropdown-header">
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