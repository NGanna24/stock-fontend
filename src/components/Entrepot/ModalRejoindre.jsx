// components/Entrepot/ModalRejoindre.jsx
// Rejoindre un entrepôt existant avec son code d'accès.
import React, { useState } from 'react';
import axios from 'axios';
import { LogIn, Loader, AlertTriangle } from 'lucide-react';
import API_URL from '../../config/api';
import TrModal from '../Transfert/TrModal';
import '../Transfert/Transfert.css';

export default function ModalRejoindre({ token, onClose, onJoined }) {
    const [code, setCode] = useState('');
    const [saving, setSaving] = useState(false);
    const [erreur, setErreur] = useState(null);

    const rejoindre = async () => {
        const c = code.trim();
        if (!c) {
            setErreur("Saisissez le code d'accès de l'entrepôt");
            return;
        }

        setSaving(true);
        setErreur(null);
        try {
            // Le code est envoyé sous les deux noms courants pour rester compatible avec le contrôleur
            const res = await axios.post(
                API_URL.ENTREPOT.REJOINDRE,
                { code_acces: c, code: c },
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );
            onJoined?.(res.data);
        } catch (err) {
            console.error('❌ Rejoindre entrepôt:', err);
            setErreur(
                err.response?.data?.message ||
                (err.request ? 'Impossible de contacter le serveur.' : err.message) ||
                'Erreur lors de la connexion à l\'entrepôt'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <TrModal
            onClose={() => !saving && onClose()}
            title="Rejoindre un entrepôt"
            subtitle="Saisissez le code d'accès donné par le propriétaire de l'entrepôt."
            footer={
                <>
                    <button className="tr-btn" onClick={onClose} disabled={saving}>Annuler</button>
                    <button className="tr-btn tr-btn--primary" onClick={rejoindre} disabled={saving || !code.trim()}>
                        {saving ? <Loader className="tr-spin" size={15} /> : <LogIn size={15} />} Rejoindre
                    </button>
                </>
            }
        >
            {erreur && (
                <div className="tr-alert tr-alert--err" role="alert">
                    <AlertTriangle size={16} />
                    <span>{erreur}</span>
                </div>
            )}

            <div className="tr-field">
                <label className="tr-lbl">Code d'accès <em>*</em></label>
                <input
                    className="tr-input"
                    type="text"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setErreur(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && !saving && rejoindre()}
                    placeholder="Ex : ENT-AB12CD"
                    maxLength={20}
                    autoFocus
                    autoComplete="off"
                    disabled={saving}
                />
            </div>

            <div className="tr-info">
                Une fois dans l'entrepôt, vous pourrez demander des transferts vers votre propre catalogue. Le propriétaire de l'entrepôt les approuve.
            </div>
        </TrModal>
    );
}