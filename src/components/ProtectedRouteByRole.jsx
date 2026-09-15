// src/components/ProtectedRouteByRole.jsx
import { Navigate, useParams } from "react-router-dom";
import { useUser } from "../context/AuthContext";
import { hasAccess } from "../config/rolePermissions";

const ProtectedRouteByRole = ({ itemId, children }) => {
    const { user } = useUser();
    const { slug } = useParams();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!hasAccess(user.role, itemId)) {
        // Redirection vers le dashboard de l'utilisateur
        return <Navigate to={`/${slug}/dashboard`} replace />;
    }

    return children;
};

export default ProtectedRouteByRole;