// pages/Unites/Unites.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  Grid,
  List,
  RefreshCw,
  Ruler,
  Save,
  MoreVertical,
} from "lucide-react";
import UniteService from "../../services/uniteService";
import { useUser } from "../../context/AuthContext";
import "./Unites.css";

const INITIAL_FORM_DATA = {
  nom: "",
  symbole: "",
  description: "",
};

const Unites = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem("token");

  // ========== ÉTATS PRINCIPAUX ==========
  const [unites, setUnites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState("list");
  const [openDropdown, setOpenDropdown] = useState(null);

  // ========== MODAL AJOUT/ÉDITION ==========
  const [showModal, setShowModal] = useState(false);
  const [editingUnite, setEditingUnite] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);

  // ========== MODAL SUPPRESSION ==========
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [uniteToDelete, setUniteToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ========== ERREUR ==========
  const [error, setError] = useState(null);

  // ========== PERMISSIONS ==========
  const canManage = user && ["admin", "manager"].includes(user.role);

  // ========== FERMER LE DROPDOWN AU CLIC EXTÉRIEUR ==========
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // ========== FERMER LES MODALS AVEC ÉCHAP ==========
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (showModal && !saving) setShowModal(false);
        if (showDeleteModal && !deleting) setShowDeleteModal(false);
        setOpenDropdown(null);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showModal, saving, showDeleteModal, deleting]);

  // ========== CHARGEMENT DES UNITÉS ==========
  const loadUnites = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const response = await UniteService.getAllUnites(token);
      if (response.success) {
        setUnites(response.data || []);
      } else {
        setError(response.message || "Erreur lors du chargement des unités");
      }
    } catch (err) {
      console.error("❌ LoadUnites error:", err);
      setError(err.message || "Erreur lors du chargement des unités");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadUnites();
    }
  }, [isAuthenticated, token, loadUnites]);

  // ========== FILTRAGE LOCAL ==========
  const filteredUnites = useMemo(() => {
    if (!searchTerm) return unites;
    const term = searchTerm.toLowerCase();
    return unites.filter(
      (unite) =>
        unite.nom?.toLowerCase().includes(term) ||
        unite.symbole?.toLowerCase().includes(term) ||
        unite.description?.toLowerCase().includes(term)
    );
  }, [unites, searchTerm]);

  // ========== PAGINATION ==========
  const { currentItems, totalPages } = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return {
      currentItems: filteredUnites.slice(indexOfFirstItem, indexOfLastItem),
      totalPages: Math.ceil(filteredUnites.length / itemsPerPage),
    };
  }, [filteredUnites, currentPage, itemsPerPage]);

  // Reset page si dépasse
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // ========== TOGGLE DROPDOWN ==========
  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  // ========== HANDLERS FORMULAIRE ==========
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = () => {
    setEditingUnite(null);
    setFormData(INITIAL_FORM_DATA);
    setError(null);
    setShowModal(true);
  };

  const handleEdit = (unite) => {
    setEditingUnite(unite);
    setFormData({
      nom: unite.nom || "",
      symbole: unite.symbole || "",
      description: unite.description || "",
    });
    setError(null);
    setShowModal(true);
    setOpenDropdown(null);
  };

  const handleSave = async () => {
    if (!formData.nom.trim()) {
      setError("Veuillez saisir un nom d'unité");
      return;
    }
    if (!formData.symbole.trim()) {
      setError("Veuillez saisir un symbole d'unité");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        nom: formData.nom.trim(),
        symbole: formData.symbole.trim(),
        description: formData.description?.trim() || null,
      };

      const response = editingUnite
        ? await UniteService.updateUnite(token, editingUnite.id_unite, data)
        : await UniteService.createUnite(token, data);

      if (response.success) {
        await loadUnites();
        setShowModal(false);
        setEditingUnite(null);
        setFormData(INITIAL_FORM_DATA);
      } else {
        setError(response.message || "Erreur lors de la sauvegarde");
      }
    } catch (err) {
      console.error("❌ Save error:", err);
      setError(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // ========== SUPPRESSION ==========
  const confirmDelete = (unite) => {
    setUniteToDelete(unite);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleDelete = async () => {
    if (!uniteToDelete) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await UniteService.deleteUnite(
        token,
        uniteToDelete.id_unite
      );

      if (response.success) {
        await loadUnites();
        setShowDeleteModal(false);
        setUniteToDelete(null);
      } else {
        setError(response.message || "Erreur lors de la suppression");
      }
    } catch (err) {
      console.error("❌ Delete error:", err);
      setError(err.message || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  // ========== EXPORT ==========
  const handleExport = async () => {
    try {
      const response = await UniteService.exportUnites(token);
      if (response.success && response.data) {
        const blob = new Blob([response.data], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `unites_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("❌ Export error:", err);
      alert("Erreur lors de l'exportation");
    }
  };

  // ========== RECHERCHE ==========
  const handleSearch = (keyword) => {
    setSearchTerm(keyword);
    setCurrentPage(1);
  };

  // ========== MENU DROPDOWN ==========
  const renderDropdown = (unite, keyPrefix = "") => {
    const key = `${keyPrefix}${unite.id_unite}`;
    const isOpen = openDropdown === key;

    return (
      <div className="">
        <button
          type="button"
          className="dropdown-trigger"
          onClick={(e) => {
            e.stopPropagation();
            toggleDropdown(key);
          }}
          title="Actions"
          aria-label="Actions"
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <MoreVertical size={18} />
        </button>

        {isOpen && (
          <div
            className="dropdown-menu"
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            {canManage && (
              <button
                type="button"
                className="dropdown-item"
                role="menuitem"
                onClick={() => handleEdit(unite)}
              >
                <Edit size={16} />
                <span>Modifier</span>
              </button>
            )}

            {canManage && (
              <>
                <hr className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item danger"
                  role="menuitem"
                  onClick={() => confirmDelete(unite)}
                >
                  <Trash2 size={16} />
                  <span>Supprimer</span>
                </button>
              </>
            )}

            {!canManage && (
              <div className="dropdown-empty">Aucune action disponible</div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ========== VUE GRILLE ==========
  const renderGridView = () => (
    <div className="unites-grid">
      {currentItems.length === 0 ? (
        <div className="empty-state-full">
          <Ruler size={48} />
          <p>Aucune unité trouvée</p>
          <span>Essayez de modifier votre recherche</span>
        </div>
      ) : (
        currentItems.map((unite) => (
          <div key={unite.id_unite} className="unite-card">
            <div className="unite-card-header">
              <div className="unite-icon">
                <Ruler size={28} />
              </div>
              <div className="unite-actions">
                {canManage && renderDropdown(unite, "grid-")}
              </div>
            </div>

            <div className="unite-card-body">
              <h3 className="unite-name">{unite.nom}</h3>
              <div className="unite-symbole">
                <span className="symbole-label">Symbole:</span>
                <span className="symbole-value">{unite.symbole}</span>
              </div>
              <p className="unite-description">
                {unite.description || "Aucune description"}
              </p>
            </div>

            <div className="unite-card-footer">
              <span className="unite-date">
                Créée le{" "}
                {unite.date_creation
                  ? new Date(unite.date_creation).toLocaleDateString("fr-FR")
                  : "N/A"}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ========== VUE LISTE ==========
  const renderListView = () => (
    <div className="unites-table-container">
      <table className="unites-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Symbole</th>
            <th>Description</th>
            <th className="actions-header">Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.length === 0 ? (
            <tr>
              <td colSpan="5" className="empty-state">
                <p>Aucune unité trouvée</p>
              </td>
            </tr>
          ) : (
            currentItems.map((unite) => (
              <tr key={unite.id_unite}>
                <td className="id-cell">#{unite.id_unite}</td>
                <td className="name-cell">
                  <div className="unite-name-with-icon">
                    <Ruler size={18} className="unite-icon-small" />
                    <span>{unite.nom}</span>
                  </div>
                </td>
                <td className="symbole-cell">
                  <span className="symbole-badge">{unite.symbole}</span>
                </td>
                <td className="desc-cell">{unite.description || "-"}</td>
                <td className="actions-cell">
                  {renderDropdown(unite, "list-")}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // ========== LOADER ==========
  const LoaderComponent = () => (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Chargement des unités...</p>
    </div>
  );

  // ========== RENDER ==========
  return (
    <div className="unites-container">
      {/* En-tête */}
      <div className="unites-header">
        <div>
          <h1 className="unites-title">Gestion des Unités de Mesure</h1>
          <p className="unites-subtitle">{unites.length} unités au total</p>
        </div>
        <div className="unites-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              <span>Nouvelle Unité</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            <span>Exporter</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={loadUnites}
            title="Rafraîchir"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "spinning" : ""} />
          </button>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="unites-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher une unité..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button
              type="button"
              className="search-clear"
              onClick={() => handleSearch("")}
              aria-label="Effacer la recherche"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="view-toggle">
          <button
            type="button"
            className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Vue grille"
          >
            <Grid size={18} />
          </button>
          <button
            type="button"
            className={`view-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
            title="Vue liste"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* État de chargement */}
      {loading && <LoaderComponent />}

      {/* Erreur */}
      {error && !loading && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-secondary" onClick={loadUnites}>
            Réessayer
          </button>
        </div>
      )}

      {/* Contenu */}
      {!loading && !error && (
        <>{viewMode === "grid" ? renderGridView() : renderListView()}</>
      )}

      {/* Pagination */}
      {!loading && !error && filteredUnites.length > itemsPerPage && (
        <div className="unites-pagination">
          <button
            type="button"
            className="pagination-btn"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="pagination-info">
            Page {currentPage} sur {totalPages}
          </span>
          <button
            type="button"
            className="pagination-btn"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Modal d'ajout/édition */}
      {showModal && (
        <div
          className="modal-overlay"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingUnite ? "Modifier l'unité" : "Ajouter une unité"}
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => !saving && setShowModal(false)}
                aria-label="Fermer"
              >
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              {error && (
                <div className="modal-error">
                  <p>{error}</p>
                </div>
              )}
              <div className="form-group">
                <label>Nom de l'unité *</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  placeholder="Ex: Kilogramme, Litre, Pièce"
                  disabled={saving}
                  maxLength={50}
                />
              </div>
              <div className="form-group">
                <label>Symbole *</label>
                <input
                  type="text"
                  name="symbole"
                  value={formData.symbole}
                  onChange={handleInputChange}
                  placeholder="Ex: kg, L, pc"
                  disabled={saving}
                  maxLength={10}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Description de l'unité"
                  rows="3"
                  disabled={saving}
                  maxLength={500}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={
                  saving || !formData.nom.trim() || !formData.symbole.trim()
                }
              >
                {saving ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>{editingUnite ? "Mettre à jour" : "Ajouter"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div
          className="modal-overlay"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            className="modal-content delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Confirmer la suppression</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => !deleting && setShowDeleteModal(false)}
                aria-label="Fermer"
              >
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <p>Êtes-vous sûr de vouloir supprimer l'unité :</p>
              <p className="delete-item-name">
                <strong>
                  "{uniteToDelete?.nom}" ({uniteToDelete?.symbole})
                </strong>
              </p>
              <p className="delete-warning">
                Cette action est irréversible et supprimera définitivement
                l'unité.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>Supprimer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Unites;