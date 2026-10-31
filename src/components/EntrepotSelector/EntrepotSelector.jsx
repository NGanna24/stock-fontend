// components/EntrepotSelector/EntrepotSelector.jsx
import React from 'react';
import { Warehouse } from 'lucide-react';
import { useUser } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './EntrepotSelector.css';

export default function EntrepotSelector() {
    const { entrepots, user } = useUser();
    const navigate = useNavigate();

    if (!entrepots || entrepots.length === 0) return null;

    const entrepotActif = entrepots.find((e) => e.role_membre === 'proprietaire') || entrepots[0];
    const nb = entrepots.length;

    return (
        <button
            className="es-badge"
            onClick={() => navigate(`/${user.slug}/entrepot`)}
            title={nb > 1 ? `${nb} entrepôts — ${entrepotActif.nom}` : entrepotActif.nom}
        >
            <Warehouse size={15} />
            <span className="es-badge-name">{entrepotActif.nom}</span>
            {nb > 1 && <span className="es-badge-count">+{nb - 1}</span>}
        </button>
    );
}