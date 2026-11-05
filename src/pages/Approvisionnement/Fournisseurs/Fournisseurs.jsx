// pages/Approvisionnement/Fournisseurs/Fournisseurs.jsx — au style Ventes (composant commun Referentiel)
import React from "react";
import { Truck } from "lucide-react";
import FournisseurService from "../../../services/fournisseurService";
import Referentiel from "../../../components/UI/Referentiel";
import "./Fournisseurs.css";

const cellule = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const CONFIG = {
  className: "frn",
  titre: "Fournisseurs",
  sousTitre: "Ceux qui vous livrent : utilisés dans les commandes, les réceptions et les retours",
  icone: Truck,
  mot: { un: "fournisseur", des: "fournisseurs", le: "le fournisseur", nouveau: "Nouveau fournisseur", feminin: false },
  noteActifs: "proposés dans les commandes et réceptions",
  idKey: "id_fournisseur",
  formLarge: true,
  videNull: true,
  champs: [
    { name: "nom", label: "Nom", placeholder: "Ex. SOCOCE Grossiste", requis: true, max: 150, plein: true },
    { name: "telephone", label: "Téléphone", placeholder: "Ex. 07 07 07 07 07", type: "tel", max: 30 },
    { name: "email", label: "E-mail", placeholder: "contact@exemple.ci", type: "email", max: 150 },
    { name: "ville", label: "Ville", placeholder: "Ex. Abidjan", max: 100 },
    { name: "pays", label: "Pays", placeholder: "Ex. Côte d'Ivoire", max: 100 },
    { name: "numero_tva", label: "N° de compte contribuable", placeholder: "Si vous en avez besoin sur vos documents", max: 50, plein: true },
  ],
  colonnes: [
    {
      titre: "Contact",
      rendu: (f) => (f.telephone || f.email ? (
        <>
          {f.telephone && <a className="frn-lien" href={`tel:${f.telephone}`}>{f.telephone}</a>}
          {f.email && <a className="vt-cell-sub frn-lien" href={`mailto:${f.email}`}>{f.email}</a>}
        </>
      ) : <span className="vt-muted">-</span>),
    },
    {
      titre: "Ville",
      className: "ref-hide",
      rendu: (f) => [f.ville, f.pays].filter(Boolean).join(", ") || <span className="vt-muted">-</span>,
    },
  ],
  service: {
    lister: (t) => FournisseurService.getAllFournisseurs(t),
    creer: (t, d) => FournisseurService.createFournisseur(t, d),
    modifier: (t, id, d) => FournisseurService.updateFournisseur(t, id, d),
    supprimer: (t, id) => FournisseurService.deleteFournisseur(t, id),
    exporter: async (t) => {
      const res = await FournisseurService.exportFournisseurs(t);
      const liste = Array.isArray(res?.data) ? res.data : [];
      const lignes = [["Nom", "Téléphone", "E-mail", "Ville", "Pays", "N° contribuable", "Actif"]]
        .concat(liste.map((f) => [f.nom, f.telephone, f.email, f.ville, f.pays, f.numero_tva, f.actif ? "Oui" : "Non"]));
      return lignes.map((l) => l.map(cellule).join(";")).join("\n");
    },
  },
  statut: {
    actif: (f) => !!Number(f.actif),
    basculer: (t, f) => (Number(f.actif) ? FournisseurService.deactivateFournisseur(t, f.id_fournisseur) : FournisseurService.activateFournisseur(t, f.id_fournisseur)),
    appliquer: (f) => ({ ...f, actif: Number(f.actif) ? 0 : 1 }),
  },
  aideVide: "Ajoutez vos fournisseurs pour passer vos commandes et suivre ce que vous leur devez.",
};

const Fournisseurs = () => <Referentiel config={CONFIG} />;
export default Fournisseurs;
