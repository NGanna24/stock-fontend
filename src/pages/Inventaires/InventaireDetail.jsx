// pages/Inventaires/InventaireDetail.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft, PlayCircle, CheckCircle, Ban, Save,
    Search, AlertCircle, Package, X, AlertTriangle,
    Info, CheckCheck, TrendingDown, TrendingUp
} from "lucide-react";
import InventaireService from "../../services/inventaireService";
import { useUser } from "../../context/AuthContext";
import StockSelector from "../../components/StockSelector/StockSelector";
import "./Inventaires.css";

// ============================================================
// HELPERS
// ============================================================
const formatMontant = (v) => {
    const n = parseFloat(v) || 0;
    return Math.round(n).toLocaleString('fr-FR') + ' FCFA';
};

const parseQuantite = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    const n = parseInt(String(v).replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? 0 : n;
};

const formatQuantite = (v) => {
    const n = parseQuantite(v);
    return n.toLocaleString('fr-FR');
};

// ============================================================
// COMPOSANT
// ============================================================
const InventaireDetail = () => {
    const { id, slug } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();
    const token = localStorage.getItem('token');

    const [inventaire, setInventaire] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [onlyEcarts, setOnlyEcarts] = useState(false);
    const [onlyNonSaisis, setOnlyNonSaisis] = useState(false);

    const [saisies, setSaisies] = useState({});
    const [saving, setSaving] = useState(false);
    const [showValidModal, setShowValidModal] = useState(false);
    const [validating, setValidating] = useState(false);

    const inputRefs = useRef({});

    const canManage = user && ['admin', 'manager', 'gestionnaire'].includes(user.role);

    useEffect(() => {
        if (!id || id === 'undefined' || id === 'null') {
            setError('Identifiant d\'inventaire manquant');
            setLoading(false);
            return;
        }
        loadInventaire();
    }, [id]);

    const loadInventaire = async () => {
        if (!id || id === 'undefined' || id === 'null') return;

        setLoading(true);
        setError(null);
        try {
            const res = await InventaireService.getById(token, id);
            if (res.success) {
                setInventaire(res.data);
                const initial = {};
                (res.data.lignes || []).forEach(l => {
                    initial[l.id_ligne] = parseQuantite(l.quantite_reelle);
                });
                setSaisies(initial);
            } else {
                setError(res.message || 'Inventaire non trouvé');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // SAISIE
    // ============================================================
    const handleSaisieChange = (idLigne, value) => {
        const cleaned = String(value).replace(/[^0-9]/g, '');
        setSaisies(prev => ({ ...prev, [idLigne]: cleaned }));
    };

    const handleKeyDown = (e, index, filteredLignes) => {
        if (['.', ',', '-', '+', 'e', 'E'].includes(e.key)) {
            e.preventDefault();
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (index < filteredLignes.length - 1) {
                const nextId = filteredLignes[index + 1].id_ligne;
                const nextInput = inputRefs.current[nextId];
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select();
                }
            }
        }
    };

    // ============================================================
    // SAUVEGARDE
    // ============================================================
    const handleSaveAll = async (showAlert = true) => {
        setSaving(true);
        try {
            const lignes = Object.entries(saisies)
                .filter(([_, qte]) => qte !== "" && qte !== null && qte !== undefined)
                .map(([idLigne, qte]) => ({
                    id_ligne: parseInt(idLigne, 10),
                    quantite_reelle: parseQuantite(qte)
                }));

            const res = await InventaireService.saisirLignesEnMasse(token, id, lignes);
            if (res.success) {
                await loadInventaire();
                if (showAlert) alert(`✅ ${res.data?.count || lignes.length} ligne(s) sauvegardée(s)`);
            }
        } catch (e) {
            alert('Erreur : ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToutConforme = () => {
        if (!window.confirm('Marquer tous les produits comme conformes (quantité réelle = quantité théorique) ?')) return;
        const nouvelles = { ...saisies };
        (inventaire.lignes || []).forEach(l => {
            nouvelles[l.id_ligne] = parseQuantite(l.quantite_theorique);
        });
        setSaisies(nouvelles);
    };

    const handleDemarrer = async () => {
        if (!window.confirm('Démarrer cet inventaire ?')) return;
        try {
            await InventaireService.demarrer(token, id);
            loadInventaire();
        } catch (e) {
            alert('Erreur : ' + e.message);
        }
    };

    const handleValider = async () => {
        setValidating(true);
        try {
            await handleSaveAll(false);

            const res = await InventaireService.valider(token, id);
            if (res.success) {
                setShowValidModal(false);
                alert(`✅ Inventaire validé !\n${res.data?.nb_ajustements || 0} ajustement(s) créé(s).`);
                loadInventaire();
            }
        } catch (e) {
            alert('Erreur : ' + e.message);
        } finally {
            setValidating(false);
        }
    };

    const handleAnnuler = async () => {
        if (!window.confirm('Annuler cet inventaire ?')) return;
        try {
            await InventaireService.annuler(token, id);
            loadInventaire();
        } catch (e) {
            alert('Erreur : ' + e.message);
        }
    };

    // ============================================================
    // FILTRAGE & STATS
    // ============================================================
    const lignes = inventaire?.lignes || [];

    const filtered = useMemo(() => {
        return lignes.filter(l => {
            const theorique = parseQuantite(l.quantite_theorique);
            const reelle = parseQuantite(saisies[l.id_ligne] ?? l.quantite_reelle);
            const ecart = theorique - reelle;

            if (onlyEcarts && ecart === 0) return false;
            if (onlyNonSaisis && l.date_scannage) return false;

            if (searchTerm) {
                const s = searchTerm.toLowerCase();
                return (l.produit_nom || '').toLowerCase().includes(s) ||
                       (l.marque_nom || '').toLowerCase().includes(s);
            }
            return true;
        });
    }, [lignes, saisies, onlyEcarts, onlyNonSaisis, searchTerm]);

    const stats = useMemo(() => {
        let nbSaisis = 0, nbEcarts = 0, valeurManquant = 0, valeurSurplus = 0;
        lignes.forEach(l => {
            const theorique = parseQuantite(l.quantite_theorique);
            const reelle = parseQuantite(saisies[l.id_ligne] ?? l.quantite_reelle);
            const ecart = theorique - reelle;
            const prix = parseFloat(l.prix_achat) || 0;

            if (l.date_scannage) nbSaisis++;
            if (ecart !== 0) {
                nbEcarts++;
                if (ecart > 0) valeurManquant += ecart * prix;
                else valeurSurplus += Math.abs(ecart) * prix;
            }
        });
        return {
            nbLignes: lignes.length,
            nbSaisis,
            nbEcarts,
            pourcentage: lignes.length > 0 ? Math.round((nbSaisis / lignes.length) * 100) : 0,
            valeurManquant,
            valeurSurplus
        };
    }, [lignes, saisies]);

    // ============================================================
    // RENDUS CONDITIONNELS
    // ============================================================
    if (loading) return (
        <div className="inventaire-detail-container">
            <div className="loading-container"><div className="spinner"></div><p>Chargement...</p></div>
        </div>
    );

    if (error) return (
        <div className="inventaire-detail-container">
            <div className="error-container">
                <p>{error}</p>
                <button className="btn btn-secondary" onClick={() => navigate(`/${slug}/inventaires`)}>
                    Retour à la liste
                </button>
            </div>
        </div>
    );

    if (!inventaire) return null;

    const isEnCours = inventaire.statut === 'en_cours';
    const isTermine = inventaire.statut === 'termine';
    const isPlanifie = inventaire.statut === 'planifie';

    // ============================================================
    // RENDER PRINCIPAL
    // ============================================================
    return (
        <div className="inventaire-detail-container">
            {/* En-tête */}
            <div className="detail-header">
                <button className="back-btn" onClick={() => navigate(`/${slug}/inventaires`)}>
                    <ArrowLeft size={20} />
                </button>
                <div className="detail-header-info">
                    <h1>{inventaire.reference}</h1>
                    <p>{inventaire.libelle}</p>
                </div>
                <div className="detail-header-actions">
                    {isPlanifie && canManage && (
                        <button className="btn btn-primary" onClick={handleDemarrer}>
                            <PlayCircle size={18} />
                            <span>Démarrer</span>
                        </button>
                    )}
                    {isEnCours && canManage && (
                        <>
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleSaveAll(true)}
                                disabled={saving}
                            >
                                <Save size={18} />
                                <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={handleToutConforme}
                                disabled={saving}
                                title="Tout marquer comme conforme"
                            >
                                <CheckCheck size={18} />
                                <span>Tout conforme</span>
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowValidModal(true)}
                                disabled={saving}
                            >
                                <CheckCircle size={18} />
                                <span>Valider</span>
                            </button>
                            <button className="btn btn-danger" onClick={handleAnnuler}>
                                <Ban size={18} />
                                <span>Annuler</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Infos */}
            <div className="detail-info-grid">
                <div className="info-item"><label>Statut</label><span>{inventaire.statut}</span></div>
                <div className="info-item"><label>Type</label><span>{inventaire.type_inventaire}</span></div>
                <div className="info-item"><label>Date début</label><span>{new Date(inventaire.date_debut).toLocaleDateString('fr-FR')}</span></div>
                <div className="info-item"><label>Lignes</label><span>{stats.nbLignes}</span></div>
                <div className="info-item">
                    <label>Saisies</label>
                    <span>{stats.nbSaisis} / {stats.nbLignes} ({stats.pourcentage}%)</span>
                </div>
                <div className="info-item">
                    <label>Écarts détectés</label>
                    <span className={stats.nbEcarts > 0 ? 'text-warn' : 'text-ok'}>
                        {stats.nbEcarts}
                    </span>
                </div>
            </div>

            {/* Barre de progression */}
            {isEnCours && (
                <div className="progress-bar-container">
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${stats.pourcentage}%` }}></div>
                    </div>
                    <div className="progress-values">
                        <span>{stats.pourcentage}% complété</span>
                        {stats.valeurManquant > 0 && (
                            <span className="text-warn">
                                <TrendingDown size={14} /> Manquant : {formatMontant(stats.valeurManquant)}
                            </span>
                        )}
                        {stats.valeurSurplus > 0 && (
                            <span className="text-info">
                                <TrendingUp size={14} /> Surplus : {formatMontant(stats.valeurSurplus)}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Filtres */}
            <div className="detail-filters">
                <div className="search-box">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Rechercher un produit..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    {searchTerm && <button className="search-clear" onClick={() => setSearchTerm('')}><X size={16} /></button>}
                </div>
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={onlyEcarts}
                        onChange={e => setOnlyEcarts(e.target.checked)}
                    />
                    <span>Écarts uniquement</span>
                </label>
                {isEnCours && (
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={onlyNonSaisis}
                            onChange={e => setOnlyNonSaisis(e.target.checked)}
                        />
                        <span>Non saisis uniquement</span>
                    </label>
                )}
            </div>

            {/* Tableau */}
            <div className="inventaire-lignes-table-container">
                <table className="inventaire-lignes-table">
                    <thead>
                        <tr>
                            <th>Produit</th>
                            <th>Marque</th>
                            <th>Théorique</th>
                            <th>Réelle</th>
                            <th>Écart</th>
                            <th>Valeur</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan="7" className="empty-state"><Package size={32} /><p>Aucune ligne</p></td></tr>
                        ) : filtered.map((l, index) => {
                            const theorique = parseQuantite(l.quantite_theorique);
                            const reelle = parseQuantite(saisies[l.id_ligne] ?? l.quantite_reelle);
                            const ecart = theorique - reelle;
                            const prix = parseFloat(l.prix_achat) || 0;
                            const valeur = Math.abs(ecart) * prix;
                            const ecartCls = ecart === 0 ? 'ecart-ok' : (ecart > 0 ? 'ecart-neg' : 'ecart-pos');

                            return (
                                <tr key={l.id_ligne}>
                                    <td><strong>{l.produit_nom}</strong></td>
                                    <td>{l.marque_nom || '-'}</td>

                                    {/* ✅ Théorique via StockSelector */}
                                    <td className="text-center">
                                        <StockSelector
                                            idProduit={`inv-th-${l.id_ligne}`}
                                            stockBase={theorique}
                                            unitesVente={l.unites_vente || []}
                                            uniteBase={{
                                                nom: l.unite_nom,
                                                symbole: l.unite_symbole,
                                            }}
                                            variant="list"
                                        />
                                    </td>

                                    {/* Input saisie réelle */}
                                    <td>
                                        <input
                                            ref={el => inputRefs.current[l.id_ligne] = el}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            className="qte-input"
                                            value={saisies[l.id_ligne] ?? ''}
                                            onChange={e => handleSaisieChange(l.id_ligne, e.target.value)}
                                            onKeyDown={e => handleKeyDown(e, index, filtered)}
                                            disabled={!isEnCours}
                                            placeholder="0"
                                        />
                                    </td>

                                    {/* Écart */}
                                    <td>
                                        <span className={`ecart-badge ${ecartCls}`}>
                                            {ecart > 0 ? '+' : ''}{formatQuantite(ecart)}
                                        </span>
                                    </td>

                                    {/* Valeur */}
                                    <td>
                                        {ecart !== 0 && prix > 0 ? (
                                            <span className={ecart > 0 ? 'text-warn' : 'text-info'}>
                                                {formatMontant(valeur)}
                                            </span>
                                        ) : (
                                            <span className="text-muted">—</span>
                                        )}
                                    </td>

                                    {/* Statut */}
                                    <td>
                                        {l.date_scannage ? (
                                            <span className="status-badge status-termine">
                                                <CheckCircle size={14} />
                                                Saisi
                                            </span>
                                        ) : (
                                            <span className="status-badge status-planifie">
                                                <AlertCircle size={14} />
                                                En attente
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal validation */}
            {showValidModal && (
                <div className="modal-overlay" onClick={() => !validating && setShowValidModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Valider l'inventaire ?</h2>
                            <button className="modal-close" onClick={() => !validating && setShowValidModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="valid-recap">
                                <div className="recap-line">
                                    <span>Lignes totales</span>
                                    <strong>{stats.nbLignes}</strong>
                                </div>
                                <div className="recap-line">
                                    <span>Lignes saisies</span>
                                    <strong>{stats.nbSaisis} ({stats.pourcentage}%)</strong>
                                </div>
                                <div className="recap-line">
                                    <span>Écarts détectés</span>
                                    <strong className={stats.nbEcarts > 0 ? 'text-warn' : 'text-ok'}>
                                        {stats.nbEcarts}
                                    </strong>
                                </div>
                                {stats.valeurManquant > 0 && (
                                    <div className="recap-line">
                                        <span>Valeur manquants</span>
                                        <strong className="text-warn">-{formatMontant(stats.valeurManquant)}</strong>
                                    </div>
                                )}
                                {stats.valeurSurplus > 0 && (
                                    <div className="recap-line">
                                        <span>Valeur surplus</span>
                                        <strong className="text-info">+{formatMontant(stats.valeurSurplus)}</strong>
                                    </div>
                                )}
                            </div>
                            <div className="valid-warning">
                                <AlertTriangle size={20} />
                                <div>
                                    <strong>⚠️ Action irréversible</strong>
                                    <p>Le stock réel sera appliqué aux produits et des ajustements seront créés.</p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowValidModal(false)} disabled={validating}>
                                Annuler
                            </button>
                            <button className="btn btn-primary" onClick={handleValider} disabled={validating}>
                                {validating ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        <span>Validation...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={18} />
                                        <span>Valider et ajuster le stock</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventaireDetail;