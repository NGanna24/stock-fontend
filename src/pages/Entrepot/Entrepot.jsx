// pages/Entrepot/Entrepot.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Warehouse, Plus, AlertCircle, CheckCircle, Loader, X,
    Info, Banknote, Layers, Box, Trash2, Save, ChevronRight,
    Tag, Building, MapPin, Search, Package, AlertTriangle,
    XCircle, RefreshCw, Edit, Send, LogIn, Copy,
    ArrowDown, ArrowUp, ChevronLeft, Crown, Users, ClipboardCheck, Settings,
    MoreHorizontal,
} from 'lucide-react';
import EntrepotService from '../../services/entrepotService';
import ProduitEntrepotService from '../../services/produitEntrepotService';
import CategorieService from '../../services/categorieService';
import MarqueService from '../../services/marqueService';
import ModeleService from '../../services/modeleService';
import UniteService from '../../services/uniteService';
import FournisseurService from '../../services/fournisseurService';
import SelectSearch from '../../components/SelectSearch/SelectSearch';
import StockInputWithSelector from '../../components/StockSelector/StockInputWithSelector';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import ModalTransfert from '../../components/Transfert/ModalTransfert';
import ModalTransfertLot from '../../components/Transfert/ModalTransfertLot';
import TransfertsEntrepot from '../../components/Transfert/TransfertsEntrepot';
import ApercuEntrepot from '../../components/Entrepot/ApercuEntrepot';
import MouvementsEntrepot from '../../components/Entrepot/MouvementsEntrepot';
import InventaireEntrepot from '../../components/Entrepot/InventaireEntrepot';
import TransfertStockService from '../../services/transfertStockService';
import ModalRejoindre from '../../components/Entrepot/ModalRejoindre';
import { useUser } from '../../context/AuthContext';
import ChoixEmplacement from '../../components/Emplacement/ChoixEmplacement';
import { GestionEmplacements } from '../Emplacements/Emplacements';
import '../Ventes/Ventes.css';
import '../Emplacements/Emplacements.css';
import { useDisableNumberScroll } from '../../hooks/useDisableNumberScroll';
import { createPortal } from 'react-dom';
import './Entrepot.css';
import './EntrepotPro.css';

/* ============================================================
   Helpers
   ============================================================ */
const INITIAL_FORM_DATA = {
    nom: "", description: "", id_fournisseur: "", id_categorie: "", id_marque: "",
    id_modele: "", id_unite: "", prix_achat: "", prix_vente: "",
    quantite_stock: "", quantite_minimale: "", quantite_maximale: "",
    emplacement: "", rayon: "", etagere: "",
    id_emplacement: "", emplacement_change: false,
};

const num = (v) => Number(v || 0);

/**
 * Quantité (en unité de base) exprimée en unités de vente :
 * 30 bidons avec un carton de 12 => "2 Carton + 6 Bidon".
 * Les unités sont utilisées de la plus grande à la plus petite ; le reste reste en unité de base.
 */
function decomposerQuantite(produit, quantiteBase) {
    const total = num(quantiteBase);
    const nomBase = produit.unite_nom || 'Unité';
    const unites = (produit.unites_vente || [])
        .filter((u) => num(u.quantite_base) > 1)
        .sort((a, b) => num(b.quantite_base) - num(a.quantite_base));

    let reste = Math.round(total * 100) / 100;
    const parts = [];
    for (const u of unites) {
        const qb = num(u.quantite_base);
        const n = Math.floor(reste / qb + 1e-9);
        if (n > 0) {
            parts.push(`${n.toLocaleString('fr-FR')} ${u.nom}`);
            reste = Math.round((reste - n * qb) * 100) / 100;
        }
    }
    if (reste > 0 || parts.length === 0) {
        parts.push(`${reste.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${nomBase}`);
    }
    return { texte: parts.join(' + '), enUnitesDeVente: unites.length > 0 };
}
const formatPrice = (value) =>
    num(value).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Un produit d'entrepôt n'a qu'un seul identifiant valide : id_produit_entrepot */
const getPid = (p) => p?.id_produit_entrepot;

/** Détermine l'état du stock d'un produit */
function stockState(p) {
    const stock = num(p.quantite_stock);
    const min = num(p.quantite_minimale);
    const max = num(p.quantite_maximale);
    if (stock <= 0) return { key: 'out', label: 'Rupture', icon: XCircle };
    if (min > 0 && stock <= min) return { key: 'low', label: 'Stock bas', icon: AlertTriangle };
    if (max > 0 && stock >= max) return { key: 'high', label: 'Stock haut', icon: CheckCircle };
    return { key: 'ok', label: 'Disponible', icon: CheckCircle };
}

/** Barre de niveau de stock (alignée sur la page Produits) */
function LevelBar({ produit }) {
    const stock = num(produit.quantite_stock);
    const min = num(produit.quantite_minimale);
    const max = num(produit.quantite_maximale);
    const ref = max > 0 ? max : min > 0 ? min * 3 : 0;
    if (!ref) return null;
    const pct = Math.max(0, Math.min(100, (stock / ref) * 100));
    const minPct = min > 0 ? Math.min(100, (min / ref) * 100) : null;
    const tone = stock <= 0 ? 'out' : (min > 0 && stock <= min) ? 'low' : 'ok';
    return (
        <div
            className={`ep-level ep-level--${tone}`}
            title="Niveau de stock (le repère marque le seuil minimum)"
        >
            <i style={{ width: `${pct}%` }} />
            {minPct !== null && <b style={{ left: `${minPct}%` }} />}
        </div>
    );
}

/** Unités de vente d'un produit, de la plus grande à la plus petite */
function unitesTriees(p) {
    return [...(p.unites_vente || [])].sort((a, b) => num(b.quantite_base) - num(a.quantite_base));
}

/** Unité de vente principale (sinon la première) */
function unitePrincipale(p) {
    const l = unitesTriees(p);
    return l.find((u) => u.est_principal) || l[l.length - 1] || null;
}

/** Prix de vente / d'achat exprimés dans l'unité de vente principale */
function prixPrincipal(p) {
    const u = unitePrincipale(p);
    if (!u) return { nom: p.unite_nom || 'Unité', vente: num(p.prix_vente), achat: num(p.prix_achat) };
    const qb = num(u.quantite_base) || 1;
    return {
        nom: u.nom,
        vente: num(u.prix_vente) || num(p.prix_vente) * qb,
        achat: num(u.prix_achat) || num(p.prix_achat) * qb,
    };
}

/** Quantité en unités de vente, sous forme de parties [{n, nom}] pour l'affichage en gros chiffres */
function partiesQuantite(produit, quantiteBase) {
    const total = num(quantiteBase);
    const nomBase = produit.unite_nom || 'Unité';
    const unites = unitesTriees(produit).filter((u) => num(u.quantite_base) > 1);
    if (total <= 0) return [{ n: 0, nom: unitePrincipale(produit)?.nom || nomBase }];
    let reste = Math.round(total * 100) / 100;
    const parts = [];
    for (const u of unites) {
        const qb = num(u.quantite_base);
        const n = Math.floor(reste / qb + 1e-9);
        if (n > 0) {
            parts.push({ n, nom: u.nom });
            reste = Math.round((reste - n * qb) * 100) / 100;
        }
    }
    if (reste > 0 || parts.length === 0) parts.push({ n: reste, nom: nomBase });
    return parts;
}

/** Initiales de la plaque d'un emplacement ("Zone A" -> "ZA", "Quai" -> "QU") */
function initialesZone(nom) {
    const mots = String(nom).trim().split(/\s+/).filter(Boolean);
    if (mots.length >= 2) return (mots[0][0] + mots[1][0]).toUpperCase();
    return String(nom).trim().slice(0, 2).toUpperCase();
}

/** Adresse de rangement façon entrepôt : emplacement | rayon | étagère */
function EmplacementTag({ p, sansZone }) {
    const segs = [
        !sansZone && p.emplacement && { k: 'Emplacement', v: p.emplacement },
        p.rayon && { k: 'Rayon', v: p.rayon },
        p.etagere && { k: 'Étagère', v: p.etagere },
    ].filter(Boolean);
    if (segs.length === 0) return <span className="ep2-muted">Non rangé</span>;
    return (
        <span className="ep2-addr">
            {segs.map((s) => (
                <span key={s.k} className="ep2-addr-seg" title={s.k}><i>{s.k.slice(0, 1)}</i>{s.v}</span>
            ))}
        </span>
    );
}

/** Emplacement en texte : « Zone Nord › Allée 2 › Niveau 1 » (sans la zone si elle est déjà choisie) */
function EmplacementTexte({ p, sansZone }) {
    const segs = [!sansZone && p.emplacement, p.rayon, p.etagere].filter(Boolean);
    if (segs.length === 0) return <span className="ex-nonrange">Non rangé</span>;
    return <span className="ex-chemin">{segs.join(' › ')}</span>;
}

/* ============================================================
   Toast
   ============================================================ */
function Toast({ toast }) {
    if (!toast) return null;
    return (
        <div className={`ep-toast ep-toast--${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{toast.message}</span>
        </div>
    );
}

/* ============================================================
   Modal générique
   ============================================================ */
function Modal({ title, subtitle, onClose, children, footer, wide = false }) {
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return createPortal(
        <div className="ep-modal-overlay" onMouseDown={onClose}>
            <div
                className={`ep-modal ${wide ? 'ep-modal--wide' : ''}`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <header className="ep-modal-head">
                    <div>
                        <h3>{title}</h3>
                        {subtitle && <p className="ep-modal-sub">{subtitle}</p>}
                    </div>
                    <button className="ep-modal-close" onClick={onClose} aria-label="Fermer">
                        <X size={18} />
                    </button>
                </header>
                <div className="ep-modal-body">{children}</div>
                {footer && <footer className="ep-modal-foot">{footer}</footer>}
            </div>
        </div>,
        document.body
    );
}

/* ============================================================
   Modal : création d'entrepôt
   ============================================================ */
function ModalCreate({ token, onClose, onCreated, onError }) {
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const nom = (fd.get('nom') || '').trim();
        const ville = (fd.get('ville') || '').trim();

        if (!nom) {
            onError?.("Le nom de l'entrepôt est requis");
            return;
        }

        setBusy(true);
        try {
            await EntrepotService.create(token, { nom, ville });
            onCreated?.();
        } catch (err) {
            console.error('❌ Erreur création entrepôt:', err);
            onError?.(err.message || 'Erreur lors de la création');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal onClose={onClose} title="Créer un entrepôt">
            <form className="ep-form" onSubmit={handleSubmit}>
                <label className="ep-field">
                    <span>Nom de l'entrepôt *</span>
                    <input
                        name="nom"
                        type="text"
                        required
                        className="ep-input"
                        placeholder="Ex : Entrepôt principal"
                        autoFocus
                    />
                </label>
                <label className="ep-field">
                    <span>Ville</span>
                    <input
                        name="ville"
                        type="text"
                        className="ep-input"
                        placeholder="Ex : Abidjan"
                    />
                </label>
                <div className="ep-form-actions">
                    <button type="button" className="ep-btn" onClick={onClose} disabled={busy}>
                        Annuler
                    </button>
                    <button type="submit" className="ep-btn ep-btn--signal" disabled={busy}>
                        {busy ? <Loader className="ep-spin" size={15} /> : <Plus size={15} />} Créer
                    </button>
                </div>
            </form>
        </Modal>
    );
}

/* ============================================================
   Modal : ajouter / éditer un produit de l'entrepôt (2 étapes)
   Étape 1 : fiche (identité, prix, unités de vente)
   Étape 2 : stock + emplacement (facultatif)
   ============================================================ */
const UNITE_VENTE_VIDE = {
    id_unite_vente: null,
    nom: "",
    quantite_base: "1",
    prix_vente: "",
    prix_achat: "",
    est_principal: true,
    isNew: true,
    isDeleted: false,
};

function ModalAddProduit({ token, entrepotId, produit, onClose, onAdded, onError }) {
    const isEdit = !!produit;

    /* -------- États formulaire -------- */
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [unitesVente, setUnitesVente] = useState([{ ...UNITE_VENTE_VIDE }]);
    const [fournisseurs, setFournisseurs] = useState([]);
    const [categories, setCategories] = useState([]);
    const [marques, setMarques] = useState([]);
    const [modeles, setModeles] = useState([]);
    const [unites, setUnites] = useState([]);

    /* -------- États workflow -------- */
    const [saving, setSaving] = useState(false);
    const [loadingRefs, setLoadingRefs] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);
    const [createdProduitId, setCreatedProduitId] = useState(null);
    const [duplicateWarning, setDuplicateWarning] = useState(null);

    /* ---- Chargement des référentiels ---- */
    useEffect(() => {
        let cancelled = false;
        const safe = async (fn, set, label) => {
            try {
                const r = await fn(token);
                if (!cancelled && r.success) set(r.data || []);
            } catch (err) { console.error(`❌ ${label}:`, err); }
        };
        (async () => {
            await Promise.all([
                safe(FournisseurService.getActiveFournisseurs, setFournisseurs, 'Fournisseurs'),
                safe(CategorieService.getAllCategories, setCategories, 'Categories'),
                safe(MarqueService.getAllMarques, setMarques, 'Marques'),
                safe(ModeleService.getAllModeles, setModeles, 'Modeles'),
                safe(UniteService.getAllUnites, setUnites, 'Unites'),
            ]);
            if (!cancelled) setLoadingRefs(false);
        })();
        return () => { cancelled = true; };
    }, [token]);

    /* ---- Préremplissage en édition ----
       Les unités viennent directement de `produit.unites_vente`
       (déjà renvoyées par GET /entrepots/:id/produits), donc aucun
       appel à UniteVenteService (qui lit la table des produits magasin). */
    useEffect(() => {
        if (!produit) return;

        setFormData({
            nom: produit.nom || "",
            description: produit.description || "",
            id_fournisseur: produit.id_fournisseur || "",
            id_categorie: produit.id_categorie || "",
            id_marque: produit.id_marque || "",
            id_modele: produit.id_modele || "",
            id_unite: produit.id_unite || "",
            prix_achat: produit.prix_achat ?? "",
            prix_vente: produit.prix_vente ?? "",
            quantite_stock: produit.quantite_stock ?? "",
            quantite_minimale: produit.quantite_minimale ?? "",
            quantite_maximale: produit.quantite_maximale ?? "",
            emplacement: produit.emplacement || "",
            rayon: produit.rayon || "",
            etagere: produit.etagere || "",
            id_emplacement: produit.id_emplacement || "", emplacement_change: false,
        });
        setCreatedProduitId(getPid(produit) || null);

        const unitesProduit = Array.isArray(produit.unites_vente) ? produit.unites_vente : [];
        setUnitesVente(
            unitesProduit.length > 0
                ? unitesProduit.map((u) => ({
                    id_unite_vente: u.id_unite_vente,
                    nom: u.nom,
                    quantite_base: u.quantite_base,
                    prix_vente: u.prix_vente,
                    prix_achat: u.prix_achat || 0,
                    est_principal: !!u.est_principal,
                    isNew: false,
                    isDeleted: false,
                }))
                : [{
                    id_unite_vente: null,
                    nom: produit.unite_nom || "Unité",
                    quantite_base: 1,
                    prix_vente: produit.prix_vente || 0,
                    prix_achat: produit.prix_achat || 0,
                    est_principal: true,
                    isNew: true,
                    isDeleted: false,
                }]
        );
    }, [produit]);

    /* ---- Gestion champs ---- */
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (name === "nom" || name === "id_modele" || name === "id_marque") setDuplicateWarning(null);
    };

    const handleAddUniteVente = () =>
        setUnitesVente((prev) => [
            ...prev,
            {
                id_unite_vente: null,
                nom: "",
                quantite_base: "",
                prix_vente: "",
                prix_achat: "",
                est_principal: prev.filter((u) => !u.isDeleted).length === 0,
                isNew: true,
                isDeleted: false,
            },
        ]);

    const handleUniteVenteChange = (index, field, value) =>
        setUnitesVente((prev) => prev.map((u, i) => (i === index ? { ...u, [field]: value } : u)));

    const handleRemoveUniteVente = (index) =>
        setUnitesVente((prev) => {
            const target = prev[index];
            let next;
            if (target.id_unite_vente) {
                next = prev.map((u, i) => (i === index ? { ...u, isDeleted: true } : u));
            } else {
                next = prev.filter((_, i) => i !== index);
            }
            const actives = next.filter((u) => !u.isDeleted);
            if (actives.length > 0 && !actives.some((u) => u.est_principal)) {
                const firstId = next.findIndex((u) => !u.isDeleted);
                next = next.map((u, i) => (i === firstId ? { ...u, est_principal: true } : u));
            }
            return next;
        });

    const handleSetUnitePrincipale = (index) =>
        setUnitesVente((prev) => prev.map((u, i) => ({ ...u, est_principal: i === index })));

    /* ---- Construction des payloads ---- */
    const buildUnitesPayload = () => {
        const actives = unitesVente.filter((u) => !u.isDeleted);
        return {
            unites_vente: actives.map((u) => ({
                id_unite_vente: u.id_unite_vente || null,
                nom: u.nom.trim(),
                quantite_base: parseFloat(u.quantite_base) || 1,
                prix_vente: parseFloat(u.prix_vente) || 0,
                prix_achat: parseFloat(u.prix_achat) || 0,
                est_principal: u.est_principal,
            })),
            unites_vente_deleted: unitesVente
                .filter((u) => u.isDeleted && u.id_unite_vente)
                .map((u) => u.id_unite_vente),
        };
    };

    const buildBase = () => ({
        nom: formData.nom.trim(),
        description: formData.description?.trim() || "",
        id_fournisseur: formData.id_fournisseur || null,
        id_categorie: formData.id_categorie || null,
        id_marque: formData.id_marque || null,
        id_modele: formData.id_modele || null,
        id_unite: formData.id_unite || null,
        prix_achat: parseFloat(formData.prix_achat) || 0,
        prix_vente: parseFloat(formData.prix_vente) || 0,
    });

    const buildStockFields = () => ({
        quantite_stock: parseFloat(formData.quantite_stock) || 0,
        quantite_minimale: parseFloat(formData.quantite_minimale) || 0,
        quantite_maximale: parseFloat(formData.quantite_maximale) || 0,
        emplacement: formData.emplacement?.trim() || "",
        rayon: formData.rayon?.trim() || "",
        etagere: formData.etagere?.trim() || "",
        // Envoyé seulement s'il a été choisi dans les listes (sinon l'ancien texte reste tel quel)
        ...(formData.emplacement_change || formData.id_emplacement
            ? { id_emplacement: formData.id_emplacement || null }
            : {}),
    });

    /* ---- Validation étape 1 ---- */
    const validateStep1 = () => {
        if (!formData.nom.trim()) return "Saisissez un nom de produit";
        if (!formData.id_unite) return "Choisissez une unité de base";
        if (!formData.id_fournisseur) return "Sélectionnez un fournisseur";
        for (const u of unitesVente.filter((x) => !x.isDeleted)) {
            if (!u.nom || !u.nom.trim()) return "Toutes les unités de vente doivent avoir un nom";
            if (!u.quantite_base || parseFloat(u.quantite_base) <= 0)
                return `La quantité de base de « ${u.nom} » doit être supérieure à 0`;
            if (!u.prix_vente || parseFloat(u.prix_vente) <= 0)
                return `Le prix de vente de « ${u.nom} » doit être supérieur à 0`;
        }
        return null;
    };

    /* ============================================================
       ÉTAPE 1 — Enregistrer la fiche
       (en création, le stock n'est pas encore touché)
       ============================================================ */
    const handleSaveAndNext = async () => {
        const err = validateStep1();
        if (err) return onError?.(err);

        setSaving(true);
        setDuplicateWarning(null);
        try {
            // En édition : on renvoie le stock actuel pour ne pas l'écraser
            const stock = isEdit
                ? buildStockFields()
                : { quantite_stock: 0, quantite_minimale: 0, quantite_maximale: 0, emplacement: "", rayon: "", etagere: "" };

            const data = { ...buildBase(), ...stock, ...buildUnitesPayload() };

            let res;
            if (createdProduitId) {
                // Édition, ou retour à l'étape 1 après une création déjà faite
                res = await ProduitEntrepotService.updateProduit(token, entrepotId, createdProduitId, data);
            } else {
                res = await ProduitEntrepotService.createProduit(token, entrepotId, data);
            }

            if (!res || res.success === false) {
                if (res?.isDuplicate) {
                    setDuplicateWarning({
                        message: res.message,
                        existingId: res.existingId || null,
                    });
                    return;
                }
                return onError?.(res?.message || "Erreur lors de l'enregistrement");
            }

            // ID du produit (création) : la réponse contient `data` = produit complet
            const idProduit = res.data?.id_produit_entrepot || createdProduitId;
            if (!idProduit) {
                return onError?.("Réponse invalide du serveur (identifiant manquant)");
            }
            setCreatedProduitId(idProduit);

            // Synchronise les vrais IDs d'unités renvoyés par le serveur
            const serveur = res.data?.unites_vente || [];
            setUnitesVente((prev) =>
                prev
                    .filter((u) => !u.isDeleted)
                    .map((u) => {
                        const match = serveur.find(
                            (s) => s.nom && u.nom && s.nom.trim().toLowerCase() === u.nom.trim().toLowerCase()
                        );
                        return match ? { ...u, id_unite_vente: match.id_unite_vente, isNew: false } : u;
                    })
            );

            setCurrentStep(2);
        } catch (err) {
            console.error('❌ Save étape 1:', err);
            onError?.(err.message || "Erreur lors de l'enregistrement");
        } finally {
            setSaving(false);
        }
    };

    /* ============================================================
       ÉTAPE 2 — Enregistrer le stock + emplacement
       ============================================================ */
    const handleSaveStock = async () => {
        if (!createdProduitId) return onError?.("Produit introuvable pour la mise à jour");
        setSaving(true);
        try {
            const data = { ...buildBase(), ...buildStockFields(), ...buildUnitesPayload() };
            const res = await ProduitEntrepotService.updateProduit(token, entrepotId, createdProduitId, data);
            if (!res || res.success === false) {
                return onError?.(res?.message || "Erreur de sauvegarde du stock");
            }
            onAdded?.(); // ferme le modal + toast + rechargement
        } catch (err) {
            console.error('❌ Save étape 2:', err);
            onError?.(err.message || "Erreur de sauvegarde du stock");
        } finally {
            setSaving(false);
        }
    };

    /* ---- Passer l'étape stock ---- */
    const handleSkipStock = () => {
        onAdded?.();
    };

    /* ---- Fermeture ----
       À l'étape 2 le produit existe déjà en base : on recharge la liste
       pour qu'il apparaisse même si l'utilisateur ferme la fenêtre. */
    const handleClose = () => {
        if (saving) return;
        if (currentStep === 2 && createdProduitId) {
            onAdded?.();
            return;
        }
        onClose();
    };

    /* ---- Mémo dérivés ---- */
    const fournisseurNom = useMemo(() => {
        const f = fournisseurs.find((x) => String(x.id_fournisseur) === String(formData.id_fournisseur));
        return f?.nom || "";
    }, [fournisseurs, formData.id_fournisseur]);

    const categorieNom = useMemo(() => {
        const c = categories.find((x) => String(x.id_categorie) === String(formData.id_categorie));
        return c?.nom || "";
    }, [categories, formData.id_categorie]);

    const marqueNom = useMemo(() => {
        const m = marques.find((x) => String(x.id_marque) === String(formData.id_marque));
        return m?.nom || "";
    }, [marques, formData.id_marque]);

    const modeleNom = useMemo(() => {
        const m = modeles.find((x) => String(x.id_modele) === String(formData.id_modele));
        return m?.nom || "";
    }, [modeles, formData.id_modele]);

    const uniteSelectionnee = useMemo(() => {
        return unites.find((x) => String(x.id_unite) === String(formData.id_unite)) || null;
    }, [unites, formData.id_unite]);

    const unitesActives = unitesVente.filter((u) => !u.isDeleted && u.nom);

    /* ============================================================
       RENDU
       ============================================================ */
    return (
        <Modal
            wide
            onClose={handleClose}
            title={isEdit ? "Modifier le produit" : "Ajouter un produit à l'entrepôt"}
            subtitle={
                currentStep === 1
                    ? "Identité, prix et conditionnements"
                    : "Quantités en stock et emplacement (facultatif)"
            }
            footer={
                currentStep === 1 ? (
                    <>
                        <button className="ep-btn" onClick={handleClose} disabled={saving}>
                            Annuler
                        </button>
                        <button
                            className="ep-btn ep-btn--signal"
                            onClick={handleSaveAndNext}
                            disabled={saving || loadingRefs}
                        >
                            {saving ? <Loader className="ep-spin" size={15} /> : <Save size={15} />}
                            {isEdit ? "Mettre à jour et continuer" : "Enregistrer et continuer"}
                            <ChevronRight size={15} />
                        </button>
                    </>
                ) : (
                    <>
                        <button className="ep-btn" onClick={handleSkipStock} disabled={saving}>
                            Passer cette étape
                        </button>
                        <button
                            className="ep-btn ep-btn--signal"
                            onClick={handleSaveStock}
                            disabled={saving}
                        >
                            {saving ? <Loader className="ep-spin" size={15} /> : <Save size={15} />}
                            Enregistrer le stock
                        </button>
                    </>
                )
            }
        >
            {/* Indicateur d'étapes */}
            <ol className="ep-steps" aria-label="Étapes">
                <li className={currentStep === 1 ? "is-current" : "is-done"}>
                    <span>{currentStep === 1 ? 1 : <CheckCircle size={13} />}</span> Fiche
                </li>
                <li className={currentStep === 2 ? "is-current" : ""}>
                    <span>2</span> Stock
                </li>
            </ol>

            {loadingRefs ? (
                <div className="ep-loading-inline">
                    <Loader className="ep-spin" size={20} /> Chargement des référentiels…
                </div>
            ) : (
                <div className="ep-addproduit">
                    <div className="ep-addproduit-main">

                        {/* ============================== ÉTAPE 1 ============================== */}
                        {currentStep === 1 && (
                            <>
                                {duplicateWarning && (
                                    <div className="ep-alert" role="alert">
                                        <AlertTriangle size={18} />
                                        <div>
                                            <strong>Produit déjà existant</strong>
                                            <p>{duplicateWarning.message}</p>
                                        </div>
                                        <button
                                            type="button"
                                            className="ep-alert-close"
                                            onClick={() => setDuplicateWarning(null)}
                                            aria-label="Fermer"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}

                                <section className="ep-block">
                                    <h4><Info size={15} /> Informations générales</h4>
                                    <div className="ep-field">
                                        <label className="ep-lbl">Fournisseur <em>*</em></label>
                                        <SelectSearch
                                            options={fournisseurs}
                                            value={formData.id_fournisseur}
                                            onChange={handleInputChange}
                                            placeholder="Sélectionner un fournisseur..."
                                            optionLabel="nom"
                                            optionValue="id_fournisseur"
                                            name="id_fournisseur"
                                            disabled={saving}
                                            renderOption={(f) => (
                                                <span><strong>{f.nom}</strong>{f.ville && ` — ${f.ville}`}{f.pays && ` (${f.pays})`}</span>
                                            )}
                                        />
                                    </div>
                                    <div className="ep-field">
                                        <label className="ep-lbl">Nom du produit <em>*</em></label>
                                        <input
                                            className="ep-input"
                                            type="text"
                                            name="nom"
                                            value={formData.nom}
                                            onChange={handleInputChange}
                                            placeholder="Ex : Bougie NGK CR8E"
                                            disabled={saving}
                                            maxLength={100}
                                        />
                                    </div>
                                    <div className="ep-field">
                                        <label className="ep-lbl">Description</label>
                                        <textarea
                                            className="ep-input ep-textarea"
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            placeholder="Compatibilité, particularités…"
                                            rows="2"
                                            disabled={saving}
                                            maxLength={500}
                                        />
                                    </div>
                                    <div className="ep-grid4">
                                        <SelectSearch options={categories} value={formData.id_categorie} onChange={handleInputChange} label="Catégorie" placeholder="Sélectionner..." optionLabel="nom" optionValue="id_categorie" name="id_categorie" disabled={saving} />
                                        <SelectSearch options={marques} value={formData.id_marque} onChange={handleInputChange} label="Marque" placeholder="Sélectionner..." optionLabel="nom" optionValue="id_marque" name="id_marque" disabled={saving} />
                                        <SelectSearch options={modeles} value={formData.id_modele} onChange={handleInputChange} label="Modèle" placeholder="Sélectionner..." optionLabel="nom" optionValue="id_modele" name="id_modele" disabled={saving} />
                                        <SelectSearch
                                            options={unites}
                                            value={formData.id_unite}
                                            onChange={handleInputChange}
                                            label="Unité de base *"
                                            placeholder="Sélectionner..."
                                            optionLabel="nom"
                                            optionValue="id_unite"
                                            name="id_unite"
                                            disabled={saving}
                                            renderOption={(u) => <span>{u.nom} <small>({u.symbole})</small></span>}
                                        />
                                    </div>
                                </section>

                                <section className="ep-block">
                                    <h4><Banknote size={15} /> Prix (FCFA)</h4>
                                    <div className="ep-grid2">
                                        <div className="ep-field">
                                            <label className="ep-lbl">Prix d'achat</label>
                                            <input className="ep-input" type="number" name="prix_achat" value={formData.prix_achat} onChange={handleInputChange} placeholder="0" step="0.01" min="0" disabled={saving} />
                                        </div>
                                        <div className="ep-field">
                                            <label className="ep-lbl">Prix de vente</label>
                                            <input className="ep-input" type="number" name="prix_vente" value={formData.prix_vente} onChange={handleInputChange} placeholder="0" step="0.01" min="0" disabled={saving} />
                                        </div>
                                    </div>
                                </section>

                                <section className="ep-block">
                                    <div className="ep-block-head">
                                        <h4><Layers size={15} /> Unités de vente</h4>
                                        <button type="button" className="ep-btn ep-btn--sm" onClick={handleAddUniteVente} disabled={saving}>
                                            <Plus size={14} /> Ajouter
                                        </button>
                                    </div>
                                    <p className="ep-hint">Conditionnements dans lesquels vous vendez cette pièce.</p>
                                    {unitesVente.filter((u) => !u.isDeleted).length === 0 ? (
                                        <div className="ep-units-empty">
                                            <Box size={22} />
                                            <p>Aucune unité de vente</p>
                                        </div>
                                    ) : (
                                        <div className="ep-units">
                                            <div className="ep-unit ep-unit--head">
                                                <span>Princ.</span><span>Nom</span><span>Qté base</span><span>Prix achat</span><span>Prix vente</span><span />
                                            </div>
                                            {unitesVente.map((u, index) => {
                                                if (u.isDeleted) return null;
                                                return (
                                                    <div key={u.id_unite_vente ?? `new-${index}`} className={`ep-unit ${u.est_principal ? "is-main" : ""}`}>
                                                        <input type="radio" className="ep-radio" checked={!!u.est_principal} onChange={() => handleSetUnitePrincipale(index)} disabled={saving} aria-label="Unité principale" />
                                                        <input className="ep-input ep-input--sm" type="text" value={u.nom} onChange={(e) => handleUniteVenteChange(index, "nom", e.target.value)} placeholder="Ex : Carton" disabled={saving} maxLength={50} aria-label="Nom" />
                                                        <input className="ep-input ep-input--sm" type="number" value={u.quantite_base} onChange={(e) => handleUniteVenteChange(index, "quantite_base", e.target.value)} placeholder="12" min="1" step="1" disabled={saving} aria-label="Quantité de base" />
                                                        <input className="ep-input ep-input--sm" type="number" value={u.prix_achat} onChange={(e) => handleUniteVenteChange(index, "prix_achat", e.target.value)} placeholder="0" min="0" step="0.01" disabled={saving} aria-label="Prix d'achat" />
                                                        <input className="ep-input ep-input--sm" type="number" value={u.prix_vente} onChange={(e) => handleUniteVenteChange(index, "prix_vente", e.target.value)} placeholder="0" min="0" step="0.01" disabled={saving} aria-label="Prix de vente" />
                                                        <button type="button" className="ep-ibtn ep-ibtn--no" onClick={() => handleRemoveUniteVente(index)} disabled={saving} title="Retirer" aria-label="Retirer l'unité">
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>
                            </>
                        )}

                        {/* ============================== ÉTAPE 2 ============================== */}
                        {currentStep === 2 && (
                            <>
                                <div className="ep-note">
                                    <Info size={18} />
                                    <div>
                                        <strong>Stock et emplacement (facultatif)</strong>
                                        <span>
                                            {isEdit
                                                ? "Ajustez le stock ou l'emplacement, ou passez cette étape si rien ne change."
                                                : "Renseignez-les maintenant ou complétez-les plus tard."}
                                        </span>
                                    </div>
                                </div>

                                <section className="ep-block">
                                    <h4><Box size={15} /> Stock & emplacement</h4>
                                    {!formData.id_unite && (
                                        <div className="ep-alert" role="alert">
                                            <AlertTriangle size={16} />
                                            <p>Choisissez d'abord une <strong>unité de base</strong> pour saisir le stock.</p>
                                        </div>
                                    )}
                                    <div className="ep-grid3">
                                        {[
                                            ["quantite_stock", "Stock actuel"],
                                            ["quantite_minimale", "Stock minimum"],
                                            ["quantite_maximale", "Stock maximum"],
                                        ].map(([name, label]) => (
                                            <div className="ep-field" key={name}>
                                                <label className="ep-lbl">{label}</label>
                                                <StockInputWithSelector
                                                    value={formData[name]}
                                                    onChange={handleInputChange}
                                                    name={name}
                                                    idProduit={createdProduitId || "new"}
                                                    unitesVente={unitesVente.filter((u) => !u.isDeleted)}
                                                    uniteBase={uniteSelectionnee ? { nom: uniteSelectionnee.nom, symbole: uniteSelectionnee.symbole || "" } : null}
                                                    disabled={saving || !formData.id_unite}
                                                    placeholder={!formData.id_unite ? "Choisir l'unité de base" : "0"}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <ChoixEmplacement
                                        idEntrepot={entrepotId}
                                        value={formData.id_emplacement}
                                        disabled={saving}
                                        classeChamp="ep-input"
                                        classeLabel="ep-lbl"
                                        classeChampBloc="ep-field"
                                        onChange={(id, noms) => setFormData((prev) => ({
                                            ...prev, ...noms, id_emplacement: id || "", emplacement_change: true,
                                        }))}
                                    />
                                    <p className="ep-hint-emp">Les listes de cet entrepôt se gèrent dans l'onglet Emplacements, bouton « Gérer les listes ».</p>
                                </section>
                            </>
                        )}
                    </div>

                    <aside className="ep-addproduit-side">
                        <div className="ep-tagcard">
                            <div className="ep-tagcard-hole" />
                            <p className="ep-tagcard-meta">{fournisseurNom || "Fournisseur"}{categorieNom ? ` · ${categorieNom}` : ""}</p>
                            <h4>{formData.nom.trim() || "Nom du produit"}</h4>
                            <p className="ep-tagcard-sub">{[marqueNom, modeleNom].filter(Boolean).join(" — ") || "Marque — Modèle"}</p>
                            <div className="ep-tagcard-price">
                                <strong>{formatPrice(formData.prix_vente)}</strong>
                                <small>FCFA{uniteSelectionnee ? ` / ${uniteSelectionnee.nom}` : ""}</small>
                            </div>
                            {unitesActives.length > 0 && (
                                <ul className="ep-tagcard-units">
                                    {unitesActives.map((u, i) => (
                                        <li key={i}>
                                            <span>{u.nom}{num(u.quantite_base) > 1 ? ` ×${num(u.quantite_base)}` : ""}{u.est_principal ? " ★" : ""}</span>
                                            <b>{formatPrice(u.prix_vente)}</b>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {currentStep === 2 && (formData.emplacement || formData.rayon || formData.etagere) && (
                                <p className="ep-tagcard-loc"><MapPin size={13} /> {[formData.emplacement, formData.rayon, formData.etagere].filter(Boolean).join(" / ")}</p>
                            )}
                        </div>
                        <p className="ep-side-note">Aperçu de la fiche, mis à jour pendant la saisie.</p>
                    </aside>
                </div>
            )}
        </Modal>
    );
}

/* ============================================================
   Composant principal
   ============================================================ */
export default function Entrepot() {
    const { token, entrepots: mesEntrepots, refreshEntrepots } = useUser();
    useDisableNumberScroll(true);

    const [entrepotActif, setEntrepotActif] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showRejoindre, setShowRejoindre] = useState(false);
    const [showAddProduit, setShowAddProduit] = useState(false);
    const [produitEnEdition, setProduitEnEdition] = useState(null);
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);

    /* ---------- États liste produits ---------- */
    const [produits, setProduits] = useState([]);
    const [loadingProduits, setLoadingProduits] = useState(false);
    const [errorProduits, setErrorProduits] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [stockFilter, setStockFilter] = useState('all'); // all | low | out
    const [tri, setTri] = useState({ col: 'nom', asc: true }); // col : nom | stock | prix_vente
    const [pageProduits, setPageProduits] = useState(1);
    const PRODUITS_PAR_PAGE = 15;

    /* ---------- Suppression ---------- */
    const [produitToDelete, setProduitToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    /* ---------- Transferts vers les magasins ---------- */
    const [menuPlus, setMenuPlus] = useState(false);       // menu « Plus » de l'en-tête
    const menuPlusRef = useRef(null);
    useEffect(() => {
        if (!menuPlus) return undefined;
        const fermer = (e) => { if (menuPlusRef.current && !menuPlusRef.current.contains(e.target)) setMenuPlus(false); };
        const echap = (e) => { if (e.key === 'Escape') setMenuPlus(false); };
        document.addEventListener('mousedown', fermer);
        document.addEventListener('keydown', echap);
        return () => { document.removeEventListener('mousedown', fermer); document.removeEventListener('keydown', echap); };
    }, [menuPlus]);
    const [vue, setVue] = useState('produits');
    // Explorateur : dossier choisi à gauche (null = tout l'entrepôt, '' = non rangé)
    const [dossierZone, setDossierZone] = useState(null);
    const [dossierRayon, setDossierRayon] = useState(null);
    const [typeMouvement, setTypeMouvement] = useState('');

    // Navigation depuis l'aperçu : onglet + filtre éventuel
    const ouvrirDossier = (zone, rayon = null, filtre = 'all') => {
        setDossierZone(zone);
        setDossierRayon(rayon);
        setStockFilter(filtre);
        setSearchQuery('');
    };
    const allerVers = (cible, filtre) => {
        if (cible === 'produits') { ouvrirDossier(null, null, filtre || 'all'); setVue('produits'); return; }
        if (cible === 'plan') { ouvrirDossier('', null); setVue('produits'); return; } // produits non rangés
        if (cible === 'mouvements') setTypeMouvement(filtre || '');
        setVue(cible);
    };
    const [produitToTransfer, setProduitToTransfer] = useState(null);

    /* ---------- Panier de transfert (sélection de plusieurs produits) ---------- */
    const [panier, setPanier] = useState({});            // { [id_produit_entrepot]: true }
    const [showLot, setShowLot] = useState(false);
    const basculerPanier = (id) => setPanier((prev) => {
        const next = { ...prev };
        if (next[id]) delete next[id]; else next[id] = true;
        return next;
    });
    const viderPanier = () => setPanier({});
    const [transfertsInfo, setTransfertsInfo] = useState({ est_proprietaire: false, count: 0 });

    const refreshTransfertsCount = useCallback(async () => {
        if (!entrepotActif?.id_entrepot) return;
        setTransfertsInfo(await TransfertStockService.countEnAttente(token, entrepotActif.id_entrepot));
    }, [token, entrepotActif?.id_entrepot]);

    useEffect(() => { refreshTransfertsCount(); }, [refreshTransfertsCount]);

    const showToast = useCallback((type, message) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ type, message: message || 'Une erreur est survenue' });
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    }, []);

    /* ---------- Chargement des produits ---------- */
    const loadProduits = useCallback(async () => {
        if (!entrepotActif?.id_entrepot) return;
        setLoadingProduits(true);
        setErrorProduits(null);
        try {
            const res = await ProduitEntrepotService.getAllProduits(
                token,
                entrepotActif.id_entrepot
            );
            const list = res?.produits || res?.data || (Array.isArray(res) ? res : []);
            setProduits(list);
        } catch (err) {
            console.error('❌ Chargement produits:', err);
            setErrorProduits(err.message || 'Impossible de charger les produits');
        } finally {
            setLoadingProduits(false);
        }
    }, [token, entrepotActif?.id_entrepot]);

    /* ---------- Entrepôt actif par défaut ---------- */
    useEffect(() => {
        if (entrepotActif) return;
        if (Array.isArray(mesEntrepots) && mesEntrepots.length > 0) {
            setEntrepotActif(mesEntrepots[0]);
        }
    }, [mesEntrepots, entrepotActif]);

    /* ---------- Rechargement au changement d'entrepôt ---------- */
    useEffect(() => {
        setPanier({});
        if (entrepotActif?.id_entrepot) {
            loadProduits();
        } else {
            setProduits([]);
        }
    }, [entrepotActif?.id_entrepot, loadProduits]);

    /* ---------- Nettoyage du timer de toast ---------- */
    useEffect(() => () => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
    }, []);

    /* ---------- Produits filtrés ---------- */
    const produitsFiltres = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return produits.filter((p) => {
            if (!q && dossierZone !== null) {
                if (String(p.emplacement || '').trim() !== dossierZone) return false;
                if (dossierRayon !== null && String(p.rayon || '').trim() !== dossierRayon) return false;
            }
            if (stockFilter !== 'all') {
                const state = stockState(p).key;
                if (stockFilter === 'low' && state !== 'low') return false;
                if (stockFilter === 'out' && state !== 'out') return false;
            }
            if (!q) return true;
            const haystack = [
                p.nom,
                p.description,
                p.categorie_nom,
                p.marque_nom,
                p.modele_nom,
                p.fournisseur_nom,
                p.emplacement,
                p.rayon,
                p.etagere,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [produits, searchQuery, stockFilter, dossierZone, dossierRayon]);

    /* ---------- Tri + pagination ---------- */
    const produitsTries = useMemo(() => {
        const liste = [...produitsFiltres];
        const dir = tri.asc ? 1 : -1;
        liste.sort((a, b) => {
            if (tri.col === 'stock') return (num(a.quantite_stock) - num(b.quantite_stock)) * dir;
            if (tri.col === 'prix_vente') return (num(a.prix_vente) - num(b.prix_vente)) * dir;
            return String(a.nom || '').localeCompare(String(b.nom || ''), 'fr', { sensitivity: 'base' }) * dir;
        });
        return liste;
    }, [produitsFiltres, tri]);

    useEffect(() => { setPageProduits(1); }, [searchQuery, stockFilter, tri, dossierZone, dossierRayon, entrepotActif?.id_entrepot]);
    useEffect(() => { setDossierZone(null); setDossierRayon(null); }, [entrepotActif?.id_entrepot]);

    const nbPagesProduits = Math.max(1, Math.ceil(produitsTries.length / PRODUITS_PAR_PAGE));
    const pageProduitsCourante = Math.min(pageProduits, nbPagesProduits);
    const produitsPage = produitsTries.slice(
        (pageProduitsCourante - 1) * PRODUITS_PAR_PAGE,
        pageProduitsCourante * PRODUITS_PAR_PAGE
    );

    const trierPar = (col) =>
        setTri((prev) => (prev.col === col ? { col, asc: !prev.asc } : { col, asc: col === 'nom' }));

    const arbre = useMemo(() => {
        const cmp = (a, b) => String(a || '').localeCompare(String(b || ''), 'fr', { numeric: true, sensitivity: 'base' });
        const map = new Map();
        let nonRanges = 0;
        for (const p of produits) {
            const z = String(p.emplacement || '').trim();
            if (!z) { nonRanges += 1; continue; }
            if (!map.has(z)) map.set(z, { nom: z, n: 0, bas: 0, out: 0, rayons: new Map() });
            const e = map.get(z);
            e.n += 1;
            const st = stockState(p).key;
            if (st === 'low') e.bas += 1;
            if (st === 'out') e.out += 1;
            const ry = String(p.rayon || '').trim();
            if (ry) e.rayons.set(ry, (e.rayons.get(ry) || 0) + 1);
        }
        const zonesArbre = [...map.values()]
            .map((e) => ({ ...e, rayons: [...e.rayons.entries()].sort((a, b) => cmp(a[0], b[0])) }))
            .sort((a, b) => cmp(a.nom, b.nom));
        return { zones: zonesArbre, nonRanges };
    }, [produits]);

    const zonesCount = useMemo(
        () => new Set(produits.map((p) => String(p.emplacement || '').trim()).filter(Boolean)).size,
        [produits]
    );

    /* ---------- Statistiques ---------- */
    const stats = useMemo(() => {
        let total = 0, low = 0, out = 0, valeur = 0;
        for (const p of produits) {
            total += 1;
            const s = stockState(p).key;
            if (s === 'low') low += 1;
            if (s === 'out') out += 1;
            valeur += num(p.quantite_stock) * num(p.prix_achat);
        }
        return { total, low, out, valeur };
    }, [produits]);

    /* ---------- Actions ---------- */
    const handleEntrepotCreated = useCallback(async () => {
        setShowCreate(false);
        showToast('success', 'Entrepôt créé avec succès');
        try {
            const res = await refreshEntrepots?.();
            if (Array.isArray(res) && res.length > 0) {
                setEntrepotActif(res[res.length - 1]);
            }
        } catch (err) {
            console.error('❌ refreshEntrepots:', err);
        }
    }, [refreshEntrepots, showToast]);

    const handleProduitSaved = useCallback(() => {
        const wasEdit = !!produitEnEdition;
        setShowAddProduit(false);
        setProduitEnEdition(null);
        showToast('success', wasEdit ? 'Produit mis à jour' : "Produit ajouté à l'entrepôt");
        loadProduits();
    }, [produitEnEdition, showToast, loadProduits]);

    const handleOpenAdd = useCallback(() => {
        setProduitEnEdition(null);
        setShowAddProduit(true);
    }, []);

    const handleOpenEdit = useCallback((produit) => {
        setProduitEnEdition(produit);
        setShowAddProduit(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setShowAddProduit(false);
        setProduitEnEdition(null);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (!produitToDelete || !entrepotActif?.id_entrepot) return;
        setDeleting(true);
        try {
            const idProduit = getPid(produitToDelete);
            await ProduitEntrepotService.deleteProduit(
                token,
                entrepotActif.id_entrepot,
                idProduit
            );
            setProduits((prev) => prev.filter((p) => getPid(p) !== idProduit));
            showToast('success', "Produit supprimé de l'entrepôt");
            setProduitToDelete(null);
            loadProduits();
        } catch (err) {
            console.error('❌ Suppression produit:', err);
            showToast('error', err.message || 'Erreur lors de la suppression');
        } finally {
            setDeleting(false);
        }
    }, [produitToDelete, entrepotActif, token, showToast, loadProduits]);

    const handleEntrepotRejoint = useCallback(async () => {
        setShowRejoindre(false);
        showToast('success', "Vous avez rejoint l'entrepôt");
        try {
            const res = await refreshEntrepots?.();
            if (Array.isArray(res) && res.length > 0) {
                setEntrepotActif(res[res.length - 1]);
            }
        } catch (err) {
            console.error('❌ refreshEntrepots:', err);
        }
    }, [refreshEntrepots, showToast]);

    const copierCode = useCallback(async (code) => {
        try {
            await navigator.clipboard.writeText(code);
            showToast('success', "Code d'accès copié");
        } catch {
            showToast('error', "Copie impossible : sélectionnez le code à la main");
        }
    }, [showToast]);

    const handleTransfertCreated = useCallback((res) => {
        setProduitToTransfer(null);
        const applique = res?.data?.statut === 'valide';
        // Le serveur précise si c'est au propriétaire (vous) de valider le transfert
        showToast(
            'success',
            res?.message || (applique
                ? 'Transfert effectué : votre catalogue a été mis à jour'
                : "Demande envoyée : le propriétaire de l'entrepôt doit l'approuver")
        );
        if (applique) loadProduits(); // le stock de l'entrepôt a baissé
        refreshTransfertsCount();
        if (!applique) setVue('transferts');
    }, [showToast, loadProduits, refreshTransfertsCount]);

    /* ---------- Rendu : aucun entrepôt ---------- */
    if (!entrepotActif) {
        return (
            <div className="ep-page">
                <Toast toast={toast} />
                <div className="ep-empty-state">
                    <Warehouse size={48} />
                    <h2>Aucun entrepôt</h2>
                    <p>Créez votre premier entrepôt pour commencer à gérer votre stock.</p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                            className="ep-btn ep-btn--signal"
                            onClick={() => setShowCreate(true)}
                        >
                            <Plus size={16} /> Créer un entrepôt
                        </button>
                        <button
                            className="ep-btn"
                            onClick={() => setShowRejoindre(true)}
                        >
                            <LogIn size={16} /> Rejoindre avec un code
                        </button>
                    </div>
                </div>
                {showCreate && (
                    <ModalCreate
                        token={token}
                        onClose={() => setShowCreate(false)}
                        onCreated={handleEntrepotCreated}
                        onError={(msg) => showToast('error', msg)}
                    />
                )}
                {showRejoindre && (
                    <ModalRejoindre
                        token={token}
                        onClose={() => setShowRejoindre(false)}
                        onJoined={handleEntrepotRejoint}
                    />
                )}
            </div>
        );
    }

    /* ---------- Rendu principal ---------- */
    const renderEntete = (rows, offset, mode, cle) => (
        <thead>
            <tr>
                <th className="ep2-check">
                    <input
                        type="checkbox"
                        aria-label="Sélectionner les produits affichés"
                        checked={rows.some((p) => num(p.quantite_stock) > 0)
                            && rows.filter((p) => num(p.quantite_stock) > 0).every((p) => panier[getPid(p)])}
                        onChange={(e) => setPanier((prev) => {
                            const next = { ...prev };
                            rows.filter((p) => num(p.quantite_stock) > 0).forEach((p) => {
                                if (e.target.checked) next[getPid(p)] = true; else delete next[getPid(p)];
                            });
                            return next;
                        })}
                    />
                </th>
                <th className="ep2-num">N°</th>
                <th>
                    {mode !== 'plan' ? (
                        <button className={`ep2-sort ${tri.col === 'nom' ? 'is-on' : ''}`} onClick={() => trierPar('nom')}>
                            Produit {tri.col === 'nom' && (tri.asc ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
                        </button>
                    ) : 'Produit'}
                </th>
                <th>{mode === 'ex' ? 'Où' : mode === 'stock' ? 'Emplacement' : 'Rayon · Étagère'}</th>
                <th>
                    {mode !== 'plan' ? (
                        <button className={`ep2-sort ${tri.col === 'stock' ? 'is-on' : ''}`} onClick={() => trierPar('stock')}>
                            Stock {tri.col === 'stock' && (tri.asc ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
                        </button>
                    ) : 'Stock'}
                </th>
                {mode !== 'ex' && <th>Unités de vente</th>}
                <th className="r ep2-col-prix">
                    {mode !== 'plan' ? (
                        <button className={`ep2-sort ${tri.col === 'prix_vente' ? 'is-on' : ''}`} onClick={() => trierPar('prix_vente')}>
                            Prix de vente {tri.col === 'prix_vente' && (tri.asc ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
                        </button>
                    ) : 'Prix de vente'}
                </th>
                <th className="r">Actions</th>
            </tr>
        </thead>
    );

    const renderLigne = (p, numero, mode) => {
        const st = stockState(p);
        const StIcon = st.icon;
        const pid = getPid(p);
        const parts = partiesQuantite(p, p.quantite_stock);
        const uv = unitesTriees(p);
        const prix = prixPrincipal(p);
        const vide = num(p.quantite_stock) <= 0;
        return (
            <tr key={pid} className={`${panier[pid] ? 'is-selected' : ''} ep2-row--${st.key}`}>
                <td className="ep2-check">
                    <input
                        type="checkbox"
                        checked={!!panier[pid]}
                        onChange={() => basculerPanier(pid)}
                        disabled={vide}
                        title={vide ? 'Stock vide' : 'Ajouter au panier de transfert'}
                        aria-label={`Ajouter ${p.nom} au panier de transfert`}
                    />
                </td>
                <td className="ep2-num">{numero}</td>
                <td>
                    <div className="ep2-pname">{p.nom}</div>
                    <div className="ep2-psub">
                        {[p.categorie_nom, p.marque_nom, p.modele_nom].filter(Boolean).join(' · ') || p.description || '—'}
                    </div>
                </td>
                <td>
                    {mode === 'ex'
                        ? <EmplacementTexte p={p} sansZone={dossierZone !== null && dossierZone !== '' && !searchQuery.trim()} />
                        : mode === 'stock'
                            ? <EmplacementTag p={p} />
                            : <EmplacementTag p={p} sansZone />}
                </td>
                <td className="ep2-stock">
                    <div className="ep2-qty" title={decomposerQuantite(p, p.quantite_stock).texte}>
                        {parts.map((x, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && <span className="ep2-plus">+</span>}
                                <span className="ep2-qty-part"><b>{x.n.toLocaleString('fr-FR')}</b><em>{x.nom}</em></span>
                            </React.Fragment>
                        ))}
                    </div>
                    {uv.some((u) => num(u.quantite_base) > 1) && (
                        <div className="ep2-psub">soit {formatPrice(p.quantite_stock)} {p.unite_nom || ''}</div>
                    )}
                    {num(p.quantite_minimale) > 0 && (
                        <div className="ep2-psub">min {decomposerQuantite(p, p.quantite_minimale).texte}
                            {num(p.quantite_maximale) > 0 && ` · max ${decomposerQuantite(p, p.quantite_maximale).texte}`}</div>
                    )}
                    <LevelBar produit={p} />
                    {(st.key === 'low' || st.key === 'out') && (
                        <span className={`ep2-badge ep2-badge--${st.key} ep2-badge--stock`}><StIcon size={13} /> {st.label}</span>
                    )}
                </td>
{mode !== 'ex' && (
                <td>
                    <div className="ep2-chips">
                        {uv.length === 0 && <span className="ep2-chip"><b>{p.unite_nom || 'Unité'}</b></span>}
                        {uv.map((u) => (
                            <span key={u.id_unite_vente || u.nom} className={`ep2-chip ${u.est_principal ? 'is-main' : ''}`}
                                  title={`${u.nom} = ${num(u.quantite_base)} ${p.unite_nom || ''}`}>
                                <b>{u.nom}</b>
                                {num(u.quantite_base) > 1 && <i>×{num(u.quantite_base)}</i>}
                                <span>{formatPrice(u.prix_vente || num(p.prix_vente) * num(u.quantite_base))}</span>
                            </span>
                        ))}
                    </div>
                </td>
                )}
                <td className="r ep2-price">
                    <b>{formatPrice(prix.vente)}</b> <span className="ep2-per">/ {prix.nom}</span>
                    <div className="ep2-psub">achat {formatPrice(prix.achat)}</div>
                    {mode === 'ex' && uv.filter((u) => num(u.quantite_base) > 1).map((u) => (
                        <div key={u.id_unite_vente || u.nom} className="ep2-psub">{u.nom} ×{num(u.quantite_base)} · {formatPrice(u.prix_vente || num(p.prix_vente) * num(u.quantite_base))}</div>
                    ))}
                </td>
                <td className="r">
                    <div className="ep2-row-actions">
                        <button className="ep2-ibtn" onClick={() => handleOpenEdit(p)}
                                title="Modifier" aria-label="Modifier le produit">
                            <Edit size={16} />
                        </button>
                        <button className="ep2-ibtn ep2-ibtn--send" onClick={() => setProduitToTransfer(p)}
                                disabled={vide}
                                title={vide ? 'Stock vide' : 'Transférer vers mon magasin'}
                                aria-label="Transférer vers mon magasin">
                            <Send size={16} />
                        </button>
                        <button className="ep2-ibtn ep2-ibtn--danger" onClick={() => setProduitToDelete(p)}
                                title="Supprimer" aria-label="Supprimer le produit">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    const renderTable = (rows, offset, mode, cle) => (
        <div className="ep2-wrap" key={cle}>
            <table className="ep2-table">
                {renderEntete(rows, offset, mode, cle)}
                <tbody>
                    {rows.map((p, idx) => renderLigne(p, offset + idx + 1, mode))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="ep2-page">
            <Toast toast={toast} />

            {/* Panneau d'entrée de quai : identité + indicateurs */}
            <header className="ep2-head">
                <div className="ep2-head-top">
                    <div className="ep2-id">
                        <div className="ep2-logo"><Warehouse size={26} /></div>
                        <div className="ep2-id-text">
                            <div className="ep2-title">
                                <h1>{entrepotActif.nom}</h1>
                                <span className={`ep2-role ${transfertsInfo.est_proprietaire ? 'ep2-role--owner' : ''}`}>
                                    {transfertsInfo.est_proprietaire
                                        ? <><Crown size={12} /> Propriétaire</>
                                        : <><Users size={12} /> Membre</>}
                                </span>
                            </div>
                            <div className="ep2-meta">
                                {entrepotActif.ville && <span><MapPin size={14} /> {entrepotActif.ville}</span>}
                                <span><Layers size={14} /> {zonesCount} emplacement{zonesCount > 1 ? 's' : ''}</span>
                                {entrepotActif.code_acces && (
                                    <span className="ep2-code" title="Donnez ce code aux autres comptes pour qu'ils rejoignent l'entrepôt">
                                        Code d'accès <b>{entrepotActif.code_acces}</b>
                                        <button
                                            type="button"
                                            onClick={() => copierCode(entrepotActif.code_acces)}
                                            aria-label="Copier le code d'accès"
                                            title="Copier le code"
                                        >
                                            <Copy size={14} />
                                        </button>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="ep2-actions">
                        {Array.isArray(mesEntrepots) && mesEntrepots.length > 1 && (
                            <select
                                className="ep2-select"
                                value={entrepotActif.id_entrepot}
                                onChange={(e) => {
                                    const id = Number(e.target.value);
                                    const found = mesEntrepots.find((x) => Number(x.id_entrepot) === id);
                                    if (found) setEntrepotActif(found);
                                }}
                                aria-label="Changer d'entrepôt"
                            >
                                {mesEntrepots.map((ent) => (
                                    <option key={ent.id_entrepot} value={ent.id_entrepot}>{ent.nom}</option>
                                ))}
                            </select>
                        )}
                        <button className="ep2-btn ep2-btn--primary" onClick={handleOpenAdd}>
                            <Plus size={15} /> Ajouter un produit
                        </button>
                        <div className="ep2-plus-actions" ref={menuPlusRef}>
                            <button
                                type="button"
                                className="ep2-icon-btn"
                                aria-haspopup="menu"
                                aria-expanded={menuPlus}
                                aria-label="Plus d'actions"
                                title="Plus d'actions"
                                onClick={() => setMenuPlus((v) => !v)}
                            >
                                <MoreHorizontal size={18} />
                            </button>
                            {menuPlus && (
                                <div className="ep2-plus-menu" role="menu">
                                    <button role="menuitem" onClick={() => { setMenuPlus(false); setVue('listes'); }}>
                                        <Settings size={15} /> Gérer les emplacements
                                    </button>
                                    <button role="menuitem" onClick={() => { setMenuPlus(false); setShowRejoindre(true); }}>
                                        <LogIn size={15} /> Rejoindre un entrepôt
                                    </button>
                                    <button role="menuitem" onClick={() => { setMenuPlus(false); setShowCreate(true); }}>
                                        <Plus size={15} /> Créer un entrepôt
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Onglets */}
            <div className="ep2-tabs" role="tablist">
                <button role="tab" aria-selected={vue === 'produits' || vue === 'listes'}
                        className={`ep2-tab ${vue === 'produits' || vue === 'listes' ? 'is-active' : ''}`}
                        onClick={() => setVue('produits')}>
                    <Package size={16} /> Stock <span className="ep2-pill">{stats.total}</span>
                </button>
                <button role="tab" aria-selected={vue === 'transferts'}
                        className={`ep2-tab ${vue === 'transferts' ? 'is-active' : ''}`}
                        onClick={() => setVue('transferts')}>
                    <Send size={16} /> Transferts
                    {transfertsInfo.count > 0 && <span className="ep2-pill ep2-pill--alert" title="Demandes en attente">{transfertsInfo.count}</span>}
                </button>
                <button role="tab" aria-selected={vue === 'mouvements'}
                        className={`ep2-tab ${vue === 'mouvements' ? 'is-active' : ''}`}
                        onClick={() => { setTypeMouvement(''); setVue('mouvements'); }}>
                    <ArrowUp size={16} /><ArrowDown size={16} style={{ marginLeft: -10 }} /> Mouvements
                </button>
                <button role="tab" aria-selected={vue === 'inventaire'}
                        className={`ep2-tab ${vue === 'inventaire' ? 'is-active' : ''}`}
                        onClick={() => setVue('inventaire')}>
                    <ClipboardCheck size={16} /> Inventaire
                </button>
                <button role="tab" aria-selected={vue === 'apercu'}
                        className={`ep2-tab ${vue === 'apercu' ? 'is-active' : ''}`}
                        onClick={() => setVue('apercu')}>
                    <Info size={16} /> Aperçu
                </button>
            </div>

            {vue === 'apercu' && (
                <ApercuEntrepot
                    key={entrepotActif.id_entrepot}
                    token={token}
                    entrepotId={entrepotActif.id_entrepot}
                    onGo={allerVers}
                    onError={(msg) => showToast('error', msg)}
                />
            )}

            {vue === 'mouvements' && (
                <MouvementsEntrepot
                    key={`${entrepotActif.id_entrepot}-${typeMouvement}`}
                    token={token}
                    entrepotId={entrepotActif.id_entrepot}
                    typeInitial={typeMouvement}
                    onError={(msg) => showToast('error', msg)}
                />
            )}

            {vue === 'inventaire' && (
                <InventaireEntrepot
                    key={entrepotActif.id_entrepot}
                    token={token}
                    entrepotId={entrepotActif.id_entrepot}
                    onError={(msg) => showToast('error', msg)}
                    onChanged={(msg, stockModifie) => {
                        showToast('success', msg);
                        if (stockModifie) loadProduits(); // le stock a été corrigé
                    }}
                />
            )}

            {vue === 'transferts' && (
                <TransfertsEntrepot
                    token={token}
                    entrepotId={entrepotActif.id_entrepot}
                    onError={(msg) => showToast('error', msg)}
                    onLoaded={(res) => setTransfertsInfo((prev) => ({ ...prev, est_proprietaire: !!res.est_proprietaire }))}
                    onChanged={(msg, type) => {
                        showToast('success', msg);
                        refreshTransfertsCount();
                        if (type === 'approuver') loadProduits(); // le stock de l'entrepôt a baissé
                    }}
                />
            )}

            {vue === 'listes' && (
                <section className="ep2-listes" aria-label="Listes d'emplacements de l'entrepôt">
                    <div className="ep2-listes-head">
                        <div>
                            <strong>Listes d'emplacements de {entrepotActif.nom}</strong>
                            <span>Emplacement, puis rayon, puis étagère. Elles sont proposées dans la fiche produit de cet entrepôt.</span>
                        </div>
                        <button className="ep2-btn" onClick={() => { setVue('produits'); loadProduits(); }}>
                            <ChevronLeft size={15} /> Retour au stock
                        </button>
                    </div>
                    <div className="vt em">
                        <GestionEmplacements
                            key={entrepotActif.id_entrepot}
                            idEntrepot={entrepotActif.id_entrepot}
                            afficher={(message, type) => showToast(type === 'success' ? 'success' : 'error', message)}
                        />
                    </div>
                </section>
            )}

            {vue === 'produits' && (() => {
                const recherche = searchQuery.trim() !== '';
                const zoneActive = dossierZone !== null && dossierZone !== '' ? arbre.zones.find((z) => z.nom === dossierZone) : null;
                const titre = recherche
                    ? `Résultats pour « ${searchQuery.trim()} »`
                    : stockFilter === 'low' ? 'Stock bas'
                    : stockFilter === 'out' ? 'Ruptures'
                    : dossierZone === null ? "Tout l'entrepôt"
                    : dossierZone === '' ? 'Non rangé'
                    : dossierRayon !== null ? `${dossierZone} › ${dossierRayon}` : dossierZone;
                const nbBas = produitsTries.filter((p) => stockState(p).key === 'low').length;
                const nbOut = produitsTries.filter((p) => stockState(p).key === 'out').length;
                const dossier = (actif, onClick, contenu, extra = '') => (
                    <button type="button" className={`ex-dossier ${actif ? 'is-on' : ''} ${extra}`} aria-current={actif ? 'true' : undefined} onClick={onClick}>
                        {contenu}
                    </button>
                );
                const toutActif = !recherche && dossierZone === null && stockFilter === 'all';
                return (
                    <div className="ex">
                        {/* Arbre des emplacements */}
                        <nav className="ex-arbre" aria-label="Emplacements de l'entrepôt">
                            {dossier(toutActif, () => ouvrirDossier(null), (<>
                                <Warehouse size={16} /><span className="ex-nom">Tout l'entrepôt</span><span className="ex-n">{stats.total}</span>
                            </>))}

                            <div className="ex-titre">Emplacements</div>
                            {arbre.zones.length === 0 && arbre.nonRanges === 0 && (
                                <p className="ex-vide">Aucun emplacement pour le moment.</p>
                            )}
                            <ol className="ex-liste">
                                {arbre.zones.map((z) => {
                                    const zoneOn = !recherche && stockFilter === 'all' && dossierZone === z.nom;
                                    return (
                                        <li key={z.nom}>
                                            {dossier(zoneOn && dossierRayon === null, () => ouvrirDossier(z.nom), (<>
                                                <span className="ex-plaque">{initialesZone(z.nom)}</span>
                                                <span className="ex-nom">{z.nom}</span>
                                                {z.out > 0 && <span className="ex-pastille is-out" title={`${z.out} en rupture`}>{z.out}</span>}
                                                {z.bas > 0 && <span className="ex-pastille is-low" title={`${z.bas} en stock bas`}>{z.bas}</span>}
                                                <span className="ex-n">{z.n}</span>
                                            </>))}
                                            {zoneOn && z.rayons.length > 0 && (
                                                <ol className="ex-sous">
                                                    {z.rayons.map(([ry, n]) => (
                                                        <li key={ry}>
                                                            {dossier(dossierRayon === ry, () => ouvrirDossier(z.nom, ry), (<>
                                                                <span className="ex-nom">{ry}</span><span className="ex-n">{n}</span>
                                                            </>))}
                                                        </li>
                                                    ))}
                                                </ol>
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>
                            {arbre.nonRanges > 0 && dossier(!recherche && stockFilter === 'all' && dossierZone === '', () => ouvrirDossier(''), (<>
                                <Box size={16} /><span className="ex-nom">Non rangé</span><span className="ex-pastille is-low">{arbre.nonRanges}</span>
                            </>))}

                            <div className="ex-titre">À surveiller</div>
                            {dossier(!recherche && stockFilter === 'low', () => ouvrirDossier(null, null, 'low'), (<>
                                <AlertTriangle size={16} /><span className="ex-nom">Stock bas</span>
                                {stats.low > 0 ? <span className="ex-pastille is-low">{stats.low}</span> : <span className="ex-n">0</span>}
                            </>))}
                            {dossier(!recherche && stockFilter === 'out', () => ouvrirDossier(null, null, 'out'), (<>
                                <XCircle size={16} /><span className="ex-nom">Ruptures</span>
                                {stats.out > 0 ? <span className="ex-pastille is-out">{stats.out}</span> : <span className="ex-n">0</span>}
                            </>))}

                            <button type="button" className="ex-gerer" onClick={() => setVue('listes')}>
                                <Settings size={15} /> Gérer les emplacements
                            </button>
                        </nav>

                        {/* Contenu du dossier */}
                        <section className="ex-contenu" aria-label={titre}>
                            <div className="ex-tete">
                                <div className="ex-tete-titre">
                                    {!recherche && dossierRayon !== null && (
                                        <button type="button" className="ex-retour" onClick={() => ouvrirDossier(dossierZone)} aria-label={`Revenir à ${dossierZone}`}>
                                            <ChevronLeft size={16} />
                                        </button>
                                    )}
                                    <div>
                                        <h2>{titre}</h2>
                                        <p>
                                            {produitsTries.length} produit{produitsTries.length > 1 ? 's' : ''}
                                            {nbBas > 0 && stockFilter === 'all' && ` · ${nbBas} en stock bas`}
                                            {nbOut > 0 && stockFilter === 'all' && ` · ${nbOut} en rupture`}
                                            {recherche && " · dans tout l'entrepôt"}
                                            {zoneActive && dossierRayon === null && zoneActive.rayons.length > 0 && ` · ${zoneActive.rayons.length} rayon${zoneActive.rayons.length > 1 ? 's' : ''}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="ep2-search ex-recherche">
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="Rechercher un produit dans tout l'entrepôt"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        aria-label="Rechercher un produit"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} aria-label="Effacer la recherche"><X size={14} /></button>
                                    )}
                                </div>
                                <button className="ep2-icon-btn" onClick={loadProduits} disabled={loadingProduits}
                                        title="Rafraîchir" aria-label="Rafraîchir">
                                    <RefreshCw size={16} className={loadingProduits ? 'ep-spin' : ''} />
                                </button>
                            </div>

                            {loadingProduits ? (
                                <div className="ep2-state"><Loader className="ep-spin" size={24} /> Chargement des produits…</div>
                            ) : errorProduits ? (
                                <div className="ep2-state">
                                    <AlertCircle size={36} />
                                    <strong>Chargement impossible</strong>
                                    <span>{errorProduits}</span>
                                    <button className="ep2-btn" onClick={loadProduits}><RefreshCw size={15} /> Réessayer</button>
                                </div>
                            ) : produitsTries.length === 0 ? (
                                <div className="ep2-state">
                                    <Box size={40} />
                                    <strong>
                                        {produits.length === 0 ? 'Aucun produit dans cet entrepôt'
                                            : recherche ? 'Aucun produit trouvé'
                                            : stockFilter !== 'all' ? 'Rien à signaler ici' : 'Cet emplacement est vide'}
                                    </strong>
                                    <span>
                                        {produits.length === 0
                                            ? 'Ajoutez votre premier produit pour démarrer la gestion du stock.'
                                            : recherche ? "Essayez un autre nom, une marque ou un emplacement."
                                            : stockFilter !== 'all' ? 'Aucun produit dans cette situation.' : 'Aucun produit rangé ici pour le moment.'}
                                    </span>
                                    {produits.length === 0 ? (
                                        <button className="ep2-btn ep2-btn--primary" onClick={handleOpenAdd}>
                                            <Plus size={15} /> Ajouter un produit
                                        </button>
                                    ) : (
                                        <button className="ep2-btn" onClick={() => ouvrirDossier(null)}>
                                            Voir tout l'entrepôt
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {renderTable(produitsPage, (pageProduitsCourante - 1) * PRODUITS_PAR_PAGE, 'ex', 'ex')}
                                    <div className="ep2-pager">
                                        <span>
                                            {(pageProduitsCourante - 1) * PRODUITS_PAR_PAGE + 1}–
                                            {Math.min(pageProduitsCourante * PRODUITS_PAR_PAGE, produitsTries.length)} sur {produitsTries.length}
                                        </span>
                                        {nbPagesProduits > 1 && (
                                            <div className="ep2-pager-nav">
                                                <button className="ep2-icon-btn" onClick={() => setPageProduits(pageProduitsCourante - 1)}
                                                        disabled={pageProduitsCourante <= 1} aria-label="Page précédente">
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <span>Page {pageProduitsCourante} / {nbPagesProduits}</span>
                                                <button className="ep2-icon-btn" onClick={() => setPageProduits(pageProduitsCourante + 1)}
                                                        disabled={pageProduitsCourante >= nbPagesProduits} aria-label="Page suivante">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </section>
                    </div>
                );
            })()}

            {/* Modales */}
            {showRejoindre && (
                <ModalRejoindre
                    token={token}
                    onClose={() => setShowRejoindre(false)}
                    onJoined={handleEntrepotRejoint}
                />
            )}

            {Object.keys(panier).length > 0 && !showLot && (
                <div className="ep2-cart" role="region" aria-label="Panier de transfert">
                    <span><b>{Object.keys(panier).length}</b> produit(s) dans le panier</span>
                    <button className="ep2-cart-clear" onClick={viderPanier}>Vider</button>
                    <button className="ep2-cart-go" onClick={() => setShowLot(true)}>
                        <Send size={15} /> Transférer la sélection
                    </button>
                </div>
            )}

            {showLot && (
                <ModalTransfertLot
                    token={token}
                    entrepotId={entrepotActif.id_entrepot}
                    produits={produits.filter((p) => panier[getPid(p)])}
                    estProprietaire={transfertsInfo.est_proprietaire}
                    onClose={() => setShowLot(false)}
                    onRetirer={(id) => setPanier((prev) => { const n = { ...prev }; delete n[id]; return n; })}
                    onError={(msg) => showToast('error', msg)}
                    onCreated={(res) => {
                        setShowLot(false);
                        setPanier({});
                        const liste = res?.data || [];
                        const applique = liste.length > 0 && liste.every((r) => r.statut === 'valide');
                        showToast('success', res?.message || (applique ? 'Transferts effectués' : 'Demandes envoyées'));
                        if (applique) loadProduits();
                        refreshTransfertsCount();
                        if (!applique) setVue('transferts');
                    }}
                />
            )}

            {produitToTransfer && (
                <ModalTransfert
                    token={token}
                    entrepotId={entrepotActif.id_entrepot}
                    produit={produitToTransfer}
                    estProprietaire={transfertsInfo.est_proprietaire}
                    onClose={() => setProduitToTransfer(null)}
                    onCreated={handleTransfertCreated}
                    onError={(msg) => showToast('error', msg)}
                />
            )}

            {showCreate && (
                <ModalCreate
                    token={token}
                    onClose={() => setShowCreate(false)}
                    onCreated={handleEntrepotCreated}
                    onError={(msg) => showToast('error', msg)}
                />
            )}

            {showAddProduit && (
                <ModalAddProduit
                    token={token}
                    entrepotId={entrepotActif.id_entrepot}
                    produit={produitEnEdition}
                    onClose={handleCloseModal}
                    onAdded={handleProduitSaved}
                    onError={(msg) => showToast('error', msg)}
                />
            )}

            {produitToDelete && (
                <ConfirmModal
                    title="Supprimer ce produit ?"
                    message={`« ${produitToDelete.nom} » sera retiré de l'entrepôt ${entrepotActif.nom}. Cette action est irréversible.`}
                    confirmLabel={deleting ? 'Suppression…' : 'Supprimer'}
                    cancelLabel="Annuler"
                    danger
                    busy={deleting}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => !deleting && setProduitToDelete(null)}
                />
            )}
        </div>
    );
}