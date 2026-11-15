// src/components/ProtectedRouteByRole.jsx
import { Navigate, useParams } from "react-router-dom";
import { useUser } from "../context/AuthContext";
import { hasAccess, usePermissions } from "../config/rolePermissions";

// proprietaire : page réservée au propriétaire (Employés, Rôles et permissions…)
const ProtectedRouteByRole = ({ itemId, proprietaire = false, children }) => {
    const { user } = useUser();
    const { slug } = useParams();
    usePermissions(user?.role); // se remet à jour si le propriétaire change les droits

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (proprietaire ? user.role !== "admin" : !hasAccess(user.role, itemId)) {
        // Redirection vers le dashboard de l'utilisateur
        return <Navigate to={`/${slug}/dashboard`} replace />;
    }

    return children;
};

export default ProtectedRouteByRole;