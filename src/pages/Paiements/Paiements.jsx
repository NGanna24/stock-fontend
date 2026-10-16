// pages/Paiements/Paiements.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Search, Eye, ChevronLeft, ChevronRight, Download, X, Check,
  RefreshCw, Grid, List, Wallet, Banknote, Calendar, AlertCircle,
  CheckCircle, Ban, FileText, Building, ChevronDown, Loader, MoreVertical,
  AlertTriangle, Coins, CreditCard, TrendingUp, Receipt, Printer
} from "lucide-react";
import PaiementService from "../../services/paiementService";
import { useUser } from "../../context/AuthContext";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import "./Paiements.css";

/* ============================================================
   CONSTANTES & UTILITAIRES
   ============================================================ */
const MODES = {
  especes: { label: "Espèces", plural: "Espèces", tone: "cash", icon: Coins },
  carte: { label: "Carte bancaire", plural: "Cartes", tone: "card", icon: CreditCard },
  virement: { label: "Virement", plural: "Virements", tone: "transfer", icon: Building },
  cheque: { label: "Chèque", plural: "Chèques", tone: "check", icon: FileText },
  autre: { label: "Autre", plural: "Autres", tone: "other", icon: Wallet },
};

const PERIODES = [
  { value: "all", label: "Toutes les périodes" },
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
];

const EMPTY_STATS = {
  total_paiements: 0,
  total_montant: 0,
  especes: 0,
  carte: 0,
  virement: 0,
  cheque: 0,
  autre: 0,
  paiements_aujourdhui: 0,
  montant_aujourdhui: 0,
};

const formatMontant = (value) => {
  if (value === undefined || value === null || isNaN(value)) return "0 FCFA";
  const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  if (isNaN(num)) return "0 FCFA";
  return Math.round(num).toLocaleString("fr-FR") + " FCFA";
};
const formatNombre = (n) => Math.round(n || 0).toLocaleString("fr-FR");
const formatDate = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  return isNaN(date) ? "-" : date.toLocaleDateString("fr-FR");
};
const num = (v) => parseFloat(v) || 0;
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

/* ============================================================
   PETITS COMPOSANTS
   ============================================================ */
const ModeTag = ({ mode }) => {
  const cfg = MODES[mode] || MODES.autre;
  return (
    <span className={`pm-tag pm-tag--${cfg.tone}`}>
      <i className="pm-tag-dot" />
      {cfg.label}
    </span>
  );
};

const Combobox = ({
  icon: Icon, value, onChange, items, getKey, selectedKey, renderItem, onSelect,
  placeholder, emptyText, disabled, inputRef, name,
}) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => { setActive(0); }, [value, items.length]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (item) => { onSelect(item); setOpen(false); };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && items[active]) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="pm-combo" ref={wrapRef}>
      <Icon size={16} className="pm-combo-icon" />
      <input
        ref={inputRef}
        name={name}
        type="text"
        className="pm-combo-input"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
      />
      <button
        type="button"
        className="pm-combo-arrow"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label="Afficher la liste"
      >
        <ChevronDown size={16} />
      </button>
      {open && !disabled && (
        <div className="pm-combo-pop">
          {items.length === 0 ? (
            <div className="pm-combo-empty">{emptyText}</div>
          ) : (
            <div className="pm-combo-list" ref={listRef} role="listbox">
              {items.map((it, i) => (
                <div
                  key={getKey(it)}
                  role="option"
                  aria-selected={getKey(it) === selectedKey}
                  className={`pm-combo-item ${i === active ? "is-active" : ""} ${getKey(it) === selectedKey ? "is-selected" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(it)}
                >
                  {renderItem(it)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ActionsMenu = ({ menu, paiement, canManage, isAdmin, onView, onPrint, onDelete, onClose }) => {
  if (!menu || !paiement) return null;
  const style = { right: menu.right, ...(menu.up ? { bottom: menu.bottom } : { top: menu.top }) };
  const run = (fn) => () => { onClose(); fn(paiement); };
  return createPortal(
    <div className="pm-menu" data-pm-menu style={style} role="menu">
      <button className="pm-menu-item" onClick={run(onView)} role="menuitem">
        <Eye size={15} /> Voir les détails
      </button>
      <button className="pm-menu-item" onClick={run(onPrint)} role="menuitem">
        <Printer size={15} /> Imprimer le reçu
      </button>
      {isAdmin && (
        <>
          <div className="pm-menu-sep" />
          <button className="pm-menu-item pm-menu-item--danger" onClick={run(onDelete)} role="menuitem">
            <Ban size={15} /> Supprimer
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
const Paiements = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem("token");

  // ---------- Données ----------
  const [paiements, setPaiements] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // ---------- Liste ----------
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [viewMode, setViewMode] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 720 ? "grid" : "list"
  );
  const [filterMode, setFilterMode] = useState("");
  const [filterPeriode, setFilterPeriode] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [selectedIds, setSelectedIds] = useState([]);
  const [notification, setNotification] = useState(null);
  const notifTimer = useRef(null);
  const [menu, setMenu] = useState(null);

  // ---------- Modals ----------
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [selectedPaiement, setSelectedPaiement] = useState(null);
  const [busy, setBusy] = useState(false);

  const canManage = !!user && ["admin", "manager", "caissier"].includes(user.role);
  const isAdmin = !!user && user.role === "admin";

  /* ---------- Chargement ---------- */
  const loadPaiements = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await PaiementService.getAllPaiements(token);
      if (response.success) setPaiements(response.data || []);
      else setLoadError(response.message || "Impossible de charger les paiements");
    } catch (e) {
      console.error("❌ LoadPaiements error:", e);
      setLoadError(e.message || "Impossible de charger les paiements");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await PaiementService.getStats(token);
      if (response.success && response.data) {
        setStats({ ...EMPTY_STATS, ...response.data });
      }
    } catch (e) {
      console.error("❌ LoadStats error:", e);
    }
  };

  useEffect(() => {
    if (!(isAuthenticated && token)) return;
    loadPaiements();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  /* ---------- Menu d'actions : fermeture ---------- */
  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu(null);
    const onDown = (e) => {
      if (!e.target.closest("[data-pm-menu],[data-pm-more]")) close();
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
      else if (showDetailModal && !loadingDetails) setShowDetailModal(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu, showDetailModal, loadingDetails]);

  useEffect(() => {
    document.body.style.overflow = showDetailModal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showDetailModal]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterMode, filterPeriode, sortBy]);

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
    const total = paiements.length;
    const totalMontant = paiements.reduce((s, p) => s + num(p.montant), 0);
    const todayISO = getTodayISO();
    const todayList = paiements.filter((p) => {
      const d = p.date_paiement ? new Date(p.date_paiement) : null;
      return d && d.toISOString().split("T")[0] === todayISO;
    });
    const montantJour = todayList.reduce((s, p) => s + num(p.montant), 0);
    const sumByMode = (m) =>
      paiements.filter((p) => p.mode_paiement === m).reduce((s, p) => s + num(p.montant), 0);
    const montantMoyen = total ? Math.round(totalMontant / total) : 0;
    const tauxEspeces = totalMontant
      ? Math.round((sumByMode("especes") / totalMontant) * 100)
      : 0;
    return {
      total,
      totalMontant,
      today: todayList.length,
      montantJour,
      especes: sumByMode("especes"),
      carte: sumByMode("carte"),
      virement: sumByMode("virement"),
      cheque: sumByMode("cheque"),
      autre: sumByMode("autre"),
      montantMoyen,
      tauxEspeces,
      parMode: {
        especes: paiements.filter((p) => p.mode_paiement === "especes").length,
        carte: paiements.filter((p) => p.mode_paiement === "carte").length,
        virement: paiements.filter((p) => p.mode_paiement === "virement").length,
        cheque: paiements.filter((p) => p.mode_paiement === "cheque").length,
        autre: paiements.filter((p) => p.mode_paiement === "autre").length,
      },
    };
  }, [paiements]);

  const sortedPaiements = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const list = paiements.filter((p) => {
      const matchSearch =
        !q ||
        String(p.id_paiement || "").includes(q) ||
        p.nomclient?.toLowerCase().includes(q) ||
        p.telephone?.toLowerCase().includes(q) ||
        p.numero_commande?.toLowerCase().includes(q) ||
        p.numero_facture?.toLowerCase().includes(q) ||
        p.reference?.toLowerCase().includes(q) ||
        p.note?.toLowerCase().includes(q);

      const matchMode = filterMode ? p.mode_paiement === filterMode : true;

      let matchPeriode = true;
      if (filterPeriode !== "all") {
        const d = new Date(p.date_paiement);
        if (filterPeriode === "today") matchPeriode = d.toDateString() === today.toDateString();
        else if (filterPeriode === "week") matchPeriode = d >= startOfWeek;
        else if (filterPeriode === "month") matchPeriode = d >= startOfMonth;
      }
      return matchSearch && matchMode && matchPeriode;
    });

    const byDate = (a, b) => new Date(a.date_paiement) - new Date(b.date_paiement);
    const sorters = {
      date_desc: (a, b) => byDate(b, a),
      date_asc: byDate,
      montant_desc: (a, b) => num(b.montant) - num(a.montant),
      montant_asc: (a, b) => num(a.montant) - num(b.montant),
      client: (a, b) => (a.nomclient || "").localeCompare(b.nomclient || ""),
    };
    return [...list].sort(sorters[sortBy] || sorters.date_desc);
  }, [paiements, searchTerm, filterMode, filterPeriode, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedPaiements.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const firstIdx = (page - 1) * itemsPerPage;
  const currentItems = sortedPaiements.slice(firstIdx, firstIdx + itemsPerPage);
  const hasFilters = !!searchTerm || !!filterMode || filterPeriode !== "all";
  const allPageSelected = currentItems.length > 0 && currentItems.every((p) => selectedIds.includes(p.id_paiement));

  const resetFilters = () => { setSearchTerm(""); setFilterMode(""); setFilterPeriode("all"); };

  const stages = [
    { key: "", label: "Tous", count: computedStats.total, tone: "all" },
    ...Object.keys(MODES).map((k) => ({
      key: k,
      label: MODES[k].plural,
      count: computedStats.parMode[k],
      tone: MODES[k].tone,
    })),
  ];

  /* ============================================================
     ACTIONS
     ============================================================ */
  const handleView = async (paiement) => {
    setSelectedPaiement(paiement);
    setShowDetailModal(true);
    setLoadingDetails(true);
    try {
      if (PaiementService.getPaiementById) {
        const res = await PaiementService.getPaiementById(token, paiement.id_paiement);
        if (res.success && res.data) setSelectedPaiement(res.data);
      }
    } catch (e) {
      console.error("❌ Détails paiement :", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePrint = (paiement) => {
    showNotification(`Impression du reçu #${paiement.id_paiement}`, "info");
    // Le service d'impression peut être branché ici
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "delete") {
        const r = await PaiementService.deletePaiement
          ? await PaiementService.deletePaiement(token, confirm.paiement.id_paiement)
          : { success: false, message: "Suppression non supportée" };
        if (r.success) {
          await loadPaiements();
          await loadStats();
          setSelectedIds((ids) => ids.filter((id) => id !== confirm.paiement.id_paiement));
          showNotification("Paiement supprimé", "info");
        } else {
          showNotification(r.message || "Erreur lors de la suppression", "error");
        }
      } else if (confirm.kind === "bulk") {
        let ok = 0;
        let ko = 0;
        for (const id of selectedIds) {
          try {
            const r = await PaiementService.deletePaiement(token, id);
            if (r.success) ok++; else ko++;
          } catch (e) { console.error("❌ Erreur suppression #", id, e); ko++; }
        }
        await loadPaiements();
        await loadStats();
        setSelectedIds([]);
        showNotification(
          ko === 0 ? `${ok} paiement(s) supprimé(s)` : `${ok} supprimé(s), ${ko} en erreur`,
          ko === 0 ? "success" : "warning"
        );
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
    if (confirm.kind === "delete")
      return {
        title: "Supprimer ce paiement ?",
        message: `Le paiement #${confirm.paiement.id_paiement} (${confirm.paiement.nomclient || "client inconnu"}) sera définitivement supprimé. Cette action est irréversible.`,
        confirmLabel: "Supprimer définitivement",
      };
    return {
      title: `Supprimer ${selectedIds.length} paiement(s) ?`,
      message: "Cette action est irréversible. Tous les paiements sélectionnés seront définitivement supprimés.",
      confirmLabel: "Supprimer définitivement",
    };
  })();

  const handleExport = async () => {
    try {
      const response = await PaiementService.exportPaiements(token);
      if (response.success && response.data) {
        downloadCSV(
          ["ID", "Date", "Client", "Téléphone", "Commande", "Facture", "Montant", "Mode", "Référence", "Notes", "Utilisateur"],
          response.data.map((p) => [
            p.id, p.date, p.client, p.telephone, p.commande, p.facture,
            formatMontant(p.montant), MODES[p.mode]?.label || p.mode,
            p.reference, p.note, p.utilisateur,
          ]),
          `paiements_${getTodayISO()}.csv`
        );
        showNotification("Export terminé", "success");
      } else {
        showNotification(response.message || "Export impossible", "error");
      }
    } catch (e) {
      console.error("❌ Export error:", e);
      showNotification("Erreur lors de l'export", "error");
    }
  };

  const handleBulkExport = () => {
    const sel = paiements.filter((p) => selectedIds.includes(p.id_paiement));
    if (!sel.length) return;
    downloadCSV(
      ["ID", "Date", "Client", "Téléphone", "Commande", "Facture", "Montant", "Mode"],
      sel.map((p) => [
        p.id_paiement,
        formatDate(p.date_paiement),
        p.nomclient || "-",
        p.telephone || "-",
        p.numero_commande || "-",
        p.numero_facture || "-",
        formatMontant(p.montant),
        MODES[p.mode_paiement]?.label || p.mode_paiement,
      ]),
      `paiements_selection_${getTodayISO()}.csv`
    );
    showNotification(`${sel.length} paiement(s) exporté(s)`, "success");
  };

  const toggleSelect = (id) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const toggleSelectPage = () => {
    const ids = currentItems.map((p) => p.id_paiement);
    setSelectedIds((cur) => (allPageSelected ? cur.filter((id) => !ids.includes(id)) : [...new Set([...cur, ...ids])]));
  };

  const openMenu = (e, paiement) => {
    e.stopPropagation();
    const id = paiement.id_paiement;
    if (menu?.id === id) return setMenu(null);
    const r = e.currentTarget.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 220;
    setMenu({ id, right: window.innerWidth - r.right, top: r.bottom + 6, bottom: window.innerHeight - r.top + 6, up });
  };
  const menuPaiement = menu ? paiements.find((p) => p.id_paiement === menu.id) : null;

  const renderMore = (paiement) => (
    <button
      className={`pm-more ${menu?.id === paiement.id_paiement ? "is-open" : ""}`}
      data-pm-more
      onClick={(e) => openMenu(e, paiement)}
      aria-label={`Actions pour le paiement #${paiement.id_paiement}`}
      aria-haspopup="menu"
    >
      <MoreVertical size={17} />
    </button>
  );

  /* ============================================================
     VUES
     ============================================================ */
  const renderEmpty = () => (
    <div className="pm-empty">
      <span className="pm-empty-icon"><Wallet size={30} /></span>
      {hasFilters ? (
        <>
          <h3>Aucun paiement ne correspond</h3>
          <p>Modifiez la recherche ou retirez les filtres pour voir tous les paiements.</p>
          <button className="pm-btn pm-btn--ghost" onClick={resetFilters}>Retirer les filtres</button>
        </>
      ) : (
        <>
          <h3>Aucun paiement enregistré</h3>
          <p>Les paiements apparaîtront ici dès qu'une vente sera encaissée.</p>
        </>
      )}
    </div>
  );

  const renderTable = () => (
    <div className="pm-tablewrap">
      <table className="pm-table">
        <thead>
          <tr>
            <th className="pm-col-check">
              <input type="checkbox" className="pm-check" checked={allPageSelected} onChange={toggleSelectPage} aria-label="Tout sélectionner" />
            </th>
            <th>Référence</th>
            <th>Date</th>
            <th>Client</th>
            <th>Commande</th>
            <th>Facture</th>
            <th className="pm-num">Montant</th>
            <th>Mode</th>
            <th className="pm-col-act" />
          </tr>
        </thead>
        <tbody>
          {currentItems.map((p) => {
            const tone = (MODES[p.mode_paiement] || MODES.autre).tone;
            const selected = selectedIds.includes(p.id_paiement);
            return (
              <tr
                key={p.id_paiement}
                className={`pm-row pm-tone-${tone} ${selected ? "is-selected" : ""}`}
                onClick={() => handleView(p)}
              >
                <td className="pm-col-check" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" className="pm-check" checked={selected} onChange={() => toggleSelect(p.id_paiement)} aria-label={`Sélectionner paiement #${p.id_paiement}`} />
                </td>
                <td><span className="pm-ref">#{p.id_paiement}</span></td>
                <td className="pm-muted">{p.date_paiement_formatee || formatDate(p.date_paiement)}</td>
                <td>
                  <span className="pm-client">
                    <Wallet size={14} />
                    {p.nomclient || "—"}
                  </span>
                </td>
                <td className="pm-muted">{p.numero_commande || "—"}</td>
                <td className="pm-muted">{p.numero_facture || "—"}</td>
                <td className="pm-num pm-amount">{formatMontant(p.montant)}</td>
                <td><ModeTag mode={p.mode_paiement} /></td>
                <td className="pm-col-act" onClick={(e) => e.stopPropagation()}>
                  {renderMore(p)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderGrid = () => (
    <div className="pm-grid">
      {currentItems.map((p) => {
        const tone = (MODES[p.mode_paiement] || MODES.autre).tone;
        const selected = selectedIds.includes(p.id_paiement);
        return (
          <article key={p.id_paiement} className={`pm-ticket pm-tone-${tone} ${selected ? "is-selected" : ""}`}>
            <div className="pm-ticket-top" onClick={() => handleView(p)}>
              <div className="pm-ticket-head">
                <input
                  type="checkbox"
                  className="pm-check"
                  checked={selected}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelect(p.id_paiement)}
                  aria-label={`Sélectionner paiement #${p.id_paiement}`}
                />
                <span className="pm-ref">#{p.id_paiement}</span>
                <span className="pm-ticket-more" onClick={(e) => e.stopPropagation()}>{renderMore(p)}</span>
              </div>
              <p className="pm-ticket-client">
                <Wallet size={15} />
                {p.nomclient || "—"}
              </p>
              <p className="pm-ticket-meta">
                <span><Calendar size={13} /> {p.date_paiement_formatee || formatDate(p.date_paiement)}</span>
                {p.numero_commande && <span><Receipt size={13} /> {p.numero_commande}</span>}
              </p>
            </div>
            <div className="pm-ticket-foot" onClick={() => handleView(p)}>
              <strong className="pm-ticket-amount">{formatMontant(p.montant)}</strong>
              <ModeTag mode={p.mode_paiement} />
            </div>
          </article>
        );
      })}
    </div>
  );

  const gaugeFilled = Math.round(computedStats.tauxEspeces / 10);

  /* ============================================================
     RENDU
     ============================================================ */
  return (
    <div className="pm-root">
      {notification && (
        <div className={`pm-toast pm-toast--${notification.type}`} role="status" aria-live="polite">
          {notification.type === "success" && <CheckCircle size={18} />}
          {notification.type === "error" && <AlertCircle size={18} />}
          {notification.type === "warning" && <AlertTriangle size={18} />}
          {notification.type === "info" && <AlertCircle size={18} />}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} aria-label="Fermer"><X size={15} /></button>
        </div>
      )}

      {/* ---------- En-tête ---------- */}
      <header className="pm-head">
        <div className="pm-head-id">
          <span className="pm-head-mark"><Wallet size={23} /></span>
          <div>
            <h1>Paiements</h1>
            <p>Suivi des encaissements et règlements clients</p>
          </div>
        </div>
        <div className="pm-head-actions">
          <button className="pm-btn pm-btn--ghost pm-btn--icon" onClick={() => { loadPaiements(); loadStats(); }} disabled={loading} title="Actualiser" aria-label="Actualiser">
            <RefreshCw size={17} className={loading ? "pm-spin" : ""} />
          </button>
          <button className="pm-btn pm-btn--ghost" onClick={handleExport}><Download size={17} /> Exporter</button>
        </div>
      </header>

      {/* ---------- Registre ---------- */}
      <section className="pm-ledger" aria-label="Synthèse des paiements">
        <div className="pm-ledger-cell pm-ledger-main">
          <span className="pm-ledger-label">Montant total encaissé</span>
          <strong className="pm-ledger-figure">{formatNombre(computedStats.totalMontant)}<small>FCFA</small></strong>
          <span className="pm-ledger-sub">sur {computedStats.total} paiement{computedStats.total > 1 ? "s" : ""}</span>
        </div>
        <div className="pm-ledger-cell">
          <span className="pm-ledger-label">Encaissé aujourd'hui</span>
          <strong className="pm-ledger-mid">
            {computedStats.montantJour > 0 ? formatNombre(computedStats.montantJour) : "—"}
            <small>{computedStats.montantJour > 0 ? "FCFA" : ""}</small>
          </strong>
          <span className="pm-ledger-sub">{computedStats.today} paiement{computedStats.today > 1 ? "s" : ""}</span>
        </div>
        <div className="pm-ledger-cell">
          <span className="pm-ledger-label">Panier moyen</span>
          <strong className="pm-ledger-mid">
            {computedStats.montantMoyen > 0 ? formatNombre(computedStats.montantMoyen) : "—"}
            <small>{computedStats.montantMoyen > 0 ? "FCFA" : ""}</small>
          </strong>
          <span className="pm-ledger-sub">par encaissement</span>
        </div>
        <div className="pm-ledger-cell pm-ledger-rate">
          <span className="pm-ledger-label">Part espèces</span>
          <strong className="pm-ledger-mid">{computedStats.tauxEspeces}<small>%</small></strong>
          <div className="pm-gauge" role="img" aria-label={`${computedStats.tauxEspeces}% du montant total encaissé en espèces`}>
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} className={i < gaugeFilled ? "on" : ""} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Pipeline ---------- */}
      <nav className="pm-pipeline" aria-label="Filtrer par mode de paiement">
        {stages.map((s) => (
          <button
            key={s.key || "all"}
            className={`pm-stage pm-stage--${s.tone} ${filterMode === s.key ? "is-active" : ""}`}
            onClick={() => setFilterMode(filterMode === s.key ? "" : s.key)}
            aria-pressed={filterMode === s.key}
          >
            <span className="pm-stage-count">{s.count}</span>
            <span className="pm-stage-label">{s.label}</span>
          </button>
        ))}
      </nav>

      {/* ---------- Barre d'outils ---------- */}
      <div className="pm-toolbar">
        <div className="pm-search">
          <Search size={17} className="pm-search-icon" />
          <input
            type="text"
            placeholder="Rechercher par client, commande, facture ou référence"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Rechercher un paiement"
          />
          {searchTerm && (
            <button className="pm-search-clear" onClick={() => setSearchTerm("")} aria-label="Effacer la recherche"><X size={15} /></button>
          )}
        </div>
        <select className="pm-select" value={filterPeriode} onChange={(e) => setFilterPeriode(e.target.value)} aria-label="Période">
          {PERIODES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select className="pm-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Trier par">
          <option value="date_desc">Plus récents</option>
          <option value="date_asc">Plus anciens</option>
          <option value="montant_desc">Montant décroissant</option>
          <option value="montant_asc">Montant croissant</option>
          <option value="client">Client (A–Z)</option>
        </select>
        <div className="pm-seg" role="group" aria-label="Mode d'affichage">
          <button className={viewMode === "list" ? "is-on" : ""} onClick={() => setViewMode("list")} title="Vue liste" aria-pressed={viewMode === "list"}><List size={17} /></button>
          <button className={viewMode === "grid" ? "is-on" : ""} onClick={() => setViewMode("grid")} title="Vue tickets" aria-pressed={viewMode === "grid"}><Grid size={17} /></button>
        </div>
      </div>

      {/* ---------- Contenu ---------- */}
      {loading && paiements.length === 0 ? (
        <div className="pm-state"><span className="pm-loader" /><p>Chargement des paiements…</p></div>
      ) : loadError && paiements.length === 0 ? (
        <div className="pm-state pm-state--error">
          <AlertCircle size={26} />
          <p>{loadError}</p>
          <button className="pm-btn pm-btn--dark" onClick={() => { loadPaiements(); loadStats(); }}>Réessayer</button>
        </div>
      ) : (
        <div className={loading ? "pm-content is-loading" : "pm-content"}>
          <div className="pm-count">
            {sortedPaiements.length} paiement{sortedPaiements.length > 1 ? "s" : ""}
            {hasFilters && <button className="pm-linkbtn" onClick={resetFilters}>Retirer les filtres</button>}
          </div>
          {currentItems.length === 0 ? renderEmpty() : viewMode === "grid" ? renderGrid() : renderTable()}

          {sortedPaiements.length > itemsPerPage && (
            <div className="pm-pager">
              <span className="pm-pager-info">
                {firstIdx + 1}–{Math.min(firstIdx + itemsPerPage, sortedPaiements.length)} sur {sortedPaiements.length}
              </span>
              <div className="pm-pager-ctrl">
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
        <div className="pm-bulk" role="region" aria-label="Actions sur la sélection">
          <strong>{selectedIds.length}</strong> sélectionné{selectedIds.length > 1 ? "s" : ""}
          <button className="pm-bulk-btn" onClick={handleBulkExport}><Download size={15} /> Exporter</button>
          {isAdmin && (
            <button className="pm-bulk-btn pm-bulk-btn--danger" onClick={() => setConfirm({ kind: "bulk" })} disabled={busy}>
              <Ban size={15} /> Supprimer
            </button>
          )}
          <button className="pm-bulk-close" onClick={() => setSelectedIds([])} aria-label="Désélectionner"><X size={16} /></button>
        </div>
      )}

      <ActionsMenu
        menu={menu}
        paiement={menuPaiement}
        canManage={canManage}
        isAdmin={isAdmin}
        onClose={() => setMenu(null)}
        onView={handleView}
        onPrint={handlePrint}
        onDelete={(p) => setConfirm({ kind: "delete", paiement: p })}
      />

      {/* ============================================================
          MODAL : DÉTAILS
          ============================================================ */}
      {showDetailModal && selectedPaiement && (
        <div
          className="pm-overlay"
          onClick={() => !loadingDetails && setShowDetailModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Détails du paiement"
        >
          <div className="pm-detail" onClick={(e) => e.stopPropagation()}>
            <header className="pm-sheet-head">
              <div className="pm-sheet-title">
                <span className="pm-sheet-mark"><Receipt size={21} /></span>
                <div>
                  <h2>Paiement #{selectedPaiement.id_paiement}</h2>
                  <p><Calendar size={13} /> {selectedPaiement.date_paiement_formatee || formatDate(selectedPaiement.date_paiement)}</p>
                </div>
              </div>
              <div className="pm-detail-status">
                <ModeTag mode={selectedPaiement.mode_paiement} />
                <button
                  className="pm-sheet-close"
                  onClick={() => !loadingDetails && setShowDetailModal(false)}
                  disabled={loadingDetails}
                  aria-label="Fermer"
                >
                  <X size={20} />
                </button>
              </div>
            </header>

            <div className="pm-detail-body">
              {loadingDetails ? (
                <div className="pm-state">
                  <span className="pm-loader" />
                  <p>Chargement des détails du paiement…</p>
                </div>
              ) : (
                <div className="pm-detail-cols">
                  <section>
                    <h4><Wallet size={15} /> Client</h4>
                    <dl>
                      <div><dt>Nom</dt><dd>{selectedPaiement.nomclient || "-"}</dd></div>
                      <div><dt>Téléphone</dt><dd>{selectedPaiement.telephone || "-"}</dd></div>
                    </dl>
                  </section>
                  <section>
                    <h4><FileText size={15} /> Informations</h4>
                    <dl>
                      <div><dt>Commande</dt><dd>{selectedPaiement.numero_commande || "-"}</dd></div>
                      <div><dt>Facture</dt><dd>{selectedPaiement.numero_facture || "-"}</dd></div>
                      <div>
                        <dt>Montant</dt>
                        <dd className="pm-detail-total">{formatMontant(selectedPaiement.montant)}</dd>
                      </div>
                      <div><dt>Référence</dt><dd>{selectedPaiement.reference || "-"}</dd></div>
                      <div><dt>Note</dt><dd>{selectedPaiement.note || "-"}</dd></div>
                      <div><dt>Enregistré par</dt><dd>{selectedPaiement.utilisateur_nom || "-"}</dd></div>
                    </dl>
                  </section>
                </div>
              )}
            </div>

            <div className="pm-detail-foot">
              <button className="pm-btn pm-btn--ghost" onClick={() => !loadingDetails && setShowDetailModal(false)}>
                Fermer
              </button>
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

export default Paiements;