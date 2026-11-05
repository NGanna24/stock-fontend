// pages/Categories/Categories.jsx — au style Ventes (composant commun Referentiel)
import React from "react";
import { FolderOpen } from "lucide-react";
import CategorieService from "../../services/categorieService";
import Referentiel from "../../components/UI/Referentiel";
import "./Categories.css";

const CONFIG = {
  className: "cat",
  titre: "Catégories",
  sousTitre: "Classez vos produits (boissons, alimentation, quincaillerie…) pour les retrouver et les analyser",
  icone: FolderOpen,
  mot: { un: "catégorie", des: "catégories", le: "la catégorie", nouveau: "Nouvelle catégorie", feminin: true },
  noteActifs: "proposées à la création des produits",
  idKey: "id_categorie",
  champs: [
    { name: "nom", label: "Nom", placeholder: "Ex. Boissons", requis: true, max: 100 },
    { name: "description", label: "Description", placeholder: "Ce que contient cette catégorie", type: "textarea", max: 500 },
  ],
  nom: (c) => (
    <span className="cat-nom">
      <i className="cat-dot" style={{ background: c.couleur || "var(--signal)" }} aria-hidden="true" />
      {c.nom}
    </span>
  ),
  colonnes: [
    { titre: "Description", className: "ref-desc", rendu: (c) => c.description || <span className="vt-muted">-</span> },
  ],
  service: {
    lister: (t) => CategorieService.getAllCategories(t),
    creer: (t, d) => CategorieService.createCategory(t, d),
    modifier: (t, id, d) => CategorieService.updateCategory(t, id, d),
    supprimer: (t, id) => CategorieService.deleteCategory(t, id),
    exporter: (t) => CategorieService.exportCategories(t),
  },
  statut: {
    actif: (c) => c.statut !== "inactif",
    basculer: (t, c) => CategorieService.updateCategoryStatus(t, c.id_categorie, c.statut === "inactif" ? "actif" : "inactif"),
    appliquer: (c) => ({ ...c, statut: c.statut === "inactif" ? "actif" : "inactif" }),
  },
  aideVide: "Créez vos catégories, puis choisissez-en une pour chaque produit.",
};

const Categories = () => <Referentiel config={CONFIG} />;
export default Categories;
