// pages/AssistantAchat/AssistantAchat.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Bot, Package, Truck, Check, X, RefreshCw, AlertCircle,
    ChevronRight, Loader, Sparkles, TrendingUp, Phone, Mail,
    MapPin, Plus, Minus, Trash2, ShoppingCart, ChevronDown,
    ChevronUp, Info, AlertTriangle
} from 'lucide-react';
import AssistantAchatService from '../../services/assistantAchatService';
import { useUser } from '../../context/AuthContext';
import StockSelector from '../../components/StockSelector/StockSelector';
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

    // Fermer au clic extérieur
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

    // Construire la liste : unité de base + toutes les unités personnalisées
    const toutesUnites = useMemo(() => {
        const list = [];

        // Unité de base (id = null)
        if (uniteBaseNom) {
            list.push({
                id_unite_vente: null,
                nom: uniteBaseNom,
                quantite_base: 1,
                prix_achat: null,
                is_base: true,
            });
        }

        // Unités personnalisées (triées par quantite_base croissant)
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

    // Une seule unité → pas de dropdown, juste un label
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

    const [selection, setSelection] = useState({});
    const [ouverts, setOuverts] = useState({});

    // ============ CHARGEMENT ============
    const loadProposition = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);

        try {
            const res = await AssistantAchatService.getProposition(token, niveau);

            if (res.success) {
                setData(res.data);

                // ✅ Init sélection : tout coché par défaut
                const sel = {};
                (res.data.fournisseurs || []).forEach(f => {
                    f.produits.forEach(p => {
                        const uvProposee = p.unite_proposee;

                        const qteProposee = Math.max(
                            1,
                            parseInt(p.quantite_proposee_uv, 10) || 1
                        );

                        // Prix unitaire de l'unité proposée (fallback sur prix produit)
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
                            // Besoin en base (constant quand on change d'unité)
                            besoin_base: p.besoin_base || (qteProposee * (uvProposee?.quantite_base || 1)) || 1,
                        };
                    });
                });
                setSelection(sel);

                // Ouvrir tous les fournisseurs par défaut
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
    }, [token, niveau]);

    useEffect(() => {
        if (isAuthenticated && token) {
            loadProposition();
        }
    }, [isAuthenticated, token, loadProposition]);

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

    // ✅ Changer l'unité de vente
    const changeUnite = (idProduit, unite) => {
        setSelection(prev => {
            const current = prev[idProduit];

            // Le besoin en base reste CONSTANT quand on change d'unité
            const besoinBase = current.besoin_base ||
                (current.quantite_uv * current.quantite_base) || 1;

            // Recalcul de la quantité dans la nouvelle unité
            const nouvelleQteBase = parseFloat(unite.quantite_base) || 1;
            const nouvelleQteUV = Math.max(1, Math.ceil(besoinBase / nouvelleQteBase));

            // Prix unitaire de la nouvelle unité
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

                    // ✅ Prix de l'unité choisie
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
            alert('Veuillez sélectionner au moins un produit');
            return;
        }

        if (!window.confirm(
            `Créer ${totalSelectionne.fournisseurs} bon(s) de commande pour ${totalSelectionne.produits} produit(s) ?`
        )) return;

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
                        id_produit: p.id_produit,
                        id_unite_vente: s.id_unite_vente || null,
                        nom_unite_vente: s.nom_unite_vente || 'Unité',
                        quantite_base: qteBase,
                        quantite: qteUV,
                        quantite_totale_base: qteTotaleBase,
                        // ✅ Prix de l'unité choisie
                        prix_achat: s.prix_unitaire || p.prix_unitaire || null,
                    };

                    lignes.push(ligne);
                });

                if (lignes.length > 0) {
                    groupes.push({ id_fournisseur: f.id_fournisseur, lignes });
                }
            });

            if (groupes.length === 0) {
                alert('Aucun groupe valide à créer');
                return;
            }

            const payload = {
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
                    alert(`${nbCrees} bon(s) créé(s).\n${nbErreurs} erreur(s) :\n${detail}`);
                } else {
                    alert(res.message || `${nbCrees} bon(s) créé(s) avec succès`);
                }
                navigate(`/${slug}/commandes-achat`);
            } else {
                alert(res.message || 'Erreur lors de la création');
            }
        } catch (e) {
            console.error('❌ handleCreer error:', e);
            alert(e.message || 'Erreur lors de la création');
        } finally {
            setSaving(false);
        }
    };

    // ============ RENDUS ============
    if (loading && !data) {
        return (
            <div className="assistant-loading">
                <div className="spinner"></div>
                <p>Analyse de votre stock en cours...</p>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="assistant-error">
                <AlertCircle size={40} />
                <p>{error}</p>
                <button className="btn btn-primary" onClick={loadProposition}>
                    <RefreshCw size={16} /> Réessayer
                </button>
            </div>
        );
    }

    if (!data || data.total_produits === 0) {
        return (
            <div className="assistant-container">
                <div className="assistant-header">
                    <div>
                        <h1 className="assistant-title">
                            <Bot size={28} />
                            Assistant de réapprovisionnement
                        </h1>
                        <p className="assistant-subtitle">
                            Analyse automatique de votre stock
                        </p>
                    </div>
                </div>
                <div className="assistant-empty">
                    <div className="assistant-empty-icon">
                        <Check size={48} />
                    </div>
                    <h3>Aucun produit à commander</h3>
                    <p>Votre stock est bien géré. Aucune alerte de rupture ou de stock bas.</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/${slug}/commandes-achat`)}
                    >
                        Voir les commandes d'achat <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="assistant-container">
            {/* ==================== HEADER ==================== */}
            <div className="assistant-header">
                <div>
                    <h1 className="assistant-title">
                        <Bot size={28} />
                        Assistant de réapprovisionnement
                    </h1>
                    <p className="assistant-subtitle">
                        {data.total_produits} produit(s) à commander ·{' '}
                        {data.total_fournisseurs} fournisseur(s)
                    </p>
                </div>
                <div className="assistant-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={loadProposition}
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                        <span>Recalculer</span>
                    </button>
                </div>
            </div>

            {/* ==================== INFO BANNER ==================== */}
            <div className="assistant-info">
                <div className="assistant-info-icon">
                    <Sparkles size={20} />
                </div>
                <div className="assistant-info-content">
                    <strong>Proposition intelligente</strong>
                    <span>
                        Basée sur vos seuils (min/max) et vos ventes des 30 derniers jours.
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
                                    {f.produits.map(p => {
                                        const s = selection[p.id_produit];
                                        const isSel = s?.selected;

                                        // Toutes les unités de vente du produit
                                        const unitesPourSelector = p.unites_vente || [];

                                        return (
                                            <div key={p.id_produit} className={`produit-ligne ${isSel ? 'selected' : ''}`}>
                                                <div className="produit-checkbox">
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

                                                        {/* ✅ Stock actuel décomposé */}
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

                                                    {/* ✅ Sélecteur d'unité */}
                                                    <UniteSelect
                                                        unites={unitesPourSelector}
                                                        uniteBaseNom={p.unite_base_nom}
                                                        selectedId={s?.id_unite_vente}
                                                        onChange={(u) => changeUnite(p.id_produit, u)}
                                                        disabled={!isSel}
                                                    />

                                                    {/* ✅ Équivalent en base */}
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
                        className="btn btn-secondary"
                        onClick={() => navigate(`/${slug}/commandes-achat`)}
                        disabled={saving}
                    >
                        Annuler
                    </button>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleCreer}
                        disabled={saving || totalSelectionne.produits === 0 || totalSelectionne.fournisseurs === 0}
                    >
                        {saving ? (
                            <>
                                <Loader size={18} className="spinning" />
                                <span>Création...</span>
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                <span>Créer {totalSelectionne.fournisseurs} bon(s)</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    ); 
};

export default AssistantAchat;