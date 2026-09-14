// pages/Marques/Marques.jsx
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
  ToggleLeft,
  ToggleRight,
  Building2,
  Save,
  MoreVertical,
} from "lucide-react";
import MarqueService from "../../services/marqueService";
import { useUser } from "../../context/AuthContext";
import "./Marques.css";

const INITIAL_FORM_DATA = {
  nom: "",
  description: "",
};

const Marques = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem("token");

  // ========== ÉTATS PRINCIPAUX ==========
  const [marques, setMarques] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState("list");
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);

  // ========== MODAL AJOUT/ÉDITION ==========
  const [showModal, setShowModal] = useState(false);
  const [editingMarque, setEditingMarque] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);

  // ========== MODAL SUPPRESSION ==========
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [marqueToDelete, setMarqueToDelete] = useState(null);
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

  // ========== CHARGEMENT DES MARQUES ==========
  const loadMarques = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const response = await MarqueService.getAllMarques(token);
      if (response.success) {
        setMarques(response.data || []);
      } else {
        setError(response.message || "Erreur lors du chargement des marques");
      }
    } catch (err) {
      console.error("❌ LoadMarques error:", err);
      setError(err.message || "Erreur lors du chargement des marques");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadMarques();
    }
  }, [isAuthenticated, token, loadMarques]);

  // ========== FILTRAGE LOCAL ==========
  const filteredMarques = useMemo(() => {
    if (!searchTerm) return marques;
    const term = searchTerm.toLowerCase();
    return marques.filter(
      (marque) =>
        marque.nom?.toLowerCase().includes(term) ||
        marque.description?.toLowerCase().includes(term)
    );
  }, [marques, searchTerm]);

  // ========== PAGINATION ==========
  const { currentItems, totalPages } = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return {
      currentItems: filteredMarques.slice(indexOfFirstItem, indexOfLastItem),
      totalPages: Math.ceil(filteredMarques.length / itemsPerPage),
    };
  }, [filteredMarques, currentPage, itemsPerPage]);

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
    setEditingMarque(null);
    setFormData(INITIAL_FORM_DATA);
    setError(null);
    setShowModal(true);
  };

  const handleEdit = (marque) => {
    setEditingMarque(marque);
    setFormData({
      nom: marque.nom || "",
      description: marque.description || "",
    });
    setError(null);
    setShowModal(true);
    setOpenDropdown(null);
  };

  const handleSave = async () => {
    if (!formData.nom.trim()) {
      setError("Veuillez saisir un nom de marque");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        nom: formData.nom.trim(),
        description: formData.description?.trim() || null,
      };

      const response = editingMarque
        ? await MarqueService.updateMarque(token, editingMarque.id_marque, data)
        : await MarqueService.createMarque(token, data);

      if (response.success) {
        await loadMarques();
        setShowModal(false);
        setEditingMarque(null);
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

  // ========== TOGGLE STATUT ==========
  const handleToggleStatus = async (marque) => {
    if (!canManage || updatingStatus === marque.id_marque) return;

    setUpdatingStatus(marque.id_marque);
    setError(null);

    try {
      const newStatus = marque.actif === 1 ? 0 : 1;
      const response = await MarqueService.updateMarqueStatus(
        token,
        marque.id_marque,
        newStatus
      );

      if (response.success) {
        setMarques((prevMarques) =>
          prevMarques.map((m) =>
            m.id_marque === marque.id_marque ? { ...m, actif: newStatus } : m
          )
        );
      } else {
        setError(response.message || "Erreur lors du changement de statut");
        await loadMarques();
      }
    } catch (err) {
      console.error("❌ Toggle status error:", err);
      setError(err.message || "Erreur lors du changement de statut");
      await loadMarques();
    } finally {
      setUpdatingStatus(null);
    }
  };

  // ========== SUPPRESSION ==========
  const confirmDelete = (marque) => {
    setMarqueToDelete(marque);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleDelete = async () => {
    if (!marqueToDelete) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await MarqueService.deleteMarque(
        token,
        marqueToDelete.id_marque
      );

      if (response.success) {
        await loadMarques();
        setShowDeleteModal(false);
        setMarqueToDelete(null);
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
      const response = await MarqueService.exportMarques(token);
      if (response.success && response.data) {
        const blob = new Blob([response.data], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `marques_${new Date().toISOString().split("T")[0]}.csv`;
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

  // ========== BADGE STATUT ==========
  const renderStatusBadge = (marque) => (
    <span
      className={`status-badge ${
        marque.actif === 1 ? "active" : "inactive"
      } ${updatingStatus === marque.id_marque ? "updating" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        if (canManage) handleToggleStatus(marque);
      }}
      style={{ cursor: canManage ? "pointer" : "default" }}
    >
      {updatingStatus === marque.id_marque ? (
        <span className="spinner-small"></span>
      ) : marque.actif === 1 ? (
        "Actif"
      ) : (
        "Inactif"
      )}
    </span>
  );

  // ========== MENU DROPDOWN ==========
  const renderDropdown = (marque, keyPrefix = "") => {
    const key = `${keyPrefix}${marque.id_marque}`;
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
                onClick={() => {
                  handleToggleStatus(marque);
                  setOpenDropdown(null);
                }}
                disabled={updatingStatus === marque.id_marque}
              >
                {updatingStatus === marque.id_marque ? (
                  <span className="spinner-small"></span>
                ) : marque.actif === 1 ? (
                  <ToggleRight size={16} color="#22c55e" />
                ) : (
                  <ToggleLeft size={16} color="#6b7280" />
                )}
                <span>{marque.actif === 1 ? "Désactiver" : "Activer"}</span>
              </button>
            )}

            {canManage && (
              <button
                type="button"
                className="dropdown-item"
                role="menuitem"
                onClick={() => handleEdit(marque)}
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
                  onClick={() => confirmDelete(marque)}
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
    <div className="marques-grid">
      {currentItems.length === 0 ? (
        <div className="empty-state-full">
          <Building2 size={48} />
          <p>Aucune marque trouvée</p>
          <span>Essayez de modifier votre recherche</span>
        </div>
      ) : (
        currentItems.map((marque) => (
          <div key={marque.id_marque} className="marque-card">
            <div className="marque-card-header">
              <div className="marque-icon">
                <Building2 size={28} />
              </div>
              <div className="marque-actions">
                {canManage && renderDropdown(marque, "grid-")}
              </div>
            </div>

            <div className="marque-card-body">
              <h3 className="marque-name">{marque.nom}</h3>
              <p className="marque-description">
                {marque.description || "Aucune description"}
              </p>
              <div className="marque-status">{renderStatusBadge(marque)}</div>
            </div>

            <div className="marque-card-footer">
              <span className="marque-date">
                Créée le{" "}
                {marque.date_creation
                  ? new Date(marque.date_creation).toLocaleDateString("fr-FR")
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
    <div className="marques-table-container">
      <table className="marques-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Description</th>
            <th>Statut</th>
            <th className="actions-header">Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.length === 0 ? (
            <tr>
              <td colSpan="5" className="empty-state">
                <p>Aucune marque trouvée</p>
              </td>
            </tr>
          ) : (
            currentItems.map((marque) => (
              <tr key={marque.id_marque}>
                <td className="id-cell">#{marque.id_marque}</td>
                <td className="name-cell">
                  <div className="marque-name-with-icon">
                    <Building2 size={18} className="marque-icon-small" />
                    <span>{marque.nom}</span>
                  </div>
                </td>
                <td className="desc-cell">{marque.description || "-"}</td>
                <td>{renderStatusBadge(marque)}</td>
                <td className="actions-cell">
                  {renderDropdown(marque, "list-")}
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
      <p>Chargement des marques...</p>
    </div>
  );

  // ========== RENDER ==========
  return (
    <div className="marques-container">
      {/* En-tête */}
      <div className="marques-header">
        <div>
          <h1 className="marques-title">Gestion des Marques</h1>
          <p className="marques-subtitle">{marques.length} marques au total</p>
        </div>
        <div className="marques-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              <span>Nouvelle Marque</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            <span>Exporter</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={loadMarques}
            title="Rafraîchir"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "spinning" : ""} />
          </button>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="marques-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher une marque..."
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
          <button className="btn btn-secondary" onClick={loadMarques}>
            Réessayer
          </button>
        </div>
      )}

      {/* Contenu */}
      {!loading && !error && (
        <>{viewMode === "grid" ? renderGridView() : renderListView()}</>
      )}

      {/* Pagination */}
      {!loading && !error && filteredMarques.length > itemsPerPage && (
        <div className="marques-pagination">
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
          onClick={() => !saving && setShowModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingMarque ? "Modifier la marque" : "Ajouter une marque"}
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
                <label>Nom de la marque *</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  placeholder="Entrez le nom de la marque"
                  disabled={saving}
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Description de la marque"
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
                disabled={saving || !formData.nom.trim()}
              >
                {saving ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>{editingMarque ? "Mettre à jour" : "Ajouter"}</span>
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
              <p>Êtes-vous sûr de vouloir supprimer la marque :</p>
              <p className="delete-item-name">
                <strong>"{marqueToDelete?.nom}"</strong>
              </p>
              <p className="delete-warning">
                Cette action est irréversible et supprimera définitivement la
                marque.
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

export default Marques;