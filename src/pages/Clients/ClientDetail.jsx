// pages/Clients/ClientDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft, Phone, User, ShoppingCart, Package,
    Calendar, FileText, Banknote, TrendingUp,
    ChevronRight, Award, RefreshCw
} from "lucide-react";
import ClientService from "../../services/clientService";
import { useUser } from "../../context/AuthContext";
import "./Clients.css";

const ClientDetail = () => {
    const { telephone, slug } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useUser();
    const token = localStorage.getItem('token');

    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isAuthenticated && token && telephone) {
            loadClient();
        }
    }, [isAuthenticated, token, telephone]);

    const loadClient = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await ClientService.getByTelephone(token, telephone);
            if (res.success) {
                setClient(res.data);
            } else {
                setError(res.message || 'Client non trouvé');
            }
        } catch (e) {
            console.error('❌ LoadClient error:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // ==================== FORMATAGE ====================
    const formatMontant = (value) => {
        const num = parseFloat(value) || 0;
        return Math.round(num).toLocaleString('fr-FR') + ' FCFA';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('fr-FR');
    };

    const getStatutCommandeBadge = (statut) => {
        const configs = {
            'en_attente':      { label: 'En attente',  cls: 'status-en-attente' },
            'confirmee':       { label: 'Confirmée',   cls: 'status-confirmee' },
            'en_preparation':  { label: 'Préparation', cls: 'status-prep' },
            'expediee':        { label: 'Expédiée',    cls: 'status-expediee' },
            'livree':          { label: 'Livrée',      cls: 'status-livree' },
            'annulee':         { label: 'Annulée',     cls: 'status-annulee' }
        };
        const c = configs[statut] || configs['en_attente'];
        return <span className={`badge ${c.cls}`}>{c.label}</span>;
    };

    const getStatutFactureBadge = (statut) => {
        const configs = {
            'payee':                { label: 'Payée',        cls: 'status-payee' },
            'en_attente':           { label: 'En attente',   cls: 'status-en-attente' },
            'partiellement_payee':  { label: 'Partielle',    cls: 'status-partiel' },
            'en_retard':            { label: 'En retard',    cls: 'status-retard' },
            'annulee':              { label: 'Annulée',      cls: 'status-annulee' }
        };
        const c = configs[statut] || configs['en_attente'];
        return <span className={`badge ${c.cls}`}>{c.label}</span>;
    };

    // ==================== RENDU ====================
    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Chargement du client...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <p>{error}</p>
                <button className="btn btn-secondary" onClick={() => navigate(`/${slug}/clients`)}>
                    <ArrowLeft size={16} />
                    Retour à la liste
                </button>
            </div>
        );
    }

    if (!client) return null;

    const totalPaye = client.total_paye || 0;
    const totalAchats = client.total_achats || 0;
    const resteAPayer = totalAchats - totalPaye;

    return (
        <div className="client-detail-container">
            {/* En-tête */}
            <div className="detail-header">
                <button className="back-btn" onClick={() => navigate(`/${slug}/clients`)}>
                    <ArrowLeft size={20} />
                </button>
                <div className="client-detail-header-info">
                    <div className="client-avatar-large">
                        {client.nomclient ? client.nomclient.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                        <h1>{client.nomclient || 'Client sans nom'}</h1>
                        <p className="client-tel-large">
                            <Phone size={16} />
                            {client.telephone}
                        </p>
                    </div>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={loadClient}
                    title="Rafraîchir"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* KPI du client */}
            <div className="client-kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon kpi-commandes"><ShoppingCart size={22} /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Commandes</span>
                        <span className="kpi-value">{client.nb_commandes}</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon kpi-ca"><Banknote size={22} /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Total achats</span>
                        <span className="kpi-value">{formatMontant(totalAchats)}</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon kpi-panier"><TrendingUp size={22} /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Panier moyen</span>
                        <span className="kpi-value">{formatMontant(client.panier_moyen)}</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon kpi-paye"><Banknote size={22} /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Total payé</span>
                        <span className="kpi-value">{formatMontant(totalPaye)}</span>
                    </div>
                </div>
                <div className={`kpi-card ${resteAPayer > 0 ? 'kpi-alert' : ''}`}>
                    <div className={`kpi-icon ${resteAPayer > 0 ? 'kpi-impaye' : 'kpi-solde'}`}>
                        <Banknote size={22} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Reste à payer</span>
                        <span className="kpi-value">{formatMontant(resteAPayer)}</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon kpi-date"><Calendar size={22} /></div>
                    <div className="kpi-content">
                        <span className="kpi-label">Dernière commande</span>
                        <span className="kpi-value" style={{ fontSize: '14px' }}>
                            {formatDate(client.derniere_commande)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Informations générales */}
            <div className="client-info-grid">
                <div className="info-item">
                    <label>Première commande</label>
                    <span>{formatDate(client.premiere_commande)}</span>
                </div>
                <div className="info-item">
                    <label>Dernière commande</label>
                    <span>{formatDate(client.derniere_commande)}</span>
                </div>
                <div className="info-item">
                    <label>Dernier paiement</label>
                    <span>{formatDate(client.dernier_paiement)}</span>
                </div>
                <div className="info-item">
                    <label>Nombre de paiements</label>
                    <span>{client.total_paiements}</span>
                </div>
            </div>

            {/* Top produits fréquents */}
            {client.produits_frequents && client.produits_frequents.length > 0 && (
                <div className="dashboard-card">
                    <div className="card-header">
                        <h3> Produits les plus achetés</h3>
                    </div>
                    <div className="card-body">
                        <ul className="top-list">
                            {client.produits_frequents.map((p, i) => (
                                <li key={p.id_produit} className="top-item">
                                    <span className={`top-rank rank-${i + 1}`}>{i + 1}</span>
                                    <div className="top-info">
                                        <span className="top-name">{p.produit_nom}</span>
                                        {p.marque_nom && (
                                            <span className="top-marque">{p.marque_nom}</span>
                                        )}
                                    </div>
                                    <div className="top-stats">
                                        <span className="top-qte">
                                            {p.total_quantite} {p.unite_symbole || ''} ({p.nb_fois}x)
                                        </span>
                                        <span className="top-ca">{formatMontant(p.total_montant)}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Historique des commandes */}
            <div className="dashboard-card">
                <div className="card-header">
                    <h3>Historique des commandes</h3>
                    <span className="card-count">{client.commandes.length} commande(s)</span>
                </div>
                <div className="card-body">
                    {client.commandes.length === 0 ? (
                        <div className="empty-chart">
                            <ShoppingCart size={40} />
                            <p>Aucune commande</p>
                        </div>
                    ) : (
                        <div className="commandes-table-container">
                            <table className="commandes-table">
                                <thead>
                                    <tr>
                                        <th>N° commande</th>
                                        <th>Date</th>
                                        <th>Montant</th>
                                        <th>Statut</th>
                                        <th>Facture</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {client.commandes.map((cmd) => (
                                        <tr key={cmd.id_commande}>
                                            <td>
                                                <span className="cmd-num">{cmd.numero_commande}</span>
                                            </td>
                                            <td>{cmd.date_formatee}</td>
                                            <td className="montant-cell">
                                                <strong>{formatMontant(cmd.montant_total)}</strong>
                                            </td>
                                            <td>{getStatutCommandeBadge(cmd.statut)}</td>
                                            <td>
                                                {cmd.numero_facture ? (
                                                    <div className="fact-info-cell">
                                                        <span className="fact-num-mini">
                                                            {cmd.numero_facture}
                                                        </span>
                                                        {getStatutFactureBadge(cmd.statut_facture)}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted">—</span>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    className="link-btn"
                                                    onClick={() => navigate(`/${slug}/commandes-clients`)}
                                                    title="Voir la commande"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientDetail;