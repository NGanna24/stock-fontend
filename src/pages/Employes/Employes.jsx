// pages/Employes/Employes.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Search, Eye, EyeOff, ChevronLeft, ChevronRight, Download, X, Check,
  RefreshCw, Grid, List, Users, User, UserPlus, Shield, Store, Phone, Mail,
  Lock, Edit3, Trash2, ToggleLeft, ToggleRight, AlertCircle, CheckCircle,
  Ban, ChevronDown, Loader, MoreVertical, AlertTriangle, Info, Hash, Briefcase,
  Calendar, Clock, Building
} from "lucide-react";
import EmployeService from "../../services/employeService";
import { useUser } from "../../context/AuthContext";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import CountrySelect, { COUNTRIES } from "../../components/CountrySelect";
import "./Employes.css";

/* ============================================================
   CONSTANTES & UTILITAIRES
   ============================================================ */
const ROLES_DISPONIBLES = [
  { value: "caissier",   label: "Caissier",   description: "Ventes, paiements, clients", tone: "cash" },
  { value: "magasinier", label: "Magasinier", description: "Stocks, réceptions, inventaires", tone: "stock" },
  { value: "manager",    label: "Manager",    description: "Toutes les opérations sauf admin", tone: "manager" },
];

const ROLES_LABELS = {
  admin: "Administrateur",
  manager: "Manager",
  caissier: "Caissier",
  magasinier: "Magasinier",
};

const EMPTY_FORM = {
  fullname: "",
  countryCode: "CI",
  phoneLocal: "",
  password: "",
  roleName: "caissier",
};

const ITEMS_PER_PAGE = 10;

const formatDate = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  return isNaN(date) ? "-" : date.toLocaleDateString("fr-FR");
};

const formatDateTime = (d) => {
  if (!d) return "Jamais";
  const date = new Date(d);
  return isNaN(date)
    ? "Jamais"
    : date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const getTodayISO = () => new Date().toISOString().split("T")[0];

const downloadCSV = (headers, rows, filename) => {
  const esc = (c) => `"${String(c ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(esc).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/* ---------- Téléphone E.164 ---------- */
function parsePhoneNumber(fullPhone) {
  if (!fullPhone) return { country: "CI", local: "" };
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (fullPhone.startsWith(c.dial)) {
      return { country: c.code, local: fullPhone.slice(c.dial.length) };
    }
  }
  return { country: "CI", local: fullPhone.replace(/^\+/, "") };
}

function buildPhoneNumber(countryCode, localNumber) {
  const dial = COUNTRIES.find((c) => c.code === countryCode)?.dial || "+225";
  const cleaned = (localNumber || "").replace(/[\s\-().]/g, "");
  return `${dial}${cleaned}`;
}

/* ============================================================
   PETITS COMPOSANTS
   ============================================================ */
const RoleTag = ({ role }) => {
  const cfg = ROLES_DISPONIBLES.find((r) => r.value === role);
  const tone = cfg?.tone || (role === "admin" ? "admin" : "other");
  const label = ROLES_LABELS[role] || role;
  return (
    <span className={`em-tag em-tag--${tone}`}>
      <i className="em-tag-dot" />
      {label}
    </span>
  );
};

const StatusTag = ({ actif }) => (
  <span className={`em-tag em-tag--${actif ? "active" : "inactive"}`}>
    <i className="em-tag-dot" />
    {actif ? "Actif" : "Inactif"}
  </span>
);

const ActionsMenu = ({ menu, employe, isAdmin, onView, onEdit, onToggle, onDelete, onClose }) => {
  if (!menu || !employe) return null;
  const style = { right: menu.right, ...(menu.up ? { bottom: menu.bottom } : { top: menu.top }) };
  const run = (fn) => () => { onClose(); fn(employe); };
  return createPortal(
    <div className="em-menu" data-em-menu style={style} role="menu">
      <button className="em-menu-item" onClick={run(onView)} role="menuitem">
        <Info size={15} /> Voir les détails
      </button>
      {isAdmin && (
        <button className="em-menu-item" onClick={run(onEdit)} role="menuitem">
          <Edit3 size={15} /> Modifier
        </button>
      )}
      {isAdmin && (
        <button className="em-menu-item" onClick={run(onToggle)} role="menuitem">
          {employe.actif
            ? <><ToggleLeft size={15} /> Désactiver</>
            : <><ToggleRight size={15} /> Activer</>}
        </button>
      )}
      {isAdmin && (
        <>
          <div className="em-menu-sep" />
          <button className="em-menu-item em-menu-item--danger" onClick={run(onDelete)} role="menuitem">
            <Trash2 size={15} /> Supprimer
          </button>
        </>
      )}
    </div>,
    document.body
  );
};

/* ============================================================
   PAGE
   ============================================================ */
const Employes = () => {
  const { user } = useUser();
  const token = localStorage.getItem("token");

  // ---------- Données ----------
  const [employes, setEmployes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // ---------- Liste ----------
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 720 ? "grid" : "list"
  );
  const [filterRole, setFilterRole] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [selectedIds, setSelectedIds] = useState([]);
  const [notification, setNotification] = useState(null);
  const notifTimer = useRef(null);
  const [menu, setMenu] = useState(null);

  // ---------- Modals ----------
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [detailEmploye, setDetailEmploye] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  // ---------- Formulaire ----------
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);

  const isAdmin = !!user && user.role === "admin";

  /* ---------- Chargement ---------- */
  const loadEmployes = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await EmployeService.getAll(token);
      if (res.success) setEmployes(res.employes || []);
      else setLoadError(res.message || "Impossible de charger les employés");
    } catch (e) {
      console.error("❌ LoadEmployes error:", e);
      setLoadError(e.message || "Impossible de charger les employés");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await EmployeService.getStats(token);
      if (res.success) setStats(res.stats);
    } catch (e) {
      console.error("❌ LoadStats error:", e);
    }
  };

  const handleRefresh = () => {
    loadEmployes();
    loadStats();
  };

  useEffect(() => {
    if (token) {
      loadEmployes();
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ---------- Menu d'actions : fermeture ---------- */
  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu(null);
    const onDown = (e) => {
      if (!e.target.closest("[data-em-menu],[data-em-more]")) close();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  /* ---------- Échap + verrouillage du scroll ---------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (menu) setMenu(null);
      else if (showModal && !saving) setShowModal(false);
      else if (showDetailModal) setShowDetailModal(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu, showModal, showDetailModal, saving]);

  useEffect(() => {
    document.body.style.overflow = showModal || showDetailModal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showModal, showDetailModal]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterRole, sortBy]);

  /* ---------- Notifications ---------- */
  const showNotification = (message, type = "info") => {
    clearTimeout(notifTimer.current);
    setNotification({ message, type });
    notifTimer.current = setTimeout(() => setNotification(null), 4000);
  };
  useEffect(() => () => clearTimeout(notifTimer.current), []);

  /* ============================================================
     STATS / FILTRES
     ============================================================ */
  const computedStats = useMemo(() => {
    const total = employes.length;
    const actifs = employes.filter((e) => e.actif).length;
    const inactifs = total - actifs;
    const caissiers = employes.filter((e) => e.role_nom === "caissier").length;
    const magasiniers = employes.filter((e) => e.role_nom === "magasinier").length;
    const managers = employes.filter((e) => e.role_nom === "manager").length;
    const admins = employes.filter((e) => e.role_nom === "admin").length;
    const tauxActivite = total ? Math.round((actifs / total) * 100) : 0;
    return { total, actifs, inactifs, caissiers, magasiniers, managers, admins, tauxActivite };
  }, [employes]);

  const sortedEmployes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = employes.filter((e) => {
      const matchSearch =
        !q ||
        e.fullname?.toLowerCase().includes(q) ||
        e.telephone?.includes(q) ||
        e.slug?.toLowerCase().includes(q);
      const matchRole = filterRole ? e.role_nom === filterRole : true;
      return matchSearch && matchRole;
    });

    const sorters = {
      name_asc:  (a, b) => (a.fullname || "").localeCompare(b.fullname || ""),
      name_desc: (a, b) => (b.fullname || "").localeCompare(a.fullname || ""),
      date_desc: (a, b) => new Date(b.date_creation || 0) - new Date(a.date_creation || 0),
      date_asc:  (a, b) => new Date(a.date_creation || 0) - new Date(b.date_creation || 0),
      role:      (a, b) => (a.role_nom || "").localeCompare(b.role_nom || ""),
    };
    return [...list].sort(sorters[sortBy] || sorters.name_asc);
  }, [employes, searchTerm, filterRole, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedEmployes.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const firstIdx = (page - 1) * ITEMS_PER_PAGE;
  const currentItems = sortedEmployes.slice(firstIdx, firstIdx + ITEMS_PER_PAGE);
  const hasFilters = !!searchTerm || !!filterRole;
  const allPageSelected =
    currentItems.length > 0 &&
    currentItems.every((e) => selectedIds.includes(e.id_employe));

  const resetFilters = () => { setSearchTerm(""); setFilterRole(""); };

  const stages = [
    { key: "", label: "Tous", count: computedStats.total, tone: "all" },
    { key: "caissier",   label: "Caissiers",   count: computedStats.caissiers,   tone: "cash" },
    { key: "magasinier", label: "Magasiniers", count: computedStats.magasiniers, tone: "stock" },
    { key: "manager",    label: "Managers",    count: computedStats.managers,    tone: "manager" },
    { key: "admin",      label: "Admins",      count: computedStats.admins,      tone: "admin" },
  ];

  /* ============================================================
     FORMULAIRE
     ============================================================ */
  const openCreateModal = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError("");
    setShowPassword(false);
    setShowModal(true);
  };

  const openEditModal = (employe) => {
    const { country, local } = parsePhoneNumber(employe.telephone);
    setEditingId(employe.id_employe);
    setFormData({
      fullname: employe.fullname,
      countryCode: country,
      phoneLocal: local,
      password: "",
      roleName: employe.role_nom,
    });
    setFormError("");
    setShowPassword(false);
    setShowModal(true);
    setMenu(null);
  };

  const closeForm = () => {
    if (saving) return;
    setShowModal(false);
    setFormError("");
    setEditingId(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "phoneLocal") {
      setFormData((p) => ({ ...p, phoneLocal: value.replace(/[^\d\s\-]/g, "") }));
      return;
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const fullPhone = buildPhoneNumber(formData.countryCode, formData.phoneLocal);
      let res;
      if (editingId) {
        const payload = {
          fullname: formData.fullname,
          telephone: fullPhone,
          roleName: formData.roleName,
        };
        if (formData.password) payload.password = formData.password;
        res = await EmployeService.update(token, editingId, payload);
      } else {
        if (!/^\d{4}$/.test(formData.password)) {
          setFormError("Le mot de passe doit contenir exactement 4 chiffres");
          setSaving(false);
          return;
        }
        res = await EmployeService.create(token, {
          fullname: formData.fullname,
          telephone: fullPhone,
          password: formData.password,
          roleName: formData.roleName,
        });
      }
      if (res.success) {
        showNotification(editingId ? "Employé modifié" : "Employé créé", "success");
        setShowModal(false);
        setEditingId(null);
        handleRefresh();
      } else {
        setFormError(res.message || "Erreur");
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ============================================================
     DÉTAILS
     ============================================================ */
  const handleView = (employe) => {
    setDetailEmploye(employe);
    setShowDetailModal(true);
  };

  /* ============================================================
     ACTIONS
     ============================================================ */
  const handleToggle = (employe) => {
    setConfirm({ kind: "toggle", employe });
  };

  const handleDelete = (employe) => {
    setConfirm({ kind: "delete", employe });
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "toggle") {
        const r = await EmployeService.toggleActivation(token, confirm.employe.id_employe, !confirm.employe.actif);
        if (r.success) {
          await loadEmployes();
          await loadStats();
          showNotification(
            `${confirm.employe.fullname} ${confirm.employe.actif ? "désactivé" : "activé"}`,
            "success"
          );
        } else {
          showNotification(r.message || "Erreur lors du changement de statut", "error");
        }
      } else if (confirm.kind === "delete") {
        const r = await EmployeService.delete(token, confirm.employe.id_employe);
        if (r.success) {
          await loadEmployes();
          await loadStats();
          setSelectedIds((ids) => ids.filter((id) => id !== confirm.employe.id_employe));
          showNotification("Employé supprimé", "info");
        } else {
          showNotification(r.message || "Erreur lors de la suppression", "error");
        }
      }
    } catch (e) {
      console.error("❌ Confirm error:", e);
      showNotification(e.message || "Une erreur est survenue", "error");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const confirmProps = (() => {
    if (!confirm) return { title: "", message: "", confirmLabel: "Confirmer" };
    if (confirm.kind === "toggle")
      return {
        title: confirm.employe.actif ? "Désactiver cet employé ?" : "Activer cet employé ?",
        message: `${confirm.employe.fullname} ${confirm.employe.actif ? "ne pourra plus se connecter" : "pourra à nouveau se connecter"}.`,
        confirmLabel: confirm.employe.actif ? "Désactiver" : "Activer",
      };
    return {
      title: "Supprimer cet employé ?",
      message: `${confirm.employe.fullname} sera définitivement supprimé. Cette action est irréversible.`,
      confirmLabel: "Supprimer définitivement",
    };
  })();

  const handleExport = () => {
    if (!employes.length) return showNotification("Aucun employé à exporter", "warning");
    downloadCSV(
      ["ID", "Nom", "Slug", "Téléphone", "Rôle", "Magasin", "Statut", "Dernière connexion"],
      employes.map((e) => [
        e.id_employe,
        e.fullname,
        e.slug || "-",
        e.telephone || "-",
        ROLES_LABELS[e.role_nom] || e.role_nom,
        e.magasin_ville || `#${e.id_magasin || "-"}`,
        e.actif ? "Actif" : "Inactif",
        formatDate(e.derniere_connexion),
      ]),
      `employes_${getTodayISO()}.csv`
    );
    showNotification("Export terminé", "success");
  };

  const handleBulkExport = () => {
    const sel = employes.filter((e) => selectedIds.includes(e.id_employe));
    if (!sel.length) return;
    downloadCSV(
      ["ID", "Nom", "Téléphone", "Rôle", "Statut"],
      sel.map((e) => [
        e.id_employe,
        e.fullname,
        e.telephone || "-",
        ROLES_LABELS[e.role_nom] || e.role_nom,
        e.actif ? "Actif" : "Inactif",
      ]),
      `employes_selection_${getTodayISO()}.csv`
    );
    showNotification(`${sel.length} employé(s) exporté(s)`, "success");
  };

  const toggleSelect = (id) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const toggleSelectPage = () => {
    const ids = currentItems.map((e) => e.id_employe);
    setSelectedIds((cur) =>
      allPageSelected ? cur.filter((id) => !ids.includes(id)) : [...new Set([...cur, ...ids])]
    );
  };

  const openMenu = (e, employe) => {
    e.stopPropagation();
    const id = employe.id_employe;
    if (menu?.id === id) return setMenu(null);
    const r = e.currentTarget.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 260;
    setMenu({
      id,
      right: window.innerWidth - r.right,
      top: r.bottom + 6,
      bottom: window.innerHeight - r.top + 6,
      up,
    });
  };
  const menuEmploye = menu ? employes.find((e) => e.id_employe === menu.id) : null;

  const renderMore = (employe) => (
    <button
      className={`em-more ${menu?.id === employe.id_employe ? "is-open" : ""}`}
      data-em-more
      onClick={(e) => openMenu(e, employe)}
      aria-label={`Actions pour ${employe.fullname}`}
      aria-haspopup="menu"
    >
      <MoreVertical size={17} />
    </button>
  );

  /* ============================================================
     VUES
     ============================================================ */
  const renderEmpty = () => (
    <div className="em-empty">
      <span className="em-empty-icon"><Users size={30} /></span>
      {hasFilters ? (
        <>
          <h3>Aucun employé ne correspond</h3>
          <p>Modifiez la recherche ou retirez les filtres pour voir tous les employés.</p>
          <button className="em-btn em-btn--ghost" onClick={resetFilters}>Retirer les filtres</button>
        </>
      ) : (
        <>
          <h3>Aucun employé</h3>
          <p>Ajoutez votre premier employé pour lui donner accès à votre magasin.</p>
          {isAdmin && (
            <button className="em-btn em-btn--signal" onClick={openCreateModal}>
              <UserPlus size={17} /> Ajouter un employé
            </button>
          )}
        </>
      )}
    </div>
  );

  const renderTable = () => (
    <div className="em-tablewrap">
      <table className="em-table">
        <thead>
          <tr>
            <th className="em-col-check">
              <input type="checkbox" className="em-check" checked={allPageSelected} onChange={toggleSelectPage} aria-label="Tout sélectionner" />
            </th>
            <th>Employé</th>
            <th>Téléphone</th>
            <th>Rôle</th>
            <th>Magasin</th>
            <th>Statut</th>
            <th>Dernière connexion</th>
            <th className="em-col-act" />
          </tr>
        </thead>
        <tbody>
          {currentItems.map((e) => {
            const tone = e.role_nom || "other";
            const selected = selectedIds.includes(e.id_employe);
            return (
              <tr
                key={e.id_employe}
                className={`em-row em-tone-${tone} ${selected ? "is-selected" : ""}`}
                onClick={() => handleView(e)}
              >
                <td className="em-col-check" onClick={(ev) => ev.stopPropagation()}>
                  <input type="checkbox" className="em-check" checked={selected} onChange={() => toggleSelect(e.id_employe)} aria-label={`Sélectionner ${e.fullname}`} />
                </td>
                <td>
                  <div className="em-emp-cell">
                    <span className="em-avatar">{e.fullname?.charAt(0).toUpperCase() || "?"}</span>
                    <div>
                      <div className="em-name">{e.fullname}</div>
                      <div className="em-slug">@{e.slug}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="em-tel"><Phone size={14} /> {e.telephone || "—"}</span>
                </td>
                <td><RoleTag role={e.role_nom} /></td>
                <td>
                  <span className="em-store">
                    <Store size={14} /> {e.magasin_ville || `#${e.id_magasin || "—"}`}
                  </span>
                </td>
                <td><StatusTag actif={e.actif} /></td>
                <td className="em-muted">{formatDate(e.derniere_connexion)}</td>
                <td className="em-col-act" onClick={(ev) => ev.stopPropagation()}>
                  {renderMore(e)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderGrid = () => (
    <div className="em-grid">
      {currentItems.map((e) => {
        const tone = e.role_nom || "other";
        const selected = selectedIds.includes(e.id_employe);
        return (
          <article key={e.id_employe} className={`em-ticket em-tone-${tone} ${selected ? "is-selected" : ""}`}>
            <div className="em-ticket-top" onClick={() => handleView(e)}>
              <div className="em-ticket-head">
                <input
                  type="checkbox"
                  className="em-check"
                  checked={selected}
                  onClick={(ev) => ev.stopPropagation()}
                  onChange={() => toggleSelect(e.id_employe)}
                  aria-label={`Sélectionner ${e.fullname}`}
                />
                <span className="em-avatar em-avatar--sm">{e.fullname?.charAt(0).toUpperCase() || "?"}</span>
                <span className="em-ticket-more" onClick={(ev) => ev.stopPropagation()}>{renderMore(e)}</span>
              </div>
              <p className="em-ticket-name">{e.fullname}</p>
              <p className="em-ticket-meta">
                <span><Phone size={13} /> {e.telephone || "—"}</span>
                <span><Store size={13} /> {e.magasin_ville || `#${e.id_magasin || "—"}`}</span>
              </p>
            </div>
            <div className="em-ticket-foot" onClick={() => handleView(e)}>
              <RoleTag role={e.role_nom} />
              <StatusTag actif={e.actif} />
            </div>
          </article>
        );
      })}
    </div>
  );

  const gaugeFilled = Math.round(computedStats.tauxActivite / 10);
  const currentCountry = COUNTRIES.find((c) => c.code === formData.countryCode);

  /* ============================================================
     RENDU
     ============================================================ */
  return (
    <div className="em-root">
      {notification && (
        <div className={`em-toast em-toast--${notification.type}`} role="status" aria-live="polite">
          {notification.type === "success" && <CheckCircle size={18} />}
          {notification.type === "error" && <AlertCircle size={18} />}
          {notification.type === "warning" && <AlertTriangle size={18} />}
          {notification.type === "info" && <AlertCircle size={18} />}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} aria-label="Fermer"><X size={15} /></button>
        </div>
      )}

      {/* ---------- En-tête ---------- */}
      <header className="em-head">
        <div className="em-head-id">
          <span className="em-head-mark"><Users size={23} /></span>
          <div>
            <h1>Employés</h1>
            <p>Gérez les comptes et permissions de votre équipe</p>
          </div>
        </div>
        <div className="em-head-actions">
          <button className="em-btn em-btn--ghost em-btn--icon" onClick={handleRefresh} disabled={loading} title="Actualiser" aria-label="Actualiser">
            <RefreshCw size={17} className={loading ? "em-spin" : ""} />
          </button>
          <button className="em-btn em-btn--ghost" onClick={handleExport}><Download size={17} /> Exporter</button>
          {isAdmin && (
            <button className="em-btn em-btn--signal" onClick={openCreateModal}><UserPlus size={18} /> Ajouter un employé</button>
          )}
        </div>
      </header>

      {/* ---------- Registre ---------- */}
      <section className="em-ledger" aria-label="Synthèse de l'équipe">
        <div className="em-ledger-cell em-ledger-main">
          <span className="em-ledger-label">Effectif total</span>
          <strong className="em-ledger-figure">{computedStats.total}<small>membre{computedStats.total > 1 ? "s" : ""}</small></strong>
          <span className="em-ledger-sub">{computedStats.actifs} actif{computedStats.actifs > 1 ? "s" : ""} · {computedStats.inactifs} inactif{computedStats.inactifs > 1 ? "s" : ""}</span>
        </div>
        <div className="em-ledger-cell">
          <span className="em-ledger-label">Caissiers</span>
          <strong className="em-ledger-mid">{computedStats.caissiers}<small>poste{computedStats.caissiers > 1 ? "s" : ""}</small></strong>
          <span className="em-ledger-sub">Ventes & encaissements</span>
        </div>
        <div className="em-ledger-cell">
          <span className="em-ledger-label">Magasiniers</span>
          <strong className="em-ledger-mid">{computedStats.magasiniers}<small>poste{computedStats.magasiniers > 1 ? "s" : ""}</small></strong>
          <span className="em-ledger-sub">Stocks & inventaires</span>
        </div>
        <div className="em-ledger-cell em-ledger-rate">
          <span className="em-ledger-label">Taux d'activité</span>
          <strong className="em-ledger-mid">{computedStats.tauxActivite}<small>%</small></strong>
          <div className="em-gauge" role="img" aria-label={`${computedStats.tauxActivite}% des employés sont actifs`}>
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} className={i < gaugeFilled ? "on" : ""} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Pipeline ---------- */}
      <nav className="em-pipeline" aria-label="Filtrer par rôle">
        {stages.map((s) => (
          <button
            key={s.key || "all"}
            className={`em-stage em-stage--${s.tone} ${filterRole === s.key ? "is-active" : ""}`}
            onClick={() => setFilterRole(filterRole === s.key ? "" : s.key)}
            aria-pressed={filterRole === s.key}
          >
            <span className="em-stage-count">{s.count}</span>
            <span className="em-stage-label">{s.label}</span>
          </button>
        ))}
      </nav>

      {/* ---------- Barre d'outils ---------- */}
      <div className="em-toolbar">
        <div className="em-search">
          <Search size={17} className="em-search-icon" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone ou identifiant"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Rechercher un employé"
          />
          {searchTerm && (
            <button className="em-search-clear" onClick={() => setSearchTerm("")} aria-label="Effacer la recherche"><X size={15} /></button>
          )}
        </div>
        <select className="em-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Trier par">
          <option value="name_asc">Nom (A–Z)</option>
          <option value="name_desc">Nom (Z–A)</option>
          <option value="date_desc">Plus récents</option>
          <option value="date_asc">Plus anciens</option>
          <option value="role">Rôle</option>
        </select>
        <div className="em-seg" role="group" aria-label="Mode d'affichage">
          <button className={viewMode === "list" ? "is-on" : ""} onClick={() => setViewMode("list")} title="Vue liste" aria-pressed={viewMode === "list"}><List size={17} /></button>
          <button className={viewMode === "grid" ? "is-on" : ""} onClick={() => setViewMode("grid")} title="Vue cartes" aria-pressed={viewMode === "grid"}><Grid size={17} /></button>
        </div>
      </div>

      {/* ---------- Contenu ---------- */}
      {loading && employes.length === 0 ? (
        <div className="em-state"><span className="em-loader" /><p>Chargement des employés…</p></div>
      ) : loadError && employes.length === 0 ? (
        <div className="em-state em-state--error">
          <AlertCircle size={26} />
          <p>{loadError}</p>
          <button className="em-btn em-btn--dark" onClick={handleRefresh}>Réessayer</button>
        </div>
      ) : (
        <div className={loading ? "em-content is-loading" : "em-content"}>
          <div className="em-count">
            {sortedEmployes.length} employé{sortedEmployes.length > 1 ? "s" : ""}
            {hasFilters && <button className="em-linkbtn" onClick={resetFilters}>Retirer les filtres</button>}
          </div>
          {currentItems.length === 0 ? renderEmpty() : viewMode === "grid" ? renderGrid() : renderTable()}

          {sortedEmployes.length > ITEMS_PER_PAGE && (
            <div className="em-pager">
              <span className="em-pager-info">
                {firstIdx + 1}–{Math.min(firstIdx + ITEMS_PER_PAGE, sortedEmployes.length)} sur {sortedEmployes.length}
              </span>
              <div className="em-pager-ctrl">
                <button onClick={() => setCurrentPage(Math.max(page - 1, 1))} disabled={page === 1} aria-label="Page précédente"><ChevronLeft size={17} /></button>
                <span>Page {page} / {totalPages}</span>
                <button onClick={() => setCurrentPage(Math.min(page + 1, totalPages))} disabled={page === totalPages} aria-label="Page suivante"><ChevronRight size={17} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------- Barre de sélection ---------- */}
      {selectedIds.length > 0 && (
        <div className="em-bulk" role="region" aria-label="Actions sur la sélection">
          <strong>{selectedIds.length}</strong> sélectionné{selectedIds.length > 1 ? "s" : ""}
          <button className="em-bulk-btn" onClick={handleBulkExport}><Download size={15} /> Exporter</button>
          <button className="em-bulk-close" onClick={() => setSelectedIds([])} aria-label="Désélectionner"><X size={16} /></button>
        </div>
      )}

      <ActionsMenu
        menu={menu}
        employe={menuEmploye}
        isAdmin={isAdmin}
        onClose={() => setMenu(null)}
        onView={handleView}
        onEdit={openEditModal}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />

      {/* ============================================================
          MODAL : CRÉATION / ÉDITION
          ============================================================ */}
      {showModal && (
        <div className="em-overlay" role="dialog" aria-modal="true" aria-label="Formulaire employé">
          <div className="em-sheet">
            <header className="em-sheet-head">
              <div className="em-sheet-title">
                <span className="em-sheet-mark"><UserPlus size={21} /></span>
                <div>
                  <h2>{editingId ? "Modifier l'employé" : "Nouvel employé"}</h2>
                  <p>{editingId ? "Mettez à jour les informations du compte" : "Créez un compte pour un membre de votre équipe"}</p>
                </div>
              </div>
              <button className="em-sheet-close" onClick={closeForm} aria-label="Fermer"><X size={20} /></button>
            </header>

            <form onSubmit={handleSubmit} className="em-sheet-body">
              <div className="em-sheet-main">
                {formError && (
                  <div className="em-alert" role="alert"><AlertCircle size={16} />{formError}</div>
                )}

                {/* Nom */}
                <div className="em-field">
                  <label htmlFor="fullname">Nom complet *</label>
                  <div className="em-input-wrap">
                    <User size={16} className="em-input-icon" />
                    <input
                      type="text"
                      id="fullname"
                      name="fullname"
                      className="em-input"
                      placeholder="Ex : Jean Kouassi"
                      value={formData.fullname}
                      onChange={handleFormChange}
                      disabled={saving}
                      required
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* Téléphone */}
                <div className="em-field">
                  <label htmlFor="phoneLocal">Téléphone *</label>
                  <div className="em-phone-wrap">
                    <CountrySelect
                      value={formData.countryCode}
                      onChange={(code) => setFormData((p) => ({ ...p, countryCode: code }))}
                      disabled={saving}
                    />
                    <input
                      type="tel"
                      id="phoneLocal"
                      name="phoneLocal"
                      placeholder={currentCountry?.example || "01 40 01 03 85"}
                      value={formData.phoneLocal}
                      onChange={handleFormChange}
                      disabled={saving}
                      maxLength={20}
                      className="em-phone-input"
                      required
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* Mot de passe */}
                <div className="em-field">
                  <label htmlFor="password">
                    Mot de passe {editingId ? <span className="em-muted">(laisser vide pour ne pas changer)</span> : "*"}
                  </label>
                  <div className="em-input-wrap">
                    <Lock size={16} className="em-input-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      className="em-input"
                      placeholder="4 chiffres"
                      maxLength="4"
                      value={formData.password}
                      onChange={handleFormChange}
                      disabled={saving}
                      required={!editingId}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="em-pwd-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                      aria-label={showPassword ? "Masquer" : "Afficher"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Rôle */}
                <div className="em-field">
                  <span className="em-field-label">Rôle *</span>
                  <div className="em-roles">
                    {ROLES_DISPONIBLES.map((r) => (
                      <label
                        key={r.value}
                        className={`em-role ${formData.roleName === r.value ? "is-selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="roleName"
                          value={r.value}
                          checked={formData.roleName === r.value}
                          onChange={handleFormChange}
                          disabled={saving}
                        />
                        <div className="em-role-content">
                          <span className="em-role-title">{r.label}</span>
                          <span className="em-role-desc">{r.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <footer className="em-sheet-foot">
                <button type="button" className="em-btn em-btn--ghost" onClick={closeForm} disabled={saving}>
                  Annuler
                </button>
                <button type="submit" className="em-btn em-btn--signal" disabled={saving}>
                  {saving ? (<><Loader size={16} className="em-spin" /> Enregistrement…</>) : (<><Check size={17} /> {editingId ? "Mettre à jour" : "Créer l'employé"}</>)}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL : DÉTAILS
          ============================================================ */}
      {showDetailModal && detailEmploye && (
        <div className="em-overlay" onClick={() => setShowDetailModal(false)} role="dialog" aria-modal="true" aria-label="Détails employé">
          <div className="em-detail" onClick={(e) => e.stopPropagation()}>
            <header className="em-sheet-head">
              <div className="em-sheet-title">
                <span className="em-avatar em-avatar--lg">{detailEmploye.fullname?.charAt(0).toUpperCase() || "?"}</span>
                <div>
                  <h2>{detailEmploye.fullname}</h2>
                  <p><Hash size={13} /> #{detailEmploye.id_employe}</p>
                </div>
              </div>
              <div className="em-detail-status">
                <RoleTag role={detailEmploye.role_nom} />
                <StatusTag actif={detailEmploye.actif} />
                <button className="em-sheet-close" onClick={() => setShowDetailModal(false)} aria-label="Fermer"><X size={20} /></button>
              </div>
            </header>

            <div className="em-detail-body">
              <div className="em-detail-cols">
                <section>
                  <h4><Phone size={15} /> Contact</h4>
                  <dl>
                    <div><dt>Téléphone</dt><dd>{detailEmploye.telephone || "-"}</dd></div>
                    <div><dt>Identifiant</dt><dd>@{detailEmploye.slug || "-"}</dd></div>
                  </dl>
                </section>
                <section>
                  <h4><Briefcase size={15} /> Affectation</h4>
                  <dl>
                    <div><dt>Rôle</dt><dd>{ROLES_LABELS[detailEmploye.role_nom] || detailEmploye.role_nom}</dd></div>
                    <div><dt>Magasin</dt><dd>{detailEmploye.magasin_ville || `Magasin #${detailEmploye.id_magasin || "-"}`}</dd></div>
                  </dl>
                </section>
              </div>

              <div className="em-detail-cols" style={{ marginTop: 22 }}>
                <section>
                  <h4><Calendar size={15} /> Historique</h4>
                  <dl>
                    <div><dt>Date de création</dt><dd>{formatDate(detailEmploye.date_creation)}</dd></div>
                    <div><dt>Dernière connexion</dt><dd>{formatDateTime(detailEmploye.derniere_connexion)}</dd></div>
                  </dl>
                </section>
              </div>
            </div>

            <div className="em-sheet-foot">
              <button className="em-btn em-btn--ghost" onClick={() => setShowDetailModal(false)}>Fermer</button>
              {isAdmin && (
                <button className="em-btn em-btn--signal" onClick={() => { setShowDetailModal(false); openEditModal(detailEmploye); }}>
                  <Edit3 size={16} /> Modifier
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => !busy && setConfirm(null)}
        onConfirm={runConfirm}
        title={confirmProps.title}
        message={confirmProps.message}
        type="danger"
        confirmLabel={confirmProps.confirmLabel}
        cancelLabel="Annuler"
        loading={busy}
      />
    </div>
  );
};

export default Employes;