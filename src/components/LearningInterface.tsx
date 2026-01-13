'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { collection, getDocs, query, orderBy, doc, setDoc, getDoc, where, addDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { useAPIStatus } from '@/context/APIStatusContext';

// Types
type Phase = 'LEARNING' | 'QUIZ' | 'SENTIMENT' | 'RESULT';

interface Fragment {
    id: string;
    order: number;
    text: string;
}

interface QuizItem {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
}

interface EvaluationResult {
    decision: "NEXT_LEVEL" | "REPEAT" | "EASIER_CONTENT";
    message: string;
    emotion?: string;
    confidenceScore?: number;
}

interface LearningInterfaceProps {
    initialLevel?: number;
    learningStyle?: string;
    topic?: string;
    onSessionComplete?: (result: { success: boolean, nextLevel: number, emotion?: string, decision?: string }) => void;
}

export default function LearningInterface({ initialLevel = 1, learningStyle = 'TEXT', topic = 'Aljabar', onSessionComplete }: LearningInterfaceProps) {
    const router = useRouter();
    const { isReady, reportError, cooldown } = useAPIStatus();

    const [user, setUser] = useState<User | null>(null);
    const [phase, setPhase] = useState<Phase>('LEARNING');
    const [level, setLevel] = useState(initialLevel);

    const [fragments, setFragments] = useState<Fragment[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isExplaining, setIsExplaining] = useState(false);
    const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
    const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [sentiment, setSentiment] = useState("");
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
    // Fixed duplicate loading
    const [loading, setLoading] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false); // Track offline/fallback mode

    // Queue & Anti-Spam (Track latest request)
    const requestRef = useRef<number>(0);

    const handleSpeak = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'id-ID';
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    };

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchData(currentUser.uid, level);
            } else {
                signInAnonymously(auth).catch(console.error);
            }
        });
        return () => unsub();
    }, [level, topic]);

    useEffect(() => {
        // Invite user back if cooldown over and they were waiting (simple version)
        if (isReady && showToast) {
            setShowToast(false);
        }
    }, [isReady]);

    // FETCH WELCOME MESSAGE
    useEffect(() => {
        const fetchWelcome = async () => {
            if (!topic) return;

            // Check Cache
            const cacheKey = `WELCOME_${topic}_${level}_${learningStyle}`;
            try {
                const cacheDoc = await getDoc(doc(db, 'materi_cache', cacheKey));
                if (cacheDoc.exists()) {
                    const msg = cacheDoc.data().text;
                    setWelcomeMessage(msg);
                    if (learningStyle === 'AUDITORY') {
                        setTimeout(() => handleSpeak(msg), 1000); // Auto-play with slight delay
                    }
                    return;
                }
            } catch (e) { console.warn("Cache error", e); }

            // Fetch API
            if (!isReady) return;
            try {
                const res = await fetch('/api/adaptive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: "Welcome", // Placeholder context
                        mode: 'WELCOME',
                        topic,
                        style: learningStyle
                    }),
                });
                const data = await res.json();
                if (data.explanation) {
                    setWelcomeMessage(data.explanation);
                    // Cache
                    setDoc(doc(db, 'materi_cache', cacheKey), {
                        text: data.explanation,
                        timestamp: new Date()
                    }).catch(console.error);

                    if (learningStyle === 'AUDITORY') {
                        setTimeout(() => handleSpeak(data.explanation), 1000);
                    }
                }
            } catch (error) {
                console.error("Welcome fetch error", error);
            }
        };

        if (phase === 'LEARNING') {
            fetchWelcome();
        }
    }, [level, topic, learningStyle, phase]); // Re-run on level/style change

    const fetchData = async (uid: string, currentLevel: number) => {
        setLoading(true);
        try {
            const qFrag = query(
                collection(db, 'fragments'),
                where('level', '==', currentLevel),
                where('topic', '==', topic)
            );
            const snapFrag = await getDocs(qFrag);
            let loadedFragments = snapFrag.docs.map(d => ({ id: d.id, ...d.data() } as Fragment));
            loadedFragments.sort((a, b) => a.order - b.order);

            if (loadedFragments.length === 0) {
                const fallbackQ = query(collection(db, 'fragments'), where('level', '==', currentLevel));
                const fallbackSnap = await getDocs(fallbackQ);
                loadedFragments = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() } as Fragment));
                loadedFragments = loadedFragments.filter(f => !f.id.includes('fragment-'));
                loadedFragments.sort((a, b) => a.order - b.order);
            }
            setFragments(loadedFragments);

            const qQuiz = query(collection(db, 'quiz'), where('level', '==', currentLevel), where('topic', '==', topic));
            const snapQuiz = await getDocs(qQuiz);
            let loadedQuizzes = snapQuiz.docs.map(d => ({ id: d.id, ...d.data() } as QuizItem));
            if (loadedQuizzes.length === 0) {
                const fallbackQ = query(collection(db, 'quiz'), where('level', '==', currentLevel));
                const fallbackSnap = await getDocs(fallbackQ);
                loadedQuizzes = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() } as QuizItem));
            }
            setQuizzes(loadedQuizzes);
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleNextFragment = () => {
        if (currentIndex + 1 < fragments.length) {
            setCurrentIndex(curr => curr + 1);
            setExplanation(null);
            requestRef.current += 1;
        } else {
            setPhase('QUIZ');
        }
    };

    const handleAnswerQuiz = () => {
        if (selectedOption === null) return;
        if (selectedOption === quizzes[currentQuizIndex].correctAnswer) setScore(s => s + 1);
        if (currentQuizIndex + 1 < quizzes.length) {
            setCurrentQuizIndex(i => i + 1);
            setSelectedOption(null);
        } else {
            setPhase('SENTIMENT');
        }
    };

    // Robust Handle Bingung with API Status Logic
    const handleBingung = async () => {
        if (isExplaining) return; // Anti-Spam

        setIsExplaining(true);
        const fragmentId = fragments[currentIndex].id || `frag-${currentIndex}`;
        const cacheKey = `${topic}-${level}-${fragmentId}`.replace(/\s+/g, '_');

        const requestId = Date.now();
        requestRef.current = requestId;

        // Check global API Status
        if (!isReady) {
            setShowToast(true);
        }

        try {
            let cachedExplanation = null;

            // 1. Try Cache
            try {
                const docRef = doc(db, 'materi_cache', cacheKey);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    cachedExplanation = docSnap.data().explanation;
                }
            } catch (cacheErr) {
                console.warn("Cache read skipped:", cacheErr);
            }

            if (cachedExplanation) {
                setExplanation(cachedExplanation);
            } else {
                // If API not ready and no cache, wait or fail
                if (!isReady) {
                    setIsExplaining(false);
                    return;
                }

                // 2. API Call
                const res = await fetch('/api/adaptive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: fragments[currentIndex].text,
                        style: learningStyle,
                        topic: topic,
                        mode: 'STEP_BY_STEP'
                    })
                });

                if (requestRef.current !== requestId) return;

                if (res.status === 429 || res.status === 503) {
                    reportError();
                    throw new Error("API_BUSY");
                }

                if (!res.ok) throw new Error("API Error");

                const data = await res.json();

                if (data.explanation) {
                    setExplanation(data.explanation);
                    setIsOffline(data.isOffline || data.fromCache || false);
                    // Cache
                    setDoc(doc(db, 'materi_cache', cacheKey), {
                        explanation: data.explanation,
                        style: learningStyle,
                        topic,
                        level,
                        fragmentId,
                        timestamp: new Date()
                    }).catch(e => console.warn("Cache write skipped", e));
                }
            }
        } catch (error: any) {
            console.error(error);
            if (requestRef.current !== requestId) return;

            // Fallback Logic
            if (error.message === "API_BUSY" || (error.message && error.message.includes("Limit"))) {
                setShowToast(true);
                setExplanation(`
### 🤖 Gemini Sedang 'Mengambil Napas'...
**"Sistem sedang sibuk karena antusiasme belajar yang tinggi! Tunggu sebentar ya."**

Sobil menunggu koneksi lancar kembali, coba panduan manual ini:

**Tips Belajar Mandiri:**
1. **Analisa Soal**: Baca kalimat soal perlahan, tandai kata kuncinya.
2. **Visualisasi**: Coba gambar masalahnya di kertas buram.
3. **Cek Rumus**: Lihat kembali rumus dasar di tombol "Rumus" pada menu bawah.

*Coba klik tombol "Saya Bingung" lagi dalam 1-2 menit.*
`);
            } else {
                setExplanation(`
### 📚 Panduan Cepat: ${topic} (Mode Offline)

Sistem AI sedang tidak dapat dijangkau, namun berikut ringkasan umum untuk membantumu:

**Konsep Inti:**
Materi **${topic}** biasanya berfokus pada pola dan logika langkah demi langkah.

**Strategi Penyelesaian:**
1. **Identifikasi Variabel**: Apa yang diketahui? Apa yang dicari?
2. **Sederhanakan**: Pecah masalah besar menjadi bagian-bagian kecil.
3. **Verifikasi**: Masukkan kembali jawabanmu ke dalam soal untuk mengecek kebenarannya.

$$ \\text{Sukses} = \\text{Usaha} + \\text{Konsistensi} $$

*Tetap semangat! Kamu bisa menyelesaikan ini dengan logika dasarmu.*
`);
            }
        } finally {
            if (requestRef.current === requestId) {
                setIsExplaining(false);
            }
        }
    };

    const handleSubmitSentiment = async () => {
        setIsEvaluating(true);
        try {
            const passedLocally = score / quizzes.length > 0.6;
            const res = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score, totalQuestions: quizzes.length, sentiment, learningStyle, topic })
            });

            if (res.status === 429) reportError();
            if (!res.ok) throw new Error("API Busy");

            const result: EvaluationResult = await res.json();
            setEvaluation(result);
            setPhase('RESULT');

            if (user) {
                addDoc(collection(db, 'users', user.uid, 'sessions'), {
                    timestamp: new Date(), score, total: quizzes.length,
                    decision: result.decision, sentiment, emotion: result.emotion || 'Unknown',
                    learningStyle, level: level
                }).catch(e => console.warn("Session log failed", e));
                if (result.decision === 'NEXT_LEVEL') {
                    const nextLevelValue = level + 1;
                    setLevel(nextLevelValue);
                    setDoc(doc(db, 'users', user.uid), { mathLevel: nextLevelValue }, { merge: true }).catch(console.error);
                }
            }
        } catch (err) {
            console.error(err);
            const passed = score / quizzes.length > 0.7;
            setEvaluation({
                decision: passed ? 'NEXT_LEVEL' : 'REPEAT',
                message: passed ? "Hebat! Nilaimu sangat bagus." : "Tetap semangat! Coba pelajari lagi.",
                emotion: 'Neutral'
            });
            setPhase('RESULT');
            if (user && passed) {
                const nextLevelValue = level + 1;
                setLevel(nextLevelValue);
                setDoc(doc(db, 'users', user.uid), { mathLevel: nextLevelValue }, { merge: true }).catch(console.error);
            }
        } finally { setIsEvaluating(false); }
    };

    const handleRestart = () => {
        setPhase('LEARNING'); setCurrentIndex(0); setCurrentQuizIndex(0); setScore(0); setSentiment(""); setExplanation(null);
    };

    const handleNextLevel = () => {
        if (onSessionComplete && evaluation?.decision === 'NEXT_LEVEL') {
            // Already triggered onSessionComplete logic via button click usually
        }
        setLevel(l => l + 1);
        setPhase('LEARNING'); setCurrentIndex(0); setCurrentQuizIndex(0); setScore(0); setSentiment(""); setExplanation(null);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-12 h-64">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Memuat Materi...</p>
        </div>
    );

    const isPassed = score / quizzes.length > 0.7;
    const isAnxious = evaluation?.emotion && ['Fear', 'Sad', 'Sadness', 'Disgust', 'Surprise'].includes(evaluation.emotion);

    return (
        <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden min-h-[500px] flex flex-col font-sans mb-20 relative">

            {/* TOAST NOTIFICATION */}
            {showToast && (
                <div className="absolute top-4 right-4 z-50 bg-amber-500 text-white px-4 py-3 rounded-xl shadow-xl animate-bounce-in flex items-center gap-3">
                    <span className="text-2xl">😴</span>
                    <div>
                        <p className="font-bold text-sm">Gemini Sedang Istirahat</p>
                        <p className="text-xs text-amber-100">Coba lagi dalam {cooldown} detik ya!</p>
                    </div>
                    <button onClick={() => setShowToast(false)} className="text-amber-200 hover:text-white font-bold ml-2">✕</button>
                </div>
            )}

            {/* Header / Standardized */}
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest transition-colors mr-4"
                >
                    <span>🏠</span> Beranda
                </button>

                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${phase === 'LEARNING' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                        Belajar
                    </span>
                    <span className="text-slate-300">→</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${phase === 'QUIZ' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-500'}`}>
                        Kuis
                    </span>
                    <span className="text-slate-300">→</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${phase === 'RESULT' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                        Hasil
                    </span>
                </div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Level {level}</div>
            </div>

            {/* PHASE: LEARNING */}
            {phase === 'LEARNING' && fragments.length > 0 && (
                <div className="p-8 sm:p-12 flex-1 flex flex-col">
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#0f172a] leading-tight mb-8">
                        {fragments[currentIndex].text}
                    </h2>

                    {/* AI Welcome Bubble */}
                    {welcomeMessage && !isExplaining && !explanation && (
                        <div className="mb-8 flex gap-4 animate-in fade-in slide-in-from-left-4 duration-700">
                            <div className="w-12 h-12 flex-shrink-0 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl shadow-sm border-2 border-white">
                                🤖
                            </div>
                            <div className="bg-white p-5 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 max-w-lg relative group">
                                <div className="text-slate-600 font-medium text-sm leading-relaxed">
                                    {welcomeMessage}
                                </div>
                                <div className="absolute -right-2 -bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex gap-1">
                                        {learningStyle === 'AUDITORY' && (
                                            <button
                                                onClick={() => handleSpeak(welcomeMessage)}
                                                className="bg-blue-100 text-blue-600 p-2 rounded-full hover:bg-blue-200 transition-colors shadow-sm"
                                                title="Putar Suara"
                                            >
                                                🔊
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Explanation Card */}
                    {(explanation || isExplaining) && (
                        <div className="mb-10 bg-[#FFFDF2] border border-amber-100 p-8 sm:p-10 rounded-[2.5rem] animate-fade-in relative shadow-sm">
                            <div className="flex items-center justify-between gap-3 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="bg-amber-100 text-amber-600 w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner">
                                        {isExplaining ? '⏳' : isOffline ? '📦' : '💡'}
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                        {isExplaining ? 'Guru Motivator sedang mengetik...' : `Ulasan Khusus: Konsep Visual ${topic}`}
                                    </h3>
                                </div>
                                {isOffline && !isExplaining && (
                                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-widest rounded-full border border-amber-200">
                                        📴 Offline Mode
                                    </span>
                                )}
                            </div>

                            <div className="prose prose-slate prose-lg max-w-none text-slate-700 leading-relaxed font-medium">
                                {isExplaining ? (
                                    // Skeleton Loading
                                    <div className="space-y-4 animate-pulse">
                                        <div className="h-4 bg-amber-200/50 rounded w-3/4"></div>
                                        <div className="h-4 bg-amber-200/50 rounded w-full"></div>
                                        <div className="h-4 bg-amber-200/50 rounded w-5/6"></div>
                                        <div className="h-24 bg-amber-100/50 rounded-xl w-full mt-4"></div>
                                    </div>
                                ) : (
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath, remarkGfm]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            strong: ({ node, ...props }: any) => <span className="font-extrabold text-slate-900 bg-amber-50 px-1 rounded" {...props} />,
                                            ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 space-y-2 my-4" {...props} />,
                                            li: ({ node, ...props }: any) => <li className="pl-2" {...props} />,
                                            code: ({ node, ...props }: any) => <code className="bg-slate-100 text-pink-600 px-2 py-1 rounded-md font-mono text-sm border border-slate-200" {...props} />
                                        }}>
                                        {explanation || ""}
                                    </ReactMarkdown>
                                )}
                            </div>

                            {!isExplaining && (
                                <div className="mt-8 pt-6 border-t border-amber-100/50 flex justify-end">
                                    <button
                                        onClick={() => setExplanation(null)}
                                        className="px-6 py-3 bg-white text-slate-700 font-bold rounded-xl border-2 border-slate-100 hover:border-amber-400 hover:text-amber-700 transition-all text-sm uppercase tracking-widest shadow-sm hover:shadow-md"
                                    >
                                        Saya Paham, Lanjutkan Belajar 👍
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-auto pt-8 flex gap-4">
                        <button
                            onClick={handleBingung}
                            disabled={isExplaining}
                            className={`flex-1 py-4 rounded-2xl font-bold transition-all border
                            ${isExplaining
                                    ? 'bg-amber-50 text-amber-500 border-amber-200 cursor-not-allowed'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'}`}
                        >
                            {isExplaining ? '💭 Gemini sedang merangkum...' : '🤔 Saya Bingung'}
                        </button>
                        <button
                            onClick={handleNextFragment}
                            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-1"
                        >
                            Paham, Lanjut 👍
                        </button>
                    </div>
                    {/* Skip to Quiz Option */}
                    <div className="text-center pt-2">
                        <button
                            onClick={() => setPhase('QUIZ')}
                            className="text-xs font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest py-2"
                        >
                            Lewati Materi & Kerjakan Kuis ⏩
                        </button>
                    </div>
                </div>
            )}

            {/* PHASE: QUIZ */}
            {
                phase === 'QUIZ' && quizzes.length > 0 && (
                    <div className="p-8 sm:p-12 flex-1 flex flex-col">
                        <div className="mb-6 flex justify-between items-end">
                            <span className="text-5xl font-black text-slate-200">Q{currentQuizIndex + 1}</span>
                            <span className="text-slate-400 font-bold text-sm uppercase">Total {quizzes.length} Soal</span>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a] mb-8 leading-snug">
                            {quizzes[currentQuizIndex].question}
                        </h3>

                        <div className="space-y-4 mb-8 flex-1">
                            {quizzes[currentQuizIndex].options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedOption(idx)}
                                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all font-medium text-lg
                                    ${selectedOption === idx
                                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md'
                                            : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50 text-slate-600'
                                        }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleAnswerQuiz}
                            disabled={selectedOption === null}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-1 transition-all"
                        >
                            Jawab Pertanyaan
                        </button>
                    </div>
                )
            }

            {/* PHASE: RESULT & SENTIMENT (Combined) */}
            {
                (phase === 'SENTIMENT' || phase === 'RESULT') && (
                    <div className="p-8 sm:p-12 flex-1 flex flex-col items-center justify-center text-center">

                        {phase === 'SENTIMENT' ? (
                            <>
                                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-inner">
                                    🎉
                                </div>
                                <h3 className="text-3xl font-black text-[#0f172a] mb-2">Selesai!</h3>
                                <p className="text-slate-500 font-medium mb-8">Skor kamu: <span className="text-emerald-600 font-black text-xl">{score}/{quizzes.length}</span></p>

                                <div className="w-full text-left bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Refleksi Diri</label>
                                    <textarea
                                        value={sentiment}
                                        onChange={(e) => setSentiment(e.target.value)}
                                        placeholder="Ceritakan perasaanmu... (Contoh: 'Aku senang karena paham rumusnya!')"
                                        className="w-full bg-white p-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all h-32 resize-none text-slate-700 font-medium"
                                    />
                                </div>

                                <button
                                    onClick={handleSubmitSentiment}
                                    disabled={isEvaluating || !sentiment.trim()}
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
                                >
                                    {isEvaluating ? 'AI Sedang Menganalisa...' : 'Analisa Emosi Saya ✨'}
                                </button>
                            </>
                        ) : (
                            // FINAL RESULT SCREEN
                            <>
                                <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center text-6xl mb-6 shadow-2xl
                                 ${isPassed ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-amber-400 text-white shadow-amber-200'}
                             `}>
                                    {isPassed ? '🚀' : '💪'}
                                </div>

                                <h2 className="text-3xl font-black text-[#0f172a] mb-4">
                                    {isPassed ? 'Level Completed!' : 'Keep Going!'}
                                </h2>

                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 max-w-md w-full">
                                    <p className="text-slate-600 font-medium leading-relaxed">
                                        "{evaluation?.message}"
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 w-full max-w-md">
                                    {/* SMART NAVIGATION LOGIC */}
                                    {isPassed ? (
                                        // Case: High Score (>70%)
                                        isAnxious ? (
                                            // Sub-case: High Score + Negative Emotion (Anxiety)
                                            <>
                                                <div className="w-full bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm text-blue-800 mb-2 text-left animate-fade-in">
                                                    <strong>Saran AI:</strong> Nilaimu bagus, tapi sepertinya kamu masih ragu. Mau memantapkan materi dulu? (Direkomendasikan)
                                                </div>

                                                {/* Recommended Option: Blue Color */}
                                                <button
                                                    onClick={handleRestart}
                                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all border-2 border-blue-400"
                                                >
                                                    Ulangi Kuis & Pelajari Materi (Rekomendasi) 🌟
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setPhase('QUIZ');
                                                        setCurrentQuizIndex(0);
                                                        setScore(0);
                                                        setSentiment("");
                                                        setExplanation(null);
                                                    }}
                                                    className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                                                >
                                                    Ulangi Kuis Saja 📝
                                                </button>

                                                <button
                                                    onClick={() => onSessionComplete ? onSessionComplete({ success: true, nextLevel: level + 1, emotion: evaluation?.emotion, decision: 'NEXT_LEVEL' }) : handleNextLevel()}
                                                    className="w-full py-4 bg-slate-200 text-slate-500 rounded-2xl font-bold hover:bg-slate-300 transition-all"
                                                >
                                                    Lanjutkan Level Berikutnya ➡
                                                </button>
                                            </>
                                        ) : (
                                            // Sub-case: High Score + Positive/Neutral Emotion
                                            <button
                                                onClick={() => onSessionComplete ? onSessionComplete({ success: true, nextLevel: level + 1, emotion: evaluation?.emotion, decision: 'NEXT_LEVEL' }) : handleNextLevel()}
                                                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all hover:-translate-y-1"
                                            >
                                                Lanjut Level Berikutnya 🚀
                                            </button>
                                        )
                                    ) : (
                                        // Case: Low Score / Failed
                                        <>
                                            <button
                                                onClick={() => onSessionComplete ? onSessionComplete({ success: false, nextLevel: level, emotion: evaluation?.emotion, decision: evaluation?.decision || 'REPEAT' }) : handleRestart()}
                                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all"
                                            >
                                                Ulangi Materi & Kuis 🔄
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setPhase('QUIZ');
                                                    setCurrentQuizIndex(0);
                                                    setScore(0);
                                                    setSentiment("");
                                                    setExplanation(null);
                                                }}
                                                className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                                            >
                                                Ulangi Kuis Saja 📝
                                            </button>
                                        </>
                                    )}

                                    <button
                                        onClick={() => window.location.href = '/dashboard'}
                                        className="w-full py-4 text-slate-400 font-bold text-sm uppercase tracking-widest hover:text-slate-600"
                                    >
                                        Kembali ke Beranda
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )
            }
        </div>
    );
}
