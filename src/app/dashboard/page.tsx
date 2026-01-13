'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, getDoc, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import LearningInterface from '@/components/LearningInterface';
import StatisticDetail from '@/components/StatisticDetail';
import TopicMastery from '@/components/TopicMastery';
import { useAPIStatus } from '@/context/APIStatusContext';

export default function DashboardPage() {
    const router = useRouter();
    const { isReady, cooldown } = useAPIStatus();

    // View States: 
    // 'DASHBOARD' (Home), 'TOPIC_MASTER', 'LEARNING' are main logic flows.
    // 'VAULT', 'STATS', 'PROFILE' are secondary dashboard tabs.
    const [view, setView] = useState<'DASHBOARD' | 'TOPIC_MASTER' | 'LEARNING' | 'VAULT' | 'STATS' | 'PROFILE'>('DASHBOARD');

    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [playLevel, setPlayLevel] = useState(1); // Track specific level being played
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    // Real-time Data States
    const [xp, setXp] = useState(0);
    const [streak, setStreak] = useState(0);
    const [badgesCount, setBadgesCount] = useState(0);
    const [chartData, setChartData] = useState<any[]>([]);
    const [topicProgress, setTopicProgress] = useState<{ [key: string]: number }>({});
    const [lastActiveSession, setLastActiveSession] = useState<any>(null);
    // Topic-Based Progress: { aljabar: 3, trigonometri: 1 }
    const [topicLevels, setTopicLevels] = useState<{ [key: string]: number }>({});
    const [showAIHelp, setShowAIHelp] = useState(false);

    // Style Selection Logic
    const [showStyleModal, setShowStyleModal] = useState(false);
    const [pendingTopic, setPendingTopic] = useState<string | null>(null);
    const [pendingLevel, setPendingLevel] = useState<number>(1);
    const [sessionStyle, setSessionStyle] = useState<string>('VISUAL');

    const TOPICS = [
        { id: 'aljabar', name: 'ALJABAR', icon: '➗', color: 'text-blue-500' },
        { id: 'trigonometri', name: 'TRIGONOMETRI', icon: '📐', color: 'text-indigo-500' },
        { id: 'geometri', name: 'GEOMETRI', icon: '🛑', color: 'text-rose-500' },
        { id: 'statistika', name: 'STATISTIKA', icon: '📊', color: 'text-amber-500' },
        { id: 'kalkulus', name: 'KALKULUS', icon: '∫', color: 'text-emerald-500' },
        { id: 'logika', name: 'LOGIKA', icon: '💡', color: 'text-violet-500' },
    ];

    // -------------------------------------------------------------
    // REAL-TIME DATA FETCHING WITH onSnapshot
    // -------------------------------------------------------------
    useEffect(() => {
        let unsubProfile: (() => void) | null = null;
        let unsubSessions: (() => void) | null = null;
        let unsubBadges: (() => void) | null = null;

        const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setLoading(true);

                // 1. Real-time Profile Listener
                const profileRef = doc(db, 'users', currentUser.uid);
                unsubProfile = onSnapshot(profileRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setProfile(data);
                        // Merge profile progress if exists
                        if (data.progress) {
                            setTopicLevels(prev => ({ ...prev, ...data.progress }));
                        }
                    }
                });

                // 2. Real-time Sessions Listener (for XP, Streak, Progress)
                const sessionsQuery = query(
                    collection(db, 'users', currentUser.uid, 'sessions'),
                    orderBy('timestamp', 'desc')
                );
                unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
                    const history = snapshot.docs.map(doc => {
                        const d = doc.data();
                        return {
                            id: doc.id,
                            ...d,
                            date: d.timestamp?.toDate ? d.timestamp.toDate() : new Date(d.timestamp || Date.now())
                        };
                    });

                    // Calculate XP
                    let totalXp = 0;
                    const maxLevelMap: { [topic: string]: number } = {};
                    const uniqueDays = new Set<string>();

                    TOPICS.forEach(t => maxLevelMap[t.id] = 0);

                    history.forEach((sess: any) => {
                        const sessionXp = (sess.score || 0) * 10;
                        const levelUpBonus = sess.decision === 'NEXT_LEVEL' ? 50 : 0;
                        // Special Bonus for Kinesthetic (Interactive Effort)
                        const styleBonus = sess.learningStyle === 'KINESTHETIC' ? 20 : 0;

                        totalXp += sessionXp + levelUpBonus + styleBonus;

                        // Progress tracking
                        if (sess.decision === 'NEXT_LEVEL' && sess.level && sess.topic) {
                            if (!maxLevelMap[sess.topic] || sess.level > maxLevelMap[sess.topic]) {
                                maxLevelMap[sess.topic] = sess.level;
                            }
                        }

                        // Streak tracking
                        if (sess.date) {
                            try {
                                const dateStr = sess.date.toISOString().split('T')[0];
                                uniqueDays.add(dateStr);
                            } catch (e) { /* ignore invalid dates */ }
                        }
                    });

                    setXp(totalXp);

                    // Merge session-calculated levels with existing state (from profile)
                    // Priority: Max(Profile, SessionCalc, 1)
                    setTopicLevels(prev => {
                        const newLevels = { ...prev };
                        Object.keys(maxLevelMap).forEach(k => {
                            // If maxLevelMap[k] is the COMPLETED level, then current level is +1
                            const completedLvl = maxLevelMap[k] || 0;
                            newLevels[k] = Math.max(newLevels[k] || 1, completedLvl + 1);
                        });
                        return newLevels;
                    });

                    // Progress Map %
                    const progressMap: { [key: string]: number } = {};
                    Object.keys(maxLevelMap).forEach(key => {
                        progressMap[key] = Math.min((maxLevelMap[key] / 5) * 100, 100);
                    });
                    setTopicProgress(progressMap);

                    // Last Active Session
                    if (history.length > 0) {
                        setLastActiveSession(history[0]);
                    }

                    // Streak Calculation
                    const sortedDates = Array.from(uniqueDays).sort().reverse();
                    let currentStreak = 0;
                    if (sortedDates.length > 0) {
                        const today = new Date().toISOString().split('T')[0];
                        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                        if (sortedDates[0] === today || sortedDates[0] === yesterday) {
                            currentStreak = 1;
                            let lastDate = new Date(sortedDates[0]);
                            for (let i = 1; i < sortedDates.length; i++) {
                                const currDate = new Date(sortedDates[i]);
                                const diff = Math.floor((lastDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
                                if (diff === 1) {
                                    currentStreak++;
                                    lastDate = currDate;
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                    setStreak(currentStreak);

                    // Chart Data (Last 7 Days)
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const chartArr = [];
                    for (let i = 6; i >= 0; i--) {
                        const d = new Date();
                        d.setDate(d.getDate() - i);
                        const dayName = days[d.getDay()];

                        const dayTotal = history.filter((s: any) => {
                            if (!s.date) return false;
                            return s.date.getDate() === d.getDate() &&
                                s.date.getMonth() === d.getMonth() &&
                                s.date.getFullYear() === d.getFullYear();
                        }).reduce((acc: number, curr: any) => {
                            return acc + (curr.score || 0) * 10 + (curr.decision === 'NEXT_LEVEL' ? 50 : 0);
                        }, 0);

                        chartArr.push({ name: dayName, xp: dayTotal });
                    }
                    setChartData(chartArr);
                    setLoading(false);
                });

                // 3. Real-time Badges Listener
                const badgesQuery = collection(db, 'users', currentUser.uid, 'achievements');
                unsubBadges = onSnapshot(badgesQuery, (snapshot) => {
                    setBadgesCount(snapshot.size);
                });

            } else {
                router.push('/');
            }
        });

        // Cleanup all listeners
        return () => {
            unsubAuth();
            if (unsubProfile) unsubProfile();
            if (unsubSessions) unsubSessions();
            if (unsubBadges) unsubBadges();
        };
    }, []);

    // -------------------------------------------------------------
    // HANDLERS
    // -------------------------------------------------------------

    function handleTopicClick(id: string): void {
        if (!id) return;
        setPendingTopic(id);
        const currentLevel = topicLevels[id] || 1;
        setPendingLevel(currentLevel);
        setPlayLevel(currentLevel); // Default to max progress for "Resume" behavior
        setShowStyleModal(true);
    }

    const handleResumeLearning = () => {
        // Find topic with highest progress if no last session
        let targetTopic = lastActiveSession?.topic;

        if (!targetTopic) {
            let maxLvl = 0;
            // Find most progressed topic
            Object.entries(topicLevels).forEach(([t, l]) => {
                if (l > maxLvl) {
                    maxLvl = l;
                    targetTopic = t;
                }
            });
        }

        const topic = targetTopic || 'aljabar';
        handleTopicClick(topic);
    };

    const confirmLearningStart = (style: string) => {
        setSessionStyle(style);
        setSelectedTopic(pendingTopic);
        setShowStyleModal(false);
        setView('TOPIC_MASTER'); // Go to Level List first
    };

    const StyleSelectionModal = () => (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="bg-[#020617] backdrop-blur-xl rounded-[2.5rem] p-10 max-w-4xl w-full shadow-2xl shadow-slate-900/50 border border-white/10 ring-1 ring-white/5">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Gaya Belajarmu Hari Ini? 🧠</h2>
                    <p className="text-slate-400 text-lg font-medium">Pilih cara AI menjelaskan materi untukmu.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Visual */}
                    <button
                        onClick={() => confirmLearningStart('VISUAL')}
                        className="group relative p-8 rounded-[2rem] border border-white/10 hover:border-blue-500 bg-slate-900 hover:bg-slate-800 transition-all text-left hover:-translate-y-2 hover:shadow-[0_20px_40px_-12px_rgba(56,189,248,0.2)]"
                    >
                        <div className="text-5xl mb-6 group-hover:scale-110 transition-transform drop-shadow-lg">🎨</div>
                        <h3 className="text-xl font-black text-white mb-2 group-hover:text-blue-400">Visual</h3>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium group-hover:text-slate-300">
                            Penjelasan dengan banyak <strong>diagram, bagan, dan analogi gambar</strong>.
                        </p>
                    </button>

                    {/* Auditory */}
                    <button
                        onClick={() => confirmLearningStart('AUDITORY')}
                        className="group relative p-8 rounded-[2rem] border border-white/10 hover:border-indigo-500 bg-slate-900 hover:bg-slate-800 transition-all text-left hover:-translate-y-2 hover:shadow-[0_20px_40px_-12px_rgba(99,102,241,0.2)]"
                    >
                        <div className="text-5xl mb-6 group-hover:scale-110 transition-transform drop-shadow-lg">🎧</div>
                        <h3 className="text-xl font-black text-white mb-2 group-hover:text-indigo-400">Auditori</h3>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium group-hover:text-slate-300">
                            Gaya <strong>storytelling</strong> seperti podcast dengan bantuan suara.
                        </p>
                    </button>

                    {/* Kinesthetic */}
                    <button
                        onClick={() => confirmLearningStart('KINESTHETIC')}
                        className="group relative p-8 rounded-[2rem] border border-white/10 hover:border-emerald-500 bg-slate-900 hover:bg-slate-800 transition-all text-left hover:-translate-y-2 hover:shadow-[0_20px_40px_-12px_rgba(16,185,129,0.2)]"
                    >
                        <div className="text-5xl mb-6 group-hover:scale-110 transition-transform drop-shadow-lg">🛠️</div>
                        <h3 className="text-xl font-black text-white mb-2 group-hover:text-emerald-400">Kinestetik</h3>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium group-hover:text-slate-300">
                            Belajar lewat <strong>simulasi & studi kasus</strong>. Langsung praktek!
                        </p>
                    </button>
                </div>

                <div className="mt-8 text-center">
                    <button onClick={() => setShowStyleModal(false)} className="text-slate-400 font-bold hover:text-rose-500 text-sm tracking-widest uppercase">
                        Batal
                    </button>
                </div>
            </div>
        </div>
    );

    const handleBackToDashboard = () => {
        setView('DASHBOARD');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // -------------------------------------------------------------
    // VIEWS
    // -------------------------------------------------------------

    if (view === 'LEARNING' && selectedTopic) {
        return (
            <div className="min-h-screen bg-slate-50">
                {/* Floating Nav Hidden in Learning Mode or Visible? Usually Hidden for focus. */}
                <div className="max-w-4xl mx-auto px-6 py-8">
                    <button
                        onClick={() => setView('TOPIC_MASTER')}
                        className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold transition-all mb-8 group"
                    >
                        <span className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-100 group-hover:bg-blue-50 transition-colors">←</span>
                        KEMBALI KE MASTERY
                    </button>
                    <LearningInterface
                        learningStyle={sessionStyle} // Pass Selected Style
                        topic={selectedTopic}
                        initialLevel={playLevel} // Use correct PLAY LEVEL
                        onSessionComplete={async (result: any) => {
                            // Update playLevel immediately for seamless transition
                            if (result.success && result.decision === 'NEXT_LEVEL') {
                                setPlayLevel(result.nextLevel);
                            } else if (result.decision === 'REPEAT') {
                                // Keep same level
                            }

                            if (result.success && result.nextLevel > 5) {
                                if (user) {
                                    await setDoc(doc(db, 'users', user.uid, 'achievements', `mastery_${selectedTopic}`), {
                                        type: 'MASTER_BADGE', topic: selectedTopic, earnedAt: new Date(), label: 'LULUS'
                                    });
                                }
                            }
                            // Update Topic Progress
                            if (result.success) {
                                const currentLvl = topicLevels[selectedTopic] || 1;
                                if (result.nextLevel > currentLvl) {
                                    const nextL = result.nextLevel;
                                    setTopicLevels(prev => ({ ...prev, [selectedTopic]: nextL }));

                                    // Persist to Firestore: users/{uid} set merge progress
                                    if (user) {
                                        await setDoc(doc(db, 'users', user.uid), {
                                            progress: { [selectedTopic]: nextL }
                                        }, { merge: true });
                                    }
                                }
                                setShowAIHelp(false);

                                // HANDLE TOPIC SWITCH (e.g. Aljabar -> Geometri)
                                if (result.action === 'SWITCH_TOPIC' && result.target) {
                                    if (result.target === 'dashboard') {
                                        setView('DASHBOARD');
                                    } else {
                                        setSelectedTopic(result.target);
                                        // Let's go to TOPIC_MASTER of the new topic to let them choose level 1.
                                        setView('TOPIC_MASTER');
                                    }
                                } else {
                                    setView('TOPIC_MASTER');
                                }
                            }
                            if (!result.success && result.emotion && ['Fear', 'Surprise', 'Sad', 'Disgust'].includes(result.emotion)) {
                                setShowAIHelp(true);
                            }
                        }}
                    />
                </div>
            </div>
        );
    }

    if (view === 'TOPIC_MASTER' && selectedTopic) {
        return (
            <TopicMastery
                topicId={selectedTopic}
                onBack={handleBackToDashboard}
                currentLevel={topicLevels[selectedTopic] || 1}
                showAIHelp={showAIHelp}
                onStartLevel={(level) => {
                    setPendingLevel(level);
                    setPlayLevel(level); // FIX: Ensure we play the SELECTED level
                    setView('LEARNING');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
            />
        );
    }

    if (loading || !user) return <div className="min-h-screen bg-[#F8FAFC]"></div>;

    // -------------------------------------------------------------
    // DASHBOARD MAIN LAYOUT
    // -------------------------------------------------------------

    // Determine Main Content based on View (Dashboard, Vault, Stats, Profile)
    // We will keep the default 'DASHBOARD' layout for Home.
    // Ideally we would split these into components, but for now we conditional render sections.

    return (
        <div className="min-h-screen bg-white font-sans pb-32">

            {/* Modal */}
            {showStyleModal && <StyleSelectionModal />}

            {/* Header */}
            <header className="bg-white/90 backdrop-blur-xl sticky top-0 z-40 border-b border-slate-100 support-backdrop-blur:bg-white/95">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20 border border-white/10">
                            <span className="text-white text-xl font-black">M</span>
                        </div>
                        <span className="font-black text-xl tracking-tight text-slate-900">MATH<span className="text-blue-600">FLOW</span></span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all
                            ${isReady ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}
                        `}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                            {isReady ? 'API Ready' : cooldown > 0 ? `Wait ${cooldown}s` : '📦 Offline Mode'}
                        </div>

                        <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-1.5 pr-4 rounded-full">
                            <div className="text-right">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Rank</div>
                                <div className="text-sm font-black text-slate-800">{xp.toLocaleString()}</div>
                            </div>
                            <button onClick={() => auth.signOut()} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-500 transition-colors">
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">

                {view === 'DASHBOARD' && (
                    <>
                        {/* 1. Hero / Profile Section (Restored & Neonized) */}
                        <div className="lg:col-span-12 bg-[#020617] rounded-[2.5rem] p-10 shadow-[0_0_30px_rgba(59,130,246,0.15)] border border-blue-500/30 relative overflow-hidden text-white group hover:shadow-[0_0_50px_rgba(59,130,246,0.3)] transition-all duration-500">
                            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-[2.5rem] bg-slate-950 border-4 border-blue-500/30 shadow-2xl shadow-blue-500/20 flex items-center justify-center text-6xl group-hover:scale-105 transition-transform duration-500 relative z-10">
                                        🎓
                                    </div>
                                    <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full z-0 animate-pulse"></div>
                                    <div className="absolute -bottom-2 -right-2 bg-blue-600 border-4 border-slate-900 w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm shadow-lg z-20">✓</div>
                                </div>

                                <div className="text-center md:text-left flex-1">
                                    <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                                        <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">{profile?.name || user?.displayName || 'Siswa Kampion'}</h1>
                                        <span className="px-4 py-1.5 rounded-full bg-blue-950/50 text-blue-400 text-[10px] font-bold uppercase tracking-widest border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]">Premium Student</span>
                                    </div>
                                    <p className="text-blue-100/80 font-medium text-lg mb-8 max-w-2xl">
                                        Siap melanjutkan petualangan matematikamu hari ini?
                                    </p>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-slate-950/50 rounded-2xl p-4 border border-blue-500/20 shadow-lg backdrop-blur-sm">
                                            <div className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest mb-1">Total XP</div>
                                            <div className="text-2xl font-black text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">{xp.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-slate-950/50 rounded-2xl p-4 border border-blue-500/20 shadow-lg backdrop-blur-sm">
                                            <div className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest mb-1">Streak</div>
                                            <div className="text-2xl font-black text-orange-400 flex items-center gap-1 drop-shadow-[0_0_5px_rgba(251,146,60,0.5)]">
                                                {streak} <span className="text-sm">🔥</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-950/50 rounded-2xl p-4 border border-blue-500/20 shadow-lg backdrop-blur-sm">
                                            <div className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest mb-1">Badges</div>
                                            <div className="text-2xl font-black text-purple-400 flex items-center gap-1 drop-shadow-[0_0_5px_rgba(192,132,252,0.5)]">
                                                {badgesCount} <span className="text-sm">🎖️</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-950/50 rounded-2xl p-4 border border-blue-500/20 shadow-lg backdrop-blur-sm">
                                            <div className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest mb-1">Level Max</div>
                                            <div className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]">
                                                {Math.max(...Object.values(topicLevels).concat(1))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Background Decor */}
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -mr-32 -mt-32 -z-10 animate-pulse-slow"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -ml-20 -mb-20 -z-10"></div>
                        </div>



                        {/* 2. Topic Grid */}
                        <section>
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-black text-slate-900">Kurikulum Matematika</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    {
                                        id: 'aljabar',
                                        title: 'Aljabar',
                                        icon: '📐',
                                        level: topicLevels['aljabar'] || 1,
                                        maxLevel: 5,
                                        description: 'Penguasaan variabel dan logika persamaan linear tingkat lanjut.',
                                        visualBg: 'x + y = z'
                                    },
                                    {
                                        id: 'geometri',
                                        title: 'Geometri',
                                        icon: '🔺',
                                        level: topicLevels['geometri'] || 1,
                                        maxLevel: 5,
                                        locked: (topicLevels['aljabar'] || 1) < 5,
                                        description: 'Kaidah Euler & Volume Bangun Ruang.',
                                        visualBg: 'S + T = R + 2'
                                    },
                                    {
                                        id: 'trigonometri',
                                        title: 'Trigonometri',
                                        icon: '📏',
                                        level: topicLevels['trigonometri'] || 1,
                                        maxLevel: 5,
                                        locked: (topicLevels['geometri'] || 1) < 5,
                                        description: 'Rasio Sinus, Cosinus, Tangen & Elevasi.',
                                        visualBg: 'SinDemi • KosSami'
                                    }
                                ].map((topic) => {
                                    const isMastered = topic.level > topic.maxLevel;
                                    const progress = Math.min(((topic.level - 1) / 5) * 100, 100);

                                    return (
                                        <button
                                            key={topic.id}
                                            disabled={topic.locked}
                                            onClick={() => {
                                                if (!topic.locked) {
                                                    handleTopicClick(topic.id);
                                                }
                                            }}
                                            className={`group relative p-8 rounded-[3rem] border transition-all duration-300 text-left overflow-hidden h-full flex flex-col
                                                ${topic.locked
                                                    ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed grayscale'
                                                    : 'bg-[#020617] border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)] hover:border-blue-400 hover:shadow-[0_0_50px_rgba(59,130,246,0.25)] hover:-translate-y-2'
                                                }
                                            `}
                                        >
                                            <div className={`relative w-full h-32 mb-6 rounded-3xl flex items-center justify-center text-6xl shadow-inner transition-transform group-hover:scale-105 duration-500 overflow-hidden
                                                ${topic.locked ? 'bg-slate-900/50 text-slate-700' : 'bg-slate-950 border border-blue-500/20 text-white shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]'}
                                            `}>
                                                <span className="relative z-10 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{topic.icon}</span>

                                                {/* Visual Background Text for Curriculum */}
                                                {!topic.locked && (
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-10 select-none pointer-events-none">
                                                        <span className="text-xl font-black text-blue-400 whitespace-nowrap transform -rotate-12">{topic.visualBg}</span>
                                                    </div>
                                                )}

                                            </div>
                                            {isMastered && (
                                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-in zoom-in duration-300">
                                                    ✓
                                                </div>
                                            )}
                                            {topic.locked && (
                                                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-sm border-4 border-white">
                                                    🔒
                                                </div>
                                            )}

                                            <div className="relative z-10 flex-1">
                                                <h3 className={`text-2xl font-black mb-2 ${topic.locked ? 'text-slate-400' : 'text-white group-hover:text-blue-400 transition-colors'}`}>
                                                    {topic.title}
                                                </h3>
                                                <p className="text-sm text-slate-400 font-medium mb-6 leading-relaxed line-clamp-2">
                                                    {topic.description}
                                                </p>

                                                <div className="flex items-center gap-3 mt-auto">
                                                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${topic.locked ? 'bg-slate-300' : isMastered ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                                            style={{ width: `${isMastered ? 100 : progress}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className={`text-sm font-bold ${isMastered ? 'text-emerald-500' : 'text-slate-500'}`}>
                                                        Lvl {topic.level > 5 ? 'Max' : topic.level}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Decor */}
                                            {
                                                !topic.locked && (
                                                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl group-hover:bg-blue-600/20 transition-colors duration-500"></div>
                                                )
                                            }
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* 3. Analytics */}
                        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-8 bg-[#020617] rounded-[2.5rem] p-8 shadow-[0_0_30px_rgba(59,130,246,0.15)] border border-blue-500/30">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
                                        <span className="text-blue-500">📊</span> Growth Analytics
                                    </h3>
                                    <button className="text-xs font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]">View Full Report</button>
                                </div>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData}>
                                            <defs>
                                                <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                                                    <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                                dy={10}
                                            />
                                            <YAxis hide />
                                            <Tooltip
                                                cursor={{ fill: '#0f172a', radius: 8 }}
                                                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(59,130,246,0.3)', backgroundColor: '#020617', color: '#fff', boxShadow: '0 0 20px rgba(59,130,246,0.2)' }}
                                            />
                                            <Bar dataKey="xp" radius={[6, 6, 6, 6]} barSize={32} fill="url(#xpGradient)" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-end min-h-[300px] shadow-2xl shadow-slate-900/20">
                                <div className="relative z-10">
                                    <div className="text-6xl font-black mb-2 opacity-90">1</div>
                                    <div className="text-sm font-bold uppercase tracking-widest opacity-60 mb-6">Current Rank</div>
                                    <p className="font-medium text-lg leading-tight text-slate-300">Pertahankan posisimu di puncak leaderboard minggu ini!</p>
                                </div>
                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-12 -mt-12"></div>
                                <svg className="absolute bottom-8 right-8 w-24 h-24 text-white/5 animate-pulse" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                            </div>
                        </section>
                    </>
                )}

                {/* 4. Other Views Logic preserved but hidden for brevity... matched existing logic structure */}
                {view === 'STATS' && (
                    <StatisticDetail
                        user={user}
                        onBack={() => setView('DASHBOARD')}
                        onNavigate={(topicId) => {
                            setSelectedTopic(topicId);
                            setView('TOPIC_MASTER');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                    />
                )}

                {view === 'PROFILE' && (
                    <div className="max-w-xl mx-auto bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
                        <div className="text-center mb-8">
                            <div className="w-24 h-24 rounded-full bg-slate-100 mx-auto mb-4 flex items-center justify-center text-4xl">🎓</div>
                            <h2 className="text-2xl font-black text-slate-800">{profile?.name || user?.displayName}</h2>
                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-1">{user?.email}</p>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                                <span className="font-bold text-slate-600">Gaya Belajar</span>
                                <span className="px-3 py-1 bg-white rounded-lg text-xs font-black uppercase text-blue-600 shadow-sm">{profile?.learningStyle || 'VISUAL'}</span>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                                <span className="font-bold text-slate-600">Level Matematika</span>
                                <span className="px-3 py-1 bg-white rounded-lg text-xs font-black uppercase text-emerald-600 shadow-sm">Level {Math.max(...Object.values(topicLevels).concat(1))}</span>
                            </div>
                        </div>
                        <button onClick={() => auth.signOut()} className="w-full mt-8 py-4 rounded-2xl border-2 border-rose-100 text-rose-500 font-bold hover:bg-rose-50 transition-colors">
                            Sign Out
                        </button>
                    </div>
                )}

                {/* 5. Floating Nav (Midnight Slate) */}
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                    <nav className="bg-slate-900/95 backdrop-blur-md text-white p-2 rounded-full shadow-2xl shadow-slate-900/40 flex items-center gap-1 border border-white/10 ring-1 ring-black/20">
                        <button
                            onClick={() => setView('DASHBOARD')}
                            className={`flex flex-col items-center justify-center w-16 h-12 rounded-full transition-all duration-300 ${view === 'DASHBOARD' ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.4)] border border-white/20 translate-y-[-2px]' : 'hover:bg-white/5 text-slate-400'}`}
                        >
                            <span className="text-xl">🏠</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5">Home</span>
                        </button>

                        <button
                            onClick={() => setView('STATS')}
                            className={`flex flex-col items-center justify-center w-16 h-12 rounded-full transition-all duration-300 ${view === 'STATS' ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.4)] border border-white/20 translate-y-[-2px]' : 'hover:bg-white/5 text-slate-400'}`}
                        >
                            <span className="text-xl">📈</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5">Stats</span>
                        </button>

                        <button
                            onClick={() => setView('PROFILE')}
                            className={`flex flex-col items-center justify-center w-16 h-12 rounded-full transition-all duration-300 ${view === 'PROFILE' ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.4)] border border-white/20 translate-y-[-2px]' : 'hover:bg-white/5 text-slate-400'}`}
                        >
                            <span className="text-xl">👤</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5">Profile</span>
                        </button>
                    </nav>
                </div>
            </main>
        </div >
    );
}