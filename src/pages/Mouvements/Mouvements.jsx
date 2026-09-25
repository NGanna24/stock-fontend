// pages/Mouvements/Mouvements.jsx
// ============================================================
// SOMMAIRE
// ------------------------------------------------------------
// 1. IMPORTS
// 2. CONSTANTES (badges, labels)
// 3. HELPERS (formatage, décomposition)
// 4. SOUS-COMPOSANTS
//    4.1 StatCards
//    4.2 Filters
//    4.3 MouvementsTable
//    4.4 Pagination
//    4.5 DetailModal
// 5. COMPOSANT PRINCIPAL
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Search, Eye, X, RefreshCw, ClipboardList, Download,
    ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, Repeat,
    User, Calendar, Package, ChevronLeft, ChevronRight,
} from "lucide-react";

import MouvementStockService from "../../services/mouvementStockService";
import { useUser } from "../../context/AuthContext";
import StockSelector from "../../components/StockSelector/StockSelector";
import "./Mouvements.css";

// ============================================================
// 2. CONSTANTES
// ============================================================

const TYPE_BADGES = {
    entree:     { label: "Entrée",     className: "type-entree",     Icon: ArrowDownCircle },
    sortie:     { label: "Sortie",     className: "type-sortie",     Icon: ArrowUpCircle },
    ajustement: { label: "Ajustement", className: "type-ajustement", Icon: SlidersHorizontal },
    transfert:  { label: "Transfert",  className: "type-transfert",  Icon: Repeat },
};

const REFERENCE_LABELS = {
    reception:          "Réception",
    vente:              "Vente",
    ajustement:         "Ajustement",
    transfert:          "Transfert",
    retour_client:      "Retour client",
    retour_fournisseur: "Retour fournisseur",
    perte:              "Perte / Casse",
};

const ITEMS_PER_PAGE = 15;

// ============================================================
// 3. HELPERS
// ============================================================

const formatQte = (value) => {
    const n = parseFloat(value) || 0;
    return n.toLocaleString("fr-FR");
};

/**
 * Décompose une quantité de base en unités de vente.
 * Ex: 27 avec {carton: 10, bidon: 1} → [{nom:"Carton", qte:2}, {nom:"Bidon", qte:7}]
 */
const decomposer = (quantite, unitesVente, uniteBase) => {
    const stock = parseFloat(quantite) || 0;
    if (stock <= 0) return [];

    const toutes = [
        { nom: uniteBase?.nom || "Unité", quantite_base: 1 },
        ...(unitesVente || [])
            .filter((u) => u && u.nom)
            .map((u) => ({
                nom: u.nom,
                quantite_base: parseFloat(u.quantite_base) || 1,
            })),
    ].sort((a, b) => b.quantite_base - a.quantite_base);

    let reste = stock;
    const parts = [];

    for (const u of toutes) {
        const qb = u.quantite_base || 1;
        const qte = Math.floor(reste / qb);
        if (qte > 0) {
            parts.push({ nom: u.nom, qte });
            reste -= qte * qb;
        }
    }
    return parts;
};

const getReferenceLabel = (m) => {
    if (!m?.type_reference) return "-";
    const label = REFERENCE_LABELS[m.type_reference] || m.type_reference;
    return m.id_reference ? `${label} #${m.id_reference}` : label;
};

// ============================================================
// 4. SOUS-COMPOSANTS
// ============================================================

// ------------------------------------------------------------
// 4.1 TypeBadge
// ------------------------------------------------------------
const TypeBadge = ({ type }) => {
    const config = TYPE_BADGES[type] || TYPE_BADGES.entree;
    const { Icon } = config;
    return (
        <span className={`type-badge ${config.className}`}>
            <Icon size={13} />
            {config.label}
        </span>
    );
};

// ------------------------------------------------------------
// 4.2 DecompositionText (pour Ancien / Nouveau)
// ------------------------------------------------------------
const DecompositionText = ({ parts }) => {
    if (!parts || parts.length === 0) {
        return <span className="qte-zero">0</span>;
    }
    return (
        <span className="qte-decomp">
            {parts.map((p, i) => (
                <React.Fragment key={i}>
                    <span className="qte-part">
                        {p.qte} <small>{p.nom}</small>
                    </span>
                    {i < parts.length - 1 && <span className="qte-plus">+</span>}
                </React.Fragment>
            ))}
        </span>
    );
};

// ------------------------------------------------------------
// 4.3 StatCards
// ------------------------------------------------------------
const StatCards = ({ stats }) => (
    <div className="mouvements-stats">
        <StatCard
            className="total"
            Icon={ClipboardList}
            label="Total"
            value={stats.total}
        />
        <StatCard
            className="entree"
            Icon={ArrowDownCircle}
            label="Entrées"
            value={`${stats.total_entrees} (${formatQte(stats.qte_entrees)})`}
        />
        <StatCard
            className="sortie"
            Icon={ArrowUpCircle}
            label="Sorties"
            value={`${stats.total_sorties} (${formatQte(stats.qte_sorties)})`}
        />
        <StatCard
            className="ajust"
            Icon={SlidersHorizontal}
            label="Ajustements"
            value={stats.total_ajustements}
        />
        <StatCard
            className="trans"
            Icon={Repeat}
            label="Transferts"
            value={stats.total_transferts}
        />
        <StatCard
            className="auj"
            Icon={Calendar}
            label="Aujourd'hui"
            value={stats.aujourdhui}
        />
    </div>
);

const StatCard = ({ className, Icon, label, value }) => (
    <div className="stat-card">
        <div className={`stat-icon ${className}`}>
            <Icon size={20} />
        </div>
        <div className="stat-info">
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
        </div>
    </div>
);

// ------------------------------------------------------------
// 4.4 Filters
// ------------------------------------------------------------
const Filters = ({
    searchTerm, setSearchTerm,
    filterType, setFilterType,
    filterDateDebut, setFilterDateDebut,
    filterDateFin, setFilterDateFin,
    onFilter, onReset,
}) => {
    const hasFilters = filterType || filterDateDebut || filterDateFin || searchTerm;

    return (
        <div className="mouvements-filters">
            <div className="search-box">
                <Search size={18} className="search-icon" />
                <input
                    type="text"
                    placeholder="Rechercher un mouvement..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                {searchTerm && (
                    <button
                        className="search-clear"
                        onClick={() => setSearchTerm("")}
                        aria-label="Effacer"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            <select
                className="filter-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
            >
                <option value="">Tous les types</option>
                <option value="entree">Entrées</option>
                <option value="sortie">Sorties</option>
                <option value="ajustement">Ajustements</option>
                <option value="transfert">Transferts</option>
            </select>

            <input
                type="date"
                className="filter-date"
                value={filterDateDebut}
                onChange={(e) => setFilterDateDebut(e.target.value)}
                title="Date de début"
            />
            <input
                type="date"
                className="filter-date"
                value={filterDateFin}
                onChange={(e) => setFilterDateFin(e.target.value)}
                title="Date de fin"
            />

            <button className="btn btn-primary" onClick={onFilter}>
                Filtrer
            </button>

            {hasFilters && (
                <button className="btn btn-secondary" onClick={onReset}>
                    Réinitialiser
                </button>
            )}
        </div>
    );
};

// ------------------------------------------------------------
// 4.5 MouvementsTable
// ------------------------------------------------------------
const MouvementsTable = ({ items, onView }) => (
    <div className="mouvements-table-container">
        <table className="mouvements-table">
            <colgroup>
                {/* ✅ Largeurs maîtrisées via colgroup (plus fiable que nth-child) */}
                <col style={{ width: "11%" }} /> {/* Date */}
                <col style={{ width: "9%" }} />  {/* Type */}
                <col style={{ width: "14%" }} /> {/* Produit */}
                <col style={{ width: "14%" }} /> {/* Quantité */}
                <col style={{ width: "13%" }} /> {/* Ancien */}
                <col style={{ width: "13%" }} /> {/* Nouveau */}
                <col style={{ width: "11%" }} /> {/* Référence */}
                <col style={{ width: "9%" }} />  {/* Utilisateur */}
                <col style={{ width: "6%" }} />  {/* Actions */}
            </colgroup>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Produit</th>
                    <th>Quantité</th>
                    <th>Ancien</th>
                    <th>Nouveau</th>
                    <th>Référence</th>
                    <th>Utilisateur</th>
                    <th className="th-actions">Actions</th>
                </tr>
            </thead>
            <tbody>
                {items.length === 0 ? (
                    <tr>
                        <td colSpan="9" className="empty-state">
                            <ClipboardList size={32} />
                            <p>Aucun mouvement trouvé</p>
                        </td>
                    </tr>
                ) : (
                    items.map((m) => (
                        <MouvementRow key={m.id_mouvement} m={m} onView={onView} />
                    ))
                )}
            </tbody>
        </table>
    </div>
);

const MouvementRow = React.memo(({ m, onView }) => {
    const unitesVente = m.unites_vente || [];
    const uniteBase = { nom: m.unite_nom, symbole: m.unite_symbole };

    const ancienParts = useMemo(
        () => decomposer(m.ancienne_quantite, unitesVente, uniteBase),
        [m.ancienne_quantite, unitesVente, uniteBase]
    );
    const nouveauParts = useMemo(
        () => decomposer(m.nouvelle_quantite, unitesVente, uniteBase),
        [m.nouvelle_quantite, unitesVente, uniteBase]
    );

    return (
        <tr>
            <td className="col-date">
                {m.date_mouvement_formatee ||
                    new Date(m.date_mouvement).toLocaleString("fr-FR")}
            </td>

            <td className="col-type">
                <TypeBadge type={m.type_mouvement} />
            </td>

            <td className="col-produit">
                <span className="produit-nom">{m.produit_nom || "-"}</span>
                {m.marque_nom && (
                    <span className="produit-marque"> — {m.marque_nom}</span>
                )}
            </td>

            {/* ✅ Quantité : composant interactif */}
            <td className="col-qte">
                <StockSelector
                    idProduit={`mvt-qte-${m.id_mouvement}`}
                    stockBase={m.quantite}
                    unitesVente={unitesVente}
                    uniteBase={uniteBase}
                    isRupture={false}
                    variant="list"
                />
            </td>

            {/* ✅ Ancien : texte décomposé (non interactif) */}
            <td className="col-qte-text">
                <DecompositionText parts={ancienParts} />
            </td>

            {/* ✅ Nouveau : texte décomposé (non interactif) */}
            <td className="col-qte-text">
                <DecompositionText parts={nouveauParts} />
            </td>

            <td className="col-ref">{getReferenceLabel(m)}</td>

            <td className="col-user">{m.utilisateur_nom || "-"}</td>

            <td className="col-actions">
                <button
                    className="action-btn btn-view"
                    onClick={() => onView(m)}
                    title="Voir détails"
                >
                    <Eye size={15} />
                </button>
            </td>
        </tr>
    );
});

// ------------------------------------------------------------
// 4.6 Pagination
// ------------------------------------------------------------
const Pagination = ({ currentPage, totalPages, onChange }) => {
    if (totalPages <= 1) return null;

    return (
        <div className="mouvements-pagination">
            <button
                className="pagination-btn"
                onClick={() => onChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                aria-label="Page précédente"
            >
                <ChevronLeft size={16} />
            </button>
            <span className="pagination-info">
                Page {currentPage} sur {totalPages}
            </span>
            <button
                className="pagination-btn"
                onClick={() => onChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                aria-label="Page suivante"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
};

// ------------------------------------------------------------
// 4.7 DetailModal
// ------------------------------------------------------------
const DetailModal = ({ mouvement, onClose }) => {
    if (!mouvement) return null;

    const unitesVente = mouvement.unites_vente || [];
    const uniteBase = { nom: mouvement.unite_nom, symbole: mouvement.unite_symbole };

    const ancienParts = decomposer(mouvement.ancienne_quantite, unitesVente, uniteBase);
    const nouveauParts = decomposer(mouvement.nouvelle_quantite, unitesVente, uniteBase);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Détails du mouvement</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Fermer">
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <DetailItem label="Type">
                        <TypeBadge type={mouvement.type_mouvement} />
                    </DetailItem>

                    <DetailItem label="Produit">
                        <Package size={13} />
                        {" "}
                        {mouvement.produit_nom || "-"}
                        {mouvement.marque_nom && ` (${mouvement.marque_nom})`}
                    </DetailItem>

                    <DetailItem label="Quantité">
                        <StockSelector
                            idProduit={`mvt-modal-qte-${mouvement.id_mouvement}`}
                            stockBase={mouvement.quantite}
                            unitesVente={unitesVente}
                            uniteBase={uniteBase}
                            isRupture={false}
                            variant="details"
                        />
                    </DetailItem>

                    <DetailItem label="Ancienne quantité">
                        <DecompositionText parts={ancienParts} />
                    </DetailItem>

                    <DetailItem label="Nouvelle quantité">
                        <DecompositionText parts={nouveauParts} />
                    </DetailItem>

                    <DetailItem label="Référence">
                        {getReferenceLabel(mouvement)}
                    </DetailItem>

                    <DetailItem label="Date">
                        <Calendar size={13} />
                        {" "}
                        {mouvement.date_mouvement_formatee ||
                            new Date(mouvement.date_mouvement).toLocaleString("fr-FR")}
                    </DetailItem>

                    <DetailItem label="Utilisateur">
                        <User size={13} />
                        {" "}
                        {mouvement.utilisateur_nom || "-"}
                    </DetailItem>

                    <DetailItem label="Notes">
                        {mouvement.notes || "-"}
                    </DetailItem>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

const DetailItem = ({ label, children }) => (
    <div className="detail-item">
        <label>{label}</label>
        <span>{children}</span>
    </div>
);

// ============================================================
// 5. COMPOSANT PRINCIPAL
// ============================================================
const Mouvements = () => {
    const { isAuthenticated } = useUser();
    const token = localStorage.getItem("token");

    // --- État ---
    const [mouvements, setMouvements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterDateDebut, setFilterDateDebut] = useState("");
    const [filterDateFin, setFilterDateFin] = useState("");

    const [currentPage, setCurrentPage] = useState(1);

    const [selectedMouvement, setSelectedMouvement] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const [stats, setStats] = useState({
        total: 0, total_entrees: 0, total_sorties: 0,
        total_ajustements: 0, total_transferts: 0,
        qte_entrees: 0, qte_sorties: 0, aujourdhui: 0,
    });

    // --- Build params pour l'API ---
    const buildParams = useCallback(() => {
        const params = {};
        if (searchTerm) params.search = searchTerm;
        if (filterType) params.type_mouvement = filterType;
        if (filterDateDebut) params.date_debut = filterDateDebut;
        if (filterDateFin) params.date_fin = filterDateFin;
        return params;
    }, [searchTerm, filterType, filterDateDebut, filterDateFin]);

    // --- Chargement ---
    const loadMouvements = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await MouvementStockService.getAll(token, buildParams());
            if (response.success) {
                setMouvements(response.data || []);
            } else {
                setError(response.message || "Erreur de chargement");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token, buildParams]);

    const loadStats = useCallback(async () => {
        try {
            const response = await MouvementStockService.getStats(token);
            if (response.success) setStats(response.data);
        } catch (err) {
            console.error("❌ LoadStats error:", err);
        }
    }, [token]);

    useEffect(() => {
        if (isAuthenticated && token) {
            loadMouvements();
            loadStats();
        }
    }, [isAuthenticated, token, loadMouvements, loadStats]);

    // --- Actions ---
    const handleRefresh = () => {
        loadMouvements();
        loadStats();
    };

    const handleExport = async () => {
        try {
            await MouvementStockService.export(token, buildParams());
        } catch (err) {
            alert("Erreur lors de l'exportation : " + err.message);
        }
    };

    const handleView = (mouvement) => {
        setSelectedMouvement(mouvement);
        setShowDetailModal(true);
    };

    const handleReset = () => {
        setFilterType("");
        setFilterDateDebut("");
        setFilterDateFin("");
        setSearchTerm("");
        setCurrentPage(1);
    };

    // --- Pagination ---
    const totalPages = Math.ceil(mouvements.length / ITEMS_PER_PAGE);
    const currentItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return mouvements.slice(start, start + ITEMS_PER_PAGE);
    }, [mouvements, currentPage]);

    // Reset page quand les filtres changent
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType, filterDateDebut, filterDateFin]);

    // --- Rendu ---
    return (
        <div className="mouvements-container">
            {/* En-tête */}
            <div className="mouvements-header">
                <div>
                    <h1 className="mouvements-title">Mouvements de stock</h1>
                    <p className="mouvements-subtitle">
                        {stats.total} mouvements enregistrés • Historique automatique
                    </p>
                </div>
                <div className="mouvements-actions">
                    <button className="btn btn-secondary" onClick={handleExport}>
                        <Download size={16} />
                        <span>Exporter</span>
                    </button>
                    <button
                        className="btn btn-secondary btn-icon"
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Rafraîchir"
                    >
                        <RefreshCw size={16} className={loading ? "spinning" : ""} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <StatCards stats={stats} />

            {/* Filtres */}
            <Filters
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                filterType={filterType} setFilterType={setFilterType}
                filterDateDebut={filterDateDebut} setFilterDateDebut={setFilterDateDebut}
                filterDateFin={filterDateFin} setFilterDateFin={setFilterDateFin}
                onFilter={loadMouvements}
                onReset={handleReset}
            />

            {/* Contenu */}
            {loading && (
                <div className="state-container">
                    <div className="spinner" />
                    <p>Chargement des mouvements...</p>
                </div>
            )}

            {error && !loading && (
                <div className="state-container error">
                    <p className="error-message">{error}</p>
                    <button className="btn btn-secondary" onClick={loadMouvements}>
                        Réessayer
                    </button>
                </div>
            )}

            {!loading && !error && (
                <>
                    <MouvementsTable items={currentItems} onView={handleView} />
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onChange={setCurrentPage}
                    />
                </>
            )}

            {/* Modal */}
            {showDetailModal && selectedMouvement && (
                <DetailModal
                    mouvement={selectedMouvement}
                    onClose={() => setShowDetailModal(false)}
                />
            )}
        </div>
    );
};

export default Mouvements;