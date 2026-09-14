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
import InventaireDetail from "./pages/Inventaires/Inventaires";
import Inventaires from "./pages/Inventaires/Inventaires"; 
import Clients from "./pages/Clients/Clients";
import ClientDetail from "./pages/Clients/ClientDetail";
import RapportVentes from "./pages/Rapports/RapportVentes/RapportVentes";
import RapportAchats from "./pages/Rapports/RapportAchats/RapportAchats";
import RapportStocks from "./pages/Rapports/RapportStocks/RapportStocks";
import BeneficesMarges from "./pages/BeneficesMarges/BeneficesMarges";
import Alertes from "./pages/Alertes/Alertes";
import Recettes from "./pages/Recettes/Recettes";


// Composant de chargement
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

// Composant de protection des routes
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isInitialized } = useUser();
    
    if (!isInitialized) {
        return <LoadingScreen />;
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    
    return children;
};

// Composant de redirection vers dashboard avec slug
const RedirectToDashboard = () => {
    const { user, isAuthenticated, isInitialized } = useUser();
    
    if (!isInitialized) {
        return <LoadingScreen />;
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    
    return <Navigate to={`/${user?.slug}/dashboard`} replace />;
};

// Composant de redirection pour les routes sans slug
const RedirectWithSlug = () => {
    const { user, isAuthenticated, isInitialized } = useUser();
    
    if (!isInitialized) {
        return <LoadingScreen />;
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    
    // Récupérer le chemin actuel sans le slug
    const path = window.location.pathname;
    // Rediriger vers la même route mais avec le slug
    return <Navigate to={`/${user?.slug}${path}`} replace />;
};

// Composant principal
function AppContent() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Routes publiques */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
                {/* Redirection racine */}
                <Route path="/" element={<RedirectToDashboard />} />
                
                {/* Redirection pour /dashboard sans slug */}
                <Route path="/dashboard" element={<RedirectWithSlug />} />
                
                {/* Routes protégées avec slug */}
                <Route 
                    path="/:slug" 
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Dashboard />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="produits" element={<Produits />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="modeles" element={<Modeles />} />
                    <Route path="marques" element={<Marques />} />
                    <Route path="Unites" element={<Unites />} />
                    <Route path="achats" element={<Achats />} />
                    <Route path="fournisseurs" element={<Fournisseurs />} />
                    <Route path="entrees" element={<Entrees />} />
                    <Route path="sorties" element={<Sorties />} />
                    <Route path="ventes" element={<Ventes />} />
                    <Route path="commandes-achat" element={<CommandesAchats />} />
                    <Route path="receptions" element={<Receptions />} />
                    <Route path="retours-fournisseurs" element={<RetoursFournisseurs />} />
                    <Route path="commandes-clients" element={<Ventes />} />
                    <Route path="paiements" element={<Paiements />} />
                    <Route path="factures" element={<Factures />} />
                    <Route path="retours-fournisseurs" element={<RetoursFournisseurs />} />
                    <Route path="retours-clients" element={<RetoursClients />} />
                    <Route path="mouvements" element={<Mouvements />} />
                    <Route path="inventaires" element={<Inventaires />} />
                    <Route path="inventaires/:id" element={<InventaireDetail />} />   
                    <Route path="clients" element={<Clients />} />
                    <Route path="clients/:telephone" element={<ClientDetail />} /> 
                    <Route path="rapport-ventes" element={<RapportVentes />} /> 
                    <Route path="rapport-achats" element={<RapportAchats />} /> 
                    <Route path="rapport-stocks" element={<RapportStocks />} /> 
                    <Route path="benefices" element={<BeneficesMarges />} /> 
                    <Route path="alertes" element={<Alertes />} /> 
                    <Route path="recettes" element={<Recettes />} /> 
                                    
                </Route>
                
                {/* Route 404 */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

// Wrapper avec le contexte
function App() {
    return (
        <AuthContextProvider>
            <AppContent />
        </AuthContextProvider>
    );
}

export default App;