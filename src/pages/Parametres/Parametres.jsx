// pages/Parametres/Parametres.jsx
// ------------------------------------------------------------
// Paramètres du logiciel.
//   - Les réglages de cet ordinateur (imprimante, format des factures,
//     verrouillage, son, affichage) sont enregistrés sur l'appareil :
//     aucune donnée n'est envoyée au serveur ni à la base.
//   - Le compte et le magasin renvoient vers leurs pages existantes.
// ------------------------------------------------------------
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Printer, Lock, Bell, Monitor, UserCog, Info, RefreshCw, ChevronRight, Loader,
  User, Store, Users, CreditCard, History, Check, FileText, Receipt, HelpCircle, Wallet,
} from 'lucide-react';
import { Page, PageHead, useToast, Toast, fcfa } from '../../components/UI/Vt';
import { useUser } from '../../context/AuthContext';
import FacturePDFService from '../../services/facturePDFService';
import { verrouiller } from '../../securite/session';
import { useHorsLigne } from '../../offline/horsLigne';
import {
  DELAIS_VERROU, delaiVerrouMin, setDelaiVerrouMin,
  sonAlertesActif, setSonAlertes,
  formatFacture, setFormatFacture,
  menuReduit, setMenuReduit,
} from '../../config/preferences';
import { VERSION_LOGICIEL } from '../../config/version';
import MoyensPaiement from '../../components/Abonnement/MoyensPaiement';
import { chargerAbonnement, dateAbonnement, phraseEcheance } from '../../services/abonnementService';
import './Parametres.css';

const ELECTRON = typeof window !== 'undefined' ? window.electronAPI : undefined;

const SECTIONS = [
  { id: 'impression', label: 'Impression', icon: Printer },
  { id: 'securite', label: 'Sécurité', icon: Lock },
  { id: 'sons', label: 'Sons et alertes', icon: Bell },
  { id: 'affichage', label: 'Affichage', icon: Monitor },
  { id: 'compte', label: 'Compte et magasin', icon: UserCog },
  { id: 'appareil', label: 'Cet appareil', icon: Info },
  { id: 'abonnement', label: 'Abonnement', icon: Wallet, patron: true },
];

const ROLES = { admin: 'Administrateur', manager: 'Manager', caissier: 'Caissier', magasinier: 'Magasinier' };

// Interrupteur accessible (case à cocher stylée)
const Interrupteur = ({ id, checked, onChange, label }) => (
  <label className="pr-switch" htmlFor={id}>
    <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
    <span className="pr-switch-track" aria-hidden="true"><span className="pr-switch-thumb" /></span>
  </label>
);

// Une ligne de réglage : libellé + explication à gauche, contrôle à droite
const Ligne = ({ titre, aide, children, htmlFor }) => (
  <div className="pr-ligne">
    <div className="pr-ligne-texte">
      {htmlFor ? <label className="pr-ligne-titre" htmlFor={htmlFor}>{titre}</label> : <span className="pr-ligne-titre">{titre}</span>}
      {aide && <span className="pr-ligne-aide">{aide}</span>}
    </div>
    <div className="pr-ligne-controle">{children}</div>
  </div>
);

const Section = ({ id, numero, titre, sous, icon: Icon, children }) => (
  <section id={`pr-${id}`} className="pr-section" aria-labelledby={`pr-${id}-titre`}>
    <header className="pr-section-head">
      <span className="pr-section-icone" aria-hidden="true"><Icon size={18} /></span>
      <div>
        <h2 id={`pr-${id}-titre`}>{numero}. {titre}</h2>
        {sous && <p>{sous}</p>}
      </div>
    </header>
    <div className="pr-section-corps">{children}</div>
  </section>
);

export default function Parametres() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [toast, afficherToast, cacherToast] = useToast();
  const horsLigne = useHorsLigne();
  const estAdmin = user?.role === 'admin';
  const slug = user?.slug ? `/${user.slug}` : '';

  // ---------- Impression ----------
  const [imprimantes, setImprimantes] = useState([]);
  const [chargementImprimantes, setChargementImprimantes] = useState(false);
  const [imprimante, setImprimante] = useState(() => FacturePDFService.getSelectedPrinter());
  const [format, setFormat] = useState(formatFacture);
  const [testEnCours, setTestEnCours] = useState(false);

  // ---------- Autres réglages ----------
  const [delai, setDelai] = useState(delaiVerrouMin);
  const [son, setSon] = useState(sonAlertesActif);
  const [reduit, setReduit] = useState(menuReduit);

  // ---------- Abonnement (patron uniquement) ----------
  const estPatron = estAdmin && user?.type !== 'employe';
  const [abonnement, setAbonnement] = useState(null);
  const [erreurAbonnement, setErreurAbonnement] = useState(false);
  useEffect(() => {
    if (!estPatron) return;
    chargerAbonnement()
      .then((r) => setAbonnement(r))
      .catch(() => setErreurAbonnement(true));
  }, [estPatron]);
  const sections = SECTIONS.filter((s) => !s.patron || estPatron);

  // ---------- Cet appareil ----------
  const [versionOrdi, setVersionOrdi] = useState(null);
  const [nettoyage, setNettoyage] = useState(false);

  const chargerImprimantes = useCallback(async () => {
    if (!ELECTRON?.listPrinters) return;
    setChargementImprimantes(true);
    try {
      const liste = await ELECTRON.listPrinters();
      setImprimantes(Array.isArray(liste) ? liste : []);
    } catch {
      setImprimantes([]);
    } finally {
      setChargementImprimantes(false);
    }
  }, []);

  useEffect(() => {
    chargerImprimantes();
    ELECTRON?.getAppVersion?.().then(setVersionOrdi).catch(() => {});
  }, [chargerImprimantes]);

  const imprimanteParDefaut = useMemo(() => imprimantes.find((p) => p.isDefault)?.displayName, [imprimantes]);
  const imprimanteIntrouvable = imprimante && imprimantes.length > 0 && !imprimantes.some((p) => p.name === imprimante);

  const enregistre = (msg = 'Réglage enregistré') => afficherToast(msg, 'info');

  const changerImprimante = (nom) => {
    setImprimante(nom);
    FacturePDFService.setSelectedPrinter(nom);
    enregistre(nom ? `Imprimante : ${nom}` : "Imprimante par défaut de Windows");
  };

  const changerFormat = (f) => {
    setFormat(f);
    setFormatFacture(f);
    enregistre();
  };

  const changerDelai = (n) => {
    setDelai(n);
    setDelaiVerrouMin(n);
    enregistre(`Verrouillage après ${n} minutes`);
  };

  const changerSon = (actif) => {
    setSon(actif);
    setSonAlertes(actif);
    enregistre(actif ? 'Son des alertes activé' : 'Son des alertes coupé');
  };

  const changerMenu = (r) => {
    setReduit(r);
    setMenuReduit(r);
    enregistre();
  };

  // Page de test : un petit PDF envoyé à l'imprimante choisie
  const imprimerTest = async () => {
    setTestEnCours(true);
    try {
      const [{ pdf, Document, Page: PagePdf, Text, View }] = await Promise.all([import('@react-pdf/renderer')]);
      const date = new Date().toLocaleString('fr-FR');
      const doc = (
        <Document title="Miyo - page de test">
          <PagePdf size={format === 'ticket' ? [226.77, 300] : 'A4'} style={{ padding: 24, fontSize: 11 }}>
            <View>
              <Text style={{ fontSize: 16, marginBottom: 10 }}>Miyo - page de test</Text>
              <Text>Si vous lisez ceci, l'impression fonctionne.</Text>
              <Text style={{ marginTop: 8 }}>Imprimante : {imprimante || 'imprimante par défaut'}</Text>
              <Text>Format : {format === 'ticket' ? 'ticket 80 mm' : 'A4'}</Text>
              <Text>Date : {date}</Text>
            </View>
          </PagePdf>
        </Document>
      );
      const blob = await pdf(doc).toBlob();
      if (ELECTRON?.printPdf) {
        const res = await ELECTRON.printPdf(await blob.arrayBuffer(), { printer: imprimante || undefined });
        if (!res?.success) throw new Error(res?.error || "L'impression a échoué");
        afficherToast(res.fallback ? 'Page de test ouverte : imprimez-la depuis le lecteur PDF' : 'Page de test envoyée', 'success');
      } else {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        afficherToast('Page de test ouverte', 'success');
      }
    } catch (e) {
      afficherToast(e.message || "Impossible d'imprimer la page de test", 'error');
    } finally {
      setTestEnCours(false);
    }
  };

  // Vide le cache de l'application (fichiers gardés pour le hors ligne) puis recharge
  const viderCache = async () => {
    setNettoyage(true);
    try {
      if ('caches' in window) {
        const noms = await caches.keys();
        await Promise.all(noms.map((n) => caches.delete(n)));
      }
      if (navigator.serviceWorker?.getRegistrations) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update().catch(() => {})));
      }
    } finally {
      window.location.reload();
    }
  };

  const allerA = (id) => document.getElementById(`pr-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const liensCompte = [
    { id: 'mon-profil', titre: 'Mon profil', aide: 'Nom, téléphone, code de connexion, déconnexion des autres appareils', icon: User, visible: true },
    { id: 'mon-magasin', titre: 'Mon magasin', aide: 'Nom, adresse, logo et informations imprimées sur les factures', icon: Store, visible: estAdmin },
    { id: 'employes', titre: 'Employés', aide: 'Comptes de votre équipe et leurs droits', icon: Users, visible: estAdmin },
    { id: 'paiements', titre: 'Paiements', aide: 'Abonnement et historique des paiements', icon: CreditCard, visible: estAdmin },
    { id: 'journal', titre: "Journal d'activité", aide: 'Qui a fait quoi, et quand', icon: History, visible: estAdmin },
  ].filter((l) => l.visible);

  return (
    <Page className="pr-page">
      <PageHead title="Paramètres" sub="Réglages de cet ordinateur et accès à votre compte" />

      <div className="pr-grille">
        {/* ---------- Sommaire ---------- */}
        <nav className="pr-nav" aria-label="Sections des paramètres">
          <ol>
            {sections.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => allerA(s.id)}>
                    <span className="pr-nav-num">{i + 1}</span>
                    <Icon size={16} aria-hidden="true" />
                    <span>{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="pr-nav-note">
            <HelpCircle size={14} aria-hidden="true" />
            Ces réglages concernent cet ordinateur uniquement.
          </p>
        </nav>

        <div className="pr-contenu">
          {/* ---------- 1. Impression ---------- */}
          <Section id="impression" numero={1} titre="Impression" sous="Imprimante et format utilisés pour les factures" icon={Printer}>
            <Ligne
              titre="Imprimante des factures"
              htmlFor="pr-imprimante"
              aide={ELECTRON?.listPrinters
                ? (imprimanteIntrouvable
                  ? `« ${imprimante} » n'est plus branchée : l'imprimante par défaut sera utilisée.`
                  : 'Les factures et tickets partent directement sur cette imprimante.')
                : "L'imprimante se choisit au moment d'imprimer."}
            >
              {ELECTRON?.listPrinters ? (
                <div className="pr-inline">
                  <select
                    id="pr-imprimante"
                    className="vt-input pr-select"
                    value={imprimanteIntrouvable ? '' : imprimante}
                    onChange={(e) => changerImprimante(e.target.value)}
                    disabled={chargementImprimantes}
                  >
                    <option value="">Par défaut{imprimanteParDefaut ? ` (${imprimanteParDefaut})` : ''}</option>
                    {imprimantes.map((p, i) => (
                      <option key={p.name} value={p.name}>{i + 1}. {p.displayName}</option>
                    ))}
                  </select>
                  <button type="button" className="vt-btn vt-btn--icon" onClick={chargerImprimantes} aria-label="Actualiser la liste des imprimantes" title="Actualiser la liste">
                    {chargementImprimantes ? <Loader size={16} className="vt-spin" /> : <RefreshCw size={16} />}
                  </button>
                </div>
              ) : (
                <span className="pr-valeur">Choisie à l'impression</span>
              )}
            </Ligne>

            <Ligne titre="Format des factures" aide="Ce que propose le bouton « Imprimer » d'une facture.">
              <div className="vt-seg pr-seg" role="group" aria-label="Format des factures">
                {[
                  ['demander', 'Toujours demander', HelpCircle],
                  ['a4', 'Facture A4', FileText],
                  ['ticket', 'Ticket 80 mm', Receipt],
                ].map(([val, lib, Icon]) => (
                  <button key={val} type="button" aria-pressed={format === val} onClick={() => changerFormat(val)}>
                    <Icon size={14} aria-hidden="true" /> {lib}
                  </button>
                ))}
              </div>
            </Ligne>

            <Ligne titre="Page de test" aide="Vérifie que l'imprimante et le format choisis fonctionnent.">
              <button type="button" className="vt-btn" onClick={imprimerTest} disabled={testEnCours}>
                {testEnCours ? <Loader size={16} className="vt-spin" /> : <Printer size={16} />}
                Imprimer une page de test
              </button>
            </Ligne>
          </Section>

          {/* ---------- 2. Sécurité ---------- */}
          <Section id="securite" numero={2} titre="Sécurité" sous="Protection de l'écran quand personne ne l'utilise" icon={Lock}>
            <Ligne titre="Verrouiller l'écran après" htmlFor="pr-delai" aide="Sans activité pendant ce temps, Miyo demande votre code. Le travail en cours est conservé.">
              <select id="pr-delai" className="vt-input pr-select" value={delai} onChange={(e) => changerDelai(Number(e.target.value))}>
                {DELAIS_VERROU.map((n) => <option key={n} value={n}>{n} minutes</option>)}
              </select>
            </Ligne>
            <Ligne titre="Verrouiller maintenant" aide="Pratique avant de quitter le comptoir.">
              <button type="button" className="vt-btn" onClick={() => { verrouiller(); window.location.reload(); }}>
                <Lock size={16} /> Verrouiller
              </button>
            </Ligne>
            <Ligne titre="Code et appareils connectés" aide="Changer votre code ou déconnecter les autres appareils.">
              <button type="button" className="vt-btn" onClick={() => navigate(`${slug}/mon-profil`)}>
                Ouvrir mon profil <ChevronRight size={16} />
              </button>
            </Ligne>
          </Section>

          {/* ---------- 3. Sons ---------- */}
          <Section id="sons" numero={3} titre="Sons et alertes" sous="Signal sonore du tableau de bord" icon={Bell}>
            <Ligne titre="Son des alertes de stock" aide="Un signal sonore retentit sur le tableau de bord quand des produits sont en rupture ou presque.">
              <Interrupteur id="pr-son" checked={son} onChange={changerSon} label="Son des alertes de stock" />
            </Ligne>
          </Section>

          {/* ---------- 4. Affichage ---------- */}
          <Section id="affichage" numero={4} titre="Affichage" sous="Disposition de l'écran" icon={Monitor}>
            <Ligne titre="Menu latéral réduit" aide="N'affiche que les icônes du menu pour laisser plus de place aux pages.">
              <Interrupteur id="pr-menu" checked={reduit} onChange={changerMenu} label="Menu latéral réduit" />
            </Ligne>
            {ELECTRON && (
              <Ligne titre="Taille du texte" aide="Ctrl + et Ctrl - pour agrandir ou réduire, Ctrl 0 pour revenir à la normale. Aussi dans le menu Affichage en haut de la fenêtre.">
                <span className="pr-valeur"><kbd className="vt-kbd">Ctrl</kbd> <kbd className="vt-kbd">+</kbd> / <kbd className="vt-kbd">-</kbd></span>
              </Ligne>
            )}
          </Section>

          {/* ---------- 5. Compte et magasin ---------- */}
          <Section id="compte" numero={5} titre="Compte et magasin" sous={`Connecté en tant que ${user?.fullname || 'utilisateur'} (${ROLES[user?.role] || user?.role || '-'})`} icon={UserCog}>
            <ol className="pr-liens">
              {liensCompte.map((l, i) => {
                const Icon = l.icon;
                return (
                  <li key={l.id}>
                    <button type="button" className="pr-lien" onClick={() => navigate(`${slug}/${l.id}`)}>
                      <span className="pr-lien-num">{i + 1}</span>
                      <span className="pr-lien-icone" aria-hidden="true"><Icon size={18} /></span>
                      <span className="pr-lien-texte">
                        <strong>{l.titre}</strong>
                        <span>{l.aide}</span>
                      </span>
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ol>
          </Section>

          {/* ---------- 6. Cet appareil ---------- */}
          <Section id="appareil" numero={6} titre="Cet appareil" sous="Version, connexion et ventes en attente" icon={Info}>
            <ol className="pr-infos">
              <li><span>Version de Miyo</span><strong className="vt-num">{ELECTRON ? (versionOrdi || '...') : VERSION_LOGICIEL}</strong></li>
              {ELECTRON && <li><span>Version des écrans</span><strong className="vt-num">{VERSION_LOGICIEL}</strong></li>}
              <li>
                <span>Connexion au serveur</span>
                <strong className={horsLigne?.enLigne === false ? 'pr-etat pr-etat--bad' : 'pr-etat pr-etat--ok'}>
                  {horsLigne?.enLigne === false ? 'Hors ligne' : <><Check size={14} aria-hidden="true" /> En ligne</>}
                </strong>
              </li>
              <li>
                <span>Ventes hors ligne en attente d'envoi</span>
                <strong className="vt-num">{horsLigne?.enAttente ?? 0}</strong>
              </li>
            </ol>
            <Ligne titre="Recharger Miyo" aide="À utiliser si un écran s'affiche mal ou après une mise à jour. Vos ventes hors ligne ne sont pas effacées.">
              <button type="button" className="vt-btn" onClick={viderCache} disabled={nettoyage}>
                {nettoyage ? <Loader size={16} className="vt-spin" /> : <RefreshCw size={16} />}
                Recharger Miyo
              </button>
            </Ligne>
          </Section>

          {/* ---------- 7. Abonnement (patron) ---------- */}
          {estPatron && (
            <Section id="abonnement" numero={7} titre="Abonnement" sous="Votre formule Miyo et comment la renouveler" icon={Wallet}>
              {erreurAbonnement ? (
                <p className="pr-ligne-aide">Impossible de charger l'abonnement. Vérifiez la connexion puis rouvrez cette page.</p>
              ) : !abonnement ? (
                <p className="pr-ligne-aide"><Loader size={14} className="vt-spin" /> Chargement…</p>
              ) : (() => {
                const a = abonnement.abonnement;
                const j = a.jours_restants;
                const ton = a.statut === 'expire' ? 'expire' : j <= 5 ? 'bientot' : a.statut;
                const libelle = a.statut === 'expire' ? 'Expiré' : a.en_essai ? 'Essai gratuit' : 'Actif';
                return (
                  <>
                    <div className="abo-etat">
                      <div>
                        <span>Statut</span>
                        <span className={`abo-pastille abo-pastille--${ton}`}>{libelle}</span>
                        <small>{phraseEcheance(a)}</small>
                      </div>
                      <div>
                        <span>{a.statut === 'expire' ? 'Fin le' : 'Valable jusqu\'au'}</span>
                        <strong>{dateAbonnement(a.date_fin)}</strong>
                      </div>
                      <div>
                        <span>Prix par mois</span>
                        <strong className="vt-num">{fcfa(a.montant_mensuel)}</strong>
                        <small>{a.nb_produits} produit{a.nb_produits > 1 ? 's' : ''} enregistré{a.nb_produits > 1 ? 's' : ''}</small>
                      </div>
                    </div>
                    <Ligne
                      titre="Comment le prix est calculé"
                      aide={`${fcfa(abonnement.tarif.base)} par mois jusqu'à ${abonnement.tarif.seuil} produits, puis ${fcfa(abonnement.tarif.supplement)} de plus par tranche de ${abonnement.tarif.palier} produits.`}
                    />
                    <h3 className="abo-sous-titre pr-abo-titre">Pour renouveler, payez sur l'un de ces numéros</h3>
                    <MoyensPaiement moyens={abonnement.moyens} />
                    <p className="abo-note">
                      {abonnement.contact
                        ? <span>Après le paiement, envoyez la référence de la transaction au <strong>{abonnement.contact}</strong>. Votre abonnement sera prolongé dès réception.</span>
                        : <span>Après le paiement, votre abonnement sera prolongé dès réception.</span>}
                    </p>
                  </>
                );
              })()}
            </Section>
          )}
        </div>
      </div>

      <Toast toast={toast} onClose={cacherToast} />
    </Page>
  );
}
