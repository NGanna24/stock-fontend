// context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import { getErrorMessage } from '../utils/errorMessages';

const AuthContext = createContext();

export function AuthContextProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);   // ✅ NOUVEAU
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // ==================== INITIALISATION ====================
    useEffect(() => {
        const initializeAuth = () => {
            try {
                const savedToken = localStorage.getItem('token');
                const userData = localStorage.getItem('user');

                if (savedToken && userData) {
                    try {
                        const parsedUser = JSON.parse(userData);
                        setUser(parsedUser);
                        setToken(savedToken);       // ✅ NOUVEAU
                    } catch (err) {
                        console.error('❌ Erreur de chargement des données:', err);
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                    }
                } else if (savedToken && !userData) {
                    // Token présent mais user absent → corrompu
                    localStorage.removeItem('token');
                }
            } catch (err) {
                console.error("❌ Erreur lors de l'initialisation:", err);
            } finally {
                setIsInitialized(true);
            }
        };

        initializeAuth();
    }, []);

    // ==================== LOGIN ====================
    const login = async (credentials) => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post(API_URL.AUTH.LOGIN, credentials);
            console.log('Connexion réussie:', response.data);

            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                setToken(response.data.token);           // ✅ NOUVEAU
                setUser(response.data.user);
            }

            return { success: true, data: response.data };
        } catch (err) {
            console.error('❌ Erreur de connexion:', err);
            const errorMessage = getErrorMessage(err);
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // ==================== REGISTER ====================
    const register = async (userData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post(API_URL.AUTH.REGISTER, userData);
            console.log('✅ Inscription réussie:', response.data);

            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                setToken(response.data.token);           // ✅ NOUVEAU
                setUser(response.data.user);
            }

            return { success: true, data: response.data };
        } catch (err) {
            console.error("❌ Erreur d'inscription:", err);
            const errorMessage = getErrorMessage(err);
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // ==================== LOGOUT ====================
    const logout = async () => {
        setLoading(true);

        try {
            const currentToken = localStorage.getItem('token');
            if (currentToken) {
                await axios.post(
                    API_URL.AUTH.LOGOUT,
                    {},
                    { headers: { 'Authorization': `Bearer ${currentToken}` } }
                );
            }
        } catch (err) {
            console.error('❌ Erreur lors de la déconnexion:', err);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);                              // ✅ NOUVEAU
            setUser(null);
            setLoading(false);
        }
    };

    // ==================== GET PROFILE ====================
    const getProfile = async () => {
        setLoading(true);
        setError(null);

        try {
            const currentToken = localStorage.getItem('token');
            if (!currentToken) throw new Error('Non authentifié');

            const response = await axios.get(API_URL.AUTH.PROFILE, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });

            if (response.data && response.data.user) {
                setUser(response.data.user);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }

            return { success: true, data: response.data };
        } catch (err) {
            console.error('❌ Erreur de récupération du profil:', err);
            const errorMessage = getErrorMessage(err);
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // ==================== UPDATE PROFILE ====================
    const updateProfile = async (userData) => {
        setLoading(true);
        setError(null);

        try {
            const currentToken = localStorage.getItem('token');
            if (!currentToken) throw new Error('Non authentifié');

            const response = await axios.put(API_URL.AUTH.PROFILE, userData, {
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.user) {
                setUser(response.data.user);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }

            return { success: true, data: response.data };
        } catch (err) {
            console.error('❌ Erreur de mise à jour du profil:', err);
            const errorMessage = getErrorMessage(err);
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // ==================== CHANGE PASSWORD ====================
    const changePassword = async (oldPassword, newPassword) => {
        setLoading(true);
        setError(null);

        try {
            const currentToken = localStorage.getItem('token');
            if (!currentToken) throw new Error('Non authentifié');

            const response = await axios.put(
                API_URL.AUTH.CHANGE_PASSWORD,
                { oldPassword, newPassword },
                {
                    headers: {
                        'Authorization': `Bearer ${currentToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return { success: true, data: response.data };
        } catch (err) {
            console.error('❌ Erreur de changement de mot de passe:', err);
            const errorMessage = getErrorMessage(err);
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // ==================== VALEUR EXPOSÉE ====================
    const value = {
        user,
        token,                                        // ✅ NOUVEAU : LE TOKEN
        setUser,
        setToken,
        loading,
        error,
        setError,
        isAuthenticated: !!user,
        isInitialized,

        // Entrepôts + fonctionnalités
        entrepots: user?.entrepots || [],
        fonctionnalites: user?.fonctionnalites || {
            entrepot: false,
            multi_magasins: false,
            transferts: false,
        },
        refreshEntrepots: async () => await getProfile(),

        login,
        register,
        logout,
        getProfile,
        updateProfile,
        changePassword,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useUser() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useUser doit être utilisé à l'intérieur d'un AuthContextProvider");
    }
    return context;
}