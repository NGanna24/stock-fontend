// pages/Entrees/Entrees.jsx
import React, { useState, useEffect } from "react";
import { useUser } from "../../../context/AuthContext"; 
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
  ArrowDownCircle,
  Package,
  Calendar,
  Truck,
  User, 
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Banknote,
  Building,
  Box,
  List,
  Grid,
  Printer,
  Filter,
  Barcode,
  MapPin,
  Hash,
  PackageCheck,
  ClipboardList,
  Loader2,
  Save,
  AlertTriangle
} from "lucide-react";
import "./Entrees.css";

const Entrees = () => {
  const { user } = useUser();
  
  const [loading, setLoading] = useState(false);
  const [entrees, setEntrees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState("tous");
  const [viewMode, setViewMode] = useState("list");

  // États des modals
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingEntree, setEditingEntree] = useState(null);
  const [selectedEntree, setSelectedEntree] = useState(null);

  // État du formulaire - Adapté aux besoins d'entrée en stock
  const [formData, setFormData] = useState({
    // Informations produit
    reference: '',
    designation: '',
    sku: '',
    
    // Quantité
    quantite_recue: '',
    quantite_commandee: '',
    ecart: '',
    etat_marchandise: 'bon',
    
    // Documents et origines
    num_bon_livraison: '',
    fournisseur: '',
    date_reception: new Date().toISOString().split('T')[0],
    
    // Stockage
    emplacement: '',
    rayon: '',
    etagere: '',
    num_lot: '',
    date_peremption: '',
    
    // Notes
    notes: '',
    statut: 'en_attente'
  });

  const [errors, setErrors] = useState({});
  const [fournisseurs, setFournisseurs] = useState([]);
  const [produits, setProduits] = useState([]);

  // Données initiales
  useEffect(() => {
    const mockFournisseurs = [
      { id: 1, nom: "TechPro Distribution" },
      { id: 2, nom: "Office Supplies SARL" },
      { id: 3, nom: "Electro World" },
      { id: 4, nom: "LogiTech Solutions" },
    ];
    setFournisseurs(mockFournisseurs);

    const mockProduits = [
      { id: 1, nom: "Laptop Dell XPS 13", code: "DEL-XPS-13", prixUnitaire: 1200.00 },
      { id: 2, nom: "Souris Logitech MX", code: "LOG-MX-3", prixUnitaire: 45.00 },
      { id: 3, nom: "Écran Samsung 27\"", code: "SAM-27-4K", prixUnitaire: 399.99 },
      { id: 4, nom: "Chaise ergonomique", code: "CHA-ERG-01", prixUnitaire: 299.99 },
      { id: 5, nom: "Tablette Samsung Galaxy", code: "SAM-GAL-TAB", prixUnitaire: 699.99 },
    ];
    setProduits(mockProduits);

    // Mock données d'entrées
    const mockEntrees = [
      {
        id: 1,
        reference: "REF-001",
        designation: "Laptop Dell XPS 13",
        sku: "DEL-XPS-13",
        quantite_recue: 5,
        quantite_commandee: 5,
        ecart: 0,
        etat_marchandise: "bon",
        num_bon_livraison: "BL-2024-001",
        fournisseur: "TechPro Distribution",
        date_reception: "2024-01-15",
        emplacement: "Entrepôt A",
        rayon: "Rayon 3",
        etagere: "Étagère B2",
        num_lot: "LOT-2024-001",
        date_peremption: "2025-01-15",
        notes: "Réapprovisionnement mensuel",
        statut: "valide",
        dateCreation: "2024-01-15",
        validePar: "Admin",
        dateValidation: "2024-01-15"
      },
      {
        id: 2,
        reference: "REF-002",
        designation: "Souris Logitech MX",
        sku: "LOG-MX-3",
        quantite_recue: 20,
        quantite_commandee: 25,
        ecart: -5,
        etat_marchandise: "partiel",
        num_bon_livraison: "BL-2024-002",
        fournisseur: "Office Supplies SARL",
        date_reception: "2024-01-20",
        emplacement: "Entrepôt B",
        rayon: "Rayon 1",
        etagere: "Étagère A3",
        num_lot: "",
        date_peremption: "",
        notes: "Commande partielle - 5 articles manquants",
        statut: "en_attente",
        dateCreation: "2024-01-20",
        validePar: null,
        dateValidation: null
      }
    ];
    setEntrees(mockEntrees);
  }, []);

  // Calcul automatique de l'écart
  useEffect(() => {
    if (formData.quantite_commandee && formData.quantite_recue) {
      const ecart = parseFloat(formData.quantite_recue) - parseFloat(formData.quantite_commandee);
      setFormData(prev => ({
        ...prev,
        ecart: ecart !== 0 ? ecart : ''
      }));
    }
  }, [formData.quantite_commandee, formData.quantite_recue]);

  // Filtrer les entrées
  const filteredEntrees = entrees.filter((entree) => {
    const matchSearch = 
      entree.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entree.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entree.fournisseur?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entree.num_bon_livraison?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "tous" || entree.statut === filterStatus;
    return matchSearch && matchStatus;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEntrees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEntrees.length / itemsPerPage);

  // Gestion du formulaire
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validation du formulaire
  const validateForm = () => {
    const newErrors = {};
    if (!formData.reference) newErrors.reference = 'La référence est obligatoire';
    if (!formData.designation) newErrors.designation = 'La désignation est obligatoire';
    if (!formData.quantite_recue || formData.quantite_recue <= 0) {
      newErrors.quantite_recue = 'La quantité reçue est obligatoire et doit être > 0';
    }
    if (!formData.fournisseur) newErrors.fournisseur = 'Le fournisseur est obligatoire';
    if (!formData.num_bon_livraison) newErrors.num_bon_livraison = 'Le numéro de BL est obligatoire';
    if (!formData.emplacement) newErrors.emplacement = 'L\'emplacement est obligatoire';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Ouvrir le modal pour ajouter
  const handleAdd = () => {
    setEditingEntree(null);
    setFormData({
      reference: '',
      designation: '',
      sku: '',
      quantite_recue: '',
      quantite_commandee: '',
      ecart: '',
      etat_marchandise: 'bon',
      num_bon_livraison: '',
      fournisseur: '',
      date_reception: new Date().toISOString().split('T')[0],
      emplacement: '',
      rayon: '',
      etagere: '',
      num_lot: '',
      date_peremption: '',
      notes: '',
      statut: 'en_attente'
    });
    setErrors({});
    setShowModal(true);
  };

  // Ouvrir le modal pour éditer
  const handleEdit = (entree) => {
    setEditingEntree(entree);
    setFormData({
      reference: entree.reference || '',
      designation: entree.designation || '',
      sku: entree.sku || '',
      quantite_recue: entree.quantite_recue || '',
      quantite_commandee: entree.quantite_commandee || '',
      ecart: entree.ecart || '',
      etat_marchandise: entree.etat_marchandise || 'bon',
      num_bon_livraison: entree.num_bon_livraison || '',
      fournisseur: entree.fournisseur || '',
      date_reception: entree.date_reception || new Date().toISOString().split('T')[0],
      emplacement: entree.emplacement || '',
      rayon: entree.rayon || '',
      etagere: entree.etagere || '',
      num_lot: entree.num_lot || '',
      date_peremption: entree.date_peremption || '',
      notes: entree.notes || '',
      statut: entree.statut || 'en_attente'
    });
    setErrors({});
    setShowModal(true);
  };

  // Voir les détails
  const handleView = (entree) => {
    setSelectedEntree(entree);
    setShowDetailModal(true);
  };

  // Sauvegarder l'entrée
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Simulation d'enregistrement
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newEntree = {
        id: editingEntree ? editingEntree.id : entrees.length + 1,
        ...formData,
        quantite_recue: parseFloat(formData.quantite_recue),
        quantite_commandee: formData.quantite_commandee ? parseFloat(formData.quantite_commandee) : null,
        ecart: formData.ecart ? parseFloat(formData.ecart) : 0,
        dateCreation: editingEntree ? editingEntree.dateCreation : new Date().toISOString().split('T')[0],
        validePar: formData.statut === 'valide' ? 'Admin' : null,
        dateValidation: formData.statut === 'valide' ? new Date().toISOString().split('T')[0] : null
      };

      if (editingEntree) {
        setEntrees(entrees.map(e => e.id === editingEntree.id ? newEntree : e));
      } else {
        setEntrees([newEntree, ...entrees]);
      }

      setShowModal(false);
      setEditingEntree(null);
      alert('✅ Entrée en stock enregistrée avec succès !');
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('❌ Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  // Supprimer une entrée
  const handleDelete = (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) {
      setEntrees(entrees.filter(e => e.id !== id));
    }
  };

  // Valider une entrée
  const handleValidate = (id) => {
    setEntrees(entrees.map(e => 
      e.id === id 
        ? { 
            ...e, 
            statut: "valide",
            validePar: "Admin",
            dateValidation: new Date().toISOString().split('T')[0],
          }
        : e
    ));
  };

  // Annuler une entrée
  const handleCancel = (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir annuler cette entrée ?")) {
      setEntrees(entrees.map(e => 
        e.id === id 
          ? { ...e, statut: "annule" }
          : e
      ));
    }
  };

  // Obtenir la couleur du statut
  const getStatutColor = (statut) => {
    switch(statut) {
      case "valide": return "success";
      case "en_attente": return "warning";
      case "annule": return "danger";
      default: return "secondary";
    }
  };

  const getStatutLabel = (statut) => {
    switch(statut) {
      case "valide": return "Validé";
      case "en_attente": return "En attente";
      case "annule": return "Annulé";
      default: return statut;
    }
  };

  const getStatutIcon = (statut) => {
    switch(statut) {
      case "valide": return <CheckCircle size={16} />;
      case "en_attente": return <Clock size={16} />;
      case "annule": return <X size={16} />;
      default: return <AlertCircle size={16} />;
    }
  };

  const getEtatMarchandiseLabel = (etat) => {
    const etats = {
      'bon': '✅ Bon état',
      'endommager': '⚠️ Endommagé',
      'manquant': '❌ Manquant',
      'partiel': '🔄 Partiel'
    };
    return etats[etat] || etat;
  };

  const getEtatMarchandiseColor = (etat) => {
    const colors = {
      'bon': '#10b981',
      'endommager': '#ef4444',
      'manquant': '#f59e0b',
      'partiel': '#8b5cf6'
    };
    return colors[etat] || '#6b7280';
  };

  // Statistiques
  const getStats = () => {
    const total = entrees.length;
    const valides = entrees.filter(e => e.statut === "valide").length;
    const enAttente = entrees.filter(e => e.statut === "en_attente").length;
    const annules = entrees.filter(e => e.statut === "annule").length;
    const totalQuantite = entrees.reduce((sum, e) => sum + (e.quantite_recue || 0), 0);
    
    return { total, valides, enAttente, annules, totalQuantite };
  };

  const stats = getStats();

  return (
    <div className="entrees-container">
      {/* En-tête */}
      <div className="entrees-header">
        <div>
          <h1 className="entrees-title">
            <ArrowDownCircle size={28} />
            Entrées en Stock
          </h1>
          <p className="entrees-subtitle">
            {stats.total} entrées au total • {stats.totalQuantite} articles reçus
          </p>
        </div>
        <div className="entrees-actions">
          <button className="btn btn-primary" onClick={handleAdd}>
            <Plus size={18} />
            <span>Nouvelle Entrée</span>
          </button>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Download size={18} />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="entrees-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <ArrowDownCircle size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total entrées</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon validated">
            <CheckCircle size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Validées</span>
            <span className="stat-value">{stats.valides}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pending">
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">En attente</span>
            <span className="stat-value">{stats.enAttente}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cancelled">
            <X size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Annulées</span>
            <span className="stat-value">{stats.annules}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon products">
            <Package size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Articles reçus</span>
            <span className="stat-value">{stats.totalQuantite}</span>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="entrees-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher par référence, produit, fournisseur ou BL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filters-group">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="tous">Tous les statuts</option>
            <option value="valide">Validé</option>
            <option value="en_attente">En attente</option>
            <option value="annule">Annulé</option>
          </select>
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vue liste"
            >
              <List size={18} />
            </button>
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vue grille"
            >
              <Grid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des entrées */}
      {viewMode === 'list' ? (
        <div className="entrees-table-container">
          <table className="entrees-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Désignation</th>
                <th>Fournisseur</th>
                <th>Qte reçue</th>
                <th>BL</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state">
                    <p>Aucune entrée trouvée</p>
                  </td>
                </tr>
              ) : (
                currentItems.map((entree) => (
                  <tr key={entree.id}>
                    <td className="numero-cell">
                      <span className="numero-badge">{entree.reference}</span>
                    </td>
                    <td>
                      <div className="product-info">
                        <span className="product-name">{entree.designation}</span>
                        {entree.sku && (
                          <span className="product-sku">SKU: {entree.sku}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="fournisseur-info">
                        <Building size={14} />
                        <span>{entree.fournisseur}</span>
                      </div>
                    </td>
                    <td className="quantite-cell">{entree.quantite_recue}</td>
                    <td>
                      <span className="bl-badge">{entree.num_bon_livraison}</span>
                    </td>
                    <td>{entree.date_reception}</td>
                    <td>
                      <span className={`status-badge status-${getStatutColor(entree.statut)}`}>
                        {getStatutIcon(entree.statut)}
                        {getStatutLabel(entree.statut)}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="action-btn btn-view"
                        onClick={() => handleView(entree)}
                        title="Voir"
                      >
                        <Eye size={16} />
                      </button>
                      {entree.statut === "en_attente" && (
                        <>
                          <button
                            className="action-btn btn-edit"
                            onClick={() => handleEdit(entree)}
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="action-btn btn-validate"
                            onClick={() => handleValidate(entree.id)}
                            title="Valider"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            className="action-btn btn-cancel"
                            onClick={() => handleCancel(entree.id)}
                            title="Annuler"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                      {entree.statut !== "valide" && (
                        <button
                          className="action-btn btn-delete"
                          onClick={() => handleDelete(entree.id)}
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="entrees-grid">
          {currentItems.map((entree) => (
            <div key={entree.id} className="entree-card">
              <div className="entree-card-header">
                <div className="entree-card-title">
                  <span className="entree-numero">{entree.reference}</span>
                  <span className={`status-badge status-${getStatutColor(entree.statut)}`}>
                    {getStatutIcon(entree.statut)}
                    {getStatutLabel(entree.statut)}
                  </span>
                </div>
                <div className="entree-card-actions">
                  <button
                    className="action-btn btn-view"
                    onClick={() => handleView(entree)}
                    title="Voir"
                  >
                    <Eye size={16} />
                  </button>
                  {entree.statut === "en_attente" && (
                    <>
                      <button
                        className="action-btn btn-edit"
                        onClick={() => handleEdit(entree)}
                        title="Modifier"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="action-btn btn-validate"
                        onClick={() => handleValidate(entree.id)}
                        title="Valider"
                      >
                        <Check size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="entree-card-body">
                <div className="entree-info">
                  <div className="info-item">
                    <Package size={14} />
                    <span>{entree.designation}</span>
                  </div>
                  <div className="info-item">
                    <Building size={14} />
                    <span>{entree.fournisseur}</span>
                  </div>
                  <div className="info-item">
                    <Calendar size={14} />
                    <span>{entree.date_reception}</span>
                  </div>
                </div>
                <div className="entree-produits">
                  <div className="produits-count">
                    <PackageCheck size={14} />
                    <span>Quantité: {entree.quantite_recue}</span>
                  </div>
                  <div className="produits-total">
                    <FileText size={14} />
                    <span>BL: {entree.num_bon_livraison}</span>
                  </div>
                </div>
                {entree.notes && (
                  <div className="entree-notes">
                    <FileText size={14} />
                    <span>{entree.notes}</span>
                  </div>
                )}
                {entree.statut === "valide" && entree.validePar && (
                  <div className="entree-validation">
                    <CheckCircle size={14} />
                    <span>Validé par {entree.validePar} le {entree.dateValidation}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredEntrees.length > itemsPerPage && (
        <div className="entrees-pagination">
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

      {/* Modal d'ajout/édition - Formulaire d'entrée en stock */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEntree ? "Modifier l'entrée" : "Nouvelle entrée en stock"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                {/* Section 1: Informations produit */}
                <div className="form-section">
                  <div className="section-header">
                    <Package size={20} />
                    <h4>Informations produit</h4>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Référence / Code-barres *</label>
                      <input
                        type="text"
                        name="reference"
                        value={formData.reference}
                        onChange={handleInputChange}
                        placeholder="Ex: REF-001"
                        className={errors.reference ? 'error' : ''}
                      />
                      {errors.reference && <span className="error-message">{errors.reference}</span>}
                    </div>
                    <div className="form-group">
                      <label>Désignation *</label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        placeholder="Nom du produit"
                        className={errors.designation ? 'error' : ''}
                      />
                      {errors.designation && <span className="error-message">{errors.designation}</span>}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>SKU (Code unique)</label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      placeholder="Ex: SKU-001"
                    />
                  </div>
                </div>

                {/* Section 2: Données de quantité */}
                <div className="form-section">
                  <div className="section-header">
                    <ClipboardList size={20} />
                    <h4>Données de quantité</h4>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Quantité reçue *</label>
                      <input
                        type="number"
                        name="quantite_recue"
                        value={formData.quantite_recue}
                        onChange={handleInputChange}
                        placeholder="0"
                        min="1"
                        className={errors.quantite_recue ? 'error' : ''}
                      />
                      {errors.quantite_recue && <span className="error-message">{errors.quantite_recue}</span>}
                    </div>
                    <div className="form-group">
                      <label>Quantité commandée</label>
                      <input
                        type="number"
                        name="quantite_commandee"
                        value={formData.quantite_commandee}
                        onChange={handleInputChange}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Écart</label>
                      <input
                        type="text"
                        name="ecart"
                        value={formData.ecart || '0'}
                        readOnly
                        className="ecart-field"
                      />
                    </div>
                    <div className="form-group">
                      <label>État de la marchandise</label>
                      <select
                        name="etat_marchandise"
                        value={formData.etat_marchandise}
                        onChange={handleInputChange}
                        className="form-select"
                      >
                        <option value="bon">✅ Bon état</option>
                        <option value="endommager">⚠️ Endommagé</option>
                        <option value="manquant">❌ Manquant</option>
                        <option value="partiel">🔄 Partiel</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Documents et origines */}
                <div className="form-section">
                  <div className="section-header">
                    <FileText size={20} />
                    <h4>Documents et origines</h4>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Numéro de Bon de Livraison (BL) *</label>
                      <input
                        type="text"
                        name="num_bon_livraison"
                        value={formData.num_bon_livraison}
                        onChange={handleInputChange}
                        placeholder="BL-2024-001"
                        className={errors.num_bon_livraison ? 'error' : ''}
                      />
                      {errors.num_bon_livraison && <span className="error-message">{errors.num_bon_livraison}</span>}
                    </div>
                    <div className="form-group">
                      <label>Fournisseur *</label>
                      <input
                        type="text"
                        name="fournisseur"
                        value={formData.fournisseur}
                        onChange={handleInputChange}
                        placeholder="Nom du fournisseur"
                        className={errors.fournisseur ? 'error' : ''}
                      />
                      {errors.fournisseur && <span className="error-message">{errors.fournisseur}</span>}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Date de réception</label>
                    <input
                      type="date"
                      name="date_reception"
                      value={formData.date_reception}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Section 4: Données de stockage */}
                <div className="form-section">
                  <div className="section-header">
                    <MapPin size={20} />
                    <h4>Données de stockage</h4>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Emplacement *</label>
                      <input
                        type="text"
                        name="emplacement"
                        value={formData.emplacement}
                        onChange={handleInputChange}
                        placeholder="Entrepôt A"
                        className={errors.emplacement ? 'error' : ''}
                      />
                      {errors.emplacement && <span className="error-message">{errors.emplacement}</span>}
                    </div>
                    <div className="form-group">
                      <label>Rayon</label>
                      <input
                        type="text"
                        name="rayon"
                        value={formData.rayon}
                        onChange={handleInputChange}
                        placeholder="Rayon 3"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Étagère</label>
                      <input
                        type="text"
                        name="etagere"
                        value={formData.etagere}
                        onChange={handleInputChange}
                        placeholder="Étagère B2"
                      />
                    </div>
                    <div className="form-group">
                      <label>Numéro de lot</label>
                      <input
                        type="text"
                        name="num_lot"
                        value={formData.num_lot}
                        onChange={handleInputChange}
                        placeholder="LOT-2024-001"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Date de péremption</label>
                    <input
                      type="date"
                      name="date_peremption"
                      value={formData.date_peremption}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Section 5: Notes */}
                <div className="form-section">
                  <div className="section-header">
                    <ClipboardList size={20} />
                    <h4>Notes et observations</h4>
                  </div>
                  <div className="form-group">
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Ajoutez des notes ou observations..."
                      rows="3"
                    />
                  </div>
                </div>

                {/* Statut */}
                <div className="form-section">
                  <div className="form-group">
                    <label>Statut</label>
                    <select
                      name="statut"
                      value={formData.statut}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="en_attente">En attente</option>
                      <option value="valide">Validé</option>
                      <option value="annule">Annulé</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>{editingEntree ? "Mettre à jour" : "Enregistrer"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedEntree && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Détails de l'entrée</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <div className="detail-header-left">
                  <h3 className="detail-numero">{selectedEntree.reference}</h3>
                  <span className={`status-badge status-${getStatutColor(selectedEntree.statut)}`}>
                    {getStatutIcon(selectedEntree.statut)}
                    {getStatutLabel(selectedEntree.statut)}
                  </span>
                </div>
                <div className="detail-header-right">
                  <span className="detail-date">Créée le {selectedEntree.dateCreation}</span>
                </div>
              </div>

              <div className="detail-info-grid">
                <div className="detail-info-item">
                  <label>Désignation</label>
                  <div className="detail-info-value">
                    <Package size={16} />
                    <span>{selectedEntree.designation}</span>
                  </div>
                </div>
                <div className="detail-info-item">
                  <label>SKU</label>
                  <div className="detail-info-value">
                    <Barcode size={16} />
                    <span>{selectedEntree.sku || 'N/A'}</span>
                  </div>
                </div>
                <div className="detail-info-item">
                  <label>Quantité reçue</label>
                  <div className="detail-info-value">
                    <PackageCheck size={16} />
                    <span>{selectedEntree.quantite_recue}</span>
                  </div>
                </div>
                <div className="detail-info-item">
                  <label>État de la marchandise</label>
                  <div className="detail-info-value">
                    <AlertTriangle size={16} />
                    <span style={{ color: getEtatMarchandiseColor(selectedEntree.etat_marchandise) }}>
                      {getEtatMarchandiseLabel(selectedEntree.etat_marchandise)}
                    </span>
                  </div>
                </div>
                <div className="detail-info-item">
                  <label>Fournisseur</label>
                  <div className="detail-info-value">
                    <Building size={16} />
                    <span>{selectedEntree.fournisseur}</span>
                  </div>
                </div>
                <div className="detail-info-item">
                  <label>BL</label>
                  <div className="detail-info-value">
                    <FileText size={16} />
                    <span>{selectedEntree.num_bon_livraison}</span>
                  </div>
                </div>
                <div className="detail-info-item">
                  <label>Date de réception</label>
                  <div className="detail-info-value">
                    <Calendar size={16} />
                    <span>{selectedEntree.date_reception}</span>
                  </div>
                </div>
                <div className="detail-info-item">
                  <label>Emplacement</label>
                  <div className="detail-info-value">
                    <MapPin size={16} />
                    <span>{selectedEntree.emplacement}</span>
                  </div>
                </div>
                {selectedEntree.rayon && (
                  <div className="detail-info-item">
                    <label>Rayon</label>
                    <div className="detail-info-value">{selectedEntree.rayon}</div>
                  </div>
                )}
                {selectedEntree.etagere && (
                  <div className="detail-info-item">
                    <label>Étagère</label>
                    <div className="detail-info-value">{selectedEntree.etagere}</div>
                  </div>
                )}
                {selectedEntree.num_lot && (
                  <div className="detail-info-item">
                    <label>Numéro de lot</label>
                    <div className="detail-info-value">
                      <Hash size={16} />
                      <span>{selectedEntree.num_lot}</span>
                    </div>
                  </div>
                )}
                {selectedEntree.date_peremption && (
                  <div className="detail-info-item">
                    <label>Date de péremption</label>
                    <div className="detail-info-value">
                      <Calendar size={16} />
                      <span>{selectedEntree.date_peremption}</span>
                    </div>
                  </div>
                )}
                {selectedEntree.ecart !== 0 && (
                  <div className="detail-info-item">
                    <label>Écart</label>
                    <div className="detail-info-value" style={{ color: selectedEntree.ecart < 0 ? '#ef4444' : '#f59e0b' }}>
                      <AlertTriangle size={16} />
                      <span>{selectedEntree.ecart}</span>
                    </div>
                  </div>
                )}
              </div>

              {selectedEntree.notes && (
                <div className="detail-notes">
                  <h4>Notes</h4>
                  <p>{selectedEntree.notes}</p>
                </div>
              )}

              {selectedEntree.statut === "valide" && selectedEntree.validePar && (
                <div className="detail-validation">
                  <CheckCircle size={16} />
                  <span>Validé par {selectedEntree.validePar} le {selectedEntree.dateValidation}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Fermer
              </button>
              <button className="btn btn-secondary">
                <Printer size={18} />
                <span>Imprimer</span>
              </button>
              {selectedEntree.statut === "en_attente" && (
                <>
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEdit(selectedEntree);
                    }}
                  >
                    <Edit size={18} />
                    <span>Modifier</span>
                  </button>
                  <button 
                    className="btn btn-success"
                    onClick={() => {
                      handleValidate(selectedEntree.id);
                      setShowDetailModal(false);
                    }}
                  >
                    <Check size={18} />
                    <span>Valider</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Entrees;