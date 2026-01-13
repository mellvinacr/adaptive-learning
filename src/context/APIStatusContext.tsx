'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface APIStatusContextType {
    isReady: boolean;
    cooldown: number; // seconds remaining
    reportError: () => void; // Call this when a 429/Limit error occurs
    reportSuccess: () => void; // Call this when a successful call happens
}

const APIStatusContext = createContext<APIStatusContextType | undefined>(undefined);

export function APIStatusProvider({ children }: { children: ReactNode }) {
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setInterval(() => {
                setCooldown(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [cooldown]);

    const reportError = () => {
        // Trigger a 60 second cooldown on error
        setCooldown(60);
    };

    const reportSuccess = () => {
        // Optional: Could reduce cooldown if we wanted, but generally if it succeeds we are good.
        // For now, if we are in cooldown, we might not accidentally call this unless we force retry.
        // But if a call succeeds, we assume we are healthy.
        if (cooldown === 0) return;
        // setCooldown(0); // Optional behavior, maybe too aggressive if rate limit is flaky.
    };

    const value = {
        isReady: cooldown === 0,
        cooldown,
        reportError,
        reportSuccess
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
