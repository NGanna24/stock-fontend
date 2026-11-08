// pages/RetoursClients/RetoursClients.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import {
  Plus, Eye, Check, RefreshCw, Ban, RotateCcw, Package, Loader,
  ChevronLeft, Info, AlertTriangle, SearchX,
} from "lucide-react";
import RetourClientService from "../../services/retourClient/retourClientService";
import CommandeVenteService from "../../services/commandeVenteService";
import UniteVenteService from "../../services/uniteVenteService";
import StockSelector from "../../components/StockSelector/StockSelector";
import StockInputWithSelector from "../../components/StockSelector/StockInputWithSelector";
import { useUser } from "../../context/AuthContext";
import {
  Page, PageHead, Overview, Stage, SearchBox, Badge, ErrorBar, Empty, SkeletonRows, Pager,
  usePagination, useToast, Toast, Modal, ModalHead, Confirm, ActionsMenu, KV, fcfa, dateFR, sansAccents, pluriel,
} from "../../components/UI/Vt";
import "./RetoursClients.css";

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
      console.error('❌ Annuler:', err);
      showToast(err.message || 'Erreur', 'error');
    } finally {
      setAnnulant(false);
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
    en_attente: { label: 'En attente', tone: 'muted' },
    recu: { label: 'Reçu', tone: 'info' },
    controle: { label: 'Contrôlé', tone: 'info' },
    accepte: { label: 'Accepté', tone: 'ok' },
    refuse: { label: 'Refusé', tone: 'bad' },
    rembourse: { label: 'Remboursé', tone: 'teal' },
    echange: { label: 'Échangé', tone: 'info' },
    annule: { label: 'Annulé', tone: 'bad' },
  };
  const StatutRetour = ({ statut }) => {
    const c = STATUTS_RETOUR[statut] || STATUTS_RETOUR.en_attente;
    return <Badge tone={c.tone}>{c.label}</Badge>;
  };

  const FILTRES = [
    { value: '', label: 'Tous les retours', count: stats?.total, tone: 'all' },
    { value: 'accepte', label: 'Acceptés', count: stats?.accepte, tone: 'ok' },
    { value: 'rembourse', label: 'Remboursés', count: stats?.rembourse, tone: 'teal' },
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

      <Overview label="Montant des retours" value={formatMontant(stats?.montant_total || 0)}
                note="Retours annulés exclus">
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
                      <ActionsMenu label={`Autres actions pour ${r.numero_retour}`} items={[
                        { label: 'Voir le détail', icon: Eye, onClick: () => handleView(r) },
                        { label: 'Annuler le retour', icon: Ban, danger: true, hidden: !canManage || r.statut === 'annule',
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
                <span className="vt-hint"><Info size={12} /> Au moins 2 caractères. Seules les ventes des 90 derniers jours peuvent être retournées.</span>

                {searchCommande.length >= 2 && resultatsRecherche.length === 0 && !isSearchingCommande && (
                  <Empty icon={SearchX} title="Aucune vente trouvée"
                         text="Vérifiez le numéro, ou cherchez avec le téléphone du client." />
                )}

                {resultatsRecherche.length > 0 && (
                  <div className="vt-pick-list">
                    {resultatsRecherche.map(c => (
                      <button key={c.id_commande} type="button" className="vt-pick" onClick={() => selectionnerCommande(c)}>
                        <span className="vt-pick-main">{c.numero_commande} · {c.nomclient || 'Client sans nom'}</span>
                        <span className="vt-pick-side vt-num vt-strong">{formatMontant(c.montant_total)}</span>
                        <span className="vt-cell-sub">{formatDateFR(c.date_commande)}{c.telephone ? ` · ${c.telephone}` : ''}</span>
                        <span className="vt-pick-side vt-cell-sub">{pluriel(parseInt(c.nb_lignes, 10) || 0, 'produit')}</span>
                      </button>
                    ))}
                  </div>
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
                  <h3 className="vt-section-title">Articles de la vente</h3>
                  {lignesCommande.length === 0 ? (
                    <Empty icon={Package} title="Aucun article à retourner" />
                  ) : (
                    <div className="rcl-lignes">
                      {lignesCommande.map((ligne, index) => {
                        if (ligne.quantite_retournable_base <= 0) {
                          return (
                            <div key={index} className="rcl-ligne" data-etat="vide">
                              <div className="rcl-ligne-nom">
                                <strong>{ligne.produit_nom}</strong>
                                <span className="vt-tag" data-s="muted">Déjà entièrement retourné</span>
                              </div>
                            </div>
                          );
                        }
                        const qteBase = parseFloat(ligne.quantite_retour_base) || 0;
                        const qte = qteBase;
                        const invalid = qteBase > ligne.quantite_retournable_base + 1e-9;
                        return (
                          <div key={index} className="rcl-ligne" data-etat={invalid ? 'erreur' : qte > 0 ? 'choisi' : ''}>
                            <div className="rcl-ligne-nom">
                              <strong>{ligne.produit_nom}</strong>
                              {ligne.marque_nom && <span className="vt-cell-sub">{ligne.marque_nom}</span>}
                            </div>

                            <div className="rcl-qtes">
                              <div><span className="vt-label">Acheté</span>
                                <QteAffichage qteBase={ligne.quantite_achetee_base} unitesVente={ligne.unites_disponibles} uniteBase={uniteBaseDe(ligne)} />
                              </div>
                              {ligne.quantite_deja_retournee_base > 0 && (
                                <div><span className="vt-label">Déjà retourné</span>
                                  <QteAffichage qteBase={ligne.quantite_deja_retournee_base} unitesVente={ligne.unites_disponibles} uniteBase={uniteBaseDe(ligne)} />
                                </div>
                              )}
                              <div><span className="vt-label">Peut revenir</span>
                                <QteAffichage qteBase={ligne.quantite_retournable_base} unitesVente={ligne.unites_disponibles} uniteBase={uniteBaseDe(ligne)} />
                              </div>
                            </div>

                            <div className="rcl-saisie">
                              <div className="vt-field rcl-qte">
                                <span className="vt-label">Quantité rapportée</span>
                                <StockInputWithSelector
                                  name={`rcl-q-${index}`}
                                  value={ligne.quantite_retour_base}
                                  onChange={(e) => updateLigne(index, 'quantite_retour_base', e.target.value)}
                                  unitesVente={(ligne.unites_disponibles || []).filter(u => !u.is_base)}
                                  uniteBase={uniteBaseDe(ligne)}
                                />
                              </div>
                              {qte > 0 && (
                                <div className="vt-field">
                                  <label htmlFor={`rcl-e-${index}`}>État de l'article</label>
                                  <select id={`rcl-e-${index}`} className="vt-input" value={ligne.etat_produit}
                                          onChange={(e) => updateLigne(index, 'etat_produit', e.target.value)}>
                                    {ETATS_PRODUIT.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                                  </select>
                                </div>
                              )}
                            </div>

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

                <div className="vt-grid-2">
                  <div className="vt-field">
                    <label htmlFor="rcl-motif">Motif du retour</label>
                    <select id="rcl-motif" className="vt-input" value={motifRetour} onChange={(e) => setMotifRetour(e.target.value)}>
                      {MOTIFS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="vt-field">
                    <label htmlFor="rcl-resol">Ce que reçoit le client</label>
                    <select id="rcl-resol" className="vt-input" value={typeResolution} onChange={(e) => setTypeResolution(e.target.value)}>
                      {RESOLUTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="vt-field">
                  <label htmlFor="rcl-notes">Note (facultatif)</label>
                  <textarea id="rcl-notes" className="vt-input" rows="2" maxLength={500} placeholder="Commentaire interne"
                            value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>

                <div className="vt-due rcl-total">
                  <span className="vt-due-label">
                    {typeResolution === 'remboursement_especes' ? 'À rendre au client (espèces)' : 'Valeur des articles rapportés'}
                  </span>
                  <strong className="vt-due-amount vt-num">{formatMontant(totalRemboursement)}</strong>
                </div>
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
                    {saving ? 'Enregistrement' : `Valider le retour${lignesValides.length ? ` (${pluriel(lignesValides.length, 'article')})` : ''}`}
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
            <KV items={[
              ['Client', selectedRetour.nomclient || '-'],
              ["Vente d'origine", selectedRetour.numero_commande || '-'],
              ['Motif', MOTIFS.find(m => m.value === selectedRetour.motif_retour)?.label || '-'],
              ['Résolution', RESOLUTIONS.find(r => r.value === selectedRetour.type_resolution)?.label || '-'],
              selectedRetour.notes ? ['Note', selectedRetour.notes] : null,
              ['Montant', formatMontant(selectedRetour.montant_total), true],
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
            {canManage && selectedRetour.statut !== 'annule' && (
              <button type="button" className="vt-btn vt-btn--danger"
                      onClick={() => { setShowDetailModal(false); setAAnnuler(selectedRetour); }}>
                <Ban size={16} /> Annuler le retour
              </button>
            )}
            <button type="button" className="vt-btn" onClick={() => setShowDetailModal(false)}>Fermer</button>
          </div>
        </Modal>
      )}

      {aAnnuler && (
        <Confirm title="Annuler ce retour ?" danger busy={annulant} confirmLabel={annulant ? 'Annulation' : 'Annuler le retour'}
                 cancelLabel="Garder le retour" onConfirm={handleAnnuler} onClose={() => !annulant && setAAnnuler(null)}>
          <p>Le retour <strong>{aAnnuler.numero_retour}</strong> de <strong>{aAnnuler.nomclient || 'client sans nom'}</strong> sera annulé : les articles ressortent du stock.</p>
          <p className="vt-danger-warn">Cette action est irréversible.</p>
        </Confirm>
      )}

      <Toast toast={toast} onClose={closeToast} />
    </Page>
  );
};

export default RetoursClients;
