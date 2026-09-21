// context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';

// 1. Créer le Context
const AuthContext = createContext();

// 2. Créer le Provider
export function AuthContextProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false); // ✅ AJOUTÉ

    // Vérifier si l'utilisateur est déjà connecté au chargement
    useEffect(() => {
        const initializeAuth = () => { 
            try {
                const token = localStorage.getItem('token');
                const userData = localStorage.getItem('user');
                
                if (token && userData) {
                    try {
                        const parsedUser = JSON.parse(userData);
                        setUser(parsedUser);
                    } catch (error) {
                        console.error('❌ Erreur de chargement des données:', error);
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                    }
                }
            } catch (error) {
                console.error('❌ Erreur lors de l\'initialisation:', error);
            } finally {
                setIsInitialized(true); // ✅ MARQUER COMME INITIALISÉ
            }
        };

        initializeAuth();
    }, []);

    // ==================== FONCTION DE CONNEXION ====================
    const login = async (credentials) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await axios.post(API_URL.AUTH.LOGIN, credentials);
            
            console.log('Connexion réussie:', response.data);
            
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                setUser(response.data.user);
            }
            
            return { success: true, data: response.data };
            
        } catch (err) {
            console.error('❌ Erreur de connexion:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Erreur de connexion';
            setError(errorMessage);
            return { success: false, error: errorMessage };
            
        } finally {
            setLoading(false);
        }
    };

    // ==================== FONCTION D'INSCRIPTION ====================
    const register = async (userData) => {
        setLoading(true); 
        setError(null);
        
        try {
            const response = await axios.post(API_URL.AUTH.REGISTER, userData);
            
            console.log('✅ Inscription réussie:', response.data);
            
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                setUser(response.data.user);
            }
            
            return { success: true, data: response.data };
            
        } catch (err) {
            console.error('❌ Erreur d\'inscription:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Erreur d\'inscription';
            setError(errorMessage);
            return { success: false, error: errorMessage };
            
        } finally {
            setLoading(false);
        }
    };

    // ==================== FONCTION DE DÉCONNEXION ====================
    const logout = async () => {
        setLoading(true);
        
        try {
            const token = localStorage.getItem('token');
            
            if (token) {
                await axios.post(
                    API_URL.AUTH.LOGOUT,
                    {},
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );
            }
            
        } catch (err) {
            console.error('❌ Erreur lors de la déconnexion:', err);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setLoading(false);
        }
    };

    // ==================== RÉCUPÉRER LE PROFIL ====================
    const getProfile = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                throw new Error('Non authentifié');
            }
            
            const response = await axios.get(API_URL.AUTH.PROFILE, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.data && response.data.user) {
                setUser(response.data.user);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            
            return { success: true, data: response.data };
            
        } catch (err) {
            console.error('❌ Erreur de récupération du profil:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Erreur de profil';
            setError(errorMessage);
            return { success: false, error: errorMessage };
            
        } finally {
            setLoading(false);
        }
    };

    // ==================== METTRE À JOUR LE PROFIL ====================
    const updateProfile = async (userData) => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                throw new Error('Non authentifié');
            }
            
            const response = await axios.put(API_URL.AUTH.PROFILE, userData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
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
            const errorMessage = err.response?.data?.message || err.message || 'Erreur de mise à jour';
            setError(errorMessage);
            return { success: false, error: errorMessage };
            
        } finally {
            setLoading(false);
        }
    };

    // ==================== CHANGER LE MOT DE PASSE ====================
    const changePassword = async (oldPassword, newPassword) => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                throw new Error('Non authentifié');
            }
            
            const response = await axios.put(
                API_URL.AUTH.CHANGE_PASSWORD,
                { oldPassword, newPassword },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            return { success: true, data: response.data };
            
        } catch (err) {
            console.error('❌ Erreur de changement de mot de passe:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Erreur de changement';
            setError(errorMessage);
            return { success: false, error: errorMessage };
            
        } finally {
            setLoading(false);
        }
    };

    // ==================== VALEURS À PARTAGER ====================
    const value = {
        user,
        setUser,
        loading,
        error,
        setError,
        isAuthenticated: !!user,
        isInitialized, // ✅ AJOUTÉ
        login,
        register,
        logout,
        getProfile,
        updateProfile,
        changePassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// 3. Hook personnalisé pour utiliser le Context
export function useUser() {
    const context = useContext(AuthContext);
    
    if (!context) {
        throw new Error("useUser doit être utilisé à l'intérieur d'un AuthContextProvider");
    }
    
    return context;
}