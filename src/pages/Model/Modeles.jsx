// pages/Model/Modeles.jsx — au style Ventes (composant commun Referentiel)
import React from "react";
import { Layers } from "lucide-react";
import ModeleService from "../../services/modeleService";
import Referentiel from "../../components/UI/Referentiel";

const CONFIG = {
  className: "mdl",
  titre: "Modèles",
  sousTitre: "Les variantes d'un produit (taille, contenance, version…)",
  icone: Layers,
  mot: { un: "modèle", des: "modèles", le: "le modèle", nouveau: "Nouveau modèle", feminin: false },
  idKey: "id_modele",
  champs: [
    { name: "nom", label: "Nom", placeholder: "Ex. 1,5 L", requis: true, max: 100 },
  ],
  service: {
    lister: (t) => ModeleService.getAllModeles(t),
    creer: (t, d) => ModeleService.createModele(t, d),
    modifier: (t, id, d) => ModeleService.updateModele(t, id, d),
    supprimer: (t, id) => ModeleService.deleteModele(t, id),
    exporter: (t) => ModeleService.exportModeles(t),
  },
  noteSynthese: "Utilisables à la création des produits",
  aideVide: "Ajoutez les modèles (tailles, contenances…) que vous utilisez pour vos produits.",
};

const Modeles = () => <Referentiel config={CONFIG} />;
export default Modeles;
