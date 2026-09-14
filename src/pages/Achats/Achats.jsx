// pages/Achats/Achats.jsx
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
  ShoppingBasket,
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
  Send,
  CreditCard,
  Package,
  Info,
} from "lucide-react";
import "./Achats.css";

const Achats = () => {
  // État pour les achats
  const [achats, setAchats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState("tous");
  const [filterType, setFilterType] = useState("tous");
  const [viewMode, setViewMode] = useState("list");

  // État pour le modal
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingAchat, setEditingAchat] = useState(null);
  const [selectedAchat, setSelectedAchat] = useState(null);
  const [formData, setFormData] = useState({
    numero: "",
    date: "",
    type: "achat",
    fournisseur: "",
    produits: [],
    notes: "",
    statut: "en_attente",
    numeroFacture: "",
    dateLivraison: "",
    modePaiement: "virement",
    responsable: "",
  });

  // État pour les produits et fournisseurs
  const [produits, setProduits] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);

  // Données initiales
  useEffect(() => {
    const mockProduits = [
      { id: 1, nom: "Laptop Dell XPS 13", code: "DEL-XPS-13", prixAchat: 950.00, stock: 15 },
      { id: 2, nom: "Souris Logitech MX", code: "LOG-MX-3", prixAchat: 35.00, stock: 45 },
      { id: 3, nom: "Écran Samsung 27\"", code: "SAM-27-4K", prixAchat: 350.00, stock: 8 },
      { id: 4, nom: "Chaise ergonomique", code: "CHA-ERG-01", prixAchat: 220.00, stock: 12 },
      { id: 5, nom: "Tablette Samsung Galaxy", code: "SAM-GAL-TAB", prixAchat: 550.00, stock: 6 },
    ];
    setProduits(mockProduits);

    const mockFournisseurs = [
      { id: 1, nom: "TechPro Distribution", contact: "Jean Martin", email: "jean@techpro.com" },
      { id: 2, nom: "Office Supplies SARL", contact: "Marie Dubois", email: "marie@officesupplies.com" },
      { id: 3, nom: "Electro World", contact: "Pierre Dupont", email: "pierre@electroworld.com" },
      { id: 4, nom: "Mobilier Design", contact: "Sophie Lefèvre", email: "sophie@mobiliersign.com" },
    ];
    setFournisseurs(mockFournisseurs);

    const mockAchats = [
      {
        id: 1,
        numero: "ACH-2024-001",
        date: "2024-01-15",
        type: "achat",
        fournisseur: "TechPro Distribution",
        fournisseurId: 1,
        numeroFacture: "FAC-2024-001",
        dateLivraison: "2024-01-22",
        modePaiement: "virement",
        responsable: "Jean Martin",
        produits: [
          { id: 1, nom: "Laptop Dell XPS 13", quantite: 5, prixUnitaire: 950.00, total: 4750.00 },
          { id: 2, nom: "Souris Logitech MX", quantite: 20, prixUnitaire: 35.00, total: 700.00 },
        ],
        total: 5450.00,
        notes: "Commande mensuelle",
        statut: "recu",
        dateCreation: "2024-01-15",
        validePar: "Admin",
        dateValidation: "2024-01-16",
      },
      {
        id: 2,
        numero: "ACH-2024-002",
        date: "2024-01-20",
        type: "achat",
        fournisseur: "Office Supplies SARL",
        fournisseurId: 2,
        numeroFacture: "FAC-2024-002",
        dateLivraison: "2024-01-28",
        modePaiement: "cheque",
        responsable: "Marie Dubois",
        produits: [
          { id: 4, nom: "Chaise ergonomique", quantite: 10, prixUnitaire: 220.00, total: 2200.00 },
        ],
        total: 2200.00,
        notes: "Renouvellement mobilier",
        statut: "en_attente",
        dateCreation: "2024-01-20",
        validePar: null,
        dateValidation: null,
      },
      {
        id: 3,
        numero: "ACH-2024-003",
        date: "2024-02-01",
        type: "retour",
        fournisseur: "Electro World",
        fournisseurId: 3,
        numeroFacture: "FAC-2024-003",
        dateLivraison: "2024-02-05",
        modePaiement: "carte",
        responsable: "Pierre Dupont",
        produits: [
          { id: 3, nom: "Écran Samsung 27\"", quantite: 8, prixUnitaire: 350.00, total: 2800.00 },
          { id: 5, nom: "Tablette Samsung Galaxy", quantite: 6, prixUnitaire: 550.00, total: 3300.00 },
        ],
        total: 6100.00,
        notes: "Retour de commande",
        statut: "livre",
        dateCreation: "2024-02-01",
        validePar: "Manager",
        dateValidation: "2024-02-02",
      },
      {
        id: 4,
        numero: "ACH-2024-004",
        date: "2024-02-10",
        type: "achat",
        fournisseur: "TechPro Distribution",
        fournisseurId: 1,
        numeroFacture: "FAC-2024-004",
        dateLivraison: "2024-02-12",
        modePaiement: "virement",
        responsable: "Jean Martin",
        produits: [
          { id: 1, nom: "Laptop Dell XPS 13", quantite: 3, prixUnitaire: 950.00, total: 2850.00 },
        ],
        total: 2850.00,
        notes: "Commande urgente",
        statut: "recu",
        dateCreation: "2024-02-10",
        validePar: "Admin",
        dateValidation: "2024-02-10",
      },
      {
        id: 5,
        numero: "ACH-2024-005",
        date: "2024-02-15",
        type: "achat",
        fournisseur: "Mobilier Design",
        fournisseurId: 4,
        numeroFacture: "FAC-2024-005",
        dateLivraison: "2024-02-18",
        modePaiement: "virement",
        responsable: "Sophie Lefèvre",
        produits: [
          { id: 4, nom: "Chaise ergonomique", quantite: 5, prixUnitaire: 220.00, total: 1100.00 },
        ],
        total: 1100.00,
        notes: "Commande supplémentaire",
        statut: "annule",
        dateCreation: "2024-02-15",
        validePar: "Admin",
        dateValidation: "2024-02-16",
      },
    ];
    setAchats(mockAchats);
  }, []);

  // Filtrer les achats
  const filteredAchats = achats.filter((achat) => {
    const matchSearch = achat.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       achat.fournisseur.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       achat.numeroFacture?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "tous" || achat.statut === filterStatus;
    const matchType = filterType === "tous" || achat.type === filterType;
    return matchSearch && matchStatus && matchType;
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

  // Gestion des produits
  const handleAddProduit = () => {
    setFormData({
      ...formData,
      produits: [
        ...formData.produits,
        { id: Date.now(), produitId: "", quantite: 1, prixUnitaire: 0, total: 0 }
      ],
    });
  };

  const handleRemoveProduit = (index) => {
    const newProduits = formData.produits.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      produits: newProduits,
    });
  };

  const handleProduitChange = (index, field, value) => {
    const newProduits = [...formData.produits];
    newProduits[index][field] = value;
    
    if (field === "quantite" || field === "prixUnitaire") {
      const quantite = parseFloat(newProduits[index].quantite) || 0;
      const prix = parseFloat(newProduits[index].prixUnitaire) || 0;
      newProduits[index].total = quantite * prix;
    }
    
    setFormData({
      ...formData,
      produits: newProduits,
    });
  };

  // Ouvrir le modal pour ajouter
  const handleAdd = () => {
    setEditingAchat(null);
    setFormData({
      numero: `ACH-${new Date().getFullYear()}-${String(achats.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      type: "achat",
      fournisseur: "",
      produits: [],
      notes: "",
      statut: "en_attente",
      numeroFacture: "",
      dateLivraison: "",
      modePaiement: "virement",
      responsable: "",
    });
    setShowModal(true);
  };

  // Ouvrir le modal pour éditer
  const handleEdit = (achat) => {
    setEditingAchat(achat);
    setFormData({
      numero: achat.numero,
      date: achat.date,
      type: achat.type,
      fournisseur: achat.fournisseurId || "",
      numeroFacture: achat.numeroFacture || "",
      dateLivraison: achat.dateLivraison || "",
      modePaiement: achat.modePaiement || "virement",
      responsable: achat.responsable || "",
      produits: achat.produits.map(p => ({
        ...p,
        produitId: p.id,
        total: p.quantite * p.prixUnitaire,
      })),
      notes: achat.notes || "",
      statut: achat.statut,
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
    if (!formData.fournisseur || !formData.date) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (formData.produits.length === 0) {
      alert("Veuillez ajouter au moins un produit");
      return;
    }

    const fournisseurObj = fournisseurs.find(f => f.id === parseInt(formData.fournisseur));
    const total = formData.produits.reduce((sum, p) => sum + (p.total || 0), 0);

    if (editingAchat) {
      // Mise à jour
      setAchats(achats.map(a => 
        a.id === editingAchat.id 
          ? { 
              ...a, 
              date: formData.date,
              type: formData.type,
              fournisseur: fournisseurObj?.nom || "",
              fournisseurId: parseInt(formData.fournisseur),
              numeroFacture: formData.numeroFacture || "",
              dateLivraison: formData.dateLivraison || "",
              modePaiement: formData.modePaiement,
              responsable: formData.responsable || "",
              produits: formData.produits.map(p => ({
                id: parseInt(p.produitId),
                nom: produits.find(pr => pr.id === parseInt(p.produitId))?.nom || "",
                quantite: parseInt(p.quantite),
                prixUnitaire: parseFloat(p.prixUnitaire),
                total: parseFloat(p.total),
              })),
              total: total,
              notes: formData.notes || "",
              statut: formData.statut,
            }
          : a
      ));
    } else {
      // Ajout
      const newAchat = {
        id: achats.length + 1,
        numero: formData.numero,
        date: formData.date,
        type: formData.type,
        fournisseur: fournisseurObj?.nom || "",
        fournisseurId: parseInt(formData.fournisseur),
        numeroFacture: formData.numeroFacture || "",
        dateLivraison: formData.dateLivraison || "",
        modePaiement: formData.modePaiement,
        responsable: formData.responsable || "",
        produits: formData.produits.map(p => ({
          id: parseInt(p.produitId),
          nom: produits.find(pr => pr.id === parseInt(p.produitId))?.nom || "",
          quantite: parseInt(p.quantite),
          prixUnitaire: parseFloat(p.prixUnitaire),
          total: parseFloat(p.total),
        })),
        total: total,
        notes: formData.notes || "",
        statut: formData.statut,
        dateCreation: new Date().toISOString().split('T')[0],
        validePar: null,
        dateValidation: null,
      };
      setAchats([...achats, newAchat]);
    }
    
    setShowModal(false);
    setEditingAchat(null);
  };

  // Supprimer un achat
  const handleDelete = (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet achat ?")) {
      setAchats(achats.filter(a => a.id !== id));
    }
  };

  // Mettre à jour le statut
  const updateStatut = (id, nouveauStatut) => {
    setAchats(achats.map(a => 
      a.id === id 
        ? { 
            ...a, 
            statut: nouveauStatut,
            ...(nouveauStatut === "recu" || nouveauStatut === "livre" ? {
              validePar: "Admin",
              dateValidation: new Date().toISOString().split('T')[0],
            } : {})
          }
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
      case "annule": return <X size={16} />;
      default: return <AlertCircle size={16} />;
    }
  };

  // Obtenir le libellé du type
  const getTypeLabel = (type) => {
    switch(type) {
      case "achat": return "Achat";
      case "retour": return "Retour";
      default: return type;
    }
  };

  // Obtenir la couleur du type
  const getTypeColor = (type) => {
    switch(type) {
      case "achat": return "#2563eb";
      case "retour": return "#f59e0b";
      default: return "#6b7280";
    }
  };

  // Obtenir le libellé du mode de paiement
  const getPaiementLabel = (mode) => {
    switch(mode) {
      case "virement": return "Virement";
      case "cheque": return "Chèque";
      case "carte": return "Carte bancaire";
      case "especes": return "Espèces";
      default: return mode;
    }
  };

  // Exporter en CSV
  const handleExport = () => {
    const headers = ["Numéro", "Date", "Type", "Fournisseur", "Facture", "Total", "Statut"];
    const data = achats.map(a => [
      a.numero,
      a.date,
      getTypeLabel(a.type),
      a.fournisseur,
      a.numeroFacture || "-",
      a.total.toFixed(2),
      getStatutLabel(a.statut)
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
    const totalMontant = achats.reduce((sum, a) => sum + a.total, 0);
    const achatsType = achats.filter(a => a.type === "achat").length;
    const retours = achats.filter(a => a.type === "retour").length;
    
    return { total, enAttente, recus, livres, annules, totalMontant, achatsType, retours };
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
            <span>Nouvel Achat</span>
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
            <Truck size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Livrés</span>
            <span className="stat-value">{stats.livres}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon received">
            <CheckCircle size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Reçus</span>
            <span className="stat-value">{stats.recus}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cancelled">
            <X size={20} />
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
        <div className="stat-card">
          <div className="stat-icon purchases">
            <Package size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Achats</span>
            <span className="stat-value">{stats.achatsType}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon returns">
            <Send size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Retours</span>
            <span className="stat-value">{stats.retours}</span>
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="tous">Tous les types</option>
            <option value="achat">Achat</option>
            <option value="retour">Retour</option>
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

      {/* Contenu */}
      {viewMode === 'list' ? (
        <div className="achats-table-container">
          <table className="achats-table">
            <thead>
              <tr>
                <th>N° Commande</th>
                <th>Date</th>
                <th>Type</th>
                <th>Fournisseur</th>
                <th>Facture</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state">
                    <p>Aucune commande trouvée</p>
                  </td>
                </tr>
              ) : (
                currentItems.map((achat) => (
                  <tr key={achat.id}>
                    <td className="numero-cell">
                      <span className="numero-badge">{achat.numero}</span>
                    </td>
                    <td>{achat.date}</td>
                    <td>
                      <span 
                        className="type-badge"
                        style={{ 
                          backgroundColor: getTypeColor(achat.type) + "20", 
                          color: getTypeColor(achat.type) 
                        }}
                      >
                        {getTypeLabel(achat.type)}
                      </span>
                    </td>
                    <td>
                      <div className="fournisseur-info">
                        <Building size={14} />
                        <span>{achat.fournisseur}</span>
                      </div>
                    </td>
                    <td>{achat.numeroFacture || "-"}</td>
                    <td className="price-cell">{achat.total.toFixed(2)} €</td>
                    <td>
                      <span className={`status-badge status-${getStatutColor(achat.statut)}`}>
                        {getStatutIcon(achat.statut)}
                        {getStatutLabel(achat.statut)}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="action-btn btn-view"
                        onClick={() => handleView(achat)}
                        title="Voir"
                      >
                        <Eye size={16} />
                      </button>
                      {achat.statut === "en_attente" && (
                        <>
                          <button
                            className="action-btn btn-edit"
                            onClick={() => handleEdit(achat)}
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
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
                            <CheckCircle size={16} />
                          </button>
                          <button
                            className="action-btn btn-cancel"
                            onClick={() => updateStatut(achat.id, "annule")}
                            title="Annuler"
                          >
                            <X size={16} />
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
                      {achat.statut !== "recu" && achat.statut !== "livre" && (
                        <button
                          className="action-btn btn-delete"
                          onClick={() => handleDelete(achat.id)}
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
        <div className="achats-grid">
          {currentItems.map((achat) => (
            <div key={achat.id} className="achat-card">
              <div className="achat-card-header">
                <div className="achat-card-title">
                  <span className="achat-numero">{achat.numero}</span>
                  <span className={`status-badge status-${getStatutColor(achat.statut)}`}>
                    {getStatutIcon(achat.statut)}
                    {getStatutLabel(achat.statut)}
                  </span>
                </div>
                <div className="achat-card-actions">
                  <button
                    className="action-btn btn-view"
                    onClick={() => handleView(achat)}
                    title="Voir"
                  >
                    <Eye size={16} />
                  </button>
                  {achat.statut === "en_attente" && (
                    <>
                      <button
                        className="action-btn btn-edit"
                        onClick={() => handleEdit(achat)}
                        title="Modifier"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="action-btn btn-status"
                        onClick={() => updateStatut(achat.id, "livre")}
                        title="Marquer comme livré"
                      >
                        <Truck size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="achat-card-body">
                <div className="achat-info">
                  <div className="info-item">
                    <Calendar size={14} />
                    <span>{achat.date}</span>
                  </div>
                  <div className="info-item">
                    <span 
                      className="type-badge"
                      style={{ 
                        backgroundColor: getTypeColor(achat.type) + "20", 
                        color: getTypeColor(achat.type) 
                      }}
                    >
                      {getTypeLabel(achat.type)}
                    </span>
                  </div>
                  <div className="info-item">
                    <Building size={14} />
                    <span>{achat.fournisseur}</span>
                  </div>
                  {achat.responsable && (
                    <div className="info-item">
                      <User size={14} />
                      <span>{achat.responsable}</span>
                    </div>
                  )}
                </div>
                <div className="achat-produits">
                  <div className="produits-count">
                    <Package size={14} />
                    <span>{achat.produits.reduce((s, p) => s + p.quantite, 0)} articles</span>
                  </div>
                  <div className="produits-total">
                    <Banknote size={14} />
                    <span className="total-amount">{achat.total.toFixed(2)} €</span>
                  </div>
                </div>
                {achat.numeroFacture && (
                  <div className="achat-facture">
                    <FileText size={14} />
                    <span>Facture: {achat.numeroFacture}</span>
                  </div>
                )}
                {achat.notes && (
                  <div className="achat-notes">
                    <Info size={14} />
                    <span>{achat.notes}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAchat ? "Modifier l'achat" : "Nouvel achat"}</h2>
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
                    placeholder="ACH-2024-001"
                  />
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="achat">Achat</option>
                    <option value="retour">Retour</option>
                  </select>
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
                  <label>Numéro de facture</label>
                  <input
                    type="text"
                    name="numeroFacture"
                    value={formData.numeroFacture}
                    onChange={handleInputChange}
                    placeholder="FAC-2024-001"
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
              <div className="form-row">
                <div className="form-group">
                  <label>Mode de paiement</label>
                  <select
                    name="modePaiement"
                    value={formData.modePaiement}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="virement">Virement bancaire</option>
                    <option value="cheque">Chèque</option>
                    <option value="carte">Carte bancaire</option>
                    <option value="especes">Espèces</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Responsable</label>
                  <input
                    type="text"
                    name="responsable"
                    value={formData.responsable}
                    onChange={handleInputChange}
                    placeholder="Nom du responsable"
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

              <div className="form-section">
                <div className="section-header">
                  <h4>Produits</h4>
                  <button className="btn btn-sm btn-primary" onClick={handleAddProduit}>
                    <Plus size={16} />
                    Ajouter un produit
                  </button>
                </div>
                {formData.produits.map((produit, index) => (
                  <div key={index} className="produit-row">
                    <div className="produit-fields">
                      <div className="form-group">
                        <label>Produit</label>
                        <select
                          value={produit.produitId || ""}
                          onChange={(e) => handleProduitChange(index, "produitId", e.target.value)}
                          className="form-select"
                        >
                          <option value="">Sélectionner</option>
                          {produits.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.nom} (Prix achat: {p.prixAchat}€)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Quantité</label>
                        <input
                          type="number"
                          value={produit.quantite}
                          onChange={(e) => handleProduitChange(index, "quantite", e.target.value)}
                          min="1"
                        />
                      </div>
                      <div className="form-group">
                        <label>Prix unitaire</label>
                        <input
                          type="number"
                          value={produit.prixUnitaire}
                          onChange={(e) => handleProduitChange(index, "prixUnitaire", e.target.value)}
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div className="form-group">
                        <label>Total</label>
                        <input
                          type="text"
                          value={produit.total?.toFixed(2) || "0.00"}
                          readOnly
                          className="total-input"
                        />
                      </div>
                    </div>
                    <button
                      className="btn-remove-produit"
                      onClick={() => handleRemoveProduit(index)}
                      title="Supprimer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
                {formData.produits.length === 0 && (
                  <p className="no-produits">Aucun produit ajouté</p>
                )}
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
                  <span 
                    className="type-badge"
                    style={{ 
                      backgroundColor: getTypeColor(selectedAchat.type) + "20", 
                      color: getTypeColor(selectedAchat.type) 
                    }}
                  >
                    {getTypeLabel(selectedAchat.type)}
                  </span>
                </div>
                <div className="detail-header-right">
                  <span className="detail-date">Créée le {selectedAchat.dateCreation}</span>
                </div>
              </div>

              <div className="detail-info-grid">
                <div className="detail-info-item">
                  <label>Date</label>
                  <div className="detail-info-value">
                    <Calendar size={16} />
                    <span>{selectedAchat.date}</span>
                  </div>
                </div>
                <div className="detail-info-item">
                  <label>Fournisseur</label>
                  <div className="detail-info-value">
                    <Building size={16} />
                    <span>{selectedAchat.fournisseur}</span>
                  </div>
                </div>
                <div className="detail-info-item">
                  <label>Numéro facture</label>
                  <div className="detail-info-value">
                    <FileText size={16} />
                    <span>{selectedAchat.numeroFacture || "-"}</span>
                  </div>
                </div>
                <div className="detail-info-item">
                  <label>Date livraison</label>
                  <div className="detail-info-value">
                    <Truck size={16} />
                    <span>{selectedAchat.dateLivraison || "Non spécifiée"}</span>
                  </div>
                </div>
                <div className="detail-info-item">
                  <label>Mode de paiement</label>
                  <div className="detail-info-value">
                    <CreditCard size={16} />
                    <span>{getPaiementLabel(selectedAchat.modePaiement)}</span>
                  </div>
                </div>
                {selectedAchat.responsable && (
                  <div className="detail-info-item">
                    <label>Responsable</label>
                    <div className="detail-info-value">
                      <User size={16} />
                      <span>{selectedAchat.responsable}</span>
                    </div>
                  </div>
                )}
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
                      <td colSpan="3" className="total-label">Total</td>
                      <td className="total-value grand-total">{selectedAchat.total.toFixed(2)} €</td>
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

              {selectedAchat.statut === "recu" && selectedAchat.validePar && (
                <div className="detail-validation">
                  <CheckCircle size={16} />
                  <span>Validé par {selectedAchat.validePar} le {selectedAchat.dateValidation}</span>
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
              {selectedAchat.statut === "en_attente" && (
                <>
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEdit(selectedAchat);
                    }}
                  >
                    <Edit size={18} />
                    <span>Modifier</span>
                  </button>
                  <button 
                    className="btn btn-success"
                    onClick={() => {
                      updateStatut(selectedAchat.id, "recu");
                      setShowDetailModal(false);
                    }}
                  >
                    <CheckCircle size={18} />
                    <span>Marquer reçu</span>
                  </button>
                </>
              )}
              <button className="btn btn-secondary">
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