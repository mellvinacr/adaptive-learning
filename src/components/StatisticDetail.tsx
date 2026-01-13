import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';

interface StatisticDetailProps {
    user: any;
    onBack: () => void;
}

export default function StatisticDetail({ user, onBack }: StatisticDetailProps) {
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<any[]>([]);
    const [emotionData, setEmotionData] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [insightLoading, setInsightLoading] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                // Fetch last 50 sessions for accurate trends
                const q = query(collection(db, 'users', user.uid, 'sessions'), orderBy('timestamp', 'desc'), limit(50));
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => doc.data());
                setSessions(data);

                processChartData(data);
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const processChartData = (data: any[]) => {
        // 1. Emotion Radar Data (Plutchik 8)
        const emotionCounts: Record<string, number> = {
            Joy: 0, Trust: 0, Fear: 0, Surprise: 0,
            Sadness: 0, Disgust: 0, Anger: 0, Anticipation: 0
        };

        let totalEmotions = 0;
        data.forEach(session => {
            // Normalize emotion string if needed (e.g. "Joy" vs "joy")
            // Assuming session.emotion is stored as capitalized string or we map it
            // For now, simple matching
            const e = session.emotion;
            if (e && Object.keys(emotionCounts).includes(e)) {
                emotionCounts[e]++;
                totalEmotions++;
            } else if (e) {
                // Try to map approximate or fallback
                // e.g. "Happy" -> "Joy"
                if (e.includes('Happy')) emotionCounts['Joy']++;
                else if (e.includes('Anxious')) emotionCounts['Fear']++;
                // ... add more mappings if needed
            }
        });

        // Convert to Recharts format (normalize to 0-100 scale or raw count)
        // Using frequency for now
        const radarData = Object.keys(emotionCounts).map(key => ({
            subject: key,
            A: emotionCounts[key],
            fullMark: Math.max(...Object.values(emotionCounts)) + 2 // Dynamic scaling
        }));
        setEmotionData(radarData);

        // 2. Trend Line Data (Last 7 Days)
        // Group by Date
        const statsByDate: Record<string, { totalScore: number, count: number, learningTime: number }> = {};

        // Mocking learning time per session since we might not track it precisely yet
        // Let's assume each session is ~10 mins (0.16 hours) for now if not present
        data.reverse().forEach(session => { // Process oldest to newest
            if (!session.timestamp) return;
            const date = new Date(session.timestamp.seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

            if (!statsByDate[date]) {
                statsByDate[date] = { totalScore: 0, count: 0, learningTime: 0 };
            }

            statsByDate[date].totalScore += (session.score || 0);
            statsByDate[date].count += 1;
            statsByDate[date].learningTime += (session.durationSeconds ? session.durationSeconds / 3600 : 0.2); // Default 0.2h if missing
        });

        const lineData = Object.keys(statsByDate).slice(-7).map(date => ({
            name: date,
            accuracy: Math.round(statsByDate[date].totalScore / statsByDate[date].count),
            hours: parseFloat(statsByDate[date].learningTime.toFixed(1))
        }));
        setTrendData(lineData);

        // 3. Generate AI Insight if we have data
        if (data.length > 0) {
            generateInsight(radarData, lineData);
        }
    };

    const generateInsight = async (eData: any[], tData: any[]) => {
        setInsightLoading(true);
        try {
            // Prepare summary for AI
            const topEmotion = eData.reduce((prev, current) => (prev.A > current.A) ? prev : current).subject;
            const avgAccuracy = tData.reduce((sum, item) => sum + item.accuracy, 0) / tData.length || 0;

            const res = await fetch('/api/adaptive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'REPORT',
                    text: `Analyze this student: Dominant Emotion: ${topEmotion}. Average Accuracy: ${Math.round(avgAccuracy)}%. Trend data available.`,
                    topic: 'General Progress',
                    style: 'Normal' // Not used for report but required by schema
                })
            });
            const json = await res.json();
            if (json.explanation) {
                setAiInsight(json.explanation);
                setIsOffline(json.isOffline || false);
            }
        } catch (e) {
            console.error("AI Insight failed", e);
            // Fallback insight when API fails
            setAiInsight("**Analisis Offline**: Berdasarkan data yang tersimpan, kamu menunjukkan konsistensi dalam belajar. Terus pertahankan ritme ini! Fokus pada topik yang membuatmu sedikit cemas untuk meningkatkan kepercayaan diri.");
            setIsOffline(true);
        } finally {
            setInsightLoading(false);
        }
    };

    if (loading) return <div className="min-h-[50vh] flex items-center justify-center text-slate-400 font-bold">Loading Statistics...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900">Analisis Performa & Emosi 🧠</h2>
                    <p className="text-slate-500 font-medium">Laporan mendalam tentang gaya belajar dan psikologimu.</p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all
                    ${isOffline ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}
                `}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`}></div>
                    {isOffline ? '📦 Offline Mode' : 'Real-time Sync'}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Radar Chart - Emotions */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
                    <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                        <span className="text-2xl">❤️</span> Peta Emosi Belajar (Plutchik)
                    </h3>
                    <div className="h-[300px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={emotionData}>
                                <PolarGrid gridType="polygon" stroke="#f1f5f9" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                <Radar
                                    name="Intensitas"
                                    dataKey="A"
                                    stroke="#2563eb"
                                    strokeWidth={3}
                                    fill="#3b82f6"
                                    fillOpacity={0.3}
                                />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Decorative Blob */}
                    <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
                </div>

                {/* 2. Line Chart - Trends */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
                    <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                        <span className="text-2xl">📈</span> Tren Akurasi & Fokus
                    </h3>
                    <div className="h-[300px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line
                                    type="monotone"
                                    dataKey="accuracy"
                                    name="Akurasi (%)"
                                    stroke="#2563eb"
                                    strokeWidth={4}
                                    dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="hours"
                                    name="Waktu (Jam)"
                                    stroke="#10b981"
                                    strokeWidth={4}
                                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 3. AI Insights Card */}
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1e293b] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/10">
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl border border-white/10 backdrop-blur-md">
                            🤖
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">Laporan Psikologis AI</h3>
                            <p className="text-slate-400 text-sm font-medium">Analisis personal berdasarkan datamu.</p>
                        </div>
                    </div>

                    <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-lg">
                        {insightLoading ? (
                            <div className="flex items-center gap-2 animate-pulse text-slate-400">
                                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                Sedang menganalisis pola belajar...
                            </div>
                        ) : (
                            <ReactMarkdown>
                                {aiInsight || "Belum cukup data untuk memberikan analisis mendalam. Teruskan belajarmu!"}
                            </ReactMarkdown>
                        )}
                    </div>
                </div>
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -ml-12 -mb-12"></div>
            </div>

            {/* Back Button (Usually handled by Dashboard state, but good to have) */}
            <div className="flex justify-center pt-8 pb-20">
                <button onClick={onBack} className="text-slate-400 font-bold hover:text-blue-600 transition-colors uppercase tracking-widest text-sm">
                    Kembali ke Dashboard
                </button>
            </div>
        </div>
    );
}
