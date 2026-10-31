// components/Transfert/BonTransfert.jsx
// Bon de transfert imprimable : le chauffeur le présente au gérant de l'entrepôt,
// qui remet la marchandise puis signe. Disponible une fois la demande approuvée.
import React from 'react';
import { Printer } from 'lucide-react';
import TrModal, { fmtNum, fmtDate, libelleQuantite, libelleEquivalent } from './TrModal';
import './Transfert.css';

const esc = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function bonHtml(t) {
    const magasin = t.magasin_nom || t.demandeur_nom;
    // Un panier = plusieurs lignes sur UN SEUL bon
    const lignes = t.lignes && t.lignes.length > 0 ? t.lignes : [t];
    const lignesHtml = lignes.map((l, i) => {
        const unite = l.unite_symbole || l.unite_nom || '';
        const produit = [l.produit_nom, l.marque_nom, l.modele_nom].filter(Boolean).join(' — ');
        return `<tr>
      ${lignes.length > 1 ? `<td style="width:36px;text-align:center">${i + 1}</td>` : ''}
      <td>${esc(produit)}</td>
      <td class="qty">${esc(libelleQuantite(l))}</td>
      <td>${esc(libelleEquivalent(l).replace(/^soit /, '') || `${fmtNum(l.quantite)} ${unite}`)}</td>
    </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Bon de transfert ${esc(t.numero_transfert)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:0;padding:32px;font-size:14px}
  h1{font-size:22px;margin:0}
  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:18px}
  .num{font-family:'Courier New',monospace;font-size:20px;font-weight:700;letter-spacing:1px}
  .muted{color:#475569;font-size:12px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}
  .box{border:1px solid #94a3b8;border-radius:6px;padding:10px 12px}
  .box b{display:block;font-size:11px;text-transform:uppercase;color:#475569;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-bottom:18px}
  th,td{border:1px solid #94a3b8;padding:8px 10px;text-align:left}
  th{background:#f1f5f9;font-size:12px;text-transform:uppercase}
  .qty{font-size:18px;font-weight:700}
  .sign{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px}
  .sign div{border:1px solid #94a3b8;border-radius:6px;height:120px;padding:8px 10px;font-size:12px;color:#475569}
  .line{border-bottom:1px solid #94a3b8;height:22px;margin:4px 0 10px}
  .foot{margin-top:18px;font-size:11px;color:#64748b;text-align:center}
  @media print{body{padding:16px}}
</style></head><body>
  <div class="top">
    <div><h1>BON DE TRANSFERT</h1><div class="muted">Entrepôt → magasin${lignes.length > 1 ? ` · ${lignes.length} produits` : ''}</div></div>
    <div style="text-align:right"><div class="num">${esc(t.numero_transfert)}</div>
      <div class="muted">Approuvé le ${esc(fmtDate(t.date_validation))}${t.approbateur_nom ? ` par ${esc(t.approbateur_nom)}` : ''}</div></div>
  </div>

  <div class="grid">
    <div class="box"><b>Entrepôt (remise de la marchandise)</b>${esc(t.entrepot_nom)}
      ${t.entrepot_ville || t.entrepot_adresse ? `<div class="muted">${esc([t.entrepot_adresse, t.entrepot_ville].filter(Boolean).join(', '))}</div>` : ''}</div>
    <div class="box"><b>Magasin destinataire</b>${esc(magasin)}
      ${t.magasin_ville ? `<div class="muted">${esc(t.magasin_ville)}</div>` : ''}
      ${t.demandeur_nom && t.magasin_nom ? `<div class="muted">Demandeur : ${esc(t.demandeur_nom)}</div>` : ''}</div>
  </div>

  <table>
    <thead><tr>${lignes.length > 1 ? '<th>N°</th>' : ''}<th>Produit</th><th>Quantité à remettre</th><th>Équivalent (unité de base)</th></tr></thead>
    <tbody>${lignesHtml}</tbody>
  </table>
  ${t.motif ? `<p><b>Motif :</b> ${esc(t.motif)}</p>` : ''}

  <div class="box"><b>Chauffeur</b>
    <div class="muted">Nom et pièce d'identité</div><div class="line"></div>
    <div class="muted">Téléphone / immatriculation du véhicule</div><div class="line"></div>
  </div>

  <div class="sign">
    <div>Le gérant de l'entrepôt (remise)<br>Nom, date et signature :</div>
    <div>Le chauffeur (réception)<br>Nom, date et signature :</div>
  </div>

  <div class="foot">À présenter au gérant de l'entrepôt. Ce bon n'est valable qu'une seule fois.</div>
</body></html>`;
}

export function imprimerBon(t) {
    if (t?.statut !== 'valide') return false; // pas de bon tant que la demande n'est pas approuvée
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) return false; // bloqué par le navigateur
    w.document.open();
    w.document.write(bonHtml(t));
    w.document.close();
    w.focus();
    // laisse le temps au rendu avant d'ouvrir la boîte d'impression
    setTimeout(() => w.print(), 300);
    return true;
}

export default function BonTransfert({ transfert, onClose, onError }) {
    const t = transfert;
    const lignes = t.lignes && t.lignes.length > 0 ? t.lignes : [t];

    const imprimer = () => {
        if (t.statut !== 'valide') return onError?.("Le bon n'est disponible qu'une fois la demande approuvée");
        if (!imprimerBon(t)) onError?.("Le navigateur a bloqué la fenêtre d'impression : autorisez les pop-ups pour ce site.");
    };

    return (
        <TrModal
            onClose={onClose}
            title="Bon de transfert"
            subtitle={t.numero_transfert}
            footer={
                <>
                    <button className="tr-btn" onClick={onClose}>Fermer</button>
                    <button className="tr-btn tr-btn--primary" onClick={imprimer}>
                        <Printer size={15} /> Imprimer
                    </button>
                </>
            }
        >
            <div className="tr-info">À remettre au chauffeur : il le présente au gérant de l'entrepôt, qui sort la marchandise.</div>
            <div className="tr-card-meta" style={{ gap: 6 }}>
                <span>Entrepôt : <b>{t.entrepot_nom}</b></span>
                <span>Magasin destinataire : <b>{t.magasin_nom || t.demandeur_nom}</b></span>
                {lignes.map((l, i) => (
                    <span key={l.id_transfert || i}>
                        {lignes.length > 1 ? `${i + 1}. ` : 'Produit : '}<b>{l.produit_nom}</b> — <b>{libelleQuantite(l)}</b>
                        {l.quantite_base > 1 && <> ({libelleEquivalent(l)})</>}
                    </span>
                ))}
                <span>Approuvé le {fmtDate(t.date_validation)}{t.approbateur_nom ? ` par ${t.approbateur_nom}` : ''}</span>
            </div>
        </TrModal>
    );
}