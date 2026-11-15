// pages/SuperAdmin/Suivi/Statistiques.jsx
// Croissance et utilisation de Miyo : patrons, abonnements, ventes, villes.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Store, Package, ShoppingCart, Activity, UserPlus, BadgePercent, MapPin, Trophy, Warehouse, UserCog } from 'lucide-react';
import SuiviAdminService from '../../../services/superAdmin/suiviAdminService';
import { Courbe, Anneau, court as abrege } from './graphiques';
import { Chargement, Chiffre, EnTete, Erreur, Etat, Panneau, fcfa, nombre, pluriel, useChargement } from './outils';

export default function Statistiques() {
  const navigate = useNavigate();
  const { donnees, chargement, erreur, recharger } = useChargement(() => SuiviAdminService.statistiques());
  const [courbeVentes, setCourbeVentes] = useState('ventes');
  const d = donnees;
  const t = d?.totaux || {};
  const ab = d?.abonnements || {};

  return (
    <div className="su">
      <EnTete titre="Statistiques" sous="Comment Miyo grandit et comment les magasins l'utilisent." chargement={chargement} onRecharger={recharger} />
      <Erreur texte={erreur} onRecharger={recharger} />

      {chargement && !d ? <Chargement /> : d && (
        <>
          <div className="su-chiffres">
            <Chiffre icone={Users} libelle="Patrons" valeur={nombre(t.patrons)} sous={`${nombre(t.patrons_actifs)} comptes actifs`} />
            <Chiffre icone={Activity} libelle="Actifs cette semaine" valeur={nombre(t.actifs_7j)} ton="brand" sous={`${nombre(t.actifs_30j)} sur 30 jours`} />
            <Chiffre icone={BadgePercent} libelle="Passent au payant" valeur={ab.taux_conversion} unite="%" sous={`${pluriel(ab.avec_paiement, 'patron')} ont déjà payé`} />
            <Chiffre icone={Store} libelle="Magasins" valeur={nombre(t.magasins)} sous={`${nombre(t.entrepots)} entrepôts`} />
            <Chiffre icone={UserCog} libelle="Employés" valeur={nombre(t.employes)} />
            <Chiffre icone={Package} libelle="Produits gérés" valeur={nombre(t.produits)} />
            <Chiffre icone={ShoppingCart} libelle="Ventes enregistrées" valeur={nombre(t.ventes)} />
          </div>

          <div className="su-grille">
            <Panneau titre="Nouveaux patrons" sous="Inscriptions des 12 derniers mois" icone={UserPlus}>
              <Courbe serie={d.inscriptions} series={[{ cle: 'patrons', nom: 'Nouveaux patrons' }]}
                total={{ valeur: nombre(d.inscriptions.reduce((s, m) => s + (Number(m.patrons) || 0), 0)), libelle: 'inscrits sur 12 mois' }} />
            </Panneau>
            <Panneau
              titre="Ventes dans les magasins"
              sous="12 derniers mois, tous magasins confondus"
              icone={ShoppingCart}
              actions={(
                <div className="su-seg" role="group" aria-label="Valeur affichée">
                  {[['ventes', 'Nombre'], ['chiffre', "Chiffre d'affaires"], ['magasins', 'Magasins actifs']].map(([v, l]) => (
                    <button key={v} type="button" className={courbeVentes === v ? 'is-on' : ''} aria-pressed={courbeVentes === v} onClick={() => setCourbeVentes(v)}>{l}</button>
                  ))}
                </div>
              )}
            >
              <Courbe serie={d.ventes} series={[{ cle: courbeVentes, nom: courbeVentes === 'chiffre' ? "Chiffre d'affaires" : courbeVentes === 'magasins' ? 'Magasins actifs' : 'Ventes' }]}
                format={courbeVentes === 'chiffre' ? fcfa : nombre} formatAxe={abrege} />
            </Panneau>
          </div>

          <div className="su-grille">
            <Panneau titre="Abonnements" sous="Où en sont les patrons aujourd'hui" icone={BadgePercent}>
              <Anneau
                donnees={[
                  { nom: 'Abonnés payants', valeur: ab.actifs, couleur: '#C2410C' },
                  { nom: "En période d'essai", valeur: ab.essai, couleur: '#FDBA74' },
                  { nom: 'Expirés', valeur: ab.expires, couleur: '#A8A29E' },
                ]}
                centre={{ valeur: `${ab.taux_conversion} %`, libelle: 'passent au payant' }} />
            </Panneau>
            <Panneau titre="Villes" sous="Nombre de magasins par ville" icone={MapPin}>
              <Anneau donnees={d.villes.map((v) => ({ nom: v.ville, valeur: v.n }))} centre={{ libelle: 'magasins' }} />
            </Panneau>
          </div>

          <Panneau titre="Magasins les plus actifs" sous="Ventes des 30 derniers jours" icone={Trophy} sansMarge>
            {d.top_magasins.length === 0 ? <Etat icone={Warehouse} texte="Aucune vente sur les 30 derniers jours." /> : (
              <div className="su-table-wrap">
                <table className="su-table">
                  <thead><tr><th className="n">N°</th><th>Magasin</th><th className="cache-etroit">Ville</th><th className="r">Ventes</th><th className="r">Chiffre d'affaires</th></tr></thead>
                  <tbody>
                    {d.top_magasins.map((m) => (
                      <tr key={m.id_utilisateur}>
                        <td className="n" />
                        <td><button type="button" className="su-lien" onClick={() => navigate(`/super-admin/utilisateurs/${m.id_utilisateur}`)}>{m.nom_magasin || 'Magasin sans nom'}</button><span className="su-sous">{m.fullname}</span></td>
                        <td className="cache-etroit">{m.ville || '-'}</td>
                        <td className="r">{nombre(m.ventes)}</td>
                        <td className="r su-principal">{fcfa(m.chiffre)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panneau>
        </>
      )}
    </div>
  );
}
