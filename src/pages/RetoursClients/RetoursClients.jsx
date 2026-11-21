// pages/RetoursClients/RetoursClients.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import {
  Plus, Eye, Check, RefreshCw, Ban, RotateCcw, Package, Loader,
  ChevronLeft, Info, AlertTriangle, SearchX, ShieldCheck, Clock, X,
} from "lucide-react";
import RetourClientService from "../../services/retourClient/retourClientService";
import CommandeVenteService from "../../services/commandeVenteService";
import UniteVenteService from "../../services/uniteVenteService";
import StockInputWithSelector from "../../components/StockSelector/StockInputWithSelector";
import { useUser } from "../../context/AuthContext";
import {
  Page, PageHead, Overview, Stage, SearchBox, Badge, ErrorBar, Empty, SkeletonRows, Pager,
  usePagination, useToast, Toast, Modal, ModalHead, Confirm, ActionsMenu, KV, fcfa, dateFR, sansAccents, pluriel,
} from "../../components/UI/Vt";
import "./RetoursClients.css";
import { hasAccess, peutFaire } from '../../config/rolePermissions';

// ============================================================
// Helpers
// ============================================================
const formatMontant = fcfa;
const formatDateFR = dateFR;

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

/** « 27 » pièces avec carton de 12 -> « 2 Cartons 3 Pièces » (texte simple, pour les listes) */
const motPluriel = (n, mot) => (n > 1 && !/[sxz]$/i.test(mot) && mot.length > 2 ? `${mot}s` : mot);
const qteTexte = (qteBase, ligne) => {
  let reste = Math.round((Number(qteBase) || 0) * 1000) / 1000;
  if (reste <= 0) return '0';
  const grandes = (ligne.unites_disponibles || [])
    .filter(u => Number(u.quantite_base) > 1 && u.nom)
    .sort((a, b) => Number(b.quantite_base) - Number(a.quantite_base));
  const parts = [];
  const vues = new Set();
  for (const u of grandes) {
    const qb = Number(u.quantite_base);
    if (vues.has(qb)) continue;
    vues.add(qb);
    const k = Math.floor(reste / qb + 1e-9);
    if (k > 0) { parts.push(`${k} ${motPluriel(k, u.nom)}`); reste = Math.round((reste - k * qb) * 1000) / 1000; }
  }
  if (reste > 0) parts.push(`${reste} ${motPluriel(reste, ligne.unite_base_nom || 'Unité')}`);
  return parts.join(' ');
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
  const [toast, showToast, closeToast] = useToast();

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
  const [aAnnuler, setAAnnuler] = useState(null);
  const [annulant, setAnnulant] = useState(false);

  const canManage = !!user && hasAccess(user.role, 'retours-clients');
  // Valider un retour (stock + argent) : le patron, ou un rôle qu'il a autorisé
  const canValider = !!user && peutFaire(user.role, 'retours.valider');
  const [aDecider, setADecider] = useState(null); // { retour, action: 'approuver' | 'refuser' }
  const [motifRefus, setMotifRefus] = useState('');
  const [decidant, setDecidant] = useState(false);

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
      console.error('LoadRetours:', err);
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
      console.error('LoadStats:', err);
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
      console.error('LoadCommandeParam:', err);
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
    rechercherCommande('');
  };

  // ========== WIZARD : recherche de commande ==========
  const rechercherCommande = (texte) => {
    setSearchCommande(texte);
    setSelectedCommande(null);
    setLignesCommande([]);

    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    // 1 caractère : on attend la suite. Vide : les dernières ventes.
    if (texte.trim().length === 1) {
      setResultatsRecherche([]);
      setIsSearchingCommande(false);
      return;
    }

    setIsSearchingCommande(true);

    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await RetourClientService.searchCommande(token, texte.trim());
        if (res.success) {
          setResultatsRecherche(res.data || []);
        }
      } catch (err) {
        console.error('Search commande:', err);
        setResultatsRecherche([]);
      } finally {
        setIsSearchingCommande(false);
      }
    }, texte.trim() ? 350 : 0);
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
      console.error('SelectionnerCommande:', err);
      showToast('Erreur lors du chargement', 'error');
    }
  };

  // ========== WIZARD : charger les données de la commande ==========
  const chargerCommandeDansWizard = async (commandeComplete) => {
    // Ce que le client doit encore sur la facture : un retour l'annule d'abord
    const resteDu = commandeComplete.id_facture
      ? Math.max(0, (parseFloat(commandeComplete.montant_facture ?? commandeComplete.montant_total) || 0) - (parseFloat(commandeComplete.total_paye) || 0))
      : null;
    setSelectedCommande({ ...commandeComplete, reste_du: resteDu });

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

        // Sélection utilisateur (en unité de base : 2 cartons + 3 pièces = 27)
        quantite_retour_base: '',
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
        console.warn('Impossible de charger les unités pour', ligne.produit_nom, err);
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

  // Cocher un article : on propose tout ce qui peut revenir, la quantité reste modifiable
  const basculerLigne = (index) => {
    setLignesCommande(prev => prev.map((l, i) => {
      if (i !== index) return l;
      const choisi = (parseFloat(l.quantite_retour_base) || 0) > 0;
      return { ...l, quantite_retour_base: choisi ? '' : String(l.quantite_retournable_base) };
    }));
  };

  // ========== WIZARD : calcul du total à rembourser ==========
  const totalRemboursement = useMemo(() => {
    let total = 0;
    for (const ligne of lignesCommande) {
      const qteBase = parseFloat(ligne.quantite_retour_base) || 0;
      if (qteBase <= 0) continue;

      const prixOrigineTotal = ligne.quantite_origine * ligne.prix_vente_origine;
      const prixUnitaireBase = prixOrigineTotal / ligne.quantite_achetee_base;

      total += qteBase * prixUnitaireBase;
    }
    return total;
  }, [lignesCommande]);

  // ========== WIZARD : vérifier validité ==========
  const lignesValides = useMemo(() => {
    return lignesCommande.filter(l => {
      const qteBase = parseFloat(l.quantite_retour_base) || 0;
      return qteBase > 0 && qteBase <= l.quantite_retournable_base + 1e-9;
    });
  }, [lignesCommande]);

  const aDepassement = lignesCommande.some(l => (parseFloat(l.quantite_retour_base) || 0) > l.quantite_retournable_base + 1e-9);
  const peutValider = lignesValides.length > 0 && !aDepassement;

  // Le retour annule d'abord ce que le client doit encore ; on ne rend que ce qu'il a payé en trop
  const bilan = useMemo(() => {
    const du = selectedCommande?.reste_du;
    const connu = du != null && ['remboursement_especes', 'avoir'].includes(typeResolution);
    const retire = connu ? Math.min(totalRemboursement, du) : 0;
    const rendre = typeResolution === 'remboursement_especes' ? (connu ? Math.max(0, totalRemboursement - du) : totalRemboursement) : 0;
    const enAvoir = typeResolution === 'avoir' ? (connu ? Math.max(0, totalRemboursement - du) : totalRemboursement) : 0;
    const libelle = typeResolution === 'remboursement_especes' ? 'À rendre au client (espèces)'
      : typeResolution === 'avoir' ? 'Reste en avoir pour le client' : 'Valeur à échanger';
    const montant = typeResolution === 'remboursement_especes' ? rendre : typeResolution === 'avoir' ? enAvoir : totalRemboursement;
    return { du, connu, retire, rendre, enAvoir, libelle, montant };
  }, [selectedCommande, typeResolution, totalRemboursement]);

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
        // Envoyé en unité de base (cartons + pièces déjà additionnés),
        // avec la ligne vendue exacte (le même produit peut être sur 2 lignes)
        lignes: lignesValides.map(l => ({
          id_produit: l.id_produit,
          id_ligne_vente: l.id_ligne_vente,
          id_unite_vente: null,
          nom_unite_vente: l.unite_base_nom || 'Unité',
          quantite_base: 1,
          quantite: parseFloat(l.quantite_retour_base),
          etat_produit: l.etat_produit
        }))
      };

      const res = await RetourClientService.create(token, payload);

      if (res.success) {
        showToast(res.en_attente
          ? `Retour ${res.data.numero_retour} envoyé au patron. Ne rendez rien au client avant sa validation.`
          : `Retour ${res.data.numero_retour} créé avec succès`, res.en_attente ? 'info' : 'success');
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
      console.error('Submit retour:', err);
      showToast(err.message || 'Erreur lors de la création', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ========== VOIR DÉTAIL ==========
  const handleView = async (retour) => {
    try {
      const res = await RetourClientService.getById(token, retour.id_retour_client);
      if (res.success) {
        setSelectedRetour(res.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('View retour:', err);
      showToast('Erreur lors du chargement', 'error');
    }
  };

  // ========== ANNULER ==========
  const handleAnnuler = async () => {
    const retour = aAnnuler;
    if (!retour) return;
    setAnnulant(true);
    try {
      const res = await RetourClientService.annuler(token, retour.id_retour_client);
      if (res.success) {
        showToast(`Retour ${retour.numero_retour} annulé`, 'success');
        setAAnnuler(null);
        await loadRetours();
        await loadStats();
      } else {
        showToast(res.message || 'Erreur', 'error');
      }
    } catch (err) {
      console.error('Annuler:', err);
      showToast(err.message || 'Erreur', 'error');
    } finally {
      setAnnulant(false);
    }
  };

  // ========== VALIDER / REFUSER ==========
  const handleDecision = async () => {
    if (!aDecider) return;
    const { retour, action } = aDecider;
    setDecidant(true);
    try {
      const res = action === 'approuver'
        ? await RetourClientService.approuver(token, retour.id_retour_client)
        : await RetourClientService.refuser(token, retour.id_retour_client, motifRefus.trim());
      if (res.success) {
        showToast(res.message, action === 'approuver' ? 'success' : 'info');
        setADecider(null);
        setMotifRefus('');
        if (showDetailModal && selectedRetour?.id_retour_client === retour.id_retour_client) setSelectedRetour(res.data);
        await loadRetours();
        await loadStats();
      } else {
        showToast(res.message || 'Erreur', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Erreur', 'error');
    } finally {
      setDecidant(false);
    }
  };

  // ========== LISTE ==========
  const filteredRetours = useMemo(() => {
    const q = sansAccents(searchTerm.trim());
    if (!q) return retours;
    return retours.filter(r =>
      [r.numero_retour, r.nomclient, r.telephone, r.numero_commande].some(f => sansAccents(f).includes(q))
    );
  }, [retours, searchTerm]);

  const { page, nbPages, setPage, numeros, visibles: currentItems } = usePagination(filteredRetours, 10, [searchTerm, filterStatut]);

  const STATUTS_RETOUR = {
    en_attente: { label: 'À valider', tone: 'warn' },
    recu: { label: 'Reçu', tone: 'info' },
    controle: { label: 'Contrôlé', tone: 'info' },
    accepte: { label: 'Accepté', tone: 'muted' },
    refuse: { label: 'Refusé', tone: 'bad' },
    rembourse: { label: 'Remboursé', tone: 'signal' },
    echange: { label: 'Échangé', tone: 'info' },
    annule: { label: 'Annulé', tone: 'bad' },
  };
  const StatutRetour = ({ statut }) => {
    const c = STATUTS_RETOUR[statut] || STATUTS_RETOUR.en_attente;
    return <Badge tone={c.tone}>{c.label}</Badge>;
  };

  const FILTRES = [
    { value: '', label: 'Tous les retours', count: stats?.total, tone: 'all' },
    { value: 'en_attente', label: 'À valider', count: stats?.en_attente, tone: 'warn' },
    { value: 'accepte', label: 'Acceptés', count: stats?.accepte, tone: 'muted' },
    { value: 'rembourse', label: 'Remboursés', count: stats?.rembourse, tone: 'signal' },
    { value: 'refuse', label: 'Refusés', count: stats?.refuse, tone: 'bad' },
    { value: 'annule', label: 'Annulés', count: stats?.annule, tone: 'bad', apart: true },
  ];

  const uniteBaseDe = (ligne) => ({ nom: ligne.unite_base_nom, symbole: ligne.unite_base_symbole });
  const fermerWizard = () => {
    if (saving) return;
    setShowWizard(false);
    if (searchParams.get('commande')) navigate(`/${slug}/retours-clients`, { replace: true });
  };

  // ========== RENDU ==========
  return (
    <Page className="rcl">
      <PageHead title="Retours clients" sub="Les articles que vos clients vous rapportent : remis en stock, remboursés ou échangés">
        <button type="button" className="vt-btn vt-btn--icon" onClick={() => { loadRetours(); loadStats(); }}
                disabled={loading} aria-label="Rafraîchir" title="Rafraîchir">
          <RefreshCw size={16} className={loading ? 'vt-spin' : ''} />
        </button>
        {canManage && (
          <button type="button" className="vt-btn vt-btn--primary" onClick={handleOpenWizard}>
            <Plus size={16} /> Nouveau retour
          </button>
        )}
      </PageHead>

      {stats?.en_attente > 0 && filterStatut !== 'en_attente' && (
        <button type="button" className="rcl-attente" onClick={() => setFilterStatut('en_attente')}>
          <Clock size={18} />
          <span>
            <strong>{pluriel(stats.en_attente, 'retour attend', 'retours attendent')} {canValider ? 'votre validation' : 'la validation du patron'}</strong>
            <span>{formatMontant(stats.montant_en_attente || 0)} · le stock et l'argent ne bougent qu'après validation</span>
          </span>
          <span className="rcl-attente-voir">Voir</span>
        </button>
      )}

      <Overview label="Montant des retours" value={formatMontant(stats?.montant_total || 0)}
                note="Retours validés uniquement">
        {FILTRES.map(f => (
          <Stage key={f.value || 'tous'} count={f.count ?? '–'} label={f.label} tone={f.tone} apart={f.apart}
                 pressed={filterStatut === f.value}
                 onClick={() => setFilterStatut(filterStatut === f.value ? '' : f.value)} />
        ))}
      </Overview>

      <div className="vt-toolbar">
        <SearchBox value={searchTerm} onChange={setSearchTerm}
                   placeholder="N° de retour, client, téléphone ou n° de vente" label="Rechercher un retour" />
        <span className="vt-count">{pluriel(filteredRetours.length, 'retour')}</span>
      </div>

      {error && !loading && <ErrorBar message={error} onRetry={loadRetours} />}

      <div className="vt-table-wrap" aria-busy={loading || undefined}>
        {loading && retours.length > 0 && <div className="vt-busybar" />}
        <table className="vt-table rcl-table">
          <thead>
            <tr>
              <th>Retour</th>
              <th>Client</th>
              <th className="rcl-hide">Vente d'origine</th>
              <th className="vt-th-right">Montant</th>
              <th>Statut</th>
              <th className="vt-th-right">Actions</th>
            </tr>
          </thead>
          <tbody style={numeros}>
            {loading && retours.length === 0
              ? <SkeletonRows cols={6} widths={[60, 60, 50, 45, 40, 30]} />
              : currentItems.map(r => (
                <tr key={r.id_retour_client}>
                  <td>
                    <button type="button" className="vt-link vt-cell-main" onClick={() => handleView(r)}>{r.numero_retour}</button>
                    <div className="vt-cell-sub">{formatDateFR(r.date_retour)}</div>
                  </td>
                  <td>
                    <div className="vt-cell-main vt-cell-main--plain">{r.nomclient || 'Client sans nom'}</div>
                    <div className="vt-cell-sub">{r.telephone || '-'}</div>
                  </td>
                  <td className="rcl-hide">
                    <div>{r.numero_commande || '-'}</div>
                    <div className="vt-cell-sub">{pluriel(parseInt(r.nb_lignes, 10) || 0, 'produit')}</div>
                  </td>
                  <td className="vt-td-right"><span className="vt-num vt-strong">{formatMontant(r.montant_total)}</span></td>
                  <td><StatutRetour statut={r.statut} /></td>
                  <td className="vt-td-right">
                    <div className="vt-actions">
                      <button type="button" className="vt-iconbtn vt-iconbtn--sm" onClick={() => handleView(r)}
                              aria-label={`Voir le retour ${r.numero_retour}`} title="Voir le détail">
                        <Eye size={15} />
                      </button>
                      {canValider && r.statut === 'en_attente' && (
                        <button type="button" className="vt-btn vt-btn--primary vt-btn--sm"
                                onClick={() => setADecider({ retour: r, action: 'approuver' })}>
                          <ShieldCheck size={14} /> Valider
                        </button>
                      )}
                      <ActionsMenu label={`Autres actions pour ${r.numero_retour}`} items={[
                        { label: 'Voir le détail', icon: Eye, onClick: () => handleView(r) },
                        { label: 'Valider le retour', icon: ShieldCheck, hidden: !canValider || r.statut !== 'en_attente',
                          onClick: () => setADecider({ retour: r, action: 'approuver' }) },
                        { label: 'Refuser le retour', icon: X, danger: true, hidden: !canValider || r.statut !== 'en_attente',
                          onClick: () => setADecider({ retour: r, action: 'refuser' }) },
                        { label: r.statut === 'en_attente' ? 'Annuler la demande' : 'Annuler le retour', icon: Ban, danger: true,
                          hidden: !canManage || ['annule', 'refuse'].includes(r.statut) || (r.statut !== 'en_attente' && !canValider),
                          onClick: () => setAAnnuler(r) },
                      ]} />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!loading && currentItems.length === 0 && (
          retours.length === 0 && !searchTerm ? (
            <Empty icon={RotateCcw} title={filterStatut ? 'Aucun retour dans ce statut' : 'Aucun retour client'}
                   text="Quand un client rapporte un article, enregistrez-le ici : il revient en stock et le remboursement est noté.">
              {canManage && !filterStatut && (
                <button type="button" className="vt-btn vt-btn--primary vt-btn--sm" onClick={handleOpenWizard}>
                  <Plus size={14} /> Nouveau retour
                </button>
              )}
            </Empty>
          ) : (
            <Empty icon={SearchX} title="Aucun retour ne correspond" text="Modifiez la recherche ou le filtre." />
          )
        )}
      </div>

      <Pager page={page} nbPages={nbPages} total={filteredRetours.length} unite="retour" onChange={setPage} />

      {/* ========== ASSISTANT DE RETOUR ========== */}
      {showWizard && (
        <Modal size="lg" busy={saving} labelledBy="rcl-wiz-title" dismissable={!saving} onClose={fermerWizard}
               className="rcl-wizard">
          <ModalHead id="rcl-wiz-title" title="Nouveau retour"
                     sub={wizardStep === 1 ? "Retrouvez la vente d'origine" : 'Choisissez les articles rapportés'}
                     onClose={fermerWizard} disabled={saving} />
          <div className="vt-steps" aria-hidden="true">
            <span className="vt-step" data-etat={wizardStep === 1 ? 'actif' : 'fait'}>
              <i>{wizardStep > 1 ? <Check size={12} /> : '1'}</i> Vente
            </span>
            <span className="rcl-step-sep" />
            <span className="vt-step" data-etat={wizardStep === 2 ? 'actif' : ''}><i>2</i> Articles</span>
          </div>

          <div className="vt-modal-body">
            {wizardStep === 1 && (
              <div>
                <div className="vt-search rcl-wiz-search">
                  <input type="text" className="vt-input vt-search-input" autoFocus spellCheck={false}
                         placeholder="N° de vente, n° de facture ou téléphone du client"
                         aria-label="Rechercher la vente" value={searchCommande}
                         onChange={(e) => rechercherCommande(e.target.value)} />
                  {isSearchingCommande && <Loader size={16} className="vt-spin rcl-wiz-spin" />}
                </div>
                <span className="vt-hint"><Info size={12} /> Seules les ventes des 90 derniers jours peuvent être retournées.</span>

                {!isSearchingCommande && resultatsRecherche.length === 0 && searchCommande.trim().length !== 1 && (
                  searchCommande.trim()
                    ? <Empty icon={SearchX} title="Aucune vente trouvée"
                             text="Vérifiez le numéro, ou cherchez avec le nom ou le téléphone du client." />
                    : <Empty icon={RotateCcw} title="Aucune vente récente à retourner"
                             text="Cherchez la vente avec son numéro, le nom ou le téléphone du client." />
                )}

                {resultatsRecherche.length > 0 && (
                  <>
                    <h3 className="vt-section-title rcl-liste-titre">
                      {searchCommande.trim() ? pluriel(resultatsRecherche.length, 'vente trouvée', 'ventes trouvées') : 'Dernières ventes'}
                    </h3>
                    <div className="vt-pick-list rcl-ventes">
                      {resultatsRecherche.map((c, i) => (
                        <button key={c.id_commande} type="button" className="vt-pick rcl-vente" onClick={() => selectionnerCommande(c)}>
                          <span className="rcl-vente-num">{i + 1}</span>
                          <span className="rcl-vente-corps">
                            <span className="vt-pick-main">{c.nomclient || 'Client sans nom'}</span>
                            <span className="vt-cell-sub">
                              {c.numero_commande} · {formatDateFR(c.date_commande)}{c.telephone ? ` · ${c.telephone}` : ''}
                            </span>
                          </span>
                          <span className="rcl-vente-droite">
                            <span className="vt-num vt-strong">{formatMontant(c.montant_total)}</span>
                            <span className="vt-cell-sub">{pluriel(parseInt(c.nb_lignes, 10) || 0, 'produit')}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {wizardStep === 2 && !selectedCommande && (
              <div className="rcl-wiz-loading"><Loader size={18} className="vt-spin" /> Chargement de la vente…</div>
            )}

            {wizardStep === 2 && selectedCommande && (
              <div className="vt-stack">
                <div className="rcl-recap">
                  <div>
                    <span className="vt-label">Vente</span>
                    <strong>{selectedCommande.numero_commande}</strong>
                  </div>
                  <div>
                    <span className="vt-label">Client</span>
                    <strong>{selectedCommande.nomclient || 'Client sans nom'}</strong>
                  </div>
                  <div>
                    <span className="vt-label">Date</span>
                    <strong>{formatDateFR(selectedCommande.date_commande)}</strong>
                  </div>
                </div>

                <div>
                  <h3 className="vt-section-title">1. Cochez les articles rapportés</h3>
                  {lignesCommande.length === 0 ? (
                    <Empty icon={Package} title="Aucun article à retourner" />
                  ) : (
                    <div className="rcl-lignes">
                      {lignesCommande.map((ligne, index) => {
                        const epuise = ligne.quantite_retournable_base <= 0;
                        const qteBase = parseFloat(ligne.quantite_retour_base) || 0;
                        const choisi = !epuise && qteBase > 0;
                        const invalid = qteBase > ligne.quantite_retournable_base + 1e-9;
                        const prixBase = ligne.quantite_achetee_base > 0
                          ? (ligne.quantite_origine * ligne.prix_vente_origine) / ligne.quantite_achetee_base : 0;
                        return (
                          <div key={index} className="rcl-ligne" data-etat={epuise ? 'vide' : invalid ? 'erreur' : choisi ? 'choisi' : ''}>
                            <button type="button" className="rcl-ligne-tete" disabled={epuise || saving}
                                    aria-pressed={choisi} onClick={() => basculerLigne(index)}>
                              <span className="rcl-case" aria-hidden="true">{choisi && <Check size={13} strokeWidth={3} />}</span>
                              <span className="rcl-ligne-num">{index + 1}</span>
                              <span className="rcl-ligne-nom">
                                <strong>{ligne.produit_nom}</strong>
                                <span className="vt-cell-sub">
                                  {epuise ? 'Déjà entièrement retourné' : `Peut revenir : ${qteTexte(ligne.quantite_retournable_base, ligne)}`}
                                  {!epuise && ligne.quantite_deja_retournee_base > 0 && ' (une partie est déjà revenue)'}
                                </span>
                              </span>
                              {choisi && !invalid && (
                                <span className="rcl-ligne-droite">
                                  <span className="vt-num vt-strong">{formatMontant(qteBase * prixBase)}</span>
                                  <span className="vt-cell-sub">{qteTexte(qteBase, ligne)}</span>
                                </span>
                              )}
                            </button>

                            {choisi || invalid ? (
                              <div className="rcl-saisie">
                                <div className="vt-field rcl-qte">
                                  <span className="vt-label">Quantité rapportée</span>
                                  <div className="rcl-qte-ligne">
                                    <StockInputWithSelector
                                      name={`rcl-q-${index}`}
                                      value={ligne.quantite_retour_base}
                                      onChange={(e) => updateLigne(index, 'quantite_retour_base', e.target.value)}
                                      unitesVente={(ligne.unites_disponibles || []).filter(u => !u.is_base)}
                                      uniteBase={uniteBaseDe(ligne)}
                                      disabled={saving}
                                    />
                                    {qteBase !== ligne.quantite_retournable_base && (
                                      <button type="button" className="vt-btn vt-btn--sm" disabled={saving}
                                              onClick={() => updateLigne(index, 'quantite_retour_base', String(ligne.quantite_retournable_base))}>
                                        Tout
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="vt-field">
                                  <span className="vt-label">État de l'article</span>
                                  <div className="rcl-chips" role="group" aria-label={`État de ${ligne.produit_nom}`}>
                                    {ETATS_PRODUIT.map(e => (
                                      <button key={e.value} type="button" aria-pressed={ligne.etat_produit === e.value}
                                              disabled={saving} onClick={() => updateLigne(index, 'etat_produit', e.value)}>
                                        {e.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            {invalid && (
                              <p className="rcl-erreur">
                                <AlertTriangle size={14} /> C'est plus que ce qui peut revenir pour cet article.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="vt-field">
                  <h3 className="vt-section-title">2. Ce que reçoit le client</h3>
                  <div className="rcl-chips rcl-chips--grand" role="group" aria-label="Ce que reçoit le client">
                    {RESOLUTIONS.map(r => (
                      <button key={r.value} type="button" aria-pressed={typeResolution === r.value}
                              disabled={saving} onClick={() => setTypeResolution(r.value)}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="vt-field">
                  <h3 className="vt-section-title">3. Pourquoi le client rapporte l'article</h3>
                  <div className="rcl-chips" role="group" aria-label="Motif du retour">
                    {MOTIFS.map(m => (
                      <button key={m.value} type="button" aria-pressed={motifRetour === m.value}
                              disabled={saving} onClick={() => setMotifRetour(m.value)}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="vt-field">
                  <label htmlFor="rcl-notes">Note (facultatif)</label>
                  <textarea id="rcl-notes" className="vt-input" rows="2" maxLength={500} placeholder="Commentaire interne"
                            value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>

                {!canValider && (
                  <div className="vt-info-note rcl-avis">
                    <ShieldCheck size={18} />
                    <div>
                      <strong>Ce retour sera validé par le patron.</strong>{' '}
                      Ne rendez ni argent ni article au client avant sa validation : il est prévenu sur son téléphone.
                    </div>
                  </div>
                )}

                {totalRemboursement > 0 && (
                  <div className="rcl-bilan">
                    <ol className="rcl-repart">
                      <li><span>Valeur des articles rapportés</span><strong className="vt-num">{formatMontant(totalRemboursement)}</strong></li>
                      {bilan.connu && bilan.du > 0.009 && (
                        <li><span>Retiré de ce qu'il doit encore ({formatMontant(bilan.du)})</span><strong className="vt-num">− {formatMontant(bilan.retire)}</strong></li>
                      )}
                    </ol>
                    <div className="vt-due rcl-total">
                      <span className="vt-due-label">{bilan.libelle}{!canValider && ' (après validation du patron)'}</span>
                      <strong className="vt-due-amount vt-num">{formatMontant(bilan.montant)}</strong>
                    </div>
                    {bilan.connu && typeResolution === 'remboursement_especes' && bilan.rendre < 0.009 && (
                      <p className="rcl-note">Rien à rendre : le client n'avait pas encore payé ces articles. Sa facture baisse de {formatMontant(totalRemboursement)}.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="vt-modal-foot">
            {wizardStep === 1 ? (
              <>
                <span className="vt-foot-hint">Choisissez une vente pour continuer</span>
                <div className="vt-foot-actions">
                  <button type="button" className="vt-btn" onClick={fermerWizard}>Fermer</button>
                </div>
              </>
            ) : (
              <>
                <button type="button" className="vt-btn" disabled={saving}
                        onClick={() => { setWizardStep(1); setSelectedCommande(null); setLignesCommande([]); }}>
                  <ChevronLeft size={16} /> Changer de vente
                </button>
                <div className="vt-foot-actions">
                  <button type="button" className="vt-btn vt-btn--primary" onClick={handleSubmitRetour} disabled={saving || !peutValider}>
                    {saving ? <Loader size={16} className="vt-spin" /> : <Check size={16} />}
                    {saving ? 'Enregistrement'
                      : !peutValider ? 'Cochez un article'
                      : !canValider ? 'Envoyer au patron pour validation'
                      : typeResolution === 'remboursement_especes' && bilan.rendre > 0.009 ? `Valider et rendre ${formatMontant(bilan.rendre)}`
                      : `Valider le retour (${pluriel(lignesValides.length, 'article')})`}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ========== DÉTAIL ========== */}
      {showDetailModal && selectedRetour && (
        <Modal size="md" labelledBy="rcl-det-title" onClose={() => setShowDetailModal(false)}>
          <ModalHead id="rcl-det-title" title={`Retour ${selectedRetour.numero_retour}`}
                     sub={formatDateFR(selectedRetour.date_retour)} onClose={() => setShowDetailModal(false)}>
            <StatutRetour statut={selectedRetour.statut} />
          </ModalHead>
          <div className="vt-modal-body">
            {selectedRetour.statut === 'en_attente' && (
              <div className="vt-info-note rcl-avis">
                <Clock size={18} />
                <div>
                  <strong>{canValider ? 'Ce retour attend votre validation.' : 'Ce retour attend la validation du patron.'}</strong>{' '}
                  Le stock et l'argent ne bougent qu'après validation.
                </div>
              </div>
            )}
            <KV items={[
              ['Client', selectedRetour.nomclient || '-'],
              ["Vente d'origine", selectedRetour.numero_commande || '-'],
              ['Motif', MOTIFS.find(m => m.value === selectedRetour.motif_retour)?.label || '-'],
              ['Résolution', RESOLUTIONS.find(r => r.value === selectedRetour.type_resolution)?.label || '-'],
              selectedRetour.notes ? ['Note', selectedRetour.notes] : null,
              ['Enregistré par', selectedRetour.utilisateur_nom || '-'],
              selectedRetour.valide_par_nom ? [selectedRetour.statut === 'refuse' ? 'Refusé par' : 'Validé par',
                `${selectedRetour.valide_par_nom}${selectedRetour.date_validation ? ` · ${formatDateFR(selectedRetour.date_validation)}` : ''}`] : null,
              selectedRetour.motif_refus ? ['Raison du refus', selectedRetour.motif_refus] : null,
              ['Valeur des articles', formatMontant(selectedRetour.montant_total), true],
              selectedRetour.montant_deduit > 0.009 ? ['Retiré de ce que le client devait', formatMontant(selectedRetour.montant_deduit)] : null,
              selectedRetour.montant_rendu > 0.009 ? ['Rendu en espèces', formatMontant(selectedRetour.montant_rendu)] : null,
            ]} />
            <div className="vt-det-block">
              <h3 className="vt-section-title">Articles rapportés</h3>
              <table className="vt-mini-table">
                <thead>
                  <tr><th>Produit</th><th>Quantité</th><th className="vt-right">Prix</th><th className="vt-right">Total</th></tr>
                </thead>
                <tbody>
                  {(selectedRetour.lignes || []).map((l, i) => (
                    <tr key={i}>
                      <td>{l.produit_nom}</td>
                      <td>
                        {l.quantite} {l.nom_unite_vente}
                        {l.quantite_base > 1 && <div className="vt-cell-sub">{l.quantite_totale_base} unités</div>}
                      </td>
                      <td className="vt-right vt-num">{formatMontant(l.prix_remboursement)}</td>
                      <td className="vt-right vt-num">{formatMontant(l.montant_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="vt-modal-foot vt-modal-foot--end">
            {canManage && !['annule', 'refuse'].includes(selectedRetour.statut)
              && (selectedRetour.statut === 'en_attente' ? !canValider : canValider) && (
              <button type="button" className="vt-btn vt-btn--danger"
                      onClick={() => { setShowDetailModal(false); setAAnnuler(selectedRetour); }}>
                <Ban size={16} /> {selectedRetour.statut === 'en_attente' ? 'Annuler la demande' : 'Annuler le retour'}
              </button>
            )}
            {canValider && selectedRetour.statut === 'en_attente' && (
              <>
                <button type="button" className="vt-btn vt-btn--danger"
                        onClick={() => setADecider({ retour: selectedRetour, action: 'refuser' })}>
                  <X size={16} /> Refuser
                </button>
                <button type="button" className="vt-btn vt-btn--primary"
                        onClick={() => setADecider({ retour: selectedRetour, action: 'approuver' })}>
                  <ShieldCheck size={16} /> Valider le retour
                </button>
              </>
            )}
            <button type="button" className="vt-btn" onClick={() => setShowDetailModal(false)}>Fermer</button>
          </div>
        </Modal>
      )}

      {aAnnuler && (
        <Confirm title="Annuler ce retour ?" danger busy={annulant} confirmLabel={annulant ? 'Annulation' : 'Annuler le retour'}
                 cancelLabel="Garder le retour" onConfirm={handleAnnuler} onClose={() => !annulant && setAAnnuler(null)}>
          {aAnnuler.statut === 'en_attente' ? (
            <p>La demande de retour <strong>{aAnnuler.numero_retour}</strong> sera retirée. Rien n'avait encore bougé.</p>
          ) : (
            <>
              <p>Le retour <strong>{aAnnuler.numero_retour}</strong> de <strong>{aAnnuler.nomclient || 'client sans nom'}</strong> sera annulé : les articles ressortent du stock.</p>
              <p className="vt-danger-warn">Cette action est irréversible.</p>
            </>
          )}
        </Confirm>
      )}

      {aDecider && (
        <Confirm
          title={aDecider.action === 'approuver' ? 'Valider ce retour ?' : 'Refuser ce retour ?'}
          danger={aDecider.action === 'refuser'} busy={decidant}
          icon={aDecider.action === 'approuver' ? ShieldCheck : AlertTriangle}
          confirmLabel={decidant ? 'Un instant' : aDecider.action === 'approuver' ? 'Valider le retour' : 'Refuser le retour'}
          cancelLabel="Retour" onConfirm={handleDecision}
          onClose={() => { if (!decidant) { setADecider(null); setMotifRefus(''); } }}>
          {aDecider.action === 'approuver' ? (
            <p>
              <strong>{aDecider.retour.numero_retour}</strong> · {aDecider.retour.nomclient || 'client sans nom'} · {formatMontant(aDecider.retour.montant_total)}
              {aDecider.retour.utilisateur_nom ? <>, demandé par <strong>{aDecider.retour.utilisateur_nom}</strong></> : null}.
              <br />Les articles neufs reviennent en stock et le remboursement est enregistré tout de suite.
            </p>
          ) : (
            <div className="vt-field">
              <p><strong>{aDecider.retour.numero_retour}</strong> · {formatMontant(aDecider.retour.montant_total)} : rien ne bougera.</p>
              <label htmlFor="rcl-motif-refus">Raison (facultatif, envoyée à l'employé)</label>
              <textarea id="rcl-motif-refus" className="vt-input" rows="2" maxLength={255} value={motifRefus}
                        onChange={(e) => setMotifRefus(e.target.value)} placeholder="Ex. : article utilisé, hors délai" />
            </div>
          )}
        </Confirm>
      )}

      <Toast toast={toast} onClose={closeToast} />
    </Page>
  );
};

export default RetoursClients;
