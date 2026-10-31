// src/pages/Entrepot/EntrepotDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader } from 'lucide-react';
import EntrepotService from '../../services/entrepotService';
import { useUser } from '../../context/AuthContext';

export default function EntrepotDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useUser();
    const [entrepot, setEntrepot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const r = await EntrepotService.getEntrepot(token, id);
                setEntrepot(r.data);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [token, id]);

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Loader className="ep-spin" size={22} /></div>;
    if (error) return <div style={{ padding: 40, color: 'crimson' }}>{error}</div>;

    return (
        <div style={{ padding: 24 }}>
            <button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
                <ArrowLeft size={16} /> Retour
            </button>
            <h1>{entrepot?.nom}</h1>
            <p>{entrepot?.ville}</p>
            <p>Code d'accès : <strong>{entrepot?.code_acces}</strong></p>
        </div>
    );
}