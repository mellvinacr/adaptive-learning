'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isLogin, setIsLogin] = useState(true);

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');

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
            await createUserDocument(user);
        } catch (err: any) {
            console.error("Login Error:", err);
            handleAuthError(err);
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                // Auth state listener will handle redirect
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Update profile with display name
                if (displayName) {
                    await updateProfile(user, {
                        displayName: displayName
                    });
                }

                await createUserDocument(user, displayName);
            }
        } catch (err: any) {
            console.error("Auth Error:", err);
            handleAuthError(err);
            setLoading(false);
        }
    };

    const createUserDocument = async (user: any, nameOverride?: string) => {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                email: user.email,
                displayName: nameOverride || user.displayName,
                photoURL: user.photoURL,
                createdAt: new Date(),
                learningStyle: null
            });
        }
    };

    const handleAuthError = (err: any) => {
        let message = err.message;
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
            message = 'Invalid email or password.';
        } else if (err.code === 'auth/user-not-found') {
            message = 'No account found with this email.';
        } else if (err.code === 'auth/email-already-in-use') {
            message = 'Email is already registered.';
        } else if (err.code === 'auth/weak-password') {
            message = 'Password should be at least 6 characters.';
        }
        setError(message);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">
                        {isLogin ? 'Welcome Back! 👋' : 'Create Account 🚀'}
                    </h1>
                    <p className="mt-2 text-gray-500">
                        {isLogin ? 'Sign in to continue your learning journey.' : 'Start your adaptive learning journey today.'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm text-left">
                        <p className="font-bold">Error:</p>
                        <p>{error}</p>
                        {error.includes('operation-not-allowed') && (
                            <p className="mt-2 text-xs text-gray-600">
                                ⚠️ Google Sign-In is not enabled in Firebase Console.
                                Please enable it in Authentication {'->'} Sign-in method.
                            </p>
                        )}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Manual Auth Form */}
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="John Doe"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Or continue with</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        type="button"
                        className="w-full flex items-center justify-center gap-3 px-6 py-2.5 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 hover:border-emerald-200 transition-all group"
                    >
                        {loading && !email ? (
                            <span>Signing in...</span>
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                                <span>Google</span>
                            </>
                        )}
                    </button>

                    <div className="text-center mt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                                setEmail('');
                                setPassword('');
                            }}
                            className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                        >
                            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-center text-gray-400">
                    MathFlow V2
                </div>
            </div>
        </div>
    );
}
