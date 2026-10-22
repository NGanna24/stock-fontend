// components/SuperAdminRoute.jsx
import { Navigate } from "react-router-dom";
import { useSuperAdmin } from "../context/SuperAdminAuthContext";

const SuperAdminRoute = ({ children }) => {
    const { isAuthenticated, isInitialized } = useSuperAdmin();

    if (!isInitialized) {
        return (
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: "100vh", color: "#666", fontSize: 15
            }}>
                Vérification…
            </div>
        );
    }

    if (!isAuthenticated) return <Navigate to="/super-admin/login" replace />;

    return children;
};

export default SuperAdminRoute;