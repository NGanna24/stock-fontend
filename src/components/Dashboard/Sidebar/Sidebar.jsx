// components/Dashboard/Sidebar/Sidebar.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../../context/AuthContext";
import { ROLE_PERMISSIONS } from "../../../config/rolePermissions";
import {
  ChevronDown, ChevronRight, LayoutDashboard, Package, Boxes,
  Tag, ShoppingBasket, Truck, PackageCheck, ShoppingCart,
  FileText, Users, RotateCcw, Warehouse, LayoutTemplate,
  ClipboardList, Layers, AlertTriangle, TrendingDown, CreditCard,
  BarChart3, TrendingUp, Banknote, Shield, Settings,
  PanelLeftClose, PanelLeftOpen, LogOut, Store, Ruler,
  Bot,
} from "lucide-react";
import ConfirmModal from "../../ConfirmModal/ConfirmModal";
import "./Sidebar.css";

// ============================================================
// CONFIGURATION DES MENUS
// ============================================================
const MENU_CONFIG = [
  {
    section: "Principal",
    items: [
      { id: "dashboard", title: "Tableau de bord", icon: LayoutDashboard, path: "/dashboard" },
      { id: "assistantachat", title: "Assistant Achat", icon: Bot, path: "/assistant-achat" },
      { id: "alertes", title: "Alertes", icon: AlertTriangle, path: "/alertes", badge: "dynamic", color: "#ef4444" },
    ],
  },
  {
    section: "Ventes & Clients",
    icon: Store,
    items: [
      { id: "clients",           title: "Clients",           icon: Users,         path: "/clients" },
      { id: "commandes-clients", title: "Vente", icon: ShoppingCart,  path: "/commandes-clients" },
      { id: "factures",          title: "Factures",          icon: FileText,      path: "/factures" },
      { id: "recettes",          title: "Recettes",          icon: Banknote,      path: "/recettes",        highlight: "#10b981" },
      { id: "retours-clients",   title: "Retours clients",   icon: RotateCcw,     path: "/retours-clients" },
    ],
  },
  {
    section: "Catalogue & Stock",
    icon: Package,
    items: [
      { id: "produits",    title: "Produits",    icon: Package,        path: "/produits" },
      { id: "categories",  title: "Catégories",  icon: Boxes,          path: "/categories" },
      { id: "marques",     title: "Marques",     icon: Tag,            path: "/marques" },
      { id: "modeles",     title: "Modèles",     icon: LayoutTemplate, path: "/modeles" },
      { id: "unites",      title: "Unités",      icon: Ruler,          path: "/unites" },
      { id: "mouvements",  title: "Mouvements",  icon: ClipboardList,  path: "/mouvements" },
      { id: "inventaires", title: "Inventaires", icon: Layers,         path: "/inventaires" },
    ],
  },
  {
    section: "Approvisionnement",
    icon: Truck,
    items: [
      { id: "fournisseurs",         title: "Fournisseurs",         icon: Truck,          path: "/fournisseurs" },
      { id: "commandes-achat",      title: "Commandes fournisseurs",    icon: ShoppingBasket, path: "/commandes-achat" },
      { id: "receptions",           title: "Réceptions",           icon: PackageCheck,   path: "/receptions" },
      { id: "retours-fournisseurs", title: "Retours fournisseurs", icon: RotateCcw,      path: "/retours-fournisseurs" },
    ],
  },
  {
    section: "Rapports & Analyses",
    icon: BarChart3,
    items: [
      { id: "rapport-ventes",  title: "Rapport des ventes",  icon: TrendingUp,     path: "/rapport-ventes" },
      { id: "rapport-achats",  title: "Rapport des achats",  icon: ShoppingBasket, path: "/rapport-achats" },
      { id: "rapport-stocks",  title: "Rapport des stocks",  icon: Warehouse,      path: "/rapport-stocks" },
      { id: "benefices",       title: "Bénéfices & Marges",  icon: Banknote,       path: "/benefices", highlight: "#10b981" },
    ],
  },
  {
    section: "Administration",
    icon: Settings,
    allowedRoles: ["admin"],
    items: [
      { id: "mon-magasin",  title: "Mon magasin",         icon: Store,    path: "/mon-magasin" },
      { id: "employes",     title: "Employés",            icon: Users,    path: "/employes" },
      { id: "paiements",    title: "Paiements",           icon: CreditCard, path: "/paiements" },
    ],
  },
];

// ============================================================
// COMPOSANT
// ============================================================
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useUser();

  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const userSlug = user?.slug || "";
  const userRole = user?.role || "caissier";

  // ============================================================
  // FILTRAGE DES MENUS SELON LE RÔLE
  // ============================================================
  const menuConfigFiltre = useMemo(() => {
    const perms = ROLE_PERMISSIONS[userRole] || [];
    const isFullAccess = perms.includes('*');

    return MENU_CONFIG
      .filter(section => {
        if (section.allowedRoles) {
          return section.allowedRoles.includes(userRole);
        }
        return true;
      })
      .map(section => ({
        ...section,
        items: section.items.filter(item =>
          isFullAccess || perms.includes(item.id)
        ),
      }))
      .filter(section => section.items.length > 0);
  }, [userRole]);

  // ============================================================
  // ÉTAT D'OUVERTURE DES SECTIONS
  // ============================================================
  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    const initial = {};
    menuConfigFiltre.forEach(section => {
      initial[section.section] = true;
    });
    setOpenSections(initial);
  }, [menuConfigFiltre]);

  // ============================================================
  // ITEM ACTIF
  // ============================================================
  const activeItemId = useMemo(() => {
    const currentPath = location.pathname.replace(`/${userSlug}`, '') || '/dashboard';
    for (const section of menuConfigFiltre) {
      for (const item of section.items) {
        if (item.path === currentPath) return item.id;
      }
    }
    return 'dashboard';
  }, [location.pathname, userSlug, menuConfigFiltre]);

  useEffect(() => {
    menuConfigFiltre.forEach(section => {
      section.items.forEach(item => {
        if (item.path === location.pathname.replace(`/${userSlug}`, '')) {
          setOpenSections(prev => ({ ...prev, [section.section]: true }));
        }
      });
    });
  }, [location.pathname, userSlug, menuConfigFiltre]);

  // ============================================================
  // ACTIONS
  // ============================================================
  const toggleSection = (sectionName) => {
    setOpenSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  const handleNavigation = (item) => {
    if (item.path) {
      navigate(`/${userSlug}${item.path}`);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error('Erreur déconnexion:', err);
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  // ============================================================
  // RENDUS
  // ============================================================
  const renderItem = (item) => {
    const Icon = item.icon;
    const isActive = activeItemId === item.id;

    return (
      <button
        key={item.id}
        className={`menu-item ${isActive ? "active" : ""}`}
        onClick={() => handleNavigation(item)}
        title={collapsed ? item.title : ""}
        style={item.highlight && !isActive ? { '--accent-color': item.highlight } : {}}
      >
        <span className="menu-left">
          <Icon size={20} />
          {!collapsed && <span>{item.title}</span>}
        </span>

        {!collapsed && item.badge === 'dynamic' && <span className="menu-badge">!</span>}

        {!collapsed && item.highlight && !isActive && (
          <span className="menu-dot" style={{ background: item.highlight }} />
        )}
      </button>
    );
  };

  const renderSection = (section) => {
    const SectionIcon = section.icon;
    const isOpen = openSections[section.section];
    const hasActiveItem = section.items.some(item => item.id === activeItemId);

    return (
      <div key={section.section} className="menu-section">
        {!collapsed && section.section !== "Principal" ? (
          <button
            className={`section-header ${isOpen ? 'open' : ''} ${hasActiveItem ? 'has-active' : ''}`}
            onClick={() => toggleSection(section.section)}
          >
            <span className="section-title">
              {SectionIcon && <SectionIcon size={14} />}
              <span>{section.section}</span>
            </span>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          !collapsed && section.section === "Principal" && (
            <div className="section-header-static">
              <span className="section-title">{section.section}</span>
            </div>
          )
        )}

        {(!collapsed || section.section === "Principal") && (
          <div className={`section-items ${isOpen ? 'open' : 'closed'}`}>
            {section.items.map(renderItem)}
          </div>
        )}

        {collapsed && section.section === "Principal" && (
          <div className="section-items">
            {section.items.map(renderItem)}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <>
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="logo">
          {!collapsed && (
            <div className="logo-content">
              <div className="logo-brand" onClick={() => navigate(`/${userSlug}/dashboard`)}>
                <img
                  src="/logo-miyo.png"
                  alt="Miyo"
                  className="logo-miyo-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'block';
                  }}
                />
                <div className="logo-text">
                  <h2>Miyo</h2>
                  <span>Gestion des Stocks</span>
                </div>
              </div>
            </div>
          )}

          {collapsed && (
            <img
              src="/logo-miyo.png"
              alt="Miyo"
              className="logo-miyo-image-collapsed"
            />
          )}

          <button
            className="collapse-btn"
            onClick={() => setCollapsed(prev => !prev)}
            title={collapsed ? "Agrandir" : "Réduire"}
          >
            {collapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {collapsed ? (
            <div className="collapsed-nav">
              {menuConfigFiltre.flatMap(section => section.items).map(renderItem)}
            </div>
          ) : (
            menuConfigFiltre.map(renderSection)
          )}
        </nav>

        <div className="sidebar-footer">
          <button
            className="menu-item logout-item"
            onClick={handleLogoutClick}
            title={collapsed ? "Déconnexion" : ""}
          >
            <span className="menu-left">
              <LogOut size={20} />
              {!collapsed && <span>Déconnexion</span>}
            </span>
          </button>
        </div>
      </aside>

      {/* ============================================================
          MODAL DE DÉCONNEXION
          ============================================================ */}
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