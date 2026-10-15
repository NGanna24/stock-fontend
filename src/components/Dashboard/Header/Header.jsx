// components/Dashboard/Header/Header.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "./Header.css";
import { useUser } from "../../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import AlerteService from "../../../services/alerteService";
import MagasinService from "../../../services/magasinService";
import SearchService from "../../../services/searchService";
import ConfirmModal from "../../ConfirmModal/ConfirmModal";
import { MENU_CONFIG, findMenuEntry } from "../Sidebar/Sidebar";

import {
  Search, Bell, Moon, Sun, Settings, LayoutDashboard, TriangleAlert, ChevronDown,
  LogOut, User, Package, Receipt, ShoppingCart, ShoppingBasket, Truck, Users, Loader, X,
  ArrowRight,
} from "lucide-react";

const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.startsWith("192.168."));

const API_BASE_URL = isLocal ? "http://192.168.187.1:8080" : "https://miyo.n-double.com";

// ============ HELPERS ============
const formatMontant = (v) => (Math.round(parseFloat(v) || 0)).toLocaleString("fr-FR") + " FCFA";
const formatDate = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  return isNaN(date) ? "-" : date.toLocaleDateString("fr-FR");
};

const ROLE_LABELS = {
  admin: "Administrateur", client: "Client", user: "Utilisateur",
  manager: "Gestionnaire", caissier: "Caissier", magasinier: "Magasinier",
};

// Pages hors menu latéral
const EXTRA_TITLES = { "/profile": "Mon profil", "/settings": "Paramètres" };

// Description de chaque famille de résultats de recherche
const SEARCH_SECTIONS = [
  {
    key: "produits", type: "produit", label: "Produits", icon: Package,
    describe: (p) => ({
      title: p.nom, titleSmall: p.modele_nom,
      sub: `${p.categorie_nom || "Sans catégorie"}${p.marque_nom ? ` • ${p.marque_nom}` : ""}`,
      right: formatMontant(p.prix_vente),
      rightSub: `Stock : ${p.quantite_stock}`, rightSubLow: Number(p.quantite_stock) <= 0,
    }),
  },
  {
    key: "clients", type: "client", label: "Clients", icon: Users,
    describe: (c) => ({
      title: c.nom,
      sub: `${c.telephone || "Sans téléphone"}${c.ville ? ` • ${c.ville}` : ""}`,
      right: `${c.nb_commandes} cmd`,
    }),
  },
  {
    key: "factures", type: "facture", label: "Factures", icon: Receipt,
    describe: (f) => ({ title: f.numero, sub: `${f.client || "-"} • ${formatDate(f.date)}`, right: formatMontant(f.montant) }),
  },
  {
    key: "commandes", type: "commande", label: "Commandes", icon: ShoppingCart,
    describe: (c) => ({ title: c.numero, sub: `${c.client || "-"} • ${formatDate(c.date)}`, right: formatMontant(c.montant) }),
  },
  {
    key: "commandes_achat", type: "commande_achat", label: "Commandes d'achat", icon: ShoppingBasket,
    describe: (c) => ({ title: c.numero, sub: `${c.fournisseur || "-"} • ${formatDate(c.date)}`, right: formatMontant(c.montant) }),
  },
  {
    key: "fournisseurs", type: "fournisseur", label: "Fournisseurs", icon: Truck,
    describe: (f) => ({ title: f.nom, sub: `${f.ville || "-"}${f.telephone ? ` • ${f.telephone}` : ""}` }),
  },
];

const Header = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [showDropdown, setShowDropdown] = useState(false);
  const [alertesCount, setAlertesCount] = useState(0);
  const notificationsCount = 0;
  const [darkMode, setDarkMode] = useState(false);
  const [magasin, setMagasin] = useState(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Recherche
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const reqRef = useRef(0);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const profileRef = useRef(null);

  const userFullname = user?.fullname || "Utilisateur";
  const userRole = user?.role || "client";
  const userSlug = user?.slug || "";
  const userTelephone = user?.telephone || "";
  const roleLabel = ROLE_LABELS[userRole] || userRole;

  /* ---------- Fil d'Ariane ---------- */
  const crumb = useMemo(() => {
    const entry = findMenuEntry(location.pathname, userSlug, MENU_CONFIG);
    if (entry) return { section: entry.section.section === "Principal" ? null : entry.section.section, title: entry.item.title };
    const rel = location.pathname.replace(userSlug ? `/${userSlug}` : "", "").replace(/\/+$/, "");
    return EXTRA_TITLES[rel] ? { section: null, title: EXTRA_TITLES[rel] } : null;
  }, [location.pathname, userSlug]);

  /* ---------- Magasin ---------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user?.slug) return;
    (async () => {
      try {
        const res = await MagasinService.getMonMagasin(token);
        if (res.success) setMagasin(res.magasin || res.data);
      } catch (e) {
        console.error("❌ Erreur chargement magasin:", e);
      }
    })();
  }, [user?.slug]);

  const logoUrl = useMemo(() => {
    if (!magasin?.logo_url) return null;
    return magasin.logo_url.startsWith("http") ? magasin.logo_url : `${API_BASE_URL}${magasin.logo_url}`;
  }, [magasin?.logo_url]);
  useEffect(() => { setLogoFailed(false); }, [logoUrl]);
  const showLogo = !!logoUrl && !logoFailed;

  const magasinInitiales = useMemo(
    () => (magasin?.nom_commercial || "Mon magasin").split(" ").filter(Boolean).map((w) => w[0]).join("").substring(0, 2).toUpperCase(),
    [magasin?.nom_commercial]
  );

  /* ---------- Alertes (diffusées aussi à la sidebar) ---------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user?.slug) return undefined;
    const load = async () => {
      try {
        const res = await AlerteService.getStats(token);
        if (res.success && res.data) {
          const total = (res.data.total_rupture || 0) + (res.data.total_stock_bas || 0);
          setAlertesCount(total);
          window.__miyoAlertes = total;
          window.dispatchEvent(new CustomEvent("miyo:alertes-count", { detail: total }));
        }
      } catch (e) {
        console.error("❌ Erreur chargement alertes:", e);
      }
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [user?.slug]);

  /* ---------- Mode sombre ---------- */
  useEffect(() => {
    if (localStorage.getItem("darkMode") === "true") {
      setDarkMode(true);
      document.body.classList.add("dark-mode");
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.body.classList.toggle("dark-mode", next);
    localStorage.setItem("darkMode", String(next));
  };

  /* ---------- Recherche dynamique ---------- */
  useEffect(() => {
    const q = searchTerm.trim();
    if (q.length < 2) {
      reqRef.current += 1;
      setSearchResults(null);
      setSearchOpen(false);
      setSearchLoading(false);
      return undefined;
    }
    setSearchOpen(true);
    setSearchLoading(true);
    const id = ++reqRef.current;
    const timer = setTimeout(async () => {
      const token = localStorage.getItem("token");
      if (!token) { if (id === reqRef.current) setSearchLoading(false); return; }
      try {
        const res = await SearchService.searchGlobal(token, q, 5);
        if (id !== reqRef.current) return; // réponse obsolète
        setSearchResults(res.success ? res.data : null);
        setSelectedIndex(-1);
      } catch (e) {
        console.error("❌ search error:", e);
        if (id === reqRef.current) setSearchResults(null);
      } finally {
        if (id === reqRef.current) setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fermeture au clic extérieur (recherche + profil) et raccourcis clavier
  useEffect(() => {
    const onDown = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowDropdown(false);
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

  const flatResults = useMemo(() => {
    if (!searchResults) return [];
    return SEARCH_SECTIONS.flatMap((s) => (searchResults[s.key] || []).map((data) => ({ type: s.type, data })));
  }, [searchResults]);

  useEffect(() => {
    if (selectedIndex < 0 || !listRef.current) return;
    listRef.current.querySelector(`[data-idx="${selectedIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const goToResult = useCallback((item) => {
    if (!item) return;
    const base = `/${userSlug}`;
    const routes = {
      produit: `${base}/produits`,
      facture: `${base}/factures`,
      commande: `${base}/commandes-clients`,
      commande_achat: `${base}/commandes-achat`,
      fournisseur: `${base}/fournisseurs`,
      client: item.data?.telephone ? `${base}/clients/${encodeURIComponent(item.data.telephone)}` : `${base}/clients`,
    };
    if (routes[item.type]) navigate(routes[item.type]);
    setSearchOpen(false);
    setSearchTerm("");
    setSearchResults(null);
  }, [navigate, userSlug]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      if (searchOpen) { setSearchOpen(false); } else { inputRef.current?.blur(); }
      return;
    }
    if (!searchOpen) {
      if (e.key === "ArrowDown" && flatResults.length > 0) { e.preventDefault(); setSearchOpen(true); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((p) => Math.min(p + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((p) => Math.max(p - 1, -1));
    } else if (e.key === "Enter" && flatResults.length > 0) {
      e.preventDefault();
      goToResult(flatResults[selectedIndex >= 0 ? selectedIndex : 0]);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults(null);
    setSearchOpen(false);
    inputRef.current?.focus();
  };

  /* ---------- Navigation ---------- */
  const go = (path) => { navigate(`/${userSlug}${path}`); setShowDropdown(false); };

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

  /* ---------- Rendu de la recherche ---------- */
  const renderSearchDropdown = () => {
    if (!searchOpen) return null;
    const total = flatResults.length;

    if (searchLoading && !searchResults) {
      return (
        <div className="hd-results">
          <div className="hd-results-state"><Loader size={18} className="hd-spin" /><span>Recherche en cours…</span></div>
        </div>
      );
    }
    if (!searchLoading && total === 0) {
      return (
        <div className="hd-results">
          <div className="hd-results-state hd-results-state--empty">
            <Search size={30} />
            <p>Aucun résultat pour « {searchTerm.trim()} »</p>
            <small>Essayez un autre mot-clé ou un numéro.</small>
          </div>
        </div>
      );
    }

    let offset = 0;
    return (
      <div className={`hd-results ${searchLoading ? "is-refreshing" : ""}`} role="listbox" ref={listRef}>
        {SEARCH_SECTIONS.map((sec) => {
          const rows = searchResults?.[sec.key] || [];
          if (rows.length === 0) return null;
          const Icon = sec.icon;
          const start = offset;
          offset += rows.length;
          return (
            <section className="hd-group" key={sec.key}>
              <h4 className="hd-group-head">
                <Icon size={14} /> {sec.label}
                <span className="hd-group-count">{rows.length}</span>
              </h4>
              {rows.map((row, i) => {
                const idx = start + i;
                const d = sec.describe(row);
                return (
                  <button
                    key={`${sec.key}-${row.id ?? i}`}
                    data-idx={idx}
                    role="option"
                    aria-selected={selectedIndex === idx}
                    className={`hd-result ${selectedIndex === idx ? "is-selected" : ""}`}
                    onClick={() => goToResult({ type: sec.type, data: row })}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <span className="hd-result-icon"><Icon size={16} /></span>
                    <span className="hd-result-main">
                      <strong>{d.title}{d.titleSmall && <small> · {d.titleSmall}</small>}</strong>
                      <span>{d.sub}</span>
                    </span>
                    {(d.right || d.rightSub) && (
                      <span className="hd-result-right">
                        {d.right && <b>{d.right}</b>}
                        {d.rightSub && <small className={d.rightSubLow ? "is-low" : ""}>{d.rightSub}</small>}
                      </span>
                    )}
                    <ArrowRight size={14} className="hd-result-arrow" />
                  </button>
                );
              })}
            </section>
          );
        })}
        <div className="hd-results-foot">
          <span>{total} résultat{total > 1 ? "s" : ""} pour « <strong>{searchTerm.trim()}</strong> »</span>
          <span className="hd-hints"><kbd>↑</kbd><kbd>↓</kbd> naviguer <kbd>↵</kbd> ouvrir <kbd>Échap</kbd> fermer</span>
        </div>
      </div>
    );
  };

  const renderLogo = (cls) => (
    <span className={cls}>
      {showLogo ? (
        <img src={logoUrl} alt={magasin?.nom_commercial || "Logo"} onError={() => setLogoFailed(true)} />
      ) : (
        <b>{magasinInitiales}</b>
      )}
    </span>
  );

  return (
    <>
      <header className="hd">
        {/* Fil d'Ariane */}
        <div className="hd-crumb">
          {crumb ? (
            <>
              {crumb.section && <span className="hd-crumb-section">{crumb.section}</span>}
              <h1>{crumb.title}</h1>
            </>
          ) : (
            <h1>{magasin?.nom_commercial || "Miyo"}</h1>
          )}
        </div>

        {/* Recherche globale */}
        <div className="hd-search" ref={searchRef}>
          <Search size={18} className="hd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher un produit, un client, une facture…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => { if (searchTerm.trim().length >= 2) setSearchOpen(true); }}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={searchOpen}
            aria-label="Recherche globale"
            autoComplete="off"
          />
          {searchLoading && <Loader size={16} className="hd-search-spin hd-spin" />}
          {searchTerm && !searchLoading && (
            <button className="hd-search-clear" onClick={clearSearch} aria-label="Effacer la recherche"><X size={14} /></button>
          )}
          {!searchTerm && <kbd className="hd-search-kbd" aria-hidden="true">/</kbd>}
          {renderSearchDropdown()}
        </div>

        {/* Actions */}
        <div className="hd-actions">
          <button
            className={`hd-btn ${alertesCount > 0 ? "has-alert" : ""}`}
            onClick={() => navigate(`/${userSlug}/alertes`)}
            title={`${alertesCount} alerte(s) de stock`}
            aria-label={`Alertes de stock : ${alertesCount}`}
          >
            <TriangleAlert size={20} />
            {alertesCount > 0 && <span className="hd-count">{alertesCount > 99 ? "99+" : alertesCount}</span>}
          </button>

          <button
            className="hd-btn"
            onClick={() => navigate(`/${userSlug}/commandes-clients`)}
            title={`${notificationsCount} notification(s)`}
            aria-label="Notifications"
          >
            <Bell size={20} />
            {notificationsCount > 0 && <span className="hd-count hd-count--plain">{notificationsCount}</span>}
          </button>

          <button className="hd-btn" onClick={toggleDarkMode} title={darkMode ? "Mode clair" : "Mode sombre"} aria-label="Basculer le thème" aria-pressed={darkMode}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button className="hd-btn hd-btn--settings" onClick={() => go("/settings")} title="Paramètres" aria-label="Paramètres">
            <Settings size={20} />
          </button>

          {/* Profil */}
          <div className="hd-profile" ref={profileRef}>
            <button
              className={`hd-profile-btn ${showDropdown ? "is-open" : ""}`}
              onClick={() => setShowDropdown((s) => !s)}
              aria-haspopup="menu"
              aria-expanded={showDropdown}
            >
              {renderLogo("hd-logo")}
              <span className="hd-profile-text">
                <strong>{magasin?.nom_commercial || userFullname}</strong>
                <small>{roleLabel}</small>
              </span>
              <ChevronDown size={17} className={`hd-chev ${showDropdown ? "is-open" : ""}`} />
            </button>

            {showDropdown && (
              <div className="hd-menu" role="menu">
                <div className="hd-menu-head">
                  {renderLogo("hd-logo hd-logo--lg")}
                  <div>
                    <strong>{magasin?.nom_commercial || "Mon magasin"}</strong>
                    <span>{userFullname}</span>
                    <small>{roleLabel}{userTelephone ? ` • ${userTelephone}` : ""}</small>
                  </div>
                </div>
                <div className="hd-menu-body">
                  <button className="hd-menu-item" role="menuitem" onClick={() => go("/profile")}><User size={17} /><span>Mon profil</span></button>
                  <button className="hd-menu-item" role="menuitem" onClick={() => go("/settings")}><Settings size={17} /><span>Paramètres</span></button>
                  <button className="hd-menu-item" role="menuitem" onClick={() => go("/dashboard")}><LayoutDashboard size={17} /><span>Tableau de bord</span></button>
                  <button className="hd-menu-item" role="menuitem" onClick={() => go("/alertes")}>
                    <TriangleAlert size={17} /><span>Alertes de stock</span>
                    {alertesCount > 0 && <em className="hd-menu-badge">{alertesCount}</em>}
                  </button>
                  <div className="hd-menu-sep" />
                  <button className="hd-menu-item hd-menu-item--logout" role="menuitem" onClick={() => { setShowDropdown(false); setShowLogoutModal(true); }}>
                    <LogOut size={17} /><span>Déconnexion</span>
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
        message="Vous allez être redirigé vers la page de connexion. Toute modification non enregistrée sera perdue."
        type="warning"
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        loading={loggingOut}
      />
    </>
  );
};

export default Header;
