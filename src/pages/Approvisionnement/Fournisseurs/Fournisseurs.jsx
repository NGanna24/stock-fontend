// pages/Fournisseurs/Fournisseurs.jsx
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
  Eye,
  Building,
  Mail,
  Phone,
  MapPin,
  Globe,
  CreditCard,
  RefreshCw,
  Grid,
  List,
  ToggleLeft,
  ToggleRight,
  MoreVertical,
} from "lucide-react";
import FournisseurService from "../../../services/fournisseurService";
import { useUser } from "../../../context/AuthContext";
import "./Fournisseurs.css";

const INITIAL_FORM_DATA = {
  nom: "",
  telephone: "",
  email: "",
  ville: "",
  pays: "",
  numero_tva: "",
};

const Fournisseurs = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem("token");

  // ========== ÉTATS PRINCIPAUX ==========
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState("list");
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);

  // ========== MODAL AJOUT/ÉDITION ==========
  const [showModal, setShowModal] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);

  // ========== MODAL DÉTAILS ==========
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState(null);

  // ========== MODAL SUPPRESSION ==========
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fournisseurToDelete, setFournisseurToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ========== ERREUR ==========
  const [error, setError] = useState(null);

  // ========== PERMISSIONS ==========
  const canManage = user && ["admin", "manager"].includes(user.role);

  // ========== FERMER LE DROPDOWN AU CLIC EXTÉRIEUR ==========
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        e.target.closest(".dropdown-trigger") ||
        e.target.closest(".dropdown-menu")
      ) {
        return;
      }
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
        if (showDetailModal) setShowDetailModal(false);
        setOpenDropdown(null);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showModal, saving, showDeleteModal, deleting, showDetailModal]);

  // ========== CHARGEMENT DES FOURNISSEURS ==========
  const loadFournisseurs = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const response = await FournisseurService.getAllFournisseurs(token);
      if (response.success) {
        setFournisseurs(response.data || []);
      } else {
        setError(response.message || "Erreur lors du chargement des fournisseurs");
      }
    } catch (err) {
      console.error("❌ LoadFournisseurs error:", err);
      setError(err.message || "Erreur lors du chargement des fournisseurs");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadFournisseurs();
    }
  }, [isAuthenticated, token, loadFournisseurs]);

  // ========== FILTRAGE LOCAL ==========
  const filteredFournisseurs = useMemo(() => {
    if (!searchTerm) return fournisseurs;
    const term = searchTerm.toLowerCase();
    return fournisseurs.filter(
      (f) =>
        f.nom?.toLowerCase().includes(term) ||
        f.email?.toLowerCase().includes(term) ||
        f.telephone?.toLowerCase().includes(term) ||
        f.ville?.toLowerCase().includes(term) ||
        f.pays?.toLowerCase().includes(term)
    );
  }, [fournisseurs, searchTerm]);

  // ========== PAGINATION ==========
  const { currentItems, totalPages } = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return {
      currentItems: filteredFournisseurs.slice(indexOfFirstItem, indexOfLastItem),
      totalPages: Math.ceil(filteredFournisseurs.length / itemsPerPage),
    };
  }, [filteredFournisseurs, currentPage, itemsPerPage]);

  // Reset page si elle dépasse le total
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // ========== TOGGLE DROPDOWN ==========
  const toggleDropdown = (id) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  };

  // ========== HANDLERS FORMULAIRE ==========
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = () => {
    setEditingFournisseur(null);
    setFormData(INITIAL_FORM_DATA);
    setError(null);
    setShowModal(true);
  };

  const handleEdit = (fournisseur) => {
    setEditingFournisseur(fournisseur);
    setFormData({
      nom: fournisseur.nom || "",
      telephone: fournisseur.telephone || "",
      email: fournisseur.email || "",
      ville: fournisseur.ville || "",
      pays: fournisseur.pays || "",
      numero_tva: fournisseur.numero_tva || "",
    });
    setError(null);
    setShowModal(true);
    setOpenDropdown(null);
  };

  const handleView = (fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setShowDetailModal(true);
    setOpenDropdown(null);
  };

  const handleSave = async () => {
    if (!formData.nom.trim()) {
      setError("Veuillez saisir un nom de fournisseur");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        nom: formData.nom.trim(),
        telephone: formData.telephone?.trim() || null,
        email: formData.email?.trim() || null,
        ville: formData.ville?.trim() || null,
        pays: formData.pays?.trim() || null,
        numero_tva: formData.numero_tva?.trim() || null,
      };

      const response = editingFournisseur
        ? await FournisseurService.updateFournisseur(
            token,
            editingFournisseur.id_fournisseur,
            data
          )
        : await FournisseurService.createFournisseur(token, data);

      if (response.success) {
        await loadFournisseurs();
        setShowModal(false);
        setEditingFournisseur(null);
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
  const handleToggleStatus = async (fournisseur) => {
    if (!canManage || updatingStatus === fournisseur.id_fournisseur) return;

    setUpdatingStatus(fournisseur.id_fournisseur);
    setError(null);

    try {
      let response;
      if (fournisseur.actif) {
        response = await FournisseurService.deactivateFournisseur(
          token,
          fournisseur.id_fournisseur
        );
      } else {
        response = await FournisseurService.activateFournisseur(
          token,
          fournisseur.id_fournisseur
        );
      }

      if (response.success) {
        setFournisseurs((prev) =>
          prev.map((f) =>
            f.id_fournisseur === fournisseur.id_fournisseur
              ? { ...f, actif: !f.actif }
              : f
          )
        );
      } else {
        setError(response.message || "Erreur lors du changement de statut");
        await loadFournisseurs();
      }
    } catch (err) {
      console.error("❌ Toggle status error:", err);
      setError(err.message || "Erreur lors du changement de statut");
      await loadFournisseurs();
    } finally {
      setUpdatingStatus(null);
    }
  };

  // ========== SUPPRESSION ==========
  const confirmDelete = (fournisseur) => {
    setFournisseurToDelete(fournisseur);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleDelete = async () => {
    if (!fournisseurToDelete) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await FournisseurService.deleteFournisseur(
        token,
        fournisseurToDelete.id_fournisseur
      );

      if (response.success) {
        await loadFournisseurs();
        setShowDeleteModal(false);
        setFournisseurToDelete(null);
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
      const response = await FournisseurService.exportFournisseurs(token);
      if (response.success && response.data) {
        const headers = ["N°", "Nom", "Téléphone", "Email", "Ville", "Pays", "TVA", "Actif"];
        const rows = response.data.map((f, index) => [
          (index + 1).toString().padStart(3, "0"),
          f.nom,
          f.telephone || "-",
          f.email || "-",
          f.ville || "-",
          f.pays || "-",
          f.numero_tva || "-",
          f.actif ? "Oui" : "Non",
        ]);

        let csv = headers.join(",") + "\n";
        rows.forEach((row) => {
          csv += row.map((cell) => `"${cell}"`).join(",") + "\n";
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `fournisseurs_${new Date().toISOString().split("T")[0]}.csv`;
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

  // ========== BADGE DE STATUT ==========
  const renderStatusBadge = (fournisseur) => (
    <span
      className={`status-badge ${
        fournisseur.actif ? "active" : "inactive"
      } ${updatingStatus === fournisseur.id_fournisseur ? "updating" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        if (canManage) handleToggleStatus(fournisseur);
      }}
      style={{ cursor: canManage ? "pointer" : "default" }}
    >
      {updatingStatus === fournisseur.id_fournisseur ? (
        <span className="spinner-small"></span>
      ) : fournisseur.actif ? (
        "Actif"
      ) : (
        "Inactif"
      )}
    </span>
  );

  // ========== MENU DROPDOWN (UNIFIÉ) ==========
  const renderDropdown = (fournisseur, keyPrefix = "") => {
    const key = `${keyPrefix}${fournisseur.id_fournisseur}`;
    const isOpen = openDropdown === key;

    return (
      <div className="dropdown-container">
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
            <button
              type="button"
              className="dropdown-item"
              role="menuitem"
              onClick={() => handleView(fournisseur)}
            >
              <Eye size={16} />
              <span>Voir</span>
            </button>

            {canManage && (
              <>
                <button
                  type="button"
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    handleToggleStatus(fournisseur);
                    setOpenDropdown(null);
                  }}
                  disabled={updatingStatus === fournisseur.id_fournisseur}
                >
                  {updatingStatus === fournisseur.id_fournisseur ? (
                    <span className="spinner-small"></span>
                  ) : fournisseur.actif ? (
                    <ToggleLeft size={16} color="#64748B" />
                  ) : (
                    <ToggleRight size={16} color="#16A34A" />
                  )}
                  <span>{fournisseur.actif ? "Désactiver" : "Activer"}</span>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => handleEdit(fournisseur)}
                >
                  <Edit size={16} />
                  <span>Modifier</span>
                </button>

                <hr className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item danger"
                  role="menuitem"
                  onClick={() => confirmDelete(fournisseur)}
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
    <div className="fournisseurs-grid">
      {currentItems.length === 0 ? (
        <div className="empty-state-full">
          <Building size={48} />
          <p>Aucun fournisseur trouvé</p>
          <span>Essayez de modifier votre recherche</span>
        </div>
      ) : (
        currentItems.map((fournisseur, index) => (
          <div key={fournisseur.id_fournisseur} className="fournisseur-card">
            <div className="fournisseur-card-header">
              <div className="fournisseur-avatar">
                <span>{fournisseur.nom?.charAt(0).toUpperCase() || "F"}</span>
              </div>
              <div className="fournisseur-actions">
                <span className="fournisseur-index-badge">
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </span>
                {canManage && renderDropdown(fournisseur, "grid-")}
              </div>
            </div>

            <div className="fournisseur-card-body">
              <h3 className="fournisseur-name">{fournisseur.nom}</h3>
              <div className="fournisseur-contact">
                {fournisseur.telephone && (
                  <span className="contact-item">
                    <Phone size={14} />
                    {fournisseur.telephone}
                  </span>
                )}
                {fournisseur.email && (
                  <span className="contact-item">
                    <Mail size={14} />
                    {fournisseur.email}
                  </span>
                )}
                {fournisseur.ville && (
                  <span className="contact-item">
                    <MapPin size={14} />
                    {fournisseur.ville}
                  </span>
                )}
                {fournisseur.pays && (
                  <span className="contact-item">
                    <Globe size={14} />
                    {fournisseur.pays}
                  </span>
                )}
                {fournisseur.numero_tva && (
                  <span className="contact-item">
                    <CreditCard size={14} />
                    {fournisseur.numero_tva}
                  </span>
                )}
              </div>
              <div className="fournisseur-status">
                {renderStatusBadge(fournisseur)}
              </div>
            </div>

            <div className="fournisseur-card-footer">
              <span className="fournisseur-date">
                Créé le{" "}
                {fournisseur.date_creation
                  ? new Date(fournisseur.date_creation).toLocaleDateString("fr-FR")
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
    <div className="fournisseurs-table-container">
      <table className="fournisseurs-table">
        <thead>
          <tr>
            <th className="num-col">N°</th>
            <th>Nom</th>
            <th>Téléphone</th>
            <th>Email</th>
            <th>Ville</th>
            <th>Pays</th>
            <th>Statut</th>
            <th className="actions-header">Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.length === 0 ? (
            <tr>
              <td colSpan="8" className="empty-state">
                <p>Aucun fournisseur trouvé</p>
              </td>
            </tr>
          ) : (
            currentItems.map((fournisseur, index) => (
              <tr key={fournisseur.id_fournisseur}>
                <td className="num-cell">
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </td>
                <td className="name-cell">
                  <div className="fournisseur-name-with-avatar">
                    <span className="fournisseur-avatar-small">
                      {fournisseur.nom?.charAt(0).toUpperCase() || "F"}
                    </span>
                    <span>{fournisseur.nom}</span>
                  </div>
                </td>
                <td>{fournisseur.telephone || "-"}</td>
                <td>{fournisseur.email || "-"}</td>
                <td>{fournisseur.ville || "-"}</td>
                <td>{fournisseur.pays || "-"}</td>
                <td>{renderStatusBadge(fournisseur)}</td>
                <td className="actions-cell">
                  {renderDropdown(fournisseur, "list-")}
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
      <p>Chargement des fournisseurs...</p>
    </div>
  );

  // ========== RENDER ==========
  return (
    <div className="fournisseurs-container">
      {/* En-tête */}
      <div className="fournisseurs-header">
        <div>
          <h1 className="fournisseurs-title">Gestion des Fournisseurs</h1>
          <p className="fournisseurs-subtitle">
            {fournisseurs.length} fournisseurs au total
          </p>
        </div>
        <div className="fournisseurs-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              <span>Nouveau Fournisseur</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            <span>Exporter</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={loadFournisseurs}
            title="Rafraîchir"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "spinning" : ""} />
          </button>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="fournisseurs-filters">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Rechercher un fournisseur (nom, email, téléphone, ville...)"
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
          <button className="btn btn-secondary" onClick={loadFournisseurs}>
            Réessayer
          </button>
        </div>
      )}

      {/* Contenu */}
      {!loading && !error && (
        <>{viewMode === "grid" ? renderGridView() : renderListView()}</>
      )}

      {/* Pagination */}
      {!loading && !error && filteredFournisseurs.length > itemsPerPage && (
        <div className="fournisseurs-pagination">
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
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingFournisseur
                  ? "Modifier le fournisseur"
                  : "Ajouter un fournisseur"}
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
                <label>Nom du fournisseur *</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  placeholder="Entrez le nom du fournisseur"
                  disabled={saving}
                  maxLength={100}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Téléphone</label>
                  <input
                    type="text"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleInputChange}
                    placeholder="Entrez le téléphone"
                    disabled={saving}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Entrez l'email"
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ville</label>
                  <input
                    type="text"
                    name="ville"
                    value={formData.ville}
                    onChange={handleInputChange}
                    placeholder="Entrez la ville"
                    disabled={saving}
                  />
                </div>
                <div className="form-group">
                  <label>Pays</label>
                  <input
                    type="text"
                    name="pays"
                    value={formData.pays}
                    onChange={handleInputChange}
                    placeholder="Entrez le pays"
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Numéro de TVA</label>
                <input
                  type="text"
                  name="numero_tva"
                  value={formData.numero_tva}
                  onChange={handleInputChange}
                  placeholder="Entrez le numéro de TVA"
                  disabled={saving}
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
                    <span>{editingFournisseur ? "Mettre à jour" : "Ajouter"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedFournisseur && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div
            className="modal-content large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Détails du fournisseur</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowDetailModal(false)}
                aria-label="Fermer"
              >
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <div className="detail-header-left">
                  <div className="detail-avatar">
                    <span style={{ fontSize: 24, fontWeight: "bold" }}>
                      {selectedFournisseur.nom?.charAt(0).toUpperCase() || "F"}
                    </span>
                  </div>
                  <div>
                    <h3 className="detail-nom">{selectedFournisseur.nom}</h3>
                    <span
                      className={`status-badge ${
                        selectedFournisseur.actif ? "active" : "inactive"
                      }`}
                    >
                      {selectedFournisseur.actif ? "Actif" : "Inactif"}
                    </span>
                  </div>
                </div>
                <div className="detail-header-right">
                  <span className="detail-date">
                    {selectedFournisseur.date_creation
                      ? `Créé le ${new Date(
                          selectedFournisseur.date_creation
                        ).toLocaleDateString("fr-FR")}`
                      : "-"}
                  </span>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-section">
                  <h4>Informations générales</h4>
                  <div className="detail-item">
                    <label>Nom</label>
                    <span>{selectedFournisseur.nom}</span>
                  </div>
                  <div className="detail-item">
                    <label>Numéro TVA</label>
                    <span>{selectedFournisseur.numero_tva || "-"}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Coordonnées</h4>
                  <div className="detail-item">
                    <label>Email</label>
                    <span>{selectedFournisseur.email || "-"}</span>
                  </div>
                  <div className="detail-item">
                    <label>Téléphone</label>
                    <span>{selectedFournisseur.telephone || "-"}</span>
                  </div>
                  <div className="detail-item">
                    <label>Ville</label>
                    <span>{selectedFournisseur.ville || "-"}</span>
                  </div>
                  <div className="detail-item">
                    <label>Pays</label>
                    <span>{selectedFournisseur.pays || "-"}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDetailModal(false)}
              >
                Fermer
              </button>
              {canManage && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowDetailModal(false);
                    handleEdit(selectedFournisseur);
                  }}
                >
                  <Edit size={18} />
                  <span>Modifier</span>
                </button>
              )}
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
              <p>Êtes-vous sûr de vouloir supprimer le fournisseur :</p>
              <p className="delete-item-name">
                <strong>"{fournisseurToDelete?.nom}"</strong>
              </p>
              <p className="delete-warning">Cette action est irréversible.</p>
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

export default Fournisseurs;