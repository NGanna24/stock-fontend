// pages/RetoursFournisseurs/RetoursFournisseurs.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, Eye, Download, Check, RefreshCw, CheckCircle, Ban, Trash2, Send,
  CheckCheck, RotateCcw, Info, Warehouse, Store, Loader, SearchX,
} from "lucide-react";
import RetourFournisseurService from "../../services/retourFournisseur/retourFournisseurService";
import FournisseurService from "../../services/fournisseurService";
import CommandeAchatService from "../../services/commandeAchatService";
import MagasinService from "../../services/magasinService";
import { useUser } from "../../context/AuthContext";
import {
  Page, PageHead, Overview, Stage, SearchBox, Badge, ErrorBar, Empty, SkeletonRows, Pager,
  usePagination, useToast, Toast, Modal, ModalHead, Confirm, ActionsMenu, KV, fcfa, nombre, dateFR, sansAccents, pluriel,
} from "../../components/UI/Vt";
import "./RetoursFournisseurs.css";
import RetourPDFActions from "../../components/RetourFournisseur/RetourPDFActions";

// ============================================================
// HELPERS
// ============================================================
const formatMontant = fcfa;

const MOTIFS = [
  { value: 'defectueux',   label: 'Défectueux' },
  { value: 'non_conforme', label: 'Non conforme' },
  { value: 'surplus',      label: 'Surplus' },
  { value: 'perime',       label: 'Périmé' },
  { value: 'autre',        label: 'Autre' },
];

const STATUTS_RF = {
  en_attente:           { label: 'En attente', tone: 'muted' },
  envoye:               { label: 'Envoyé', tone: 'info' },
  recu_par_fournisseur: { label: 'Reçu par le fournisseur', tone: 'teal' },
  traite:               { label: 'Traité', tone: 'ok' },
  annule:               { label: 'Annulé', tone: 'bad' },
};
const StatutRF = ({ statut }) => {
  const c = STATUTS_RF[statut] || STATUTS_RF.en_attente;
  return <Badge tone={c.tone}>{c.label}</Badge>;
};
const ETATS = { neuf: 'Neuf', usage: 'Usagé', endommage: 'Endommagé', incomplet: 'Incomplet' };

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
  // Origine : "magasin" ou "e:<id_entrepot>" (entrepôts dont le compte est propriétaire)
  const [destinations, setDestinations] = useState([]);
  const [scopeKey, setScopeKey] = useState("magasin");
  const scopeParams = useMemo(
    () => (scopeKey.startsWith("e:")
      ? { destination: "entrepot", id_entrepot: Number(scopeKey.slice(2)) }
      : { destination: "magasin" }),
    [scopeKey]
  );
  const isEntrepot = scopeParams.destination === "entrepot";
  const currentEntrepot = isEntrepot
    ? destinations.find((d) => d.id_entrepot === scopeParams.id_entrepot)
    : null;
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [toast, showToast, closeToast] = useToast();
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
  const [aAnnuler, setAAnnuler] = useState(null);

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
      (async () => {
        try {
          const r = await CommandeAchatService.getDestinations(token);
          if (r.success) {
            const liste = r.data || [];
            setDestinations(liste);
            // Propriétaire d'un entrepôt : on ouvre sur l'entrepôt
            if (liste.length > 0) setScopeKey(`e:${liste[0].id_entrepot}`);
          }
        } catch (e) { console.error('❌ LoadDestinations error:', e); }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  // Changement d'onglet : on recharge les retours
  const premierRendu = useRef(true);
  useEffect(() => {
    if (premierRendu.current) { premierRendu.current = false; return; }
    if (!(isAuthenticated && token)) return;
    loadRetours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

  const loadRetours = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await RetourFournisseurService.getAllRetours(token, scopeParams);
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
        const res = isEntrepot
          ? await RetourFournisseurService.getProduitsRecusEntrepot(
              token, formData.id_fournisseur, scopeParams.id_entrepot
            )
          : await FournisseurService.getProduitsRecus(token, formData.id_fournisseur);

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
  }, [formData.id_fournisseur, showModal, token, scopeKey]);

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
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.id_fournisseur) {
      setFormError("Veuillez sélectionner un fournisseur");
      return;
    }
    if (!formData.motif_retour) {
      setFormError("Veuillez sélectionner un motif");
      return;
    }
    if (lignesSelectionnees.length === 0) {
      setFormError("Veuillez sélectionner au moins un produit");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const data = {
        id_fournisseur: parseInt(formData.id_fournisseur),
        date_retour: formData.date_retour,
        motif_retour: formData.motif_retour,
        notes: formData.notes || null,
        ...scopeParams,
        lignes: lignesSelectionnees.map(l => ({
          ...(isEntrepot
            ? { id_produit_entrepot: l.produit.id_produit }
            : { id_produit: l.produit.id_produit }),
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
        showToast(response.data?.numero_retour ? `Retour ${response.data.numero_retour} créé` : 'Retour créé', 'success');
      } else {
        setFormError(response.message || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      console.error('❌ Save error:', err);
      setFormError(err.message || 'Erreur lors de la sauvegarde');
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
          magasin: response.data.destination === 'entrepot'
            ? { ...(magasin || {}), nom: response.data.entrepot_nom, ville: response.data.entrepot_ville }
            : magasin,  // ← injecté pour le PDF
        });
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('❌ View error:', err);
      showToast(err.message || 'Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatut = async (id, statut) => {
    if (updatingStatut === id) return;
    setUpdatingStatut(id);
    try {
      const response = await RetourFournisseurService.updateStatut(token, id, statut);
      if (response.success) {
        await loadRetours();
        showToast(`Statut mis à jour : ${STATUTS_RF[statut]?.label || statut}`, 'success');
      } else showToast(response.message || 'Erreur', 'error');
    } catch (err) {
      console.error('❌ Statut error:', err);
      showToast(err.message || 'Erreur', 'error');
    } finally {
      setUpdatingStatut(null);
    }
  };

  const handleAnnuler = async () => {
    const id = aAnnuler?.id_retour;
    if (!id) return;
    setUpdatingStatut(id);
    try {
      const response = await RetourFournisseurService.annulerRetour(token, id);
      if (response.success) {
        await loadRetours();
        showToast(`Retour ${aAnnuler.numero_retour} annulé`, 'success');
        setAAnnuler(null);
      } else showToast(response.message || 'Erreur', 'error');
    } catch (err) {
      console.error('❌ Annuler error:', err);
      showToast(err.message || 'Erreur', 'error');
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
        showToast(`Retour ${retourToDelete.numero_retour} supprimé`, 'success');
        setRetourToDelete(null);
      } else showToast(response.message || 'Erreur', 'error');
    } catch (err) {
      console.error('❌ Delete error:', err);
      showToast(err.message || 'Erreur', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await RetourFournisseurService.exportRetours(token, scopeParams);
      if (response.success && response.data) {
        const headers = ["ID", "Numéro", "Date", "Fournisseur", "Motif", "Montant", "Statut"];
        const rows = response.data.map(r => [
          r.id, r.numero, r.date, r.fournisseur, r.motif,
          formatMontant(r.montant), r.statut
        ]);
        const cell = (c) => `"${String(c ?? '').replace(/\u00A0/g, ' ').replace(/"/g, '""')}"`;
        let csv = headers.map(cell).join(";") + "\n";
        rows.forEach(row => { csv += row.map(cell).join(";") + "\n"; });
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `retours_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('❌ Export error:', err);
      showToast("Erreur lors de l'export", 'error');
    }
  };

  // ============================================================
  // STATS + FILTRES + PAGINATION
  // ============================================================
  const stats = useMemo(() => {
    const compte = (st) => retours.filter(r => r.statut === st).length;
    return {
      total: retours.length,
      en_attente: compte('en_attente'),
      envoye: compte('envoye'),
      recu_par_fournisseur: compte('recu_par_fournisseur'),
      traite: compte('traite'),
      annule: compte('annule'),
      // Les retours annulés ne partent pas chez le fournisseur
      totalMontant: retours.filter(r => r.statut !== 'annule')
        .reduce((s, r) => s + (parseFloat(r.montant_total) || 0), 0),
    };
  }, [retours]);

  const filteredRetours = useMemo(() => {
    const q = sansAccents(searchTerm.trim());
    return retours.filter(r => {
      const matchSearch = !q || [r.numero_retour, r.fournisseur_nom].some(f => sansAccents(f).includes(q));
      const matchStatut = filterStatut ? r.statut === filterStatut : true;
      const matchMotif = filterMotif ? r.motif_retour === filterMotif : true;
      return matchSearch && matchStatut && matchMotif;
    });
  }, [retours, searchTerm, filterStatut, filterMotif]);

  const { page, nbPages, setPage, numeros, visibles: currentItems } =
    usePagination(filteredRetours, 10, [searchTerm, filterStatut, filterMotif, scopeKey]);

  const getMotifLabel = (m) => MOTIFS.find(x => x.value === m)?.label || m || '-';

  const FILTRES = [
    { value: '', label: 'Tous les retours', count: stats.total, tone: 'all' },
    { value: 'en_attente', label: 'En attente', count: stats.en_attente, tone: 'muted' },
    { value: 'envoye', label: 'Envoyés', count: stats.envoye, tone: 'info' },
    { value: 'recu_par_fournisseur', label: 'Reçus', count: stats.recu_par_fournisseur, tone: 'teal' },
    { value: 'traite', label: 'Traités', count: stats.traite, tone: 'ok' },
    { value: 'annule', label: 'Annulés', count: stats.annule, tone: 'bad', apart: true },
  ];

  const actionsDe = (r) => {
    const occupe = updatingStatut === r.id_retour;
    return [
      { label: 'Voir le détail', icon: Eye, onClick: () => handleView(r) },
      { label: 'Envoyer au fournisseur', icon: Send, disabled: occupe,
        hidden: !canManage || r.statut !== 'en_attente', onClick: () => handleChangeStatut(r.id_retour, 'envoye') },
      { label: 'Reçu par le fournisseur', icon: CheckCircle, disabled: occupe,
        hidden: !canManage || r.statut !== 'envoye', onClick: () => handleChangeStatut(r.id_retour, 'recu_par_fournisseur') },
      { label: 'Marquer traité', icon: CheckCheck, disabled: occupe,
        hidden: !canManage || r.statut !== 'recu_par_fournisseur', onClick: () => handleChangeStatut(r.id_retour, 'traite') },
      { label: 'Annuler le retour', icon: Ban, danger: true, disabled: occupe,
        hidden: !canManage || !['en_attente', 'envoye'].includes(r.statut), onClick: () => setAAnnuler(r) },
      { label: 'Supprimer', icon: Trash2, danger: true,
        hidden: !canManage || r.statut !== 'en_attente', onClick: () => confirmDelete(r) },
    ];
  };

  const formulaireValide = formData.id_fournisseur && formData.motif_retour && lignesSelectionnees.length > 0;

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <Page className="rfo">
      <PageHead title="Retours fournisseurs"
                sub={`${isEntrepot ? `Entrepôt ${currentEntrepot?.nom || ''} · ` : ''}La marchandise que vous renvoyez à vos fournisseurs`}>
        <button type="button" className="vt-btn vt-btn--icon" onClick={loadRetours} disabled={loading}
                aria-label="Rafraîchir" title="Rafraîchir">
          <RefreshCw size={16} className={loading ? 'vt-spin' : ''} />
        </button>
        <button type="button" className="vt-btn" onClick={handleExport}>
          <Download size={16} /> Exporter
        </button>
        {canManage && (
          <button type="button" className="vt-btn vt-btn--primary" onClick={handleAdd}>
            <Plus size={16} /> Nouveau retour
          </button>
        )}
      </PageHead>

      {destinations.length > 0 && (
        <div className="vt-seg rfo-scope" role="group" aria-label="Origine des retours">
          <button type="button" aria-pressed={!isEntrepot} onClick={() => setScopeKey('magasin')}>
            <Store size={15} /> Magasin
          </button>
          {destinations.map((d) => (
            <button key={d.id_entrepot} type="button" aria-pressed={scopeKey === `e:${d.id_entrepot}`}
                    onClick={() => setScopeKey(`e:${d.id_entrepot}`)}>
              <Warehouse size={15} /> {d.nom}{d.ville ? <small> · {d.ville}</small> : null}
            </button>
          ))}
        </div>
      )}

      <Overview label="Valeur renvoyée" value={formatMontant(stats.totalMontant)} note="Retours annulés exclus">
        {FILTRES.map(f => (
          <Stage key={f.value || 'tous'} count={f.count} label={f.label} tone={f.tone} apart={f.apart}
                 pressed={filterStatut === f.value}
                 onClick={() => setFilterStatut(filterStatut === f.value ? '' : f.value)} />
        ))}
      </Overview>

      <div className="vt-toolbar">
        <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="N° de retour ou fournisseur"
                   label="Rechercher un retour" />
        <select className="vt-input rfo-motif" value={filterMotif} onChange={(e) => setFilterMotif(e.target.value)}
                aria-label="Filtrer par motif">
          <option value="">Tous les motifs</option>
          {MOTIFS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <span className="vt-count">{pluriel(filteredRetours.length, 'retour')}</span>
      </div>

      {error && !loading && <ErrorBar message={error} onRetry={loadRetours} />}

      <div className="vt-table-wrap" aria-busy={loading || undefined}>
        {loading && retours.length > 0 && <div className="vt-busybar" />}
        <table className="vt-table rfo-table">
          <thead>
            <tr>
              <th>Retour</th>
              <th>Fournisseur</th>
              <th className="rfo-hide">Motif</th>
              <th className="vt-th-right">Montant</th>
              <th>Statut</th>
              <th className="vt-th-right">Actions</th>
            </tr>
          </thead>
          <tbody style={numeros}>
            {loading && retours.length === 0
              ? <SkeletonRows cols={6} widths={[60, 60, 45, 45, 45, 30]} />
              : currentItems.map((r) => (
                <tr key={r.id_retour}>
                  <td>
                    <button type="button" className="vt-link vt-cell-main" onClick={() => handleView(r)}>{r.numero_retour}</button>
                    <div className="vt-cell-sub">{dateFR(r.date_retour)}</div>
                  </td>
                  <td><div className="vt-cell-main vt-cell-main--plain">{r.fournisseur_nom || '-'}</div></td>
                  <td className="rfo-hide">{getMotifLabel(r.motif_retour)}</td>
                  <td className="vt-td-right"><span className="vt-num vt-strong">{formatMontant(r.montant_total)}</span></td>
                  <td>
                    {updatingStatut === r.id_retour
                      ? <span className="vt-muted"><Loader size={13} className="vt-spin" /> Mise à jour</span>
                      : <StatutRF statut={r.statut} />}
                  </td>
                  <td className="vt-td-right">
                    <div className="vt-actions">
                      <button type="button" className="vt-iconbtn vt-iconbtn--sm" onClick={() => handleView(r)}
                              aria-label={`Voir le retour ${r.numero_retour}`} title="Voir le détail"><Eye size={15} /></button>
                      <ActionsMenu label={`Autres actions pour ${r.numero_retour}`} items={actionsDe(r)} width={220} />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!loading && currentItems.length === 0 && (
          retours.length === 0 ? (
            <Empty icon={RotateCcw} title="Aucun retour fournisseur"
                   text="Renvoyez à un fournisseur la marchandise défectueuse, périmée ou en trop : elle sort du stock.">
              {canManage && (
                <button type="button" className="vt-btn vt-btn--primary vt-btn--sm" onClick={handleAdd}>
                  <Plus size={14} /> Nouveau retour
                </button>
              )}
            </Empty>
          ) : (
            <Empty icon={SearchX} title="Aucun retour ne correspond" text="Modifiez la recherche ou les filtres." />
          )
        )}
      </div>

      <Pager page={page} nbPages={nbPages} total={filteredRetours.length} unite="retour" onChange={setPage} />

      {/* ========== NOUVEAU RETOUR ========== */}
      {showModal && (
        <Modal size="lg" busy={saving} labelledBy="rfo-new-title" dismissable={!saving} onClose={() => setShowModal(false)}>
          <ModalHead id="rfo-new-title" title="Nouveau retour fournisseur"
                     sub={isEntrepot ? `Depuis l'entrepôt ${currentEntrepot?.nom || ''}` : 'Depuis le magasin'}
                     onClose={() => setShowModal(false)} disabled={saving} />
          <div className="vt-modal-body">
            {formError && <ErrorBar message={formError} />}
            <div className="vt-stack">
              <div className="vt-grid-2">
                <div className="vt-field">
                  <label htmlFor="rfo-four">Fournisseur</label>
                  <select id="rfo-four" className="vt-input" value={formData.id_fournisseur}
                          onChange={(e) => { setFormError(null); setFormData({ ...formData, id_fournisseur: e.target.value }); }}>
                    <option value="">Choisir un fournisseur</option>
                    {fournisseurs.map(f => <option key={f.id_fournisseur} value={f.id_fournisseur}>{f.nom}</option>)}
                  </select>
                </div>
                <div className="vt-field">
                  <label htmlFor="rfo-date">Date du retour</label>
                  <input id="rfo-date" type="date" className="vt-input" value={formData.date_retour}
                         onChange={(e) => setFormData({ ...formData, date_retour: e.target.value })} />
                </div>
              </div>

              {formData.id_fournisseur && (
                <div>
                  <div className="rfo-sec-head">
                    <h3 className="vt-section-title">Produits reçus de ce fournisseur</h3>
                    {produitsRecus.length > 0 && (
                      <div className="rfo-sec-actions">
                        <button type="button" className="vt-link" onClick={selectionnerTout}>Tout cocher</button>
                        <button type="button" className="vt-link" onClick={deselectionnerTout}>Tout décocher</button>
                      </div>
                    )}
                  </div>

                  {loadingProduits ? (
                    <div className="rfo-loading"><Loader size={16} className="vt-spin" /> Chargement des produits…</div>
                  ) : produitsRecus.length === 0 ? (
                    <div className="vt-banner"><Info size={15} />
                      <span>Aucun produit reçu de ce fournisseur. On ne peut renvoyer que ce qu'il vous a livré.</span>
                    </div>
                  ) : (
                    <div className="rfo-produits">
                      <table className="vt-mini-table">
                        <thead>
                          <tr>
                            <th aria-label="Choisir" />
                            <th>Produit</th>
                            <th className="vt-right rfo-hide-sm">En stock</th>
                            <th className="vt-right rfo-hide-sm">Reçu</th>
                            <th className="vt-right">Max.</th>
                            <th className="vt-right">À renvoyer</th>
                            <th className="vt-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {produitsRecus.map(p => {
                            const sel = selection[p.id_produit] || {};
                            const qte = sel.quantite || 0;
                            return (
                              <tr key={p.id_produit} className={sel.selected ? 'rfo-sel' : ''}>
                                <td>
                                  <input type="checkbox" className="rfo-check" checked={!!sel.selected}
                                         onChange={() => toggleProduit(p.id_produit)} aria-label={`Renvoyer ${p.nom}`} />
                                </td>
                                <td>
                                  <strong>{p.nom}</strong>
                                  {p.unite_symbole && <span className="vt-muted"> · {p.unite_symbole}</span>}
                                  {p.quantite_deja_retournee > 0 && (
                                    <div className="vt-cell-sub">Déjà renvoyé : {p.quantite_deja_retournee}</div>
                                  )}
                                </td>
                                <td className="vt-right vt-num rfo-hide-sm">{p.quantite_stock}</td>
                                <td className="vt-right vt-num rfo-hide-sm">{p.quantite_recue}</td>
                                <td className="vt-right vt-num vt-strong">{p.quantite_max_retournable}</td>
                                <td className="vt-right">
                                  <input type="number" className="vt-input vt-num rfo-qte" value={qte} min="1"
                                         max={p.quantite_max_retournable} readOnly={!sel.selected}
                                         aria-label={`Quantité de ${p.nom}`}
                                         onChange={(e) => updateQuantite(p.id_produit, e.target.value, p.quantite_max_retournable)} />
                                </td>
                                <td className="vt-right vt-num">{sel.selected ? formatMontant(qte * p.prix_achat) : '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {lignesSelectionnees.length > 0 && (
                <>
                  <div className="vt-grid-2">
                    <div className="vt-field">
                      <label htmlFor="rfo-motif">Motif</label>
                      <select id="rfo-motif" className="vt-input" value={formData.motif_retour}
                              onChange={(e) => { setFormError(null); setFormData({ ...formData, motif_retour: e.target.value }); }}>
                        <option value="">Choisir un motif</option>
                        {MOTIFS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                    <div className="vt-field">
                      <label htmlFor="rfo-notes">Note (facultatif)</label>
                      <input id="rfo-notes" type="text" className="vt-input" placeholder="Ex. lot n°, bon de transport"
                             value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                    </div>
                  </div>
                  <div className="vt-due">
                    <span className="vt-due-label">{pluriel(totalSelectionne.nbProduits, 'produit')} à renvoyer</span>
                    <strong className="vt-due-amount vt-num">{formatMontant(totalSelectionne.montant)}</strong>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="vt-modal-foot vt-modal-foot--end">
            <button type="button" className="vt-btn" onClick={() => setShowModal(false)} disabled={saving}>Fermer</button>
            <button type="button" className="vt-btn vt-btn--primary" onClick={handleSave} disabled={saving || !formulaireValide}>
              {saving ? <Loader size={16} className="vt-spin" /> : <Check size={16} />}
              {saving ? 'Enregistrement' : 'Créer le retour'}
            </button>
          </div>
        </Modal>
      )}

      {/* ========== DÉTAIL ========== */}
      {showDetailModal && selectedRetour && (
        <Modal size="lg" labelledBy="rfo-det-title" onClose={() => setShowDetailModal(false)}>
          <ModalHead id="rfo-det-title" title={`Retour ${selectedRetour.numero_retour}`}
                     sub={`${dateFR(selectedRetour.date_retour)} · ${getMotifLabel(selectedRetour.motif_retour)}`}
                     onClose={() => setShowDetailModal(false)}>
            <StatutRF statut={selectedRetour.statut} />
          </ModalHead>
          <div className="vt-modal-body">
            <div className="vt-det-grid">
              <div>
                <h3 className="vt-section-title">Fournisseur</h3>
                <KV items={[
                  ['Nom', selectedRetour.fournisseur_nom || '-'],
                  ['Téléphone', selectedRetour.fournisseur_telephone || '-'],
                  ['E-mail', selectedRetour.fournisseur_email || '-'],
                ]} />
              </div>
              <div>
                <h3 className="vt-section-title">Retour</h3>
                <KV items={[
                  ['Commande', selectedRetour.numero_commande || '-'],
                  ['Réception', selectedRetour.numero_reception || '-'],
                  ['Montant', formatMontant(selectedRetour.montant_total), true],
                ]} />
              </div>
            </div>
            {selectedRetour.lignes?.length > 0 && (
              <div className="vt-det-block">
                <h3 className="vt-section-title">Produits renvoyés</h3>
                <table className="vt-mini-table">
                  <thead>
                    <tr><th>Produit</th><th className="vt-right">Quantité</th><th className="vt-right">Prix unit.</th>
                      <th className="vt-right">Total</th><th className="rfo-hide-sm">État</th></tr>
                  </thead>
                  <tbody>
                    {selectedRetour.lignes.map((l, i) => (
                      <tr key={i}>
                        <td>{l.produit_nom}</td>
                        <td className="vt-right vt-num">{nombre(l.quantite)} {l.unite_symbole || ''}</td>
                        <td className="vt-right vt-num">{formatMontant(l.prix_achat)}</td>
                        <td className="vt-right vt-num">{formatMontant(l.montant_total || (l.quantite * l.prix_achat))}</td>
                        <td className="rfo-hide-sm">{ETATS[l.etat_produit] || 'Neuf'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="vt-modal-foot">
            <div className="rfo-pdf"><RetourPDFActions retourData={selectedRetour} onClose={() => setShowDetailModal(false)} /></div>
            <button type="button" className="vt-btn" onClick={() => setShowDetailModal(false)}>Fermer</button>
          </div>
        </Modal>
      )}

      {aAnnuler && (
        <Confirm title="Annuler ce retour ?" danger busy={updatingStatut === aAnnuler.id_retour}
                 confirmLabel="Annuler le retour" cancelLabel="Garder le retour"
                 onConfirm={handleAnnuler} onClose={() => setAAnnuler(null)}>
          <p>Le retour <strong>{aAnnuler.numero_retour}</strong> vers <strong>{aAnnuler.fournisseur_nom || 'ce fournisseur'}</strong> sera annulé : la marchandise revient dans votre stock.</p>
        </Confirm>
      )}

      {showDeleteModal && retourToDelete && (
        <Confirm title="Supprimer ce retour ?" danger busy={deleting} confirmLabel={deleting ? 'Suppression' : 'Supprimer'}
                 cancelLabel="Garder" onConfirm={handleDelete} onClose={() => !deleting && setShowDeleteModal(false)}>
          <p>Le retour <strong>{retourToDelete.numero_retour}</strong> sera supprimé et la marchandise reviendra dans votre stock.</p>
          <p className="vt-danger-warn">Cette action est irréversible.</p>
        </Confirm>
      )}

      <Toast toast={toast} onClose={closeToast} />
    </Page>
  );
};

export default RetoursFournisseurs;
