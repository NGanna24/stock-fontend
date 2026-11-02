// context/SuperAdminAuthContext.jsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_URL from "../config/api";

const KEY_TOKEN = "miyo:superadmin-token";
const KEY_USER  = "miyo:superadmin-user";

// Les routes de l'espace super admin exigent désormais le jeton super admin.
// Les services superAdmin/* ne l'envoyaient pas : on l'ajoute ici, une seule fois,
// uniquement pour ces URL (et sans écraser un en-tête déjà fourni).
const SUPER_ADMIN_URL = /\/api\/(admin|super-admin)(\/|\?|$)/;
if (!axios.__miyoSuperAdminInterceptor) {
    axios.__miyoSuperAdminInterceptor = axios.interceptors.request.use((config) => {
        const url = config.url || "";
        if (SUPER_ADMIN_URL.test(url) && !/\/super-admin\/auth\/(login|register)/.test(url)) {
            const token = localStorage.getItem(KEY_TOKEN);
            config.headers = config.headers || {};
            const dejaLa = typeof config.headers.get === "function"
                ? config.headers.get("Authorization")
                : config.headers.Authorization;
            if (token && !dejaLa) {
                if (typeof config.headers.set === "function") config.headers.set("Authorization", `Bearer ${token}`);
                else config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    });
}

const SuperAdminAuthContext = createContext(null);

export const SuperAdminAuthProvider = ({ children }) => {
    const [superAdmin, setSuperAdmin]     = useState(null);
    const [token, setToken]               = useState(null);
    const [isAuthenticated, setIsAuth]    = useState(false);
    const [isInitialized, setIsInit]      = useState(false);

    // ---------- Persistance ----------
    const persistSession = useCallback((newToken, sa) => {
        if (newToken) {
            localStorage.setItem(KEY_TOKEN, newToken);
            setToken(newToken);
        }
        if (sa) {
            localStorage.setItem(KEY_USER, JSON.stringify(sa));
            setSuperAdmin(sa);
        }
        setIsAuth(!!newToken && !!sa);
    }, []);

    const clearSession = useCallback(() => {
        localStorage.removeItem(KEY_TOKEN);
        localStorage.removeItem(KEY_USER);
        setToken(null);
        setSuperAdmin(null);
        setIsAuth(false);
    }, []);

    // ---------- Initialisation au démarrage ----------
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const storedToken = localStorage.getItem(KEY_TOKEN);
            if (!storedToken) {
                if (!cancelled) setIsInit(true);
                return;
            }

            try {
                const res = await axios.get(API_URL.SUPER_ADMIN_AUTH.ME, {
                    headers: { Authorization: `Bearer ${storedToken}` },
                });
                if (cancelled) return;

                if (res.data?.success) {
                    setToken(storedToken);
                    setSuperAdmin(res.data.superAdmin);
                    setIsAuth(true);
                    localStorage.setItem(KEY_USER, JSON.stringify(res.data.superAdmin));
                } else {
                    clearSession();
                }
            } catch {
                if (!cancelled) clearSession();
            } finally {
                if (!cancelled) setIsInit(true);
            }
        })();
        return () => { cancelled = true; };
    }, [clearSession]);

    // ---------- LOGIN ----------
    const login = useCallback(async (identifiant, password) => {
        const res = await axios.post(API_URL.SUPER_ADMIN_AUTH.LOGIN, {
            identifiant, password,
        });
        if (res.data?.success) {
            persistSession(res.data.token, res.data.superAdmin);
        }
        return res.data;
    }, [persistSession]);

    // ---------- REGISTER ----------
    const register = useCallback(async (payload) => {
        const res = await axios.post(API_URL.SUPER_ADMIN_AUTH.REGISTER, payload);
        if (res.data?.success) {
            persistSession(res.data.token, res.data.superAdmin);
        }
        return res.data;
    }, [persistSession]);

    // ---------- LOGOUT ----------
    const logout = useCallback(async () => {
        try {
            if (token) {
                await axios.post(
                    API_URL.SUPER_ADMIN_AUTH.LOGOUT,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
        } catch {
            // on ignore, le but c'est de nettoyer le local
        } finally {
            clearSession();
        }
    }, [token, clearSession]);

    // ---------- CHANGE PASSWORD ----------
    const changePassword = useCallback(async (ancien_password, nouveau_password) => {
        const res = await axios.post(
            API_URL.SUPER_ADMIN_AUTH.CHANGE_PASSWORD,
            { ancien_password, nouveau_password },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    }, [token]);

    // ---------- Rafraîchir le profil ----------
    const refresh = useCallback(async () => {
        if (!token) return { success: false };
        try {
            const res = await axios.get(API_URL.SUPER_ADMIN_AUTH.ME, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data?.success) {
                setSuperAdmin(res.data.superAdmin);
                localStorage.setItem(KEY_USER, JSON.stringify(res.data.superAdmin));
            }
            return res.data;
        } catch (e) {
            clearSession();
            throw e;
        }
    }, [token, clearSession]);

    const value = useMemo(() => ({
        superAdmin,
        token,
        isAuthenticated,
        isInitialized,
        login,
        register,
        logout,
        changePassword,
        refresh,
    }), [superAdmin, token, isAuthenticated, isInitialized, login, register, logout, changePassword, refresh]);

    return (
        <SuperAdminAuthContext.Provider value={value}>
            {children}
        </SuperAdminAuthContext.Provider>
    );
};

// ---------- Hook ----------
export const useSuperAdmin = () => {
    const ctx = useContext(SuperAdminAuthContext);
    if (!ctx) {
        throw new Error("useSuperAdmin doit être utilisé dans <SuperAdminAuthProvider>");
    }
    return ctx;
};

export default SuperAdminAuthContext;