// pages/RetoursClients/RetoursClients.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import {
  Plus, Search, Eye, X, Check, RefreshCw,
  AlertCircle, CheckCircle, Ban, FileText,
  RotateCcw, ShoppingBag, User, Phone,
  Calendar, Package, Box, Trash2, Loader,
  ChevronRight, ChevronLeft, Info, AlertTriangle,
  MoreVertical, Printer
} from "lucide-react";
import RetourClientService from "../../services/retourClient/retourClientService";
import CommandeVenteService from "../../services/commandeVenteService";
import UniteVenteService from "../../services/uniteVenteService";
import StockSelector from "../../components/StockSelector/StockSelector";
import { useUser } from "../../context/AuthContext";
import "./RetoursClients.css";

// ============================================================
// Helpers
// ============================================================
const formatMontant = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0 FCFA';
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(num)) return '0 FCFA';
  const fixed = Math.round(num).toString();
  const formatted = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} FCFA`;
};

const formatDateFR = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return '-';
  }
};

const MOTIFS = [
  { value: 'defectueux', label: 'Produit défectueux' },
  { value: 'non_conforme', label: 'Non conforme' },
  { value: 'mecontentement', label: 'Mécontentement' },
  { value: 'erreur_livraison', label: 'Erreur de livraison' },
  { value: 'echange', label: 'Échange' },
  { value: 'autre', label: 'Autre' },
];

const RESOLUTIONS = [
  { value: 'remboursement_especes', label: 'Remboursement espèces', icon: "" },
  { value: 'avoir', label: 'Avoir / Crédit', icon: "" },
  { value: 'echange', label: 'Échange', icon: "" },
];

const ETATS_PRODUIT = [
  { value: 'neuf', label: 'Neuf (revendable)' },
  { value: 'usage', label: 'Usagé' },
  { value: 'endommage', label: 'Endommagé' },
  { value: 'incomplet', label: 'Incomplet' },
];

// ============================================================
// Sous-composant : Affichage d'une quantité en unités de vente
// ============================================================
const QteAffichage = ({ qteBase, unitesVente, uniteBase, isLow, variant = "list" }) => {
  if (!qteBase || qteBase <= 0) {
    return <span className="qte-vide">0</span>;
  }

  // Filtrer l'unité de base (StockSelector la reconstruit lui-même)
  const unitesPerso = (unitesVente || []).filter(u => !u.is_base && u.nom);

  return (
    <StockSelector
      idProduit={`qte-${Math.random().toString(36).slice(2, 8)}`}
      stockBase={qteBase}
      unitesVente={unitesPerso}
      uniteBase={uniteBase || { nom: 'Unité', symbole: 'u' }}
      isLowStock={isLow}
      variant={variant}
    />
  );
};

// ============================================================
// Composant principal
// ============================================================
const RetoursClients = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem('token');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { slug } = useParams();

  // ========== ÉTATS ==========
  const [retours, setRetours] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ========== WIZARD ==========
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Étape 1 : Recherche commande
  const [searchCommande, setSearchCommande] = useState('');
  const [resultatsRecherche, setResultatsRecherche] = useState([]);
  const [isSearchingCommande, setIsSearchingCommande] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [lignesCommande, setLignesCommande] = useState([]);
  const searchDebounce = useRef(null);

  // Étape 2 : Détail du retour
  const [motifRetour, setMotifRetour] = useState('defectueux');
  const [typeResolution, setTypeResolution] = useState('remboursement_especes');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // ========== MODALS ==========
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRetour, setSelectedRetour] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const canManage = user && ['admin', 'manager', 'caissier'].includes(user.role);

  // ========== CHARGEMENT ==========
  const loadRetours = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await RetourClientService.getAll(token, {
        search: searchTerm || undefined,
        statut: filterStatut || undefined,
        limit: 100
      });
      if (response.success) {
        setRetours(response.data || []);
      } else {
        setError(response.message || 'Erreur de chargement');
      }
    } catch (err) {
      console.error('❌ LoadRetours:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await RetourClientService.getStats(token);
      if (response.success) setStats(response.data);
    } catch (err) {
      console.error('❌ LoadStats:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      loadRetours();
      loadStats();
    }
  }, [isAuthenticated, token, filterStatut]);

  // ========== ÉCOUTER LE PARAM URL (depuis Ventes.jsx) ==========
  useEffect(() => {
    const commandeParam = searchParams.get('commande');
    if (commandeParam) {
      handleOpenWizardAvecCommande(parseInt(commandeParam));
    }
  }, [searchParams]);

  // ========== WIZARD : ouvrir avec une commande pré-sélectionnée ==========
  const handleOpenWizardAvecCommande = async (idCommande) => {
    setShowWizard(true);
    setWizardStep(2);
    setSearchCommande('');
    setResultatsRecherche([]);

    try {
      const res = await CommandeVenteService.getCommandeById(token, idCommande);
      if (res.success && res.data) {
        chargerCommandeDansWizard(res.data);
      } else {
        showToast('Commande introuvable', 'error');
        setShowWizard(false);
      }
    } catch (err) {
      console.error('❌ LoadCommandeParam:', err);
      showToast('Erreur lors du chargement de la commande', 'error');
      setShowWizard(false);
    }
  };

  // ========== WIZARD : ouvrir vide ==========
  const handleOpenWizard = () => {
    setShowWizard(true);
    setWizardStep(1);
    setSearchCommande('');
    setResultatsRecherche([]);
    setSelectedCommande(null);
    setLignesCommande([]);
    setMotifRetour('defectueux');
    setTypeResolution('remboursement_especes');
    setNotes('');
  };

  // ========== WIZARD : recherche de commande ==========
  const rechercherCommande = (texte) => {
    setSearchCommande(texte);
    setSelectedCommande(null);
    setLignesCommande([]);

    if (texte.trim().length < 2) {
      setResultatsRecherche([]);
      return;
    }

    setIsSearchingCommande(true);

    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await RetourClientService.searchCommande(token, texte.trim());
        if (res.success) {
          setResultatsRecherche(res.data || []);
        }
      } catch (err) {
        console.error('❌ Search commande:', err);
        setResultatsRecherche([]);
      } finally {
        setIsSearchingCommande(false);
      }
    }, 350);
  };

  // ========== WIZARD : sélectionner une commande ==========
  const selectionnerCommande = async (commande) => {
    try {
      const res = await CommandeVenteService.getCommandeById(token, commande.id_commande);
      if (res.success && res.data) {
        chargerCommandeDansWizard(res.data);
        setWizardStep(2);
      }
    } catch (err) {
      console.error('❌ SelectionnerCommande:', err);
      showToast('Erreur lors du chargement', 'error');
    }
  };

  // ========== WIZARD : charger les données de la commande ==========
  const chargerCommandeDansWizard = async (commandeComplete) => {
    setSelectedCommande(commandeComplete);

    const lignes = (commandeComplete.lignes || []).map(l => {
      const achete = parseFloat(l.quantite_totale_base) || 0;
      const dejaRetourne = parseFloat(l.quantite_retournee_base) || 0;
      const retournable = achete - dejaRetourne;

      return {
        id_produit: l.id_produit,
        id_ligne_vente: l.id_ligne_vente,
        produit_nom: l.produit_nom,
        marque_nom: l.marque_nom,

        // Unité d'origine (celle de la vente)
        id_unite_vente_origine: l.id_unite_vente,
        nom_unite_vente_origine: l.nom_unite_vente || 'Unité',
        quantite_base_origine: parseFloat(l.quantite_base) || 1,
        quantite_origine: parseFloat(l.quantite) || 0,
        prix_vente_origine: parseFloat(l.prix_vente) || 0,

        // Unité de base du produit (pour StockSelector)
        unite_base_nom: l.unite_nom || 'Unité',
        unite_base_symbole: l.unite_symbole || 'u',

        // Quantités
        quantite_achetee_base: achete,
        quantite_deja_retournee_base: dejaRetourne,
        quantite_retournable_base: retournable,

        // Sélection utilisateur
        quantite_a_retourner: 0,
        unite_selectionnee: null,
        unites_disponibles: [],
        etat_produit: 'neuf'
      };
    });

    // Charger les unités de vente pour chaque produit
    for (const ligne of lignes) {
      try {
        const resUnites = await UniteVenteService.getByProduit(token, ligne.id_produit);
        const unitesPerso = (resUnites.success && resUnites.data) ? resUnites.data : [];

        const uniteBase = {
          id_unite_vente: null,
          nom: ligne.unite_base_nom,
          quantite_base: 1,
          is_base: true
        };

        const toutes = [uniteBase, ...unitesPerso];

        // Ajouter l'unité d'origine si elle n'y est pas déjà
        const origineExiste = toutes.some(u =>
          u.id_unite_vente === ligne.id_unite_vente_origine
        );
        if (!origineExiste && ligne.id_unite_vente_origine) {
          toutes.push({
            id_unite_vente: ligne.id_unite_vente_origine,
            nom: ligne.nom_unite_vente_origine,
            quantite_base: ligne.quantite_base_origine,
            is_origine: true
          });
        }

        ligne.unites_disponibles = toutes;

        // Par défaut : sélectionner l'unité d'origine
        const origine = toutes.find(u =>
          u.id_unite_vente === ligne.id_unite_vente_origine
        ) || uniteBase;
        ligne.unite_selectionnee = origine;

      } catch (err) {
        console.warn('⚠️ Impossible de charger les unités pour', ligne.produit_nom, err);
        ligne.unites_disponibles = [{
          id_unite_vente: null,
          nom: ligne.unite_base_nom,
          quantite_base: 1,
          is_base: true
        }];
        ligne.unite_selectionnee = ligne.unites_disponibles[0];
      }
    }

    setLignesCommande(lignes);
  };

  // ========== WIZARD : mettre à jour une ligne ==========
  const updateLigne = (index, field, value) => {
    setLignesCommande(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };

      if (field === 'unite_selectionnee') {
        copy[index].quantite_a_retourner = 0;
      }

      return copy;
    });
  };

  // ========== WIZARD : calcul du total à rembourser ==========
  const totalRemboursement = useMemo(() => {
    let total = 0;
    for (const ligne of lignesCommande) {
      const qte = parseFloat(ligne.quantite_a_retourner) || 0;
      if (qte <= 0) continue;

      const unite = ligne.unite_selectionnee;
      if (!unite) continue;

      const qteBase = qte * (parseFloat(unite.quantite_base) || 1);

      const prixOrigineTotal = ligne.quantite_origine * ligne.prix_vente_origine;
      const prixUnitaireBase = prixOrigineTotal / ligne.quantite_achetee_base;

      total += qteBase * prixUnitaireBase;
    }
    return total;
  }, [lignesCommande]);

  // ========== WIZARD : vérifier validité ==========
  const lignesValides = useMemo(() => {
    return lignesCommande.filter(l => {
      const qte = parseFloat(l.quantite_a_retourner) || 0;
      if (qte <= 0) return false;
      if (!l.unite_selectionnee) return false;
      const qteBase = qte * (parseFloat(l.unite_selectionnee.quantite_base) || 1);
      return qteBase <= l.quantite_retournable_base;
    });
  }, [lignesCommande]);

  const peutValider = lignesValides.length > 0;

  // ========== WIZARD : soumettre ==========
  const handleSubmitRetour = async () => {
    if (!selectedCommande) {
      showToast('Aucune commande sélectionnée', 'warning');
      return;
    }
    if (!peutValider) {
      showToast('Sélectionnez au moins un produit à retourner', 'warning');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        id_commande_vente: selectedCommande.id_commande,
        motif_retour: motifRetour,
        type_resolution: typeResolution,
        notes: notes.trim() || null,
        lignes: lignesValides.map(l => ({
          id_produit: l.id_produit,
          id_unite_vente: l.unite_selectionnee.id_unite_vente,
          nom_unite_vente: l.unite_selectionnee.nom,
          quantite_base: l.unite_selectionnee.quantite_base,
          quantite: parseFloat(l.quantite_a_retourner),
          etat_produit: l.etat_produit
        }))
      };

      const res = await RetourClientService.create(token, payload);

      if (res.success) {
        showToast(`Retour ${res.data.numero_retour} créé avec succès`, 'success');
        setShowWizard(false);
        await loadRetours();
        await loadStats();
        if (searchParams.get('commande')) {
          navigate(`/${slug}/retours-clients`, { replace: true });
        }
      } else {
        showToast(res.message || 'Erreur lors de la création', 'error');
      }
    } catch (err) {
      console.error('❌ Submit retour:', err);
      showToast(err.message || 'Erreur lors de la création', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ========== VOIR DÉTAIL ==========
  const handleView = async (retour) => {
    setOpenMenuId(null);
    try {
      const res = await RetourClientService.getById(token, retour.id_retour_client);
      if (res.success) {
        setSelectedRetour(res.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('❌ View retour:', err);
      showToast('Erreur lors du chargement', 'error');
    }
  };

  // ========== ANNULER ==========
  const handleAnnuler = async (retour) => {
    setOpenMenuId(null);
    if (!window.confirm(`Annuler le retour ${retour.numero_retour} ?`)) return;

    try {
      const res = await RetourClientService.annuler(token, retour.id_retour_client);
      if (res.success) {
        showToast('Retour annulé', 'success');
        await loadRetours();
        await loadStats();
      } else {
        showToast(res.message || 'Erreur', 'error');
      }
    } catch (err) {
      console.error('❌ Annuler:', err);
      showToast(err.message || 'Erreur', 'error');
    }
  };

  // ========== STATUT BADGE ==========
  const getStatutBadge = (statut) => {
    const configs = {
      'en_attente': { label: 'En attente', cls: 'badge-en-attente' },
      'recu': { label: 'Reçu', cls: 'badge-recu' },
      'controle': { label: 'Contrôlé', cls: 'badge-controle' },
      'accepte': { label: 'Accepté', cls: 'badge-accepte' },
      'refuse': { label: 'Refusé', cls: 'badge-refuse' },
      'rembourse': { label: 'Remboursé', cls: 'badge-rembourse' },
      'echange': { label: 'Échangé', cls: 'badge-echange' },
      'annule': { label: 'Annulé', cls: 'badge-annule' },
    };
    const c = configs[statut] || configs['en_attente'];
    return <span className={`retour-badge ${c.cls}`}>{c.label}</span>;
  };

  // ========== PAGINATION ==========
  const filteredRetours = useMemo(() => {
    if (!searchTerm) return retours;
    const s = searchTerm.toLowerCase();
    return retours.filter(r =>
      r.numero_retour?.toLowerCase().includes(s) ||
      r.nomclient?.toLowerCase().includes(s) ||
      r.telephone?.toLowerCase().includes(s) ||
      r.numero_commande?.toLowerCase().includes(s)
    );
  }, [retours, searchTerm]);

  const totalPages = Math.ceil(filteredRetours.length / itemsPerPage);
  const currentItems = filteredRetours.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ========== RENDU ==========
  return (
    <div className="retours-container">
      {/* Toast */}
      {toast && (
        <div className={`retours-toast retours-toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="retours-header">
        <div>
          <h1 className="retours-title">
            <RotateCcw size={26} />
            Retours Clients
          </h1>
          <p className="retours-subtitle">
            Gérez les retours de produits vendus
          </p>
        </div>
        <div className="retours-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={handleOpenWizard}>
              <Plus size={18} />
              <span>Nouveau retour</span>
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => { loadRetours(); loadStats(); }}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="retours-stats">
          <div className="stat-card">
            <div className="stat-icon total"><RotateCcw size={20} /></div>
            <div className="stat-info">
              <span className="stat-label">Total</span>
              <span className="stat-value">{stats.total}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon accepte"><CheckCircle size={20} /></div>
            <div className="stat-info">
              <span className="stat-label">Acceptés</span>
              <span className="stat-value">{stats.accepte}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon rembourse"><FileText size={20} /></div>
            <div className="stat-info">
              <span className="stat-label">Remboursés</span>
              <span className="stat-value">{stats.rembourse}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon montant"><Package size={20} /></div>
            <div className="stat-info">
              <span className="stat-label">Montant total</span>
              <span className="stat-value">{formatMontant(stats.montant_total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="retours-filters">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher un retour..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>
        <select
          className="filter-select"
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="accepte">Acceptés</option>
          <option value="refuse">Refusés</option>
          <option value="rembourse">Remboursés</option>
          <option value="annule">Annulés</option>
        </select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Chargement...</p>
        </div>
      ) : currentItems.length === 0 ? (
        <div className="empty-state">
          <RotateCcw size={48} />
          <h3>Aucun retour</h3>
          <p>Créez votre premier retour client</p>
          {canManage && (
            <button className="btn btn-primary" onClick={handleOpenWizard}>
              <Plus size={18} /> Nouveau retour
            </button>
          )}
        </div>
      ) : (
        <div className="retours-table-wrapper">
          <table className="retours-table">
            <thead>
              <tr>
                <th>N° Retour</th>
                <th>Date</th>
                <th>Client</th>
                <th>Commande</th>
                <th>Produits</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map(r => (
                <tr key={r.id_retour_client}>
                  <td><strong>{r.numero_retour}</strong></td>
                  <td>{formatDateFR(r.date_retour)}</td>
                  <td>
                    <div className="client-cell">
                      <User size={14} />
                      <span>{r.nomclient || '-'}</span>
                    </div>
                  </td>
                  <td>{r.numero_commande || '-'}</td>
                  <td>
                    <span className="badge-lignes">{r.nb_lignes} produit(s)</span>
                  </td>
                  <td className="montant-cell">
                    <strong>{formatMontant(r.montant_total)}</strong>
                  </td>
                  <td>{getStatutBadge(r.statut)}</td>
                  <td className="actions-cell">
                    <div >
                      <button
                        className="action-btn"
                        onClick={() => setOpenMenuId(openMenuId === r.id_retour_client ? null : r.id_retour_client)}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenuId === r.id_retour_client && (
                        <div className="dropdown-menu">
                          <button onClick={() => handleView(r)}>
                            <Eye size={14} /> Voir détails
                          </button>
                          {canManage && r.statut !== 'annule' && (
                            <button className="danger" onClick={() => handleAnnuler(r)}>
                              <Ban size={14} /> Annuler
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="retours-pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={18} />
          </button>
          <span>Page {currentPage} sur {totalPages}</span>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ========== WIZARD DE RETOUR ========== */}
      {showWizard && (
        <div className="modal-overlay">
          <div className="wizard-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="wizard-header">
              <div className="wizard-title-group">
                <div className="wizard-icon">
                  <RotateCcw size={22} />
                </div>
                <div>
                  <h2>Nouveau retour</h2>
                  <p>
                    {wizardStep === 1
                      ? 'Recherchez la commande d\'origine'
                      : 'Sélectionnez les produits à retourner'}
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => !saving && setShowWizard(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Étapes */}
            <div className="wizard-steps">
              <div className={`wizard-step ${wizardStep === 1 ? 'active' : 'done'}`}>
                <div className="step-num">{wizardStep > 1 ? <Check size={14} /> : '1'}</div>
                <span>Commande</span>
              </div>
              <ChevronRight size={16} className="step-arrow" />
              <div className={`wizard-step ${wizardStep === 2 ? 'active' : ''}`}>
                <div className="step-num">2</div>
                <span>Produits</span>
              </div>
            </div>

            {/* Body */}
            <div className="wizard-body">
              {/* ==================== ÉTAPE 1 ==================== */}
              {wizardStep === 1 && (
                <div className="wizard-step-1">
                  <div className="search-commande-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                      type="text"
                      placeholder="N° de commande, téléphone client, n° facture..."
                      value={searchCommande}
                      onChange={(e) => rechercherCommande(e.target.value)}
                      autoFocus
                    />
                    {isSearchingCommande && <Loader size={16} className="spinning" />}
                  </div>

                  <div className="search-hint">
                    <Info size={14} />
                    <span>Tapez au moins 2 caractères. Les commandes des 90 derniers jours sont éligibles.</span>
                  </div>

                  {searchCommande.length >= 2 && resultatsRecherche.length === 0 && !isSearchingCommande && (
                    <div className="no-results">
                      <AlertCircle size={32} />
                      <p>Aucune commande trouvée</p>
                    </div>
                  )}

                  {resultatsRecherche.length > 0 && (
                    <div className="commandes-list">
                      {resultatsRecherche.map(c => (
                        <div
                          key={c.id_commande}
                          className="commande-item"
                          onClick={() => selectionnerCommande(c)}
                        >
                          <div className="commande-header">
                            <strong>{c.numero_commande}</strong>
                            <span className="commande-date">
                              {formatDateFR(c.date_commande)}
                            </span>
                          </div>
                          <div className="commande-body">
                            <div className="commande-client">
                              <User size={14} />
                              <span>{c.nomclient || 'Client inconnu'}</span>
                            </div>
                            {c.telephone && (
                              <div className="commande-tel">
                                <Phone size={14} />
                                <span>{c.telephone}</span>
                              </div>
                            )}
                          </div>
                          <div className="commande-footer">
                            <span className="commande-montant">
                              {formatMontant(c.montant_total)}
                            </span>
                            <span className="commande-produits">
                              {c.nb_lignes} produit(s)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ==================== ÉTAPE 2 ==================== */}
              {wizardStep === 2 && selectedCommande && (
                <div className="wizard-step-2">
                  {/* Infos commande */}
                  <div className="commande-recap-card">
                    <div className="recap-row">
                      <FileText size={14} />
                      <strong>Commande {selectedCommande.numero_commande}</strong>
                    </div>
                    <div className="recap-row">
                      <User size={14} />
                      <span>{selectedCommande.nomclient || '-'}</span>
                    </div>
                    <div className="recap-row">
                      <Calendar size={14} />
                      <span>{formatDateFR(selectedCommande.date_commande)}</span>
                    </div>
                  </div>

                  {/* Produits à retourner */}
                  <div className="produits-section">
                    <h3>Produits retournables</h3>

                    {lignesCommande.length === 0 ? (
                      <div className="empty-lignes">
                        <Package size={32} />
                        <p>Aucun produit retournable</p>
                      </div>
                    ) : (
                      <div className="lignes-retour">
                        {lignesCommande.map((ligne, index) => {
                          if (ligne.quantite_retournable_base <= 0) {
                            return (
                              <div key={index} className="ligne-item disabled">
                                <div className="ligne-info">
                                  <strong>{ligne.produit_nom}</strong>
                                  <span className="ligne-tag">Déjà totalement retourné</span>
                                </div>
                              </div>
                            );
                          }

                          const qte = parseFloat(ligne.quantite_a_retourner) || 0;
                          const unite = ligne.unite_selectionnee;
                          const qteBase = unite ? qte * parseFloat(unite.quantite_base || 1) : 0;
                          const invalid = qteBase > ligne.quantite_retournable_base;

                          return (
                            <div key={index} className={`ligne-item ${qte > 0 ? 'selected' : ''}`}>
                              <div className="ligne-info">
                                <strong>{ligne.produit_nom}</strong>
                                {ligne.marque_nom && <span className="ligne-marque">{ligne.marque_nom}</span>}

                                {/* ✅ Quantités en unités de vente lisibles */}
                                <div className="ligne-details">
                                  <div className="detail-row">
                                    <span className="detail-label">Acheté :</span>
                                    <div className="detail-value">
                                      <QteAffichage
                                        qteBase={ligne.quantite_achetee_base}
                                        unitesVente={ligne.unites_disponibles}
                                        uniteBase={{
                                          nom: ligne.unite_base_nom,
                                          symbole: ligne.unite_base_symbole
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {ligne.quantite_deja_retournee_base > 0 && (
                                    <div className="detail-row">
                                      <span className="detail-label">Déjà retourné :</span>
                                      <div className="detail-value">
                                        <QteAffichage
                                          qteBase={ligne.quantite_deja_retournee_base}
                                          unitesVente={ligne.unites_disponibles}
                                          uniteBase={{
                                            nom: ligne.unite_base_nom,
                                            symbole: ligne.unite_base_symbole
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  <div className="detail-row highlight">
                                    <span className="detail-label">Retournable :</span>
                                    <div className="detail-value">
                                      <QteAffichage
                                        qteBase={ligne.quantite_retournable_base}
                                        unitesVente={ligne.unites_disponibles}
                                        uniteBase={{
                                          nom: ligne.unite_base_nom,
                                          symbole: ligne.unite_base_symbole
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="ligne-controls">
                                <select
                                  value={unite?.id_unite_vente ?? 'base'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const selected = ligne.unites_disponibles.find(u =>
                                      (u.id_unite_vente === null ? 'base' : u.id_unite_vente) ===
                                      (val === 'base' ? 'base' : parseInt(val))
                                    );
                                    updateLigne(index, 'unite_selectionnee', selected);
                                  }}
                                  className="unite-select"
                                >
                                  {ligne.unites_disponibles.map((u, i) => (
                                    <option key={i} value={u.id_unite_vente ?? 'base'}>
                                      {u.nom} {u.quantite_base > 1 && `(×${u.quantite_base})`}
                                    </option>
                                  ))}
                                </select>

                                <input
                                  type="number"
                                  min="0"
                                  value={ligne.quantite_a_retourner || ''}
                                  onChange={(e) => updateLigne(index, 'quantite_a_retourner', e.target.value)}
                                  className={`qte-input ${invalid ? 'invalid' : ''}`}
                                  placeholder="0"
                                />

                                {/* ✅ Preview quantité en unité lisible */}
                                {qteBase > 0 && (
                                  <div className={`qte-preview ${invalid ? 'invalid' : ''}`}>
                                    <span>=</span>
                                    <QteAffichage
                                      qteBase={qteBase}
                                      unitesVente={ligne.unites_disponibles}
                                      uniteBase={{
                                        nom: ligne.unite_base_nom,
                                        symbole: ligne.unite_base_symbole
                                      }}
                                      isLow={invalid}
                                    />
                                  </div>
                                )}
                              </div>

                              {qte > 0 && (
                                <div className="ligne-etat">
                                  <label>État :</label>
                                  <select
                                    value={ligne.etat_produit}
                                    onChange={(e) => updateLigne(index, 'etat_produit', e.target.value)}
                                  >
                                    {ETATS_PRODUIT.map(e => (
                                      <option key={e.value} value={e.value}>{e.label}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {invalid && (
                                <div className="ligne-error">
                                  <AlertTriangle size={14} />
                                  <span>
                                    Quantité dépasse le retournable (
                                    <QteAffichage
                                      qteBase={ligne.quantite_retournable_base}
                                      unitesVente={ligne.unites_disponibles}
                                      uniteBase={{
                                        nom: ligne.unite_base_nom,
                                        symbole: ligne.unite_base_symbole
                                      }}
                                    />
                                    )
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Motif + Résolution */}
                  <div className="form-section">
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>Motif du retour *</label>
                        <select value={motifRetour} onChange={(e) => setMotifRetour(e.target.value)}>
                          {MOTIFS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Type de résolution *</label>
                        <select value={typeResolution} onChange={(e) => setTypeResolution(e.target.value)}>
                          {RESOLUTIONS.map(r => (
                            <option key={r.value} value={r.value}>
                              {r.icon} {r.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Notes (optionnel)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows="2"
                        placeholder="Commentaire interne..."
                        maxLength={500}
                      />
                    </div>
                  </div>

                  {/* Total */}
                  <div className="total-remboursement">
                    <span>Montant total à rembourser</span>
                    <strong>{formatMontant(totalRemboursement)}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="wizard-footer">
              {wizardStep === 1 ? (
                <>
                  <button className="btn btn-secondary" onClick={() => setShowWizard(false)}>
                    Annuler
                  </button>
                  <div className="footer-spacer" />
                  <span className="footer-hint">
                    Sélectionnez une commande pour continuer
                  </span>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-ghost"
                    onClick={() => { setWizardStep(1); setSelectedCommande(null); setLignesCommande([]); }}
                    disabled={saving}
                  >
                    <ChevronLeft size={16} />
                    Retour
                  </button>
                  <div className="footer-spacer" />
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmitRetour}
                    disabled={saving || !peutValider}
                  >
                    {saving ? (
                      <>
                        <Loader size={16} className="spinning" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Valider le retour ({lignesValides.length})
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL DÉTAIL ========== */}
      {showDetailModal && selectedRetour && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Retour {selectedRetour.numero_retour}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-info">
                <div className="info-row">
                  <span>Client</span>
                  <strong>{selectedRetour.nomclient || '-'}</strong>
                </div>
                <div className="info-row">
                  <span>Commande</span>
                  <strong>{selectedRetour.numero_commande || '-'}</strong>
                </div>
                <div className="info-row">
                  <span>Date</span>
                  <strong>{formatDateFR(selectedRetour.date_retour)}</strong>
                </div>
                <div className="info-row">
                  <span>Motif</span>
                  <strong>{MOTIFS.find(m => m.value === selectedRetour.motif_retour)?.label}</strong>
                </div>
                <div className="info-row">
                  <span>Résolution</span>
                  <strong>{RESOLUTIONS.find(r => r.value === selectedRetour.type_resolution)?.label}</strong>
                </div>
                <div className="info-row total">
                  <span>Montant remboursé</span>
                  <strong>{formatMontant(selectedRetour.montant_total)}</strong>
                </div>
              </div>

              <h3>Produits retournés</h3>
              <table className="detail-lignes">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Unité</th>
                    <th>Qté</th>
                    <th>Prix</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedRetour.lignes || []).map((l, i) => (
                    <tr key={i}>
                      <td>{l.produit_nom}</td>
                      <td>
                        <div className="unite-cell">
                          <strong>{l.quantite} {l.nom_unite_vente}</strong>
                          {l.quantite_base > 1 && (
                            <small className="unite-detail">
                              ({l.quantite_totale_base} unités)
                            </small>
                          )}
                        </div>
                      </td>
                      <td>{l.quantite_totale_base}</td>
                      <td>{formatMontant(l.prix_remboursement)}</td>
                      <td>{formatMontant(l.montant_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetoursClients;