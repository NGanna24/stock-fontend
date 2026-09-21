// pages/Receptions/Receptions.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus, Search, Eye, ChevronLeft, ChevronRight, Download, X, Check,
  RefreshCw, Grid, List, Package, Banknote, Calendar, Clock,
  AlertCircle, CheckCircle, Ban, FileText, Building, Truck,
  ClipboardList, CheckSquare, Square, AlertTriangle, Trash2,
  ShoppingBag, Box, CheckCheck, Info, ChevronDown
} from "lucide-react";
import ReceptionService from "../../../services/receptionService";
import CommandeAchatService from "../../../services/commandeAchatService";
import FournisseurService from "../../../services/fournisseurService";
import ProduitService from "../../../services/produitService";
import { useUser } from "../../../context/AuthContext";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal";
import "./Receptions.css";

const Receptions = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem('token');

  // États principaux
  const [receptions, setReceptions] = useState([]);
  const [commandesDisponibles, setCommandesDisponibles] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCommandes, setLoadingCommandes] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState("list");
  const [error, setError] = useState(null);
  const [filterStatut, setFilterStatut] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReception, setSelectedReception] = useState(null);
  const [receptionToDelete, setReceptionToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatut, setUpdatingStatut] = useState(null);

  // Formulaire
  const [formData, setFormData] = useState({
    id_commande_achat: "",
    lignes: []
  });

  const [toutValide, setToutValide] = useState(false);
  const [commandeSelectionnee, setCommandeSelectionnee] = useState(null);

  // ============ ÉTATS DU SÉLECTEUR DE COMMANDE ============
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerHighlighted, setPickerHighlighted] = useState(0);
  const pickerRef = useRef(null);
  const pickerInputRef = useRef(null);

  // Modal de confirmation générique
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    details: null,
    type: 'warning',
    confirmLabel: 'Confirmer',
    onConfirm: null,
  });

  const openConfirm = (config) => {
    setConfirmModal({
      isOpen: true,
      title: config.title || 'Confirmation',
      message: config.message || '',
      details: config.details || null,
      type: config.type || 'warning',
      confirmLabel: config.confirmLabel || 'Confirmer',
      onConfirm: config.onConfirm || null,
    });
  };

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  const toastTimeoutRef = useRef(null);
  const canManage = user && ['admin', 'manager'].includes(user.role);

  // ============================================================
  // CHARGEMENT
  // ============================================================
  useEffect(() => {
    if (isAuthenticated && token) {
      loadReceptions();
      loadCommandesDisponibles();
      loadFournisseurs();
      loadAllProduits();
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Fermer le picker au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    if (pickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [pickerOpen]);

  const showToast = (message) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 4000);
  };

  const loadReceptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ReceptionService.getAllReceptions(token);
      if (response.success) {
        setReceptions(response.data || []);
      } else {
        setError(response.message || 'Erreur lors du chargement des réceptions');
      }
    } catch (error) {
      console.error('❌ LoadReceptions error:', error);
      setError(error.message || 'Erreur lors du chargement des réceptions');
    } finally {
      setLoading(false);
    }
  };

  const loadCommandesDisponibles = async () => {
    setLoadingCommandes(true);
    try {
      const [responseEnAttente, responsePartiel] = await Promise.all([
        CommandeAchatService.getCommandesByStatut(token, 'en_attente'),
        CommandeAchatService.getCommandesByStatut(token, 'partiellement_recue')
      ]);

      let commandesList = [];
      if (responseEnAttente.success) commandesList = [...commandesList, ...responseEnAttente.data];
      if (responsePartiel.success) commandesList = [...commandesList, ...responsePartiel.data];

      commandesList.sort((a, b) => new Date(b.date_commande) - new Date(a.date_commande));
      setCommandesDisponibles(commandesList);
    } catch (error) {
      console.error('❌ LoadCommandesDisponibles error:', error);
    } finally {
      setLoadingCommandes(false);
    }
  };

  const loadFournisseurs = async () => {
    try {
      const response = await FournisseurService.getActiveFournisseurs(token);
      if (response.success) setFournisseurs(response.data || []);
    } catch (error) {
      console.error('❌ LoadFournisseurs error:', error);
    }
  };

  const loadAllProduits = async () => {
    try {
      const response = await ProduitService.getAllProduits(token);
      if (response.success) setProduits(response.data || []);
    } catch (error) {
      console.error('❌ LoadProduits error:', error);
    }
  };

  // ============================================================
  // COMMANDES FILTRÉES POUR LE PICKER
  // ============================================================
  const filteredCommandes = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase();
    if (!term) {
      // Par défaut : TOP 10 des plus urgentes (anciennes d'abord)
      const sorted = [...commandesDisponibles].sort((a, b) => {
        // Partiellement reçues en premier
        const aPartiel = a.statut === 'partiellement_recue' ? 0 : 1;
        const bPartiel = b.statut === 'partiellement_recue' ? 0 : 1;
        if (aPartiel !== bPartiel) return aPartiel - bPartiel;
        // Puis par date croissante (les plus anciennes = urgentes)
        return new Date(a.date_commande) - new Date(b.date_commande);
      });
      return sorted.slice(0, 10);
    }

    // Sinon filtre
    return commandesDisponibles
      .filter(c =>
        c.numero_commande?.toLowerCase().includes(term) ||
        c.fournisseur_nom?.toLowerCase().includes(term) ||
        new Date(c.date_commande).toLocaleDateString('fr-FR').includes(term)
      )
      .slice(0, 50);
  }, [commandesDisponibles, pickerSearch]);

  const isDefaultList = pickerSearch.trim() === "";

  // ============================================================
  // FORMULAIRE
  // ============================================================
  useEffect(() => {
    if (formData.id_commande_achat) {
      const commande = commandesDisponibles.find(
        c => c.id_commande_achat === parseInt(formData.id_commande_achat)
      );
      if (commande) {
        setCommandeSelectionnee(commande);
        chargerDetailsCommande(commande.id_commande_achat);
      }
    } else {
      setFormData(prev => ({ ...prev, lignes: [] }));
      setToutValide(false);
      setCommandeSelectionnee(null);
    }
  }, [formData.id_commande_achat, commandesDisponibles]);

const chargerDetailsCommande = async (idCommande) => {
    setLoading(true);
    try {
        const response = await CommandeAchatService.getCommandeById(token, idCommande);
        if (response.success && response.data) {
            const commande = response.data;

            const lignesReception = (commande.lignes || []).map(l => {
                const qteBase = parseFloat(l.quantite_base) || 1;

                // ✅ On utilise le reste à recevoir renvoyé par le back
                const resteUV = l.reste_a_recevoir !== undefined
                    ? parseFloat(l.reste_a_recevoir) || 0
                    : parseFloat(l.quantite) || 0;

                const dejaRecueUV = l.quantite_deja_recue !== undefined
                    ? parseFloat(l.quantite_deja_recue) || 0
                    : 0;

                const totalCommandeUV = parseFloat(l.quantite) || 0;

                const prixAchatUV = l.prix_achat !== null && l.prix_achat !== undefined
                    ? parseFloat(l.prix_achat)
                    : null;

                return {
                    id_produit: l.id_produit,
                    id_ligne_achat: l.id_ligne_achat || null,
                    produit_nom: l.produit_nom || 'Produit inconnu',
                    produit_reference: l.reference || '',
                    id_unite_vente: l.id_unite_vente || null,
                    nom_unite_vente: l.nom_unite_vente || l.unite_vente_nom || 'Unité',
                    quantite_base: qteBase,

                    // ✅ reste à recevoir (utilisé dans l'UI)
                    quantite_commandee: resteUV,

                    // ℹ️ infos affichées en bonus
                    quantite_totale_commandee: totalCommandeUV,
                    quantite_deja_recue: dejaRecueUV,

                    quantite_totale_base_commandee: totalCommandeUV * qteBase,
                    quantite_recue: resteUV,
                    quantite_totale_base: resteUV * qteBase,
                    ecart: 0,
                    prix_achat_unite_vente: prixAchatUV,
                    unite: l.nom_unite_vente || l.unite_symbole || '',
                    valide: true,
                    etat_marchandise: 'bon',
                    num_lot: '',
                    date_peremption: '',
                    notes: ''
                };
            });

            // ✅ Cas : commande déjà totalement reçue
            const rienARecevoir = lignesReception.length === 0
                || lignesReception.every(l => l.quantite_commandee <= 0);

            if (rienARecevoir) {
                setError('Cette commande a déjà été entièrement reçue.');
                setFormData(prev => ({ ...prev, lignes: [] }));
                setToutValide(false);
                return;
            }

            setFormData(prev => ({ ...prev, lignes: lignesReception }));
            setToutValide(lignesReception.every(l => l.valide === true));
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des détails:', error);
        setError('Impossible de charger les détails de la commande');
    } finally {
        setLoading(false);
    }
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const toggleValiderLigne = (index) => {
    const nouvellesLignes = [...formData.lignes];
    const qteBase = nouvellesLignes[index].quantite_base || 1;

    nouvellesLignes[index].valide = !nouvellesLignes[index].valide;

    if (!nouvellesLignes[index].valide) {
      nouvellesLignes[index].quantite_recue = 0;
      nouvellesLignes[index].quantite_totale_base = 0;
    } else {
      nouvellesLignes[index].quantite_recue = nouvellesLignes[index].quantite_commandee;
      nouvellesLignes[index].quantite_totale_base =
        nouvellesLignes[index].quantite_commandee * qteBase;
    }

    nouvellesLignes[index].ecart =
      nouvellesLignes[index].quantite_commandee - nouvellesLignes[index].quantite_recue;

    setFormData({ ...formData, lignes: nouvellesLignes });
    setToutValide(nouvellesLignes.every(l => l.valide === true));
  };

const validerTout = () => {
    const nouvellesLignes = formData.lignes.map(l => {
        // ✅ Ne pas écraser les lignes déjà validées
        if (l.valide === true) return l;

        const qteBase = l.quantite_base || 1;
        return {
            ...l,
            valide: true,
            quantite_recue: l.quantite_commandee,
            quantite_totale_base: l.quantite_commandee * qteBase,
            ecart: 0
        };
    });
    setFormData({ ...formData, lignes: nouvellesLignes });
    setToutValide(true);
};

  const deselectionnerTout = () => {
    const nouvellesLignes = formData.lignes.map(l => ({
      ...l,
      valide: false,
      quantite_recue: 0,
      quantite_totale_base: 0,
      ecart: l.quantite_commandee
    }));
    setFormData({ ...formData, lignes: nouvellesLignes });
    setToutValide(false);
  };

  const handleQuantiteRecueChange = (index, value) => {
    const nouvellesLignes = [...formData.lignes];
    const qteRecue = parseFloat(value) || 0;
    const qteCommandee = nouvellesLignes[index].quantite_commandee || 0;
    const qteBase = nouvellesLignes[index].quantite_base || 1;

    nouvellesLignes[index].quantite_recue = qteRecue;
    nouvellesLignes[index].quantite_totale_base = qteRecue * qteBase;
    nouvellesLignes[index].ecart = qteCommandee - qteRecue;

    if (qteRecue > 0) {
      nouvellesLignes[index].valide = true;
    } else {
      nouvellesLignes[index].valide = false;
    }

    if (qteRecue < qteCommandee) {
      nouvellesLignes[index].etat_marchandise = 'partiel';
    } else {
      nouvellesLignes[index].etat_marchandise = 'bon';
    }

    setFormData({ ...formData, lignes: nouvellesLignes });
    setToutValide(nouvellesLignes.every(l => l.valide === true));
  };

  const handlePrixAchatChange = (index, value) => {
    const nouvellesLignes = [...formData.lignes];
    nouvellesLignes[index].prix_achat_unite_vente =
      value === '' ? null : parseFloat(value) || null;
    setFormData({ ...formData, lignes: nouvellesLignes });
  };

  const handleEtatChange = (index, value) => {
    const nouvellesLignes = [...formData.lignes];
    nouvellesLignes[index].etat_marchandise = value;
    setFormData({ ...formData, lignes: nouvellesLignes });
  };

  const handleLotChange = (index, value) => {
    const nouvellesLignes = [...formData.lignes];
    nouvellesLignes[index].num_lot = value;
    setFormData({ ...formData, lignes: nouvellesLignes });
  };

  const handlePeremptionChange = (index, value) => {
    const nouvellesLignes = [...formData.lignes];
    nouvellesLignes[index].date_peremption = value;
    setFormData({ ...formData, lignes: nouvellesLignes });
  };

  const handleNotesChange = (index, value) => {
    const nouvellesLignes = [...formData.lignes];
    nouvellesLignes[index].notes = value;
    setFormData({ ...formData, lignes: nouvellesLignes });
  };

  // ============================================================
  // ACTIONS PICKER
  // ============================================================
  const handlePickerOpen = () => {
    if (saving || loadingCommandes) return;
    setPickerOpen(true);
    setPickerSearch("");
    setPickerHighlighted(0);
    setTimeout(() => pickerInputRef.current?.focus(), 50);
  };

const handlePickerSelect = (commande) => {
    setFormData(prev => ({
        ...prev,
        id_commande_achat: commande.id_commande_achat  // number
    }));
    setPickerOpen(false);
    setPickerSearch("");
};

  const handlePickerClear = () => {
    setFormData(prev => ({ ...prev, id_commande_achat: "", lignes: [] }));
    setCommandeSelectionnee(null);
    setToutValide(false);
    setTimeout(() => handlePickerOpen(), 50);
  };

  const handlePickerKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPickerHighlighted(prev => Math.min(prev + 1, filteredCommandes.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPickerHighlighted(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommandes[pickerHighlighted]) {
        handlePickerSelect(filteredCommandes[pickerHighlighted]);
      }
    } else if (e.key === 'Escape') {
      setPickerOpen(false);
    }
  };

  const formatDateCommande = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  };

  const formatJoursEcoules = (dateStr) => {
    try {
      const diff = Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
      if (diff === 0) return "Aujourd'hui";
      if (diff === 1) return "Hier";
      return `J+${diff}`;
    } catch {
      return "";
    }
  };

  // ============================================================
  // ACTIONS CRUD
  // ============================================================
  const handleAdd = () => {
    setFormData({ id_commande_achat: "", lignes: [] });
    setToutValide(false);
    setCommandeSelectionnee(null);
    setError(null);
    setPickerSearch("");
    setShowModal(true);
  };

  const handleView = (reception) => {
    setSelectedReception(reception);
    setShowDetailModal(true);
  };

  const handleSave = async () => {
    if (!formData.id_commande_achat) {
      setError("Veuillez sélectionner une commande");
      return;
    }

    const lignesValidees = formData.lignes.filter(l => l.valide === true);
    if (lignesValidees.length === 0) {
      setError("Veuillez valider au moins un produit");
      return;
    }

    for (const ligne of lignesValidees) {
      if (!ligne.quantite_recue || parseFloat(ligne.quantite_recue) <= 0) {
        setError(`La quantité reçue pour ${ligne.produit_nom} doit être positive`);
        return;
      }
    }

    const lignesAvecEcart = formData.lignes.filter(l => l.valide && l.ecart !== 0);

    if (lignesAvecEcart.length > 0) {
      const manquants = lignesAvecEcart.filter(l => l.ecart > 0);
      const surplus = lignesAvecEcart.filter(l => l.ecart < 0);

      openConfirm({
        title: '⚠️ Écarts détectés',
        message: `${lignesAvecEcart.length} ligne(s) présente(nt) un écart avec la commande initiale.`,
        details: (
          <>
            {manquants.length > 0 && (
              <div className="detail-section">
                <span className="detail-label">📉 Manquants</span>
                <ul>
                  {manquants.map((l, i) => (
                    <li key={i}>
                      <strong>{l.produit_nom}</strong> : commandé <strong>{l.quantite_commandee} {l.nom_unite_vente}</strong>, reçu <strong>{l.quantite_recue} {l.nom_unite_vente}</strong>
                      <span style={{ color: '#ef4444', marginLeft: '6px' }}>
                        (-{l.ecart} {l.nom_unite_vente})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {surplus.length > 0 && (
              <div className="detail-section">
                <span className="detail-label">📈 Surplus</span>
                <ul>
                  {surplus.map((l, i) => (
                    <li key={i}>
                      <strong>{l.produit_nom}</strong> : commandé <strong>{l.quantite_commandee} {l.nom_unite_vente}</strong>, reçu <strong>{l.quantite_recue} {l.nom_unite_vente}</strong>
                      <span style={{ color: '#2563eb', marginLeft: '6px' }}>
                        (+{Math.abs(l.ecart)} {l.nom_unite_vente})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
              La commande sera marquée <strong>"partiellement reçue"</strong> si des manquants existent.
            </p>
          </>
        ),
        type: 'warning',
        confirmLabel: 'Confirmer la réception',
        onConfirm: () => {
          closeConfirm();
          handleSaveConfirmed();
        },
      });
      return;
    }

    handleSaveConfirmed();
  };

  const handleSaveConfirmed = async () => {
    setSaving(true);
    setError(null);

    try {
      const lignesValidees = formData.lignes.filter(l => l.valide === true);

      const data = {
        id_commande_achat: parseInt(formData.id_commande_achat),
        date_reception: new Date().toISOString().split('T')[0],
        notes: null,
        lignes: lignesValidees.map(l => {
          const qteBase = l.quantite_base || 1;
          const qteRecue = parseFloat(l.quantite_recue) || 0;
          const quantiteTotaleBase = qteRecue * qteBase;

          let prixAchatUV = null;
          if (
            l.prix_achat_unite_vente !== null &&
            l.prix_achat_unite_vente !== undefined &&
            l.prix_achat_unite_vente !== ''
          ) {
            const parsed = parseFloat(l.prix_achat_unite_vente);
            if (!isNaN(parsed) && parsed > 0) prixAchatUV = parsed;
          }

          return {
            id_produit: l.id_produit,
            id_ligne_achat: l.id_ligne_achat || null,
            id_unite_vente: l.id_unite_vente || null,
            nom_unite_vente: l.nom_unite_vente || 'Unité',
            quantite_base: qteBase,
            quantite_totale_base: quantiteTotaleBase,
            quantite_commandee: l.quantite_commandee || 0,
            quantite_recue: qteRecue,
            prix_achat_unite_vente: prixAchatUV,
            etat_marchandise: l.etat_marchandise || 'bon',
            num_lot: l.num_lot || null,
            date_peremption: l.date_peremption || null,
            notes_ligne: l.notes || null
          };
        })
      };

      const response = await ReceptionService.createReception(token, data);

      if (response.success) {
        await loadReceptions();
        await loadCommandesDisponibles();
        setShowModal(false);
        setFormData({ id_commande_achat: "", lignes: [] });
        setToutValide(false);
        setCommandeSelectionnee(null);
        showToast('✓ Réception enregistrée avec succès !');
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

  const confirmDelete = (reception) => {
    setReceptionToDelete(reception);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!receptionToDelete) return;
    setDeleting(true);
    setError(null);

    try {
      const response = await ReceptionService.deleteReception(
        token,
        receptionToDelete.id_reception
      );

      if (response.success) {
        await loadReceptions();
        await loadCommandesDisponibles();
        setShowDeleteModal(false);
        setReceptionToDelete(null);
        showToast('🗑️ Réception supprimée avec succès');
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

  const handleChangeStatut = async (id, statut) => {
    if (updatingStatut === id) return;
    setUpdatingStatut(id);
    setError(null);

    try {
      const response = await ReceptionService.updateStatut(token, id, statut);
      if (response.success) {
        await loadReceptions();
        await loadCommandesDisponibles();
        showToast('✓ Statut mis à jour avec succès');
      } else {
        setError(response.message || 'Erreur lors du changement de statut');
      }
    } catch (error) {
      console.error('❌ Change statut error:', error);
      setError(error.message || 'Erreur lors du changement de statut');
    } finally {
      setUpdatingStatut(null);
    }
  };

  const handleExport = async () => {
    try {
      const response = await ReceptionService.exportReceptions(token);
      if (response.success && response.data) {
        const headers = ["ID", "Numéro", "Date", "Fournisseur", "Commande", "Montant", "Statut", "Notes"];
        const rows = response.data.map(r => [
          r.id, r.numero, r.date, r.fournisseur, r.commande,
          formatMontant(r.montant), r.statut, r.notes || ""
        ]);

        let csv = headers.join(",") + "\n";
        rows.forEach(row => {
          csv += row.map(cell => `"${cell}"`).join(",") + "\n";
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receptions_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('📊 Exportation terminée');
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      setError('Erreur lors de l\'exportation');
    }
  };

  // ============================================================
  // UTILITAIRES
  // ============================================================
  const formatMontant = (value) => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(num)) return '0';
    return Math.round(num).toLocaleString('fr-FR') + ' FCFA';
  };

  const getStats = () => {
    const total = receptions.length;
    const enAttente = receptions.filter(r => r.statut === 'en_attente').length;
    const partielle = receptions.filter(r => r.statut === 'partielle').length;
    const complete = receptions.filter(r => r.statut === 'complete').length;
    const annulee = receptions.filter(r => r.statut === 'annulee').length;

    const totalMontant = receptions.reduce((sum, r) => {
      const montant = r.montant_total !== undefined && r.montant_total !== null
        ? parseFloat(r.montant_total) : 0;
      return sum + (isNaN(montant) ? 0 : montant);
    }, 0);

    return { total, enAttente, partielle, complete, annulee, totalMontant };
  };

  const stats = getStats();

  const filteredReceptions = receptions.filter((reception) => {
    const matchSearch =
      reception.numero_reception?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reception.fournisseur_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reception.numero_commande?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reception.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatut = filterStatut ? reception.statut === filterStatut : true;
    return matchSearch && matchStatut;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReceptions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReceptions.length / itemsPerPage);

  // ============================================================
  // RENDU STATUT
  // ============================================================
  const renderStatut = (statut) => {
    const configs = {
      'en_attente': { label: 'En attente', className: 'status-en-attente', icon: Clock },
      'partielle': { label: 'Partielle', className: 'status-partiel', icon: AlertCircle },
      'complete': { label: 'Complète', className: 'status-recue', icon: CheckCircle },
      'annulee': { label: 'Annulée', className: 'status-annulee', icon: Ban }
    };

    const config = configs[statut] || configs['en_attente'];
    const Icon = config.icon;

    return (
      <span className={`status-badge ${config.className}`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  // ============================================================
  // PICKER DE COMMANDE (Recherche dynamique)
  // ============================================================
  const renderCommandePicker = () => {
    const isSelected = !!commandeSelectionnee;

    return (
      <div className="commande-picker" ref={pickerRef}>
        <label className="picker-label">
          <ShoppingBag size={14} />
          Commande d'achat *
        </label>

        {isSelected ? (
          <div className="picker-selected">
            <div className="picker-selected-main">
              <div className="picker-selected-icon">
                <FileText size={20} />
              </div>
              <div className="picker-selected-info">
                <span className="picker-selected-num">
                  {commandeSelectionnee.numero_commande}
                </span>
                <span className="picker-selected-meta">
                  <Building size={12} />
                  {commandeSelectionnee.fournisseur_nom}
                  <span className="picker-sep">·</span>
                  <Calendar size={12} />
                  {formatDateCommande(commandeSelectionnee.date_commande)}
                  <span className="picker-sep">·</span>
                  <Banknote size={12} />
                  {formatMontant(commandeSelectionnee.montant_total)}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="picker-change-btn"
              onClick={handlePickerClear}
              disabled={saving}
            >
              Changer
            </button>
          </div>
        ) : (
          <div className="picker-input-wrapper">
            <Search size={18} className="picker-search-icon" />
            <input
              ref={pickerInputRef}
              type="text"
              className="picker-input"
              placeholder="Rechercher une commande (n°, fournisseur, date...)"
              value={pickerSearch}
              onChange={(e) => {
                setPickerSearch(e.target.value);
                setPickerHighlighted(0);
              }}
              onFocus={handlePickerOpen}
              onClick={handlePickerOpen}
              onKeyDown={handlePickerKeyDown}
              disabled={saving || loadingCommandes}
            />
            {loadingCommandes ? (
              <span className="spinner-small picker-spinner" />
            ) : (
              <ChevronDown
                size={18}
                className={`picker-chevron ${pickerOpen ? 'open' : ''}`}
              />
            )}
          </div>
        )}

        {pickerOpen && !isSelected && (
          <div className="picker-dropdown">
            <div className="picker-dropdown-header">
              {isDefaultList ? (
                <>
                  <Clock size={14} />
                  <span>
                    Commandes en attente — les {filteredCommandes.length} plus urgentes
                  </span>
                </>
              ) : (
                <>
                  <Search size={14} />
                  <span>
                    {filteredCommandes.length} résultat(s) pour « {pickerSearch} »
                  </span>
                </>
              )}
            </div>

            <div className="picker-dropdown-list">
              {filteredCommandes.length === 0 ? (
                <div className="picker-empty">
                  <Search size={28} />
                  <p>Aucune commande trouvée</p>
                  <small>Essayez un autre numéro ou fournisseur</small>
                </div>
              ) : (
                filteredCommandes.map((c, idx) => {
                  const isHighlighted = idx === pickerHighlighted;
                  const isPartiel = c.statut === 'partiellement_recue';
                  return (
                    <div
                      key={c.id_commande_achat}
                      className={`picker-item ${isHighlighted ? 'highlighted' : ''}`}
                      onClick={() => handlePickerSelect(c)}
                      onMouseEnter={() => setPickerHighlighted(idx)}
                    >
                      <div className="picker-item-left">
                        <span className={`picker-item-status ${isPartiel ? 'partiel' : 'attente'}`}>
                          {isPartiel ? <AlertCircle size={12} /> : <Clock size={12} />}
                          {isPartiel ? 'Partielle' : 'En attente'}
                        </span>
                        <span className="picker-item-num">
                          {c.numero_commande}
                        </span>
                      </div>
                      <div className="picker-item-right">
                        <span className="picker-item-fournisseur">
                          <Building size={12} />
                          {c.fournisseur_nom}
                        </span>
                        <span className="picker-item-date">
                          <Calendar size={12} />
                          {formatDateCommande(c.date_commande)}
                          <span className="picker-item-jours">
                            {formatJoursEcoules(c.date_commande)}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {filteredCommandes.length > 0 && (
              <div className="picker-dropdown-footer">
                <span className="picker-hint">
                  ↑↓ pour naviguer · ⏎ pour sélectionner · Échap pour fermer
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDU LIGNES RÉCEPTION (SANS Récap, SANS Prix optionnel)
  // ============================================================
  const renderLignesReception = () => {
    if (formData.lignes.length === 0) {
      return (
        <div className="empty-lignes">
          <ClipboardList size={48} />
          <p>Aucun produit dans cette commande</p>
        </div>
      );
    }

    const lignesValides = formData.lignes.filter(l => l.valide === true).length;
    const totalLignes = formData.lignes.length;
    const pourcentage = totalLignes > 0 ? Math.round((lignesValides / totalLignes) * 100) : 0;
    const nbLignesAvecEcart = formData.lignes.filter(l => l.ecart !== 0).length;

    return (
      <div className="lignes-reception-container">

        <div className="lignes-reception-header">
          <div className="lignes-info">
            <span className="lignes-count">
              <Package size={16} />
              {totalLignes} produit(s) à recevoir
            </span>
            <span className={`lignes-status ${toutValide ? 'status-ok' : 'status-warning'}`}>
              {toutValide ? (
                <><CheckCircle size={14} /> Tous validés</>
              ) : (
                <><AlertCircle size={14} /> {lignesValides} validé(s)</>
              )}
            </span>
            {nbLignesAvecEcart > 0 && (
              <span className="lignes-status status-warning">
                <AlertTriangle size={14} /> {nbLignesAvecEcart} écart(s)
              </span>
            )}
            <div className="validation-progress">
              <span className="progress-label">{pourcentage}%</span>
              <div className="validation-progress-bar">
                <div className="fill" style={{ width: `${pourcentage}%` }} />
              </div>
            </div>
          </div>
          <div className="lignes-actions-buttons">
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={validerTout}
              disabled={saving || formData.lignes.length === 0 || toutValide}
            >
              <CheckSquare size={16} />
              Valider tout
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={deselectionnerTout}
              disabled={saving || formData.lignes.length === 0 || lignesValides === 0}
            >
              <Square size={16} />
              Tout désélectionner
            </button>
          </div>
        </div>

        <div className="lignes-table-wrapper">
          <table className="lignes-reception-table">
            <thead>
              <tr>
                <th className="col-check"></th>
                <th className="col-produit">Produit</th>
                <th className="col-qte">Commandé</th>
                <th className="col-recu">Reçu</th>
                <th className="col-ecart">Écart</th>
                <th className="col-prix">Prix d'achat</th>
                <th className="col-etat">État</th>
                <th className="col-date">Péremption</th>
              </tr>
            </thead>
            <tbody>
              {formData.lignes.map((ligne, index) => {
                const estValide = ligne.valide === true;
                const qteBase = ligne.quantite_base || 1;
                const uniteLabel = ligne.nom_unite_vente || 'Unité';

                return (
                  <tr key={index} className={estValide ? 'ligne-valide' : 'ligne-invalide'}>
                    <td className="col-check">
                      <button
                        type="button"
                        className="btn-check-ligne"
                        onClick={() => toggleValiderLigne(index)}
                        disabled={saving}
                        title={estValide ? 'Désélectionner' : 'Valider cette ligne'}
                      >
                        {estValide
                          ? <CheckSquare size={20} color="#10b981" />
                          : <Square size={20} color="#9ca3af" />}
                      </button>
                    </td>
                    <td className="col-produit">
                      <div className="produit-cell">
                        <strong>{ligne.produit_nom}</strong>
                        {ligne.produit_reference && (
                          <span className="ref-label">({ligne.produit_reference})</span>
                        )}
                      </div>
                    </td>
               
                    <td className="col-qte">
                      <span className="qte-display">
                        <strong>{ligne.quantite_commandee}</strong>
                        <span className="qte-unite">{uniteLabel}</span>
                      </span>
                    </td>
                    <td className="col-recu">
                      <div className="qte-input-group">
                        <input
                          type="number"
                          value={ligne.quantite_recue || ''}
                          onChange={(e) => handleQuantiteRecueChange(index, e.target.value)}
                          className={`qte-input ${!estValide ? 'input-invalide' : ''}`}
                          min="0"
                          step="1"
                          disabled={saving}
                          placeholder="0"
                        />
                        <span className="qte-input-suffix">{uniteLabel}</span>
                      </div>
                    </td>
                    <td className="col-ecart">
                      {ligne.ecart > 0 && (
                        <span className="ecart-badge warning">
                          <strong>-{ligne.ecart}</strong> {uniteLabel}
                        </span>
                      )}
                      {ligne.ecart < 0 && (
                        <span className="ecart-badge info">
                          <strong>+{Math.abs(ligne.ecart)}</strong> {uniteLabel}
                        </span>
                      )}
                      {ligne.ecart === 0 && (
                        <span className="ecart-badge success">✓ Conforme</span>
                      )}
                    </td>
                    <td className="col-prix">
                      <div className="prix-input-group">
                        <input
                          type="number"
                          value={ligne.prix_achat_unite_vente ?? ''}
                          onChange={(e) => handlePrixAchatChange(index, e.target.value)}
                          className="prix-input"
                          placeholder="0"
                          min="0"
                          step="0.01"
                          disabled={saving}
                        />
                        {/* <span className="prix-input-suffix">FCFA</span> */}
                      </div>
                    </td>
                    <td className="col-etat">
                      <select
                        value={ligne.etat_marchandise || 'bon'}
                        onChange={(e) => handleEtatChange(index, e.target.value)}
                        className={`etat-select etat-${ligne.etat_marchandise || 'bon'}`}
                        disabled={saving}
                      >
                        <option value="bon">Bon</option>
                        <option value="endommager">Endommagé</option>
                        <option value="manquant">Manquant</option>
                        <option value="partiel">Partiel</option>
                      </select>
                    </td>

                    <td className="col-date">
                      <input
                        type="date"
                        value={ligne.date_peremption || ''}
                        onChange={(e) => handlePeremptionChange(index, e.target.value)}
                        className="cell-input"
                        disabled={saving}
                      />
                    </td>

                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="lignes-total-row">
                <td colSpan="11">
                  <div className="total-stats">
                    <div className="total-stats-left">
                      <span>
                        <strong>Lignes validées :</strong>
                        <span className="text-success"> {lignesValides}</span>
                        <span className="text-muted"> / {totalLignes}</span>
                      </span>
                      <span className="text-muted" style={{ fontSize: '13px' }}>
                        ({pourcentage}% complété)
                      </span>
                    </div>
                    <div className="total-stats-right">
                      {toutValide ? (
                        <span className="badge-success">
                          <CheckCircle size={16} /> Toutes les lignes sont validées
                        </span>
                      ) : (
                        <span className="badge-warning">
                          <AlertCircle size={16} /> Certaines lignes ne sont pas validées
                        </span>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================
  // VUES LISTE & GRILLE
  // ============================================================
  const renderListView = () => (
    <div className="receptions-table-container">
      <table className="receptions-table">
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Date</th>
            <th>Fournisseur</th>
            <th>Commande</th>
            <th>Montant</th>
            <th>Produits</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.length === 0 ? (
            <tr>
              <td colSpan="8" className="empty-state">
                <Package size={32} className="empty-icon" />
                <p>Aucune réception trouvée</p>
              </td>
            </tr>
          ) : (
            currentItems.map((reception) => (
              <tr key={reception.id_reception}>
                <td className="numero-cell">
                  <span className="reception-numero">{reception.numero_reception}</span>
                </td>
                <td>{new Date(reception.date_reception).toLocaleDateString('fr-FR')}</td>
                <td className="fournisseur-cell">
                  <Building size={14} />
                  <span>{reception.fournisseur_nom || '-'}</span>
                </td>
                <td>{reception.numero_commande || '-'}</td>
                <td className="montant-cell">
                  <strong>{formatMontant(reception.montant_total)}</strong>
                </td>
                <td>{reception.lignes?.length || 0}</td>
                <td>{renderStatut(reception.statut)}</td>
                <td className="actions-cell">
                  <button
                    className="action-btn btn-view"
                    onClick={() => handleView(reception)}
                    title="Voir les détails"
                  >
                    <Eye size={16} />
                  </button>
                  {canManage && reception.statut === 'en_attente' && (
                    <button
                      className="action-btn btn-success"
                      onClick={() => handleChangeStatut(reception.id_reception, 'complete')}
                      disabled={updatingStatut === reception.id_reception}
                      title="Valider la réception"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  {canManage && reception.statut !== 'complete' && reception.statut !== 'annulee' && (
                    <button
                      className="action-btn btn-delete"
                      onClick={() => confirmDelete(reception)}
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
  );

  const renderGridView = () => (
    <div className="receptions-grid">
      {currentItems.length === 0 ? (
        <div className="empty-state">
          <Package size={48} className="empty-icon" />
          <p>Aucune réception trouvée</p>
        </div>
      ) : (
        currentItems.map((reception) => (
          <div key={reception.id_reception} className="reception-card">
            <div className="reception-card-header">
              <div className="reception-info">
                <span className="reception-numero">{reception.numero_reception}</span>
                <span className="reception-date">
                  <Calendar size={14} />
                  {new Date(reception.date_reception).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="reception-actions">
                <button
                  className="action-btn btn-view"
                  onClick={() => handleView(reception)}
                  title="Voir les détails"
                >
                  <Eye size={16} />
                </button>
                {canManage && reception.statut === 'en_attente' && (
                  <button
                    className="action-btn btn-success"
                    onClick={() => handleChangeStatut(reception.id_reception, 'complete')}
                    disabled={updatingStatut === reception.id_reception}
                    title="Valider la réception"
                  >
                    <Check size={16} />
                  </button>
                )}
                {canManage && reception.statut !== 'complete' && reception.statut !== 'annulee' && (
                  <button
                    className="action-btn btn-delete"
                    onClick={() => confirmDelete(reception)}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="reception-card-body">
              <div className="fournisseur-info">
                <Building size={16} />
                <span>{reception.fournisseur_nom || 'Sans fournisseur'}</span>
              </div>
              {reception.numero_commande && (
                <div className="commande-info">
                  <FileText size={14} />
                  <span>{reception.numero_commande}</span>
                </div>
              )}
              <div className="reception-montant">
                <Banknote size={16} />
                <span>{formatMontant(reception.montant_total)}</span>
              </div>
              <div className="reception-lignes-count">
                <Package size={14} />
                <span>{reception.lignes?.length || 0} produit(s)</span>
              </div>
            </div>
            <div className="reception-card-footer">
              {renderStatut(reception.statut)}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="receptions-container">
      {toastMessage && (
        <div className="toast-success">
          <CheckCircle size={20} />
          {toastMessage}
        </div>
      )}

      <div className="receptions-header">
        <div>
          <h1 className="receptions-title">Réceptions de Stock</h1>
          <p className="receptions-subtitle">{stats.total} réceptions au total</p>
        </div>
        <div className="receptions-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              <span>Nouvelle Réception</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            <span>Exporter</span>
          </button>
          <button
            className="btn btn-secondary btn-icon-only"
            onClick={() => { loadReceptions(); loadCommandesDisponibles(); }}
            title="Rafraîchir"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      <div className="receptions-stats">
        <div className="stat-card">
          <div className="stat-icon total"><Truck size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Total</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon en-attente"><Clock size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">En attente</span>
            <span className="stat-value">{stats.enAttente}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon partielle"><AlertCircle size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Partielles</span>
            <span className="stat-value">{stats.partielle}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon complete"><CheckCircle size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Complètes</span>
            <span className="stat-value">{stats.complete}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon annulee"><Ban size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Annulées</span>
            <span className="stat-value">{stats.annulee}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon montant"><Banknote size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Montant total</span>
            <span className="stat-value">{formatMontant(stats.totalMontant)}</span>
          </div>
        </div>
      </div>

      <div className="receptions-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher une réception..."
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
        <div className="filter-group">
          <select
            className="filter-select"
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="partielle">Partielle</option>
            <option value="complete">Complète</option>
            <option value="annulee">Annulée</option>
          </select>
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

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Chargement...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-secondary" onClick={loadReceptions}>
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {viewMode === 'grid' ? renderGridView() : renderListView()}
        </>
      )}

      {!loading && !error && filteredReceptions.length > itemsPerPage && (
        <div className="receptions-pagination">
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

      {/* MODAL NOUVELLE RÉCEPTION */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <div className="modal-header-icon">
                  <Plus size={20} />
                </div>
                <div>
                  <h2>Nouvelle Réception</h2>
                  <p className="modal-header-subtitle">Enregistrez la réception d'une commande fournisseur</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => !saving && setShowModal(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              {error && (
                <div className="modal-error">
                  <AlertTriangle size={18} />
                  <p>{error}</p>
                </div>
              )}

              <div className="form-section">
                <div className="section-header">
                  <h4>
                    <ShoppingBag size={18} />
                    1. Sélectionner une commande
                  </h4>
                  <span className="section-badge">
                    {commandesDisponibles.length} disponible(s)
                  </span>
                </div>

                {renderCommandePicker()}
              </div>

              {formData.id_commande_achat && commandeSelectionnee && (
                <div className="form-section">
                  <div className="section-header">
                    <h4>
                      <CheckCheck size={18} />
                      2. Produits à recevoir
                    </h4>
                    <span className="section-badge">
                      {formData.lignes.filter(l => l.valide).length} / {formData.lignes.length} validés
                    </span>
                  </div>

                  {renderLignesReception()}
                </div>
              )}

             
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
                disabled={
                  saving ||
                  !formData.id_commande_achat ||
                  formData.lignes.filter(l => l.valide).length === 0
                }
              >
                {saving ? (
                  <>
                    <span className="spinner-small spinner-on-primary"></span>
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Enregistrer la réception</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAILS */}
      {showDetailModal && selectedReception && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <div className="modal-header-icon">
                  <Truck size={20} />
                </div>
                <div>
                  <h2>Détails de la réception</h2>
                  <p className="modal-header-subtitle">{selectedReception.numero_reception}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <div className="detail-header-left">
                  <div className="detail-icon"><Truck size={28} /></div>
                  <div>
                    <h3 className="detail-numero">{selectedReception.numero_reception}</h3>
                    <span className="detail-date">
                      <Calendar size={14} />
                      {new Date(selectedReception.date_reception).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <div className="detail-header-right">
                  {renderStatut(selectedReception.statut)}
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-section">
                  <h4><Building size={16} /> Fournisseur</h4>
                  <div className="detail-item">
                    <label>Nom</label>
                    <span>{selectedReception.fournisseur_nom || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Téléphone</label>
                    <span>{selectedReception.fournisseur_telephone || '-'}</span>
                  </div>
                </div>
                <div className="detail-section">
                  <h4><FileText size={16} /> Informations</h4>
                  <div className="detail-item">
                    <label>Commande</label>
                    <span>{selectedReception.numero_commande || 'Sans commande'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Créé par</label>
                    <span>{selectedReception.utilisateur_nom || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Montant total</label>
                    <span className="montant-total">{formatMontant(selectedReception.montant_total)}</span>
                  </div>
                </div>
              </div>

              {selectedReception.lignes && selectedReception.lignes.length > 0 && (
                <div className="detail-lignes">
                  <h4>Produits reçus</h4>
                  <div className="detail-lignes-wrapper">
                    <table className="detail-lignes-table">
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Unité</th>
                          <th>Commandé</th>
                          <th>Reçu</th>
                          <th>Écart</th>
                          <th>Prix unit.</th>
                          <th>État</th>
                          <th>Lot</th>
                          <th>Péremption</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReception.lignes.map((ligne, index) => {
                          const qteBase = parseFloat(ligne.quantite_base) || 1;
                          const prixUV = ligne.prix_achat_unite_vente !== null
                            ? parseFloat(ligne.prix_achat_unite_vente) : null;
                          const ecart = parseFloat(ligne.ecart) || 0;
                          const uniteLabel = ligne.nom_unite_vente || 'Unité';

                          return (
                            <tr key={index}>
                              <td>
                                <span className="produit-nom">{ligne.produit_nom}</span>
                              </td>
                              <td>
                                <span className="unite-badge">
                                  <Box size={12} />
                                  {uniteLabel}
                                  {qteBase > 1 && <small>×{qteBase}</small>}
                                </span>
                              </td>
                              <td className="quantite-commandee">
                                <span className="qte-display">
                                  <strong>{ligne.quantite_commandee || 0}</strong>
                                  <span className="qte-unite">{uniteLabel}</span>
                                </span>
                              </td>
                              <td className="quantite-recue">
                                <span className="qte-display highlight">
                                  <strong>{ligne.quantite_recue}</strong>
                                  <span className="qte-unite">{uniteLabel}</span>
                                </span>
                              </td>
                              <td className="col-ecart">
                                {ecart > 0 && (
                                  <span className="ecart-badge warning">
                                    <strong>-{ecart}</strong> {uniteLabel}
                                  </span>
                                )}
                                {ecart < 0 && (
                                  <span className="ecart-badge info">
                                    <strong>+{Math.abs(ecart)}</strong> {uniteLabel}
                                  </span>
                                )}
                                {ecart === 0 && (
                                  <span className="ecart-badge success">✓ Conforme</span>
                                )}
                              </td>
                              <td>
                                {prixUV !== null
                                  ? formatMontant(prixUV)
                                  : <em style={{ color: '#94a3b8' }}>À définir</em>}
                              </td>
                              <td>
                                <span className={`etat-badge etat-${ligne.etat_marchandise || 'bon'}`}>
                                  {ligne.etat_marchandise || 'bon'}
                                </span>
                              </td>
                              <td>{ligne.num_lot || '-'}</td>
                              <td>{ligne.date_peremption ? new Date(ligne.date_peremption).toLocaleDateString('fr-FR') : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmer la suppression</h2>
              <button className="modal-close" onClick={() => !deleting && setShowDeleteModal(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              <div className="delete-icon-wrapper">
                <AlertTriangle size={48} color="#ef4444" />
              </div>
              <p>Êtes-vous sûr de vouloir supprimer cette réception ?</p>
              <p className="delete-item-name">
                <strong>"{receptionToDelete?.numero_reception}"</strong>
              </p>
              <p className="delete-item-detail">
                Fournisseur : {receptionToDelete?.fournisseur_nom || 'Sans fournisseur'}
              </p>
              <p className="delete-item-detail">
                Date : {receptionToDelete?.date_reception}
              </p>
              <p className="delete-warning">
                ⚠️ Cette action est irréversible
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Annuler
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
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

      {/* MODAL DE CONFIRMATION GÉNÉRIQUE */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        details={confirmModal.details}
        type={confirmModal.type}
        confirmLabel={confirmModal.confirmLabel}
        loading={saving}
      />
    </div>
  );
};

export default Receptions;