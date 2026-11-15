// components/Plateforme/EtatPlateforme.jsx
// Ce que le Super Admin décide pour toute la plateforme, vu par les patrons :
// - maintenance : écran qui remplace Miyo avec le message choisi
// - annonce : bandeau en haut de l'application (chaque patron peut le fermer)
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Wrench, Megaphone, AlertTriangle, X, RefreshCw } from "lucide-react";
import API_URL from "../../config/api";
import "./EtatPlateforme.css";

const CLE_FERMEE = "miyo:annonce-fermee";
const INTERVALLE_MS = 3 * 60 * 1000;
const EVENEMENT = "miyo:maintenance";

// Toute réponse « maintenance » de l'API affiche l'écran tout de suite
let intercepteur = false;
function installerIntercepteur() {
  if (intercepteur) return;
  intercepteur = true;
  axios.interceptors.response.use((r) => r, (err) => {
    const d = err?.response?.data;
    if (err?.response?.status === 503 && d?.maintenance) {
      window.dispatchEvent(new CustomEvent(EVENEMENT, { detail: { active: true, message: d.message, fin_prevue: d.fin_prevue } }));
    }
    return Promise.reject(err);
  });
}

const retourLisible = (s) => {
  if (!s) return null;
  const d = new Date(String(s).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
};

export default function EtatPlateforme() {
  const [maintenance, setMaintenance] = useState(null);
  const [annonce, setAnnonce] = useState(null);
  const [fermee, setFermee] = useState(() => {
    try { return localStorage.getItem(CLE_FERMEE); } catch { return null; }
  });
  const [verif, setVerif] = useState(false);

  const charger = useCallback(async () => {
    setVerif(true);
    try {
      const r = await axios.get(API_URL.PLATEFORME_ETAT, { timeout: 15000 });
      setMaintenance(r.data?.maintenance?.active ? r.data.maintenance : null);
      setAnnonce(r.data?.annonce || null);
    } catch {
      /* hors ligne : on garde ce qu'on sait */
    } finally {
      setVerif(false);
    }
  }, []);

  useEffect(() => {
    installerIntercepteur();
    charger();
    const t = setInterval(charger, INTERVALLE_MS);
    const surEvenement = (e) => setMaintenance(e.detail);
    const surRetour = () => { if (document.visibilityState === "visible") charger(); };
    window.addEventListener(EVENEMENT, surEvenement);
    document.addEventListener("visibilitychange", surRetour);
    return () => {
      clearInterval(t);
      window.removeEventListener(EVENEMENT, surEvenement);
      document.removeEventListener("visibilitychange", surRetour);
    };
  }, [charger]);

  // Pendant la maintenance on revérifie plus souvent pour rouvrir dès que c'est fini
  useEffect(() => {
    if (!maintenance) return undefined;
    const t = setInterval(charger, 30000);
    return () => clearInterval(t);
  }, [maintenance, charger]);

  const fermer = () => {
    setFermee(String(annonce.id));
    try { localStorage.setItem(CLE_FERMEE, String(annonce.id)); } catch { /* rien */ }
  };

  const retour = retourLisible(maintenance?.fin_prevue);

  return (
    <>
      {annonce && String(annonce.id) !== fermee && !maintenance && (
        <div className={`ep-annonce ${annonce.niveau === "important" ? "is-important" : ""}`} role="status">
          {annonce.niveau === "important" ? <AlertTriangle size={18} /> : <Megaphone size={18} />}
          <div className="ep-annonce-texte">
            {annonce.titre && <strong>{annonce.titre}</strong>}
            <span>{annonce.message}</span>
          </div>
          <button type="button" className="ep-annonce-fermer" onClick={fermer} aria-label="Fermer l'annonce" title="Fermer">
            <X size={16} />
          </button>
        </div>
      )}

      {maintenance && (
        <div className="ep-maintenance" role="alertdialog" aria-modal="true" aria-labelledby="ep-maint-titre">
          <div className="ep-maintenance-carte">
            <span className="ep-maintenance-icone"><Wrench size={30} /></span>
            <h2 id="ep-maint-titre">Miyo est en maintenance</h2>
            <p>{maintenance.message}</p>
            {retour && <p className="ep-maintenance-retour">Retour prévu : {retour}</p>}
            <p className="ep-maintenance-note">Tes données sont en sécurité. Miyo se rouvre tout seul dès que la maintenance est terminée.</p>
            <button type="button" className="ep-maintenance-btn" onClick={charger} disabled={verif}>
              <RefreshCw size={16} className={verif ? "ep-tourne" : ""} /> {verif ? "Vérification…" : "Vérifier maintenant"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
