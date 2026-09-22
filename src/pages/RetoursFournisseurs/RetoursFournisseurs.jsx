// pages/RetoursFournisseurs/RetoursFournisseurs.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, Search, Eye, ChevronLeft, ChevronRight, Download, X, Check,
  RefreshCw, Grid, List, Package, Banknote, Calendar, Clock,
  AlertCircle, CheckCircle, Ban, FileText, Building, AlertTriangle,
  Trash2, Send, CheckCheck, RotateCcw, Box, Info, MoreVertical
} from "lucide-react";
import RetourFournisseurService from "../../services/retourFournisseur/retourFournisseurService";
import FournisseurService from "../../services/fournisseurService";
import MagasinService from "../../services/magasinService";
import { useUser } from "../../context/AuthContext";
import "./RetoursFournisseurs.css";
import RetourPDFActions from "../../components/RetourFournisseur/RetourPDFActions";

// ============================================================
// HELPERS
// ============================================================
const formatMontant = (v) => {
  const n = parseFloat(v) || 0;
  return Math.round(n).toLocaleString('fr-FR') + ' FCFA';
};

const MOTIFS = [
  { value: 'defectueux',   label: 'Défectueux' },
  { value: 'non_conforme', label: 'Non conforme' },
  { value: 'surplus',      label: 'Surplus' },
  { value: 'perime',       label: 'Périmé' },
  { value: 'autre',        label: 'Autre' },
];

// ============================================================
// COMPOSANT
// ============================================================
const RetoursFournisseurs = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem('token');

  // ============ LISTE ============
  const [retours, setRetours] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [magasin, setMagasin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState("list");
  const [error, setError] = useState(null);
  const [filterStatut, setFilterStatut] = useState("");
  const [filterMotif, setFilterMotif] = useState("");

  // ============ MODALS ============
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRetour, setSelectedRetour] = useState(null);
  const [retourToDelete, setRetourToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatut, setUpdatingStatut] = useState(null);

  // ============ MENU 3 POINTS ============
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // ============ FORMULAIRE SIMPLIFIÉ ============
  const [formData, setFormData] = useState({
    id_fournisseur: "",
    date_retour: new Date().toISOString().split('T')[0],
    motif_retour: "",
    notes: "",
  });

  const [selection, setSelection] = useState({});
  const [produitsRecus, setProduitsRecus] = useState([]);
  const [loadingProduits, setLoadingProduits] = useState(false);

  const canManage = user && ['admin', 'manager'].includes(user.role);

  // ============================================================
  // CHARGEMENT
  // ============================================================
  useEffect(() => {
    if (isAuthenticated && token) {
      loadRetours();
      loadFournisseurs();
      loadMagasin();
    }
  }, [isAuthenticated, token]);

  // Fermer le menu au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadRetours = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await RetourFournisseurService.getAllRetours(token);
      if (response.success) {
        setRetours(response.data || []);
      } else {
        setError(response.message || 'Erreur lors du chargement');
      }
    } catch (error) {
      console.error('❌ LoadRetours error:', error);
      setError(error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadFournisseurs = async () => {
    try {
      const response = await FournisseurService.getActiveFournisseurs(token);
      if (response.success) {
        setFournisseurs(response.data || []);
      }
    } catch (error) {
      console.error('❌ LoadFournisseurs error:', error);
    }
  };

  const loadMagasin = async () => {
    try {
      const res = await MagasinService.getMonMagasin(token);
      if (res.success) setMagasin(res.magasin);
    } catch (error) {
      console.error('❌ LoadMagasin error:', error);
    }
  };

  // ============================================================
  // QUAND LE FOURNISSEUR CHANGE → charger les produits reçus
  // ============================================================
  useEffect(() => {
    const chargerProduits = async () => {
      if (!formData.id_fournisseur) {
        setProduitsRecus([]);
        setSelection({});
        return;
      }

      setLoadingProduits(true);
      try {
        const res = await FournisseurService.getProduitsRecus(
          token,
          formData.id_fournisseur
        );

        if (res.success) {
          setProduitsRecus(res.data || []);

          const sel = {};
          (res.data || []).forEach(p => {
            sel[p.id_produit] = {
              selected: true,
              quantite: p.quantite_max_retournable,
            };
          });
          setSelection(sel);
        } else {
          setProduitsRecus([]);
        }
      } catch (err) {
        console.error('❌ Chargement produits reçus:', err);
        setProduitsRecus([]);
      } finally {
        setLoadingProduits(false);
      }
    };

    if (showModal) chargerProduits();
  }, [formData.id_fournisseur, showModal, token]);

  // ============================================================
  // ACTIONS FORMULAIRE
  // ============================================================
  const toggleProduit = (idProduit) => {
    setSelection(prev => ({
      ...prev,
      [idProduit]: {
        ...prev[idProduit],
        selected: !prev[idProduit]?.selected,
      }
    }));
  };

  const updateQuantite = (idProduit, valeur, max) => {
    let q = parseInt(valeur, 10);
    if (isNaN(q) || q < 1) q = 1;
    if (q > max) q = max;

    setSelection(prev => ({
      ...prev,
      [idProduit]: { ...prev[idProduit], quantite: q }
    }));
  };

  const selectionnerTout = () => {
    const sel = {};
    produitsRecus.forEach(p => {
      sel[p.id_produit] = {
        selected: true,
        quantite: p.quantite_max_retournable,
      };
    });
    setSelection(sel);
  };

  const deselectionnerTout = () => {
    const sel = {};
    produitsRecus.forEach(p => {
      sel[p.id_produit] = {
        ...selection[p.id_produit],
        selected: false,
      };
    });
    setSelection(sel);
  };

  // ============================================================
  // CALCULS
  // ============================================================
  const lignesSelectionnees = useMemo(() => {
    return produitsRecus
      .filter(p => selection[p.id_produit]?.selected)
      .map(p => ({
        produit: p,
        quantite: selection[p.id_produit]?.quantite || 0,
        prix_total: (selection[p.id_produit]?.quantite || 0) * p.prix_achat,
      }));
  }, [produitsRecus, selection]);

  const totalSelectionne = useMemo(() => {
    const nbProduits = lignesSelectionnees.length;
    const montant = lignesSelectionnees.reduce((s, l) => s + l.prix_total, 0);
    return { nbProduits, montant };
  }, [lignesSelectionnees]);

  // ============================================================
  // HANDLERS PRINCIPAUX
  // ============================================================
  const handleAdd = () => {
    setFormData({
      id_fournisseur: "",
      date_retour: new Date().toISOString().split('T')[0],
      motif_retour: "",
      notes: "",
    });
    setProduitsRecus([]);
    setSelection({});
    setError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.id_fournisseur) {
      setError("Veuillez sélectionner un fournisseur");
      return;
    }
    if (!formData.motif_retour) {
      setError("Veuillez sélectionner un motif");
      return;
    }
    if (lignesSelectionnees.length === 0) {
      setError("Veuillez sélectionner au moins un produit");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        id_fournisseur: parseInt(formData.id_fournisseur),
        date_retour: formData.date_retour,
        motif_retour: formData.motif_retour,
        notes: formData.notes || null,
        lignes: lignesSelectionnees.map(l => ({
          id_produit: l.produit.id_produit,
          quantite: l.quantite,
          prix_achat: l.produit.prix_achat || 0,
          remise: 0,
          motif_retour: formData.motif_retour,
          etat_produit: 'neuf',
          notes: null,
        })),
      };

      const response = await RetourFournisseurService.createRetour(token, data);

      if (response.success) {
        await loadRetours();
        setShowModal(false);
        alert('✅ Retour créé avec succès !');
      } else {
        setError(response.message || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      console.error('❌ Save error:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleView = async (retour) => {
    setLoading(true);
    try {
      const response = await RetourFournisseurService.getRetourById(token, retour.id_retour);
      if (response.success && response.data) {
        setSelectedRetour({
          ...response.data,
          magasin,  // ← injecté pour le PDF
        });
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('❌ View error:', err);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatut = async (id, statut) => {
    if (updatingStatut === id) return;
    setUpdatingStatut(id);
    try {
      const response = await RetourFournisseurService.updateStatut(token, id, statut);
      if (response.success) await loadRetours();
    } catch (err) {
      console.error('❌ Statut error:', err);
    } finally {
      setUpdatingStatut(null);
    }
  };

  const handleAnnuler = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler ce retour ?")) return;
    setUpdatingStatut(id);
    try {
      const response = await RetourFournisseurService.annulerRetour(token, id);
      if (response.success) await loadRetours();
    } catch (err) {
      console.error('❌ Annuler error:', err);
    } finally {
      setUpdatingStatut(null);
    }
  };

  const confirmDelete = (retour) => {
    setRetourToDelete(retour);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!retourToDelete) return;
    setDeleting(true);
    try {
      const response = await RetourFournisseurService.deleteRetour(token, retourToDelete.id_retour);
      if (response.success) {
        await loadRetours();
        setShowDeleteModal(false);
        setRetourToDelete(null);
      }
    } catch (err) {
      console.error('❌ Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await RetourFournisseurService.exportRetours(token);
      if (response.success && response.data) {
        const headers = ["ID", "Numéro", "Date", "Fournisseur", "Motif", "Montant", "Statut"];
        const rows = response.data.map(r => [
          r.id, r.numero, r.date, r.fournisseur, r.motif,
          formatMontant(r.montant), r.statut
        ]);
        let csv = headers.join(",") + "\n";
        rows.forEach(row => {
          csv += row.map(c => `"${c}"`).join(",") + "\n";
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `retours_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('❌ Export error:', err);
    }
  };

  // ============================================================
  // STATS + FILTRES + PAGINATION
  // ============================================================
  const stats = useMemo(() => {
    const total = retours.length;
    const enAttente = retours.filter(r => r.statut === 'en_attente').length;
    const envoye = retours.filter(r => r.statut === 'envoye').length;
    const recuParFournisseur = retours.filter(r => r.statut === 'recu_par_fournisseur').length;
    const traite = retours.filter(r => r.statut === 'traite').length;
    const annule = retours.filter(r => r.statut === 'annule').length;
    const totalMontant = retours.reduce((s, r) => s + (parseFloat(r.montant_total) || 0), 0);
    return { total, enAttente, envoye, recuParFournisseur, traite, annule, totalMontant };
  }, [retours]);

  const filteredRetours = useMemo(() => {
    return retours.filter(r => {
      const matchSearch =
        r.numero_retour?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.fournisseur_nom?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatut = filterStatut ? r.statut === filterStatut : true;
      const matchMotif = filterMotif ? r.motif_retour === filterMotif : true;
      return matchSearch && matchStatut && matchMotif;
    });
  }, [retours, searchTerm, filterStatut, filterMotif]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRetours.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRetours.length / itemsPerPage);

  // ============================================================
  // HELPERS RENDU
  // ============================================================
  const getMotifLabel = (m) => MOTIFS.find(x => x.value === m)?.label || m;
  const getMotifBadge = (m) => `motif-${m || 'autre'}`;

  const renderStatut = (statut) => {
    const configs = {
      'en_attente': { label: 'En attente', className: 'status-en-attente', icon: Clock },
      'envoye': { label: 'Envoyé', className: 'status-envoye', icon: Send },
      'recu_par_fournisseur': { label: 'Reçu par fournisseur', className: 'status-recu-fournisseur', icon: CheckCircle },
      'traite': { label: 'Traité', className: 'status-traite', icon: CheckCheck },
      'annule': { label: 'Annulé', className: 'status-annule', icon: Ban }
    };
    const config = configs[statut] || configs['en_attente'];
    const Icon = config.icon;
    return (
      <span className={`status-badge ${config.className}`}>
        <Icon size={14} /> {config.label}
      </span>
    );
  };

  const renderMotif = (motif) => (
    <span className={`motif-badge ${getMotifBadge(motif)}`}>
      {getMotifLabel(motif)}
    </span>
  );

  // ============================================================
  // MENU 3 POINTS
  // ============================================================
  const renderActionsMenu = (retour) => {
    const isOpen = openMenuId === retour.id_retour;
    const isInactive = ['traite', 'annule'].includes(retour.statut);

    return (
      <div className="actions-menu-wrapper" ref={isOpen ? menuRef : null}>
        <button
          className="action-btn btn-more"
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuId(isOpen ? null : retour.id_retour);
          }}
          title="Plus d'actions"
        >
          <MoreVertical size={16} />
        </button>

        {isOpen && (
          <div className="actions-dropdown" onClick={(e) => e.stopPropagation()}>
            {/* Voir les détails */}
            <button
              className="dropdown-action"
              onClick={() => {
                handleView(retour);
                setOpenMenuId(null);
              }}
            >
              <Eye size={15} />
              <span>Voir les détails</span>
            </button>

            {/* Envoyer au fournisseur (si en_attente) */}
            {canManage && retour.statut === 'en_attente' && (
              <button
                className="dropdown-action primary"
                onClick={() => {
                  handleChangeStatut(retour.id_retour, 'envoye');
                  setOpenMenuId(null);
                }}
                disabled={updatingStatut === retour.id_retour}
              >
                <Send size={15} />
                <span>Envoyer au fournisseur</span>
              </button>
            )}

            {/* Marquer reçu (si envoyé) */}
            {canManage && retour.statut === 'envoye' && (
              <button
                className="dropdown-action success"
                onClick={() => {
                  handleChangeStatut(retour.id_retour, 'recu_par_fournisseur');
                  setOpenMenuId(null);
                }}
                disabled={updatingStatut === retour.id_retour}
              >
                <CheckCircle size={15} />
                <span>Marquer reçu</span>
              </button>
            )}

            {/* Marquer traité (si reçu par fournisseur) */}
            {canManage && retour.statut === 'recu_par_fournisseur' && (
              <button
                className="dropdown-action success"
                onClick={() => {
                  handleChangeStatut(retour.id_retour, 'traite');
                  setOpenMenuId(null);
                }}
                disabled={updatingStatut === retour.id_retour}
              >
                <CheckCheck size={15} />
                <span>Marquer traité</span>
              </button>
            )}

            {/* Actions destructives */}
            {canManage && !isInactive && (
              <>
                <div className="dropdown-separator" />

                {['en_attente', 'envoye'].includes(retour.statut) && (
                  <button
                    className="dropdown-action warning"
                    onClick={() => {
                      handleAnnuler(retour.id_retour);
                      setOpenMenuId(null);
                    }}
                    disabled={updatingStatut === retour.id_retour}
                  >
                    <Ban size={15} />
                    <span>Annuler le retour</span>
                  </button>
                )}

                {retour.statut === 'en_attente' && (
                  <button
                    className="dropdown-action danger"
                    onClick={() => {
                      confirmDelete(retour);
                      setOpenMenuId(null);
                    }}
                  >
                    <Trash2 size={15} />
                    <span>Supprimer</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // VUES LISTE / GRILLE
  // ============================================================
  const renderListView = () => (
    <div className="retours-table-container">
      <table className="retours-table">
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Date</th>
            <th>Fournisseur</th>
            <th>Motif</th>
            <th>Montant</th>
            <th>Statut</th>
            <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.length === 0 ? (
            <tr>
              <td colSpan="7" className="empty-state">
                <Package size={32} />
                <p>Aucun retour trouvé</p>
              </td>
            </tr>
          ) : (
            currentItems.map((r) => (
              <tr key={r.id_retour}>
                <td className="numero-cell">
                  <span className="retour-numero">{r.numero_retour}</span>
                </td>
                <td>{new Date(r.date_retour).toLocaleDateString('fr-FR')}</td>
                <td className="fournisseur-cell">
                  <Building size={14} />
                  <span>{r.fournisseur_nom || '-'}</span>
                </td>
                <td>{renderMotif(r.motif_retour)}</td>
                <td className="montant-cell">
                  <strong>{formatMontant(r.montant_total)}</strong>
                </td>
                <td>{renderStatut(r.statut)}</td>
                <td className="actions-cell">
                  {renderActionsMenu(r)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderGridView = () => (
    <div className="retours-grid">
      {currentItems.length === 0 ? (
        <div className="empty-state">
          <RotateCcw size={48} className="empty-icon" />
          <p>Aucun retour trouvé</p>
        </div>
      ) : (
        currentItems.map((r) => (
          <div key={r.id_retour} className="retour-card">
            <div className="retour-card-header">
              <div className="retour-info">
                <span className="retour-numero">{r.numero_retour}</span>
                <span className="retour-date">
                  <Calendar size={14} />
                  {new Date(r.date_retour).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="retour-card-actions">
                {renderActionsMenu(r)}
              </div>
            </div>
            <div className="retour-card-body">
              <div className="fournisseur-info">
                <Building size={16} />
                <span>{r.fournisseur_nom || '-'}</span>
              </div>
              <div className="retour-motif">{renderMotif(r.motif_retour)}</div>
              <div className="retour-montant">
                <Banknote size={16} />
                <span>{formatMontant(r.montant_total)}</span>
              </div>
            </div>
            <div className="retour-card-footer">{renderStatut(r.statut)}</div>
          </div>
        ))
      )}
    </div>
  );

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <div className="retours-container">
      {/* HEADER */}
      <div className="retours-header">
        <div>
          <h1 className="retours-title">🔄 Retours Fournisseurs</h1>
          <p className="retours-subtitle">{stats.total} retours au total</p>
        </div>
        <div className="retours-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              <span>Nouveau Retour</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            <span>Exporter</span>
          </button>
          <button className="btn btn-secondary" onClick={loadRetours} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="retours-stats">
        <div className="stat-card">
          <div className="stat-icon total"><RotateCcw size={20} /></div>
          <div className="stat-info"><span className="stat-label">Total</span><span className="stat-value">{stats.total}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon en-attente"><Clock size={20} /></div>
          <div className="stat-info"><span className="stat-label">En attente</span><span className="stat-value">{stats.enAttente}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon envoye"><Send size={20} /></div>
          <div className="stat-info"><span className="stat-label">Envoyés</span><span className="stat-value">{stats.envoye}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon recu-par-fournisseur"><CheckCircle size={20} /></div>
          <div className="stat-info"><span className="stat-label">Reçus</span><span className="stat-value">{stats.recuParFournisseur}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon traite"><CheckCheck size={20} /></div>
          <div className="stat-info"><span className="stat-label">Traités</span><span className="stat-value">{stats.traite}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon annule"><Ban size={20} /></div>
          <div className="stat-info"><span className="stat-label">Annulés</span><span className="stat-value">{stats.annule}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon montant"><Banknote size={20} /></div>
          <div className="stat-info"><span className="stat-label">Total</span><span className="stat-value">{formatMontant(stats.totalMontant)}</span></div>
        </div>
      </div>

      {/* FILTRES */}
      <div className="retours-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher un retour..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <select className="filter-select" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="envoye">Envoyé</option>
          <option value="recu_par_fournisseur">Reçu par fournisseur</option>
          <option value="traite">Traité</option>
          <option value="annule">Annulé</option>
        </select>
        <select className="filter-select" value={filterMotif} onChange={(e) => setFilterMotif(e.target.value)}>
          <option value="">Tous les motifs</option>
          {MOTIFS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <div className="view-toggle">
          <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
            <Grid size={18} />
          </button>
          <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
            <List size={18} />
          </button>
        </div>
      </div>

      {/* CONTENU */}
      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Chargement...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-secondary" onClick={loadRetours}>Réessayer</button>
        </div>
      )}

      {!loading && !error && (
        viewMode === 'grid' ? renderGridView() : renderListView()
      )}

      {/* PAGINATION */}
      {!loading && !error && filteredRetours.length > itemsPerPage && (
        <div className="retours-pagination">
          <button className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}>
            <ChevronLeft size={18} />
          </button>
          <span className="pagination-info">Page {currentPage} sur {totalPages}</span>
          <button className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ============================================================
          MODAL — NOUVEAU RETOUR (SIMPLIFIÉ)
          ============================================================ */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouveau Retour Fournisseur</h2>
              <button className="modal-close" onClick={() => !saving && setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {error && (
                <div className="modal-error">
                  <AlertTriangle size={18} />
                  <p>{error}</p>
                </div>
              )}

              {/* ÉTAPE 1 : Fournisseur + Date */}
              <div className="form-section">
                <div className="section-header">
                  <h4><Building size={18} /> 1. Fournisseur</h4>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Fournisseur *</label>
                    <select
                      value={formData.id_fournisseur}
                      onChange={(e) => setFormData({ ...formData, id_fournisseur: e.target.value })}
                      className="form-select"
                      disabled={saving}
                    >
                      <option value="">Sélectionner un fournisseur</option>
                      {fournisseurs.map(f => (
                        <option key={f.id_fournisseur} value={f.id_fournisseur}>
                          {f.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Date de retour *</label>
                    <input
                      type="date"
                      value={formData.date_retour}
                      onChange={(e) => setFormData({ ...formData, date_retour: e.target.value })}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              {/* ÉTAPE 2 : Produits reçus */}
              {formData.id_fournisseur && (
                <div className="form-section">
                  <div className="section-header">
                    <h4><Package size={18} /> 2. Produits reçus de ce fournisseur</h4>
                    {produitsRecus.length > 0 && (
                      <div className="section-actions">
                        <button type="button" className="btn-link" onClick={selectionnerTout}>
                          Tout sélectionner
                        </button>
                        <button type="button" className="btn-link" onClick={deselectionnerTout}>
                          Tout désélectionner
                        </button>
                      </div>
                    )}
                  </div>

                  {loadingProduits ? (
                    <div className="produits-loading">
                      <div className="spinner-small"></div>
                      <span>Chargement des produits...</span>
                    </div>
                  ) : produitsRecus.length === 0 ? (
                    <div className="empty-produits">
                      <Info size={20} />
                      <div>
                        <strong>Aucun produit reçu de ce fournisseur</strong>
                        <p>
                          Vous ne pouvez retourner que les produits qui vous ont été livrés.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="produits-table-wrapper">
                      <table className="produits-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}></th>
                            <th>Produit</th>
                            <th style={{ width: '90px' }}>Stock</th>
                            <th style={{ width: '110px' }}>Reçu</th>
                            <th style={{ width: '110px' }}>Retourné</th>
                            <th style={{ width: '110px' }}>Max</th>
                            <th style={{ width: '120px' }}>Qté à retourner</th>
                            <th style={{ width: '120px' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {produitsRecus.map(p => {
                            const s = selection[p.id_produit] || {};
                            const isSel = s.selected;
                            const qte = s.quantite || 0;
                            const total = qte * p.prix_achat;

                            return (
                              <tr key={p.id_produit} className={isSel ? 'selected' : ''}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={!!isSel}
                                    onChange={() => toggleProduit(p.id_produit)}
                                  />
                                </td>
                                <td>
                                  <div className="produit-cell">
                                    <strong>{p.nom}</strong>
                                    {p.unite_symbole && (
                                      <span className="unite-label"> · {p.unite_symbole}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="center">{p.quantite_stock}</td>
                                <td className="center">{p.quantite_recue}</td>
                                <td className="center">{p.quantite_deja_retournee}</td>
                                <td className="center">
                                  <strong className="max-badge">
                                    {p.quantite_max_retournable}
                                  </strong>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="qte-input"
                                    value={qte}
                                    min="1"
                                    max={p.quantite_max_retournable}
                                    onChange={(e) => updateQuantite(
                                      p.id_produit,
                                      e.target.value,
                                      p.quantite_max_retournable
                                    )}
                                    disabled={!isSel}
                                  />
                                </td>
                                <td className="montant-cell">
                                  {formatMontant(total)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ÉTAPE 3 : Motif + Notes */}
              {lignesSelectionnees.length > 0 && (
                <div className="form-section">
                  <div className="section-header">
                    <h4><FileText size={18} /> 3. Motif et validation</h4>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Motif global *</label>
                      <select
                        value={formData.motif_retour}
                        onChange={(e) => setFormData({ ...formData, motif_retour: e.target.value })}
                        className="form-select"
                        disabled={saving}
                      >
                        <option value="">Sélectionner un motif</option>
                        {MOTIFS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Notes</label>
                      <input
                        type="text"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Notes supplémentaires..."
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="recap-total">
                    <span>
                      <strong>{totalSelectionne.nbProduits}</strong> produit(s) sélectionné(s)
                    </span>
                    <span className="recap-montant">
                      Total : <strong>{formatMontant(totalSelectionne.montant)}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={
                  saving ||
                  !formData.id_fournisseur ||
                  !formData.motif_retour ||
                  lignesSelectionnees.length === 0
                }
              >
                {saving ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Créer le retour</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL — DÉTAILS
          ============================================================ */}
      {showDetailModal && selectedRetour && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Détails du retour</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RetourPDFActions
                  retourData={selectedRetour}
                  onClose={() => setShowDetailModal(false)}
                />
                <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <div className="detail-header-left">
                  <div className="detail-icon"><RotateCcw size={28} /></div>
                  <div>
                    <h3 className="detail-numero">{selectedRetour.numero_retour}</h3>
                    <span className="detail-date">
                      <Calendar size={14} />
                      {new Date(selectedRetour.date_retour).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <div className="detail-header-right">
                  {renderStatut(selectedRetour.statut)}
                  {renderMotif(selectedRetour.motif_retour)}
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-section">
                  <h4><Building size={16} /> Fournisseur</h4>
                  <div className="detail-item">
                    <label>Nom</label>
                    <span>{selectedRetour.fournisseur_nom || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Téléphone</label>
                    <span>{selectedRetour.fournisseur_telephone || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <span>{selectedRetour.fournisseur_email || '-'}</span>
                  </div>
                </div>
                <div className="detail-section">
                  <h4><FileText size={16} /> Informations</h4>
                  <div className="detail-item">
                    <label>Commande</label>
                    <span>{selectedRetour.numero_commande || '—'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Réception</label>
                    <span>{selectedRetour.numero_reception || '—'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Montant total</label>
                    <span className="montant-total">{formatMontant(selectedRetour.montant_total)}</span>
                  </div>
                </div>
              </div>

              {selectedRetour.lignes?.length > 0 && (
                <div className="detail-lignes">
                  <h4>Produits retournés</h4>
                  <div className="detail-lignes-wrapper">
                    <table className="detail-lignes-table">
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Quantité</th>
                          <th>Prix unit.</th>
                          <th>Total</th>
                          <th>Motif</th>
                          <th>État</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRetour.lignes.map((l, i) => (
                          <tr key={i}>
                            <td><span className="produit-nom">{l.produit_nom}</span></td>
                            <td>{l.quantite} {l.unite_symbole || ''}</td>
                            <td>{formatMontant(l.prix_achat)}</td>
                            <td className="montant-cell">
                              {formatMontant(l.montant_total || (l.quantite * l.prix_achat))}
                            </td>
                            <td>{renderMotif(l.motif_retour)}</td>
                            <td>
                              <span className={`etat-badge etat-${l.etat_produit || 'neuf'}`}>
                                {l.etat_produit || 'neuf'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL — SUPPRESSION
          ============================================================ */}
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
              <div className="delete-icon-wrapper">
                <AlertTriangle size={48} color="#ef4444" />
              </div>
              <p>Êtes-vous sûr de vouloir supprimer ce retour ?</p>
              <p className="delete-item-name">
                <strong>"{retourToDelete?.numero_retour}"</strong>
              </p>
              <p className="delete-warning">⚠️ Cette action est irréversible</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Annuler
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetoursFournisseurs;