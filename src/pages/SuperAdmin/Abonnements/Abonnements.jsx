// pages/SuperAdmin/Abonnements/Abonnements.jsx
//
// Le patron paie hors du logiciel (Wave, Orange Money, MTN MoMo, banque),
// puis le super-admin prolonge son abonnement ici.
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Wallet, RefreshCw, Search, X, AlertCircle, CalendarClock, CalendarX2,
  Users, Hourglass, BadgeCheck, Settings2, Plus, Trash2, Package, Store,
} from "lucide-react";
import AbonnementAdminService from "../../../services/superAdmin/abonnementAdminService";
import "./Abonnements.css";

// ==================== OUTILS ====================
const fcfa = (n) => `${Math.round(Number(n) || 0).toLocaleString("fr-FR").replace(/ | /g, " ")} F`;

const dateLongue = (s) => {
  if (!s) return "—";
  const [a, m, j] = s.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
};

const ajouterJours = (s, n) => {
  const [a, m, j] = s.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1, j + n));
  return d.toISOString().slice(0, 10);
};
const ajouterMois = (s, n) => {
  const [a, m, j] = s.split("-").map(Number);
  const dernier = new Date(Date.UTC(a, m - 1 + n + 1, 0)).getUTCDate();
  return new Date(Date.UTC(a, m - 1 + n, Math.min(j, dernier))).toISOString().slice(0, 10);
};
const aujourdhui = () => new Date().toISOString().slice(0, 10);

// Même règle que le serveur : la nouvelle période suit la fin actuelle si elle court encore
const finApresPaiement = (abo, mois) => {
  const debut = abo.jours_restants >= 0 ? ajouterJours(abo.date_fin, 1) : aujourdhui();
  return ajouterJours(ajouterMois(debut, mois), -1);
};

const initiales = (nom) =>
  (nom || "??").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const MOYENS = [
  { code: "wave", nom: "Wave" },
  { code: "orange", nom: "Orange Money" },
  { code: "mtn", nom: "MTN MoMo" },
  { code: "banque", nom: "Banque" },
];
// Fréquence de la fenêtre quand l'abonnement est expiré
const INTERVALLES = [
  { v: 0, label: "Seulement à l'ouverture de Miyo" },
  { v: 15, label: "Toutes les 15 minutes" },
  { v: 30, label: "Toutes les 30 minutes" },
  { v: 60, label: "Toutes les heures" },
  { v: 120, label: "Toutes les 2 heures" },
  { v: 240, label: "Toutes les 4 heures" },
];
const libelleIntervalle = (m) => {
  const n = Number(m);
  if (n % 60 === 0) return n === 60 ? "une heure" : `${n / 60} heures`;
  return `${n} minutes`;
};
const nomMoyen = (code) => MOYENS.find((m) => m.code === code)?.nom || "—";

const echeance = (abo) => {
  const j = abo.jours_restants;
  if (j < 0) return `Expiré depuis ${-j} jour${-j > 1 ? "s" : ""}`;
  if (j === 0) return "Se termine aujourd'hui";
  if (j === 1) return "Se termine demain";
  return `Encore ${j} jours`;
};

const Statut = ({ abo }) => {
  let cls = "ab-badge--actif";
  let txt = "Abonné";
  if (abo.statut === "expire") { cls = "ab-badge--expire"; txt = "Expiré"; }
  else if (abo.jours_restants <= 5) { cls = "ab-badge--bientot"; txt = abo.statut === "essai" ? "Essai, bientôt fini" : "Bientôt fini"; }
  else if (abo.statut === "essai") { cls = "ab-badge--essai"; txt = "Essai gratuit"; }
  return <span className={`ab-badge ${cls}`}>{txt}</span>;
};

const FILTRES = [
  { id: "tous", label: "Tous" },
  { id: "relancer", label: "À relancer" },
  { id: "expire", label: "Expirés" },
  { id: "essai", label: "En essai" },
  { id: "actif", label: "Abonnés" },
];

// ==================== PAGE ====================
const Abonnements = () => {
  const [donnees, setDonnees] = useState({ abonnements: [], stats: null });
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [filtre, setFiltre] = useState("tous");
  const [recherche, setRecherche] = useState("");
  const [selection, setSelection] = useState(null); // id_utilisateur ouvert
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  const [message, setMessage] = useState(null);

  const charger = async () => {
    setErreur(null);
    try {
      const r = await AbonnementAdminService.liste();
      if (r.success) setDonnees(r);
      else setErreur(r.message || "Chargement impossible");
    } catch (e) {
      setErreur(e.response?.data?.message || "Chargement impossible");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { charger(); }, []);

  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return donnees.abonnements
      .filter((a) => {
        if (filtre === "relancer") return a.jours_restants >= 0 && a.jours_restants <= 5;
        if (filtre === "expire") return a.statut === "expire";
        if (filtre === "essai") return a.statut === "essai";
        if (filtre === "actif") return a.statut === "actif";
        return true;
      })
      .filter((a) =>
        !q || [a.fullname, a.telephone, a.nom_magasin, a.slug].some((v) => (v || "").toLowerCase().includes(q))
      )
      // Les plus urgents d'abord
      .sort((x, y) => x.jours_restants - y.jours_restants);
  }, [donnees, filtre, recherche]);

  const s = donnees.stats;

  return (
    <div className="ab-page">
      <header className="ab-header">
        <div>
          <h1 className="ab-title">Abonnements</h1>
          <p className="ab-subtitle">Enregistre les paiements reçus et suis les échéances de chaque patron</p>
        </div>
        <div className="ab-header-actions">
          <button className="ab-btn ab-btn--outline" onClick={() => setReglagesOuverts(true)}>
            <Settings2 size={15} /> Moyens de paiement et tarif
          </button>
          <button className="ab-btn ab-btn--outline" onClick={() => { setChargement(true); charger(); }}>
            <RefreshCw size={15} className={chargement ? "ab-spin" : ""} /> Actualiser
          </button>
        </div>
      </header>

      {message && <div className="ab-flash" role="status">{message}</div>}

      {s && (
        <section className="ab-stats">
          <Stat icon={Users} label="Patrons" value={s.total} />
          <Stat icon={BadgeCheck} label="Abonnés" value={s.actifs} tone="info" />
          <Stat icon={Hourglass} label="En essai" value={s.essai} />
          <Stat icon={CalendarClock} label="Finissent sous 5 jours" value={s.bientot} tone="warning" />
          <Stat icon={CalendarX2} label="Expirés" value={s.expires} tone="danger" />
          <Stat icon={Wallet} label="Revenu mensuel" value={fcfa(s.revenu_mensuel)} tone="brand" />
        </section>
      )}

      <div className="ab-toolbar">
        <nav className="ab-tabs" aria-label="Filtrer">
          {FILTRES.map((f) => (
            <button
              key={f.id}
              className={`ab-tab ${filtre === f.id ? "is-active" : ""}`}
              onClick={() => setFiltre(f.id)}
            >
              {f.label}
            </button>
          ))}
        </nav>
        <div className="ab-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Nom, téléphone, magasin…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          {recherche && (
            <button className="ab-icon-btn" onClick={() => setRecherche("")} aria-label="Effacer">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {erreur ? (
        <div className="ab-etat">
          <AlertCircle size={28} />
          <p>{erreur}</p>
          <button className="ab-btn ab-btn--primary" onClick={charger}>Réessayer</button>
        </div>
      ) : chargement && !donnees.abonnements.length ? (
        <div className="ab-etat"><div className="ab-spinner" /><p>Chargement…</p></div>
      ) : liste.length === 0 ? (
        <div className="ab-etat">
          <Wallet size={36} />
          <p>Aucun patron dans cette liste.</p>
        </div>
      ) : (
        <div className="ab-table-wrap">
          <table className="ab-table">
            <thead>
              <tr>
                <th className="ab-num">N°</th>
                <th>Patron</th>
                <th>Magasin</th>
                <th className="ab-right">Produits</th>
                <th className="ab-right">Prix par mois</th>
                <th>Statut</th>
                <th>Valable jusqu'au</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {liste.map((a, i) => (
                <tr key={a.id_utilisateur} onClick={() => setSelection(a.id_utilisateur)}>
                  <td className="ab-num">{i + 1}</td>
                  <td>
                    <div className="ab-cell-user">
                      <span className="ab-avatar">{initiales(a.fullname)}</span>
                      <div>
                        <strong>{a.fullname}</strong>
                        <small>{a.telephone || a.slug}</small>
                      </div>
                    </div>
                  </td>
                  <td>{a.nom_magasin || <span className="ab-muted">—</span>}</td>
                  <td className="ab-right">{a.nb_produits}</td>
                  <td className="ab-right"><strong>{fcfa(a.montant_mensuel)}</strong></td>
                  <td><Statut abo={a} /></td>
                  <td>
                    <div className="ab-cell-date">
                      <span>{dateLongue(a.date_fin)}</span>
                      <small className={a.jours_restants < 0 ? "is-danger" : a.jours_restants <= 5 ? "is-warning" : ""}>
                        {echeance(a)}
                      </small>
                    </div>
                  </td>
                  <td className="ab-right">
                    <button
                      className="ab-btn ab-btn--primary ab-btn--sm"
                      onClick={(e) => { e.stopPropagation(); setSelection(a.id_utilisateur); }}
                    >
                      <Plus size={14} /> Paiement reçu
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selection && (
        <PanneauPatron
          id={selection}
          onClose={() => setSelection(null)}
          onChange={(msg) => { setMessage(msg); charger(); }}
        />
      )}

      {reglagesOuverts && (
        <PanneauReglages
          onClose={() => setReglagesOuverts(false)}
          onSaved={() => { setReglagesOuverts(false); setMessage("Réglages enregistrés"); charger(); }}
        />
      )}
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, tone = "neutre" }) => (
  <div className={`ab-stat ab-stat--${tone}`}>
    <span className="ab-stat-icon"><Icon size={17} /></span>
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  </div>
);

// ==================== FENÊTRE ====================
const Fenetre = ({ titre, sousTitre, onClose, children, pied, large }) =>
  createPortal(
    <div className="ab-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ab-modal ${large ? "ab-modal--large" : ""}`} role="dialog" aria-modal="true" aria-label={titre}>
        <div className="ab-modal-head">
          <div>
            <h2>{titre}</h2>
            {sousTitre && <p>{sousTitre}</p>}
          </div>
          <button className="ab-icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="ab-modal-body">{children}</div>
        {pied && <div className="ab-modal-foot">{pied}</div>}
      </div>
    </div>,
    document.body
  );

// ==================== PATRON : PAIEMENT + HISTORIQUE ====================
const PanneauPatron = ({ id, onClose, onChange }) => {
  const [abo, setAbo] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [form, setForm] = useState({ nb_mois: 1, montant: "", moyen_paiement: "wave", reference: "", note: "" });
  const [montantTouche, setMontantTouche] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await AbonnementAdminService.detail(id);
        setAbo(r.abonnement);
        setHistorique(r.historique || []);
      } catch (e) {
        setErreur(e.response?.data?.message || "Chargement impossible");
      }
    })();
  }, [id]);

  // Montant proposé = prix du mois × nombre de mois (modifiable)
  useEffect(() => {
    if (abo && !montantTouche) setForm((f) => ({ ...f, montant: String(abo.montant_mensuel * f.nb_mois) }));
  }, [abo, form.nb_mois, montantTouche]);

  const enregistrer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await AbonnementAdminService.prolonger(id, { ...form, montant: Number(form.montant) || 0 });
      setAbo(r.abonnement);
      setHistorique(r.historique || []);
      setMontantTouche(false);
      setForm((f) => ({ ...f, nb_mois: 1, reference: "", note: "" }));
      onChange(`Abonnement de ${r.abonnement.fullname} prolongé jusqu'au ${dateLongue(r.abonnement.date_fin)}`);
    } catch (e) {
      setErreur(e.response?.data?.message || "Enregistrement impossible");
    } finally {
      setEnvoi(false);
    }
  };

  const annuler = async (h) => {
    if (!window.confirm(`Annuler le paiement de ${fcfa(h.montant)} du ${dateLongue(h.date_debut)} ?`)) return;
    try {
      const r = await AbonnementAdminService.annulerPaiement(id, h.id_abonnement);
      setAbo(r.abonnement);
      setHistorique(r.historique || []);
      onChange("Paiement annulé");
    } catch (e) {
      setErreur(e.response?.data?.message || "Annulation impossible");
    }
  };

  return (
    <Fenetre
      titre={abo ? abo.fullname : "Abonnement"}
      sousTitre={abo ? [abo.nom_magasin, abo.telephone].filter(Boolean).join(" · ") : null}
      onClose={onClose}
      large
      pied={abo && (
        <>
          <button className="ab-btn ab-btn--outline" onClick={onClose}>Fermer</button>
          <button className="ab-btn ab-btn--primary" onClick={enregistrer} disabled={envoi}>
            {envoi ? "Enregistrement…" : `Enregistrer le paiement de ${fcfa(form.montant)}`}
          </button>
        </>
      )}
    >
      {erreur && <div className="ab-alerte"><AlertCircle size={15} /> {erreur}</div>}
      {!abo ? (
        <div className="ab-etat"><div className="ab-spinner" /></div>
      ) : (
        <>
          <div className="ab-resume">
            <div><span>Statut</span><Statut abo={abo} /></div>
            <div><span>{abo.statut === "expire" ? "Fin le" : "Valable jusqu'au"}</span><strong>{dateLongue(abo.date_fin)}</strong><small>{echeance(abo)}</small></div>
            <div><span><Package size={12} /> Produits</span><strong>{abo.nb_produits}</strong></div>
            <div><span>Prix par mois</span><strong>{fcfa(abo.montant_mensuel)}</strong></div>
          </div>

          <h3 className="ab-h3">1. Paiement reçu</h3>
          <div className="ab-form">
            <label className="ab-field">
              <span>Durée payée</span>
              <select
                value={form.nb_mois}
                onChange={(e) => { setMontantTouche(false); setForm({ ...form, nb_mois: Number(e.target.value) }); }}
              >
                {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m} mois</option>)}
              </select>
            </label>
            <label className="ab-field">
              <span>Montant reçu (F CFA)</span>
              <input
                type="number"
                min="0"
                step="500"
                value={form.montant}
                onChange={(e) => { setMontantTouche(true); setForm({ ...form, montant: e.target.value }); }}
              />
            </label>
            <div className="ab-field ab-field--full">
              <span>Moyen de paiement</span>
              <div className="ab-choix" role="group" aria-label="Moyen de paiement">
                {MOYENS.map((m) => (
                  <button
                    key={m.code}
                    type="button"
                    className={form.moyen_paiement === m.code ? "is-active" : ""}
                    onClick={() => setForm({ ...form, moyen_paiement: m.code })}
                  >
                    {m.nom}
                  </button>
                ))}
              </div>
            </div>
            <label className="ab-field">
              <span>Référence de la transaction <em>facultatif</em></span>
              <input
                type="text"
                maxLength={100}
                value={form.reference}
                placeholder="Ex : identifiant Wave"
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
              />
            </label>
            <label className="ab-field">
              <span>Note <em>facultatif</em></span>
              <input
                type="text"
                maxLength={255}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>
          </div>
          <p className="ab-apercu">
            Après ce paiement, l'abonnement sera valable jusqu'au <strong>{dateLongue(finApresPaiement(abo, form.nb_mois))}</strong>.
          </p>

          <h3 className="ab-h3">2. Paiements enregistrés</h3>
          {historique.length === 0 ? (
            <p className="ab-muted">Aucun paiement pour l'instant{abo.en_essai ? " : ce patron est en période d'essai." : "."}</p>
          ) : (
            <div className="ab-table-wrap ab-table-wrap--flat">
              <table className="ab-table ab-table--compact">
                <thead>
                  <tr>
                    <th className="ab-num">N°</th>
                    <th>Période</th>
                    <th className="ab-right">Montant</th>
                    <th>Moyen</th>
                    <th>Référence</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map((h, i) => (
                    <tr key={h.id_abonnement}>
                      <td className="ab-num">{i + 1}</td>
                      <td>{dateLongue(h.date_debut)} au {dateLongue(h.date_fin)} <small className="ab-muted">({h.nb_mois} mois)</small></td>
                      <td className="ab-right"><strong>{fcfa(h.montant)}</strong></td>
                      <td>{nomMoyen(h.moyen_paiement)}</td>
                      <td>{h.reference || h.note || <span className="ab-muted">—</span>}</td>
                      <td className="ab-right">
                        <button className="ab-icon-btn ab-icon-btn--danger" onClick={() => annuler(h)} aria-label="Annuler ce paiement" title="Annuler ce paiement">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Fenetre>
  );
};

// ==================== RÉGLAGES : NUMÉROS ET TARIF ====================
const PanneauReglages = ({ onClose, onSaved }) => {
  const [r, setR] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await AbonnementAdminService.reglages();
        setR(res.reglages);
      } catch (e) {
        setErreur(e.response?.data?.message || "Chargement impossible");
      }
    })();
  }, []);

  const majMoyen = (code, champ, valeur) =>
    setR((x) => ({ ...x, moyens: x.moyens.map((m) => (m.code === code ? { ...m, [champ]: valeur } : m)) }));
  const majTarif = (champ, valeur) => setR((x) => ({ ...x, tarif: { ...x.tarif, [champ]: valeur } }));

  const enregistrer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      await AbonnementAdminService.enregistrerReglages(r);
      onSaved();
    } catch (e) {
      setErreur(e.response?.data?.message || "Enregistrement impossible");
      setEnvoi(false);
    }
  };

  const exemple = r && (() => {
    const t = { base: +r.tarif.base || 0, seuil: +r.tarif.seuil || 1, palier: +r.tarif.palier || 1, supplement: +r.tarif.supplement || 0 };
    const prix = (n) => (n <= t.seuil ? t.base : t.base + Math.ceil((n - t.seuil) / t.palier) * t.supplement);
    return [t.seuil, t.seuil + 1, t.seuil + t.palier + 1].map((n) => `${n} produits : ${fcfa(prix(n))}`).join(" · ");
  })();

  return (
    <Fenetre
      titre="Moyens de paiement et tarif"
      sousTitre="Ces numéros s'affichent chez tes clients dans les rappels d'abonnement"
      onClose={onClose}
      large
      pied={r && (
        <>
          <button className="ab-btn ab-btn--outline" onClick={onClose}>Annuler</button>
          <button className="ab-btn ab-btn--primary" onClick={enregistrer} disabled={envoi}>
            {envoi ? "Enregistrement…" : "Enregistrer"}
          </button>
        </>
      )}
    >
      {erreur && <div className="ab-alerte"><AlertCircle size={15} /> {erreur}</div>}
      {!r ? (
        <div className="ab-etat"><div className="ab-spinner" /></div>
      ) : (
        <>
          <h3 className="ab-h3">1. Moyens de paiement</h3>
          <div className="ab-moyens">
            {r.moyens.map((m, i) => (
              <div key={m.code} className={`ab-moyen ${m.actif ? "" : "is-off"}`}>
                <div className="ab-moyen-head">
                  <strong>{i + 1}. {m.nom}</strong>
                  <label className="ab-switch">
                    <input type="checkbox" checked={m.actif} onChange={(e) => majMoyen(m.code, "actif", e.target.checked)} />
                    <span>{m.actif ? "Affiché" : "Masqué"}</span>
                  </label>
                </div>
                <div className="ab-form">
                  {m.code === "banque" && (
                    <label className="ab-field ab-field--full">
                      <span>Nom de la banque</span>
                      <input type="text" value={m.banque || ""} onChange={(e) => majMoyen(m.code, "banque", e.target.value)} placeholder="Ex : SGCI" />
                    </label>
                  )}
                  <label className="ab-field">
                    <span>{m.code === "banque" ? "Numéro de compte (RIB)" : "Numéro"}</span>
                    <input type="text" value={m.numero} onChange={(e) => majMoyen(m.code, "numero", e.target.value)} placeholder={m.code === "banque" ? "CI000 00000 000000000000 00" : "07 00 00 00 00"} />
                  </label>
                  <label className="ab-field">
                    <span>Au nom de</span>
                    <input type="text" value={m.titulaire} onChange={(e) => majMoyen(m.code, "titulaire", e.target.value)} placeholder="NDOUBLE" />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <label className="ab-field">
            <span>Numéro à appeler pour confirmer un paiement <em>facultatif</em></span>
            <input type="text" value={r.contact || ""} onChange={(e) => setR({ ...r, contact: e.target.value })} placeholder="07 00 00 00 00" />
          </label>

          <h3 className="ab-h3">2. Tarif mensuel</h3>
          <div className="ab-form ab-form--4">
            <label className="ab-field"><span>Prix de base (F)</span><input type="number" min="0" step="500" value={r.tarif.base} onChange={(e) => majTarif("base", e.target.value)} /></label>
            <label className="ab-field"><span>Jusqu'à (produits)</span><input type="number" min="1" value={r.tarif.seuil} onChange={(e) => majTarif("seuil", e.target.value)} /></label>
            <label className="ab-field"><span>Puis par tranche de</span><input type="number" min="1" value={r.tarif.palier} onChange={(e) => majTarif("palier", e.target.value)} /></label>
            <label className="ab-field"><span>Supplément (F)</span><input type="number" min="0" step="500" value={r.tarif.supplement} onChange={(e) => majTarif("supplement", e.target.value)} /></label>
          </div>
          <p className="ab-apercu"><Store size={13} /> {exemple}</p>

          <h3 className="ab-h3">3. Essai gratuit</h3>
          <div className="ab-form">
            <label className="ab-field">
              <span>Durée pour un nouveau patron (jours)</span>
              <input type="number" min="0" max="365" value={r.jours_essai} onChange={(e) => setR({ ...r, jours_essai: e.target.value })} />
            </label>
          </div>

          <h3 className="ab-h3">4. Rappel quand l'abonnement est expiré</h3>
          <div className="ab-form">
            <label className="ab-field">
              <span>Réafficher la fenêtre de paiement</span>
              <select
                value={r.rappel_expire_minutes ?? 60}
                onChange={(e) => setR({ ...r, rappel_expire_minutes: Number(e.target.value) })}
              >
                {INTERVALLES.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </label>
          </div>
          <p className="ab-apercu">
            {Number(r.rappel_expire_minutes) > 0
              ? `Le patron voit la fenêtre à chaque ouverture de Miyo, puis de nouveau ${libelleIntervalle(r.rappel_expire_minutes)} après l'avoir fermée.`
              : "Le patron voit la fenêtre seulement à chaque ouverture de Miyo."}
          </p>
        </>
      )}
    </Fenetre>
  );
};

export default Abonnements;
