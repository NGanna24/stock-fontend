// components/Dashboard/Sidebar/Sidebar.jsx
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../../context/AuthContext";
import { ROLE_PERMISSIONS } from "../../../config/rolePermissions";
import {
  ChevronDown, LayoutDashboard, Package, Boxes, Tag, ShoppingBasket, Truck,
  PackageCheck, ShoppingCart, FileText, Users, RotateCcw, Warehouse, LayoutTemplate,
  ClipboardList, Layers, AlertTriangle, CreditCard, BarChart3, TrendingUp, Banknote,
  Settings, PanelLeftClose, PanelLeftOpen, LogOut, Store, Ruler, Bot, User,
} from "lucide-react";
import ConfirmModal from "../../ConfirmModal/ConfirmModal";
import "./Sidebar.css";

// ============================================================
// CONFIGURATION DES MENUS (exportée : le Header s'en sert pour le fil d'Ariane)
// ============================================================
export const MENU_CONFIG = [
  {
    section: "Principal",
    items: [
      { id: "dashboard", title: "Tableau de bord", icon: LayoutDashboard, path: "/dashboard" },
      { id: "assistantachat", title: "Assistant Achat", icon: Bot, path: "/assistant-achat" },
      { id: "alertes", title: "Alertes", icon: AlertTriangle, path: "/alertes", badge: "dynamic" },
    ],
  },
  {
    section: "Ventes & Clients",
    icon: Store,
    items: [
      { id: "clients", title: "Clients", icon: Users, path: "/clients" },
      { id: "commandes-clients", title: "Vente", icon: ShoppingCart, path: "/commandes-clients" },
      { id: "factures", title: "Factures", icon: FileText, path: "/factures" },
      { id: "recettes", title: "Recettes", icon: Banknote, path: "/recettes", highlight: "#43b57a" },
      { id: "retours-clients", title: "Retours clients", icon: RotateCcw, path: "/retours-clients" },
    ],
  },
  {
    section: "Catalogue & Stock",
    icon: Package,
    items: [
      { id: "produits", title: "Produits", icon: Package, path: "/produits" },
      { id: "categories", title: "Catégories", icon: Boxes, path: "/categories" },
      { id: "marques", title: "Marques", icon: Tag, path: "/marques" },
      { id: "modeles", title: "Modèles", icon: LayoutTemplate, path: "/modeles" },
      { id: "unites", title: "Unités", icon: Ruler, path: "/unites" },
      { id: "mouvements", title: "Mouvements", icon: ClipboardList, path: "/mouvements" },
      { id: "inventaires", title: "Inventaires", icon: Layers, path: "/inventaires" },
    ],
  },
  {
    section: "Approvisionnement",
    icon: Truck,
    items: [
      { id: "fournisseurs", title: "Fournisseurs", icon: Truck, path: "/fournisseurs" },
      { id: "commandes-achat", title: "Commandes fournisseurs", icon: ShoppingBasket, path: "/commandes-achat" },
      { id: "receptions", title: "Réceptions", icon: PackageCheck, path: "/receptions" },
      { id: "retours-fournisseurs", title: "Retours fournisseurs", icon: RotateCcw, path: "/retours-fournisseurs" },
    ],
  },
  {
    section: "Rapports & Analyses",
    icon: BarChart3,
    items: [
      { id: "rapport-ventes", title: "Rapport des ventes", icon: TrendingUp, path: "/rapport-ventes" },
      { id: "rapport-achats", title: "Rapport des achats", icon: ShoppingBasket, path: "/rapport-achats" },
      { id: "rapport-stocks", title: "Rapport des stocks", icon: Warehouse, path: "/rapport-stocks" },
      { id: "benefices", title: "Bénéfices & Marges", icon: Banknote, path: "/benefices", highlight: "#43b57a" },
    ],
  },
  {
    section: "Administration",
    icon: Settings,
    allowedRoles: ["admin"],
    items: [
      { id: "mon-profil", title: "Mon profil", icon: User, path: "/mon-profil" },
      { id: "mon-magasin", title: "Mon magasin", icon: Store, path: "/mon-magasin" },
      { id: "employes", title: "Employés", icon: Users, path: "/employes" },
      { id: "paiements", title: "Paiements", icon: CreditCard, path: "/paiements" },
    ],
  },
];

// Trouve l'entrée de menu correspondant à l'URL (la plus précise l'emporte,
// et les sous-pages comme /clients/0102030405 restent rattachées à /clients)
export const findMenuEntry = (pathname, slug, config = MENU_CONFIG) => {
  const prefix = slug ? `/${slug}` : "";
  let rel = prefix && pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname;
  rel = rel.replace(/\/+$/, "") || "/dashboard";
  let best = null;
  config.forEach((section) =>
    section.items.forEach((item) => {
      if (rel === item.path || rel.startsWith(item.path + "/")) {
        if (!best || item.path.length > best.item.path.length) best = { section, item };
      }
    })
  );
  return best;
};

const STORAGE_KEY = "miyo:sidebar-collapsed";
const MOBILE_QUERY = "(max-width: 768px)";

// ============================================================
// COMPOSANT
// ============================================================
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useUser();

  const [collapsedPref, setCollapsedPref] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );
  const [closedSections, setClosedSections] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [alertesCount, setAlertesCount] = useState(
    () => (typeof window !== "undefined" && Number(window.__miyoAlertes)) || 0
  );
  const [tip, setTip] = useState(null);
  const [logoFailed, setLogoFailed] = useState(false);

  const collapsed = collapsedPref || isMobile;
  const userSlug = user?.slug || "";
  const userRole = user?.role || "caissier";
  const userName = user?.fullname || "Utilisateur";

  // Sur petit écran la barre devient un rail d'icônes (comme avant)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Compteur d'alertes : diffusé par le Header (évite un second appel réseau)
  useEffect(() => {
    const onCount = (e) => setAlertesCount(Number(e.detail) || 0);
    window.addEventListener("miyo:alertes-count", onCount);
    return () => window.removeEventListener("miyo:alertes-count", onCount);
  }, []);

  const toggleCollapsed = () => {
    setTip(null);
    setCollapsedPref((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch { /* stockage indisponible */ }
      return next;
    });
  };

  // ---------- Filtrage selon le rôle ----------
  const menuConfigFiltre = useMemo(() => {
    const perms = ROLE_PERMISSIONS[userRole] || [];
    const isFullAccess = perms.includes("*");
    return MENU_CONFIG
      .filter((s) => (s.allowedRoles ? s.allowedRoles.includes(userRole) : true))
      .map((s) => ({ ...s, items: s.items.filter((it) => isFullAccess || perms.includes(it.id)) }))
      .filter((s) => s.items.length > 0);
  }, [userRole]);

  // ---------- Élément actif ----------
  const active = useMemo(
    () => findMenuEntry(location.pathname, userSlug, menuConfigFiltre),
    [location.pathname, userSlug, menuConfigFiltre]
  );
  const activeItemId = active?.item.id || null;
  const activeSection = active?.section.section || null;

  // Ouvre automatiquement la section de la page courante
  useEffect(() => {
    if (activeSection) setClosedSections((prev) => prev.filter((s) => s !== activeSection));
  }, [activeSection]);

  const toggleSection = (name) =>
    setClosedSections((prev) => (prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]));

  // ---------- Déconnexion ----------
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

  // ---------- Info-bulles (portail : jamais coupées par la barre) ----------
  const showTip = (e, label) => {
    if (!collapsed) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const hideTip = () => setTip(null);
  const tipHandlers = (label) => ({
    onMouseEnter: (e) => showTip(e, label),
    onFocus: (e) => showTip(e, label),
    onMouseLeave: hideTip,
    onBlur: hideTip,
  });

  const goTo = (e, href) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setTip(null);
    navigate(href);
  };

  const initials = userName.split(" ").filter(Boolean).map((w) => w[0]).join("").substring(0, 2).toUpperCase() || "U";
  const roleLabels = { admin: "Administrateur", manager: "Gestionnaire", caissier: "Caissier", magasinier: "Magasinier", user: "Utilisateur", client: "Client" };

  // ---------- Rendus ----------
  const renderItem = (item) => {
    const Icon = item.icon;
    const isActive = activeItemId === item.id;
    const href = `/${userSlug}${item.path}`;
    const showBadge = item.badge === "dynamic" && alertesCount > 0;

    return (
      <a
        key={item.id}
        href={href}
        className={`sb-item ${isActive ? "is-active" : ""}`}
        onClick={(e) => goTo(e, href)}
        aria-current={isActive ? "page" : undefined}
        aria-label={collapsed ? item.title : undefined}
        {...tipHandlers(item.title + (showBadge ? ` (${alertesCount})` : ""))}
      >
        <Icon size={19} className="sb-item-icon" />
        {!collapsed && <span className="sb-item-label">{item.title}</span>}
        {showBadge && <span className="sb-badge">{alertesCount > 99 ? "99+" : alertesCount}</span>}
        {!collapsed && item.highlight && !isActive && <i className="sb-dot" style={{ background: item.highlight }} />}
      </a>
    );
  };

  let letterIndex = -1;
  const renderSection = (section) => {
    const isMain = section.section === "Principal";
    const isOpen = !closedSections.includes(section.section);
    const hasActive = activeSection === section.section;
    const letter = isMain ? null : String.fromCharCode(65 + ++letterIndex);
    const panelId = `sb-panel-${section.section.replace(/\W+/g, "-")}`;

    return (
      <div key={section.section} className={`sb-section ${isMain ? "is-main" : ""}`}>
        {isMain ? (
          <p className="sb-main-label">Principal</p>
        ) : (
          <button
            className={`sb-section-head ${hasActive ? "has-active" : ""}`}
            onClick={() => toggleSection(section.section)}
            aria-expanded={isOpen}
            aria-controls={panelId}
          >
            <span className="sb-letter">{letter}</span>
            <span className="sb-section-title">{section.section}</span>
            <ChevronDown size={15} className={`sb-chev ${isOpen ? "is-open" : ""}`} />
          </button>
        )}
        <div id={panelId} className={`sb-items ${isMain || isOpen ? "is-open" : ""}`}>
          <div className={`sb-items-inner ${isMain ? "" : "has-rule"}`}>{section.items.map(renderItem)}</div>
        </div>
      </div>
    );
  };

  const dashboardHref = `/${userSlug}/dashboard`;

  return (
    <>
      <aside className={`sb ${collapsed ? "is-collapsed" : ""}`} aria-label="Navigation principale">
        <div className="sb-brand">
          <a href={dashboardHref} className="sb-logo" onClick={(e) => goTo(e, dashboardHref)} aria-label="Miyo — tableau de bord" {...tipHandlers("Miyo")}>
            <span className="sb-logo-tile">
              {logoFailed ? (
                <b>M</b>
              ) : (
                <img src="/logo-miyo.png" alt="" onError={() => setLogoFailed(true)} />
              )}
            </span>
            {!collapsed && (
              <span className="sb-logo-text">
                <strong>Miyo</strong>
                <small>Gestion des stocks</small>
              </span>
            )}
          </a>
          {!isMobile && (
            <button
              className="sb-collapse"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Agrandir le menu" : "Réduire le menu"}
              aria-pressed={collapsed}
              {...tipHandlers(collapsed ? "Agrandir le menu" : "Réduire le menu")}
            >
              {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>
          )}
        </div>

        <nav className="sb-nav" onScroll={hideTip}>
          {menuConfigFiltre.map(renderSection)}
        </nav>

        <div className="sb-foot">
          <div className="sb-user" title={collapsed ? userName : undefined}>
            <span className="sb-user-tile">{initials}</span>
            {!collapsed && (
              <span className="sb-user-text">
                <strong>{userName}</strong>
                <small>{roleLabels[userRole] || userRole}</small>
              </span>
            )}
          </div>
          <button
            className="sb-logout"
            onClick={() => { setTip(null); setShowLogoutModal(true); }}
            aria-label="Déconnexion"
            {...tipHandlers("Déconnexion")}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {tip && createPortal(<div className="sb-tip" style={{ top: tip.top, left: tip.left }} role="tooltip">{tip.label}</div>, document.body)}

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

export default Sidebar;
