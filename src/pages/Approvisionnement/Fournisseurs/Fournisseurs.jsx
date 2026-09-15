// pages/Fournisseurs/Fournisseurs.jsx
import React, { useState, useEffect } from "react";
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
  Star,
  StarOff,
  ShoppingBasket,
  Banknote,
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

const Fournisseurs = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem('token');

  // État pour les fournisseurs
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState("liste");
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [error, setError] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);

  // État pour le modal
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState(null);
  const [selectedFournisseur, setSelectedFournisseur] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fournisseurToDelete, setFournisseurToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    nom: "",
    telephone: "",
    email: "",
    ville: "",
    pays: "",
    numero_tva: "",
  });

  // Vérifier si l'utilisateur peut gérer les fournisseurs
  const canManage = user && ['admin', 'manager'].includes(user.role);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Charger les fournisseurs
  useEffect(() => {
    if (isAuthenticated && token) {
      loadFournisseurs();
    }
  }, [isAuthenticated, token]);

  const loadFournisseurs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await FournisseurService.getAllFournisseurs(token);
      if (response.success) {
        setFournisseurs(response.data || []);
      } else {
        setError(response.message || 'Erreur lors du chargement des fournisseurs');
      }
    } catch (error) {
      console.error('❌ LoadFournisseurs error:', error);
      setError(error.message || 'Erreur lors du chargement des fournisseurs');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les fournisseurs
  const filteredFournisseurs = fournisseurs.filter((fournisseur) => {
    const matchSearch = 
      fournisseur.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fournisseur.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fournisseur.telephone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fournisseur.ville?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fournisseur.pays?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredFournisseurs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredFournisseurs.length / itemsPerPage);

  // Gestion du formulaire
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Toggle dropdown
  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  // Ouvrir le modal pour ajouter
  const handleAdd = () => {
    setEditingFournisseur(null);
    setFormData({
      nom: "",
      telephone: "",
      email: "",
      ville: "",
      pays: "",
      numero_tva: "",
    });
    setShowModal(true);
  };

  // Ouvrir le modal pour éditer
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
    setShowModal(true);
  };

  // Voir les détails
  const handleView = (fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setShowDetailModal(true);
  };

  // Sauvegarder le fournisseur
  const handleSave = async () => {
    if (!formData.nom.trim()) {
      alert("Veuillez saisir un nom de fournisseur");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        nom: formData.nom.trim(),
        telephone: formData.telephone.trim() || null,
        email: formData.email.trim() || null,
        ville: formData.ville.trim() || null,
        pays: formData.pays.trim() || null,
        numero_tva: formData.numero_tva.trim() || null,
      };

      let response;
      if (editingFournisseur) {
        response = await FournisseurService.updateFournisseur(
          token,
          editingFournisseur.id_fournisseur,
          data
        );
      } else {
        response = await FournisseurService.createFournisseur(token, data);
      }

      if (response.success) {
        await loadFournisseurs();
        setShowModal(false);
        setEditingFournisseur(null);
        setFormData({
          nom: "",
          telephone: "",
          email: "",
          ville: "",
          pays: "",
          numero_tva: "",
        });
      } else {
        setError(response.message || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      setError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Activer/Désactiver un fournisseur
  const handleToggleStatus = async (fournisseur) => {
    if (!canManage || updatingStatus === fournisseur.id_fournisseur) return;
    
    setUpdatingStatus(fournisseur.id_fournisseur);
    setError(null);

    try {
      let response;
      if (fournisseur.actif) {
        response = await FournisseurService.deactivateFournisseur(token, fournisseur.id_fournisseur);
      } else {
        response = await FournisseurService.activateFournisseur(token, fournisseur.id_fournisseur);
      }
      
      if (response.success) {
        // Mise à jour optimiste locale
        setFournisseurs(prevFournisseurs => 
          prevFournisseurs.map(f => 
            f.id_fournisseur === fournisseur.id_fournisseur 
              ? { ...f, actif: !f.actif }
              : f
          )
        );
      } else {
        setError(response.message || 'Erreur lors du changement de statut');
        await loadFournisseurs();
      }
    } catch (error) {
      console.error('❌ Toggle status error:', error);
      setError(error.message || 'Erreur lors du changement de statut');
      await loadFournisseurs();
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Supprimer un fournisseur
  const confirmDelete = (fournisseur) => {
    setFournisseurToDelete(fournisseur);
    setShowDeleteModal(true);
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
        setError(response.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      setError(error.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // Exporter
  const handleExport = async () => {
    try {
      const response = await FournisseurService.exportFournisseurs(token);
      if (response.success && response.data) {
        // Créer un fichier CSV
        const headers = ["ID", "Nom", "Téléphone", "Email", "Ville", "Pays", "TVA", "Actif"];
        const rows = response.data.map(f => [
          f.id,
          f.nom,
          f.telephone || "-",
          f.email || "-",
          f.ville || "-",
          f.pays || "-",
          f.numero_tva || "-",
          f.actif ? "Oui" : "Non"
        ]);
        
        let csv = headers.join(",") + "\n";
        rows.forEach(row => {
          csv += row.map(cell => `"${cell}"`).join(",") + "\n";
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fournisseurs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      alert('Erreur lors de l\'exportation');
    }
  };

  // Recherche
  const handleSearch = async (keyword) => {
    setSearchTerm(keyword);
    setCurrentPage(1);
    
    if (!keyword || keyword.length < 2) {
      await loadFournisseurs();
      return;
    }

    try {
      const response = await FournisseurService.searchFournisseurs(token, keyword);
      if (response.success) {
        setFournisseurs(response.data || []);
      }
    } catch (error) {
      console.error('❌ Search error:', error);
    }
  };

  // Statistiques
  const getStats = () => {
    const total = fournisseurs.length;
    const actifs = fournisseurs.filter(f => f.actif === 1 || f.actif === true).length;
    const inactifs = fournisseurs.filter(f => f.actif === 0 || f.actif === false).length;
    
    const paysSet = new Set();
    fournisseurs.forEach(f => {
      if (f.pays) paysSet.add(f.pays);
    });
    
    const villesSet = new Set();
    fournisseurs.forEach(f => {
      if (f.ville) villesSet.add(f.ville);
    });
    
    return { total, actifs, inactifs, pays: paysSet.size, villes: villesSet.size };
  };

  const stats = getStats();

  // Rendu des étoiles
  const renderStars = (note = 3) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= note) {
        stars.push(<Star key={i} size={16} className="star-filled" />);
      } else {
        stars.push(<StarOff key={i} size={16} className="star-empty" />);
      }
    }
    return <div className="stars">{stars}</div>;
  };

  // Rendu vue grille
  const renderGridView = () => (
    <div className="fournisseurs-grid">
      {currentItems.length === 0 ? (
        <div className="empty-state">
          <Building size={48} className="empty-icon" />
          <p>Aucun fournisseur trouvé</p>
        </div>
      ) : (
        currentItems.map((fournisseur) => (
          <div key={fournisseur.id_fournisseur} className="fournisseur-card">
            <div className="fournisseur-card-header">
              <div className="fournisseur-avatar">
                <span>{fournisseur.nom?.charAt(0).toUpperCase() || 'F'}</span>
              </div>
              <div className="fournisseur-card-actions">
                <button
                  className="action-btn btn-view"
                  onClick={() => handleView(fournisseur)}
                  title="Voir les détails"
                >
                  <Eye size={16} />
                </button>
                {canManage && (
                  <>
                    <button
                      className={`action-btn btn-status ${updatingStatus === fournisseur.id_fournisseur ? 'loading' : ''}`}
                      onClick={() => handleToggleStatus(fournisseur)}
                      title={fournisseur.actif ? 'Désactiver' : 'Activer'}
                      disabled={updatingStatus === fournisseur.id_fournisseur}
                    >
                      {updatingStatus === fournisseur.id_fournisseur ? (
                        <span className="spinner-small"></span>
                      ) : fournisseur.actif ? (
                        <ToggleRight size={18} color="#22c55e" />
                      ) : (
                        <ToggleLeft size={18} color="#6b7280" />
                      )}
                    </button>
                    <button
                      className="action-btn btn-edit"
                      onClick={() => handleEdit(fournisseur)}
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="action-btn btn-delete"
                      onClick={() => confirmDelete(fournisseur)}
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
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
            </div>
            <div className="fournisseur-card-footer">
              <span className={`status-badge ${fournisseur.actif ? 'active' : 'inactive'}`}>
                {fournisseur.actif ? 'Actif' : 'Inactif'}
              </span>
              <span className="fournisseur-date">
                {fournisseur.date_creation ? new Date(fournisseur.date_creation).toLocaleDateString('fr-FR') : '-'}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Rendu vue liste avec menu à trois points
  const renderListView = () => (
    <div className="fournisseurs-table-container">
      <table className="fournisseurs-table">
        <thead>
          <tr>
            <th>ID</th>
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
            currentItems.map((fournisseur) => (
              <tr key={fournisseur.id_fournisseur}>
                <td className="id-cell">#{fournisseur.id_fournisseur}</td>
                <td className="name-cell">
                  <div className="fournisseur-name-cell">
                    <Building size={16} />
                    <span>{fournisseur.nom}</span>
                  </div>
                </td>
                <td>{fournisseur.telephone || '-'}</td>
                <td>{fournisseur.email || '-'}</td>
                <td>{fournisseur.ville || '-'}</td>
                <td>{fournisseur.pays || '-'}</td>
                <td>
                  <span 
                    className={`status-badge ${fournisseur.actif ? 'active' : 'inactive'}`}
                    style={{ cursor: canManage ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (canManage) handleToggleStatus(fournisseur);
                    }}
                  >
                    {fournisseur.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="actions-cell">
                  <div className="">
                    <button
                      className="dropdown-trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(fournisseur.id_fournisseur);
                      }}
                      title="Actions"
                    >
                      <MoreVertical size={18} />
                    </button>
                    
                    {openDropdown === fournisseur.id_fournisseur && (
                      <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            handleView(fournisseur);
                            setOpenDropdown(null);
                          }}
                        >
                          <Eye size={16} />
                          <span>Voir</span>
                        </button>
                        {canManage && (
                          <>
                            <button
                              className="dropdown-item"
                              onClick={() => {
                                handleToggleStatus(fournisseur);
                                setOpenDropdown(null);
                              }}
                              disabled={updatingStatus === fournisseur.id_fournisseur}
                            >
                              {fournisseur.actif ? (
                                <>
                                  <ToggleLeft size={16} />
                                  <span>Désactiver</span>
                                </>
                              ) : (
                                <>
                                  <ToggleRight size={16} />
                                  <span>Activer</span>
                                </>
                              )}
                            </button>
                            <button
                              className="dropdown-item"
                              onClick={() => {
                                handleEdit(fournisseur);
                                setOpenDropdown(null);
                              }}
                            >
                              <Edit size={16} />
                              <span>Modifier</span>
                            </button>
                            <hr className="dropdown-divider" />
                            <button
                              className="dropdown-item danger"
                              onClick={() => {
                                confirmDelete(fournisseur);
                                setOpenDropdown(null);
                              }}
                            >
                              <Trash2 size={16} />
                              <span>Supprimer</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Loader
  const LoaderComponent = () => (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Chargement des fournisseurs...</p>
    </div>
  );

  return (
    <div className="fournisseurs-container">
      {/* En-tête */}
      <div className="fournisseurs-header">
        <div>
          <h1 className="fournisseurs-title">Gestion des Fournisseurs</h1>
          <p className="fournisseurs-subtitle">
            {stats.total} fournisseurs au total
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
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="fournisseurs-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <Building size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">
            <Check size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Actifs</span>
            <span className="stat-value">{stats.actifs}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon inactive">
            <X size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Inactifs</span>
            <span className="stat-value">{stats.inactifs}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orders">
            <Globe size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Pays</span>
            <span className="stat-value">{stats.pays}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amount">
            <MapPin size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Villes</span>
            <span className="stat-value">{stats.villes}</span>
          </div>
        </div>

      </div>

      {/* Filtres et recherche */}
      <div className="fournisseurs-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher un fournisseur (nom, email, téléphone, ville...)"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="search-clear"
              onClick={() => handleSearch('')}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Vue grille"
          >
            <Grid size={18} />
          </button>
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
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
        <>
          {viewMode === 'grid' ? renderGridView() : renderListView()}
        </>
      )}

      {/* Pagination */}
      {!loading && !error && filteredFournisseurs.length > itemsPerPage && (
        <div className="fournisseurs-pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="pagination-info">
            Page {currentPage} sur {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Modal d'ajout/édition */}
      {showModal && (
        <div className="modal-overlay" >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingFournisseur ? "Modifier le fournisseur" : "Ajouter un fournisseur"}</h2>
              <button className="modal-close" onClick={() => !saving && setShowModal(false)}>
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
                className="btn btn-secondary" 
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Annuler
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSave}
                disabled={saving}
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
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Détails du fournisseur</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <div className="detail-header-left">
                  <div className="detail-avatar">
                    <span style={{ fontSize: 24, fontWeight: 'bold' }}>
                      {selectedFournisseur.nom?.charAt(0).toUpperCase() || 'F'}
                    </span>
                  </div>
                  <div>
                    <h3 className="detail-nom">{selectedFournisseur.nom}</h3>
                    <span className={`status-badge ${selectedFournisseur.actif ? 'active' : 'inactive'}`}>
                      {selectedFournisseur.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
                <div className="detail-header-right">
                  <span className="detail-date">
                    {selectedFournisseur.date_creation ? 
                      `Créé le ${new Date(selectedFournisseur.date_creation).toLocaleDateString('fr-FR')}` : 
                      '-'
                    }
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
                    <span>{selectedFournisseur.numero_tva || '-'}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Coordonnées</h4>
                  <div className="detail-item">
                    <label>Email</label>
                    <span>{selectedFournisseur.email || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Téléphone</label>
                    <span>{selectedFournisseur.telephone || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Ville</label>
                    <span>{selectedFournisseur.ville || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Pays</label>
                    <span>{selectedFournisseur.pays || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDetailModal(false)}
              >
                Fermer
              </button>
              {canManage && (
                <button 
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
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmer la suppression</h2>
              <button className="modal-close" onClick={() => !deleting && setShowDeleteModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <p>Êtes-vous sûr de vouloir supprimer le fournisseur :</p>
              <p className="delete-item-name">
                <strong>"{fournisseurToDelete?.nom}"</strong>
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Annuler
              </button>
              <button 
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