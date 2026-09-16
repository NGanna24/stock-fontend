// pages/Categories/Categories.jsx
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
  Check,
  FolderOpen,
  Package,
  Tag,
  Box,
  Layers,
  Grid,
  List,
  Eye,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  MoreVertical,
} from "lucide-react";
import CategorieService from "../../services/categorieService";
import { useUser } from "../../context/AuthContext";
import "./Categories.css";

const INITIAL_FORM_DATA = {
  nom: "",
  description: "",
};

const Categories = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem("token");

  // ========== ÉTATS PRINCIPAUX ==========
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState("list");
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);

  // ========== MODAL AJOUT/ÉDITION ==========
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);

  // ========== MODAL SUPPRESSION ==========
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
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
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
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

  // ========== CHARGEMENT DES CATÉGORIES ==========
  const loadCategories = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const response = await CategorieService.getAllCategories(token);
      if (response.success) {
        setCategories(response.data || []);
      } else {
        setError(response.message || "Erreur lors du chargement des catégories");
      }
    } catch (err) {
      console.error("❌ LoadCategories error:", err);
      setError(err.message || "Erreur lors du chargement des catégories");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadCategories();
    }
  }, [isAuthenticated, token, loadCategories]);

  // ========== FILTRAGE LOCAL ==========
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    const term = searchTerm.toLowerCase();
    return categories.filter(
      (category) =>
        category.nom?.toLowerCase().includes(term) ||
        category.description?.toLowerCase().includes(term)
    );
  }, [categories, searchTerm]);

  // ========== PAGINATION ==========
  const { currentItems, totalPages } = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return {
      currentItems: filteredCategories.slice(indexOfFirstItem, indexOfLastItem),
      totalPages: Math.ceil(filteredCategories.length / itemsPerPage),
    };
  }, [filteredCategories, currentPage, itemsPerPage]);

  // Reset page si elle dépasse le total
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
    setEditingCategory(null);
    setFormData(INITIAL_FORM_DATA);
    setError(null);
    setShowModal(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      nom: category.nom || "",
      description: category.description || "",
    });
    setError(null);
    setShowModal(true);
    setOpenDropdown(null);
  };

  const handleSave = async () => {
    if (!formData.nom.trim()) {
      setError("Veuillez saisir un nom de catégorie");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        nom: formData.nom.trim(),
        description: formData.description?.trim() || "",
      };

      const response = editingCategory
        ? await CategorieService.updateCategory(
            token,
            editingCategory.id_categorie,
            data
          )
        : await CategorieService.createCategory(token, data);

      if (response.success) {
        await loadCategories();
        setShowModal(false);
        setEditingCategory(null);
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
  const handleToggleStatus = async (category) => {
    if (!canManage || updatingStatus === category.id_categorie) return;

    setUpdatingStatus(category.id_categorie);
    setError(null);

    try {
      const newStatus = category.statut === "actif" ? "inactif" : "actif";
      const response = await CategorieService.updateCategoryStatus(
        token,
        category.id_categorie,
        newStatus
      );

      if (response.success) {
        setCategories((prevCategories) =>
          prevCategories.map((cat) =>
            cat.id_categorie === category.id_categorie
              ? { ...cat, statut: newStatus }
              : cat
          )
        );
      } else {
        setError(response.message || "Erreur lors du changement de statut");
        await loadCategories();
      }
    } catch (err) {
      console.error("❌ Toggle status error:", err);
      setError(err.message || "Erreur lors du changement de statut");
      await loadCategories();
    } finally {
      setUpdatingStatus(null);
    }
  };

  // ========== SUPPRESSION ==========
  const confirmDelete = (category) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await CategorieService.deleteCategory(
        token,
        categoryToDelete.id_categorie
      );

      if (response.success) {
        await loadCategories();
        setShowDeleteModal(false);
        setCategoryToDelete(null);
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
      const response = await CategorieService.exportCategories(token);
      if (response.success && response.data) {
        const blob = new Blob([response.data], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `categories_${new Date().toISOString().split("T")[0]}.csv`;
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

  // ========== ICÔNES DYNAMIQUES ==========
  const getIconComponent = (iconName) => {
    const iconMap = {
      FolderOpen,
      Package,
      Tag,
      Box,
      Layers,
      Grid,
      List,
      Eye,
    };
    const Icon = iconMap[iconName] || FolderOpen;
    return <Icon size={24} />;
  };

  // ========== BADGE DE STATUT ==========
  const renderStatusBadge = (category) => (
    <span
      className={`status-badge ${
        category.statut === "actif" ? "active" : "inactive"
      } ${updatingStatus === category.id_categorie ? "updating" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        if (canManage) handleToggleStatus(category);
      }}
      style={{ cursor: canManage ? "pointer" : "default" }}
    >
      {updatingStatus === category.id_categorie ? (
        <span className="spinner-small"></span>
      ) : category.statut === "actif" ? (
        "Actif"
      ) : (
        "Inactif"
      )}
    </span>
  );

  // ========== MENU DROPDOWN (ACTIONS) ==========
  const renderDropdown = (category, keyPrefix = "") => {
    const key = `${keyPrefix}${category.id_categorie}`;
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
                  handleToggleStatus(category);
                  setOpenDropdown(null);
                }}
                disabled={updatingStatus === category.id_categorie}
              >
                {updatingStatus === category.id_categorie ? (
                  <span className="spinner-small"></span>
                ) : category.statut === "actif" ? (
                  <ToggleRight size={16} color="#22c55e" />
                ) : (
                  <ToggleLeft size={16} color="#6b7280" />
                )}
                <span>
                  {category.statut === "actif" ? "Désactiver" : "Activer"}
                </span>
              </button>
            )}

            {canManage && (
              <button
                type="button"
                className="dropdown-item"
                role="menuitem"
                onClick={() => {
                  handleEdit(category);
                }}
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
                  onClick={() => {
                    confirmDelete(category);
                  }}
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
    <div className="categories-grid">
      {currentItems.length === 0 ? (
        <div className="empty-state-full">
          <FolderOpen size={48} />
          <p>Aucune catégorie trouvée</p>
          <span>Essayez de modifier votre recherche</span>
        </div>
      ) : (
        currentItems.map((category) => (
          <div key={category.id_categorie} className="category-card">
            <div className="category-card-header">
              <div
                className="category-icon"
                style={{
                  backgroundColor: (category.couleur || "#995F2F") + "20",
                  color: category.couleur || "#995F2F",
                }}
              >
                {getIconComponent(category.icon)}
              </div>
              <div className="category-actions">
                {canManage && (
                  <div className="">
                    <button
                      type="button"
                      className="dropdown-trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(`grid-${category.id_categorie}`);
                      }}
                      title="Actions"
                      aria-label="Actions"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {openDropdown === `grid-${category.id_categorie}` && (
                      <div
                        className="dropdown-menu"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            handleToggleStatus(category);
                            setOpenDropdown(null);
                          }}
                          disabled={
                            updatingStatus === category.id_categorie
                          }
                        >
                          {updatingStatus === category.id_categorie ? (
                            <span className="spinner-small"></span>
                          ) : category.statut === "actif" ? (
                            <ToggleRight size={16} color="#22c55e" />
                          ) : (
                            <ToggleLeft size={16} color="#6b7280" />
                          )}
                          <span>
                            {category.statut === "actif"
                              ? "Désactiver"
                              : "Activer"}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit size={16} />
                          <span>Modifier</span>
                        </button>
                        <hr className="dropdown-divider" />
                        <button
                          type="button"
                          className="dropdown-item danger"
                          onClick={() => confirmDelete(category)}
                        >
                          <Trash2 size={16} />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="category-card-body">
              <h3 className="category-name">{category.nom}</h3>
              <p className="category-description">
                {category.description || "Aucune description"}
              </p>
              <div className="category-status">
                {renderStatusBadge(category)}
              </div>
            </div>

            <div className="category-card-footer">
              <span className="category-date">
                Créée le{" "}
                {category.date_creation
                  ? new Date(category.date_creation).toLocaleDateString("fr-FR")
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
    <div className="categories-table-container">
      <table className="categories-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Description</th>
            <th>Couleur</th>
            <th>Statut</th>
            <th className="actions-header">Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.length === 0 ? (
            <tr>
              <td colSpan="6" className="empty-state">
                <p>Aucune catégorie trouvée</p>
              </td>
            </tr>
          ) : (
            currentItems.map((category) => (
              <tr key={category.id_categorie}>
                <td className="id-cell">#{category.id_categorie}</td>
                <td className="name-cell">
                  <div className="category-name-with-icon">
                    <span
                      className="category-icon-small"
                      style={{
                        backgroundColor:
                          (category.couleur || "#995F2F") + "20",
                        color: category.couleur || "#995F2F",
                      }}
                    >
                      {getIconComponent(category.icon)}
                    </span>
                    <span>{category.nom}</span>
                  </div>
                </td>
                <td className="desc-cell">
                  {category.description || "-"}
                </td>
                <td>
                  <div className="color-indicator">
                    <span
                      className="color-dot"
                      style={{
                        backgroundColor: category.couleur || "#995F2F",
                      }}
                    />
                    {category.couleur || "#995F2F"}
                  </div>
                </td>
                <td>{renderStatusBadge(category)}</td>
                <td className="actions-cell">
                  {renderDropdown(category, "list-")}
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
      <p>Chargement des catégories...</p>
    </div>
  );

  // ========== RENDER ==========
  return (
    <div className="categories-container">
      {/* En-tête */}
      <div className="categories-header">
        <div>
          <h1 className="categories-title">Gestion des Catégories</h1>
          <p className="categories-subtitle">
            {categories.length} catégories au total
          </p>
        </div>
        <div className="categories-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              <span>Nouvelle Catégorie</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            <span>Exporter</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={loadCategories}
            title="Rafraîchir"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "spinning" : ""} />
          </button>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="categories-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher une catégorie..."
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
          <button className="btn btn-secondary" onClick={loadCategories}>
            Réessayer
          </button>
        </div>
      )}

      {/* Contenu */}
      {!loading && !error && (
        <>{viewMode === "grid" ? renderGridView() : renderListView()}</>
      )}

      {/* Pagination */}
      {!loading && !error && filteredCategories.length > itemsPerPage && (
        <div className="categories-pagination">
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
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {editingCategory
                  ? "Modifier la catégorie"
                  : "Ajouter une catégorie"}
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
                <label>Nom de la catégorie *</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  placeholder="Entrez le nom de la catégorie"
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
                  placeholder="Description de la catégorie"
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
                    <Check size={18} />
                    <span>{editingCategory ? "Mettre à jour" : "Ajouter"}</span>
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
              <p>Êtes-vous sûr de vouloir supprimer la catégorie :</p>
              <p className="delete-item-name">
                <strong>"{categoryToDelete?.nom}"</strong>
              </p>
              <p className="delete-warning">
                Cette action est irréversible.
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

export default Categories;