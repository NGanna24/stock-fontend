// pages/Unites/Unites.jsx — au style Ventes (composant commun Referentiel)
import React from "react";
import { Ruler } from "lucide-react";
import UniteService from "../../services/uniteService";
import Referentiel from "../../components/UI/Referentiel";

const CONFIG = {
  className: "uni",
  titre: "Unités",
  sousTitre: "L'unité dans laquelle vous comptez le stock de chaque produit (pièce, kg, litre, sac…)",
  icone: Ruler,
  mot: { un: "unité", des: "unités", le: "l'unité", nouveau: "Nouvelle unité", feminin: true },
  idKey: "id_unite",
  champs: [
    { name: "nom", label: "Nom", placeholder: "Ex. Kilogramme", requis: true, max: 50 },
    { name: "symbole", label: "Symbole", placeholder: "Ex. kg", requis: true, max: 10, court: true,
      aide: "Affiché à côté des quantités : 12 kg, 3 sacs…" },
    { name: "description", label: "Description", type: "textarea", max: 255 },
  ],
  colonnes: [
    { titre: "Symbole", rendu: (u) => (u.symbole ? <span className="vt-tag" data-s="muted">{u.symbole}</span> : <span className="vt-muted">-</span>) },
    { titre: "Description", className: "ref-desc", rendu: (u) => u.description || <span className="vt-muted">-</span> },
  ],
  service: {
    lister: (t) => UniteService.getAllUnites(t),
    creer: (t, d) => UniteService.createUnite(t, d),
    modifier: (t, id, d) => UniteService.updateUnite(t, id, d),
    supprimer: (t, id) => UniteService.deleteUnite(t, id),
    exporter: (t) => UniteService.exportUnites(t),
  },
  noteSynthese: "Pour vendre au carton, au sac ou au détail, ajoutez des unités de vente sur la fiche produit",
  aideVide: "Ajoutez au moins une unité (pièce, kg, litre…) : chaque produit a son unité de stock.",
};

const Unites = () => <Referentiel config={CONFIG} />;
export default Unites;
