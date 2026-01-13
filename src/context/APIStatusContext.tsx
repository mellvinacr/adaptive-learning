'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface APIStatusContextType {
    isReady: boolean;
    cooldown: number;
    isOfflineMode: boolean; // When API quota is exceeded
    reportError: () => void;
    reportSuccess: () => void;
    checkQuotaRecovery: () => Promise<void>;
}

const APIStatusContext = createContext<APIStatusContextType | undefined>(undefined);

export function APIStatusProvider({ children }: { children: ReactNode }) {
    const [cooldown, setCooldown] = useState(0);
    const [isOfflineMode, setIsOfflineMode] = useState(false);

    // Cooldown timer
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setInterval(() => {
                setCooldown(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [cooldown]);

    // Quota Recovery Poller - Check every 10 minutes
    const checkQuotaRecovery = useCallback(async () => {
        if (!isOfflineMode) return;

        try {
            // Lightweight test call to check if quota restored
            const res = await fetch('/api/adaptive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: 'test',
                    mode: 'WELCOME',
                    topic: 'test',
                    style: 'VISUAL'
                })
            });

            const data = await res.json();
            if (!data.isOffline) {
                console.log('🎉 [Quota] API recovered! Exiting offline mode.');
                setIsOfflineMode(false);
                setCooldown(0);
            }
        } catch (e) {
            // Still offline
        }
    }, [isOfflineMode]);

    useEffect(() => {
        if (isOfflineMode) {
            // Poll every 10 minutes (600000ms)
            const poller = setInterval(checkQuotaRecovery, 600000);
            return () => clearInterval(poller);
        }
    }, [isOfflineMode, checkQuotaRecovery]);

    const reportError = () => {
        setCooldown(60);
        setIsOfflineMode(true);
    };

    const reportSuccess = () => {
        if (isOfflineMode) {
            setIsOfflineMode(false);
        }
    };

    const value = {
        isReady: cooldown === 0 && !isOfflineMode,
        cooldown,
        isOfflineMode,
        reportError,
        reportSuccess,
        checkQuotaRecovery
    };

    return (
        <APIStatusContext.Provider value={value}>
            {children}
        </APIStatusContext.Provider>
    );
}

export function useAPIStatus() {
    const context = useContext(APIStatusContext);
    if (context === undefined) {
        throw new Error('useAPIStatus must be used within an APIStatusProvider');
    }
    return context;
}

