'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                router.push('/dashboard');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: new Date(),
                    learningStyle: null
                });
            }
        } catch (err: any) {
            console.error("Login Error:", err);
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Welcome Back! 👋</h1>
                    <p className="mt-2 text-gray-500">Sign in to continue your learning journey.</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm text-left">
                        <p className="font-bold">Login Failed:</p>
                        <p>{error}</p>
                        {error.includes('operation-not-allowed') && (
                            <p className="mt-2 text-xs text-gray-600">
                                ⚠️ Google Sign-In is not enabled in Firebase Console.
                                Please enable it in Authentication {'->'} Sign-in method.
                            </p>
                        )}
                    </div>
                )}

                <div className="mt-8">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 hover:border-emerald-200 transition-all group"
                    >
                        {loading ? (
                            <span>Signing in...</span>
                        ) : (
                            <>
                                <svg className="w-6 h-6" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.49 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                <span>Sign in with Google</span>
                            </>
                        )}
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-center text-gray-400">
                    Adaptive Learning Platform V2
                </div>
            </div>
        </div>
    );
}
