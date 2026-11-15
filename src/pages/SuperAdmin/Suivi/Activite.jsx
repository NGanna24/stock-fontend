// pages/SuperAdmin/Suivi/Activite.jsx
// Fil des derniers événements de tous les magasins, groupés par jour.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Search, ShoppingCart, Package, UserPlus, Wallet, LogIn, Trash2, Pencil, Plus, Store, ChevronLeft, ChevronRight, Inbox,
} from 'lucide-react';
import SuiviAdminService from '../../../services/superAdmin/suiviAdminService';
import { Chargement, Chiffre, EnTete, Erreur, Etat, fcfa, heure, jourLisible, nombre, pluriel, useChargement } from './outils';

const PERIODES = [[1, "Aujourd'hui"], [7, '7 jours'], [30, '30 jours']];
const TYPES = [
  ['', 'Tout'],
  ['ventes', 'Ventes et paiements'],
  ['stock', 'Stock'],
  ['inscriptions', 'Inscriptions'],
  ['abonnements', 'Abonnements'],
  ['connexions', 'Connexions'],
  ['suppressions', 'Suppressions'],
];
const PAR_PAGE = 50;

// Noms techniques des modules → libellés lisibles
const MODULES = {
  'documents-reglages': 'Cachets et documents', 'modes-paiement': 'Modes de paiement', 'comptes-fournisseurs': 'Comptes fournisseurs',
  'dettes-fournisseurs': 'Comptes fournisseurs', 'emplacements': 'Emplacements', 'employes': 'Employés', 'produits': 'Produits',
  'ventes': 'Ventes', 'factures': 'Factures', 'caisse': 'Caisse', 'clients': 'Clients', 'depenses': 'Dépenses', 'stock': 'Stock',
  'entrees': 'Entrées de stock', 'sorties': 'Sorties de stock', 'inventaires': 'Inventaires', 'transferts': 'Transferts',
  'entrepot': 'Entrepôt', 'entrepots': 'Entrepôt', 'achats': 'Achats', 'commandes-achat': 'Commandes fournisseurs', 'receptions': 'Réceptions',
  'relances': 'Relances clients', 'magasin': 'Fiche du magasin', 'categories': 'Catégories', 'marques': 'Marques', 'unites': 'Unités',
  'retours-clients': 'Retours clients', 'retours-fournisseurs': 'Retours fournisseurs', 'utilisateur': 'Compte',
};
const libelleModule = (m) => {
  if (!m) return '';
  const k = String(m).toLowerCase();
  if (MODULES[k]) return MODULES[k];
  const t = String(m).replace(/[-_]+/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Icône et couleur selon l'événement */
const apparence = (e) => {
  if (e.source === 'inscription') return { Icone: UserPlus, ton: 'brand' };
  if (e.source === 'abonnement') return { Icone: Wallet, ton: 'ink' };
  if (e.action === 'connexion') return { Icone: LogIn, ton: '' };
  if (e.action === 'suppression' || e.action === 'annulation') return { Icone: Trash2, ton: 'danger' };
  if (e.action === 'paiement' || /vente|facture|caisse|paiement|reglement/i.test(e.module || '')) return { Icone: ShoppingCart, ton: 'brand' };
  if (/produit|stock|entree|sortie|inventaire|transfert|entrepot|achat|reception/i.test(e.module || '')) return { Icone: Package, ton: '' };
  if (e.action === 'creation') return { Icone: Plus, ton: '' };
  if (e.action === 'modification') return { Icone: Pencil, ton: '' };
  return { Icone: Activity, ton: '' };
};

export default function Activite() {
  const navigate = useNavigate();
  const [jours, setJours] = useState(7);
  const [type, setType] = useState('');
  const [saisie, setSaisie] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  // Recherche lancée après une courte pause de frappe
  useEffect(() => {
    const t = setTimeout(() => { setQ(saisie.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [saisie]);

  const { donnees, chargement, erreur, recharger } = useChargement(
    () => SuiviAdminService.activite({ jours, type, q, page, limite: PAR_PAGE }),
    [jours, type, q, page]
  );
  const d = donnees || { evenements: [], resume: {}, total: 0 };
  const nbPages = Math.max(1, Math.ceil((d.total || 0) / PAR_PAGE));
  const libellePeriode = jours === 1 ? "aujourd'hui" : `sur ${jours} jours`;

  // Regroupement par jour (en gardant l'ordre)
  const groupes = [];
  for (const e of d.evenements) {
    const j = jourLisible(e.date_action);
    if (!groupes.length || groupes[groupes.length - 1].jour !== j) groupes.push({ jour: j, liste: [] });
    groupes[groupes.length - 1].liste.push(e);
  }
  let numero = (page - 1) * PAR_PAGE;

  return (
    <div className="su">
      <EnTete titre="Activité" sous="Ce qui se passe dans tous les magasins Miyo." chargement={chargement} onRecharger={recharger} />
      <Erreur texte={erreur} onRecharger={recharger} />

      <div className="su-chiffres">
        <Chiffre icone={Activity} libelle="Actions dans les magasins" valeur={nombre(d.resume.actions)} sous={libellePeriode} />
        <Chiffre icone={Store} libelle="Magasins actifs" valeur={nombre(d.resume.magasins_actifs)} sous={`au moins une action ${libellePeriode}`} ton="brand" />
        <Chiffre icone={UserPlus} libelle="Nouveaux patrons" valeur={nombre(d.resume.inscriptions)} sous={libellePeriode} />
        <Chiffre icone={Wallet} libelle="Abonnements payés" valeur={nombre(d.resume.paiements)} sous={libellePeriode} />
      </div>

      <div className="su-outils">
        <div className="su-seg" role="group" aria-label="Période">
          {PERIODES.map(([v, l]) => (
            <button key={v} type="button" className={jours === v ? 'is-on' : ''} aria-pressed={jours === v} onClick={() => { setJours(v); setPage(1); }}>{l}</button>
          ))}
        </div>
        <div className="su-recherche">
          <Search size={16} />
          <input type="search" value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Patron, magasin, employé ou action" aria-label="Rechercher dans l'activité" />
        </div>
      </div>
      <div className="su-outils">
        <div className="su-seg" role="group" aria-label="Type d'événement">
          {TYPES.map(([v, l]) => (
            <button key={v || 'tout'} type="button" className={type === v ? 'is-on' : ''} aria-pressed={type === v} onClick={() => { setType(v); setPage(1); }}>{l}</button>
          ))}
        </div>
      </div>

      <section className="su-panneau">
        {chargement && !donnees ? <Chargement /> : d.evenements.length === 0 ? (
          <Etat icone={Inbox} titre="Aucun événement" texte={q ? 'Essayez un autre nom.' : 'Rien sur cette période.'} />
        ) : (
          <>
            {groupes.map((g) => (
              <div key={g.jour}>
                <div className="su-fil-jour">{g.jour}</div>
                <ol className="su-fil" start={numero + 1} style={{ counterReset: `su-fil ${numero}` }}>
                  {g.liste.map((e, i) => {
                    numero += 1;
                    const { Icone, ton } = apparence(e);
                    return (
                      <li key={`${e.source}-${e.date_action}-${i}`}>
                        <span className={`su-fil-ic ${ton ? `su-fil-ic--${ton}` : ''}`}><Icone size={17} /></span>
                        <div className="su-fil-txt">
                          {e.source === 'journal'
                            ? <><b>{e.acteur_nom || 'Quelqu’un'}</b> {e.libelle}{e.reference ? ` (${e.reference})` : ''}</>
                            : <><b>{e.libelle}</b>{e.montant ? ` · ${fcfa(e.montant)}` : ''}</>}
                          <div className="su-fil-meta">
                            <button type="button" className="su-lien" onClick={() => navigate(`/super-admin/utilisateurs/${e.id_utilisateur}`)}>
                              {e.nom_magasin || e.patron}
                            </button>
                            {e.ville ? ` · ${e.ville}` : ''}
                            {e.source === 'journal' && e.acteur_role ? ` · ${e.acteur_role}` : ''}
                            {e.source === 'abonnement' ? ` · enregistré par ${e.acteur_nom}` : ''}
                            {e.source === 'journal' && e.module ? ` · ${libelleModule(e.module)}` : ''}
                          </div>
                        </div>
                        <span className="su-fil-heure">{heure(e.date_action)}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
            <div className="su-pages">
              <span>{pluriel(d.total, 'événement')} · page {page} sur {nbPages}</span>
              {nbPages > 1 && (
                <div className="su-pages-nav">
                  <button type="button" className="su-btn su-btn--sm" onClick={() => setPage(page - 1)} disabled={page <= 1}><ChevronLeft size={14} /> Plus récents</button>
                  <button type="button" className="su-btn su-btn--sm" onClick={() => setPage(page + 1)} disabled={page >= nbPages}>Plus anciens <ChevronRight size={14} /></button>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
