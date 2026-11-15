// pages/SuperAdmin/Suivi/Parametres.jsx
// Paramètres de la console : mon compte, maintenance, annonce aux patrons,
// application mobile, abonnements. Une section à la fois.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserRound, KeyRound, Wrench, Megaphone, Smartphone, Wallet, Save, Eye, EyeOff, ChevronRight, Info, AlertTriangle,
} from 'lucide-react';
import { PlateformeAdminService } from '../../../services/superAdmin/suiviAdminService';
import AbonnementAdminService from '../../../services/superAdmin/abonnementAdminService';
import { useSuperAdmin } from '../../../context/SuperAdminAuthContext';
import { Chargement, EnTete, Erreur, dateHeure, fcfa, useMessage } from './outils';

const SECTIONS = [
  { groupe: 'Mon compte', items: [
    { id: 'compte', titre: 'Mon profil', icone: UserRound },
    { id: 'motdepasse', titre: 'Mot de passe', icone: KeyRound },
  ] },
  { groupe: 'Plateforme', items: [
    { id: 'maintenance', titre: 'Maintenance', icone: Wrench },
    { id: 'annonce', titre: 'Annonce aux patrons', icone: Megaphone },
    { id: 'application', titre: 'Application mobile', icone: Smartphone },
  ] },
  { groupe: 'Ventes', items: [
    { id: 'abonnements', titre: 'Abonnements et tarif', icone: Wallet },
  ] },
];

const messageErreur = (e, defaut) => e?.response?.data?.message || defaut;

function Interrupteur({ actif, onChange, libelle, id }) {
  return (
    <button type="button" id={id} role="switch" aria-checked={actif} aria-label={libelle}
      className={`pa-switch ${actif ? 'is-on' : ''}`} onClick={() => onChange(!actif)}>
      <span />
    </button>
  );
}

function Champ({ libelle, aide, children, id }) {
  return (
    <div className="pa-champ">
      <label htmlFor={id}>{libelle}</label>
      {children}
      {aide && <small>{aide}</small>}
    </div>
  );
}

export default function Parametres() {
  const navigate = useNavigate();
  const { superAdmin, refresh, changePassword } = useSuperAdmin();
  const [section, setSection] = useState('compte');
  const [vueMessage, message] = useMessage();

  const [reglages, setReglages] = useState(null);
  const [form, setForm] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [abo, setAbo] = useState(null);

  const charger = async () => {
    setErreur(null);
    try {
      const r = await PlateformeAdminService.reglages();
      setReglages(r.reglages);
      setForm(JSON.parse(JSON.stringify(r.reglages)));
    } catch (e) {
      setErreur(messageErreur(e, 'Chargement impossible'));
    }
  };
  useEffect(() => { charger(); }, []);
  useEffect(() => {
    if (section !== 'abonnements' || abo) return;
    AbonnementAdminService.reglages().then((r) => setAbo(r?.reglages || null)).catch(() => setAbo(false));
  }, [section, abo]);

  const maj = (bloc, cle, valeur) => setForm((f) => ({ ...f, [bloc]: { ...f[bloc], [cle]: valeur } }));
  const modifie = (bloc) => form && reglages && JSON.stringify(form[bloc]) !== JSON.stringify(reglages[bloc]);

  const enregistrer = async (bloc, texteOk) => {
    setEnvoi(true);
    try {
      const r = await PlateformeAdminService.enregistrer({ [bloc]: form[bloc] });
      setReglages(r.reglages);
      setForm((f) => ({ ...f, [bloc]: JSON.parse(JSON.stringify(r.reglages[bloc])) }));
      message(texteOk);
    } catch (e) {
      message(messageErreur(e, "L'enregistrement n'a pas pu être fait."), true);
    } finally {
      setEnvoi(false);
    }
  };

  const etatSection = (id) => {
    if (!reglages) return null;
    if (id === 'maintenance' && reglages.maintenance.active) return <span className="pa-etiquette pa-etiquette--danger">Activée</span>;
    if (id === 'annonce' && reglages.annonce.active) return <span className="pa-etiquette">En ligne</span>;
    if (id === 'application' && reglages.application.version_min) return <span className="pa-etiquette pa-etiquette--neutre">{reglages.application.version_min}</span>;
    return null;
  };

  return (
    <div className="su">
      <EnTete titre="Paramètres" sous="Ton compte et les réglages de toute la plateforme Miyo." />
      <Erreur texte={erreur} onRecharger={charger} />

      <div className="pa">
        <nav className="pa-menu" aria-label="Sections des paramètres">
          {SECTIONS.map((g) => (
            <div key={g.groupe} className="pa-groupe">
              <p>{g.groupe}</p>
              <ol>
                {g.items.map((it) => {
                  const Icone = it.icone;
                  return (
                    <li key={it.id}>
                      <button type="button" className={section === it.id ? 'is-on' : ''} aria-current={section === it.id ? 'page' : undefined} onClick={() => setSection(it.id)}>
                        <Icone size={16} />
                        <span>{it.titre}</span>
                        {etatSection(it.id)}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </nav>

        <div className="pa-contenu">
          {section === 'compte' && <Profil superAdmin={superAdmin} refresh={refresh} message={message} />}
          {section === 'motdepasse' && <MotDePasse changePassword={changePassword} message={message} />}

          {['maintenance', 'annonce', 'application'].includes(section) && !form && !erreur && <Chargement />}

          {section === 'maintenance' && form && (
            <section className="su-panneau pa-carte">
              <header className="pa-tete">
                <div>
                  <h2><Wrench size={17} /> Maintenance</h2>
                  <p>Pendant une mise à jour du serveur, les patrons et les employés ne peuvent plus travailler. Ils voient ton message à la place de Miyo. La console reste accessible.</p>
                </div>
                <Interrupteur id="pa-maint" actif={form.maintenance.active} libelle="Activer la maintenance" onChange={(v) => maj('maintenance', 'active', v)} />
              </header>
              {form.maintenance.active && (
                <div className="pa-alerte pa-alerte--danger"><AlertTriangle size={16} /> Une fois enregistrée, plus aucun patron ni employé ne pourra se connecter ou enregistrer une vente.</div>
              )}
              <Champ id="pa-maint-msg" libelle="Message affiché aux patrons" aide={`${form.maintenance.message.length}/300 caractères`}>
                <textarea id="pa-maint-msg" rows={3} maxLength={300} value={form.maintenance.message} onChange={(e) => maj('maintenance', 'message', e.target.value)} />
              </Champ>
              <Champ id="pa-maint-fin" libelle="Retour prévu (facultatif)" aide="Affiché aux patrons pour qu'ils sachent quand revenir.">
                <input id="pa-maint-fin" type="datetime-local" value={form.maintenance.fin_prevue || ''} onChange={(e) => maj('maintenance', 'fin_prevue', e.target.value)} />
              </Champ>
              <Apercu titre="Ce que voient les patrons">
                <div className="pa-apercu-maint">
                  <Wrench size={26} />
                  <strong>Miyo est en maintenance</strong>
                  <p>{form.maintenance.message}</p>
                  {form.maintenance.fin_prevue && <small>Retour prévu le {dateHeure(form.maintenance.fin_prevue.replace('T', ' '))}</small>}
                </div>
              </Apercu>
              <Pied modifie={modifie('maintenance')} envoi={envoi} danger={form.maintenance.active && !reglages.maintenance.active}
                texte={form.maintenance.active && !reglages.maintenance.active ? 'Activer la maintenance' : 'Enregistrer'}
                onAnnuler={() => setForm((f) => ({ ...f, maintenance: { ...reglages.maintenance } }))}
                onEnregistrer={() => enregistrer('maintenance', form.maintenance.active ? 'Maintenance activée.' : 'Maintenance arrêtée, Miyo est de nouveau ouvert.')} />
            </section>
          )}

          {section === 'annonce' && form && (
            <section className="su-panneau pa-carte">
              <header className="pa-tete">
                <div>
                  <h2><Megaphone size={17} /> Annonce aux patrons</h2>
                  <p>Un message affiché en haut de l'application de tous les patrons : nouvelle fonction, changement de tarif, maintenance prévue. Chaque patron peut la fermer.</p>
                </div>
                <Interrupteur id="pa-ann" actif={form.annonce.active} libelle="Publier l'annonce" onChange={(v) => maj('annonce', 'active', v)} />
              </header>
              <div className="pa-ligne">
                <Champ id="pa-ann-niveau" libelle="Type d'annonce">
                  <div className="su-seg" role="group" aria-label="Type d'annonce">
                    {[['info', 'Information'], ['important', 'Important']].map(([v, l]) => (
                      <button key={v} type="button" className={form.annonce.niveau === v ? 'is-on' : ''} aria-pressed={form.annonce.niveau === v} onClick={() => maj('annonce', 'niveau', v)}>{l}</button>
                    ))}
                  </div>
                </Champ>
                <Champ id="pa-ann-fin" libelle="Retirer automatiquement après le (facultatif)">
                  <input id="pa-ann-fin" type="date" value={(form.annonce.fin || '').slice(0, 10)} onChange={(e) => maj('annonce', 'fin', e.target.value)} />
                </Champ>
              </div>
              <Champ id="pa-ann-titre" libelle="Titre (facultatif)">
                <input id="pa-ann-titre" type="text" maxLength={120} value={form.annonce.titre} placeholder="Nouveau : les factures en 4 modèles" onChange={(e) => maj('annonce', 'titre', e.target.value)} />
              </Champ>
              <Champ id="pa-ann-msg" libelle="Message" aide={`${form.annonce.message.length}/500 caractères`}>
                <textarea id="pa-ann-msg" rows={3} maxLength={500} value={form.annonce.message} onChange={(e) => maj('annonce', 'message', e.target.value)} />
              </Champ>
              {form.annonce.active && !form.annonce.message.trim() && (
                <div className="pa-alerte"><Info size={16} /> Écris un message pour publier l'annonce.</div>
              )}
              <Apercu titre="Aperçu en haut de l'application">
                <div className={`pa-apercu-annonce ${form.annonce.niveau === 'important' ? 'is-important' : ''}`}>
                  {form.annonce.niveau === 'important' ? <AlertTriangle size={17} /> : <Megaphone size={17} />}
                  <div>
                    {form.annonce.titre && <strong>{form.annonce.titre}</strong>}
                    <span>{form.annonce.message || 'Ton message apparaîtra ici.'}</span>
                  </div>
                </div>
              </Apercu>
              <Pied modifie={modifie('annonce')} envoi={envoi} desactive={form.annonce.active && !form.annonce.message.trim()}
                texte={form.annonce.active && !reglages.annonce.active ? "Publier l'annonce" : 'Enregistrer'}
                onAnnuler={() => setForm((f) => ({ ...f, annonce: { ...reglages.annonce } }))}
                onEnregistrer={() => enregistrer('annonce', form.annonce.active ? 'Annonce publiée.' : 'Annonce retirée.')} />
            </section>
          )}

          {section === 'application' && form && (
            <section className="su-panneau pa-carte">
              <header className="pa-tete">
                <div>
                  <h2><Smartphone size={17} /> Application mobile</h2>
                  <p>Oblige les patrons qui ont une ancienne version de l'application à installer la nouvelle. Utile quand une mise à jour corrige un problème important.</p>
                </div>
              </header>
              <div className="pa-ligne">
                <Champ id="pa-app-v" libelle="Version minimale" aide="Exemple : 1.4.0. Laisse vide pour ne bloquer personne.">
                  <input id="pa-app-v" type="text" inputMode="decimal" maxLength={12} placeholder="1.4.0" value={form.application.version_min} onChange={(e) => maj('application', 'version_min', e.target.value.replace(/[^0-9.]/g, ''))} />
                </Champ>
                <Champ id="pa-app-lien" libelle="Lien de téléchargement" aide="Adresse où se trouve le fichier APK ou la fiche sur Google Play.">
                  <input id="pa-app-lien" type="url" maxLength={300} placeholder="https://miyo.n-double.com/miyo.apk" value={form.application.lien} onChange={(e) => maj('application', 'lien', e.target.value)} />
                </Champ>
              </div>
              <Champ id="pa-app-msg" libelle="Message affiché">
                <textarea id="pa-app-msg" rows={2} maxLength={300} value={form.application.message} onChange={(e) => maj('application', 'message', e.target.value)} />
              </Champ>
              {form.application.version_min && !/^\d+(\.\d+){0,2}$/.test(form.application.version_min) && (
                <div className="pa-alerte"><Info size={16} /> La version doit ressembler à 1.4 ou 1.4.0.</div>
              )}
              <div className="pa-alerte pa-alerte--neutre"><Info size={16} /> Ce blocage marche à partir de la prochaine version de l'application. Les applications déjà installées avant ne savent pas encore le lire.</div>
              <Pied modifie={modifie('application')} envoi={envoi}
                desactive={!!form.application.version_min && !/^\d+(\.\d+){0,2}$/.test(form.application.version_min)}
                onAnnuler={() => setForm((f) => ({ ...f, application: { ...reglages.application } }))}
                onEnregistrer={() => enregistrer('application', 'Réglages de l\'application enregistrés.')} />
            </section>
          )}

          {section === 'abonnements' && (
            <section className="su-panneau pa-carte">
              <header className="pa-tete">
                <div>
                  <h2><Wallet size={17} /> Abonnements et tarif</h2>
                  <p>Le prix, la durée de l'essai gratuit et les numéros où les patrons paient se règlent depuis la page Abonnements.</p>
                </div>
              </header>
              {abo === null ? <Chargement /> : abo === false ? <p className="pa-texte">Réglages indisponibles.</p> : (
                <ol className="pa-resume">
                  <li><span>Prix de base par mois</span><strong>{fcfa(abo.tarif?.base)}</strong></li>
                  <li><span>Supplément</span><strong>{fcfa(abo.tarif?.supplement)} par tranche de {abo.tarif?.palier} produits au-delà de {abo.tarif?.seuil}</strong></li>
                  <li><span>Essai gratuit</span><strong>{abo.jours_essai} jours</strong></li>
                  <li><span>Moyens de paiement actifs</span><strong>{(abo.moyens || []).filter((m) => m.actif).map((m) => m.nom).join(', ') || 'Aucun'}</strong></li>
                </ol>
              )}
              <div className="pa-pied">
                <button type="button" className="su-btn su-btn--primary" onClick={() => navigate('/super-admin/abonnements?reglages=1')}>Modifier le tarif et les paiements <ChevronRight size={15} /></button>
              </div>
            </section>
          )}
        </div>
      </div>
      {vueMessage}
    </div>
  );
}

function Apercu({ titre, children }) {
  return (
    <div className="pa-apercu">
      <p>{titre}</p>
      {children}
    </div>
  );
}

function Pied({ modifie, envoi, onAnnuler, onEnregistrer, texte = 'Enregistrer', danger, desactive }) {
  return (
    <div className="pa-pied">
      {modifie && <button type="button" className="su-btn" onClick={onAnnuler} disabled={envoi}>Annuler</button>}
      <button type="button" className={`su-btn su-btn--primary ${danger ? 'pa-btn-danger' : ''}`} onClick={onEnregistrer} disabled={!modifie || envoi || desactive}>
        <Save size={15} /> {envoi ? 'Enregistrement…' : texte}
      </button>
    </div>
  );
}

function Profil({ superAdmin, refresh, message }) {
  const [nom, setNom] = useState(superAdmin?.fullname || '');
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => { setNom(superAdmin?.fullname || ''); }, [superAdmin?.fullname]);
  const enregistrer = async () => {
    setEnvoi(true);
    try {
      await PlateformeAdminService.profil(nom.trim());
      await refresh();
      message('Nom modifié.');
    } catch (e) {
      message(messageErreur(e, 'Modification impossible.'), true);
    } finally {
      setEnvoi(false);
    }
  };
  const initiales = (superAdmin?.fullname || 'SA').split(' ').filter(Boolean).map((m) => m[0]).join('').slice(0, 2).toUpperCase();
  return (
    <section className="su-panneau pa-carte">
      <header className="pa-tete">
        <div className="pa-identite">
          <span className="pa-avatar">{initiales}</span>
          <div>
            <h2>{superAdmin?.fullname || 'Super Admin'}</h2>
            <p>Super administrateur de Miyo</p>
          </div>
        </div>
      </header>
      <Champ id="pa-nom" libelle="Nom affiché">
        <input id="pa-nom" type="text" maxLength={100} value={nom} onChange={(e) => setNom(e.target.value)} />
      </Champ>
      <ol className="pa-resume">
        <li><span>Téléphone de connexion</span><strong>{superAdmin?.telephone || '—'}</strong></li>
        <li><span>Email de connexion</span><strong>{superAdmin?.email || '—'}</strong></li>
        <li><span>Dernière connexion</span><strong>{superAdmin?.derniere_connexion ? dateHeure(superAdmin.derniere_connexion) : '—'}</strong></li>
      </ol>
      <p className="pa-texte">Le téléphone et l'email servent à te connecter. Pour les changer, il faut passer par le serveur.</p>
      <div className="pa-pied">
        <button type="button" className="su-btn su-btn--primary" onClick={enregistrer} disabled={envoi || nom.trim().length < 2 || nom.trim() === superAdmin?.fullname}>
          <Save size={15} /> {envoi ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </section>
  );
}

function MotDePasse({ changePassword, message }) {
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirme, setConfirme] = useState('');
  const [voir, setVoir] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const regles = [
    ['Au moins 8 caractères', nouveau.length >= 8],
    ['Une lettre majuscule', /[A-Z]/.test(nouveau)],
    ['Un chiffre', /[0-9]/.test(nouveau)],
    ['Les deux saisies sont identiques', nouveau.length > 0 && nouveau === confirme],
  ];
  const valide = ancien && regles.every(([, ok]) => ok);
  const envoyer = async () => {
    setEnvoi(true);
    try {
      const r = await changePassword(ancien, nouveau);
      if (r?.success === false) throw new Error(r.message);
      setAncien(''); setNouveau(''); setConfirme('');
      message('Mot de passe modifié.');
    } catch (e) {
      message(messageErreur(e, e?.message || 'Modification impossible.'), true);
    } finally {
      setEnvoi(false);
    }
  };
  const type = voir ? 'text' : 'password';
  return (
    <section className="su-panneau pa-carte">
      <header className="pa-tete">
        <div>
          <h2><KeyRound size={17} /> Mot de passe</h2>
          <p>Le mot de passe protège toute la plateforme : choisis-en un que tu n'utilises nulle part ailleurs.</p>
        </div>
        <button type="button" className="su-btn su-btn--sm" onClick={() => setVoir((v) => !v)}>{voir ? <EyeOff size={14} /> : <Eye size={14} />} {voir ? 'Masquer' : 'Afficher'}</button>
      </header>
      <Champ id="pa-mdp-a" libelle="Mot de passe actuel">
        <input id="pa-mdp-a" type={type} autoComplete="current-password" value={ancien} onChange={(e) => setAncien(e.target.value)} />
      </Champ>
      <div className="pa-ligne">
        <Champ id="pa-mdp-n" libelle="Nouveau mot de passe">
          <input id="pa-mdp-n" type={type} autoComplete="new-password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} />
        </Champ>
        <Champ id="pa-mdp-c" libelle="Confirmer le nouveau">
          <input id="pa-mdp-c" type={type} autoComplete="new-password" value={confirme} onChange={(e) => setConfirme(e.target.value)} />
        </Champ>
      </div>
      <ol className="pa-regles">
        {regles.map(([l, ok]) => <li key={l} className={ok ? 'is-ok' : ''}>{l}</li>)}
      </ol>
      <div className="pa-pied">
        <button type="button" className="su-btn su-btn--primary" onClick={envoyer} disabled={!valide || envoi}><Save size={15} /> {envoi ? 'Modification…' : 'Changer le mot de passe'}</button>
      </div>
    </section>
  );
}
