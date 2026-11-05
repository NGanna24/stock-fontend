// pages/Marques/Marques.jsx — au style Ventes (composant commun Referentiel)
import React from "react";
import { Tag } from "lucide-react";
import MarqueService from "../../services/marqueService";
import Referentiel from "../../components/UI/Referentiel";

const estActive = (m) => Number(m.actif) === 1;

const CONFIG = {
  className: "mrq",
  titre: "Marques",
  sousTitre: "Les marques de vos produits, pour les distinguer à la vente et dans les rapports",
  icone: Tag,
  mot: { un: "marque", des: "marques", le: "la marque", nouveau: "Nouvelle marque", feminin: true },
  noteActifs: "proposées à la création des produits",
  idKey: "id_marque",
  champs: [
    { name: "nom", label: "Nom", placeholder: "Ex. Dinor", requis: true, max: 100 },
    { name: "description", label: "Description", placeholder: "Fabricant, pays d'origine…", type: "textarea", max: 500 },
  ],
  colonnes: [
    { titre: "Description", className: "ref-desc", rendu: (m) => m.description || <span className="vt-muted">-</span> },
  ],
  service: {
    lister: (t) => MarqueService.getAllMarques(t),
    creer: (t, d) => MarqueService.createMarque(t, d),
    modifier: (t, id, d) => MarqueService.updateMarque(t, id, d),
    supprimer: (t, id) => MarqueService.deleteMarque(t, id),
    exporter: (t) => MarqueService.exportMarques(t),
  },
  statut: {
    actif: estActive,
    basculer: (t, m) => MarqueService.updateMarqueStatus(t, m.id_marque, estActive(m) ? 0 : 1),
    appliquer: (m) => ({ ...m, actif: estActive(m) ? 0 : 1 }),
  },
  aideVide: "Ajoutez les marques que vous vendez, puis choisissez-en une pour chaque produit.",
};

const Marques = () => <Referentiel config={CONFIG} />;
export default Marques;
