// App.js
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard/Dashboard";
import Produits from "./pages/Produits/Produits";
import Categories from "./pages/Categories/Categories";
import Achats from "./pages/Approvisionnement/Achat/Achat";
import Fournisseurs from "./pages/Approvisionnement/Fournisseurs/Fournisseurs";
import Entrees from "./pages/Stock/Entrees/Entrees";
import Sorties from "./pages/Stock/Sorties/Sorties";
import Ventes from "./pages/Ventes/Ventes";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import { AuthContextProvider, useUser } from "./context/AuthContext";
import Modeles from "./pages/Model/Modeles";
import Marques from "./pages/Marques/Marques";
import Unites from "./pages/Unites/Unites";
import CommandesAchats from "./pages/Commandes/CommandesAchats";
import Receptions from "./pages/Approvisionnement/Receptions/Receptions";
import RetoursFournisseurs from "./pages/RetoursFournisseurs/RetoursFournisseurs";
import Paiements from "./pages/Paiements/Paiements";
import Factures from "./pages/Factures/Factures";
import RetoursClients from "./pages/RetoursClients/RetoursClients";
import Mouvements from "./pages/Mouvements/Mouvements";

import Clients from "./pages/Clients/Clients";
import ClientDetail from "./pages/Clients/ClientDetail";
import RapportVentes from "./pages/Rapports/RapportVentes/RapportVentes";
import RapportAchats from "./pages/Rapports/RapportAchats/RapportAchats";
import RapportStocks from "./pages/Rapports/RapportStocks/RapportStocks";
import BeneficesMarges from "./pages/BeneficesMarges/BeneficesMarges";
import Alertes from "./pages/Alertes/Alertes";
import Recettes from "./pages/Recettes/Recettes";
import MonMagasin from "./pages/Magasin/MonMagasin";
import Employes from "./pages/Employes/Employes";

import ProtectedRouteByRole from "./components/ProtectedRouteByRole";
import AssistantAchat from "./pages/AssistantAchat/AssistantAchat";
import Inventaires from "./pages/Inventaires/Inventaires";
import InventaireDetail from "./pages/Inventaires/InventaireDetail";

// ==================== COMPOSANTS UTILITAIRES ====================

// Écran de chargement
const LoadingScreen = () => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
    }}>
        <div>Chargement...</div>
    </div>
);

// Protection : connecté
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isInitialized } = useUser();

    if (!isInitialized) return <LoadingScreen />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    return children;
};

// Redirection racine → /{slug}/dashboard
const RedirectToDashboard = () => {
    const { user, isAuthenticated, isInitialized } = useUser();

    if (!isInitialized) return <LoadingScreen />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    return <Navigate to={`/${user?.slug}/dashboard`} replace />;
};

// Redirection d'une route sans slug → avec slug
const RedirectWithSlug = () => {
    const { user, isAuthenticated, isInitialized } = useUser();

    if (!isInitialized) return <LoadingScreen />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    const path = window.location.pathname;
    return <Navigate to={`/${user?.slug}${path}`} replace />;
};

// ==================== APP CONTENT ====================
function AppContent() {
    return (
        <BrowserRouter>
            <Routes>
                {/* ==================== ROUTES PUBLIQUES ==================== */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Redirection racine */}
                <Route path="/" element={<RedirectToDashboard />} />
                <Route path="/dashboard" element={<RedirectWithSlug />} />

                {/* ==================== ROUTES PROTÉGÉES ==================== */}
                <Route
                    path="/:slug"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >

                    <Route
                        path="assistant-achat"
                        element={
                            <ProtectedRouteByRole itemId="commandes-achat">
                                <AssistantAchat />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route index element={<Dashboard />} />

                    {/* ---------- Toujours accessible (connecté) ---------- */}
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="alertes" element={<Alertes />} />

                    {/* ---------- Accessibles à tous les rôles connectés ---------- */}
                    <Route
                        path="produits"
                        element={
                            <ProtectedRouteByRole itemId="produits">
                                <Produits />
                            </ProtectedRouteByRole>
                        }
                    />

                    {/* ---------- VENTES ---------- */}
                    <Route
                        path="clients"
                        element={
                            <ProtectedRouteByRole itemId="clients">
                                <Clients />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="clients/:telephone"
                        element={
                            <ProtectedRouteByRole itemId="clients">
                                <ClientDetail />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="commandes-clients"
                        element={
                            <ProtectedRouteByRole itemId="commandes-clients">
                                <Ventes />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="ventes"
                        element={
                            <ProtectedRouteByRole itemId="commandes-clients">
                                <Ventes />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="factures"
                        element={
                            <ProtectedRouteByRole itemId="factures">
                                <Factures />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="recettes"
                        element={
                            <ProtectedRouteByRole itemId="recettes">
                                <Recettes />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="retours-clients"
                        element={
                            <ProtectedRouteByRole itemId="retours-clients">
                                <RetoursClients />
                            </ProtectedRouteByRole>
                        }
                    />


                    {/* ---------- CATALOGUE & STOCK ---------- */}
                    <Route
                        path="categories"
                        element={
                            <ProtectedRouteByRole itemId="categories">
                                <Categories />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="marques"
                        element={
                            <ProtectedRouteByRole itemId="marques">
                                <Marques />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="modeles"
                        element={
                            <ProtectedRouteByRole itemId="modeles">
                                <Modeles />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="unites"
                        element={
                            <ProtectedRouteByRole itemId="unites">
                                <Unites />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="mouvements"
                        element={
                            <ProtectedRouteByRole itemId="mouvements">
                                <Mouvements />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="inventaires"
                        element={
                            <ProtectedRouteByRole itemId="inventaires">
                                <Inventaires />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="inventaires/:id"
                        element={
                            <ProtectedRouteByRole itemId="inventaires">
                                <InventaireDetail />
                            </ProtectedRouteByRole>
                        }
                    />

                    {/* ---------- APPROVISIONNEMENT ---------- */}
                    <Route
                        path="fournisseurs"
                        element={
                            <ProtectedRouteByRole itemId="fournisseurs">
                                <Fournisseurs />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="commandes-achat"
                        element={
                            <ProtectedRouteByRole itemId="commandes-achat">
                                <CommandesAchats />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="receptions"
                        element={
                            <ProtectedRouteByRole itemId="receptions">
                                <Receptions />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="retours-fournisseurs"
                        element={
                            <ProtectedRouteByRole itemId="retours-fournisseurs">
                                <RetoursFournisseurs />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="achats"
                        element={
                            <ProtectedRouteByRole itemId="commandes-achat">
                                <Achats />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="entrees"
                        element={
                            <ProtectedRouteByRole itemId="inventaires">
                                <Entrees />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="sorties"
                        element={
                            <ProtectedRouteByRole itemId="inventaires">
                                <Sorties />
                            </ProtectedRouteByRole>
                        }
                    />

                    {/* ---------- RAPPORTS ---------- */}
                    <Route
                        path="rapport-ventes"
                        element={
                            <ProtectedRouteByRole itemId="rapport-ventes">
                                <RapportVentes />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="rapport-achats"
                        element={
                            <ProtectedRouteByRole itemId="rapport-achats">
                                <RapportAchats />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="rapport-stocks"
                        element={
                            <ProtectedRouteByRole itemId="rapport-stocks">
                                <RapportStocks />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="benefices"
                        element={
                            <ProtectedRouteByRole itemId="benefices">
                                <BeneficesMarges />
                            </ProtectedRouteByRole>
                        }
                    />

                    {/* ---------- ADMINISTRATION (admin uniquement) ---------- */}
                    <Route
                        path="mon-magasin"
                        element={
                            <ProtectedRouteByRole itemId="mon-magasin">
                                <MonMagasin />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="employes"
                        element={
                            <ProtectedRouteByRole itemId="employes">
                                <Employes />
                            </ProtectedRouteByRole>
                        }
                    />
                    <Route
                        path="paiements"
                        element={
                            <ProtectedRouteByRole itemId="paiements">
                                <Paiements />
                            </ProtectedRouteByRole>
                        }
                    />

                    {/* Autres routes admin à brancher plus tard :
                        - utilisateurs → /utilisateurs
                        - roles → /roles
                        - parametres → /parametres
                    */}
                </Route>

                {/* ==================== 404 ==================== */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

// ==================== APP ====================
function App() {
    return (
        <AuthContextProvider>
            <AppContent />
        </AuthContextProvider>
    );
}

export default App;