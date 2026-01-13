'use client';

import { useState } from 'react';

interface TopicMasteryProps {
    topicId: string;
    onBack: () => void;
    onStartLevel: (level: number, type: string) => void;
    currentLevel?: number;
    showAIHelp?: boolean;
}

interface LevelData {
    level: number;
    title: string;
    description: string;
    type: 'VIDEO' | 'TEXT' | 'CASE_STUDY' | 'EXAM';
    status: 'LOCKED' | 'OPEN' | 'COMPLETED';
    duration: string;
}

// Dynamic Data for 5 Levels
const getLevels = (topicId: string, currentLevel: number): LevelData[] => {
    const levels: LevelData[] = [
        {
            level: 1,
            title: 'Konsep Dasar & Definisi',
            description: 'Memahami terminologi dasar dan prinsip awal.',
            type: 'VIDEO',
            status: 'LOCKED',
            duration: '5 min'
        },
        {
            level: 2,
            title: 'Rumus & Teorema Utama',
            description: 'Pelajari rumus kunci yang wajib dihafal.',
            type: 'TEXT',
            status: 'LOCKED',
            duration: '10 min'
        },
        {
            level: 3,
            title: 'Latihan Soal Terbimbing',
            description: 'Terapkan rumus dalam soal sederhana dengan panduan.',
            type: 'TEXT',
            status: 'LOCKED',
            duration: '15 min'
        },
        {
            level: 4,
            title: 'Studi Kasus: Aplikasi Nyata',
            description: 'Bagaimana konsep ini digunakan di dunia nyata?',
            type: 'CASE_STUDY',
            status: 'LOCKED',
            duration: '20 min'
        },
        {
            level: 5,
            title: 'Ujian Kelulusan (Final Exam)',
            description: 'Buktikan penguasaanmu untuk mendapat Badge Lulus.',
            type: 'EXAM',
            status: 'LOCKED',
            duration: '30 min'
        }
    ];

    // Compute Status
    return levels.map(l => {
        if (l.level < currentLevel) return { ...l, status: 'COMPLETED' };
        if (l.level === currentLevel) return { ...l, status: 'OPEN' };
        return { ...l, status: 'LOCKED' };
    });
};

export default function TopicMastery({ topicId, onBack, onStartLevel, currentLevel = 1, showAIHelp = false }: TopicMasteryProps) {
    const levels = getLevels(topicId, currentLevel);
    const topicName = topicId.charAt(0).toUpperCase() + topicId.slice(1);

    // Note: Removed mock isStuck logic, using prop instead

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* 1. Formal White Header */}
            <div className="bg-white sticky top-0 z-40 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                        ←
                    </button>
                    <div>
                        <h1 className="text-xl font-serif font-bold text-slate-800 tracking-tight">{topicName} Mastery</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Selesaikan 5 Level untuk Lulus</p>
                    </div>
                </div>
                {/* Completion Badge (Visible if Level > 5) */}
                {currentLevel > 5 && (
                    <div className="hidden sm:block animate-fade-in-up">
                        <span className="bg-emerald-100 text-emerald-600 text-xs font-bold px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm flex items-center gap-2">
                            <span>🏆</span> LULUS
                        </span>
                    </div>
                )}
            </div>

            <div className="max-w-3xl mx-auto px-6 py-10">
                {/* 2. Progress Indicator - Formal */}
                <div className="mb-10 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                        <span>Progress Kelulusan</span>
                        <span>{Math.min((currentLevel - 1) * 20, 100)}%</span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min((currentLevel - 1) * 20, 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* 3. Level Cards List */}
                <div className="space-y-4 relative">
                    {/* Vertical Line Connector */}
                    {/* Vertical Line Connector (Dotted) */}
                    <div className="absolute left-[28px] top-6 bottom-6 w-px border-l-2 border-dashed border-slate-300/60 -z-10 hidden sm:block"></div>

                    {levels.map((lvl) => (
                        <div key={lvl.level} className="relative group">
                            <button
                                disabled={lvl.status === 'LOCKED'}
                                onClick={() => {
                                    if (lvl.status !== 'LOCKED') {
                                        onStartLevel(lvl.level, lvl.type);
                                    }
                                }}
                                className={`w-full text-left p-6 sm:pl-24 rounded-2xl border transition-all duration-300 relative overflow-hidden
                                    ${lvl.status === 'OPEN'
                                        ? 'bg-white border-blue-200 shadow-[0_4px_20px_rgba(37,99,235,0.05)] ring-1 ring-blue-100 z-10 cursor-pointer hover:shadow-md hover:scale-[1.01]'
                                        : lvl.status === 'COMPLETED'
                                            ? 'bg-white border-emerald-100 opacity-90 cursor-pointer hover:opacity-100'
                                            : 'bg-slate-50 border-slate-200 opacity-60 grayscale cursor-not-allowed'
                                    }
                                `}
                            >
                                {/* Level Number / Status Icon */}
                                <div className={`absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold border-2 z-20
                                    ${lvl.status === 'OPEN'
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30'
                                        : lvl.status === 'COMPLETED'
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : 'bg-white border-slate-300 text-slate-300'
                                    }
                                `}>
                                    {lvl.status === 'LOCKED' ? '🔒' : lvl.status === 'COMPLETED' ? '✓' : lvl.level}
                                </div>

                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded
                                                ${lvl.status === 'OPEN' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}
                                            `}>
                                                Level {lvl.level}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                {lvl.type === 'VIDEO' ? '🎥 Video' : lvl.type === 'EXAM' ? '🎓 Ujian' : '📄 Bacaan'}
                                                <span>•</span>
                                                {lvl.duration}
                                            </span>
                                        </div>
                                        <h3 className={`text-lg font-bold mb-1 ${lvl.status === 'OPEN' ? 'text-slate-900' : 'text-slate-600'}`}>
                                            {lvl.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 leading-relaxed max-w-lg">
                                            {lvl.description}
                                        </p>
                                    </div>

                                    {/* Action Arrow */}
                                    <div className={`mt-2 ${lvl.status === 'OPEN' ? 'text-blue-500' : 'text-slate-300'}`}>
                                        ➔
                                    </div>
                                </div>
                            </button>
                        </div>
                    ))}
                </div>

                {/* 4. AI Help Card (Triggered by showAIHelp) */}
                {showAIHelp && (
                    <div className="mt-8 bg-indigo-600 text-white p-6 rounded-2xl shadow-xl shadow-indigo-200 flex items-center gap-6 animate-pulse">
                        <div className="text-4xl">🤖</div>
                        <div className="flex-1">
                            <h4 className="font-bold text-lg mb-1">Butuh Bantuan AI?</h4>
                            <p className="text-indigo-100 text-sm">Sepertinya kamu sedikit kesulitan di level ini ({currentLevel}). Mau rangkuman instan?</p>
                        </div>
                        <button className="px-5 py-2 bg-white text-indigo-700 font-bold rounded-lg hover:bg-indigo-50 transition-colors">
                            Ya, Bantu Saya
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
