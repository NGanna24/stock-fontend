// components/SuperAdmin/Sidebar/Sidebar.jsx
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useSuperAdmin } from "../../../context/SuperAdminAuthContext";
import {
  ChevronDown, PanelLeftClose, PanelLeftOpen, LogOut,
  LayoutDashboard, Users, Store, Activity, BarChart3, MapPin,
  Shield, AlertTriangle, Settings, FileText, CreditCard, Lock
} from "lucide-react";
import ConfirmModal from "../../ConfirmModal/ConfirmModal";
import "./Sidebar.css";

// ============================================================
// CONFIGURATION DES MENUS SUPER ADMIN
// ============================================================
export const SUPER_ADMIN_MENU = [
  {
    section: "Principal",
    items: [
      { id: "sa-dashboard",  title: "Vue d'ensemble", icon: LayoutDashboard, path: "/dashboard" },
      { id: "sa-activity",   title: "Activité",       icon: Activity,        path: "/activite" },
      { id: "sa-alerts",     title: "Alertes",        icon: AlertTriangle,   path: "/alertes", badge: "dynamic" },
    ],
  },
  {
    section: "Utilisateurs",
    icon: Users,
    items: [
      { id: "sa-users",      title: "Tous les patrons", icon: Users,   path: "/utilisateurs" },
      { id: "sa-magasins",   title: "Magasins",         icon: Store,   path: "/magasins" },
      { id: "sa-carte",      title: "Carte globale",    icon: MapPin,  path: "/carte" },
    ],
  },
  {
    section: "Plateforme",
    icon: BarChart3,
    items: [
      { id: "sa-stats",      title: "Statistiques",     icon: BarChart3,   path: "/statistiques" },
      { id: "sa-revenus",    title: "Revenus",          icon: CreditCard,  path: "/revenus" },
      { id: "sa-rapports",   title: "Rapports",         icon: FileText,    path: "/rapports" },
    ],
  },
  {
    section: "Système",
    icon: Shield,
    items: [
      { id: "sa-audit",      title: "Journal d'audit",  icon: Lock,         path: "/audit" },
      { id: "sa-securite",   title: "Sécurité",         icon: Shield,       path: "/securite" },
      { id: "sa-settings",   title: "Paramètres",       icon: Settings,     path: "/parametres" },
    ],
  },
];

// Trouve l'entrée active
export const findSuperAdminEntry = (pathname, config = SUPER_ADMIN_MENU) => {
  let rel = pathname.replace(/\/+$/, "") || "/dashboard";
  let best = null;
  config.forEach(section =>
    section.items.forEach(item => {
      if (rel === item.path || rel.startsWith(item.path + "/")) {
        if (!best || item.path.length > best.item.path.length) best = { section, item };
      }
    })
  );
  return best;
};

const STORAGE_KEY = "miyo:superadmin-sidebar-collapsed";
const MOBILE_QUERY = "(max-width: 768px)";

// ============================================================
// COMPOSANT
// ============================================================
const SuperAdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { superAdmin, logout } = useSuperAdmin();   // ✅ contexte super-admin

  const [collapsedPref, setCollapsedPref] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );
  const [closedSections, setClosedSections] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [tip, setTip] = useState(null);

  const collapsed = collapsedPref || isMobile;

  // ✅ Nom depuis le contexte super-admin
  const userName = superAdmin?.fullname || "Super Admin";

  // Base URL de l'espace admin
  const basePath = "/super-admin";

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggleCollapsed = () => {
    setTip(null);
    setCollapsedPref(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  };

  // Élément actif
  const active = useMemo(
    () => findSuperAdminEntry(location.pathname.replace(basePath, "")),
    [location.pathname, basePath]
  );
  const activeItemId = active?.item.id || null;
  const activeSection = active?.section.section || null;

  useEffect(() => {
    if (activeSection) setClosedSections(prev => prev.filter(s => s !== activeSection));
  }, [activeSection]);

  const toggleSection = (name) =>
    setClosedSections(prev => (prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]));

  // ✅ Déconnexion super-admin
  const handleLogoutConfirm = async () => {
    setLoggingOut(true);
    try {
      await logout();                                  // → vide localStorage + POST /logout
      navigate("/super-admin/login", { replace: true }); // ✅ bonne route
    } catch (err) {
      console.error("Erreur déconnexion:", err);
      // même en cas d'erreur serveur, on force la redirection
      navigate("/super-admin/login", { replace: true });
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  // Info-bulles
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

  const initials = userName.split(" ").filter(Boolean).map(w => w[0]).join("").substring(0, 2).toUpperCase() || "SA";

  // ---------- Rendus ----------
  const renderItem = (item) => {
    const Icon = item.icon;
    const isActive = activeItemId === item.id;
    const href = `${basePath}${item.path}`;

    return (
      <a
        key={item.id}
        href={href}
        className={`sa-sb-item ${isActive ? "is-active" : ""}`}
        onClick={(e) => goTo(e, href)}
        aria-current={isActive ? "page" : undefined}
        aria-label={collapsed ? item.title : undefined}
        {...tipHandlers(item.title)}
      >
        <Icon size={19} className="sa-sb-item-icon" />
        {!collapsed && <span className="sa-sb-item-label">{item.title}</span>}
        {!collapsed && item.highlight && !isActive && (
          <i className="sa-sb-dot" style={{ background: item.highlight }} />
        )}
      </a>
    );
  };

  let letterIndex = -1;
  const renderSection = (section) => {
    const isMain = section.section === "Principal";
    const isOpen = !closedSections.includes(section.section);
    const hasActive = activeSection === section.section;
    const letter = isMain ? null : String.fromCharCode(65 + ++letterIndex);
    const panelId = `sa-sb-panel-${section.section.replace(/\W+/g, "-")}`;

    return (
      <div key={section.section} className={`sa-sb-section ${isMain ? "is-main" : ""}`}>
        {isMain ? (
          <p className="sa-sb-main-label">Principal</p>
        ) : (
          <button
            className={`sa-sb-section-head ${hasActive ? "has-active" : ""}`}
            onClick={() => toggleSection(section.section)}
            aria-expanded={isOpen}
            aria-controls={panelId}
          >
            <span className="sa-sb-letter">{letter}</span>
            <span className="sa-sb-section-title">{section.section}</span>
            <ChevronDown size={15} className={`sa-sb-chev ${isOpen ? "is-open" : ""}`} />
          </button>
        )}
        <div id={panelId} className={`sa-sb-items ${isMain || isOpen ? "is-open" : ""}`}>
          <div className="sa-sb-items-inner">
            {section.items.map(renderItem)}
          </div>
        </div>
      </div>
    );
  };

  const dashboardHref = `${basePath}/dashboard`;

  return (
    <>
      <aside className={`sa-sb ${collapsed ? "is-collapsed" : ""}`} aria-label="Navigation Super Admin">
        <div className="sa-sb-brand">
          <a
            href={dashboardHref}
            className="sa-sb-logo"
            onClick={(e) => goTo(e, dashboardHref)}
            aria-label="Console Super Admin"
            {...tipHandlers("Console Super Admin")}
          >
            <span className="sa-sb-logo-tile">
              <Lock size={20} />
            </span>
            {!collapsed && (
              <span className="sa-sb-logo-text">
                <strong>Miyo Admin</strong>
                <small>Console Super Admin</small>
              </span>
            )}
          </a>
          {!isMobile && (
            <button
              className="sa-sb-collapse"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Agrandir le menu" : "Réduire le menu"}
              aria-pressed={collapsed}
              {...tipHandlers(collapsed ? "Agrandir le menu" : "Réduire le menu")}
            >
              {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>
          )}
        </div>

        <nav className="sa-sb-nav" onScroll={hideTip}>
          {SUPER_ADMIN_MENU.map(renderSection)}
        </nav>

        <div className="sa-sb-foot">
          <div className="sa-sb-user" title={collapsed ? userName : undefined}>
            <span className="sa-sb-user-tile">{initials}</span>
            {!collapsed && (
              <span className="sa-sb-user-text">
                <strong>{userName}</strong>
                <small>Super Administrateur</small>
              </span>
            )}
          </div>
          <button
            className="sa-sb-logout"
            onClick={() => { setTip(null); setShowLogoutModal(true); }}
            aria-label="Déconnexion"
            {...tipHandlers("Déconnexion")}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {tip && createPortal(
        <div className="sa-sb-tip" style={{ top: tip.top, left: tip.left }} role="tooltip">
          {tip.label}
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => !loggingOut && setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        title="Se déconnecter ?"
        message="Vous allez être redirigé vers la page de connexion super-admin."
        type="warning"
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        loading={loggingOut}
      />
    </>
  );
};

export default SuperAdminSidebar;