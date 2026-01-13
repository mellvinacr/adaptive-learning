import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';

interface StatisticDetailProps {
    user: any;
    onBack: () => void;
}

export default function StatisticDetail({ user, onBack }: StatisticDetailProps) {
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<any[]>([]);
    const [emotionData, setEmotionData] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [topicMastery, setTopicMastery] = useState<Record<string, number>>({});
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [insightLoading, setInsightLoading] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Student Profile
    const [dominantStyle, setDominantStyle] = useState("VISUAL");
    const [totalStudyHours, setTotalStudyHours] = useState("0");
    const [weakAreas, setWeakAreas] = useState<any[]>([]);

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

        // Student Profile Stats
        const styleCounts: Record<string, number> = { VISUAL: 0, AUDITORY: 0, KINESTHETIC: 0 };
        let totalTimeSeconds = 0;

        let totalEmotions = 0;
        data.forEach(session => {
            const e = session.emotion;
            if (e && Object.keys(emotionCounts).includes(e)) {
                emotionCounts[e]++;
                totalEmotions++;
            } else if (e) {
                // Fallback Mapping
                if (e.includes('Happy') || e.includes('Confident')) emotionCounts['Joy']++;
                else if (e.includes('Anxious') || e.includes('Bingung')) emotionCounts['Fear']++;
                else if (e.includes('Curious')) emotionCounts['Anticipation']++;
                else if (e.includes('Frustrated')) emotionCounts['Anger']++;
            }

            // Learning Style Count
            if (session.learningStyle) {
                const style = session.learningStyle.toUpperCase();
                if (styleCounts[style] !== undefined) styleCounts[style]++;
            }

            // Total Time
            if (session.durationSeconds) {
                totalTimeSeconds += session.durationSeconds;
            } else {
                // Legacy fallback (estimate 15 mins per session)
                totalTimeSeconds += 15 * 60;
            }
        });

        const radarData = Object.keys(emotionCounts).map(key => ({
            subject: key,
            A: emotionCounts[key],
            fullMark: Math.max(...Object.values(emotionCounts)) + 2
        }));
        setEmotionData(radarData);

        // Calculate Dominant Style
        const dominantStyle = Object.keys(styleCounts).reduce((a, b) => styleCounts[a] > styleCounts[b] ? a : b);
        const totalHours = (totalTimeSeconds / 3600).toFixed(1);

        // 2. Trend Line Data & Topic Mastery
        const statsByDate: Record<string, { totalScore: number, count: number, learningTime: number }> = {};
        const topicLevels: Record<string, number> = {};

        data.slice().reverse().forEach(session => {
            // Trend Data
            if (session.timestamp) {
                const date = new Date(session.timestamp.seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                if (!statsByDate[date]) statsByDate[date] = { totalScore: 0, count: 0, learningTime: 0 };

                statsByDate[date].totalScore += (session.score || 0);
                statsByDate[date].count += 1;
                statsByDate[date].learningTime += (session.durationSeconds ? session.durationSeconds / 3600 : 0.2);
            }

            // Topic Mastery (Max Level)
            if (session.topicId || (session.topic && typeof session.topic === 'string')) {
                // Normalize topicId (e.g. 'aljabar-linear' -> 'Aljabar')
                const rawTopic = session.topicId || session.topic;
                const topicName = rawTopic.charAt(0).toUpperCase() + rawTopic.slice(1);

                if (!topicLevels[topicName] || session.level > topicLevels[topicName]) {
                    topicLevels[topicName] = session.level;
                }
            }
        });

        const lineData = Object.keys(statsByDate).slice(-7).map(date => ({
            name: date,
            accuracy: Math.round(statsByDate[date].totalScore / statsByDate[date].count),
            hours: parseFloat(statsByDate[date].learningTime.toFixed(1))
        }));

        setTrendData(lineData);
        setTopicMastery(topicLevels);

        // 3. Process Weak Areas (Top 3 Wrong Questions)
        const wrongQuestions: Record<string, { count: number, question: string }> = {};
        data.forEach(session => {
            if (session.answers) {
                Object.values(session.answers).forEach((ans: any) => {
                    if (!ans.correct) {
                        const qRaw = ans.question || "";
                        // Simple cleaning to group similar questions
                        const qKey = qRaw.substring(0, 50);
                        if (!wrongQuestions[qKey]) wrongQuestions[qKey] = { count: 0, question: qRaw };
                        wrongQuestions[qKey].count++;
                    }
                });
            }
        });

        const topWeaknesses = Object.values(wrongQuestions)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        setWeakAreas(topWeaknesses);

        // 4. Generate AI Insight
        if (data.length > 0) {
            generateInsight(radarData, lineData, topicLevels, dominantStyle, totalHours);
        }
    };

    const handleSpeak = (text: string) => {
        if (isMuted) {
            window.speechSynthesis?.cancel();
            return;
        }

        if ('speechSynthesis' in window) {
            // Cancel any current speaking
            window.speechSynthesis.cancel();

            // Persona Intro Injection
            // Only add intro if it's not already in the text
            let textToSpeak = text;
            if (!text.toLowerCase().includes("lumi")) {
                textToSpeak = "Halo! Teman Belajar. Aku Lumi. Berikut analisis belajarmu. " + text;
            }

            // Strip Markdown for clean speech
            const cleanText = textToSpeak
                .replace(/\*\*/g, '')
                .replace(/###/g, '')
                .replace(/>/g, '')
                .replace(/`/g, '')
                .replace(/-/g, ' poin ');

            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'id-ID';
            utterance.rate = 1.0;
            utterance.pitch = 1.1; // Friendly tone

            window.speechSynthesis.speak(utterance);
        }
    };

    const toggleMute = () => {
        if (!isMuted) {
            window.speechSynthesis.cancel(); // Stop immediately on mute
        }
        setIsMuted(prev => !prev);
    };

    const generateInsight = async (eData: any[], tData: any[], topicLevels: Record<string, number>, domStyle: string, totalHrs: string) => {
        setInsightLoading(true);
        // Set local state for UI
        setDominantStyle(domStyle);
        setTotalStudyHours(totalHrs);

        try {
            const topEmotion = eData.reduce((prev, current) => (prev.A > current.A) ? prev : current).subject;
            const avgAccuracy = tData.reduce((sum: number, item: any) => sum + item.accuracy, 0) / tData.length || 0;
            const emotionSummary = eData.map(e => `${e.subject}: ${e.A}`).join(', ');
            const topicSummary = Object.entries(topicLevels).map(([t, l]) => `${t} (Level ${l})`).join(', ');

            const res = await fetch('/api/adaptive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'REPORT',
                    text: `
USER PROFILE:
- Gaya Belajar Dominan: ${domStyle}
- Total Jam Belajar: ${totalHrs} jam
- Emosi Dominan (Plutchik): ${topEmotion}
- Peta Emosi: ${emotionSummary}
- Rata-rata Akurasi: ${Math.round(avgAccuracy)}%
- Penguasaan Topik: ${topicSummary || "Belum ada data topik spesifik"}

INSTRUCTION:
Sebagai Lumi, berikan analisis mendalam dan personal (maksimal 2 paragraf).
1. Hubungkan Gaya Belajar (${domStyle}) dengan performa mereka.
2. Analisis hubungan Emosi (${topEmotion}) dengan hasil belajar.
3. Berikan saran spesifik untuk materi selanjutnya berdasarkan top level (${topicSummary}).
Gunakan bahasa yang memotivasi dan hangat.`,
                    topic: 'Laporan Progres',
                    style: 'VISUAL'
                })
            });

            const json = await res.json();
            if (json.explanation) {
                setAiInsight(json.explanation);
                setIsOffline(json.isOffline || false);
                // Auto-speak if not muted? Better let user click play.
            }
        } catch (e) {
            console.error("AI Insight failed", e);
            setAiInsight(`### ✨ Hai! Lumi Offline Mode

                ** Lumi sedang beristirahat 😴**
                    Tapi data belajarmu aman! Kamu sudah mencapai progress hebat di:
${Object.entries(topicLevels).map(([t, l]) => `- **${t}**: Level ${l}`).join('\n')}

Terus semangat! 💡`);
            setIsOffline(true);
        } finally {
            setInsightLoading(false);
        }
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Header Background
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, pageWidth, 50, 'F');

        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');
        doc.text('Laporan Perkembangan', pageWidth / 2, 25, { align: 'center' });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(`${user?.displayName || 'Siswa Hebat'} | ${today} `, pageWidth / 2, 40, { align: 'center' });

        doc.setTextColor(30, 41, 59);
        let yPos = 70;

        // 1. Topic Mastery Section
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('🏆 Capaian Materi', 20, yPos);
        yPos += 12;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        if (Object.keys(topicMastery).length > 0) {
            Object.entries(topicMastery).forEach(([topic, level]) => {
                doc.setDrawColor(226, 232, 240);
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(20, yPos, pageWidth - 40, 12, 2, 2, 'FD');

                doc.text(`${topic} `, 25, yPos + 8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(37, 99, 235);
                doc.text(`Level ${level} `, pageWidth - 30, yPos + 8, { align: 'right' });
                doc.setTextColor(30, 41, 59);
                doc.setFont('helvetica', 'normal');

                yPos += 16;
            });
        } else {
            doc.text('- Belum ada data topik.', 25, yPos);
            yPos += 10;
        }
        yPos += 10;

        // 2. Emotion & Trends Summary
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('📊 Analisis Emosi & Tren', 20, yPos);
        yPos += 12;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const topEmotion = emotionData.length > 0
            ? emotionData.reduce((p, c) => (p.A > c.A) ? p : c).subject
            : 'Netral';

        doc.text(`• Emosi Dominan: ${topEmotion} `, 25, yPos);
        yPos += 8;
        doc.text(`• Rata - rata Akurasi: ${trendData.length > 0 ? trendData[trendData.length - 1].accuracy : 0}% `, 25, yPos);
        yPos += 15;

        // 3. Lumi Insight
        if (aiInsight) {
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('💡 Rekomendasi Lumi', 20, yPos);
            yPos += 12;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(71, 85, 105);

            const cleanText = aiInsight.replace(/[#*`]/g, '');
            const lines = doc.splitTextToSize(cleanText, pageWidth - 40);
            doc.text(lines, 20, yPos);
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('MathFlow AI - Platform Belajar Adaptif', pageWidth / 2, 280, { align: 'center' });

        doc.save(`Laporan_Lumi_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (loading) return <div className="min-h-[50vh] flex items-center justify-center text-slate-400 font-bold">Mengambil Data Pembelajaran...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900">Analisis Performa &amp; Emosi 🧠</h2>
                    <p className="text-slate-500 font-medium">Laporan mendalam tentang gaya belajar dan psikologimu.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* PDF Download Button */}
                    <button
                        onClick={exportToPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm uppercase tracking-wider transition-all shadow-sm hover:shadow-md"
                    >
                        📄 Unduh PDF
                    </button>
                    {/* Sync Status */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all
                        ${isOffline ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}
                    `}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'} `}></div>
                        {isOffline ? '📦 Offline Mode' : 'Real-time Sync'}
                    </div>
                </div>
            </div>

            {/* 0. STUDENT PROFILE SUMMARY */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full opacity-50 -mr-16 -mt-16 blur-2xl"></div>

                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-4xl shadow-xl shadow-indigo-200 animate-fade-in-up">
                        {dominantStyle === 'VISUAL' ? '🎨' : dominantStyle === 'AUDITORY' ? '🎧' : '🛠️'}
                    </div>
                    <div>
                        <div className="text-sm font-bold text-indigo-400 tracking-widest uppercase mb-1">Gaya Belajar</div>
                        <h3 className="text-3xl font-black text-slate-900">{dominantStyle} Learner</h3>
                        <p className="text-slate-500 font-medium">Kamu paling cepat paham lewat {dominantStyle === 'VISUAL' ? 'Gambar & Visual' : dominantStyle === 'AUDITORY' ? 'Suara & Cerita' : 'Praktek Langsung'}.</p>
                    </div>
                </div>

                <div className="flex gap-8 relative z-10">
                    <div className="text-right">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total Fokus</div>
                        <div className="text-4xl font-black text-slate-900">{totalStudyHours}<span className="text-lg text-slate-400 ml-1">Jam</span></div>
                    </div>
                    <div className="w-px bg-slate-100 h-16"></div>
                    <div className="text-right">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Badge</div>
                        <div className="text-4xl font-black text-slate-900">
                            {Object.entries(topicMastery).some(([_, l]) => l >= 5) ? '🥇' : '🌱'}
                        </div>
                    </div>
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


                {/* 3. Top Weaknesses - "Focus Zone" */}
                <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-rose-100 relative overflow-hidden">
                    <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                        <span className="text-2xl">🎯</span> Zona Fokus (Perlu Latihan)
                    </h3>

                    {weakAreas.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {weakAreas.map((item, idx) => (
                                <div key={idx} className="bg-rose-50 p-6 rounded-2xl border border-rose-100 flex flex-col">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-8 h-8 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <div className="text-xs font-bold text-rose-400 uppercase tracking-widest">
                                            {item.count}x Salah
                                        </div>
                                    </div>
                                    <p className="text-slate-700 font-medium text-sm line-clamp-3">
                                        "{item.question}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            <div className="text-4xl mb-4">🌟</div>
                            <h4 className="font-bold text-slate-400">Belum ada materi yang sering salah. Pertahankan!</h4>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Lumi AI Insights Card - FLO PERSONA UI */}
            <div className={`rounded-[3rem] p-10 relative overflow-hidden border transition-all duration-500
                ${isOffline
                    ? 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200'
                    : 'bg-gradient-to-br from-[#2563eb] to-[#1e40af] text-white shadow-2xl shadow-blue-900/20 border-white/10'
                }`}>

                {/* Mute Control */}
                <div className="absolute top-8 right-8 flex items-center gap-3 z-30">
                    <button
                        onClick={toggleMute}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/20
                            ${isOffline ? 'bg-white text-slate-400 shadow-sm' : 'bg-white/10 text-white hover:bg-white/20'}
                        `}
                    >
                        {isMuted ? '🔇' : '🔊'}
                    </button>
                    {!insightLoading && (
                        <div className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5
                            ${isOffline ? 'bg-white text-slate-500 border-slate-200' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}
                        `}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-slate-400' : 'bg-emerald-400 animate-pulse'}`}></span>
                            {isOffline ? 'OFFLINE' : 'ONLINE'}
                        </div>
                    )}
                </div>

                <div className="relative z-20 flex flex-col md:flex-row gap-8 items-start">
                    {/* Lumi Avatar - Modern 3D Style */}
                    <div className="flex-shrink-0 relative group cursor-pointer" onClick={() => aiInsight && handleSpeak(aiInsight)}>
                        <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-5xl shadow-2xl border-4 transform transition-transform group-hover:scale-105
                            ${isOffline
                                ? 'bg-slate-200 border-white text-slate-400 grayscale'
                                : 'bg-white border-white/20 text-blue-600'
                            }`}>
                            {insightLoading ? '⏳' : isOffline ? '😴' : '🤖'}
                        </div>
                        {!isOffline && (
                            <div className="absolute -bottom-2 -right-2 bg-emerald-400 w-6 h-6 rounded-full border-4 border-[#1e40af]"></div>
                        )}
                    </div>

                    {/* Text Content */}
                    <div className="flex-1">
                        <div className="mb-4">
                            <h3 className={`text-2xl font-black mb-1 ${isOffline ? 'text-slate-700' : 'text-white'}`}>
                                {isOffline ? 'Lumi Sedang Istirahat...' : 'Lumi Smart Insights'}
                            </h3>
                            <p className={`text-sm font-medium opacity-80 ${isOffline ? 'text-slate-500' : 'text-blue-100'}`}>
                                {isOffline
                                    ? 'Cek koneksi internetmu untuk analisis real-time.'
                                    : 'Analisis Emosi & Strategi Belajar Personal'}
                            </p>
                        </div>

                        <div className={`prose max-w-none text-lg leading-relaxed rounded-2xl p-6 backdrop-blur-sm border
                            ${isOffline
                                ? 'bg-white border-slate-100 prose-slate'
                                : 'bg-white/10 border-white/10 prose-invert text-blue-50'
                            }`}>
                            {insightLoading ? (
                                <div className="flex items-center gap-3 animate-pulse">
                                    <span>✍️</span>
                                    <span>Menulis laporan ulasan untukmu...</span>
                                </div>
                            ) : (
                                <ReactMarkdown>
                                    {isOffline ? 'Koneksi terputus. Menggunakan data lokal.' : aiInsight ? aiInsight : 'Sedang menganalisis datamu...'}
                                </ReactMarkdown>
                            )}
                        </div>
                    </div>
                </div>

                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
            </div>

            {/* 4. SUCCESS & NEXT STEPS */}
            {
                Object.entries(topicMastery).some(([t, l]) => t === 'Aljabar' && l >= 5) && (
                    <div className="mt-8 p-8 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-[2.5rem] shadow-xl shadow-emerald-200 text-white relative overflow-hidden animate-bounce-slow">
                        <div className="absolute top-0 right-0 opacity-10 text-[10rem] font-black -mr-10 -mt-10">GO</div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h3 className="text-3xl font-black mb-2">🎉 Luar Biasa! Aljabar Tamat!</h3>
                                <p className="text-emerald-50 text-lg font-medium max-w-xl">
                                    Kamu telah menguasai fundamental Aljabar dengan sangat baik. Dunia Geometri yang penuh bentuk visual sudah menantimu!
                                </p>
                            </div>
                            <button
                                onClick={onBack}
                                className="px-8 py-4 bg-white text-emerald-600 font-black rounded-2xl shadow-lg hover:scale-105 transition-transform text-lg"
                            >
                                Lanjut ke Geometri 📐
                            </button>
                        </div>
                    </div>
                )
            }

            <div className="text-center pt-8 pb-4">
                <button onClick={onBack} className="text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest text-sm transition-colors">
                    Kembali ke Dashboard
                </button>
            </div>
        </div >
    );
}
