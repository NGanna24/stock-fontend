// components/FeatureGate/FeatureGate.jsx
import { useUser } from '../../context/AuthContext';

export default function FeatureGate({ feature, fallback = null, children }) {
    const { fonctionnalites } = useUser();
    if (!fonctionnalites?.[feature]) return fallback;
    return children;
}