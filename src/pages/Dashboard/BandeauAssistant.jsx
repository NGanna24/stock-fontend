// components/Dashboard/BandeauAssistant.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bot, ChevronRight, X, AlertCircle, Loader } from 'lucide-react';
import AssistantAchatService from '../../services/assistantAchatService';
import './BandeauAssistant.css';

const BandeauAssistant = ({ token }) => {
    const { slug = '' } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [count, setCount] = useState(0);
    const [fournisseurs, setFournisseurs] = useState(0);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        if (!token) return;

        const fetchCount = async () => {
            try {
                const res = await AssistantAchatService.getProposition(token, 'normal');
                if (res.success && res.data) {
                    setCount(res.data.total_produits || 0);
                    setFournisseurs(res.data.total_fournisseurs || 0);
                }
            } catch (e) {
                // Silencieux : pas d'alerte si le bandeau échoue
                console.error('Bandeau assistant:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchCount();
    }, [token]);

    if (hidden || loading || count === 0) return null;

    return (
        <div className="bandeau-assistant">
            <div className="bandeau-assistant-icon">
                <Bot size={22} />
            </div>
            <div className="bandeau-assistant-content">
                <strong>
                    L'assistant a détecté {count} produit(s) à commander
                </strong>
                <span>
                    Regroupés en {fournisseurs} fournisseur(s) — vous pouvez tout ajuster avant de valider
                </span>
            </div>
            <div className="bandeau-assistant-actions">
                <button
                    className="btn btn-assistant"
                    onClick={() => navigate(`/${slug}/assistant-achat`)}
                >
                    Voir la proposition <ChevronRight size={16} />
                </button>
                <button
                    className="bandeau-assistant-close"
                    onClick={() => setHidden(true)}
                    title="Masquer"
                >
                    <X size={18} />
                </button>
            </div>
        </div> 
    );
};

export default BandeauAssistant;