'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { collection, getDocs, query, orderBy, doc, setDoc, getDoc, where, addDoc, increment } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { useAPIStatus } from '@/context/APIStatusContext';
import { ALJABAR_CURRICULUM } from '@/lib/curriculumData';
import { GEOMETRI_CURRICULUM, TRIGONOMETRI_CURRICULUM } from '@/lib/curriculumExpansion';

// Types
type Phase = 'LEARNING' | 'QUIZ' | 'SENTIMENT' | 'RESULT';

interface Fragment {
    id: string;
    order: number;
    text: string;
    title?: string;
    type?: 'text' | 'video' | 'quiz';
    content?: string; // Optional alias for text if needed
}

interface QuizItem {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
}

interface EvaluationResult {
    decision: "NEXT_LEVEL" | "REPEAT" | "EASIER_CONTENT" | "NEXT_TOPIC";
    message: string;
    emotion?: string;
    confidenceScore?: number;
}

interface LearningInterfaceProps {
    initialLevel?: number;
    learningStyle?: string;
    topic?: string;
    onSessionComplete?: (result: { success: boolean, nextLevel: number, emotion?: string, decision?: string, action?: string, target?: string }) => void;
}


export default function LearningInterface({ initialLevel = 1, learningStyle = 'TEXT', topic = 'Aljabar', onSessionComplete }: LearningInterfaceProps) {
    const router = useRouter();
    const { isReady, reportError, cooldown } = useAPIStatus();

    const [user, setUser] = useState<User | null>(null);
    const [phase, setPhase] = useState<Phase>('LEARNING');
    const [level, setLevel] = useState(initialLevel);

    // FIX: Sync level state when initialLevel prop changes
    useEffect(() => {
        setLevel(initialLevel);
        startTime.current = new Date(); // Reset timer on level change
        setUserAnswers({}); // Reset answers
    }, [initialLevel]);

    const [fragments, setFragments] = useState<Fragment[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isExplaining, setIsExplaining] = useState(false);
    const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
    const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [sentiment, setSentiment] = useState("");
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
    // Fixed duplicate loading
    const [loading, setLoading] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false); // Track offline/fallback mode
    const [isMuted, setIsMuted] = useState(false); // Audio Mute State

    // ANALYTICS DATA
    const startTime = useRef<Date>(new Date());
    const [userAnswers, setUserAnswers] = useState<Record<number, { question: string, selected: number, correct: boolean }>>({});

    // Queue & Anti-Spam (Track latest request)
    const requestRef = useRef<number>(0);

    const handleSpeak = (text: string) => {
        if (isMuted) {
            window.speechSynthesis?.cancel();
            return;
        }

        if ('speechSynthesis' in window) {
            if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                window.speechSynthesis.cancel();
            } else {
                // Strip Markdown & LaTeX symbols for clean speech (Lumi Voice 2.0)
                const cleanText = text
                    .replace(/\${1,2}.*?\${1,2}/g, "bentuk matematika") // Replace math with dummy text (or remove)
                    .replace(/[\*#_`]/g, "") // Remove bold, italic, headers, code ticks
                    .replace(/>/g, "")
                    .replace(/\[.*?\]\(.*?\)/g, "") // Remove links
                    .replace(/\s+/g, " ")
                    .trim();

                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.lang = 'id-ID';
                utterance.rate = 1.1;
                utterance.pitch = 1.2;
                window.speechSynthesis.speak(utterance);
            }
        }
    };

    const toggleMute = () => {
        if (!isMuted) {
            window.speechSynthesis.cancel();
        }
        setIsMuted(prev => !prev);
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

    // FETCH WELCOME MESSAGE & STATIC CURRICULUM
    useEffect(() => {
        // RESET STATE ON LEVEL CHANGE
        setCurrentQuizIndex(0);
        setScore(0);
        setSentiment("");
        setExplanation(null);
        setSelectedOption(null);
        setShowFeedback(false);
        setIsCorrect(false);
        setPhase('LEARNING'); // Start with learning phase

        const fetchWelcome = async () => {
            if (!topic) return;

            // 1. STATIC CURRICULUM (Turbo Mode)
            // Checks Aljabar, Geometri, Trigonometri locally
            let staticData = null;
            if (topic.toLowerCase().includes('aljabar')) staticData = ALJABAR_CURRICULUM[level];
            else if (topic.toLowerCase().includes('geometri')) staticData = GEOMETRI_CURRICULUM[level];
            else if (topic.toLowerCase().includes('trigonometri')) staticData = TRIGONOMETRI_CURRICULUM[level];

            if (staticData) {
                const data = staticData;

                // SELECT CONTENT BASED ON LEARNING STYLE
                let selectedContent = data.content;
                if (learningStyle === 'VISUAL' && data.contentVisual) selectedContent = data.contentVisual;
                else if (learningStyle === 'AUDITORY' && data.contentAuditory) selectedContent = data.contentAuditory;
                else if (learningStyle === 'KINESTHETIC' && data.contentKinesthetic) selectedContent = data.contentKinesthetic;
                else if (data.contentVisual) selectedContent = data.contentVisual; // Fallback if general content is weak

                const staticFragment: Fragment = {
                    id: `static-${level}`,
                    title: data.title || `Materi ${topic} Level ${level}`,
                    text: selectedContent,
                    content: selectedContent,
                    type: 'text',
                    order: 1
                };

                setFragments([staticFragment]);
                setQuizzes(data.quiz.map((q: any, i: number) => ({ ...q, id: `static-q-${i}` })));
                setLoading(false);

                if (learningStyle === 'AUDITORY') {
                    setTimeout(() => handleSpeak(selectedContent.substring(0, 300) + "..."), 1000);
                }
                return;
            }

            // 2. DYNAMIC CONTENT VIA API (For other topics)
            if (!isReady) return;
            try {
                const res = await fetch('/api/adaptive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: "Welcome",
                        mode: 'TEACH',
                        topic,
                        style: learningStyle
                    }),
                });
                const data = await res.json();

                if (data.explanation) {
                    setWelcomeMessage(data.explanation);
                    if (learningStyle === 'AUDITORY') {
                        setTimeout(() => handleSpeak(data.explanation), 1000);
                    }
                }
            } catch (error) {
                console.error("Welcome fetch error", error);
            }
        };

        fetchWelcome();
    }, [level, topic, learningStyle, isReady]); // Removed 'phase' to prevent loops

    const fetchData = async (uid: string, currentLevel: number) => {
        // Guard: If fragments are already loaded (e.g. by Static Curriculum), skip Firestore
        // STRICT GUARD for Static Topics:
        // Do NOT attempt Firestore fetch for these, trust fetchWelcome()
        if (['aljabar', 'geometri', 'trigonometri'].some(t => topic?.toLowerCase().includes(t))) return;

        if (fragments.length > 0) return;

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
                // If no dynamic fragments, check fallback fragments (Legacy)
                // But for Aljabar 1-5, we likely want to rely on the static load above.
                if (topic.toLowerCase().includes('aljabar') && currentLevel <= 5) {
                    setLoading(false);
                    return;
                }

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
                if (topic.toLowerCase().includes('aljabar') && currentLevel <= 5) {
                    // Do nothing, already handled by static
                } else {
                    const fallbackQ = query(collection(db, 'quiz'), where('level', '==', currentLevel));
                    const fallbackSnap = await getDocs(fallbackQ);
                    loadedQuizzes = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() } as QuizItem));
                }
            }
            if (loadedQuizzes.length > 0) setQuizzes(loadedQuizzes);

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



    // Robust Handle Bingung with API Status Logic
    const handleBingung = async () => {
        if (isExplaining) return; // Anti-Spam

        setIsExplaining(true);
        const fragmentId = fragments[currentIndex].id || `frag-${currentIndex}`;
        const cacheKey = `${topic}-${level}-${fragmentId}_v2`.replace(/\s+/g, '_');

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
                    const cached = docSnap.data().explanation || '';

                    // VALIDATION: Reject old non-Lumi cached content
                    const invalidPhrases = ['Halo calon', 'Guru Motivator', 'Ibu/Bapak', 'Sistem sedang sibuk'];
                    const hasInvalidContent = invalidPhrases.some(phrase =>
                        cached.toLowerCase().includes(phrase.toLowerCase())
                    );

                    if (!hasInvalidContent && cached.length > 50) {
                        cachedExplanation = cached;
                    } else {
                        console.log('⚠️ Client cache invalid (old format), proceeding to API');
                    }
                }
            } catch (cacheErr) {
                console.warn("Cache read skipped:", cacheErr);
            }

            if (cachedExplanation) {
                setExplanation(cachedExplanation);
                setIsOffline(true); // Mark as from cache
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

                    // Log "Saya Bingung" interaction to sessions for analytics
                    if (user?.uid) {
                        addDoc(collection(db, 'users', user.uid, 'sessions'), {
                            type: 'BINGUNG',
                            topic,
                            level,
                            fragmentId,
                            learningStyle,
                            isOffline: data.isOffline || false,
                            timestamp: new Date()
                        }).catch(e => console.warn("Session log skipped", e));
                    }
                }
            }
        } catch (error: any) {
            console.error(error);
            if (requestRef.current !== requestId) return;

            // Fallback Logic - All Lumi branded
            if (error.message === "API_BUSY" || (error.message && error.message.includes("Limit"))) {
                setShowToast(true);
                setExplanation(`### ✨ Lumi Sedang Mengisi Energi...

**Hai! Aku Lumi!** Sepertinya banyak teman yang sedang belajar bersamaku sekarang, jadi aku butuh istirahat sebentar! 💙

Tapi tenang, sambil menunggu, coba tips ini dari Lumi:

**📝 Tips Belajar Mandiri dari Lumi:**
1. **Analisa Soal**: Baca kalimat soal perlahan, tandai kata kuncinya.
2. **Visualisasi**: Coba gambar masalahnya di kertas - Lumi yakin kamu bisa!
3. **Cek Rumus**: Lihat kembali rumus dasar di catatan atau buku.

---

> *"Setiap master dulunya adalah pemula yang tidak pernah menyerah!"* 🌟

**Coba klik "Saya Bingung" lagi dalam 1-2 menit ya! Lumi akan segera kembali!** 💙
`);
                setIsOffline(true);
            } else {
                setExplanation(`### ✨ Hai! Lumi di sini untukmu!

**Lumi** sedang mengisi energi sebentar, tapi aku sudah siapkan panduan untuk topik **${topic}**! 💙

---

**🎯 Konsep Inti:**
Materi **${topic}** biasanya berfokus pada pola dan logika langkah demi langkah.

**📌 Strategi dari Lumi:**
1. **Identifikasi Variabel**: Apa yang diketahui? Apa yang dicari?
2. **Sederhanakan**: Pecah masalah besar menjadi bagian-bagian kecil.
3. **Verifikasi**: Masukkan kembali jawabanmu ke dalam soal.

---

$$ \\text{Sukses} = \\text{Usaha} + \\text{Konsistensi} $$

**Lumi percaya padamu! Kamu pasti bisa menyelesaikan ini!** 💙
`);
                setIsOffline(true);
            }
        } finally {
            if (requestRef.current === requestId) {
                setIsExplaining(false);
            }
        }
    };

    const handleAnswerQuiz = () => {
        if (selectedOption === null) return;

        const correct = quizzes[currentQuizIndex].correctAnswer === selectedOption;
        setIsCorrect(correct);
        if (correct) {
            setScore(s => s + 1);
        }

        // Record Answer for Analytics
        setUserAnswers(prev => ({
            ...prev,
            [currentQuizIndex]: {
                question: quizzes[currentQuizIndex].question,
                selected: selectedOption,
                correct
            }
        }));

        setShowFeedback(true);
    };

    const handleNextQuestion = () => {
        setShowFeedback(false);
        setSelectedOption(null);

        if (currentQuizIndex < quizzes.length - 1) {
            setCurrentQuizIndex(prev => prev + 1);
        } else {
            // End of Quiz -> Show Sentiment Modal
            setPhase('SENTIMENT');
        }
    };

    const handleSubmitSentiment = async () => {
        setIsEvaluating(true);
        try {
            const passedLocally = score / quizzes.length >= 0.8;
            const res = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score, totalQuestions: quizzes.length, sentiment, learningStyle, topic })
            });

            if (res.status === 429 || !res.ok) {
                throw new Error("API Offline or Rate Limited");
            }

            const result: EvaluationResult = await res.json();

            // Override for Mastery
            if (passedLocally && level >= 5) {
                result.message = `Lumi bangga sekali padamu! Kamu sudah menaklukkan seluruh tantangan ${topic} dengan hebat! Kamu merasa '${sentiment}'. Pertahankan semangat ini untuk materi selanjutnya!`;
                result.decision = "NEXT_TOPIC";
            }

            setEvaluation(result);
            setPhase('RESULT');

        } catch (error) {
            console.warn("Evaluation API Failed, using Fallback:", error);
            // FALLBACK LOGIC
            const passed = score / quizzes.length >= 0.8;
            let msg = passed
                ? `Luar biasa! Skor ${score}/${quizzes.length}. Hebat! Lumi bangga padamu! 💙`
                : "Jangan menyerah! Coba pelajari lagi bagian yang salah ya.";

            if (passed && level >= 5) {
                msg = `Lumi bangga sekali padamu! Kamu sudah menaklukkan seluruh tantangan ${topic} dengan hebat! Kamu merasa '${sentiment}'. Pertahankan semangat ini untuk materi selanjutnya!`;
            }

            setEvaluation({
                decision: passed ? (level >= 5 ? 'NEXT_TOPIC' : 'NEXT_LEVEL') : 'REPEAT',
                message: msg,
                emotion: sentiment
            });
            setPhase('RESULT');
            setIsEvaluating(false); // Ensure loading stops here too if we don't rely only on finally

        } finally {
            setIsEvaluating(false);

            // LOG SESSION (Executed even if API failed or fell back)
            // LOG SESSION (Executed even if API failed or fell back)
            if (user) {
                const passedLocally = score / quizzes.length >= 0.8;
                const durationSeconds = (new Date().getTime() - startTime.current.getTime()) / 1000;

                addDoc(collection(db, 'users', user.uid, 'sessions'), {
                    timestamp: new Date(),
                    score,
                    total: quizzes.length,
                    decision: passedLocally ? 'NEXT_LEVEL' : 'REPEAT',
                    sentiment,
                    emotion: sentiment,
                    learningStyle,
                    level: level,
                    topic: topic, // Ensure Topic is saved
                    xp: passedLocally ? 100 * level : 10,
                    durationSeconds: durationSeconds,
                    answers: userAnswers
                }).catch(e => console.warn("Session log failed", e));

                if (passedLocally) {
                    const title = level >= 5 ? `Lulus Topik ${topic}` : `Lulus Level ${level}`;
                    addDoc(collection(db, 'users', user.uid, 'achievements'), {
                        title: title,
                        date: new Date(),
                        type: level >= 5 ? 'TOPIC_MASTERY' : 'LEVEL_UP',
                        xp: 50
                    }).catch(e => console.warn("Achievement log failed", e));

                    const nextLevelValue = level + 1;
                    // Optimistic Update handled by Dashboard, but syncing DB here just in case:
                    setDoc(doc(db, 'users', user.uid), {
                        mathLevel: nextLevelValue,
                        progress: { [topic]: nextLevelValue }
                    }, { merge: true }).catch(console.error);
                }
            }
        }
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
                        <p className="font-bold text-sm">Lumi Sedang Mengisi Energi</p>
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
                    {/* 1. Main Material Title (Safe Render) + Speaker */}
                    <div className="mb-8 select-none relative group">
                        <div className="absolute -left-12 top-0 hidden sm:flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleSpeak(fragments[currentIndex].text)}
                                className="bg-blue-100 text-blue-600 p-3 rounded-full hover:bg-blue-200 transition-colors shadow-sm"
                                title="Baca Materi"
                            >
                                🔊
                            </button>
                        </div>

                        {/* Mobile Speaker Button (Visible on top-right) */}
                        <button
                            onClick={() => handleSpeak(fragments[currentIndex].text)}
                            className="absolute right-0 top-0 sm:hidden bg-blue-50 text-blue-600 p-2 rounded-full hover:bg-blue-100"
                            title="Baca Materi"
                        >
                            🔊
                        </button>

                        <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[[rehypeKatex, { strict: false }]]}
                            components={{
                                p: ({ node, ...props }: any) => <h2 className="text-2xl sm:text-3xl font-bold text-[#0f172a] leading-tight" {...props} />
                            }}
                        >
                            {fragments[currentIndex].text || "Materi Belajar"}
                        </ReactMarkdown>
                    </div>

                    {/* 2. AI Welcome Bubble (Safe Render) */}
                    {welcomeMessage && !isExplaining && !explanation && (
                        <div className="mb-8 flex gap-4 animate-in fade-in slide-in-from-left-4 duration-700">
                            <div className="w-12 h-12 flex-shrink-0 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl shadow-sm border-2 border-white">
                                🤖
                            </div>
                            <div className="bg-white p-5 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 max-w-lg relative group">
                                <div className="text-slate-600 font-medium text-sm leading-relaxed">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath, remarkGfm]}
                                        rehypePlugins={[[rehypeKatex, { strict: false }]]}
                                        components={{
                                            p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
                                            strong: ({ node, ...props }: any) => <span className="font-bold text-blue-900 bg-blue-50 px-1 rounded" {...props} />
                                        }}
                                    >
                                        {welcomeMessage}
                                    </ReactMarkdown>
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

                    {/* Lumi AI Explanation Card */}
                    {(explanation || isExplaining) && (
                        <div className={`mb-10 ${isOffline ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200' : 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-100'} border p-8 sm:p-10 rounded-[2.5rem] animate-fade-in relative shadow-sm`}>
                            {/* Header Controls: Status & Mute */}
                            {!isExplaining && (
                                <div className="absolute top-6 right-6 flex items-center gap-3 z-20">
                                    {/* Mute Button - Always Visible */}
                                    <button
                                        onClick={toggleMute}
                                        className={`p-2 rounded-full transition-all border ${isMuted ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-blue-600 border-blue-100 shadow-sm hover:shadow-md'}`}
                                        title={isMuted ? "Unmute Suara" : "Mute Suara"}
                                    >
                                        {isMuted ? '🔇' : '🔊'}
                                    </button>

                                    {/* Status Indicator */}
                                    <div className={`px-3 py-1.5 ${isOffline ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'} text-[10px] font-bold uppercase tracking-widest rounded-full border flex items-center gap-1.5`}>
                                        <span className={`w-2 h-2 ${isOffline ? 'bg-amber-400' : 'bg-emerald-500'} rounded-full ${isOffline ? 'animate-pulse' : ''}`}></span>
                                        {isOffline ? 'OFFLINE' : 'ONLINE'}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex items-center gap-3">
                                    {/* Lumi Avatar - Awake (✨) vs Sleeping (😴) vs Practice (🛠️) */}
                                    <div className={`${isOffline ? 'bg-gradient-to-br from-amber-400 to-orange-500' : (learningStyle === 'KINESTHETIC' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600')} text-white w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg border-4 border-white`}>
                                        {isExplaining ? '⏳' : isOffline ? '😴' : (learningStyle === 'KINESTHETIC' ? '🛠️' : '✨')}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                            {isExplaining
                                                ? 'Lumi sedang mengetik...'
                                                : isOffline
                                                    ? 'Lumi sedang beristirahat sejenak 💤'
                                                    : `Hai! Aku Lumi, Teman Belajarmu! 💙`}
                                        </h3>
                                        <p className={`${isOffline ? 'text-amber-600' : 'text-blue-600'} text-sm font-medium mt-0.5`}>
                                            {isExplaining
                                                ? 'Tunggu sebentar ya...'
                                                : isOffline
                                                    ? 'Gunakan catatan di bawah untuk membantumu! 📝'
                                                    : `Ini penjelasan khusus tentang ${topic} untukmu!`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="prose prose-slate prose-lg max-w-none text-slate-700 leading-relaxed font-medium">
                                {isExplaining ? (
                                    // Skeleton Loading
                                    <div className="space-y-4 animate-pulse">
                                        <div className="h-4 bg-blue-200/50 rounded w-3/4"></div>
                                        <div className="h-4 bg-blue-200/50 rounded w-full"></div>
                                        <div className="h-4 bg-blue-200/50 rounded w-5/6"></div>
                                        <div className="h-24 bg-blue-100/50 rounded-xl w-full mt-4"></div>
                                    </div>
                                ) : (
                                    <div className={`${isOffline ? 'bg-white/70' : 'bg-white/50'} p-6 rounded-2xl border ${isOffline ? 'border-amber-100' : 'border-blue-100'}`}>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath, remarkGfm]}
                                            rehypePlugins={[[rehypeKatex, { strict: false }]]}
                                            components={{
                                                // 1. Title (H1) - Centered & Bold
                                                h1: ({ node, ...props }: any) => <h1 className="text-3xl font-black text-slate-900 mb-8 pb-6 border-b-4 border-blue-50 text-center leading-tight" {...props} />,

                                                // 2. Sub-Heading (H2) - Emoji compatible & Clear separation
                                                h2: ({ node, ...props }: any) => <h2 className="text-xl font-bold text-slate-800 mt-10 mb-5 flex items-center gap-3 pb-2 border-b border-slate-100" {...props} />,

                                                // 3. Step Header (H3) - Structured Steps (LANGKAH X)
                                                h3: ({ node, ...props }: any) => <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mt-8 mb-4 flex items-center gap-2 before:content-[''] before:w-8 before:h-0.5 before:bg-blue-200" {...props} />,

                                                // 4. Smart Blockquote (Verification vs Tips)
                                                blockquote: ({ node, ...props }: any) => {
                                                    // Simple heuristic to detect Verification content
                                                    // Check if first paragraph text contains specific keywords
                                                    const textContent = node.children?.[0]?.children?.[0]?.value || "";
                                                    const isVerification = textContent.includes("buktikan") || textContent.includes("✅");

                                                    if (isVerification) {
                                                        return (
                                                            <div className="my-8 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-2xl p-6 relative overflow-hidden group">
                                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                                    <span className="text-6xl">✅</span>
                                                                </div>
                                                                <div className="relative z-10 flex gap-4">
                                                                    <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">✓</div>
                                                                    <blockquote className="text-slate-700 italic font-medium leading-loose" {...props} />
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    // Default: Tips / Info Box (Blue)
                                                    return (
                                                        <div className="my-8 bg-blue-50 border-l-4 border-blue-400 rounded-r-2xl p-6 relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                                <span className="text-6xl">💡</span>
                                                            </div>
                                                            <div className="relative z-10 flex gap-4">
                                                                <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">💡</div>
                                                                <blockquote className="text-slate-700 italic font-medium leading-loose" {...props} />
                                                            </div>
                                                        </div>
                                                    );
                                                },

                                                // 5. Highlight (Strong/Bold) - Yellow Background
                                                strong: ({ node, ...props }: any) => <span className="font-extrabold text-slate-900 bg-yellow-100 px-1.5 py-0.5 rounded box-decoration-clone" {...props} />,

                                                // 6. Spacing & Lists
                                                // FIXED: Use div instead of p to prevent <p><pre>...</pre></p> hydration error
                                                p: ({ node, ...props }: any) => <div className="leading-loose mb-6 text-lg text-slate-600 font-medium" {...props} />,
                                                ul: ({ node, ...props }: any) => <ul className="space-y-4 my-6 pl-2" {...props} />,
                                                li: ({ node, ...props }: any) => (
                                                    <li className="flex gap-3 items-start p-4 bg-white rounded-2xl shadow-sm border border-slate-50 hover:border-blue-100 transition-colors group">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2.5 shrink-0 group-hover:scale-125 transition-transform"></span>
                                                        <span className="leading-relaxed" {...props} />
                                                    </li>
                                                ),

                                                // 7. Inline Code & Tables
                                                code: ({ node, inline, className, children, ...props }: any) => {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return !inline ? (
                                                        <pre className="bg-slate-900 text-slate-50 p-6 rounded-2xl overflow-x-auto my-6 shadow-xl leading-relaxed">
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        </pre>
                                                    ) : (
                                                        <code className="bg-slate-100 text-blue-600 px-2 py-1 rounded-lg font-bold font-mono text-sm border border-slate-200" {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                                table: ({ node, ...props }: any) => <div className="overflow-x-auto my-8 rounded-xl border border-slate-200 shadow-sm"><table className="w-full text-left text-sm" {...props} /></div>,
                                                thead: ({ node, ...props }: any) => <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-widest" {...props} />,
                                                th: ({ node, ...props }: any) => <th className="px-6 py-4 font-black" {...props} />,
                                                td: ({ node, ...props }: any) => <td className="px-6 py-4 border-b border-slate-50" {...props} />,
                                            }}
                                        >
                                            {/* Fix: Ensure newlines are treated as block breaks by adding double newlines if needed, or unescaping \\n */}
                                            {explanation ? explanation.replace(/\\n/g, '\n').replace(/\n/g, '\n\n') : ''}
                                        </ReactMarkdown>
                                    </div>

                                )}
                            </div>

                            {!isExplaining && (
                                <div className="mt-8 pt-6 border-t border-slate-100/50 flex justify-between items-center gap-4">
                                    {/* Coba Lagi Nanti Button - Only show when offline */}
                                    {isOffline && (
                                        <button
                                            onClick={handleBingung}
                                            className="px-5 py-2.5 bg-amber-100 text-amber-700 font-bold rounded-xl border-2 border-amber-200 hover:bg-amber-200 hover:border-amber-300 transition-all text-sm uppercase tracking-widest shadow-sm flex items-center gap-2"
                                        >
                                            🔄 Coba Lagi
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setExplanation(null)}
                                        className={`px-6 py-3 bg-white text-slate-700 font-bold rounded-xl border-2 border-slate-100 hover:border-blue-400 hover:text-blue-700 transition-all text-sm uppercase tracking-widest shadow-sm hover:shadow-md ${!isOffline ? 'ml-auto' : ''}`}
                                    >
                                        Saya Paham, Lanjutkan Belajar 👍
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                    }

                    <div className="mt-auto pt-8 flex gap-4">
                        <button
                            onClick={handleBingung}
                            disabled={isExplaining}
                            className={`flex-1 py-4 rounded-2xl font-bold transition-all border
                            ${isExplaining
                                    ? 'bg-amber-50 text-amber-500 border-amber-200 cursor-not-allowed'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'}`}
                        >
                            {isExplaining ? '✨ Lumi sedang mengetik...' : '🤔 Saya Bingung'}
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
                </div >
            )}

            {/* PHASE: QUIZ */}
            {
                phase === 'QUIZ' && quizzes.length > 0 && (
                    <div className="p-8 sm:p-12 flex-1 flex flex-col">
                        <div className="mb-6 flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                                <span className="text-4xl font-black text-slate-300 mr-3">Q{currentQuizIndex + 1}</span>
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                                    Total {quizzes.length}
                                </span>
                            </div>
                            <button
                                onClick={() => handleSpeak(quizzes[currentQuizIndex].question)}
                                className="bg-white text-blue-600 p-3 rounded-full hover:bg-blue-50 border-2 border-slate-100 transition-all shadow-sm hover:scale-110 active:scale-95"
                                title="Bacakan Soal"
                            >
                                🔊
                            </button>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a] mb-8 leading-relaxed">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath, remarkGfm]}
                                rehypePlugins={[[rehypeKatex, { strict: false }]]}
                                components={{
                                    p: ({ node, ...props }) => <span {...props} />, // Render inline to avoid P inside H3
                                    code: ({ node, className, children, ...props }) => {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return match ? (
                                            <div className="my-2 bg-slate-900 text-slate-50 p-3 rounded-lg text-sm overflow-x-auto">
                                                <code className={className} {...props}>{children}</code>
                                            </div>
                                        ) : (
                                            <code className="bg-slate-100 px-1 py-0.5 rounded text-pink-500 font-mono text-sm" {...props}>
                                                {children}
                                            </code>
                                        )
                                    }
                                }}
                            >
                                {quizzes[currentQuizIndex].question}
                            </ReactMarkdown>
                        </h3>

                        <div className="space-y-4 mb-4 flex-1">
                            {quizzes[currentQuizIndex].options.map((opt, idx) => {
                                let buttonClass = "border-slate-100 hover:border-blue-200 hover:bg-slate-50 text-slate-600";

                                if (showFeedback) {
                                    if (idx === quizzes[currentQuizIndex].correctAnswer) {
                                        buttonClass = "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold";
                                    } else if (idx === selectedOption && !isCorrect) {
                                        buttonClass = "border-red-500 bg-red-50 text-red-700 font-bold";
                                    } else {
                                        buttonClass = "opacity-50 border-slate-100";
                                    }
                                } else if (selectedOption === idx) {
                                    buttonClass = "border-blue-600 bg-blue-50 text-blue-700 shadow-md";
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => !showFeedback && setSelectedOption(idx)}
                                        disabled={showFeedback}
                                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all font-medium text-lg ${buttonClass}`}
                                    >
                                        {opt}
                                    </button>
                                )
                            })}
                        </div>

                        {/* FEEDBACK BOX */}
                        {showFeedback && (
                            <div className={`mb-6 p-6 rounded-2xl animate-fade-in ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                                <h4 className={`font-bold text-lg mb-2 ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {isCorrect ? '🎉 Benar Sekali!' : '🤔 Kurang Tepat...'}
                                </h4>
                                <p className="text-slate-700">
                                    {quizzes[currentQuizIndex].explanation}
                                </p>
                            </div>
                        )}

                        {!showFeedback ? (
                            <button
                                onClick={handleAnswerQuiz}
                                disabled={selectedOption === null}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-1 transition-all"
                            >
                                Jawab Pertanyaan
                            </button>
                        ) : (
                            <button
                                onClick={handleNextQuestion}
                                className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-slate-700 hover:-translate-y-1 transition-all"
                            >
                                {currentQuizIndex < quizzes.length - 1 ? 'Pertanyaan Berikutnya ➡' : 'Lihat Hasil Akhir 🏁'}
                            </button>
                        )}
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
                                        level >= 5 ? (
                                            // CASE: KAMPION MATEMATIKA (Level 5 Passed)
                                            (() => {
                                                let nextTarget = 'dashboard';
                                                let nextLabel = 'KEMBALI KE DASHBOARD 🏠';

                                                if (topic?.toLowerCase().includes('aljabar')) {
                                                    nextTarget = 'Geometri';
                                                    nextLabel = 'LANJUT KE GEOMETRI 📐';
                                                } else if (topic?.toLowerCase().includes('geometri')) {
                                                    nextTarget = 'Trigonometri';
                                                    nextLabel = 'LANJUT KE TRIGONOMETRI 📐';
                                                }

                                                return (
                                                    <>
                                                        <div className="w-full bg-emerald-100 border-2 border-emerald-400 p-4 rounded-xl text-emerald-800 mb-4 text-center animate-bounce shadow-lg">
                                                            <h3 className="font-black text-xl mb-1">👑 KAMPION MATEMATIKA!</h3>
                                                            <p className="text-sm font-medium">Lumi bangga sekali padamu! Kamu sudah menaklukkan seluruh tantangan {topic} dengan hebat!</p>
                                                        </div>

                                                        <button
                                                            onClick={() => onSessionComplete && onSessionComplete({
                                                                success: true,
                                                                nextLevel: 6, // Mastery
                                                                emotion: sentiment,
                                                                decision: 'NEXT_TOPIC',
                                                                action: 'SWITCH_TOPIC',
                                                                target: nextTarget
                                                            })}
                                                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-200 hover:scale-105 transition-all text-lg"
                                                            disabled={nextTarget === 'dashboard'} // Optional: disable if just dashboard, forcing use of bottom button? No, allow it.
                                                        >
                                                            {nextLabel}
                                                        </button>
                                                    </>
                                                );
                                            })()
                                        ) : (
                                            // Case: High Score (>80%) - Normal Level
                                            isAnxious ? (
                                                // Sub-case: Prioritize Confidence
                                                <>
                                                    <div className="w-full bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm text-blue-800 mb-2 text-left animate-fade-in">
                                                        <strong>Saran AI:</strong> Nilaimu bagus, tapi sepertinya kamu masih ragu. Mau memantapkan materi dulu? (Direkomendasikan)
                                                    </div>

                                                    <button
                                                        onClick={handleRestart}
                                                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all border-2 border-blue-400"
                                                    >
                                                        Ulangi Kuis & Pelajari Materi (Rekomendasi) 🌟
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
                    </div >
                )
            }
        </div >
    );
}
