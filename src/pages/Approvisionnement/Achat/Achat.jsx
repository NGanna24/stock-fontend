// pages/Achats/Achats.jsx
import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  X,
  Check,
  Eye,
  ShoppingBasket,
  Truck,
  PackageCheck,
  Calendar,
  User,
  Building,
  CreditCard,
  FileText,
  Printer,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Banknote,
  Package,
  Info,
} from "lucide-react";
import "./Achat.css";

const Achats = () => {
  // État pour les achats
  const [achats, setAchats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState("tous");
  const [filterFournisseur, setFilterFournisseur] = useState("tous");

  // État pour le modal
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingAchat, setEditingAchat] = useState(null);
  const [selectedAchat, setSelectedAchat] = useState(null);
  const [formData, setFormData] = useState({
    numero: "",
    fournisseur: "",
    dateCommande: "",
    dateLivraison: "",
    statut: "en_attente",
    produits: [],
    totalHT: "",
    totalTTC: "",
    notes: "",
  });

  // État pour les fournisseurs
  const [fournisseurs, setFournisseurs] = useState([]);

  // Données initiales
  useEffect(() => {
    const mockFournisseurs = [
      { id: 1, nom: "TechPro Distribution", contact: "Jean Martin", email: "jean@techpro.com", telephone: "01 23 45 67 89" },
      { id: 2, nom: "Office Supplies SARL", contact: "Marie Dubois", email: "marie@officesupplies.com", telephone: "01 98 76 54 32" },
      { id: 3, nom: "Electro World", contact: "Pierre Dupont", email: "pierre@electroworld.com", telephone: "01 45 67 89 01" },
    ];
    setFournisseurs(mockFournisseurs);

    const mockAchats = [
      {
        id: 1,
        numero: "CMD-2024-001",
        fournisseur: "TechPro Distribution",
        fournisseurId: 1,
        dateCommande: "2024-01-15",
        dateLivraison: "2024-01-22",
        statut: "recu",
        produits: [
          { nom: "Laptop Dell XPS 13", quantite: 5, prixUnitaire: 1200.00, total: 6000.00 },
          { nom: "Souris Logitech MX", quantite: 20, prixUnitaire: 45.00, total: 900.00 },
        ],
        totalHT: 6900.00,
        totalTTC: 8280.00,
        notes: "Commande urgente",
        dateCreation: "2024-01-15",
      },
      {
        id: 2,
        numero: "CMD-2024-002",
        fournisseur: "Office Supplies SARL",
        fournisseurId: 2,
        dateCommande: "2024-01-20",
        dateLivraison: "2024-01-28",
        statut: "en_attente",
        produits: [
          { nom: "Chaise ergonomique", quantite: 10, prixUnitaire: 299.99, total: 2999.90 },
          { nom: "Bureau premium", quantite: 5, prixUnitaire: 450.00, total: 2250.00 },
        ],
        totalHT: 5249.90,
        totalTTC: 6299.88,
        notes: "",
        dateCreation: "2024-01-20",
      },
      {
        id: 3,
        numero: "CMD-2024-003",
        fournisseur: "Electro World",
        fournisseurId: 3,
        dateCommande: "2024-02-01",
        dateLivraison: "2024-02-05",
        statut: "livre",
        produits: [
          { nom: "Écran Samsung 27\"", quantite: 8, prixUnitaire: 399.99, total: 3199.92 },
        ],
        totalHT: 3199.92,
        totalTTC: 3839.90,
        notes: "Livraison express",
        dateCreation: "2024-02-01",
      },
      {
        id: 4,
        numero: "CMD-2024-004",
        fournisseur: "TechPro Distribution",
        fournisseurId: 1,
        dateCommande: "2024-02-05",
        dateLivraison: "2024-02-12",
        statut: "annule",
        produits: [
          { nom: "Tablette Samsung Galaxy", quantite: 6, prixUnitaire: 699.99, total: 4199.94 },
        ],
        totalHT: 4199.94,
        totalTTC: 5039.93,
        notes: "Annulé par le fournisseur",
        dateCreation: "2024-02-05",
      },
      {
        id: 5,
        numero: "CMD-2024-005",
        fournisseur: "Office Supplies SARL",
        fournisseurId: 2,
        dateCommande: "2024-02-10",
        dateLivraison: "2024-02-18",
        statut: "en_attente",
        produits: [
          { nom: "Papier A4 (boîte)", quantite: 50, prixUnitaire: 15.00, total: 750.00 },
          { nom: "Cartouches encre", quantite: 30, prixUnitaire: 25.00, total: 750.00 },
        ],
        totalHT: 1500.00,
        totalTTC: 1800.00,
        notes: "",
        dateCreation: "2024-02-10",
      },
    ];
    setAchats(mockAchats);
  }, []);

  // Filtrer les achats
  const filteredAchats = achats.filter((achat) => {
    const matchSearch = achat.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       achat.fournisseur.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "tous" || achat.statut === filterStatus;
    const matchFournisseur = filterFournisseur === "tous" || achat.fournisseurId === parseInt(filterFournisseur);
    return matchSearch && matchStatus && matchFournisseur;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAchats.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAchats.length / itemsPerPage);

  // Gestion du formulaire
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Ouvrir le modal pour ajouter
  const handleAdd = () => {
    setEditingAchat(null);
    setFormData({
      numero: `CMD-${new Date().getFullYear()}-${String(achats.length + 1).padStart(3, '0')}`,
      fournisseur: "",
      dateCommande: new Date().toISOString().split('T')[0],
      dateLivraison: "",
      statut: "en_attente",
      produits: [],
      totalHT: "",
      totalTTC: "",
      notes: "",
    });
    setShowModal(true);
  };

  // Ouvrir le modal pour éditer
  const handleEdit = (achat) => {
    setEditingAchat(achat);
    setFormData({
      numero: achat.numero,
      fournisseur: achat.fournisseurId,
      dateCommande: achat.dateCommande,
      dateLivraison: achat.dateLivraison || "",
      statut: achat.statut,
      produits: achat.produits,
      totalHT: achat.totalHT.toString(),
      totalTTC: achat.totalTTC.toString(),
      notes: achat.notes || "",
    });
    setShowModal(true);
  };

  // Voir les détails
  const handleView = (achat) => {
    setSelectedAchat(achat);
    setShowDetailModal(true);
  };

  // Sauvegarder l'achat
  const handleSave = () => {
    if (!formData.fournisseur || !formData.dateCommande) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const fournisseurObj = fournisseurs.find(f => f.id === parseInt(formData.fournisseur));

    if (editingAchat) {
      // Mise à jour
      setAchats(achats.map(a => 
        a.id === editingAchat.id 
          ? { 
              ...a, 
              fournisseur: fournisseurObj?.nom || "",
              fournisseurId: parseInt(formData.fournisseur),
              dateCommande: formData.dateCommande,
              dateLivraison: formData.dateLivraison,
              statut: formData.statut,
              produits: formData.produits || [],
              totalHT: parseFloat(formData.totalHT) || 0,
              totalTTC: parseFloat(formData.totalTTC) || 0,
              notes: formData.notes || "",
            }
          : a
      ));
    } else {
      // Ajout
      const newAchat = {
        id: achats.length + 1,
        numero: formData.numero,
        fournisseur: fournisseurObj?.nom || "",
        fournisseurId: parseInt(formData.fournisseur),
        dateCommande: formData.dateCommande,
        dateLivraison: formData.dateLivraison || "",
        statut: formData.statut,
        produits: formData.produits || [],
        totalHT: parseFloat(formData.totalHT) || 0,
        totalTTC: parseFloat(formData.totalTTC) || 0,
        notes: formData.notes || "",
        dateCreation: new Date().toISOString().split('T')[0],
      };
      setAchats([...achats, newAchat]);
    }
    
    setShowModal(false);
    setEditingAchat(null);
  };

  // Supprimer un achat
  const handleDelete = (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette commande ?")) {
      setAchats(achats.filter(a => a.id !== id));
    }
  };

  // Mettre à jour le statut
  const updateStatut = (id, nouveauStatut) => {
    setAchats(achats.map(a => 
      a.id === id 
        ? { ...a, statut: nouveauStatut }
        : a
    ));
  };

  // Obtenir la couleur du statut
  const getStatutColor = (statut) => {
    switch(statut) {
      case "recu": return "success";
      case "livre": return "info";
      case "en_attente": return "warning";
      case "annule": return "danger";
      default: return "secondary";
    }
  };

  // Obtenir le libellé du statut
  const getStatutLabel = (statut) => {
    switch(statut) {
      case "recu": return "Reçu";
      case "livre": return "Livré";
      case "en_attente": return "En attente";
      case "annule": return "Annulé";
      default: return statut;
    }
  };

  // Obtenir l'icône du statut
  const getStatutIcon = (statut) => {
    switch(statut) {
      case "recu": return <CheckCircle size={16} />;
      case "livre": return <Truck size={16} />;
      case "en_attente": return <Clock size={16} />;
      case "annule": return <XCircle size={16} />;
      default: return <AlertCircle size={16} />;
    }
  };

  // Exporter en CSV
  const handleExport = () => {
    const headers = ["Numéro", "Fournisseur", "Date commande", "Date livraison", "Statut", "Total HT", "Total TTC"];
    const data = achats.map(a => [
      a.numero,
      a.fournisseur,
      a.dateCommande,
      a.dateLivraison || "-",
      getStatutLabel(a.statut),
      a.totalHT.toFixed(2),
      a.totalTTC.toFixed(2)
    ]);
    
    let csv = headers.join(",") + "\n";
    data.forEach(row => {
      csv += row.join(",") + "\n";
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `achats_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Statistiques
  const getStats = () => {
    const total = achats.length;
    const enAttente = achats.filter(a => a.statut === "en_attente").length;
    const recus = achats.filter(a => a.statut === "recu").length;
    const livres = achats.filter(a => a.statut === "livre").length;
    const annules = achats.filter(a => a.statut === "annule").length;
    const totalMontant = achats.reduce((sum, a) => sum + a.totalTTC, 0);
    
    return { total, enAttente, recus, livres, annules, totalMontant };
  };

  const stats = getStats();

  return (
    <div className="achats-container">
      {/* En-tête */}
      <div className="achats-header">
        <div>
          <h1 className="achats-title">Gestion des Achats</h1>
          <p className="achats-subtitle">
            {stats.total} commandes au total
          </p>
        </div>
        <div className="achats-actions">
          <button className="btn btn-primary" onClick={handleAdd}>
            <Plus size={18} />
            <span>Nouvelle Commande</span>
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="achats-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <ShoppingBasket size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total commandes</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon waiting">
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">En attente</span>
            <span className="stat-value">{stats.enAttente}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon delivered">
            <CheckCircle size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Reçus</span>
            <span className="stat-value">{stats.recus}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cancelled">
            <XCircle size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Annulés</span>
            <span className="stat-value">{stats.annules}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amount">
            <Banknote size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Montant total</span>
            <span className="stat-value">{stats.totalMontant.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="achats-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher une commande..."
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
            <option value="en_attente">En attente</option>
            <option value="livre">Livré</option>
            <option value="recu">Reçu</option>
            <option value="annule">Annulé</option>
          </select>
          <select
            value={filterFournisseur}
            onChange={(e) => setFilterFournisseur(e.target.value)}
            className="filter-select"
          >
            <option value="tous">Tous les fournisseurs</option>
            {fournisseurs.map(f => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau des achats */}
      <div className="achats-table-container">
        <table className="achats-table">
          <thead>
            <tr>
              <th>N° Commande</th>
              <th>Fournisseur</th>
              <th>Date commande</th>
              <th>Date livraison</th>
              <th>Statut</th>
              <th>Total TTC</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">
                  <p>Aucune commande trouvée</p>
                </td>
              </tr>
            ) : (
              currentItems.map((achat) => (
                <tr key={achat.id}>
                  <td className="numero-cell">
                    <span className="numero-badge">{achat.numero}</span>
                  </td>
                  <td className="fournisseur-cell">
                    <div className="fournisseur-info">
                      <Building size={14} />
                      <span>{achat.fournisseur}</span>
                    </div>
                  </td>
                  <td>{achat.dateCommande}</td>
                  <td>{achat.dateLivraison || "-"}</td>
                  <td>
                    <span className={`status-badge status-${getStatutColor(achat.statut)}`}>
                      {getStatutIcon(achat.statut)}
                      {getStatutLabel(achat.statut)}
                    </span>
                  </td>
                  <td className="price-cell">{achat.totalTTC.toFixed(2)} €</td>
                  <td className="actions-cell">
                    <button
                      className="action-btn btn-view"
                      onClick={() => handleView(achat)}
                      title="Voir les détails"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="action-btn btn-edit"
                      onClick={() => handleEdit(achat)}
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    {achat.statut === "en_attente" && (
                      <>
                        <button
                          className="action-btn btn-status"
                          onClick={() => updateStatut(achat.id, "livre")}
                          title="Marquer comme livré"
                        >
                          <Truck size={16} />
                        </button>
                        <button
                          className="action-btn btn-status-success"
                          onClick={() => updateStatut(achat.id, "recu")}
                          title="Marquer comme reçu"
                        >
                          <PackageCheck size={16} />
                        </button>
                      </>
                    )}
                    {achat.statut === "livre" && (
                      <button
                        className="action-btn btn-status-success"
                        onClick={() => updateStatut(achat.id, "recu")}
                        title="Marquer comme reçu"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button
                      className="action-btn btn-delete"
                      onClick={() => handleDelete(achat.id)}
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredAchats.length > itemsPerPage && (
        <div className="achats-pagination">
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
        <div className="modal-overlay">
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAchat ? "Modifier la commande" : "Nouvelle commande"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Numéro de commande *</label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleInputChange}
                    placeholder="CMD-2024-001"
                  />
                </div>
                <div className="form-group">
                  <label>Fournisseur *</label>
                  <select
                    name="fournisseur"
                    value={formData.fournisseur}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    {fournisseurs.map(f => (
                      <option key={f.id} value={f.id}>{f.nom}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date de commande *</label>
                  <input
                    type="date"
                    name="dateCommande"
                    value={formData.dateCommande}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Date de livraison prévue</label>
                  <input
                    type="date"
                    name="dateLivraison"
                    value={formData.dateLivraison}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Statut</label>
                <select
                  name="statut"
                  value={formData.statut}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="en_attente">En attente</option>
                  <option value="livre">Livré</option>
                  <option value="recu">Reçu</option>
                  <option value="annule">Annulé</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total HT</label>
                  <input
                    type="number"
                    name="totalHT"
                    value={formData.totalHT}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Total TTC</label>
                  <input
                    type="number"
                    name="totalTTC"
                    value={formData.totalTTC}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Notes supplémentaires..."
                  rows="3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Check size={18} />
                <span>{editingAchat ? "Mettre à jour" : "Créer"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedAchat && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Détails de la commande</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <div className="detail-header-left">
                  <h3 className="detail-numero">{selectedAchat.numero}</h3>
                  <span className={`status-badge status-${getStatutColor(selectedAchat.statut)}`}>
                    {getStatutIcon(selectedAchat.statut)}
                    {getStatutLabel(selectedAchat.statut)}
                  </span>
                </div>
                <div className="detail-header-right">
                  <span className="detail-date">Créée le {selectedAchat.dateCreation}</span>
                </div>
              </div>

              <div className="detail-info-grid">
                <div className="detail-info-item">
                  <label>Fournisseur</label>
                  <div className="detail-info-value">
                    <Building size={16} />
                    <span>{selectedAchat.fournisseur}</span>
                  </div>
                </div>
                <div className="detail-info-item">
                  <label>Date de commande</label>
                  <div className="detail-info-value">
                    <Calendar size={16} />
                    <span>{selectedAchat.dateCommande}</span>
                  </div>
                </div>
                <div className="detail-info-item">
                  <label>Date de livraison</label>
                  <div className="detail-info-value">
                    <Truck size={16} />
                    <span>{selectedAchat.dateLivraison || "Non spécifiée"}</span>
                  </div>
                </div>
              </div>

              <div className="detail-produits">
                <h4>Produits commandés</h4>
                <table className="detail-produits-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Quantité</th>
                      <th>Prix unitaire</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAchat.produits.map((produit, index) => (
                      <tr key={index}>
                        <td>{produit.nom}</td>
                        <td>{produit.quantite}</td>
                        <td>{produit.prixUnitaire.toFixed(2)} €</td>
                        <td>{produit.total.toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" className="total-label">Total HT</td>
                      <td className="total-value">{selectedAchat.totalHT.toFixed(2)} €</td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="total-label">Total TTC</td>
                      <td className="total-value grand-total">{selectedAchat.totalTTC.toFixed(2)} €</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {selectedAchat.notes && (
                <div className="detail-notes">
                  <h4>Notes</h4>
                  <p>{selectedAchat.notes}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDetailModal(false)}
              >
                Fermer
              </button>
              <button className="btn btn-primary">
                <Printer size={18} />
                <span>Imprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Achats;