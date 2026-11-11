// layouts/DashboardLayout.jsx
import { Outlet } from "react-router-dom"; // Important !
import Sidebar from "../components/Dashboard/Sidebar/Sidebar";
import Header from "../components/Dashboard/Header/Header";
import HorsLigne from "../components/HorsLigne/HorsLigne";
import VerrouSession from "../components/Session/VerrouSession";
import RappelAbonnement from "../components/Abonnement/RappelAbonnement";
import { useEffect } from "react";
import { chargerReglagesDocuments } from "../config/documents";
import axios from "axios";
import API_URL from "../config/api";
import { useUser } from "../context/AuthContext";
import "./DashboardLayout.css";

const DashboardLayout = () => {
  // Cachets et modèle de facture prêts avant toute impression
  useEffect(() => { chargerReglagesDocuments(); }, []);

  // Photo de profil à jour (changée sur un autre appareil, ou session ouverte avant les photos)
  const { updateUser } = useUser();
  useEffect(() => {
    const jeton = localStorage.getItem("token");
    if (!jeton) return;
    axios.get(API_URL.AUTH.PROFILE, { headers: { Authorization: `Bearer ${jeton}` } })
      .then((r) => { if (r.data?.success && r.data.user) updateUser({ photo_url: r.data.user.photo_url || null }); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <Header />
        <HorsLigne />
        <VerrouSession />
        <RappelAbonnement />
        <main className="dashboard-content">
          <Outlet /> {/* Remplacer {children} par Outlet */}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;