// pages/ComptesFournisseurs/ComptesFournisseurs.jsx
// ============================================================
// COMPTES FOURNISSEURS — la situation du commerçant chez chaque fournisseur :
// achats notés, versements, bonus, plafond de crédit, rapprochement avec le
// solde annoncé par le fournisseur. Rien ici ne touche au stock.
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, RefreshCw, ArrowLeft, ShoppingBag, Wallet, Gift, Ticket, Gauge, Scale, Paperclip, Ban,
  AlertTriangle, Loader, Search, SlidersHorizontal, Eye, CheckCircle2, BookOpen, PackageCheck, Undo2, ClipboardList,
} from 'lucide-react';
import CompteFournisseurService from '../../services/compteFournisseurService';
import { useModesPaiement, useModeValide, libelleMode } from '../../config/modesPaiement';
import {
  Page, PageHead, Chiffres, Onglets, Badge, ErrorBar, Toast, useToast, Modal, ModalHead,
  fcfa, dateFR, dateHeureFR,
} from '../../components/UI/Vt';
import '../Ventes/Ventes.css';
import './ComptesFournisseurs.css';

const aujourdhui = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const versNombre = (v) => {
  const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const MONTANT_RE = /^-?[\d\s]*[.,]?\d{0,2}$/;

const TYPES = {
  reception: { label: 'Réception', Icon: PackageCheck },
  achat: { label: 'Achat hors stock', Icon: ShoppingBag },
  retour: { label: 'Retour', Icon: Undo2 },
  versement: { label: 'Versement', Icon: Wallet },
  bonus: { label: 'Bonus reçu', Icon: Gift },
  utilisation_bonus: { label: 'Bonus utilisé', Icon: Ticket },
  ajustement: { label: 'Ajustement', Icon: SlidersHorizontal },
  plafond: { label: 'Plafond', Icon: Gauge },
};
const TYPES_BONUS = { libre: 'Libre', conditionnel: 'Conditionnel', avoir: 'Avoir' };
const TON_ALERTE = { danger: 'bad', attention: 'warn', info: 'muted' };

// ------------------------------------------------------------
// Champs communs
// ------------------------------------------------------------
function ChampMontant({ id, label, value, onChange, disabled, autoFocus, aide, negatif = false }) {
  return (
    <div className="vt-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="vt-input vt-num" inputMode="decimal" autoComplete="off" autoFocus={autoFocus}
             value={value} disabled={disabled} placeholder="0"
             onChange={(e) => {
               const v = e.target.value;
               if (!negatif && v.includes('-')) return;
               if (MONTANT_RE.test(v)) onChange(v);
             }} />
      {aide && <small className="vt-hint">{aide}</small>}
    </div>
  );
}

function ChampTexte({ id, label, value, onChange, disabled, placeholder, max = 100, facultatif = true }) {
  return (
    <div className="vt-field">
      <label htmlFor={id}>{label} {facultatif && <span className="vt-muted">(facultatif)</span>}</label>
      <input id={id} className="vt-input" value={value} maxLength={max} placeholder={placeholder}
             onChange={(e) => onChange(e.target.value)} disabled={disabled} autoComplete="off" />
    </div>
  );
}

function ChampDate({ id, label, value, onChange, disabled, min, max }) {
  return (
    <div className="vt-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="date" className="vt-input" value={value} min={min} max={max}
             onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  );
}

function ChampJustificatif({ fichier, onChange, disabled }) {
  return (
    <div className="vt-field">
      <span className="vt-field-label">Justificatif <span className="vt-muted">(facultatif : photo ou PDF, 5 Mo max)</span></span>
      <label className={`cf-fichier ${fichier ? 'has-file' : ''}`}>
        <Paperclip size={15} />
        <span>{fichier ? fichier.name : 'Joindre la photo du reçu ou de la facture'}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={disabled}
               onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </label>
      {fichier && <button type="button" className="vt-link cf-retirer" onClick={() => onChange(null)} disabled={disabled}>Retirer le fichier</button>}
    </div>
  );
}

function ChoixMode({ mode, setMode, disabled, idLabel }) {
  const MODES = useModesPaiement();
  useModeValide(MODES, mode, setMode);
  return (
    <div className="vt-field">
      <span className="vt-field-label" id={idLabel}>Mode de paiement</span>
      <div className="vt-modes cf-modes" role="radiogroup" aria-labelledby={idLabel}>
        {MODES.map(({ value, label, Icon }) => (
          <button key={value} type="button" role="radio" aria-checked={mode === value}
                  className={`vt-mode ${mode === value ? 'is-active' : ''}`} onClick={() => setMode(value)} disabled={disabled}>
            <Icon size={17} /><span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const Erreur = ({ texte }) => (texte ? <div className="vt-error" role="alert"><AlertTriangle size={16} /><span>{texte}</span></div> : null);

// ------------------------------------------------------------
// Nouveau compte
// ------------------------------------------------------------
function ModalNouveauCompte({ onClose, onCree }) {
  const [nouveau, setNouveau] = useState({ nom: '', telephone: '', ville: '' });
  const [plafond, setPlafond] = useState('');
  const [soldeInitial, setSoldeInitial] = useState('');
  const [sensSolde, setSensSolde] = useState('dette');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState(null);

  const creer = async () => {
    setErreur(null);
    if (!nouveau.nom.trim()) { setErreur('Donnez le nom du fournisseur.'); return; }
    setSaving(true);
    try {
      const solde = versNombre(soldeInitial);
      const r = await CompteFournisseurService.creer({
        nouveau_fournisseur: nouveau,
        plafond: versNombre(plafond),
        solde_initial: sensSolde === 'avance' ? -solde : solde,
        note: note.trim(),
      });
      onCree(r.compte);
    } catch (e) { setErreur(e.message); } finally { setSaving(false); }
  };

  return (
    <Modal size="md" busy={saving} labelledBy="cf-nc-titre" dismissable={!saving} onClose={onClose}>
      <ModalHead id="cf-nc-titre" title="Nouveau fournisseur" sub="Son compte est créé en même temps. Vos fournisseurs existants ont déjà le leur dans la liste." onClose={onClose} disabled={saving} />
      <div className="vt-modal-body cf-form">
        <Erreur texte={erreur} />
        <div className="vt-grid-2">
          <ChampTexte id="cf-nc-nom" label="Nom" facultatif={false} value={nouveau.nom} max={200}
                      onChange={(v) => setNouveau({ ...nouveau, nom: v })} disabled={saving} placeholder="Ex : YUZIN" />
          <ChampTexte id="cf-nc-tel" label="Téléphone" value={nouveau.telephone} max={20}
                      onChange={(v) => setNouveau({ ...nouveau, telephone: v })} disabled={saving} />
          <ChampTexte id="cf-nc-ville" label="Ville" value={nouveau.ville}
                      onChange={(v) => setNouveau({ ...nouveau, ville: v })} disabled={saving} />
        </div>
        <ChampMontant id="cf-nc-plafond" label="Plafond de crédit accordé" value={plafond} onChange={setPlafond} disabled={saving}
                      aide="Laissez vide ou 0 si ce fournisseur ne vous donne pas de crédit." />
        <div className="vt-field">
          <span className="vt-field-label">Situation de départ <span className="vt-muted">(ce que dit votre cahier aujourd'hui)</span></span>
          <div className="vt-grid-2">
            <select className="vt-input" value={sensSolde} onChange={(e) => setSensSolde(e.target.value)} disabled={saving} aria-label="Sens du solde de départ">
              <option value="dette">Je lui dois</option>
              <option value="avance">J'ai une avance chez lui</option>
            </select>
            <input className="vt-input vt-num" inputMode="decimal" placeholder="0" value={soldeInitial} disabled={saving}
                   aria-label="Montant du solde de départ"
                   onChange={(e) => !e.target.value.includes('-') && MONTANT_RE.test(e.target.value) && setSoldeInitial(e.target.value)} />
          </div>
        </div>
        <ChampTexte id="cf-nc-note" label="Note" value={note} onChange={setNote} disabled={saving} max={500} placeholder="Conditions, contact du commercial…" />
      </div>
      <div className="vt-modal-foot vt-modal-foot--end">
        <button type="button" className="vt-btn" onClick={onClose} disabled={saving}>Annuler</button>
        <button type="button" className="vt-btn vt-btn--primary" onClick={creer} disabled={saving}>
          {saving ? <Loader size={16} className="vt-spin" /> : <Plus size={16} />} Créer le fournisseur
        </button>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------
// Une opération : achat, versement, bonus, utilisation, ajustement, plafond
// ------------------------------------------------------------
const TITRES = {
  achat: ['Achat hors stock', "Marchandise prise sans réception dans Miyo (les réceptions s'ajoutent toutes seules)."],
  versement: ['Enregistrer un versement', "L'argent donné à ce fournisseur. Il paie d'abord les commandes les plus anciennes."],
  bonus: ['Enregistrer un bonus', 'Avantage accordé par le fournisseur, gardé à part de vos versements.'],
  utiliser: ['Utiliser un bonus', 'Marchandise offerte, ou avoir qui règle une partie de la dette.'],
  ajustement: ['Ajustement', 'Correction autorisée (remise, erreur du fournisseur…). La raison est obligatoire.'],
  plafond: ['Modifier le plafond', 'Accorder, augmenter, réduire ou retirer le plafond. Chaque changement est gardé.'],
};

function ModalOperation({ type, compte, commandes = [], commandeInitiale = null, onClose, onFait }) {
  const bonusDispo = (compte.bonus || []).filter((b) => b.reste > 0.009 && !b.expire);
  const [montant, setMontant] = useState(type === 'plafond' ? String(Math.round(compte.plafond) || '') : '');
  const [paye, setPaye] = useState('');
  const [bonusUtilise, setBonusUtilise] = useState('');
  const [idBonus, setIdBonus] = useState(bonusDispo[0] ? String(bonusDispo[0].id_operation) : '');
  const [mode, setMode] = useState('especes');
  const [date, setDate] = useState(aujourdhui());
  const [reference, setReference] = useState('');
  const [observation, setObservation] = useState('');
  const [typeBonus, setTypeBonus] = useState('libre');
  const [expiration, setExpiration] = useState('');
  const [surDette, setSurDette] = useState(false);
  const [sens, setSens] = useState('baisse');
  const [fichier, setFichier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState(null);
  const dues = commandes.filter((c) => c.reste > 0.009);
  const [cible, setCible] = useState(commandeInitiale ? String(commandeInitiale) : 'auto');
  const commande = dues.find((c) => String(c.id_commande_achat) === cible);

  const bonusChoisi = bonusDispo.find((b) => String(b.id_operation) === idBonus);
  const total = versNombre(montant);
  const restant = Math.max(total - versNombre(paye) - versNombre(bonusUtilise), 0);
  const [titre, sous] = TITRES[type];

  // Aperçu du crédit après un achat (avertissement, l'enregistrement reste possible)
  const creditApres = type === 'achat' ? Math.max(compte.dette + restant, 0) : null;
  const depasse = type === 'achat' && compte.plafond > 0 && creditApres > compte.plafond
    ? creditApres - compte.plafond : 0;

  const envoyer = async () => {
    setErreur(null);
    const base = { date_operation: date, reference: reference.trim(), observation: observation.trim(), justificatif: fichier };
    try {
      let r;
      setSaving(true);
      const id = compte.id_compte;
      if (type === 'achat') {
        r = await CompteFournisseurService.achat(id, { ...base, montant: total, montant_paye: versNombre(paye), mode_paiement: mode,
          bonus_utilise: versNombre(bonusUtilise), id_bonus: versNombre(bonusUtilise) > 0 ? idBonus : '' });
      } else if (type === 'versement') {
        if (commande && total > commande.reste + 0.009) throw new Error(`Ce montant dépasse le reste de la commande ${commande.numero_commande} (${fcfa(commande.reste)}).`);
        r = await CompteFournisseurService.versement(id, { ...base, montant: total, mode_paiement: mode, id_commande_achat: commande ? commande.id_commande_achat : '' });
      } else if (type === 'bonus') {
        r = await CompteFournisseurService.bonus(id, { ...base, montant: total, type_bonus: typeBonus, date_expiration: expiration });
      } else if (type === 'utiliser') {
        const { justificatif, ...sansFichier } = base;
        r = await CompteFournisseurService.utiliserBonus(id, { ...sansFichier, montant: total, id_bonus: idBonus, sur_dette: surDette });
      } else if (type === 'ajustement') {
        r = await CompteFournisseurService.ajustement(id, { ...base, montant: sens === 'baisse' ? -total : total });
      } else if (type === 'plafond') {
        r = await CompteFournisseurService.plafond(id, { plafond: total, date_operation: date, observation: observation.trim() });
      }
      onFait(r);
    } catch (e) { setErreur(e.message); } finally { setSaving(false); }
  };

  const libelleBouton = { achat: "Enregistrer l'achat", versement: 'Enregistrer le versement', bonus: 'Enregistrer le bonus',
    utiliser: "Enregistrer l'utilisation", ajustement: "Enregistrer l'ajustement", plafond: total > 0 ? 'Enregistrer le plafond' : 'Retirer le plafond' }[type];
  const pret = type === 'plafond' ? montant !== '' : total > 0;

  return (
    <Modal size="md" busy={saving} labelledBy="cf-op-titre" dismissable={!saving} onClose={onClose}>
      <ModalHead id="cf-op-titre" title={`${titre} · ${compte.fournisseur.nom}`} sub={sous} onClose={onClose} disabled={saving} />
      <div className="vt-modal-body cf-form">
        <Erreur texte={erreur} />

        {type === 'plafond' && (
          <div className="cf-rappel">Plafond actuel : <strong className="vt-num">{fcfa(compte.plafond)}</strong> · crédit utilisé : <strong className="vt-num">{fcfa(compte.credit_utilise)}</strong></div>
        )}
        {type === 'utiliser' && bonusDispo.length === 0 && (
          <div className="cf-rappel">Aucun bonus disponible sur ce compte.</div>
        )}

        {type === 'utiliser' && bonusDispo.length > 0 && (
          <div className="vt-field">
            <label htmlFor="cf-op-bonus">Bonus à utiliser</label>
            <select id="cf-op-bonus" className="vt-input" value={idBonus} onChange={(e) => setIdBonus(e.target.value)} disabled={saving}>
              {bonusDispo.map((b, i) => (
                <option key={b.id_operation} value={b.id_operation}>
                  {i + 1}. {TYPES_BONUS[b.type_bonus]} · reste {fcfa(b.reste)}{b.date_expiration ? ` · jusqu'au ${dateFR(b.date_expiration)}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {type === 'ajustement' && (
          <div className="vt-field">
            <span className="vt-field-label">Effet sur la dette</span>
            <div className="vt-seg" role="group" aria-label="Effet sur la dette">
              <button type="button" aria-pressed={sens === 'baisse'} onClick={() => setSens('baisse')}>Je dois moins</button>
              <button type="button" aria-pressed={sens === 'hausse'} onClick={() => setSens('hausse')}>Je dois plus</button>
            </div>
          </div>
        )}

        {(type !== 'utiliser' || bonusDispo.length > 0) && (
          <ChampMontant id="cf-op-montant" autoFocus disabled={saving} value={montant} onChange={setMontant}
                        label={{ achat: "Montant total de l'achat", versement: 'Montant versé', bonus: 'Montant du bonus',
                          utiliser: 'Montant utilisé', ajustement: "Montant de l'ajustement", plafond: 'Nouveau plafond' }[type]}
                        aide={type === 'plafond' ? 'Mettez 0 pour retirer le plafond (le crédit déjà pris reste à rembourser).'
                          : type === 'utiliser' && bonusChoisi ? `Disponible sur ce bonus : ${fcfa(bonusChoisi.reste)}` : null} />
        )}

        {type === 'achat' && (
          <>
            <div className="vt-grid-2">
              <ChampMontant id="cf-op-paye" label="Payé tout de suite" value={paye} onChange={setPaye} disabled={saving} />
              {bonusDispo.length > 0
                ? <ChampMontant id="cf-op-bu" label="Bonus utilisé sur cet achat" value={bonusUtilise} onChange={setBonusUtilise} disabled={saving}
                                aide={bonusChoisi ? `Bonus disponible : ${fcfa(bonusChoisi.reste)}` : null} />
                : <div className="vt-field"><span className="vt-field-label">Bonus</span><span className="vt-muted cf-sans">Aucun bonus disponible</span></div>}
            </div>
            {bonusDispo.length > 1 && versNombre(bonusUtilise) > 0 && (
              <div className="vt-field">
                <label htmlFor="cf-op-bonus2">Prendre sur le bonus</label>
                <select id="cf-op-bonus2" className="vt-input" value={idBonus} onChange={(e) => setIdBonus(e.target.value)} disabled={saving}>
                  {bonusDispo.map((b, i) => <option key={b.id_operation} value={b.id_operation}>{i + 1}. {TYPES_BONUS[b.type_bonus]} · reste {fcfa(b.reste)}</option>)}
                </select>
              </div>
            )}
            {versNombre(paye) > 0 && <ChoixMode mode={mode} setMode={setMode} disabled={saving} idLabel="cf-op-mode-a" />}
            <div className="cf-calcul" aria-live="polite">
              <div><span>Total</span><strong className="vt-num">{fcfa(total)}</strong></div>
              {versNombre(bonusUtilise) > 0 && <div><span>Bonus utilisé</span><strong className="vt-num">− {fcfa(versNombre(bonusUtilise))}</strong></div>}
              {versNombre(paye) > 0 && <div><span>Payé tout de suite</span><strong className="vt-num">− {fcfa(versNombre(paye))}</strong></div>}
              <div className="cf-calcul-total"><span>Reste dû (ajouté à la dette)</span><strong className="vt-num">{fcfa(restant)}</strong></div>
            </div>
            {depasse > 0 && (
              <div className="cf-avert" role="status"><AlertTriangle size={16} /> Cet achat dépasse votre plafond de <strong>{fcfa(depasse)}</strong>. Il sera quand même enregistré.</div>
            )}
          </>
        )}

        {type === 'versement' && (
          <>
            {dues.length > 0 && (
              <div className="vt-field">
                <label htmlFor="cf-op-cible">Payer</label>
                <select id="cf-op-cible" className="vt-input" value={cible} onChange={(e) => setCible(e.target.value)} disabled={saving}>
                  <option value="auto">Répartition automatique (commandes les plus anciennes d'abord)</option>
                  {dues.map((c, i) => <option key={c.id_commande_achat} value={c.id_commande_achat}>{i + 1}. {c.numero_commande} · reste {fcfa(c.reste)}</option>)}
                </select>
              </div>
            )}
            <div className="cf-rappel">
              {commande ? <>Reste sur {commande.numero_commande} : <strong className="vt-num">{fcfa(commande.reste)}</strong></>
                : <>Je dois actuellement : <strong className="vt-num">{compte.avance > 0 ? `avance de ${fcfa(compte.avance)}` : fcfa(compte.credit_utilise)}</strong></>}
            </div>
            <ChoixMode mode={mode} setMode={setMode} disabled={saving} idLabel="cf-op-mode-v" />
          </>
        )}

        {type === 'bonus' && (
          <div className="vt-grid-2">
            <div className="vt-field">
              <label htmlFor="cf-op-tb">Type de bonus</label>
              <select id="cf-op-tb" className="vt-input" value={typeBonus} onChange={(e) => setTypeBonus(e.target.value)} disabled={saving}>
                <option value="libre">1. Libre : je choisis les produits</option>
                <option value="conditionnel">2. Conditionnel : produits imposés</option>
                <option value="avoir">3. Avoir : peut régler la dette</option>
              </select>
            </div>
            <ChampDate id="cf-op-exp" label="Valable jusqu'au (facultatif)" value={expiration} onChange={setExpiration} disabled={saving} min={date} />
          </div>
        )}

        {type === 'utiliser' && bonusChoisi?.type_bonus === 'avoir' && (
          <label className="cf-case">
            <input type="checkbox" checked={surDette} onChange={(e) => setSurDette(e.target.checked)} disabled={saving} />
            <span>Utiliser cet avoir pour régler la dette (sinon : marchandise offerte)</span>
          </label>
        )}

        {(type !== 'utiliser' || bonusDispo.length > 0) && (
          <div className="vt-grid-2">
            <ChampDate id="cf-op-date" label="Date" value={date} onChange={(v) => v && setDate(v)} disabled={saving} max={aujourdhui()} />
            {type !== 'plafond' && (
              <ChampTexte id="cf-op-ref" label={type === 'achat' ? 'N° de facture' : 'Référence'} value={reference} onChange={setReference} disabled={saving}
                          placeholder={type === 'versement' ? 'N° de transaction, de reçu…' : ''} />
            )}
          </div>
        )}
        {(type !== 'utiliser' || bonusDispo.length > 0) && (
          <ChampTexte id="cf-op-obs" disabled={saving} value={observation} onChange={setObservation} max={1000}
                      facultatif={type !== 'ajustement'}
                      label={type === 'ajustement' ? 'Raison' : type === 'bonus' ? 'Motif ou conditions' : type === 'plafond' ? 'Raison du changement' : 'Observation'}
                      placeholder={type === 'plafond' ? 'Ex : conditions non respectées, bon client…' : ''} />
        )}
        {['achat', 'versement', 'bonus', 'ajustement'].includes(type) && (
          <ChampJustificatif fichier={fichier} onChange={setFichier} disabled={saving} />
        )}
      </div>
      <div className="vt-modal-foot vt-modal-foot--end">
        <button type="button" className="vt-btn" onClick={onClose} disabled={saving}>Annuler</button>
        <button type="button" className="vt-btn vt-btn--primary" onClick={envoyer}
                disabled={saving || !pret || (type === 'utiliser' && !bonusDispo.length) || (type === 'ajustement' && !observation.trim())}>
          {saving ? <Loader size={16} className="vt-spin" /> : <CheckCircle2 size={16} />} {libelleBouton}
        </button>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------
// Annuler une opération / voir un justificatif / rapprochement
// ------------------------------------------------------------
function ModalAnnuler({ op, onClose, onFait }) {
  const [motif, setMotif] = useState('');
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState(null);
  const valider = async () => {
    setSaving(true); setErreur(null);
    try {
      if (op.source === 'versement') await CompteFournisseurService.annulerVersement(op.id, motif.trim());
      else await CompteFournisseurService.annuler(op.id, motif.trim());
      onFait();
    }
    catch (e) { setErreur(e.message); } finally { setSaving(false); }
  };
  return (
    <Modal size="sm" busy={saving} labelledBy="cf-an-titre" dismissable={!saving} onClose={onClose}>
      <ModalHead id="cf-an-titre" title={`Annuler : ${TYPES[op.type]?.label} de ${fcfa(Math.abs(op.montant))}`}
                 sub="L'opération reste visible, barrée, avec la raison. Rien n'est effacé." onClose={onClose} disabled={saving} />
      <div className="vt-modal-body cf-form">
        <Erreur texte={erreur} />
        {op.source === 'versement' && op.detail?.includes(',') && (
          <div className="cf-rappel">Ce versement a été réparti sur plusieurs commandes : tout le versement sera annulé.</div>
        )}
        <ChampTexte id="cf-an-motif" label="Raison de l'annulation" facultatif={false} value={motif} onChange={setMotif} disabled={saving} max={500}
                    placeholder="Ex : saisie en double, mauvais montant…" />
      </div>
      <div className="vt-modal-foot vt-modal-foot--end">
        <button type="button" className="vt-btn" onClick={onClose} disabled={saving}>Retour</button>
        <button type="button" className="vt-btn vt-btn--danger" onClick={valider} disabled={saving || !motif.trim()}>
          {saving ? <Loader size={16} className="vt-spin" /> : <Ban size={16} />} Annuler l'opération
        </button>
      </div>
    </Modal>
  );
}

function ModalJustificatif({ op, onClose }) {
  const [url, setUrl] = useState(null);
  const [type, setType] = useState('');
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    let lien = null;
    CompteFournisseurService.justificatif(op.source, op.id)
      .then(async (u) => {
        lien = u;
        const blob = await fetch(u).then((r) => r.blob());
        setType(blob.type);
        setUrl(u);
      })
      .catch((e) => setErreur(e.message));
    return () => { if (lien) URL.revokeObjectURL(lien); };
  }, [op.source, op.id]);
  return (
    <Modal size="lg" labelledBy="cf-ju-titre" onClose={onClose}>
      <ModalHead id="cf-ju-titre" title="Justificatif" sub={`${TYPES[op.type]?.label} du ${dateFR(op.date)} · ${fcfa(Math.abs(op.montant))}`} onClose={onClose} />
      <div className="vt-modal-body cf-justif">
        <Erreur texte={erreur} />
        {!url && !erreur && <div className="cf-chargement"><Loader size={18} className="vt-spin" /> Chargement…</div>}
        {url && (type === 'application/pdf'
          ? <iframe title="Justificatif" src={url} className="cf-justif-pdf" />
          : <img src={url} alt="Justificatif de l'opération" className="cf-justif-img" />)}
      </div>
    </Modal>
  );
}

function ModalRapprochement({ compte, onClose, onFait }) {
  const [solde, setSolde] = useState('');
  const [sens, setSens] = useState('dette');
  const [date, setDate] = useState(aujourdhui());
  const [observation, setObservation] = useState('');
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState(null);
  const annonce = (sens === 'avance' ? -1 : 1) * versNombre(solde);
  const ecart = annonce - compte.dette;
  const valider = async () => {
    setSaving(true); setErreur(null);
    try {
      const r = await CompteFournisseurService.rapprocher(compte.id_compte, { solde_fournisseur: annonce, date_verification: date, observation: observation.trim() });
      onFait(r);
    } catch (e) { setErreur(e.message); } finally { setSaving(false); }
  };
  const lire = (v) => (v >= 0 ? `je dois ${fcfa(v)}` : `avance de ${fcfa(-v)}`);
  return (
    <Modal size="md" busy={saving} labelledBy="cf-ra-titre" dismissable={!saving} onClose={onClose}>
      <ModalHead id="cf-ra-titre" title={`Rapprochement · ${compte.fournisseur.nom}`}
                 sub="Comparez le solde annoncé par le fournisseur avec celui de Miyo. Miyo ne corrige rien tout seul." onClose={onClose} disabled={saving} />
      <div className="vt-modal-body cf-form">
        <Erreur texte={erreur} />
        <div className="vt-field">
          <span className="vt-field-label">Solde annoncé par {compte.fournisseur.nom}</span>
          <div className="vt-grid-2">
            <select className="vt-input" value={sens} onChange={(e) => setSens(e.target.value)} disabled={saving} aria-label="Sens du solde annoncé">
              <option value="dette">Je lui dois</option>
              <option value="avance">J'ai une avance</option>
            </select>
            <input className="vt-input vt-num" inputMode="decimal" placeholder="0" value={solde} autoFocus disabled={saving}
                   aria-label="Montant annoncé" onChange={(e) => !e.target.value.includes('-') && MONTANT_RE.test(e.target.value) && setSolde(e.target.value)} />
          </div>
        </div>
        {solde !== '' && (
          <div className="cf-calcul" aria-live="polite">
            <div><span>Solde dans Miyo</span><strong className="vt-num">{lire(compte.dette)}</strong></div>
            <div><span>Solde annoncé</span><strong className="vt-num">{lire(annonce)}</strong></div>
            <div className="cf-calcul-total"><span>Différence</span>
              <strong className={`vt-num ${Math.abs(ecart) >= 0.01 ? 'cf-rouge' : ''}`}>{Math.abs(ecart) < 0.01 ? 'Aucune' : fcfa(Math.abs(ecart))}</strong>
            </div>
          </div>
        )}
        <div className="vt-grid-2">
          <ChampDate id="cf-ra-date" label="Date de vérification" value={date} onChange={(v) => v && setDate(v)} disabled={saving} max={aujourdhui()} />
          <ChampTexte id="cf-ra-obs" label="Observation" value={observation} onChange={setObservation} disabled={saving} max={500} placeholder="Ex : relevé reçu par WhatsApp" />
        </div>
      </div>
      <div className="vt-modal-foot vt-modal-foot--end">
        <button type="button" className="vt-btn" onClick={onClose} disabled={saving}>Annuler</button>
        <button type="button" className="vt-btn vt-btn--primary" onClick={valider} disabled={saving || solde === ''}>
          {saving ? <Loader size={16} className="vt-spin" /> : <Scale size={16} />} Enregistrer la vérification
        </button>
      </div>
    </Modal>
  );
}

function ModalResoudre({ rappro, onClose, onFait }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState(null);
  const valider = async () => {
    setSaving(true); setErreur(null);
    try { await CompteFournisseurService.resoudre(rappro.id_rapprochement, note.trim()); onFait(); }
    catch (e) { setErreur(e.message); } finally { setSaving(false); }
  };
  return (
    <Modal size="sm" busy={saving} labelledBy="cf-re-titre" dismissable={!saving} onClose={onClose}>
      <ModalHead id="cf-re-titre" title={`Écart de ${fcfa(Math.abs(rappro.ecart))} réglé`} sub="Notez ce qui expliquait l'écart." onClose={onClose} disabled={saving} />
      <div className="vt-modal-body cf-form">
        <Erreur texte={erreur} />
        <ChampTexte id="cf-re-note" label="Explication" facultatif={false} value={note} onChange={setNote} disabled={saving} max={500}
                    placeholder="Ex : versement Orange Money du 05/11 pas noté, ajouté" />
      </div>
      <div className="vt-modal-foot vt-modal-foot--end">
        <button type="button" className="vt-btn" onClick={onClose} disabled={saving}>Retour</button>
        <button type="button" className="vt-btn vt-btn--primary" onClick={valider} disabled={saving || !note.trim()}>
          {saving ? <Loader size={16} className="vt-spin" /> : <CheckCircle2 size={16} />} Marquer réglé
        </button>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------
// Fiche d'un compte
// ------------------------------------------------------------
const lireSolde = (dette) => (dette > 0.009 ? fcfa(dette) : dette < -0.009 ? `Avance ${fcfa(-dette)}` : fcfa(0));

function FicheCompte({ idCompte, onRetour, afficher }) {
  const [compte, setCompte] = useState(null);
  const [operations, setOperations] = useState([]);
  const [rappros, setRappros] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [onglet, setOnglet] = useState('historique');
  const [filtres, setFiltres] = useState({ du: '', au: '', type: '', q: '' });
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [modal, setModal] = useState(null); // { nom, ...données }

  const chargerCompte = useCallback(async () => {
    try { setCompte((await CompteFournisseurService.detail(idCompte)).compte); setErreur(null); }
    catch (e) { setErreur(e.message); }
  }, [idCompte]);
  const chargerOperations = useCallback(async () => {
    try { setOperations((await CompteFournisseurService.operations(idCompte, filtres)).operations || []); }
    catch (e) { setErreur(e.message); }
  }, [idCompte, filtres]);
  const chargerRappros = useCallback(async () => {
    try { setRappros((await CompteFournisseurService.rapprochements(idCompte)).rapprochements || []); }
    catch (e) { setErreur(e.message); }
  }, [idCompte]);
  const chargerCommandes = useCallback(async () => {
    try { setCommandes((await CompteFournisseurService.commandes(idCompte)).commandes || []); }
    catch (e) { setErreur(e.message); }
  }, [idCompte]);

  useEffect(() => {
    setChargement(true);
    Promise.all([chargerCompte(), chargerRappros(), chargerCommandes()]).finally(() => setChargement(false));
  }, [chargerCompte, chargerRappros, chargerCommandes]);
  useEffect(() => {
    const t = setTimeout(chargerOperations, 250);
    return () => clearTimeout(t);
  }, [chargerOperations]);

  const toutRecharger = () => Promise.all([chargerCompte(), chargerOperations(), chargerRappros(), chargerCommandes()]);
  const apresOperation = (r) => {
    setModal(null);
    if (r?.compte) setCompte(r.compte);
    toutRecharger();
    afficher(r?.message || 'Enregistré', 'success');
    (r?.avertissements || []).forEach((a, i) => setTimeout(() => afficher(a, 'error'), 1200 * (i + 1)));
  };


  if (chargement && !compte) return <div className="cf-chargement"><Loader size={18} className="vt-spin" /> Chargement du compte…</div>;
  if (!compte) return <><button type="button" className="vt-btn" onClick={onRetour}><ArrowLeft size={16} /> Retour</button><ErrorBar message={erreur || 'Compte introuvable'} onRetry={toutRecharger} /></>;

  const nbBonus = compte.bonus.filter((b) => b.reste > 0.009 && !b.expire).length;

  return (
    <>
      <div className="cf-fiche-head">
        <button type="button" className="vt-btn" onClick={onRetour}><ArrowLeft size={16} /> Tous les comptes</button>
        <div className="cf-fiche-titre">
          <h2>{compte.fournisseur.nom}</h2>
          <span className="vt-muted">{[compte.fournisseur.telephone, compte.fournisseur.ville].filter(Boolean).join(' · ') || 'Compte fournisseur'}</span>
        </div>
      </div>

      {erreur && <ErrorBar message={erreur} onRetry={toutRecharger} />}

      {compte.alertes.length > 0 && (
        <ol className="cf-alertes" aria-label="Alertes de ce compte">
          {compte.alertes.map((a, i) => (
            <li key={i} data-s={TON_ALERTE[a.niveau]}><span className="cf-alerte-num">{i + 1}</span><AlertTriangle size={15} /> {a.message}</li>
          ))}
        </ol>
      )}

      <div className="cf-actions" role="toolbar" aria-label="Opérations">
        <button type="button" className="vt-btn vt-btn--primary" onClick={() => setModal({ nom: 'versement' })}><Wallet size={16} /> Enregistrer un versement</button>
        <button type="button" className="vt-btn" onClick={() => setModal({ nom: 'achat' })}><ShoppingBag size={16} /> Achat hors stock</button>
        <button type="button" className="vt-btn" onClick={() => setModal({ nom: 'bonus' })}><Gift size={16} /> Enregistrer un bonus</button>
        <button type="button" className="vt-btn" onClick={() => setModal({ nom: 'utiliser' })} disabled={!nbBonus}><Ticket size={16} /> Utiliser un bonus</button>
        <button type="button" className="vt-btn" onClick={() => setModal({ nom: 'plafond' })}><Gauge size={16} /> Plafond</button>
        <button type="button" className="vt-btn" onClick={() => setModal({ nom: 'rapprochement' })}><Scale size={16} /> Rapprochement</button>
        <button type="button" className="vt-btn" onClick={() => setModal({ nom: 'ajustement' })}><SlidersHorizontal size={16} /> Ajustement</button>
      </div>

      <Chiffres className="cf-chiffres" items={[
        { label: 'Plafond accordé', value: compte.plafond > 0 ? fcfa(compte.plafond) : 'Aucun', fort: true },
        { label: 'Je dois', value: fcfa(compte.credit_utilise), tone: compte.depassement > 0 ? 'bad' : undefined,
          note: compte.depassement > 0 ? `Dépasse le plafond de ${fcfa(compte.depassement)}` : null },
        { label: 'Crédit disponible', value: fcfa(compte.credit_disponible), tone: compte.alertes.some((a) => a.code === 'credit_faible') ? 'warn' : undefined },
        compte.avance > 0 ? { label: 'Avance chez lui', value: fcfa(compte.avance), tone: 'signal' } : null,
        { label: 'Total des achats', value: fcfa(compte.total_achats),
          note: compte.total_achats_hors_stock > 0 ? `dont ${fcfa(compte.total_achats_hors_stock)} hors stock` : 'réceptions de marchandise' },
        compte.total_retours > 0 ? { label: 'Retours', value: fcfa(compte.total_retours) } : null,
        { label: 'Total versé', value: fcfa(compte.total_versements + compte.total_paye_achats),
          note: compte.total_paye_achats > 0 ? `dont ${fcfa(compte.total_paye_achats)} payés aux achats` : null },
        { label: 'Bonus disponible', value: fcfa(compte.bonus_disponible), note: `${fcfa(compte.total_bonus_accordes)} reçus au total` },
        { label: 'Bonus utilisés', value: fcfa(compte.total_bonus_utilises) },
      ]} />

      <Onglets actif={onglet} onChange={setOnglet} label="Contenu du compte" items={[
        { id: 'historique', label: 'Historique', count: operations.length },
        { id: 'commandes', label: 'Commandes', count: commandes.filter((c) => c.reste > 0.009).length },
        { id: 'bonus', label: 'Bonus', count: compte.bonus.length },
        { id: 'rapprochements', label: 'Rapprochements', count: rappros.length },
      ]} />

      {onglet === 'historique' && (
        <>
          <div className="cf-filtres">
            <div className="vt-field"><label htmlFor="cf-f-du">Du</label>
              <input id="cf-f-du" type="date" className="vt-input" value={filtres.du} onChange={(e) => setFiltres({ ...filtres, du: e.target.value })} /></div>
            <div className="vt-field"><label htmlFor="cf-f-au">Au</label>
              <input id="cf-f-au" type="date" className="vt-input" value={filtres.au} onChange={(e) => setFiltres({ ...filtres, au: e.target.value })} /></div>
            <div className="vt-field"><label htmlFor="cf-f-type">Type</label>
              <select id="cf-f-type" className="vt-input" value={filtres.type} onChange={(e) => setFiltres({ ...filtres, type: e.target.value })}>
                <option value="">Tous</option>
                {Object.entries(TYPES).map(([k, t], i) => <option key={k} value={k}>{i + 1}. {t.label}</option>)}
              </select></div>
            <div className="vt-field cf-f-q"><label htmlFor="cf-f-q">Référence</label>
              <div className="cf-recherche"><Search size={15} />
                <input id="cf-f-q" className="vt-input" placeholder="N° de facture, de reçu…" value={filtres.q} onChange={(e) => setFiltres({ ...filtres, q: e.target.value })} /></div></div>
            {(filtres.du || filtres.au || filtres.type || filtres.q) && (
              <button type="button" className="vt-btn vt-btn--sm" onClick={() => setFiltres({ du: '', au: '', type: '', q: '' })}>Effacer</button>
            )}
          </div>
          <div className="vt-table-wrap">
            <table className="vt-table cf-table">
              <thead>
                <tr>
                  <th>Date</th><th>Opération</th><th>Référence / détail</th><th className="vt-th-right">Montant</th>
                  <th className="vt-th-right cf-col-hide cf-col-lg">Dette avant</th><th className="vt-th-right">Dette après</th>
                  <th className="vt-th-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((o) => {
                  const T = TYPES[o.type] || { label: o.type, Icon: BookOpen };
                  const baisse = o.type === 'versement' || o.type === 'retour' || (o.type === 'ajustement' && Number(o.montant) < 0)
                    || (o.type === 'utilisation_bonus' && o.sur_dette);
                  const peutAnnuler = !o.annulee && (o.source === 'versement' || (o.source === 'operation' && o.type !== 'plafond'));
                  return (
                    <tr key={o.cle} className={o.annulee ? 'cf-annulee' : ''}>
                      <td className="vt-num">{dateFR(o.date)}</td>
                      <td><span className="cf-type"><T.Icon size={15} /> {T.label}</span>
                        {o.type === 'bonus' && o.type_bonus && <div className="vt-cell-sub">{TYPES_BONUS[o.type_bonus]}{o.date_expiration ? ` · jusqu'au ${dateFR(o.date_expiration)}` : ''}</div>}
                        {o.annulee && <div className="vt-cell-sub cf-rouge">Annulée{o.motif_annulation ? ` : ${o.motif_annulation}` : ''}</div>}
                      </td>
                      <td className="cf-detail">
                        <div className="vt-cell-main">{o.reference || <span className="vt-muted">-</span>}</div>
                        <div className="vt-cell-sub">
                          {[
                            o.source !== 'operation' ? o.detail : null,
                            o.type === 'achat' && Number(o.montant_paye) > 0 ? `payé ${fcfa(o.montant_paye)} (${libelleMode(o.mode_paiement)})` : null,
                            o.type === 'achat' && Number(o.bonus_utilise) > 0 ? `bonus ${fcfa(o.bonus_utilise)}` : null,
                            o.type === 'versement' ? libelleMode(o.mode_paiement) : null,
                            o.type === 'utilisation_bonus' && o.sur_dette ? 'règle la dette' : null,
                            o.type === 'plafond' ? `${fcfa(o.plafond_avant)} → ${fcfa(o.plafond_apres)}` : null,
                            o.observation,
                          ].filter(Boolean).join(' · ')}
                        </div>
                        {o.cree_par_nom && <div className="vt-cell-sub cf-par">Saisi par {o.cree_par_nom}{o.date_creation ? `, le ${dateHeureFR(o.date_creation)}` : ''}</div>}
                      </td>
                      <td className="vt-td-right vt-num cf-montant">{o.type === 'plafond' ? '-' : `${baisse ? '−' : ''}${fcfa(Math.abs(Number(o.montant)))}`}</td>
                      <td className="vt-td-right vt-num cf-col-hide cf-col-lg">{o.dette_avant == null ? '-' : lireSolde(Number(o.dette_avant))}</td>
                      <td className="vt-td-right vt-num">{o.dette_apres == null ? '-' : lireSolde(Number(o.dette_apres))}</td>
                      <td className="vt-td-right">
                        <div className="vt-actions">
                          {o.a_justificatif && (
                            <button type="button" className="vt-iconbtn vt-iconbtn--sm" title="Voir le justificatif" aria-label="Voir le justificatif"
                                    onClick={() => setModal({ nom: 'justificatif', op: o })}><Eye size={15} /></button>
                          )}
                          {peutAnnuler && (
                            <button type="button" className="vt-iconbtn vt-iconbtn--sm" title="Annuler" aria-label="Annuler l'opération"
                                    onClick={() => setModal({ nom: 'annuler', op: o })}><Ban size={15} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {operations.length === 0 && (
              <div className="vt-empty"><BookOpen size={28} /><p className="vt-empty-title">Aucune opération</p>
                <p className="vt-empty-text">Les réceptions de marchandise et les versements apparaissent ici.</p></div>
            )}
          </div>
        </>
      )}

      {onglet === 'commandes' && (
        <div className="vt-table-wrap">
          <table className="vt-table cf-table">
            <thead><tr><th>Commande</th><th>Date</th><th className="vt-th-right">Reçu</th><th className="vt-th-right cf-col-hide">Retours</th><th className="vt-th-right">Payé</th><th className="vt-th-right">Reste à payer</th><th className="vt-th-right">Actions</th></tr></thead>
            <tbody>
              {commandes.map((c) => (
                <tr key={c.id_commande_achat}>
                  <td className="vt-cell-main">{c.numero_commande}</td>
                  <td className="vt-num">{dateFR(c.date_commande)}</td>
                  <td className="vt-td-right vt-num">{fcfa(c.recu)}</td>
                  <td className="vt-td-right vt-num cf-col-hide">{c.retours > 0 ? `−${fcfa(c.retours)}` : '-'}</td>
                  <td className="vt-td-right vt-num">{fcfa(c.paye)}</td>
                  <td className="vt-td-right vt-num">{c.reste > 0.009 ? <strong>{fcfa(c.reste)}</strong> : <Badge tone="muted">Payée</Badge>}</td>
                  <td className="vt-td-right">{c.reste > 0.009 && (
                    <button type="button" className="vt-btn vt-btn--sm vt-btn--cash" onClick={() => setModal({ nom: 'versement', commande: c.id_commande_achat })}>
                      <Wallet size={14} /> Payer
                    </button>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {commandes.length === 0 && (
            <div className="vt-empty"><ClipboardList size={28} /><p className="vt-empty-title">Aucune commande reçue</p>
              <p className="vt-empty-text">Les commandes fournisseurs apparaissent ici dès leur réception.</p></div>
          )}
        </div>
      )}

      {onglet === 'bonus' && (
        <div className="vt-table-wrap">
          <table className="vt-table cf-table">
            <thead><tr><th>Reçu le</th><th>Type</th><th>Motif</th><th className="vt-th-right">Montant</th><th className="vt-th-right">Utilisé</th><th className="vt-th-right">Reste</th><th>Valable jusqu'au</th><th>État</th></tr></thead>
            <tbody>
              {compte.bonus.map((b) => (
                <tr key={b.id_operation}>
                  <td className="vt-num">{dateFR(b.date_operation)}</td>
                  <td>{TYPES_BONUS[b.type_bonus]}</td>
                  <td>{b.observation || <span className="vt-muted">-</span>}</td>
                  <td className="vt-td-right vt-num">{fcfa(b.montant)}</td>
                  <td className="vt-td-right vt-num">{fcfa(b.utilise)}</td>
                  <td className="vt-td-right vt-num"><strong>{fcfa(Math.max(b.reste, 0))}</strong></td>
                  <td className="vt-num">{b.date_expiration ? dateFR(b.date_expiration) : <span className="vt-muted">Sans limite</span>}</td>
                  <td>{b.epuise ? <Badge tone="muted">Entièrement utilisé</Badge> : b.expire ? <Badge tone="bad">Expiré</Badge> : <Badge tone="signal">Disponible</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {compte.bonus.length === 0 && <div className="vt-empty"><Gift size={28} /><p className="vt-empty-title">Aucun bonus reçu</p></div>}
        </div>
      )}

      {onglet === 'rapprochements' && (
        <>
          <div className="cf-actions"><button type="button" className="vt-btn vt-btn--primary" onClick={() => setModal({ nom: 'rapprochement' })}><Scale size={16} /> Nouveau rapprochement</button></div>
          <div className="vt-table-wrap">
            <table className="vt-table cf-table">
              <thead><tr><th>Date</th><th className="vt-th-right">Solde Miyo</th><th className="vt-th-right">Annoncé par le fournisseur</th><th className="vt-th-right">Différence</th><th>Statut</th><th>Observations</th><th className="vt-th-right">Actions</th></tr></thead>
              <tbody>
                {rappros.map((r) => (
                  <tr key={r.id_rapprochement}>
                    <td className="vt-num">{dateFR(r.date_verification)}</td>
                    <td className="vt-td-right vt-num">{lireSolde(Number(r.solde_miyo))}</td>
                    <td className="vt-td-right vt-num">{lireSolde(Number(r.solde_fournisseur))}</td>
                    <td className="vt-td-right vt-num">{Math.abs(Number(r.ecart)) < 0.01 ? '-' : fcfa(Math.abs(Number(r.ecart)))}</td>
                    <td>{r.statut === 'conforme' ? <Badge tone="signal">Identique</Badge> : r.statut === 'ecart' ? <Badge tone="bad">Écart à vérifier</Badge> : <Badge tone="muted">Écart réglé</Badge>}</td>
                    <td><div>{r.observation || <span className="vt-muted">-</span>}</div>{r.note_resolution && <div className="vt-cell-sub">Réglé : {r.note_resolution}</div>}</td>
                    <td className="vt-td-right">{r.statut === 'ecart' && (
                      <button type="button" className="vt-btn vt-btn--sm" onClick={() => setModal({ nom: 'resoudre', rappro: r })}><CheckCircle2 size={14} /> Réglé</button>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rappros.length === 0 && (
              <div className="vt-empty"><Scale size={28} /><p className="vt-empty-title">Aucune vérification</p>
                <p className="vt-empty-text">Quand le fournisseur vous donne votre solde, comparez-le ici.</p></div>
            )}
          </div>
        </>
      )}

      {modal && ['achat', 'versement', 'bonus', 'utiliser', 'ajustement', 'plafond'].includes(modal.nom) && (
        <ModalOperation type={modal.nom} compte={compte} commandes={commandes} commandeInitiale={modal.commande || null}
                        onClose={() => setModal(null)} onFait={apresOperation} />
      )}
      {modal?.nom === 'annuler' && (
        <ModalAnnuler op={modal.op} onClose={() => setModal(null)} onFait={() => { setModal(null); toutRecharger(); afficher(modal.op.source === 'versement' ? 'Versement annulé' : 'Opération annulée', 'success'); }} />
      )}
      {modal?.nom === 'justificatif' && <ModalJustificatif op={modal.op} onClose={() => setModal(null)} />}
      {modal?.nom === 'rapprochement' && (
        <ModalRapprochement compte={compte} onClose={() => setModal(null)}
                            onFait={(r) => { setModal(null); setOnglet('rapprochements'); toutRecharger();
                              afficher(r.statut === 'conforme' ? 'Les soldes sont identiques' : `Écart de ${fcfa(Math.abs(r.ecart))} constaté`, r.statut === 'conforme' ? 'success' : 'error'); }} />
      )}
      {modal?.nom === 'resoudre' && (
        <ModalResoudre rappro={modal.rappro} onClose={() => setModal(null)} onFait={() => { setModal(null); toutRecharger(); afficher('Écart réglé', 'success'); }} />
      )}
    </>
  );
}

// ------------------------------------------------------------
// Page : tableau de bord + liste
// ------------------------------------------------------------
export default function ComptesFournisseurs() {
  const [data, setData] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('activite');
  const [ouvert, setOuvert] = useState(null);
  const [nouveau, setNouveau] = useState(false);
  const [toast, afficher, fermer] = useToast(5000);

  const charger = useCallback(async () => {
    setChargement(true);
    try { setData(await CompteFournisseurService.tableau()); setErreur(null); }
    catch (e) { setErreur(e.message); }
    finally { setChargement(false); }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const comptes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (data?.comptes || [])
      .filter((c) => filtre === 'tous' || (filtre === 'dus' ? c.credit_utilise > 0.009 : c.a_activite))
      .filter((c) => !q || c.fournisseur.nom.toLowerCase().includes(q));
  }, [data, recherche, filtre]);
  const t = data?.totaux;

  return (
    <Page className="cf">
      {ouvert ? (
        <FicheCompte idCompte={ouvert} afficher={afficher} onRetour={() => { setOuvert(null); charger(); }} />
      ) : (
        <>
          <PageHead title="Comptes fournisseurs" sub="Votre situation chez chaque fournisseur : réceptions, achats, versements, plafond, bonus. Les réceptions et retours s'ajoutent tout seuls.">
            <button type="button" className="vt-btn vt-btn--icon" onClick={charger} disabled={chargement} aria-label="Rafraîchir" title="Rafraîchir">
              <RefreshCw size={16} className={chargement ? 'vt-spin' : ''} />
            </button>
            <button type="button" className="vt-btn vt-btn--primary" onClick={() => setNouveau(true)}><Plus size={16} /> Nouveau fournisseur</button>
          </PageHead>

          {erreur && <ErrorBar message={erreur} onRetry={charger} />}

          {t && (
            <Chiffres className="cf-chiffres" items={[
              { label: 'Fournisseurs', value: String(t.nb_fournisseurs), fort: true },
              { label: 'Plafond total accordé', value: fcfa(t.plafond_total) },
              { label: 'Dette totale', value: fcfa(t.dette_totale), tone: t.dette_totale > 0 ? 'warn' : undefined },
              { label: 'Crédit disponible', value: fcfa(t.credit_disponible_total) },
              { label: 'Total versé', value: fcfa(t.total_versements) },
              { label: 'Bonus reçus', value: fcfa(t.total_bonus_accordes) },
              { label: 'Bonus disponibles', value: fcfa(t.bonus_disponibles), tone: t.bonus_disponibles > 0 ? 'signal' : undefined },
              { label: 'Bonus utilisés', value: fcfa(t.bonus_utilises) },
            ]} />
          )}

          {data?.alertes?.length > 0 && (
            <section className="cf-bloc" aria-labelledby="cf-alertes-titre">
              <h2 id="cf-alertes-titre" className="cf-bloc-titre">À surveiller</h2>
              <ol className="cf-alertes">
                {data.alertes.map((a, i) => (
                  <li key={i} data-s={TON_ALERTE[a.niveau]}>
                    <span className="cf-alerte-num">{i + 1}</span><AlertTriangle size={15} />
                    <button type="button" className="vt-link" onClick={() => setOuvert(a.id_compte)}>{a.message}</button>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="cf-liste-head">
            <Onglets actif={filtre} onChange={setFiltre} label="Fournisseurs affichés" items={[
              { id: 'dus', label: 'À payer', count: t?.nb_fournisseurs_dus },
              { id: 'activite', label: 'Avec activité', count: (data?.comptes || []).filter((c) => c.a_activite).length },
              { id: 'tous', label: 'Tous', count: t?.nb_fournisseurs },
            ]} />
            <div className="cf-recherche"><Search size={15} />
              <input className="vt-input" placeholder="Chercher un fournisseur" aria-label="Chercher un fournisseur" value={recherche} onChange={(e) => setRecherche(e.target.value)} /></div>
          </div>

          <div className="vt-table-wrap" aria-busy={chargement || undefined}>
            <table className="vt-table cf-table">
              <thead>
                <tr>
                  <th>Fournisseur</th><th className="vt-th-right">Plafond</th><th className="vt-th-right">Je dois</th>
                  <th className="vt-th-right">Crédit disponible</th><th className="vt-th-right cf-col-hide">Total versé</th>
                  <th className="vt-th-right cf-col-hide">Bonus disponible</th><th>État</th><th className="vt-th-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {comptes.map((c) => {
                  const pire = c.alertes.find((a) => a.niveau === 'danger') || c.alertes.find((a) => a.niveau === 'attention');
                  return (
                    <tr key={c.id_compte}>
                      <td><button type="button" className="vt-link vt-cell-main" onClick={() => setOuvert(c.id_compte)}>{c.fournisseur.nom}</button>
                        <div className="vt-cell-sub">{[c.fournisseur.telephone, c.fournisseur.ville].filter(Boolean).join(' · ') || '-'}</div></td>
                      <td className="vt-td-right vt-num">{c.plafond > 0 ? fcfa(c.plafond) : <span className="vt-muted">Aucun</span>}</td>
                      <td className="vt-td-right vt-num">{c.avance > 0 ? <span className="vt-muted">Avance {fcfa(c.avance)}</span> : fcfa(c.credit_utilise)}</td>
                      <td className="vt-td-right vt-num">{c.plafond > 0 ? fcfa(c.credit_disponible) : <span className="vt-muted">-</span>}</td>
                      <td className="vt-td-right vt-num cf-col-hide">{c.total_versements + c.total_paye_achats > 0 ? fcfa(c.total_versements + c.total_paye_achats) : <span className="vt-muted">-</span>}</td>
                      <td className="vt-td-right vt-num cf-col-hide">{c.bonus_disponible > 0 ? fcfa(c.bonus_disponible) : <span className="vt-muted">-</span>}</td>
                      <td>{pire ? <Badge tone={TON_ALERTE[pire.niveau]} title={pire.message}>{pire.code === 'plafond_atteint' ? 'Plafond atteint' : pire.code === 'credit_faible' ? 'Crédit faible' : pire.code === 'ecart' ? 'Écart' : 'Bonus à utiliser'}</Badge>
                        : <Badge tone="muted">Normal</Badge>}</td>
                      <td className="vt-td-right"><button type="button" className="vt-btn vt-btn--sm" onClick={() => setOuvert(c.id_compte)}><Eye size={14} /> Ouvrir</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!chargement && comptes.length === 0 && (
              <div className="vt-empty"><BookOpen size={30} />
                <p className="vt-empty-title">{recherche || filtre !== 'tous' ? 'Aucun fournisseur ne correspond' : 'Aucun fournisseur'}</p>
                <p className="vt-empty-text">{recherche ? 'Modifiez la recherche.' : filtre !== 'tous' ? 'Affichez « Tous » pour voir tous vos fournisseurs.' : 'Ajoutez les fournisseurs chez qui vous achetez : Yuzin, Absonic, UBM…'}</p>
                {filtre !== 'tous' && <button type="button" className="vt-btn vt-btn--sm" onClick={() => setFiltre('tous')}>Afficher tous les fournisseurs</button>}
              </div>
            )}
          </div>
        </>
      )}

      {nouveau && (
        <ModalNouveauCompte onClose={() => setNouveau(false)}
                            onCree={(c) => { setNouveau(false); charger(); setOuvert(c.id_compte); afficher(`Compte ${c.fournisseur.nom} créé`, 'success'); }} />
      )}
      <Toast toast={toast} onClose={fermer} />
    </Page>
  );
}
