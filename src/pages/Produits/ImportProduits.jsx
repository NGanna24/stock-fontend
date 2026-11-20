// pages/Produits/ImportProduits.jsx
// Import de produits depuis un fichier Excel, en 3 temps :
//   1. choisir le fournisseur, l'unité de base et le fichier
//   2. Miyo vérifie chaque ligne et montre les problèmes (rien n'est encore enregistré)
//   3. on confirme : tous les produits valides sont créés d'un coup
// Affiché dans la page Produits (hérite de ses variables et de ses boutons « pr- »).
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X, FileSpreadsheet, Download, Upload, Check, AlertTriangle, AlertCircle, Copy, RefreshCw, Loader,
} from "lucide-react";
import SelectSearch from "../../components/SelectSearch/SelectSearch";
import ProduitService from "../../services/produitService";
import "./ImportProduits.css";

const normaliser = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const fcfa = (v) => (Number(v) > 0 ? `${Math.round(Number(v)).toLocaleString("fr-FR")} F` : "—");
const PAR_PAGE = 150;

const ETATS = {
  pret: { libelle: "Prêt", icone: Check },
  attention: { libelle: "À vérifier", icone: AlertTriangle },
  erreur: { libelle: "Erreur", icone: AlertCircle },
  existe: { libelle: "Déjà présent", icone: Copy },
};

export default function ImportProduits({ token, fournisseurs = [], unites = [], onClose, onImported }) {
  const [idFournisseur, setIdFournisseur] = useState("");
  const [idUnite, setIdUnite] = useState("");
  const [fichier, setFichier] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [filtre, setFiltre] = useState("tout");
  const [limite, setLimite] = useState(PAR_PAGE);
  const [etape, setEtape] = useState("choix"); // choix | verif | import | fini
  const [erreur, setErreur] = useState("");
  const [resultat, setResultat] = useState(null);
  const [telechargement, setTelechargement] = useState(false);
  const champFichier = useRef(null);

  // Unité de base proposée : « Pièce » si elle existe
  useEffect(() => {
    if (idUnite || !unites.length) return;
    const piece = unites.find((u) => normaliser(u.nom).startsWith("piece"));
    if (piece) setIdUnite(String(piece.id_unite));
  }, [unites, idUnite]);

  // Échap pour fermer (sauf pendant l'import)
  useEffect(() => {
    const touche = (e) => e.key === "Escape" && etape !== "import" && onClose();
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [etape, onClose]);

  const choisirFichier = (f) => {
    setErreur("");
    setApercu(null);
    setResultat(null);
    if (!f) return setFichier(null);
    if (!/\.xlsx$/i.test(f.name)) {
      setFichier(null);
      return setErreur("Choisis un fichier Excel au format .xlsx (dans Excel : Fichier > Enregistrer sous > Classeur Excel).");
    }
    setFichier(f);
  };

  const telechargerModele = async () => {
    setTelechargement(true);
    try {
      await ProduitService.telechargerModeleImport(token);
    } catch (e) {
      setErreur(e.message || "Téléchargement impossible.");
    } finally {
      setTelechargement(false);
    }
  };

  const verifier = async () => {
    if (!fichier) return;
    setEtape("verif");
    setErreur("");
    try {
      const r = await ProduitService.apercuImport(token, fichier);
      setApercu(r.data);
      setFiltre(r.data.resume.erreur ? "erreur" : "tout");
      setLimite(PAR_PAGE);
    } catch (e) {
      setErreur(e.message || "Vérification impossible.");
    } finally {
      setEtape("choix");
    }
  };

  const importer = async () => {
    if (!apercu || !fichier) return;
    if (manqueFournisseur) return setErreur(`${apercu.resume.sans_fournisseur} ligne(s) sans fournisseur : choisis le fournisseur par défaut.`);
    if (manqueUnite) return setErreur(`${apercu.resume.sans_unite} ligne(s) sans unité : choisis l'unité de base par défaut.`);
    setEtape("import");
    setErreur("");
    try {
      const r = await ProduitService.importerProduits(token, fichier, { id_fournisseur: idFournisseur, id_unite: idUnite });
      setResultat(r.data);
      setEtape("fini");
      onImported?.(r);
    } catch (e) {
      setErreur(e.message || "Import impossible.");
      setEtape("choix");
    }
  };

  const resume = apercu?.resume;
  // Les champs « par défaut » ne servent qu'aux lignes où la colonne est vide
  const manqueFournisseur = !!resume && resume.sans_fournisseur > 0 && !idFournisseur;
  const manqueUnite = !!resume && resume.sans_unite > 0 && !idUnite;
  const lignes = useMemo(() => {
    const toutes = apercu?.lignes || [];
    return filtre === "tout" ? toutes : toutes.filter((l) => l.etat === filtre);
  }, [apercu, filtre]);

  const occupe = etape === "verif" || etape === "import";
  const filtres = resume
    ? [
        { cle: "tout", libelle: "Toutes", n: resume.total },
        { cle: "erreur", libelle: "Erreurs", n: resume.erreur },
        { cle: "attention", libelle: "À vérifier", n: resume.attention },
        { cle: "pret", libelle: "Prêtes", n: resume.pret },
        { cle: "existe", libelle: "Déjà présentes", n: resume.existe },
      ].filter((f) => f.cle === "tout" || f.n > 0)
    : [];

  return (
    <div className="pr-overlay" role="dialog" aria-modal="true" aria-label="Importer des produits depuis Excel">
      <div className="pr-sheet imp-sheet">
        <header className="pr-sheet-head">
          <div className="pr-sheet-title">
            <span className="pr-sheet-mark"><FileSpreadsheet size={21} /></span>
            <div>
              <h2>Importer depuis Excel</h2>
              <p>Rien n'est enregistré avant ta confirmation</p>
            </div>
          </div>
          <button className="pr-sheet-close" onClick={() => !occupe && onClose()} aria-label="Fermer" disabled={etape === "import"}><X size={20} /></button>
        </header>

        <div className="imp-body">
          {etape === "fini" && resultat ? (
            <div className="imp-fini">
              <span className="imp-fini-mark"><Check size={30} /></span>
              <h3>{resultat.crees} produit{resultat.crees > 1 ? "s" : ""} importé{resultat.crees > 1 ? "s" : ""}</h3>
              <ol className="imp-liste">
                {resultat.unites_vente > 0 && <li>{resultat.unites_vente} prix en carton ou en gros ajouté{resultat.unites_vente > 1 ? "s" : ""}.</li>}
                {resultat.nouveaux && Object.values(resultat.nouveaux).some((n) => n > 0) && (
                  <li>
                    Créés aussi :{" "}
                    {[
                      ["fournisseurs", "fournisseur"], ["unites", "unité"], ["marques", "marque"],
                      ["modeles", "modèle"], ["categories", "catégorie"], ["emplacements", "emplacement"],
                    ].filter(([k]) => resultat.nouveaux[k] > 0).map(([k, mot]) => `${resultat.nouveaux[k]} ${mot}${resultat.nouveaux[k] > 1 ? "s" : ""}`).join(", ")}.
                  </li>
                )}
                {resultat.ignores > 0 && <li>{resultat.ignores} ligne{resultat.ignores > 1 ? "s" : ""} non importée{resultat.ignores > 1 ? "s" : ""} (en erreur ou déjà dans la boutique).</li>}
                {resultat.sans_prix_vente > 0 && (
                  <li className="imp-li-attention">
                    {resultat.sans_prix_vente} produit{resultat.sans_prix_vente > 1 ? "s" : ""} sans prix de vente : complète-les avant de les vendre.
                  </li>
                )}
              </ol>
              <button className="pr-btn pr-btn--signal" onClick={onClose}>Voir mes produits</button>
            </div>
          ) : (
            <>
              {/* 1. Réglages et fichier */}
              <section className="imp-reglages">
                <div className="imp-etape">
                  <span className="imp-num">1</span>
                  <div className="imp-etape-txt">
                    <strong>La fiche produits à remplir</strong>
                    <span>Les mêmes champs que « Nouveau produit », avec tes fournisseurs, marques, unités et emplacements en listes déroulantes.</span>
                  </div>
                  <button className="pr-btn pr-btn--sm" onClick={telechargerModele} disabled={telechargement}>
                    {telechargement ? <Loader size={14} className="pr-spin" /> : <Download size={14} />} Télécharger la fiche
                  </button>
                </div>

                <div className="imp-grille">
                  <div className="pr-field">
                    <SelectSearch
                      options={fournisseurs}
                      value={idFournisseur}
                      onChange={(e) => setIdFournisseur(e.target.value)}
                      label={`Fournisseur par défaut${resume?.sans_fournisseur ? " *" : ""}`}
                      placeholder="Sélectionner..."
                      optionLabel="nom"
                      optionValue="id_fournisseur"
                      name="imp_fournisseur"
                      disabled={occupe}
                    />
                  </div>
                  <div className="pr-field">
                    <SelectSearch
                      options={unites}
                      value={idUnite}
                      onChange={(e) => setIdUnite(e.target.value)}
                      label={`Unité de base par défaut${resume?.sans_unite ? " *" : ""}`}
                      placeholder="Sélectionner..."
                      optionLabel="nom"
                      optionValue="id_unite"
                      name="imp_unite"
                      disabled={occupe}
                      renderOption={(u) => <span>{u.nom} <small>({u.symbole})</small></span>}
                    />
                  </div>
                </div>

                <p className="imp-aide">Ces deux choix servent seulement aux lignes où la colonne Fournisseur ou Unité est vide.</p>
                <div
                  className={`imp-depot ${fichier ? "is-plein" : ""}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (!occupe) choisirFichier(e.dataTransfer.files?.[0]); }}
                >
                  <span className="imp-num">2</span>
                  <div className="imp-etape-txt">
                    <strong>{fichier ? fichier.name : "Le fichier rempli"}</strong>
                    <span>{fichier ? `${Math.max(1, Math.round(fichier.size / 1024))} Ko` : "Glisse le fichier ici ou choisis-le."}</span>
                  </div>
                  <input
                    ref={champFichier}
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    hidden
                    onChange={(e) => { choisirFichier(e.target.files?.[0]); e.target.value = ""; }}
                  />
                  <button className="pr-btn pr-btn--sm" onClick={() => champFichier.current?.click()} disabled={occupe}>
                    <Upload size={14} /> {fichier ? "Changer" : "Choisir"}
                  </button>
                  <button className="pr-btn pr-btn--sm pr-btn--dark" onClick={verifier} disabled={!fichier || occupe}>
                    {etape === "verif" ? <Loader size={14} className="pr-spin" /> : <RefreshCw size={14} />} {apercu ? "Revérifier" : "Vérifier"}
                  </button>
                </div>

                {!unites.length && resume?.sans_unite > 0 && (
                  <div className="imp-erreur" role="alert"><AlertCircle size={16} /> <span>Aucune unité de base : crée d'abord l'unité « Pièce » dans la page Unités.</span></div>
                )}
                {erreur && (
                  <div className="imp-erreur" role="alert"><AlertCircle size={16} /> <span>{erreur}</span></div>
                )}
              </section>

              {/* 2. Aperçu vérifié */}
              {resume && (
                <section className="imp-apercu" aria-label="Vérification du fichier">
                  <div className="imp-bilan">
                    <div className="imp-bilan-cell">
                      <span>Lignes lues</span>
                      <strong>{resume.total}</strong>
                    </div>
                    <div className="imp-bilan-cell">
                      <span>Seront importées</span>
                      <strong>{resume.a_importer}</strong>
                    </div>
                    <div className="imp-bilan-cell imp-bilan-cell--erreur">
                      <span>En erreur</span>
                      <strong>{resume.erreur}</strong>
                    </div>
                    <div className="imp-bilan-cell">
                      <span>Déjà dans la boutique</span>
                      <strong>{resume.existe}</strong>
                    </div>
                  </div>

                  <ol className="imp-liste">
                    {resume.sans_prix_vente > 0 && (
                      <li className="imp-li-attention">
                        {resume.sans_prix_vente > 1 ? `${resume.sans_prix_vente} produits sans prix de vente : ils seront créés, mais à compléter avant de vendre.` : "1 produit sans prix de vente : il sera créé, mais à compléter avant de vendre."}
                      </li>
                    )}
                    {resume.sans_fournisseur > 0 && (
                      <li className={manqueFournisseur ? "imp-li-attention" : ""}>
                        {resume.sans_fournisseur} ligne{resume.sans_fournisseur > 1 ? "s" : ""} sans fournisseur : {manqueFournisseur ? "choisis le fournisseur par défaut ci-dessus." : "le fournisseur par défaut sera utilisé."}
                      </li>
                    )}
                    {resume.sans_unite > 0 && (
                      <li className={manqueUnite ? "imp-li-attention" : ""}>
                        {resume.sans_unite} ligne{resume.sans_unite > 1 ? "s" : ""} sans unité : {manqueUnite ? "choisis l'unité par défaut ci-dessus." : "l'unité par défaut sera utilisée."}
                      </li>
                    )}
                    {resume.noms_proches?.length > 0 && (
                      <li className="imp-li-attention">
                        Faute de frappe probable : {resume.noms_proches.join(" ; ")}. Corrige le fichier pour ne pas créer de doublon.
                      </li>
                    )}
                    {resume.nouveaux_fournisseurs.length > 0 && <li>Fournisseurs créés : {resume.nouveaux_fournisseurs.join(", ")}.</li>}
                    {resume.nouvelles_unites.length > 0 && <li>Unités créées : {resume.nouvelles_unites.join(", ")}.</li>}
                    {resume.nouvelles_marques.length > 0 && <li>Marques créées : {resume.nouvelles_marques.join(", ")}.</li>}
                    {resume.nouveaux_modeles.length > 0 && (
                      <li>{resume.nouveaux_modeles.length} modèle{resume.nouveaux_modeles.length > 1 ? "s" : ""} créé{resume.nouveaux_modeles.length > 1 ? "s" : ""} : {resume.nouveaux_modeles.slice(0, 12).join(", ")}{resume.nouveaux_modeles.length > 12 ? "…" : "."}</li>
                    )}
                    {resume.nouvelles_categories.length > 0 && <li>Catégories créées : {resume.nouvelles_categories.join(", ")}.</li>}
                    {resume.nouveaux_emplacements.length > 0 && <li>Emplacements créés : {resume.nouveaux_emplacements.join(", ")}.</li>}
                    {apercu.colonnes_ignorees?.length > 0 && <li>Colonnes non utilisées : {apercu.colonnes_ignorees.join(", ")}.</li>}
                    {resume.erreur > 0 && <li>Les lignes en erreur ne seront pas importées : corrige-les dans le fichier puis revérifie.</li>}
                  </ol>

                  <div className="imp-filtres" role="tablist">
                    {filtres.map((f) => (
                      <button
                        key={f.cle}
                        role="tab"
                        aria-selected={filtre === f.cle}
                        className={`imp-filtre imp-filtre--${f.cle} ${filtre === f.cle ? "is-on" : ""}`}
                        onClick={() => { setFiltre(f.cle); setLimite(PAR_PAGE); }}
                      >
                        {f.libelle} <b>{f.n}</b>
                      </button>
                    ))}
                  </div>

                  <table className="imp-table">
                    <colgroup>
                      <col className="imp-c-num" />
                      <col />
                      <col className="imp-c-stock" />
                      <col className="imp-c-prix" />
                      <col className="imp-c-carton" />
                      <col className="imp-c-etat" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>N°</th>
                        <th>Produit</th>
                        <th className="pr-num">Stock</th>
                        <th className="pr-num">Prix de vente</th>
                        <th>Unités de vente</th>
                        <th>État</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.slice(0, limite).map((l, i) => {
                        const E = ETATS[l.etat] || ETATS.attention;
                        return (
                          <tr key={`${l.ligne_excel}-${i}`} className={`imp-tr--${l.etat}`}>
                            <td className="imp-td-num" data-titre="N°">
                              <b>{i + 1}</b>
                              {l.ligne_excel && <small>ligne {l.ligne_excel}</small>}
                            </td>
                            <td data-titre="Produit">
                              <strong className="imp-nom">{l.nom || "(sans nom)"}</strong>
                              <small className="imp-sous">{[l.modele, l.marque, l.categorie].filter(Boolean).join(" · ") || "—"}</small>
                              <small className="imp-sous">{[l.fournisseur, [l.emplacement, l.rayon, l.etagere].filter(Boolean).join(" / ")].filter(Boolean).join(" · ")}</small>
                            </td>
                            <td className="pr-num" data-titre="Stock">
                              {l.stock_total > 0 ? l.stock_total.toLocaleString("fr-FR") : "—"}
                              {l.stock_cartons > 0 && l.pieces_par_carton && (
                                <small className="imp-sous">{l.stock_pieces} + {l.stock_cartons} × {l.pieces_par_carton}</small>
                              )}
                            </td>
                            <td className="pr-num" data-titre="Prix de vente">{fcfa(l.prix_vente)}</td>
                            <td data-titre="Unités de vente">
                              {(l.unites_vente || []).map((u, k) => (
                                <span key={k} className="imp-sous">
                                  {u.nom}{Number(u.quantite_base) > 1 ? ` ×${u.quantite_base}` : ""} : {fcfa(u.prix_vente)}
                                </span>
                              ))}
                              {!(l.unites_vente || []).length && <span className="pr-muted">—</span>}
                            </td>
                            <td data-titre="État">
                              <span className={`imp-etat imp-etat--${l.etat}`}><E.icone size={13} /> {E.libelle}</span>
                              {l.messages?.length > 0 && (
                                <ol className="imp-msgs">{l.messages.map((m, k) => <li key={k}>{m}</li>)}</ol>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {lignes.length > limite && (
                    <button className="pr-btn pr-btn--sm imp-plus" onClick={() => setLimite((n) => n + PAR_PAGE)}>
                      Afficher {Math.min(PAR_PAGE, lignes.length - limite)} lignes de plus ({lignes.length - limite} restantes)
                    </button>
                  )}
                  {!lignes.length && <p className="pr-muted imp-vide">Aucune ligne dans cette catégorie.</p>}
                </section>
              )}
            </>
          )}
        </div>

        {etape !== "fini" && (
          <footer className="pr-sheet-foot imp-foot">
            <span className="imp-foot-info">
              {resume && resume.a_importer > 0 && (manqueFournisseur || manqueUnite)
                ? `Choisis ${manqueFournisseur ? "le fournisseur" : "l'unité"} par défaut pour pouvoir importer`
                : resume
                ? `${resume.a_importer} produit${resume.a_importer > 1 ? "s" : ""} prêt${resume.a_importer > 1 ? "s" : ""} à être créé${resume.a_importer > 1 ? "s" : ""}`
                : "Vérifie le fichier pour voir ce qui sera importé"}
            </span>
            <button className="pr-btn pr-btn--ghost" onClick={onClose} disabled={etape === "import"}>Annuler</button>
            <button
              className="pr-btn pr-btn--signal"
              onClick={importer}
              disabled={!resume || !resume.a_importer || occupe || manqueFournisseur || manqueUnite}
            >
              {etape === "import" ? <Loader size={16} className="pr-spin" /> : <Upload size={16} />}
              {resume?.a_importer ? `Importer ${resume.a_importer} produit${resume.a_importer > 1 ? "s" : ""}` : "Importer"}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
