// components/Dashboard/Sidebar/Sidebar.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../../context/AuthContext";
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Package,
  Boxes,
  Component,
  Tag,
  ShoppingBasket,
  Truck,
  PackageCheck,
  ShoppingCart,
  FileText,
  Users,
  RotateCcw,
  Warehouse,
  LayoutTemplate,
  ClipboardList,
  Layers,
  AlertTriangle,
  Wallet,
  TrendingDown,
  CreditCard,
  BarChart3,
  TrendingUp,
  Banknote,
  UserCog,
  Shield,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Home,
  Store,
  Ruler,
} from "lucide-react";
import "./Sidebar.css";

// ============================================================
// CONFIGURATION DES MENUS (extraite du composant pour perf)
// ============================================================
const MENU_CONFIG = [
  // ========== SECTION PRINCIPAL ==========
  {
    section: "Principal",
    items: [
      {
        id: "dashboard",
        title: "Tableau de bord",
        icon: LayoutDashboard,
        path: "/dashboard",
      },
      {
        id: "alertes",
        title: "Alertes",
        icon: AlertTriangle,
        path: "/alertes",
        badge: "dynamic", // 🎯 Badge dynamique (nb alertes)
        color: "#ef4444",
      },
    ],
  },

  // ========== SECTION VENTES ==========
  {
    section: "Ventes & Clients",
    icon: Store,
    items: [
      {
        id: "clients",
        title: "Clients",
        icon: Users,
        path: "/clients",
      },
      {
        id: "commandes-clients",
        title: "Commandes clients",
        icon: ShoppingCart,
        path: "/commandes-clients",
      },
      {
        id: "factures",
        title: "Factures",
        icon: FileText,
        path: "/factures",
      },
      {
        id: "recettes",
        title: "Recettes",
        icon: Banknote,
        path: "/recettes",
        highlight: "#10b981",
      },
      {
        id: "retours-clients",
        title: "Retours clients",
        icon: RotateCcw,
        path: "/retours-clients",
      },
    ],
  },

  // ========== SECTION CATALOGUE & STOCK ==========
  {
    section: "Catalogue & Stock",
    icon: Package,
    items: [
      {
        id: "produits",
        title: "Produits",
        icon: Package,
        path: "/produits",
      },
      {
        id: "categories",
        title: "Catégories",
        icon: Boxes,
        path: "/categories",
      },
      {
        id: "marques",
        title: "Marques",
        icon: Tag,
        path: "/marques",
      },
      {
        id: "modeles",
        title: "Modèles",
        icon: LayoutTemplate,
        path: "/modeles",
      },
      {
        id: "unites",
        title: "Unités",
        icon: Ruler,
        path: "/unites",
      },
      {
        id: "mouvements",
        title: "Mouvements",
        icon: ClipboardList,
        path: "/mouvements",
      },
      {
        id: "inventaires",
        title: "Inventaires",
        icon: Layers,
        path: "/inventaires",
      },
    ],
  },

  // ========== SECTION APPROVISIONNEMENT ==========
  {
    section: "Approvisionnement",
    icon: Truck,
    items: [
      {
        id: "fournisseurs",
        title: "Fournisseurs",
        icon: Truck,
        path: "/fournisseurs",
      },
      {
        id: "commandes-achat",
        title: "Commandes d'achat",
        icon: ShoppingBasket,
        path: "/commandes-achat",
      },
      {
        id: "receptions",
        title: "Réceptions",
        icon: PackageCheck,
        path: "/receptions",
      },
      {
        id: "retours-fournisseurs",
        title: "Retours fournisseurs",
        icon: RotateCcw,
        path: "/retours-fournisseurs",
      },
      {
        id: "depenses",
        title: "Dépenses",
        icon: TrendingDown,
        path: "/depenses",
        highlight: "#ef4444",
      },
    ],
  },

  // ========== SECTION RAPPORTS ==========
  {
    section: "Rapports & Analyses",
    icon: BarChart3,
    items: [
      {
        id: "rapport-ventes",
        title: "Rapport des ventes",
        icon: TrendingUp,
        path: "/rapport-ventes",
      },
      {
        id: "rapport-achats",
        title: "Rapport des achats",
        icon: ShoppingBasket,
        path: "/rapport-achats",
      },
      {
        id: "rapport-stocks",
        title: "Rapport des stocks",
        icon: Warehouse,
        path: "/rapport-stocks",
      },
      {
        id: "benefices",
        title: "Bénéfices & Marges",
        icon: Banknote,
        path: "/benefices",
        highlight: "#10b981",
      },
    ],
  },

  // ========== SECTION ADMINISTRATION ==========
  {
    section: "Administration",
    icon: Settings,
    items: [
      {
        id: "utilisateurs",
        title: "Utilisateurs",
        icon: Users,
        path: "/utilisateurs",
      },
      {
        id: "roles",
        title: "Rôles & Permissions",
        icon: Shield,
        path: "/roles",
      },
      {
        id: "paiements",
        title: "Paiements",
        icon: CreditCard,
        path: "/paiements",
      },
      {
        id: "parametres",
        title: "Paramètres",
        icon: Settings,
        path: "/parametres",
      },
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

  // ✅ Ouvrir tous les groupes par défaut
  const [openSections, setOpenSections] = useState(() => {
    const initial = {};
    MENU_CONFIG.forEach(section => {
      initial[section.section] = true;
    });
    return initial;
  });

  const userSlug = user?.slug || "";

  // ========== TROUVER L'ÉLÉMENT ACTIF ==========
  const activeItemId = useMemo(() => {
    const currentPath = location.pathname.replace(`/${userSlug}`, '') || '/dashboard';

    for (const section of MENU_CONFIG) {
      for (const item of section.items) {
        if (item.path === currentPath) {
          return item.id;
        }
      }
    }
    return 'dashboard';
  }, [location.pathname, userSlug]);

  // ========== OUVRIR AUTOMATIQUEMENT LA SECTION ACTIVE ==========
  useEffect(() => {
    for (const section of MENU_CONFIG) {
      for (const item of section.items) {
        if (item.path === location.pathname.replace(`/${userSlug}`, '')) {
          setOpenSections(prev => ({
            ...prev,
            [section.section]: true,
          }));
          break;
        }
      }
    }
  }, [location.pathname, userSlug]);

  // ========== TOGGLE SECTION ==========
  const toggleSection = (sectionName) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  // ========== NAVIGATION ==========
  const handleNavigation = (item) => {
    if (item.path) {
      navigate(`/${userSlug}${item.path}`);
    }
  };

  // ========== DÉCONNEXION ==========
  const handleLogout = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
      await logout();
      navigate("/login");
    }
  };

  // ========== RENDER ITEM ==========
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

        {/* Badge dynamique */}
        {!collapsed && item.badge === 'dynamic' && (
          <span className="menu-badge">!</span>
        )}

        {/* Indicateur highlight */}
        {!collapsed && item.highlight && !isActive && (
          <span
            className="menu-dot"
            style={{ background: item.highlight }}
          />
        )}
      </button>
    );
  };

  // ========== RENDER SECTION ==========
  const renderSection = (section) => {
    const SectionIcon = section.icon;
    const isOpen = openSections[section.section];
    const hasActiveItem = section.items.some(item => item.id === activeItemId);

    return (
      <div key={section.section} className="menu-section">
        {/* Titre de section (caché si collapsed) */}
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

        {/* Items de la section */}
        {(!collapsed || section.section === "Principal") && (
          <div className={`section-items ${isOpen ? 'open' : 'closed'}`}>
            {section.items.map(renderItem)}
          </div>
        )}

        {/* Mode collapsed : afficher tous les items à plat */}
        {collapsed && section.section === "Principal" && (
          <div className="section-items">
            {section.items.map(renderItem)}
          </div>
        )}
      </div>
    );
  };

  // ========== RENDER ==========
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* ==================== LOGO ==================== */}
      <div className="logo">
        {!collapsed && (
          <div className="logo-content">
            <h2>StockPro</h2>
            <span>Gestion des Stocks</span>
          </div>
        )}
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(prev => !prev)}
          aria-label={collapsed ? "Développer la sidebar" : "Réduire la sidebar"}
          title={collapsed ? "Développer" : "Réduire"}
        >
          {collapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
        </button>
      </div>

      {/* ==================== NAVIGATION ==================== */}
      <nav className="sidebar-nav">
        {collapsed ? (
          // ✅ Mode réduit : tous les items à plat
          <div className="collapsed-nav">
            {MENU_CONFIG.flatMap(section => section.items).map(renderItem)}
          </div>
        ) : (
          // ✅ Mode étendu : sections avec titres
          MENU_CONFIG.map(renderSection)
        )}
      </nav>

      {/* ==================== FOOTER ==================== */}
      <div className="sidebar-footer">
        {/* Déconnexion */}
        <button
          className="menu-item logout-item"
          onClick={handleLogout}
          title={collapsed ? "Déconnexion" : ""}
        >
          <span className="menu-left">
            <LogOut size={20} />
            {!collapsed && <span>Déconnexion</span>}
          </span>
        </button>

        {/* Info utilisateur */}
        {!collapsed && user && (
          <div className="user-info">
            <span className="user-avatar">
              {user.fullname ? user.fullname.charAt(0).toUpperCase() : "U"}
            </span>
            <div className="user-details">
              <p className="user-name">{user.fullname || "Utilisateur"}</p>
              <small className="user-role">{user.role || "Client"}</small>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;