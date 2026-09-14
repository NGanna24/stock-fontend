// hooks/useAlertSound.js
import { useCallback, useRef, useEffect, useState } from 'react';

const useAlertSound = () => {
    const audioContextRef = useRef(null);
    const [isReady, setIsReady] = useState(false);

    // ✅ Ref pour l'intervalle (permet de stopper le son)
    const loopIntervalRef = useRef(null);

    // ========== INITIALISER LE CONTEXTE AUDIO ==========
    const initAudio = useCallback(async () => {
        if (audioContextRef.current) {
            if (audioContextRef.current.state === 'suspended') {
                try {
                    await audioContextRef.current.resume();
                } catch (e) {
                    console.warn('⚠️ Impossible de reprendre le contexte audio:', e);
                }
            }
            setIsReady(true);
            return true;
        }

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                console.warn('⚠️ Web Audio API non supportée');
                return false;
            }

            audioContextRef.current = new AudioContext();

            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            setIsReady(true);
            console.log('🔊 Contexte audio initialisé avec succès');
            return true;
        } catch (e) {
            console.warn('⚠️ Erreur initialisation audio:', e);
            return false;
        }
    }, []);

    // ========== NETTOYAGE ==========
    useEffect(() => {
        return () => {
            // Stop la boucle à l'unmount
            if (loopIntervalRef.current) {
                clearInterval(loopIntervalRef.current);
                loopIntervalRef.current = null;
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(() => {});
            }
        };
    }, []);

    // ========== JOUER UN BIP ==========
    const playBeep = useCallback(async (frequency = 800, duration = 0.2, type = 'sine') => {
        if (!audioContextRef.current) {
            const ok = await initAudio();
            if (!ok) return false;
        }

        const ctx = audioContextRef.current;
        if (!ctx) return false;

        if (ctx.state === 'suspended') {
            try {
                await ctx.resume();
            } catch (e) {
                return false;
            }
        }

        try {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + duration - 0.01);
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
            return true;
        } catch (e) {
            console.error('❌ Erreur lecture bip:', e);
            return false;
        }
    }, [initAudio]);

    // ========== AVERTISSEMENT (2 BIPS GRAVES) ==========
    const playWarning = useCallback(async () => {
        const ok = await playBeep(440, 0.3, 'triangle');
        if (ok) {
            setTimeout(() => playBeep(440, 0.3, 'triangle'), 400);
        }
    }, [playBeep]);

    // ========== CRITIQUE (4 BIPS AIGUS) ==========
    const playCritical = useCallback(async () => {
        const ok = await playBeep(1200, 0.1, 'square');
        if (ok) {
            setTimeout(() => playBeep(1200, 0.1, 'square'), 150);
            setTimeout(() => playBeep(1200, 0.1, 'square'), 300);
            setTimeout(() => playBeep(1200, 0.1, 'square'), 450);
        }
    }, [playBeep]);

    // ========== SUCCÈS ==========
    const playSuccess = useCallback(async () => {
        const ok = await playBeep(660, 0.15);
        if (ok) {
            setTimeout(() => playBeep(880, 0.2), 180);
        }
    }, [playBeep]);

    // ============================================================
    // ✅ NOUVEAU : BOUCLE D'ALERTE
    // ============================================================
    /**
     * Démarre une boucle de bips répétés.
     * @param {string} type - 'warning' ou 'critical'
     * @param {number} intervalMs - Intervalle entre chaque bip (défaut: 5000ms = 5s)
     */
    const startAlertLoop = useCallback((type = 'warning', intervalMs = 5000) => {
        // ✅ Stop toute boucle existante d'abord
        if (loopIntervalRef.current) {
            clearInterval(loopIntervalRef.current);
            loopIntervalRef.current = null;
        }

        console.log(`🔔 Démarrage boucle sonore (${type}, toutes les ${intervalMs}ms)`);

        // ✅ Jouer immédiatement le premier son
        const playOnce = () => {
            if (type === 'critical') {
                playCritical();
            } else {
                playWarning();
            }
        };

        playOnce();

        // ✅ Répéter à intervalle régulier
        loopIntervalRef.current = setInterval(() => {
            playOnce();
        }, intervalMs);
    }, [playCritical, playWarning]);

    /**
     * Arrête la boucle de bips.
     */
    const stopAlertLoop = useCallback(() => {
        if (loopIntervalRef.current) {
            clearInterval(loopIntervalRef.current);
            loopIntervalRef.current = null;
            console.log('🔇 Boucle sonore arrêtée');
        }
    }, []);

    return {
        initAudio,
        isReady,
        playBeep,
        playWarning,
        playCritical,
        playSuccess,
        startAlertLoop,  
        stopAlertLoop     
    };
};

export default useAlertSound;