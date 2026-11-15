// pages/SuperAdmin/Suivi/Revenus.jsx
// L'argent des abonnements : encaissé, attendu, par mois et par moyen de paiement.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, CalendarRange, TrendingUp, Repeat, Hourglass, Receipt, Wallet } from 'lucide-react';
import SuiviAdminService from '../../../services/superAdmin/suiviAdminService';
import { Courbe, Anneau, Jauge } from './graphiques';
import { Chargement, Chiffre, EnTete, Erreur, Etat, Panneau, dateCourte, dateHeure, fcfa, nombre, pluriel, useChargement } from './outils';

const MOYENS = { wave: 'Wave', orange: 'Orange Money', mtn: 'MTN MoMo', moov: 'Moov Money', banque: 'Banque', especes: 'Espèces', autre: 'Non précisé' };
const court = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e6) return `${(v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
  if (v >= 1e3) return `${Math.round(v / 1e3)} k`;
  return nombre(v);
};

export default function Revenus() {
  const navigate = useNavigate();
  const { donnees, chargement, erreur, recharger } = useChargement(() => SuiviAdminService.revenus());
  const d = donnees;
  const t = d?.totaux || {};
  const evolution = t.mois_dernier ? Math.round(((t.ce_mois - t.mois_dernier) / t.mois_dernier) * 100) : null;
  const totalMoyens = (d?.par_moyen || []).reduce((s, m) => s + m.total, 0);

  return (
    <div className="su">
      <EnTete titre="Revenus" sous="L'argent des abonnements Miyo, encaissé et attendu." chargement={chargement} onRecharger={recharger}>
        <button type="button" className="su-btn" onClick={() => navigate('/super-admin/abonnements')}><Wallet size={15} /> Abonnements</button>
      </EnTete>
      <Erreur texte={erreur} onRecharger={recharger} />

      {chargement && !d ? <Chargement /> : d && (
        <>
          <div className="su-chiffres">
            <Chiffre icone={Banknote} libelle="Encaissé ce mois-ci" valeur={nombre(t.ce_mois)} unite="FCFA" ton="brand"
              sous={evolution == null ? `Mois dernier : ${fcfa(t.mois_dernier)}` : `${evolution >= 0 ? '+' : ''}${evolution} % par rapport au mois dernier`} />
            <Chiffre icone={CalendarRange} libelle="Encaissé cette année" valeur={nombre(t.cette_annee)} unite="FCFA" sous={`Depuis le début : ${fcfa(t.depuis_debut)}`} />
            <Chiffre icone={Repeat} libelle="Revenu mensuel attendu" valeur={nombre(t.revenu_mensuel)} unite="FCFA" sous={`${pluriel(t.nb_payants, 'abonné payant', 'abonnés payants')}`} />
            <Chiffre icone={TrendingUp} libelle="À renouveler sous 30 jours" valeur={nombre(t.a_renouveler)} unite="FCFA" ton={t.nb_a_renouveler ? 'warn' : null}
              sous={`${pluriel(t.nb_a_renouveler, 'patron')} à relancer`} />
            <Chiffre icone={Hourglass} libelle="Potentiel des essais" valeur={nombre(t.potentiel_essais)} unite="FCFA" sous={`si les ${pluriel(t.nb_essais, 'essai')} deviennent payants`} />
          </div>

          <Panneau titre="Encaissements des 12 derniers mois" sous={`${pluriel(t.nb_paiements, 'paiement')} enregistrés depuis le début`} icone={Banknote}>
            <Courbe serie={d.serie} series={[{ cle: 'total', nom: 'Encaissé' }]} format={fcfa} formatAxe={court} hauteur={280}
              total={{ valeur: fcfa(d.serie.reduce((s, m) => s + (Number(m.total) || 0), 0)), libelle: 'encaissés sur 12 mois' }} />
          </Panneau>

          <div className="su-grille">
            <Panneau titre="Par moyen de paiement" sous="Cette année" icone={Receipt}>
              <Anneau donnees={d.par_moyen.map((m) => ({ nom: MOYENS[m.moyen] || m.moyen, valeur: m.total }))} format={fcfa}
                centre={{ valeur: court(totalMoyens), libelle: 'FCFA cette année' }} />
            </Panneau>
            <Panneau titre="Ce mois-ci en détail" icone={CalendarRange}>
              <Jauge valeur={t.ce_mois} objectif={t.revenu_mensuel} libelle="de l'attendu" format={fcfa}
                details={[
                  { nom: 'Encaissé ce mois-ci', valeur: t.ce_mois, couleur: '#C2410C' },
                  { nom: 'Attendu par mois', valeur: t.revenu_mensuel, couleur: '#F97316' },
                  { nom: 'Mois dernier', valeur: t.mois_dernier, couleur: '#A8A29E' },
                ]} />
            </Panneau>
          </div>

          <Panneau titre="Derniers paiements" sous="Les 25 plus récents" icone={Receipt} sansMarge>
            {d.derniers.length === 0 ? <Etat icone={Receipt} titre="Aucun paiement" texte="Les abonnements payés apparaîtront ici." /> : (
              <div className="su-table-wrap">
                <table className="su-table">
                  <thead>
                    <tr><th className="n">N°</th><th>Patron</th><th className="r">Montant</th><th>Période payée</th><th className="cache-etroit">Moyen</th><th className="cache-etroit">Enregistré</th></tr>
                  </thead>
                  <tbody>
                    {d.derniers.map((p) => (
                      <tr key={p.id_abonnement}>
                        <td className="n" />
                        <td><button type="button" className="su-lien" onClick={() => navigate(`/super-admin/abonnements?patron=${p.id_utilisateur}`)}>{p.fullname}</button><span className="su-sous">{p.nom_magasin || 'Magasin sans nom'}</span></td>
                        <td className="r"><span className="su-principal">{fcfa(p.montant)}</span><span className="su-sous">{pluriel(p.nb_mois, 'mois', 'mois')}</span></td>
                        <td className="nw">{dateCourte(p.date_debut)} au {dateCourte(p.date_fin)}</td>
                        <td className="cache-etroit">{MOYENS[p.moyen_paiement] || p.moyen_paiement || '-'}{p.reference ? <span className="su-sous">Réf. {p.reference}</span> : null}</td>
                        <td className="nw cache-etroit">{dateHeure(p.date_paiement)}<span className="su-sous">{p.enregistre_par ? `par ${p.enregistre_par}` : ''}</span></td>
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
