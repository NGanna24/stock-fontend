// components/StockSelector/StockInputWithSelector.jsx
// ------------------------------------------------------------
// Saisie d'une quantité de stock dans plusieurs unités à la fois :
//   [ 10 ] Carton ×12
//   [  4 ] Pièce
//   = 124 Pièces
// Une case par unité (de la plus grande à l'unité de base). Le parent reçoit
// toujours le total en UNITÉ DE BASE, sous la forme d'un faux événement
// { target: { name, value } } comme un champ classique.
// Avant : un seul champ + une liste pour choisir l'unité, impossible de saisir
// « 10 cartons et 4 pièces » sans faire le calcul soi-même.
// ------------------------------------------------------------
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./StockSelector.css";

const capitalize = (s) => {
  const t = String(s || "").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
};

/** Unités de saisie, de la plus grande à l'unité de base (sans doublon de taille). */
function unitesDeSaisie(unitesVente, uniteBase) {
  const vues = new Set([1]);
  const grandes = (unitesVente || [])
    .filter((u) => u && u.nom && Number(u.quantite_base) > 1)
    .map((u) => ({ cle: `u${u.id_unite_vente ?? u.nom}`, nom: u.nom, qb: Number(u.quantite_base) }))
    .filter((u) => (vues.has(u.qb) ? false : vues.add(u.qb)))
    .sort((a, b) => b.qb - a.qb);
  return [...grandes, { cle: "base", nom: uniteBase?.nom || "Unité", qb: 1 }];
}

function decomposer(total, unites) {
  let reste = Math.max(0, Number(total) || 0);
  const parts = {};
  unites.forEach((u, i) => {
    const derniere = i === unites.length - 1;
    const n = derniere ? Math.round(reste * 1000) / 1000 : Math.floor(reste / u.qb + 1e-9);
    parts[u.cle] = n ? String(n) : "";
    reste -= n * u.qb;
  });
  return parts;
}

const totalDe = (parts, unites) => unites.reduce((s, u) => s + (parseFloat(String(parts[u.cle] || "").replace(",", ".")) || 0) * u.qb, 0);
const estVide = (parts, unites) => unites.every((u) => !String(parts[u.cle] ?? "").trim());
const arrondi = (n) => Math.round(n * 1000) / 1000;

const StockInputWithSelector = ({
  value,               // valeur en UNITÉ DE BASE (venant du parent)
  onChange,            // (e) => parent met à jour son formulaire
  name = "quantite_stock",
  unitesVente = [],
  uniteBase = null,
  disabled = false,
  placeholder = "0",
}) => {
  const unites = useMemo(() => unitesDeSaisie(unitesVente, uniteBase), [unitesVente, uniteBase]);
  const [parts, setParts] = useState(() => (Number(value) ? decomposer(value, unites) : {}));
  const dernierEnvoi = useRef(null);

  // Valeur changée par le parent (ouverture d'une fiche, autre produit) ou unités modifiées :
  // on redécompose, sauf si c'est la valeur qu'on vient nous-mêmes d'envoyer.
  const signature = unites.map((u) => `${u.cle}:${u.qb}`).join("|");
  const signaturePrec = useRef(signature);
  useEffect(() => {
    const v = value === "" || value === null || value === undefined ? "" : String(arrondi(Number(value) || 0));
    const memesUnites = signaturePrec.current === signature;
    signaturePrec.current = signature;
    if (memesUnites && v === dernierEnvoi.current) return;
    dernierEnvoi.current = null;
    setParts(v === "" || Number(v) === 0 ? {} : decomposer(v, unites));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, signature]);

  const changer = (cle, brut) => {
    const propre = String(brut).replace(/[^0-9.,]/g, "");
    const p = { ...parts, [cle]: propre };
    setParts(p);
    const v = estVide(p, unites) ? "" : String(arrondi(totalDe(p, unites)));
    dernierEnvoi.current = v;
    onChange?.({ target: { name, value: v } });
  };

  const total = totalDe(parts, unites);
  const plusieurs = unites.length > 1;
  const nomBase = capitalize(uniteBase?.nom || "Unité");

  return (
    <div className="siu">
      {unites.map((u, i) => (
        <label key={u.cle} className="siu-ligne">
          <input
            type="text"
            inputMode="decimal"
            name={i === 0 ? name : undefined}
            className="siu-champ"
            value={parts[u.cle] ?? ""}
            onChange={(e) => changer(u.cle, e.target.value)}
            placeholder={i === unites.length - 1 || !plusieurs ? placeholder : "0"}
            disabled={disabled}
            aria-label={`Nombre de ${u.nom}`}
          />
          <span className="siu-unite">
            {capitalize(u.nom)}
            {u.qb > 1 && <small> ×{u.qb}</small>}
          </span>
        </label>
      ))}
      {plusieurs && total > 0 && (
        <small className="siu-total">= {arrondi(total)} {nomBase}</small>
      )}
    </div>
  );
};

export default StockInputWithSelector;
