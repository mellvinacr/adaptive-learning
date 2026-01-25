import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';

interface StatisticDetailProps {
    user: any;
    onBack: () => void;
    onNavigate?: (topicId: string) => void;
}

export default function StatisticDetail({ user, onBack, onNavigate }: StatisticDetailProps) {
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
            const latestTimestamp = data[0].timestamp ? data[0].timestamp.seconds * 1000 : 0;
            generateInsight(radarData, lineData, topicLevels, dominantStyle, totalHours, latestTimestamp);
        }
    };

    // Refactored Generator to Support Cache Saving
    const generateInsight = async (eData: any[], tData: any[], topicLevels: Record<string, number>, domStyle: string, totalHrs: string, latestSessionTime: number, forceRefresh = false) => {
        // Validation: If already loading, skip
        if (insightLoading) return;

        const CACHE_KEY = `lumi_insight_${user?.uid}`;

        // SMART CHECK inside the generator (if called directly)
        if (!forceRefresh) {
            const cachedRaw = localStorage.getItem(CACHE_KEY);
            if (cachedRaw) {
                const cache = JSON.parse(cachedRaw);
                const cacheTime = cache.timestamp || 0;

                // Comparing: Is Cache created AFTER the latest session?
                // If CacheTime > LatestSessionTime => Cache contains the latest "knowledge".
                if (cacheTime > latestSessionTime) {
                    console.log("⚡ [CACHE HIT] Insight is fresh. Using local storage.");
                    setAiInsight(cache.data);
                    setIsOffline(cache.isOffline);
                    setInsightLoading(false);
                    return;
                }
                console.log("🔄 [REFRESH] New session detected since last cache. Regenerating...");
            }
        }

        setInsightLoading(true);
        setDominantStyle(domStyle);
        setTotalStudyHours(totalHrs);

        // Persiapan konteks data untuk AI
        const weakList = weakAreas.map(w => `- Materi: "${w.question}" (${w.count}x kesalahan)`).join('\n') || "Luar biasa! Tidak ada pola kesalahan yang menonjol.";
        const topicSummary = Object.entries(topicLevels).map(([t, l]) => `${t} (Level ${l})`).join(', ');
        const topEmotions = eData.filter((e: any) => e.A > 0).map((e: any) => `${e.subject} (Skor: ${e.A})`).join(', ');

        try {
            const res = await fetch('/api/adaptive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'REPORT',
                    text: `
SISTEM INSTRUKSI: Anda adalah Lumi, mentor AI jenius. Tugas Anda adalah membuat LAPORAN ANALISIS NARATIF YANG PANJANG DAN MENDALAM (minimal 4 paragraf besar).

DATA INPUT SISWA:
- Gaya Belajar: ${domStyle}
- Waktu Belajar: ${totalHrs} Jam
- Emosi Dominan: ${topEmotions}
- Penguasaan Materi: ${topicSummary}
- Catatan Kesalahan: ${weakList}

STRUKTUR LAPORAN WAJIB (Gunakan Markdown):

# 🌟 Laporan Analisis Kampion Matematika Anda

### 🧠 Analisis Psikologi & Kesiapan Belajar
Bedah hubungan antara emosi ${topEmotions} dengan gaya belajar ${domStyle}. Jelaskan secara ilmiah namun hangat bagaimana perasaan ini memengaruhi penyerapan materi. Jika ada 'Joy', jelaskan bahwa siswa berada dalam kondisi "Flow". Jika ada 'Fear', berikan validasi emosional bahwa tantangan adalah bagian dari pertumbuhan.

### 📐 Bedah Teknis Performa Kurikulum
Evaluasi penguasaan pada topik: ${topicSummary}.
- **Geometri**: Gunakan referensi dari Geometri.pdf. Bahas pemahaman tentang unsur tidak didefinisikan (titik/garis) atau Kaidah Euler (S+T=R+2) jika relevan[cite: 76, 704].
- **Trigonometri**: Gunakan referensi dari Trigonometri.docx. Bahas penguasaan konsep SinDemi, KosSami, TanDesa, atau Sudut Elevasi[cite: 14, 55].
Sebutkan secara spesifik di bagian mana siswa tampil sangat kuat.

### 💡 Strategi Perbaikan & Saran Personal
Berikan minimal 3 saran taktis yang sangat spesifik untuk memperbaiki kesalahan berikut:
${weakList}
Saran harus disesuaikan dengan gaya belajar ${domStyle}. Contoh: Untuk Visual, sarankan membuat peta konsep warna-warni. Untuk Kinestetik, sarankan mempraktikkan sudut dengan benda nyata.

### 🚀 Pesan Motivasi & Langkah Kedepan
Berikan paragraf penutup yang panjang dan sangat menginspirasi. Katakan mengapa mereka sudah siap menjadi 'Kampion' sejati di topik berikutnya.

NADA: Sangat Detail, Profesional, Empatik, dan Menginspirasi. DILARANG MEMBERIKAN JAWABAN PENDEK.`,
                    topic: 'Evaluasi Progres Belajar',
                    style: domStyle
                })
            });

            const json = await res.json();
            if (json.explanation) {
                setAiInsight(json.explanation);
                setIsOffline(json.isOffline || false);

                // SAVE TO CACHE
                const cacheData = {
                    data: json.explanation,
                    timestamp: Date.now(), // Save "Now" as the generation time
                    isOffline: json.isOffline || false
                };
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            }
        } catch (e) {
            console.error("AI Insight gagal:", e);
            const fallbackText = `### 📦 Analisis Progres Lokal\nLumi saat ini sedang mengkalibrasi data besar, namun berdasarkan catatan lokal, dedikasi belajarmu selama **${totalHrs} jam** pada materi **${topicSummary}** menunjukkan potensi besar untuk menjadi ahli matematika!`;
            setAiInsight(fallbackText);
            setIsOffline(true);
            // Verify if we should cache fallback? Maybe not, to allow retry.
            // But for PDF reliability, caching fallback is better than nothing.
            const cacheData = {
                data: fallbackText,
                timestamp: Date.now(),
                isOffline: true
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

        } finally {
            setInsightLoading(false);
        }
    };

    const toggleMute = () => {
        if (!isMuted) {
            window.speechSynthesis.cancel(); // Stop immediately on mute
        }
        setIsMuted(prev => !prev);
    };

    // Advanced Text-to-Speech with Chunking for Long Text
    const handleSpeak = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop valid utterances

            // Strip markdown for cleaner reading
            const cleanText = text.replace(/[#*`]/g, '').replace(/\$\$/g, '').replace(/\$/g, ' ');

            // Split into sentences/chunks (max 150 chars roughly or by punctuation)
            const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];

            sentences.forEach((sentence, index) => {
                const utterance = new SpeechSynthesisUtterance(sentence.trim());
                utterance.lang = 'id-ID';
                utterance.rate = 1.0;
                utterance.pitch = 1.1; // Slightly higher for Lumi's cheerfulness

                // Add slight pause between paragraphs/sentences
                if (index < sentences.length - 1) {
                    // utterance.onend handled automatically by queue
                }

                window.speechSynthesis.speak(utterance);
            });

            setIsMuted(false);
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
                    <p className="text-slate-500 font-medium">Laporan mendalam tentang pola belajarmu.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* PDF Download Button */}
                    <button
                        onClick={exportToPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm uppercase tracking-wider transition-all shadow-sm hover:shadow-md"
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
            <div className="bg-[#020617] rounded-[2rem] p-10 shadow-[0_0_30px_rgba(59,130,246,0.15)] border border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden text-white group hover:shadow-[0_0_50px_rgba(59,130,246,0.25)] transition-all duration-500">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full opacity-50 -mr-16 -mt-16 blur-2xl animate-pulse"></div>

                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-24 h-24 rounded-full bg-slate-950 border-2 border-blue-500/30 flex items-center justify-center text-4xl shadow-[0_0_15px_rgba(59,130,246,0.2)] animate-fade-in-up">
                        {dominantStyle === 'VISUAL' ? '🎨' : dominantStyle === 'AUDITORY' ? '🎧' : '🛠️'}
                    </div>
                    <div>
                        <div className="text-sm font-bold text-blue-400 tracking-widest uppercase mb-1 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">Gaya Belajar</div>
                        <h3 className="text-3xl font-black text-white">{dominantStyle} Learner</h3>
                        <p className="text-blue-200/60 font-medium">Kamu paling cepat paham lewat {dominantStyle === 'VISUAL' ? 'Gambar & Visual' : dominantStyle === 'AUDITORY' ? 'Suara & Cerita' : 'Praktek Langsung'}.</p>
                    </div>
                </div>

                <div className="flex gap-8 relative z-10">
                    <div className="text-right">
                        <div className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-1">Total Fokus</div>
                        <div className="text-4xl font-black text-white">{totalStudyHours}<span className="text-lg text-slate-500 ml-1">Jam</span></div>
                    </div>
                    <div className="w-px bg-blue-500/20 h-16"></div>
                    <div className="text-right">
                        <div className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-1">Badge</div>
                        <div className="text-4xl font-black text-white">
                            {Object.entries(topicMastery).some(([_, l]) => l >= 5) ? '🥇' : '🌱'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Radar Chart - Emotions */}
                <div className="bg-[#020617] p-8 rounded-[2.5rem] shadow-[0_0_30px_rgba(59,130,246,0.15)] border border-blue-500/30 relative overflow-hidden">
                    <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                        <span className="text-2xl">❤️</span> Peta Emosi Belajar
                    </h3>
                    <div className="h-[300px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={emotionData}>
                                <PolarGrid gridType="polygon" stroke="#1e293b" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                <Radar
                                    name="Intensitas"
                                    dataKey="A"
                                    stroke="#38bdf8"
                                    strokeWidth={3}
                                    fill="#38bdf8"
                                    fillOpacity={0.2}
                                />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(59,130,246,0.3)', backgroundColor: '#020617', color: '#fff', boxShadow: '0 0 20px rgba(59,130,246,0.2)' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Line Chart - Trends */}
                <div className="bg-[#020617] p-8 rounded-[2.5rem] shadow-[0_0_30px_rgba(59,130,246,0.15)] border border-blue-500/30 relative overflow-hidden">
                    <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                        <span className="text-2xl">📈</span> Tren Akurasi & Fokus
                    </h3>
                    <div className="h-[300px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(59,130,246,0.3)', backgroundColor: '#020617', color: '#fff', boxShadow: '0 0 20px rgba(59,130,246,0.2)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line
                                    type="monotone"
                                    dataKey="accuracy"
                                    name="Akurasi (%)"
                                    stroke="#38bdf8"
                                    strokeWidth={4}
                                    dot={{ r: 4, fill: '#38bdf8', strokeWidth: 2, stroke: '#020617' }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="hours"
                                    name="Waktu (Jam)"
                                    stroke="#6366f1"
                                    strokeWidth={4}
                                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#020617' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>


                {/* 3. Top Weaknesses - "Focus Zone" */}
                <div className="md:col-span-2 bg-[#020617] p-8 rounded-[2.5rem] shadow-[0_0_30px_rgba(59,130,246,0.15)] border border-blue-500/30 relative overflow-hidden">
                    <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                        <span className="text-2xl">🎯</span> Zona Fokus (Perlu Latihan)
                    </h3>

                    {weakAreas.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {weakAreas.map((item, idx) => (
                                <div key={idx} className="bg-slate-950 p-6 rounded-2xl border border-blue-500/20 flex flex-col hover:border-blue-500/50 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-sm border border-rose-500/30">
                                            {idx + 1}
                                        </div>
                                        <div className="text-xs font-bold text-rose-400 uppercase tracking-widest">
                                            {item.count}x Salah
                                        </div>
                                    </div>
                                    <p className="text-slate-300 font-medium text-sm line-clamp-3">
                                        "{item.question}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-slate-950 rounded-3xl border-2 border-dashed border-slate-800">
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
                    : 'bg-black text-blue-50 shadow-[0_0_50px_rgba(59,130,246,0.2)] border-blue-500/30'
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
                        <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-5xl shadow-2xl border-4 transform transition-transform group-hover:scale-105 animate-bounce duration-[3000ms]
                            ${isOffline
                                ? 'bg-slate-200 border-white text-slate-400 grayscale'
                                : 'bg-white border-white/20 text-blue-600 shadow-[0_0_50px_rgba(255,255,255,0.2)]'
                            }`}>
                            {insightLoading ? '⏳' : isOffline ? '😴' : '🤖'}
                        </div>
                        {!isOffline && (
                            <div className="absolute -bottom-2 -right-2 bg-emerald-400 w-6 h-6 rounded-full border-4 border-black"></div>
                        )}
                    </div>

                    {/* Text Content */}
                    <div className="flex-1">
                        <div className="mb-6 flex items-start justify-between">
                            <div>
                                <h3 className={`text-3xl font-black mb-2 ${isOffline ? 'text-slate-700' : 'text-blue-50 tracking-tight drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`}>
                                    {isOffline ? 'Lumi Sedang Istirahat...' : 'Lumi Smart Insights'}
                                </h3>
                                <p className={`text-sm font-bold uppercase tracking-widest opacity-60 ${isOffline ? 'text-slate-500' : 'text-blue-300'}`}>
                                    {isOffline
                                        ? 'Cek koneksi internetmu untuk analisis real-time.'
                                        : 'Analisis Emosi & Strategi Belajar Personal'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    if (emotionData.length > 0 && trendData.length > 0) {
                                        const latestTimestamp = sessions.length > 0 && sessions[0].timestamp ? sessions[0].timestamp.seconds * 1000 : 0;
                                        generateInsight(emotionData, trendData, topicMastery, dominantStyle, totalStudyHours, latestTimestamp, true);
                                    }
                                }}
                                disabled={insightLoading}
                                className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white uppercase tracking-widest transition-all flex items-center gap-2"
                            >
                                🔄 Refresh Analysis
                            </button>
                        </div>

                        <div className={`prose max-w-none text-lg leading-loose rounded-3xl p-8 backdrop-blur-sm border
                            ${isOffline
                                ? 'bg-white border-slate-100 prose-slate'
                                : 'bg-slate-950/80 border-blue-500/20 prose-invert text-blue-50 shadow-inner'
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
            {topicMastery['Geometri'] >= 5 ? (
                <div className="mt-8 p-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded-[2.5rem] shadow-xl shadow-violet-200 text-white relative overflow-hidden animate-bounce-slow">
                    <div className="absolute top-0 right-0 opacity-10 text-[10rem] font-black -mr-10 -mt-10">MAX</div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h3 className="text-3xl font-black mb-2">🎉 Geometri Mastered!</h3>
                            <p className="text-violet-50 text-lg font-medium max-w-xl">
                                Kemampuan spasialmu luar biasa! Tantangan terakhir menanti di Trigonometri.
                            </p>
                        </div>
                        <button
                            onClick={() => onNavigate ? onNavigate('trigonometri') : onBack()}
                            className="px-8 py-4 bg-white text-violet-600 font-black rounded-2xl shadow-lg hover:scale-105 transition-transform text-lg"
                        >
                            Lanjut ke Trigonometri 📐
                        </button>
                    </div>
                </div>
            ) : topicMastery['Aljabar'] >= 5 && (
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
                            onClick={() => onNavigate ? onNavigate('geometri') : onBack()}
                            className="px-8 py-4 bg-white text-emerald-600 font-black rounded-2xl shadow-lg hover:scale-105 transition-transform text-lg"
                        >
                            Lanjut ke Geometri 📐
                        </button>
                    </div>
                </div>
            )}

            <div className="text-center pt-8 pb-4">
                <button onClick={onBack} className="text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest text-sm transition-colors">
                    Kembali ke Dashboard
                </button>
            </div>
        </div >
    );
}
