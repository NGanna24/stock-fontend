// pages/AssistantAchat/AssistantAchat.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Bot, Package, Truck, Check, X, RefreshCw, AlertCircle,
    ChevronRight, Loader, Sparkles, TrendingUp, Phone, Mail,
    MapPin, Plus, Minus, Trash2, ShoppingCart, ChevronDown,
    ChevronUp, Info, AlertTriangle, Store, Warehouse
} from 'lucide-react';
import AssistantAchatService from '../../services/assistantAchatService';
import CommandeAchatService from '../../services/commandeAchatService';
import TransfertStockService from '../../services/transfertStockService';
import { useUser } from '../../context/AuthContext';
import StockSelector from '../../components/StockSelector/StockSelector';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import '../Ventes/Ventes.css';
import '../../components/UI/Vt.css';
import './AssistantAchat.css';

// ============ HELPERS ============
const formatMontant = (v) => {
    const n = parseFloat(v) || 0;
    return Math.round(n).toLocaleString('fr-FR') + ' FCFA';
};

const formatQte = (v, unite) => {
    const n = parseFloat(v) || 0;
    return `${n} ${unite || ''}`.trim();
};

const NIVEAUX = [
    { id: 'urgent', label: 'Urgent',  description: 'Couvrir 7 jours',  color: '#ef4444', bg: '#fef2f2' },
    { id: 'normal', label: 'Normal',  description: 'Couvrir 15 jours', color: '#f59e0b', bg: '#fffbeb' },
    { id: 'large',  label: 'Large',   description: 'Couvrir 30 jours', color: '#10b981', bg: '#ecfdf5' },
];

// ============================================================
// COMPOSANT : Sélecteur d'unité de vente
// ============================================================
const UniteSelect = ({ unites, uniteBaseNom, selectedId, onChange, disabled }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    const toutesUnites = useMemo(() => {
        const list = [];

        if (uniteBaseNom) {
            list.push({
                id_unite_vente: null,
                nom: uniteBaseNom,
                quantite_base: 1,
                prix_achat: null,
                is_base: true,
            });
        }

        (unites || [])
            .filter(u => u && u.nom)
            .sort((a, b) => (a.quantite_base || 1) - (b.quantite_base || 1))
            .forEach(u => {
                list.push({
                    ...u,
                    quantite_base: parseFloat(u.quantite_base) || 1,
                    is_base: false,
                });
            });

        return list;
    }, [unites, uniteBaseNom]);

    const selectedUnite = toutesUnites.find(u => u.id_unite_vente === selectedId)
        || toutesUnites[0];

    if (toutesUnites.length <= 1) {
        return (
            <span className="unite-static">
                {selectedUnite?.nom || 'Unité'}
            </span>
        );
    }

    return (
        <div className="unite-select" ref={ref}>
            <button
                type="button"
                className={`unite-select-trigger ${open ? 'open' : ''}`}
                onClick={() => !disabled && setOpen(v => !v)}
                disabled={disabled}
                title="Changer l'unité de commande"
            >
                <span>{selectedUnite?.nom || 'Unité'}</span>
                {selectedUnite?.quantite_base > 1 && (
                    <small>×{selectedUnite.quantite_base}</small>
                )}
                <ChevronDown size={12} />
            </button>

            {open && (
                <div className="unite-select-menu">
                    {toutesUnites.map(u => (
                        <button
                            key={u.id_unite_vente ?? 'base'}
                            type="button"
                            className={`unite-select-item ${
                                u.id_unite_vente === selectedId ? 'active' : ''
                            }`}
                            onClick={() => {
                                onChange(u);
                                setOpen(false);
                            }}
                        >
                            <span className="unite-name">{u.nom}</span>
                            {u.quantite_base > 1 && (
                                <span className="unite-base">×{u.quantite_base}</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
const AssistantAchat = () => {
    const { isAuthenticated, user } = useUser();
    const { slug = '' } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    // ============ ÉTATS ============
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [niveau, setNiveau] = useState('normal');

    const [transferSel, setTransferSel] = useState({});
    const [livraisonId, setLivraisonId] = useState(null);
    const [savingTransfert, setSavingTransfert] = useState(false);

    // Destination : "magasin" ou "e:<id_entrepot>" (entrepôts dont le compte est propriétaire)
    const [destinations, setDestinations] = useState([]);
    const [scopeKey, setScopeKey] = useState('magasin');
    const [destinationsPretes, setDestinationsPretes] = useState(false);
    const scopeParams = useMemo(
        () => (scopeKey.startsWith('e:')
            ? { destination: 'entrepot', id_entrepot: Number(scopeKey.slice(2)) }
            : { destination: 'magasin' }),
        [scopeKey]
    );
    const isEntrepot = scopeParams.destination === 'entrepot';

    // Propriétaire d'un entrepôt : la marchandise du magasin est livrée à l'entrepôt, puis transférée à la boutique
    const livraison = useMemo(() => {
        if (isEntrepot || destinations.length === 0) return null;
        return destinations.find((d) => d.id_entrepot === livraisonId) || destinations[0];
    }, [isEntrepot, destinations, livraisonId]);

    const [selection, setSelection] = useState({});
    const [ouverts, setOuverts] = useState({});

    // ============ MODAL DE CONFIRMATION / ALERTE ============
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        details: null,
        type: 'warning',
        confirmLabel: 'Confirmer',
        cancelLabel: 'Annuler',
        onConfirm: null,
        hideCancel: false,
    });

    const openConfirm = (config) => {
        setConfirmModal({
            isOpen: true,
            title: config.title || 'Confirmation',
            message: config.message || '',
            details: config.details || null,
            type: config.type || 'warning',
            confirmLabel: config.confirmLabel || 'Confirmer',
            cancelLabel: config.cancelLabel || 'Annuler',
            onConfirm: config.onConfirm || null,
            hideCancel: config.hideCancel || false,
        });
    };

    const closeConfirm = () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    };

    // Alerte simple (1 seul bouton "OK")
    const showAlert = (title, message, type = 'warning') => {
        openConfirm({
            title,
            message,
            type,
            confirmLabel: 'Compris',
            hideCancel: true,
            onConfirm: closeConfirm,
        });
    };

    // ============ DESTINATIONS ============
    useEffect(() => {
        if (!isAuthenticated || !token) return;
        (async () => {
            try {
                const r = await CommandeAchatService.getDestinations(token);
                if (r.success) {
                    const liste = r.data || [];
                    setDestinations(liste);
                    // Propriétaire d'un entrepôt : on commence par l'entrepôt (comme les autres pages d'achat)
                    if (liste.length > 0) setScopeKey(`e:${liste[0].id_entrepot}`);
                }
            } catch (e) {
                console.error('❌ loadDestinations error:', e);
            } finally {
                setDestinationsPretes(true);
            }
        })();
    }, [isAuthenticated, token]);

    // ============ CHARGEMENT ============
    const loadProposition = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);

        try {
            const res = await AssistantAchatService.getProposition(token, niveau, scopeParams);

            if (res.success) {
                setData(res.data);

                const sel = {};
                (res.data.fournisseurs || []).forEach(f => {
                    f.produits.forEach(p => {
                        const uvProposee = p.unite_proposee;

                        const qteProposee = Math.max(
                            1,
                            parseInt(p.quantite_proposee_uv, 10) || 1
                        );

                        const prixUnitaire =
                            uvProposee?.prix_achat ||
                            p.prix_unitaire ||
                            null;

                        sel[p.id_produit] = {
                            selected: true,
                            quantite_uv: qteProposee,
                            id_unite_vente: uvProposee?.id_unite_vente || null,
                            nom_unite_vente: uvProposee?.nom || p.unite_base_nom,
                            quantite_base: parseFloat(uvProposee?.quantite_base) || 1,
                            prix_unitaire: prixUnitaire,
                            besoin_base: p.besoin_base || (qteProposee * (uvProposee?.quantite_base || 1)) || 1,
                        };
                    });
                });
                setSelection(sel);

                const tsel = {};
                (res.data.transferts || []).forEach(t => {
                    tsel[t.id_produit] = {
                        selected: true,
                        quantite_uv: Math.max(1, parseInt(t.quantite_proposee_uv, 10) || 1),
                        id_unite_vente: t.unite_proposee?.id_unite_vente || null,
                        nom_unite_vente: t.unite_proposee?.nom || t.unite_base_nom,
                        quantite_base: parseFloat(t.unite_proposee?.quantite_base) || 1,
                    };
                });
                setTransferSel(tsel);

                const ouv = {};
                (res.data.fournisseurs || []).forEach(f => {
                    ouv[f.id_fournisseur || 'sans_fournisseur'] = true;
                });
                setOuverts(ouv);
            } else {
                setError(res.message || 'Erreur lors du chargement');
            }
        } catch (e) {
            console.error('❌ loadProposition error:', e);
            setError(e.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }, [token, niveau, scopeParams]);

    useEffect(() => {
        if (isAuthenticated && token && destinationsPretes) {
            setData(null);
            loadProposition();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, token, destinationsPretes, niveau, scopeKey]);

    // ============ SÉLECTION ============
    const toggleProduit = (idProduit) => {
        setSelection(prev => ({
            ...prev,
            [idProduit]: { ...prev[idProduit], selected: !prev[idProduit].selected },
        }));
    };

    const toggleFournisseur = (fournisseur) => {
        const allSelected = fournisseur.produits.every(p => selection[p.id_produit]?.selected);
        setSelection(prev => {
            const next = { ...prev };
            fournisseur.produits.forEach(p => {
                next[p.id_produit] = { ...next[p.id_produit], selected: !allSelected };
            });
            return next;
        });
    };

    const updateQuantite = (idProduit, delta) => {
        setSelection(prev => {
            const current = prev[idProduit];
            const newQte = Math.max(1, (current.quantite_uv || 1) + delta);
            const newBesoinBase = newQte * (current.quantite_base || 1);
            return {
                ...prev,
                [idProduit]: {
                    ...current,
                    quantite_uv: newQte,
                    besoin_base: newBesoinBase,
                },
            };
        });
    };

    const setQuantiteExacte = (idProduit, valeur) => {
        const qte = Math.max(1, parseInt(valeur, 10) || 1);
        setSelection(prev => {
            const current = prev[idProduit];
            return {
                ...prev,
                [idProduit]: {
                    ...current,
                    quantite_uv: qte,
                    besoin_base: qte * (current.quantite_base || 1),
                },
            };
        });
    };

    const changeUnite = (idProduit, unite) => {
        setSelection(prev => {
            const current = prev[idProduit];

            const besoinBase = current.besoin_base ||
                (current.quantite_uv * current.quantite_base) || 1;

            const nouvelleQteBase = parseFloat(unite.quantite_base) || 1;
            const nouvelleQteUV = Math.max(1, Math.ceil(besoinBase / nouvelleQteBase));

            const nouveauPrix = unite.prix_achat || current.prix_unitaire || null;

            return {
                ...prev,
                [idProduit]: {
                    ...current,
                    id_unite_vente: unite.id_unite_vente,
                    nom_unite_vente: unite.nom,
                    quantite_base: nouvelleQteBase,
                    quantite_uv: nouvelleQteUV,
                    prix_unitaire: nouveauPrix,
                    besoin_base: besoinBase,
                },
            };
        });
    };

    const toggleAccordion = (key) => {
        setOuverts(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // ============ TRANSFERTS DEPUIS L'ENTREPÔT ============
    const toggleTransfert = (id) =>
        setTransferSel(prev => ({ ...prev, [id]: { ...prev[id], selected: !prev[id].selected } }));

    const maxQteTransfert = (t, qb) =>
        Math.max(1, Math.floor((parseFloat(t.source.stock_base) || 0) / (qb || 1)));

    const setQteTransfert = (t, valeur) => {
        setTransferSel(prev => {
            const cur = prev[t.id_produit];
            const qte = Math.min(maxQteTransfert(t, cur.quantite_base), Math.max(1, parseInt(valeur, 10) || 1));
            return { ...prev, [t.id_produit]: { ...cur, quantite_uv: qte } };
        });
    };

    const changeUniteTransfert = (t, unite) => {
        setTransferSel(prev => {
            const cur = prev[t.id_produit];
            const base = cur.quantite_uv * cur.quantite_base;
            const qb = parseFloat(unite.quantite_base) || 1;
            const qte = Math.min(maxQteTransfert(t, qb), Math.max(1, Math.floor(base / qb)));
            return {
                ...prev,
                [t.id_produit]: {
                    ...cur,
                    id_unite_vente: unite.id_unite_vente,
                    nom_unite_vente: unite.nom,
                    quantite_base: qb,
                    quantite_uv: qte,
                },
            };
        });
    };

    const nbTransfertsSelectionnes = useMemo(
        () => (data?.transferts || []).filter(t => transferSel[t.id_produit]?.selected).length,
        [data, transferSel]
    );

    const handleTransferer = () => {
        if (nbTransfertsSelectionnes === 0) {
            showAlert('Aucun produit sélectionné', 'Sélectionnez au moins un produit à transférer.', 'warning');
            return;
        }
        openConfirm({
            title: 'Confirmer le transfert',
            message: `Demander le transfert de ${nbTransfertsSelectionnes} produit(s) depuis l'entrepôt vers votre magasin ?`,
            type: 'info',
            confirmLabel: 'Transférer',
            cancelLabel: 'Annuler',
            onConfirm: () => { closeConfirm(); executeTransferts(); },
        });
    };

    const executeTransferts = async () => {
        setSavingTransfert(true);
        try {
            // Un panier (= un seul bon) par entrepôt source
            const parEntrepot = new Map();
            (data.transferts || []).forEach(t => {
                const s = transferSel[t.id_produit];
                if (!s?.selected) return;
                const id = t.source.id_entrepot;
                if (!parEntrepot.has(id)) parEntrepot.set(id, []);
                parEntrepot.get(id).push({
                    id_produit_entrepot: t.source.id_produit_entrepot,
                    ...(s.id_unite_vente ? { id_unite_vente: s.id_unite_vente } : {}),
                    quantite: s.quantite_uv,
                });
            });

            const messages = [];
            for (const [idEntrepot, items] of parEntrepot) {
                const res = await TransfertStockService.createLot(token, idEntrepot, {
                    items,
                    motif: 'Réapprovisionnement (assistant d\'achat)',
                });
                if (res?.message) messages.push(res.message);
            }
            showAlert('Transfert', messages.join('\n') || 'Transfert effectué', 'success');
            await loadProposition();
        } catch (e) {
            console.error('❌ executeTransferts error:', e);
            showAlert('Transfert impossible', e.message || 'Erreur lors du transfert', 'danger');
        } finally {
            setSavingTransfert(false);
        }
    };

    // ============ TOTAL SÉLECTIONNÉ ============
    const totalSelectionne = useMemo(() => {
        if (!data) return { produits: 0, fournisseurs: 0, montant: 0, montantInconnu: 0 };
        let produits = 0;
        let fournisseursSet = new Set();
        let montant = 0;
        let montantInconnu = 0;

        (data.fournisseurs || []).forEach(f => {
            let hasSelected = false;
            f.produits.forEach(p => {
                const s = selection[p.id_produit];
                if (s?.selected) {
                    produits += 1;
                    hasSelected = true;

                    const prixUnitaire = s.prix_unitaire || p.prix_unitaire;

                    if (prixUnitaire) {
                        montant += s.quantite_uv * prixUnitaire;
                    } else {
                        montantInconnu += 1;
                    }
                }
            });
            if (hasSelected) fournisseursSet.add(f.id_fournisseur || 'sans');
        });

        return {
            produits,
            fournisseurs: fournisseursSet.size,
            montant,
            montantInconnu,
        };
    }, [data, selection]);

    // ============ CRÉATION ============
    const handleCreer = async () => {
        if (totalSelectionne.produits === 0) {
            showAlert(
                'Aucun produit sélectionné',
                'Veuillez sélectionner au moins un produit.',
                'warning'
            );
            return;
        }

        openConfirm({
            title: 'Confirmer la création',
            message: `Créer ${totalSelectionne.fournisseurs} bon(s) de commande pour ${totalSelectionne.produits} produit(s)${livraison ? ` (livraison à l'entrepôt ${livraison.nom})` : ''} ?`,
            type: 'info',
            confirmLabel: 'Créer',
            cancelLabel: 'Annuler',
            onConfirm: () => {
                closeConfirm();
                executeCreateBons();
            },
        });
    };

    const executeCreateBons = async () => {
        setSaving(true);
        try {
            const groupes = [];
            (data.fournisseurs || []).forEach(f => {
                if (!f.id_fournisseur) {
                    return;
                }

                const lignes = [];
                f.produits.forEach(p => {
                    const s = selection[p.id_produit];

                    if (!s?.selected) {
                        return;
                    }

                    const qteUV = Math.max(1, parseInt(s.quantite_uv, 10) || 1);
                    const qteBase = parseFloat(s.quantite_base) || 1;
                    const qteTotaleBase = qteUV * qteBase;

                    const ligne = {
                        ...(isEntrepot
                            ? { id_produit_entrepot: p.id_produit_entrepot || p.id_produit }
                            : { id_produit: p.id_produit }),
                        id_unite_vente: s.id_unite_vente || null,
                        nom_unite_vente: s.nom_unite_vente || 'Unité',
                        quantite_base: qteBase,
                        quantite: qteUV,
                        quantite_totale_base: qteTotaleBase,
                        prix_achat: s.prix_unitaire || p.prix_unitaire || null,
                    };

                    lignes.push(ligne);
                });

                if (lignes.length > 0) {
                    groupes.push({ id_fournisseur: f.id_fournisseur, lignes });
                }
            });

            if (groupes.length === 0) {
                showAlert(
                    'Aucun groupe valide',
                    'Aucun groupe valide à créer.',
                    'warning'
                );
                return;
            }

            const payload = {
                destination: scopeParams.destination,
                ...(isEntrepot ? { id_entrepot: scopeParams.id_entrepot } : {}),
                // Magasin + entrepôt existant : la commande est livrée à l'entrepôt (produits du magasin)
                ...(livraison ? { destination: 'entrepot', id_entrepot: livraison.id_entrepot, lignes_magasin: true } : {}),
                date_commande: new Date().toISOString().split('T')[0],
                notes: 'Commande générée par l\'assistant',
                groupes,
            };

            const res = await AssistantAchatService.creerBons(token, payload);

            if (res.success) {
                const nbCrees = res.data?.total_crees || 0;
                const nbErreurs = res.data?.total_erreurs || 0;

                if (nbErreurs > 0) {
                    const detail = (res.data?.erreurs || [])
                        .map(e => `• Fournisseur #${e.id_fournisseur}: ${e.message}`)
                        .join('\n');
                    showAlert(
                        'Création partielle',
                        `${nbCrees} bon(s) créé(s).\n${nbErreurs} erreur(s) :\n${detail}`,
                        'warning'
                    );
                } else {
                    showAlert(
                        'Succès',
                        res.message || `${nbCrees} bon(s) créé(s) avec succès`,
                        'success'
                    );
                }

                setTimeout(() => {
                    navigate(`/${slug}/commandes-achat`);
                }, 1500);
            } else {
                showAlert(
                    'Erreur',
                    res.message || 'Erreur lors de la création',
                    'danger'
                );
            }
        } catch (e) {
            console.error('❌ handleCreer error:', e);
            showAlert(
                'Erreur',
                e.message || 'Erreur lors de la création',
                'danger'
            );
        } finally {
            setSaving(false);
        }
    };

    // ============ RENDUS ============
    if (loading && !data) {
        return (
            <div className="ventes-container vt aa assistant-loading">
                <div className="spinner"></div>
                <p>Analyse de votre stock en cours...</p>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="ventes-container vt aa assistant-error">
                {destinations.length > 0 && (
                    <nav className="assistant-scope" aria-label="Destination des commandes">
                        <button type="button" className={`assistant-scope-tab ${!isEntrepot ? 'is-active' : ''}`}
                                onClick={() => setScopeKey('magasin')}>
                            <Store size={16} /> Magasin
                        </button>
                        {destinations.map((d) => (
                            <button key={d.id_entrepot} type="button"
                                    className={`assistant-scope-tab ${scopeKey === `e:${d.id_entrepot}` ? 'is-active' : ''}`}
                                    onClick={() => setScopeKey(`e:${d.id_entrepot}`)}>
                                <Warehouse size={16} /> {d.nom}
                            </button>
                        ))}
                    </nav>
                )}
                <AlertCircle size={40} />
                <p>{error}</p>
                <button className="vt-btn vt-btn--primary" onClick={loadProposition}>
                    <RefreshCw size={16} /> Réessayer
                </button>
            </div>
        );
    }

    if (!data || data.total_produits === 0) {
        return (
            <div className="ventes-container vt aa assistant-container">
                <header className="vt-head assistant-header">
                    <div>
                        <h1 className="vt-title">Assistant de réapprovisionnement</h1>
                        <p className="vt-sub">
                            {isEntrepot ? 'Analyse automatique du stock de l\'entrepôt' : 'Analyse automatique de votre stock'}
                        </p>
                    </div>
                </header>
                {destinations.length > 0 && (
                    <nav className="assistant-scope" aria-label="Destination des commandes">
                        <button type="button" className={`assistant-scope-tab ${!isEntrepot ? 'is-active' : ''}`}
                                onClick={() => setScopeKey('magasin')} disabled={loading}>
                            <Store size={16} /> Magasin
                        </button>
                        {destinations.map((d) => (
                            <button key={d.id_entrepot} type="button"
                                    className={`assistant-scope-tab ${scopeKey === `e:${d.id_entrepot}` ? 'is-active' : ''}`}
                                    onClick={() => setScopeKey(`e:${d.id_entrepot}`)} disabled={loading}>
                                <Warehouse size={16} /> {d.nom}{d.ville ? <small>{d.ville}</small> : null}
                            </button>
                        ))}
                    </nav>
                )}
                <div className="assistant-empty">
                    <div className="assistant-empty-icon">
                        <Check size={48} />
                    </div>
                    <h3>Aucun produit à réapprovisionner</h3>
                    <p>Votre stock est bien géré. Aucune alerte de rupture ou de stock bas.</p>
                    <button
                        className="vt-btn vt-btn--primary"
                        onClick={() => navigate(`/${slug}/commandes-achat`)}
                    >
                        Voir les commandes d'achat <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="ventes-container vt aa assistant-container">
                {/* ==================== HEADER ==================== */}
                <header className="vt-head assistant-header">
                    <div>
                        <h1 className="vt-title">Assistant de réapprovisionnement</h1>
                        <p className="vt-sub">
                            {data.total_produits} produit(s) à réapprovisionner ·{' '}
                            {(data.transferts || []).length} à transférer ·{' '}
                            {data.fournisseurs.length} fournisseur(s) à commander
                        </p>
                    </div>
                    <div className="vt-head-actions">
                        <button
                            className="vt-btn"
                            onClick={loadProposition}
                            disabled={loading}
                        >
                            <RefreshCw size={16} className={loading ? 'vt-spin' : ''} />
                            <span>Recalculer</span>
                        </button>
                    </div>
                </header>

                {destinations.length > 0 && (
                    <nav className="assistant-scope" aria-label="Destination des commandes">
                        <button type="button" className={`assistant-scope-tab ${!isEntrepot ? 'is-active' : ''}`}
                                onClick={() => setScopeKey('magasin')} disabled={loading}>
                            <Store size={16} /> Magasin
                        </button>
                        {destinations.map((d) => (
                            <button key={d.id_entrepot} type="button"
                                    className={`assistant-scope-tab ${scopeKey === `e:${d.id_entrepot}` ? 'is-active' : ''}`}
                                    onClick={() => setScopeKey(`e:${d.id_entrepot}`)} disabled={loading}>
                                <Warehouse size={16} /> {d.nom}{d.ville ? <small>{d.ville}</small> : null}
                            </button>
                        ))}
                    </nav>
                )}

                {/* ==================== INFO BANNER ==================== */}
                <div className="assistant-info">
                    <div className="assistant-info-content">
                        <strong>Proposition intelligente</strong>
                        <span>
                            {isEntrepot ? 'Basée sur les seuils (min/max) de l\'entrepôt et ses sorties des 30 derniers jours (transferts, pertes…).' : 'Basée sur vos seuils (min/max) et vos ventes des 30 derniers jours.'}
                            Vous pouvez tout ajuster avant de valider.
                        </span>
                    </div>
                </div>

                {/* ==================== NIVEAU ==================== */}
                <div className="assistant-niveaux">
                    <span className="niveaux-label">Niveau de couverture :</span>
                    <div className="niveaux-list">
                        {NIVEAUX.map(n => (
                            <button
                                key={n.id}
                                className={`niveau-btn ${niveau === n.id ? 'active' : ''}`}
                                onClick={() => setNiveau(n.id)}
                                style={{
                                    '--niveau-color': n.color,
                                    '--niveau-bg': n.bg,
                                }}
                                disabled={loading}
                            >
                                <strong>{n.label}</strong>
                                <small>{n.description}</small>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ==================== À TRANSFÉRER DEPUIS L'ENTREPÔT ==================== */}
                {(data.transferts || []).length > 0 && (
                    <section className="transfert-bloc">
                        <div className="transfert-header">
                            <div className="fournisseur-icon"><Warehouse size={20} /></div>
                            <div className="fournisseur-info">
                                <h3>Disponible dans l'entrepôt : transférez, ne commandez pas</h3>
                                <div className="fournisseur-contacts">
                                    <span>Ces produits manquent à la boutique mais sont en stock dans un entrepôt.</span>
                                </div>
                            </div>
                            <div className="fournisseur-stat">
                                <span className="fs-value">{nbTransfertsSelectionnes}/{data.transferts.length}</span>
                                <span className="fs-label">produits</span>
                            </div>
                        </div>
                        <div className="fournisseur-produits">
                            {data.transferts.map((t, idxT) => {
                                const s = transferSel[t.id_produit];
                                const isSel = s?.selected;
                                const unitesSource = t.source.unites_vente || [];
                                return (
                                    <div key={t.id_produit} className={`produit-ligne ${isSel ? 'selected' : ''}`}>
                                        <div className="produit-checkbox">
                                            <span className="produit-num">{idxT + 1}</span>
                                            <input type="checkbox" checked={!!isSel} onChange={() => toggleTransfert(t.id_produit)} />
                                        </div>
                                        <div className="produit-info">
                                            <div className="produit-nom">
                                                {t.produit_nom}
                                                {t.marque_nom && <small> · {t.marque_nom}</small>}
                                            </div>
                                            <div className="produit-meta">
                                                <span className={`alerte-badge ${t.type_alerte}`}>
                                                    {t.type_alerte === 'rupture' ? 'Rupture' : 'Stock bas'}
                                                </span>
                                                <span className="stock-inline">
                                                    <span className="stock-inline-label">Boutique :</span>
                                                    <StockSelector
                                                        idProduit={`assistant-t-${t.id_produit}`}
                                                        stockBase={t.quantite_stock}
                                                        unitesVente={t.unites_vente || []}
                                                        uniteBase={{ nom: t.unite_base_nom, symbole: t.unite_base_symbole }}
                                                        variant="list"
                                                    />
                                                </span>
                                                <span className="stock-entrepot">
                                                    <Warehouse size={12} />
                                                    {t.source.entrepot_nom} :
                                                    <StockSelector
                                                        idProduit={`assistant-te-${t.id_produit}`}
                                                        stockBase={t.source.stock_base}
                                                        unitesVente={unitesSource}
                                                        uniteBase={{ nom: t.unite_base_nom, symbole: t.unite_base_symbole }}
                                                        variant="list"
                                                    />
                                                </span>
                                                {t.autres_entrepots > 0 && (
                                                    <span className="en-commande">+ {t.autres_entrepots} autre(s) entrepôt(s)</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="produit-quantite">
                                            <button className="qte-btn" disabled={!isSel || s.quantite_uv <= 1}
                                                    onClick={() => setQteTransfert(t, s.quantite_uv - 1)}>
                                                <Minus size={14} />
                                            </button>
                                            <input type="number" className="qte-input" min="1" step="1"
                                                   value={s?.quantite_uv || 1} disabled={!isSel}
                                                   onChange={(e) => setQteTransfert(t, e.target.value)} />
                                            <button className="qte-btn"
                                                    disabled={!isSel || s.quantite_uv >= maxQteTransfert(t, s.quantite_base)}
                                                    onClick={() => setQteTransfert(t, s.quantite_uv + 1)}>
                                                <Plus size={14} />
                                            </button>
                                            <UniteSelect
                                                unites={unitesSource}
                                                uniteBaseNom={t.unite_base_nom}
                                                selectedId={s?.id_unite_vente}
                                                onChange={(u) => changeUniteTransfert(t, u)}
                                                disabled={!isSel}
                                            />
                                            {s?.quantite_base > 1 && (
                                                <span className="qte-equivalent">= {s.quantite_uv * s.quantite_base} {t.unite_base_nom}</span>
                                            )}
                                        </div>
                                        <div className="produit-prix">
                                            <span className="prix-value">{t.source.est_proprietaire ? 'Immédiat' : 'Sur approbation'}</span>
                                            <small className="prix-detail">
                                                {t.source.est_proprietaire ? 'vous êtes propriétaire' : 'validé par le propriétaire'}
                                            </small>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {livraison && data.fournisseurs.length > 0 && (
                    <div className="livraison-banner">
                        <Warehouse size={18} />
                        <div>
                            <strong>Livraison à l'entrepôt {livraison.nom}</strong>
                            <span>Vous avez un entrepôt : la marchandise commandée y arrive d'abord, puis vous la transférez à la boutique.</span>
                        </div>
                        {destinations.length > 1 && (
                            <select value={livraison.id_entrepot} onChange={(e) => setLivraisonId(Number(e.target.value))}>
                                {destinations.map(d => <option key={d.id_entrepot} value={d.id_entrepot}>{d.nom}</option>)}
                            </select>
                        )}
                    </div>
                )}

                {/* ==================== FOURNISSEURS ==================== */}
                <div className="assistant-fournisseurs">
                    {data.fournisseurs.map((f) => {
                        const key = f.id_fournisseur || 'sans_fournisseur';
                        const isOpen = ouverts[key];
                        const produitsSelectionnes = f.produits.filter(p => selection[p.id_produit]?.selected);
                        const allSelected = produitsSelectionnes.length === f.produits.length;
                        const someSelected = produitsSelectionnes.length > 0 && !allSelected;

                        return (
                            <div key={key} className={`fournisseur-bloc ${isOpen ? 'open' : ''}`}>
                                <div className="fournisseur-header">
                                    <button
                                        className="fournisseur-toggle"
                                        onClick={() => toggleAccordion(key)}
                                    >
                                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>

                                    <div className="fournisseur-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            ref={el => {
                                                if (el) el.indeterminate = someSelected;
                                            }}
                                            onChange={() => toggleFournisseur(f)}
                                        />
                                    </div>

                                    <div className="fournisseur-icon">
                                        <Truck size={20} />
                                    </div>

                                    <div className="fournisseur-info">
                                        <h3>{f.fournisseur_nom}</h3>
                                        <div className="fournisseur-contacts">
                                            {f.fournisseur_telephone && (
                                                <span><Phone size={12} /> {f.fournisseur_telephone}</span>
                                            )}
                                            {f.fournisseur_email && (
                                                <span><Mail size={12} /> {f.fournisseur_email}</span>
                                            )}
                                            {f.fournisseur_ville && (
                                                <span><MapPin size={12} /> {f.fournisseur_ville}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="fournisseur-stats">
                                        <div className="fournisseur-stat">
                                            <span className="fs-value">{produitsSelectionnes.length}/{f.produits.length}</span>
                                            <span className="fs-label">produits</span>
                                        </div>
                                        {f.total_estime > 0 && (
                                            <div className="fournisseur-stat">
                                                <span className="fs-value">{formatMontant(f.total_estime)}</span>
                                                <span className="fs-label">estimé</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="fournisseur-produits">
                                        {f.produits.map((p, idxP) => {
                                            const s = selection[p.id_produit];
                                            const isSel = s?.selected;

                                            const unitesPourSelector = p.unites_vente || [];

                                            return (
                                                <div key={p.id_produit} className={`produit-ligne ${isSel ? 'selected' : ''}`}>
                                                    <div className="produit-checkbox">
                                                        <span className="produit-num">{idxP + 1}</span>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSel}
                                                            onChange={() => toggleProduit(p.id_produit)}
                                                        />
                                                    </div>

                                                    <div className="produit-info">
                                                        <div className="produit-nom">
                                                            {p.produit_nom}
                                                            {p.marque_nom && <small> · {p.marque_nom}</small>}
                                                        </div>
                                                        <div className="produit-meta">
                                                            <span className={`alerte-badge ${p.type_alerte}`}>
                                                                {p.type_alerte === 'rupture' ? 'Rupture' : 'Stock bas'}
                                                            </span>

                                                            <span className="stock-inline">
                                                                <span className="stock-inline-label">Stock :</span>
                                                                <StockSelector
                                                                    idProduit={`assistant-${p.id_produit}`}
                                                                    stockBase={p.quantite_stock}
                                                                    unitesVente={unitesPourSelector}
                                                                    uniteBase={{
                                                                        nom: p.unite_base_nom,
                                                                        symbole: p.unite_base_symbole,
                                                                    }}
                                                                    variant="list"
                                                                />
                                                                <span className="stock-inline-min">
                                                                    / min {p.quantite_minimale}
                                                                </span>
                                                            </span>

                                                            {p.quantite_en_commande > 0 && (
                                                                <span className="en-commande">
                                                                    <span>⏳</span>
                                                                    <StockSelector
                                                                        idProduit={`assistant-cmd-${p.id_produit}`}
                                                                        stockBase={p.quantite_en_commande}
                                                                        unitesVente={unitesPourSelector}
                                                                        uniteBase={{
                                                                            nom: p.unite_base_nom,
                                                                            symbole: p.unite_base_symbole,
                                                                        }}
                                                                        variant="list"
                                                                    />
                                                                    <span>en commande</span>
                                                                </span>
                                                            )}

                                                            {p.ventes_30j_base > 0 && (
                                                                <span className="vitesse">
                                                                    <TrendingUp size={12} />
                                                                    {p.vitesse_jour}/j
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="produit-quantite">
                                                        <button
                                                            className="qte-btn"
                                                            onClick={() => updateQuantite(p.id_produit, -1)}
                                                            disabled={!isSel || s.quantite_uv <= 1}
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            className="qte-input"
                                                            value={s?.quantite_uv || 1}
                                                            onChange={(e) => setQuantiteExacte(p.id_produit, e.target.value)}
                                                            onBlur={(e) => {
                                                                if (!e.target.value || parseInt(e.target.value, 10) < 1) {
                                                                    setQuantiteExacte(p.id_produit, 1);
                                                                }
                                                            }}
                                                            disabled={!isSel}
                                                            min="1"
                                                            step="1"
                                                        />
                                                        <button
                                                            className="qte-btn"
                                                            onClick={() => updateQuantite(p.id_produit, 1)}
                                                            disabled={!isSel}
                                                        >
                                                            <Plus size={14} />
                                                        </button>

                                                        <UniteSelect
                                                            unites={unitesPourSelector}
                                                            uniteBaseNom={p.unite_base_nom}
                                                            selectedId={s?.id_unite_vente}
                                                            onChange={(u) => changeUnite(p.id_produit, u)}
                                                            disabled={!isSel}
                                                        />

                                                        {s?.quantite_base > 1 && (
                                                            <span className="qte-equivalent">
                                                                = {s.quantite_uv * s.quantite_base} {p.unite_base_nom}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="produit-prix">
                                                        {(() => {
                                                            const prixUnitaire = s?.prix_unitaire || p.prix_unitaire;
                                                            if (prixUnitaire) {
                                                                return (
                                                                    <>
                                                                        <span className="prix-value">
                                                                            {formatMontant(s.quantite_uv * prixUnitaire)}
                                                                        </span>
                                                                        <small className="prix-detail">
                                                                            {formatMontant(prixUnitaire)} / {s.nom_unite_vente || 'unité'}
                                                                        </small>
                                                                    </>
                                                                );
                                                            }
                                                            return (
                                                                <span className="prix-inconnu">
                                                                    À définir
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ==================== RÉCAP FLOTTANT ==================== */}
                <div className="assistant-recap">
                    <div className="recap-content">
                        <div className="recap-item">
                            <ShoppingCart size={18} />
                            <div>
                                <strong>{totalSelectionne.produits}</strong>
                                <span>produit(s)</span>
                            </div>
                        </div>
                        <div className="recap-item">
                            <Truck size={18} />
                            <div>
                                <strong>{totalSelectionne.fournisseurs}</strong>
                                <span>fournisseur(s)</span>
                            </div>
                        </div>
                        <div className="recap-item">
                            <Package size={18} />
                            <div>
                                <strong>{totalSelectionne.montant > 0 ? formatMontant(totalSelectionne.montant) : '—'}</strong>
                                <span>
                                    {totalSelectionne.montantInconnu > 0
                                        ? `+ ${totalSelectionne.montantInconnu} prix à définir`
                                        : 'Total estimé'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="recap-actions">
                        <button
                            className="vt-btn"
                            onClick={() => navigate(`/${slug}/commandes-achat`)}
                            disabled={saving || savingTransfert}
                        >
                            Annuler
                        </button>
                        {(data.transferts || []).length > 0 && (
                            <button
                                className="vt-btn vt-btn--primary vt-btn--lg"
                                onClick={handleTransferer}
                                disabled={savingTransfert || saving || nbTransfertsSelectionnes === 0}
                            >
                                {savingTransfert ? (
                                    <><Loader size={18} className="vt-spin" /><span>Transfert...</span></>
                                ) : (
                                    <><Warehouse size={18} /><span>Transférer {nbTransfertsSelectionnes} produit(s)</span></>
                                )}
                            </button>
                        )}
                        {data.fournisseurs.length > 0 && (
                        <button
                            className="vt-btn vt-btn--primary vt-btn--lg"
                            onClick={handleCreer}
                            disabled={saving || savingTransfert || totalSelectionne.produits === 0 || totalSelectionne.fournisseurs === 0}
                        >
                            {saving ? (
                                <>
                                    <Loader size={18} className="vt-spin" />
                                    <span>Création...</span>
                                </>
                            ) : (
                                <>
                                    <Check size={18} />
                                    <span>Créer {totalSelectionne.fournisseurs} bon(s)</span>
                                </>
                            )}
                        </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ============================================================
                MODAL DE CONFIRMATION / ALERTE
                ============================================================ */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmModal.onConfirm || closeConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                details={confirmModal.details}
                type={confirmModal.type}
                confirmLabel={confirmModal.confirmLabel}
                cancelLabel={confirmModal.cancelLabel}
                loading={saving}
                hideCancel={confirmModal.hideCancel}
            />
        </>
    );
};

export default AssistantAchat;