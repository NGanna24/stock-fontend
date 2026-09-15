// pages/Modeles/Modeles.jsx
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
  Cpu,
  Save,
  MoreVertical,
} from "lucide-react";
import ModeleService from "../../services/modeleService";
import { useUser } from "../../context/AuthContext";
import "./Modeles.css";

const INITIAL_FORM_DATA = {
  nom: "",
};

const Modeles = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem("token");

  // ========== ÉTATS PRINCIPAUX ==========
  const [modeles, setModeles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState("list");
  const [openDropdown, setOpenDropdown] = useState(null);

  // ========== MODAL AJOUT/ÉDITION ==========
  const [showModal, setShowModal] = useState(false);
  const [editingModele, setEditingModele] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);

  // ========== MODAL SUPPRESSION ==========
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modeleToDelete, setModeleToDelete] = useState(null);
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

  // ========== CHARGEMENT DES MODÈLES ==========
  const loadModeles = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const response = await ModeleService.getAllModeles(token);
      if (response.success) {
        setModeles(response.data || []);
      } else {
        setError(response.message || "Erreur lors du chargement des modèles");
      }
    } catch (err) {
      console.error("❌ LoadModeles error:", err);
      setError(err.message || "Erreur lors du chargement des modèles");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadModeles();
    }
  }, [isAuthenticated, token, loadModeles]);

  // ========== FILTRAGE LOCAL ==========
  const filteredModeles = useMemo(() => {
    if (!searchTerm) return modeles;
    const term = searchTerm.toLowerCase();
    return modeles.filter((modele) => modele.nom?.toLowerCase().includes(term));
  }, [modeles, searchTerm]);

  // ========== PAGINATION ==========
  const { currentItems, totalPages } = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return {
      currentItems: filteredModeles.slice(indexOfFirstItem, indexOfLastItem),
      totalPages: Math.ceil(filteredModeles.length / itemsPerPage),
    };
  }, [filteredModeles, currentPage, itemsPerPage]);

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
    setEditingModele(null);
    setFormData(INITIAL_FORM_DATA);
    setError(null);
    setShowModal(true);
  };

  const handleEdit = (modele) => {
    setEditingModele(modele);
    setFormData({
      nom: modele.nom || "",
    });
    setError(null);
    setShowModal(true);
    setOpenDropdown(null);
  };

  const handleSave = async () => {
    if (!formData.nom.trim()) {
      setError("Veuillez saisir un nom de modèle");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        nom: formData.nom.trim(),
      };

      const response = editingModele
        ? await ModeleService.updateModele(token, editingModele.id_modele, data)
        : await ModeleService.createModele(token, data);

      if (response.success) {
        await loadModeles();
        setShowModal(false);
        setEditingModele(null);
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
  const confirmDelete = (modele) => {
    setModeleToDelete(modele);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleDelete = async () => {
    if (!modeleToDelete) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await ModeleService.deleteModele(
        token,
        modeleToDelete.id_modele
      );

      if (response.success) {
        await loadModeles();
        setShowDeleteModal(false);
        setModeleToDelete(null);
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
      const response = await ModeleService.exportModeles(token);
      if (response.success && response.data) {
        const blob = new Blob([response.data], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `modeles_${new Date().toISOString().split("T")[0]}.csv`;
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
  const renderDropdown = (modele, keyPrefix = "") => {
    const key = `${keyPrefix}${modele.id_modele}`;
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
                onClick={() => handleEdit(modele)}
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
                  onClick={() => confirmDelete(modele)}
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
    <div className="modeles-grid">
      {currentItems.length === 0 ? (
        <div className="empty-state-full">
          <Cpu size={48} />
          <p>Aucun modèle trouvé</p>
          <span>Essayez de modifier votre recherche</span>
        </div>
      ) : (
        currentItems.map((modele) => (
          <div key={modele.id_modele} className="modele-card">
            <div className="modele-card-header">
              <div className="modele-icon">
                <Cpu size={28} />
              </div>
              <div className="modele-actions">
                {canManage && renderDropdown(modele, "grid-")}
              </div>
            </div>

            <div className="modele-card-body">
              <h3 className="modele-name">{modele.nom}</h3>
            </div>

            <div className="modele-card-footer">
              <span className="modele-id">ID: #{modele.id_modele}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ========== VUE LISTE ==========
  const renderListView = () => (
    <div className="modeles-table-container">
      <table className="modeles-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th className="actions-header">Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.length === 0 ? (
            <tr>
              <td colSpan="3" className="empty-state">
                <p>Aucun modèle trouvé</p>
              </td>
            </tr>
          ) : (
            currentItems.map((modele) => (
              <tr key={modele.id_modele}>
                <td className="id-cell">#{modele.id_modele}</td>
                <td className="name-cell">
                  <div className="modele-name-with-icon">
                    <Cpu size={18} className="modele-icon-small" />
                    <span>{modele.nom}</span>
                  </div>
                </td>
                <td className="actions-cell">
                  {renderDropdown(modele, "list-")}
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
      <p>Chargement des modèles...</p>
    </div>
  );

  // ========== RENDER ==========
  return (
    <div className="modeles-container">
      {/* En-tête */}
      <div className="modeles-header">
        <div>
          <h1 className="modeles-title">Gestion des Modèles</h1>
          <p className="modeles-subtitle">{modeles.length} modèles au total</p>
        </div>
        <div className="modeles-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              <span>Nouveau Modèle</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            <span>Exporter</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={loadModeles}
            title="Rafraîchir"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "spinning" : ""} />
          </button>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="modeles-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher un modèle..."
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
          <button className="btn btn-secondary" onClick={loadModeles}>
            Réessayer
          </button>
        </div>
      )}

      {/* Contenu */}
      {!loading && !error && (
        <>{viewMode === "grid" ? renderGridView() : renderListView()}</>
      )}

      {/* Pagination */}
      {!loading && !error && filteredModeles.length > itemsPerPage && (
        <div className="modeles-pagination">
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
                {editingModele ? "Modifier le modèle" : "Ajouter un modèle"}
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
                <label>Nom du modèle *</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  placeholder="Entrez le nom du modèle (ex: Galaxy S24, iPhone 15)"
                  disabled={saving}
                  maxLength={100}
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
                    <span>{editingModele ? "Mettre à jour" : "Ajouter"}</span>
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
              <p>Êtes-vous sûr de vouloir supprimer le modèle :</p>
              <p className="delete-item-name">
                <strong>"{modeleToDelete?.nom}"</strong>
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

export default Modeles;