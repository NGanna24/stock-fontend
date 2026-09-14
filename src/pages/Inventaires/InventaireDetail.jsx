// pages/Inventaires/InventaireDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft, PlayCircle, CheckCircle, Ban, Save,
    Search, AlertCircle, Package, X
} from "lucide-react";
import InventaireService from "../../services/inventaireService";
import { useUser } from "../../context/AuthContext";
import "./Inventaires.css";

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

    // Saisies en cours (local state, avant sauvegarde)
    const [saisies, setSaisies] = useState({});
    const [saving, setSaving] = useState(false);

    const canManage = user && ['admin', 'manager', 'gestionnaire'].includes(user.role);

    // ✅ Garde-fou : ne pas appeler l'API si l'id est invalide
    useEffect(() => {
        if (!id || id === 'undefined' || id === 'null') {
            console.error('❌ ID d\'inventaire invalide:', id);
            setError('Identifiant d\'inventaire manquant');
            setLoading(false);
            return;
        }
        loadInventaire();
    }, [id]);

    const loadInventaire = async () => {
        // ✅ Double protection
        if (!id || id === 'undefined' || id === 'null') return;

        setLoading(true);
        setError(null);
        try {
            const res = await InventaireService.getById(token, id);
            if (res.success) {
                setInventaire(res.data);
                // Initialiser les saisies avec les valeurs existantes
                const initial = {};
                (res.data.lignes || []).forEach(l => {
                    initial[l.id_ligne] = l.quantite_reelle;
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

    const handleSaisieChange = (idLigne, value) => {
        setSaisies(prev => ({ ...prev, [idLigne]: value }));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const lignes = Object.entries(saisies).map(([idLigne, qte]) => ({
                id_ligne: parseInt(idLigne),
                quantite_reelle: parseFloat(qte) || 0
            }));

            const res = await InventaireService.saisirLignesEnMasse(token, id, lignes);
            if (res.success) {
                loadInventaire();
            }
        } catch (e) {
            alert('Erreur : ' + e.message);
        } finally {
            setSaving(false);
        }
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
        if (!window.confirm(
            'Valider cet inventaire ?\n\n' +
            'Les écarts seront automatiquement ajustés dans le stock.\n' +
            'Cette action est irréversible.'
        )) return;
        try {
            const res = await InventaireService.valider(token, id);
            if (res.success) {
                alert('✅ Inventaire validé, ajustements créés');
                loadInventaire();
            }
        } catch (e) {
            alert('Erreur : ' + e.message);
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

    if (loading) return <div className="loading-container"><div className="spinner"></div><p>Chargement...</p></div>;
    if (error) return (
        <div className="error-container">
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={() => navigate(`/${slug}/inventaires`)}>
                Retour à la liste
            </button>
        </div>
    );
    if (!inventaire) return null;

    const lignes = inventaire.lignes || [];

    const filtered = lignes.filter(l => {
        if (onlyEcarts && !parseFloat(l.ecart)) return false;
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            return (l.produit_nom || '').toLowerCase().includes(s) ||
                   (l.marque_nom || '').toLowerCase().includes(s);
        }
        return true;
    });

    const nbEcarts = lignes.filter(l => parseFloat(l.ecart) !== 0).length;
    const nbSaisis = lignes.filter(l => parseFloat(l.quantite_reelle) > 0 || l.date_scannage).length;

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
                    {inventaire.statut === 'planifie' && canManage && (
                        <button className="btn btn-primary" onClick={handleDemarrer}>
                            <PlayCircle size={18} />
                            <span>Démarrer</span>
                        </button>
                    )}
                    {inventaire.statut === 'en_cours' && canManage && (
                        <>
                            <button className="btn btn-secondary" onClick={handleSaveAll} disabled={saving}>
                                <Save size={18} />
                                <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
                            </button>
                            <button className="btn btn-primary" onClick={handleValider}>
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
                <div className="info-item"><label>Lignes</label><span>{lignes.length}</span></div>
                <div className="info-item"><label>Saisies</label><span>{nbSaisis} / {lignes.length}</span></div>
                <div className="info-item"><label>Écarts détectés</label><span className={nbEcarts > 0 ? 'text-warn' : 'text-ok'}>{nbEcarts}</span></div>
            </div>

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
                    <span>Afficher uniquement les écarts</span>
                </label>
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
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan="6" className="empty-state"><Package size={32} /><p>Aucune ligne</p></td></tr>
                        ) : filtered.map(l => {
                            const theorique = parseFloat(l.quantite_theorique) || 0;
                            const reelle = parseFloat(saisies[l.id_ligne] ?? l.quantite_reelle) || 0;
                            const ecart = theorique - reelle;
                            const ecartCls = ecart === 0 ? 'ecart-ok' : (ecart > 0 ? 'ecart-neg' : 'ecart-pos');

                            return (
                                <tr key={l.id_ligne}>
                                    <td><strong>{l.produit_nom}</strong></td>
                                    <td>{l.marque_nom || '-'}</td>
                                    <td>{theorique.toLocaleString('fr-FR')} {l.unite_symbole || ''}</td>
                                    <td>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="qte-input"
                                            value={saisies[l.id_ligne] ?? l.quantite_reelle}
                                            onChange={e => handleSaisieChange(l.id_ligne, e.target.value)}
                                            disabled={inventaire.statut !== 'en_cours'}
                                        />
                                    </td>
                                    <td>
                                        <span className={`ecart-badge ${ecartCls}`}>
                                            {ecart > 0 ? '+' : ''}{ecart.toLocaleString('fr-FR')}
                                        </span>
                                    </td>
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
        </div>
    );
};

export default InventaireDetail;