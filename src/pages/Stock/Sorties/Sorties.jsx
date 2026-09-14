// pages/Sorties/Sorties.jsx
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
  ArrowUpCircle,
  Package,
  Calendar,
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
  ShoppingCart,
  Truck,
  RefreshCw,
} from "lucide-react";
import "./Sorties.css";

const Sorties = () => {
  // État pour les sorties
  const [sorties, setSorties] = useState([]);
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
  const [editingSortie, setEditingSortie] = useState(null);
  const [selectedSortie, setSelectedSortie] = useState(null);
  const [formData, setFormData] = useState({
    numero: "",
    date: "",
    type: "vente",
    destination: "",
    produits: [],
    notes: "",
    statut: "en_attente",
    client: "",
    responsable: "",
  });

  // État pour les produits
  const [produits, setProduits] = useState([]);
  const [clients, setClients] = useState([]);

  // Données initiales
  useEffect(() => {
    const mockProduits = [
      { id: 1, nom: "Laptop Dell XPS 13", code: "DEL-XPS-13", stock: 15, prixUnitaire: 1200.00 },
      { id: 2, nom: "Souris Logitech MX", code: "LOG-MX-3", stock: 45, prixUnitaire: 45.00 },
      { id: 3, nom: "Écran Samsung 27\"", code: "SAM-27-4K", stock: 8, prixUnitaire: 399.99 },
      { id: 4, nom: "Chaise ergonomique", code: "CHA-ERG-01", stock: 12, prixUnitaire: 299.99 },
      { id: 5, nom: "Tablette Samsung Galaxy", code: "SAM-GAL-TAB", stock: 6, prixUnitaire: 699.99 },
    ];
    setProduits(mockProduits);

    const mockClients = [
      { id: 1, nom: "Client A" },
      { id: 2, nom: "Client B" },
      { id: 3, nom: "Client C" },
    ];
    setClients(mockClients);

    const mockSorties = [
      {
        id: 1,
        numero: "SOR-2024-001",
        date: "2024-01-16",
        type: "vente",
        destination: "Client A",
        clientId: 1,
        responsable: "Jean Dupont",
        produits: [
          { id: 1, nom: "Laptop Dell XPS 13", quantite: 2, prixUnitaire: 1200.00, total: 2400.00 },
          { id: 2, nom: "Souris Logitech MX", quantite: 5, prixUnitaire: 45.00, total: 225.00 },
        ],
        total: 2625.00,
        notes: "Commande client urgente",
        statut: "valide",
        dateCreation: "2024-01-16",
        validePar: "Admin",
        dateValidation: "2024-01-16",
      },
      {
        id: 2,
        numero: "SOR-2024-002",
        date: "2024-01-21",
        type: "transfert",
        destination: "Entrepôt Lyon",
        clientId: null,
        responsable: "Marie Martin",
        produits: [
          { id: 4, nom: "Chaise ergonomique", quantite: 5, prixUnitaire: 299.99, total: 1499.95 },
        ],
        total: 1499.95,
        notes: "Transfert vers entrepôt secondaire",
        statut: "en_attente",
        dateCreation: "2024-01-21",
        validePar: null,
        dateValidation: null,
      },
      {
        id: 3,
        numero: "SOR-2024-003",
        date: "2024-02-02",
        type: "vente",
        destination: "Client B",
        clientId: 2,
        responsable: "Pierre Durand",
        produits: [
          { id: 3, nom: "Écran Samsung 27\"", quantite: 3, prixUnitaire: 399.99, total: 1199.97 },
          { id: 5, nom: "Tablette Samsung Galaxy", quantite: 2, prixUnitaire: 699.99, total: 1399.98 },
        ],
        total: 2599.95,
        notes: "Commande entreprise",
        statut: "annule",
        dateCreation: "2024-02-02",
        validePar: "Manager",
        dateValidation: "2024-02-03",
      },
      {
        id: 4,
        numero: "SOR-2024-004",
        date: "2024-02-11",
        type: "vente",
        destination: "Client C",
        clientId: 3,
        responsable: "Sophie Lefèvre",
        produits: [
          { id: 1, nom: "Laptop Dell XPS 13", quantite: 1, prixUnitaire: 1200.00, total: 1200.00 },
        ],
        total: 1200.00,
        notes: "Vente directe",
        statut: "valide",
        dateCreation: "2024-02-11",
        validePar: "Admin",
        dateValidation: "2024-02-11",
      },
      {
        id: 5,
        numero: "SOR-2024-005",
        date: "2024-02-16",
        type: "perte",
        destination: "Stock",
        clientId: null,
        responsable: "Thomas Roux",
        produits: [
          { id: 2, nom: "Souris Logitech MX", quantite: 3, prixUnitaire: 45.00, total: 135.00 },
        ],
        total: 135.00,
        notes: "Produits endommagés",
        statut: "en_attente",
        dateCreation: "2024-02-16",
        validePar: null,
        dateValidation: null,
      },
    ];
    setSorties(mockSorties);
  }, []);

  // Filtrer les sorties
  const filteredSorties = sorties.filter((sortie) => {
    const matchSearch = sortie.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       sortie.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "tous" || sortie.statut === filterStatus;
    const matchType = filterType === "tous" || sortie.type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSorties.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSorties.length / itemsPerPage);

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
    
    // Calculer le total
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
    setEditingSortie(null);
    setFormData({
      numero: `SOR-${new Date().getFullYear()}-${String(sorties.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      type: "vente",
      destination: "",
      produits: [],
      notes: "",
      statut: "en_attente",
      client: "",
      responsable: "",
    });
    setShowModal(true);
  };

  // Ouvrir le modal pour éditer
  const handleEdit = (sortie) => {
    setEditingSortie(sortie);
    setFormData({
      numero: sortie.numero,
      date: sortie.date,
      type: sortie.type,
      destination: sortie.destination,
      client: sortie.clientId || "",
      responsable: sortie.responsable || "",
      produits: sortie.produits.map(p => ({
        ...p,
        produitId: p.id,
        total: p.quantite * p.prixUnitaire,
      })),
      notes: sortie.notes || "",
      statut: sortie.statut,
    });
    setShowModal(true);
  };

  // Voir les détails
  const handleView = (sortie) => {
    setSelectedSortie(sortie);
    setShowDetailModal(true);
  };

  // Sauvegarder la sortie
  const handleSave = () => {
    if (!formData.destination || !formData.date) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (formData.produits.length === 0) {
      alert("Veuillez ajouter au moins un produit");
      return;
    }

    // Vérifier le stock
    for (const p of formData.produits) {
      const produit = produits.find(pr => pr.id === parseInt(p.produitId));
      if (produit && parseInt(p.quantite) > produit.stock) {
        alert(`Stock insuffisant pour le produit "${produit.nom}". Stock disponible: ${produit.stock}`);
        return;
      }
    }

    const clientObj = clients.find(c => c.id === parseInt(formData.client));
    const total = formData.produits.reduce((sum, p) => sum + (p.total || 0), 0);

    if (editingSortie) {
      // Mise à jour
      setSorties(sorties.map(s => 
        s.id === editingSortie.id 
          ? { 
              ...s, 
              date: formData.date,
              type: formData.type,
              destination: formData.destination,
              clientId: formData.client ? parseInt(formData.client) : null,
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
          : s
      ));
    } else {
      // Ajout
      const newSortie = {
        id: sorties.length + 1,
        numero: formData.numero,
        date: formData.date,
        type: formData.type,
        destination: formData.destination,
        clientId: formData.client ? parseInt(formData.client) : null,
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
      setSorties([...sorties, newSortie]);

      // Mettre à jour le stock
      for (const p of formData.produits) {
        const produit = produits.find(pr => pr.id === parseInt(p.produitId));
        if (produit) {
          produit.stock -= parseInt(p.quantite);
        }
      }
    }
    
    setShowModal(false);
    setEditingSortie(null);
  };

  // Supprimer une sortie
  const handleDelete = (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette sortie ?")) {
      setSorties(sorties.filter(s => s.id !== id));
    }
  };

  // Valider une sortie
  const handleValidate = (id) => {
    const sortie = sorties.find(s => s.id === id);
    
    // Vérifier le stock avant validation
    for (const p of sortie.produits) {
      const produit = produits.find(pr => pr.id === p.id);
      if (produit && p.quantite > produit.stock) {
        alert(`Stock insuffisant pour le produit "${produit.nom}". Stock disponible: ${produit.stock}`);
        return;
      }
    }

    setSorties(sorties.map(s => 
      s.id === id 
        ? { 
            ...s, 
            statut: "valide",
            validePar: "Admin",
            dateValidation: new Date().toISOString().split('T')[0],
          }
        : s
    ));

    // Mettre à jour le stock
    for (const p of sortie.produits) {
      const produit = produits.find(pr => pr.id === p.id);
      if (produit) {
        produit.stock -= p.quantite;
      }
    }
  };

  // Annuler une sortie
  const handleCancel = (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir annuler cette sortie ?")) {
      setSorties(sorties.map(s => 
        s.id === id 
          ? { ...s, statut: "annule" }
          : s
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

  // Obtenir le libellé du statut
  const getStatutLabel = (statut) => {
    switch(statut) {
      case "valide": return "Validé";
      case "en_attente": return "En attente";
      case "annule": return "Annulé";
      default: return statut;
    }
  };

  // Obtenir l'icône du statut
  const getStatutIcon = (statut) => {
    switch(statut) {
      case "valide": return <CheckCircle size={16} />;
      case "en_attente": return <Clock size={16} />;
      case "annule": return <X size={16} />;
      default: return <AlertCircle size={16} />;
    }
  };

  // Obtenir le libellé du type
  const getTypeLabel = (type) => {
    switch(type) {
      case "vente": return "Vente";
      case "transfert": return "Transfert";
      case "perte": return "Perte";
      default: return type;
    }
  };

  // Obtenir la couleur du type
  const getTypeColor = (type) => {
    switch(type) {
      case "vente": return "#2563eb";
      case "transfert": return "#10b981";
      case "perte": return "#ef4444";
      default: return "#6b7280";
    }
  };

  // Obtenir l'icône du type
  const getTypeIcon = (type) => {
    switch(type) {
      case "vente": return <ShoppingCart size={16} />;
      case "transfert": return <Truck size={16} />;
      case "perte": return <AlertCircle size={16} />;
      default: return <Package size={16} />;
    }
  };

  // Exporter en CSV
  const handleExport = () => {
    const headers = ["Numéro", "Date", "Type", "Destination", "Total", "Statut"];
    const data = sorties.map(s => [
      s.numero,
      s.date,
      getTypeLabel(s.type),
      s.destination,
      s.total.toFixed(2),
      getStatutLabel(s.statut)
    ]);
    
    let csv = headers.join(",") + "\n";
    data.forEach(row => {
      csv += row.join(",") + "\n";
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sorties_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Statistiques
  const getStats = () => {
    const total = sorties.length;
    const valides = sorties.filter(s => s.statut === "valide").length;
    const enAttente = sorties.filter(s => s.statut === "en_attente").length;
    const annules = sorties.filter(s => s.statut === "annule").length;
    const totalMontant = sorties.reduce((sum, s) => sum + s.total, 0);
    const totalProduits = sorties.reduce((sum, s) => 
      sum + s.produits.reduce((acc, p) => acc + p.quantite, 0), 0
    );
    const ventes = sorties.filter(s => s.type === "vente").length;
    const transferts = sorties.filter(s => s.type === "transfert").length;
    const pertes = sorties.filter(s => s.type === "perte").length;
    
    return { total, valides, enAttente, annules, totalMontant, totalProduits, ventes, transferts, pertes };
  };

  const stats = getStats();

  return (
    <div className="sorties-container">
      {/* En-tête */}
      <div className="sorties-header">
        <div>
          <h1 className="sorties-title">Gestion des Sorties</h1>
          <p className="sorties-subtitle">
            {stats.total} sorties au total
          </p>
        </div>
        <div className="sorties-actions">
          <button className="btn btn-primary" onClick={handleAdd}>
            <Plus size={18} />
            <span>Nouvelle Sortie</span>
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="sorties-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <ArrowUpCircle size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total sorties</span>
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
          <div className="stat-icon amount">
            <Banknote size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Montant total</span>
            <span className="stat-value">{stats.totalMontant.toFixed(2)} €</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon products">
            <Package size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Produits total</span>
            <span className="stat-value">{stats.totalProduits}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon sales">
            <ShoppingCart size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Ventes</span>
            <span className="stat-value">{stats.ventes}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon transfer">
            <Truck size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Transferts</span>
            <span className="stat-value">{stats.transferts}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon loss">
            <AlertCircle size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Pertes</span>
            <span className="stat-value">{stats.pertes}</span>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="sorties-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher une sortie..."
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
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="tous">Tous les types</option>
            <option value="vente">Vente</option>
            <option value="transfert">Transfert</option>
            <option value="perte">Perte</option>
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
        <div className="sorties-table-container">
          <table className="sorties-table">
            <thead>
              <tr>
                <th>N° Sortie</th>
                <th>Date</th>
                <th>Type</th>
                <th>Destination</th>
                <th>Produits</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state">
                    <p>Aucune sortie trouvée</p>
                  </td>
                </tr>
              ) : (
                currentItems.map((sortie) => (
                  <tr key={sortie.id}>
                    <td className="numero-cell">
                      <span className="numero-badge">{sortie.numero}</span>
                    </td>
                    <td>{sortie.date}</td>
                    <td>
                      <span 
                        className="type-badge"
                        style={{ 
                          backgroundColor: getTypeColor(sortie.type) + "20", 
                          color: getTypeColor(sortie.type) 
                        }}
                      >
                        {getTypeIcon(sortie.type)}
                        {getTypeLabel(sortie.type)}
                      </span>
                    </td>
                    <td>
                      <div className="destination-info">
                        {sortie.type === "vente" ? <User size={14} /> : <Building size={14} />}
                        <span>{sortie.destination}</span>
                      </div>
                    </td>
                    <td>{sortie.produits.reduce((s, p) => s + p.quantite, 0)} articles</td>
                    <td className="price-cell">{sortie.total.toFixed(2)} €</td>
                    <td>
                      <span className={`status-badge status-${getStatutColor(sortie.statut)}`}>
                        {getStatutIcon(sortie.statut)}
                        {getStatutLabel(sortie.statut)}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="action-btn btn-view"
                        onClick={() => handleView(sortie)}
                        title="Voir"
                      >
                        <Eye size={16} />
                      </button>
                      {sortie.statut === "en_attente" && (
                        <>
                          <button
                            className="action-btn btn-edit"
                            onClick={() => handleEdit(sortie)}
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="action-btn btn-validate"
                            onClick={() => handleValidate(sortie.id)}
                            title="Valider"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            className="action-btn btn-cancel"
                            onClick={() => handleCancel(sortie.id)}
                            title="Annuler"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                      {sortie.statut !== "valide" && (
                        <button
                          className="action-btn btn-delete"
                          onClick={() => handleDelete(sortie.id)}
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
        <div className="sorties-grid">
          {currentItems.map((sortie) => (
            <div key={sortie.id} className="sortie-card">
              <div className="sortie-card-header">
                <div className="sortie-card-title">
                  <span className="sortie-numero">{sortie.numero}</span>
                  <span className={`status-badge status-${getStatutColor(sortie.statut)}`}>
                    {getStatutIcon(sortie.statut)}
                    {getStatutLabel(sortie.statut)}
                  </span>
                </div>
                <div className="sortie-card-actions">
                  <button
                    className="action-btn btn-view"
                    onClick={() => handleView(sortie)}
                    title="Voir"
                  >
                    <Eye size={16} />
                  </button>
                  {sortie.statut === "en_attente" && (
                    <>
                      <button
                        className="action-btn btn-edit"
                        onClick={() => handleEdit(sortie)}
                        title="Modifier"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="action-btn btn-validate"
                        onClick={() => handleValidate(sortie.id)}
                        title="Valider"
                      >
                        <Check size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="sortie-card-body">
                <div className="sortie-info">
                  <div className="info-item">
                    <Calendar size={14} />
                    <span>{sortie.date}</span>
                  </div>
                  <div className="info-item">
                    <span 
                      className="type-badge"
                      style={{ 
                        backgroundColor: getTypeColor(sortie.type) + "20", 
                        color: getTypeColor(sortie.type) 
                      }}
                    >
                      {getTypeIcon(sortie.type)}
                      {getTypeLabel(sortie.type)}
                    </span>
                  </div>
                  <div className="info-item">
                    {sortie.type === "vente" ? <User size={14} /> : <Building size={14} />}
                    <span>{sortie.destination}</span>
                  </div>
                  {sortie.responsable && (
                    <div className="info-item">
                      <User size={14} />
                      <span>{sortie.responsable}</span>
                    </div>
                  )}
                </div>
                <div className="sortie-produits">
                  <div className="produits-count">
                    <Package size={14} />
                    <span>{sortie.produits.reduce((s, p) => s + p.quantite, 0)} articles</span>
                  </div>
                  <div className="produits-total">
                    <Banknote size={14} />
                    <span className="total-amount">{sortie.total.toFixed(2)} €</span>
                  </div>
                </div>
                {sortie.notes && (
                  <div className="sortie-notes">
                    <FileText size={14} />
                    <span>{sortie.notes}</span>
                  </div>
                )}
                {sortie.statut === "valide" && sortie.validePar && (
                  <div className="sortie-validation">
                    <CheckCircle size={14} />
                    <span>Validé par {sortie.validePar} le {sortie.dateValidation}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredSorties.length > itemsPerPage && (
        <div className="sorties-pagination">
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
              <h2>{editingSortie ? "Modifier la sortie" : "Nouvelle sortie"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Numéro de sortie *</label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleInputChange}
                    placeholder="SOR-2024-001"
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
                    <option value="vente">Vente</option>
                    <option value="transfert">Transfert</option>
                    <option value="perte">Perte</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Destination *</label>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleInputChange}
                    placeholder="Client / Entrepôt / ..."
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Client (si vente)</label>
                  <select
                    name="client"
                    value={formData.client}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
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
                  <option value="valide">Validé</option>
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
                              {p.nom} (Stock: {p.stock})
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
                <span>{editingSortie ? "Mettre à jour" : "Créer"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedSortie && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Détails de la sortie</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <div className="detail-header-left">
                  <h3 className="detail-numero">{selectedSortie.numero}</h3>
                  <span className={`status-badge status-${getStatutColor(selectedSortie.statut)}`}>
                    {getStatutIcon(selectedSortie.statut)}
                    {getStatutLabel(selectedSortie.statut)}
                  </span>
                  <span 
                    className="type-badge"
                    style={{ 
                      backgroundColor: getTypeColor(selectedSortie.type) + "20", 
                      color: getTypeColor(selectedSortie.type) 
                    }}
                  >
                    {getTypeIcon(selectedSortie.type)}
                    {getTypeLabel(selectedSortie.type)}
                  </span>
                </div>
                <div className="detail-header-right">
                  <span className="detail-date">Créée le {selectedSortie.dateCreation}</span>
                </div>
              </div>

              <div className="detail-info-grid">
                <div className="detail-info-item">
                  <label>Date</label>
                  <div className="detail-info-value">
                    <Calendar size={16} />
                    <span>{selectedSortie.date}</span>
                  </div>
                </div>
                <div className="detail-info-item">
                  <label>Destination</label>
                  <div className="detail-info-value">
                    {selectedSortie.type === "vente" ? <User size={16} /> : <Building size={16} />}
                    <span>{selectedSortie.destination}</span>
                  </div>
                </div>
                {selectedSortie.responsable && (
                  <div className="detail-info-item">
                    <label>Responsable</label>
                    <div className="detail-info-value">
                      <User size={16} />
                      <span>{selectedSortie.responsable}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="detail-produits">
                <h4>Produits</h4>
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
                    {selectedSortie.produits.map((produit, index) => (
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
                      <td className="total-value grand-total">{selectedSortie.total.toFixed(2)} €</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {selectedSortie.notes && (
                <div className="detail-notes">
                  <h4>Notes</h4>
                  <p>{selectedSortie.notes}</p>
                </div>
              )}

              {selectedSortie.statut === "valide" && selectedSortie.validePar && (
                <div className="detail-validation">
                  <CheckCircle size={16} />
                  <span>Validé par {selectedSortie.validePar} le {selectedSortie.dateValidation}</span>
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
              {selectedSortie.statut === "en_attente" && (
                <>
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEdit(selectedSortie);
                    }}
                  >
                    <Edit size={18} />
                    <span>Modifier</span>
                  </button>
                  <button 
                    className="btn btn-success"
                    onClick={() => {
                      handleValidate(selectedSortie.id);
                      setShowDetailModal(false);
                    }}
                  >
                    <Check size={18} />
                    <span>Valider</span>
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

export default Sorties;