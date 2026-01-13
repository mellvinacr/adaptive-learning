'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function ReportPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);

    // Emotion Data for Radar Chart
    const [emotionData, setEmotionData] = useState<any[]>([]);
    const [dominantEmotion, setDominantEmotion] = useState<{ name: string, count: number } | null>(null);
    const [avgConfidence, setAvgConfidence] = useState(0);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // Fetch Profile
                const profileSnap = await getDoc(doc(db, 'users', currentUser.uid));
                if (profileSnap.exists()) setProfile(profileSnap.data());

                // Fetch Sessions
                const q = query(collection(db, 'users', currentUser.uid, 'sessions'), orderBy('timestamp', 'desc'));
                const snap = await getDocs(q);
                const sessionData = snap.docs.map(d => d.data());
                setSessions(sessionData);

                // Aggregate Emotions
                const emotionsCount: Record<string, number> = {
                    Joy: 0, Trust: 0, Fear: 0, Surprise: 0,
                    Sadness: 0, Disgust: 0, Anger: 0, Anticipation: 0
                };

                let totalConf = 0;
                let confCount = 0;

                sessionData.forEach(s => {
                    const e = s.emotion;
                    if (e && emotionsCount[e] !== undefined) {
                        emotionsCount[e]++;
                    }
                    if (s.confidenceScore) {
                        totalConf += s.confidenceScore;
                        confCount++;
                    }
                });

                setAvgConfidence(confCount > 0 ? (totalConf / confCount) * 100 : 0);

                const radarData = Object.keys(emotionsCount).map(key => ({
                    subject: key,
                    A: emotionsCount[key],
                    fullMark: Math.max(sessionData.length, 5) // Scale chart
                }));
                setEmotionData(radarData);

                // Find Dominant
                let max = -1;
                let dom = "";
                for (const [key, val] of Object.entries(emotionsCount)) {
                    if (val > max) {
                        max = val;
                        dom = key;
                    }
                }
                setDominantEmotion({ name: dom, count: max });

                setLoading(false);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    if (loading) return <div className="p-8 text-center">Loading Report...</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Laporan Orang Tua 👨‍👩‍👧‍👦</h1>
                        <p className="text-gray-500 mt-2">
                            Analisis Psikometrik & Akademik: <span className="font-bold text-emerald-600">{profile?.displayName || user?.displayName}</span>
                        </p>
                    </div>
                    <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-600 font-bold bg-gray-100 px-4 py-2 rounded-lg">
                        Kembali ke Dashboard
                    </button>
                </div>

                {/* AI Summary Card (Enhanced) */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span>🤖</span> Analisis Psikologis AI
                    </h2>
                    <div className="leading-relaxed opacity-95 space-y-4">
                        <p>
                            Berdasarkan <strong>{sessions.length} sesi belajar</strong> terakhir, AI mendeteksi bahwa dominasi emosi anak Anda adalah <strong className="text-yellow-300 text-lg">{dominantEmotion?.name || 'Netral'}</strong>.
                        </p>
                        <p>
                            Tingkat keyakinan analisis AI rata-rata adalah <strong>{avgConfidence.toFixed(0)}%</strong>.
                            {dominantEmotion?.name === 'Joy' || dominantEmotion?.name === 'Trust' ?
                                " Ini adalah indikator bagus! Anak menikmati proses belajar." :
                                dominantEmotion?.name === 'Fear' || dominantEmotion?.name === 'Sadness' ?
                                    " Sekolah ini mungkin terasa menantang. Anak butuh dukungan moral agar lebih percaya diri." :
                                    " Emosi beragam menunjukkan proses belajar yang dinamis."
                            }
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Emotional Radar Chart (Plutchik) */}
                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Roda Emosi (Plutchik)</h3>
                            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold">Psikometrik</span>
                        </div>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={emotionData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                                    <Radar name="Frekuensi Emosi" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                    <Legend />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-gray-400 text-center mt-2">
                            Distribusi 8 Emosi Dasar: Joy, Trust, Fear, Surprise, Sadness, Disgust, Anger, Anticipation.
                        </p>
                    </div>

                    {/* Academic Performance */}
                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Tren Nilai Kuis</h3>
                            <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full font-bold">Akademik</span>
                        </div>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[...sessions].reverse().slice(-7)}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="timestamp" tickFormatter={(t) => t ? new Date(t.seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''} fontSize={10} />
                                    <YAxis />
                                    <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '12px' }} />
                                    <Bar dataKey="score" fill="#10b981" name="Skor" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-gray-400 text-center mt-2">
                            Perkembangan nilai pada 7 sesi terakhir.
                        </p>
                    </div>
                </div>

                {/* History Table Helper */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-50">
                        <h3 className="text-lg font-bold text-gray-900">Riwayat Catatan Emosi</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {sessions.slice(0, 5).map((session, idx) => (
                            <div key={idx} className="p-6 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${session.emotion === 'Joy' ? 'bg-yellow-100 text-yellow-600' :
                                    session.emotion === 'Trust' ? 'bg-green-100 text-green-600' :
                                        session.emotion === 'Fear' ? 'bg-purple-100 text-purple-600' :
                                            session.emotion === 'Anger' ? 'bg-red-100 text-red-600' :
                                                'bg-gray-100 text-gray-600'
                                    }`}>
                                    {session.emotion === 'Joy' ? '😊' :
                                        session.emotion === 'Trust' ? '🤝' :
                                            session.emotion === 'Fear' ? '😨' :
                                                session.emotion === 'Anger' ? '😡' : '😐'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-gray-800">{session.emotion || 'Unknown'}</span>
                                        <span className="text-xs text-gray-400">• {session.timestamp ? new Date(session.timestamp.seconds * 1000).toLocaleDateString() : ''}</span>
                                        {session.topic && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{session.topic}</span>}
                                    </div>
                                    <p className="text-gray-600 text-sm italic">"{session.sentiment}"</p>
                                    {session.confidenceScore && (
                                        <div className="mt-2 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                            AI Confidence: {(session.confidenceScore * 100).toFixed(0)}%
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
