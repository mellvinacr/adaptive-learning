'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TopicDetailProps {
    topicId: string;
    onBack: () => void;
    onStartLearning: (materialId: string, materialTitle: string) => void;
}

// Mock Data Generator for Sub-Materials
const getMaterials = (topicId: string) => {
    // Helper for relative dates
    const today = "Hari ini";
    const yesterday = "Kemarin";
    const daysAgo = "2 hari lalu";

    // Default mocks
    const defaults = [
        { id: '1', type: 'VIDEO', title: 'Video Konsep Dasar', date: daysAgo, comments: 12, icon: '▶️', color: 'text-red-500 bg-red-50' },
        { id: '2', type: 'TEXT', title: 'Rangkuman Materi', date: yesterday, comments: 5, icon: '📄', color: 'text-blue-500 bg-blue-50' },
        { id: '3', type: 'QUIZ', title: 'Latihan Soal Level 1', date: today, comments: 34, icon: '✅', color: 'text-green-500 bg-green-50' },
    ];

    // Specific mocks based on topic (aljabar, kalkulus, etc)
    if (topicId?.toLowerCase().includes('aljabar')) return [
        { id: 'a1', type: 'VIDEO', title: 'Pengantar Variabel & Konstanta', date: daysAgo, comments: 24, icon: '▶️', color: 'text-red-500 bg-red-50' },
        { id: 'a2', type: 'TEXT', title: 'Operasi Hitung Aljabar', date: yesterday, comments: 10, icon: '📄', color: 'text-blue-500 bg-blue-50' },
        { id: 'a3', type: 'QUIZ', title: 'Kuis Persamaan Linear', date: today, comments: 56, icon: '✅', color: 'text-green-500 bg-green-50' },
    ];

    if (topicId?.toLowerCase().includes('trigonometri')) return [
        { id: 't1', type: 'VIDEO', title: 'Sudut & Radian', date: daysAgo, comments: 15, icon: '▶️', color: 'text-red-500 bg-red-50' },
        { id: 't2', type: 'TEXT', title: 'Sinus, Cosinus, Tangen', date: yesterday, comments: 8, icon: '📄', color: 'text-blue-500 bg-blue-50' },
        { id: 't3', type: 'QUIZ', title: 'Latihan Segitiga Siku-siku', date: today, comments: 22, icon: '✅', color: 'text-green-500 bg-green-50' },
    ];

    return defaults;
};

export default function TopicDetail({ topicId, onBack, onStartLearning }: TopicDetailProps) {
    const materials = getMaterials(topicId);
    // Capitalize topicId for display
    const topicName = topicId.charAt(0).toUpperCase() + topicId.slice(1);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
                <button
                    onClick={onBack}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                >
                    ←
                </button>
                <h1 className="text-lg font-black text-slate-800 tracking-tight">{topicName}</h1>
                <div className="w-10"></div> {/* Spacer for center alignment */}
            </div>

            {/* Content List */}
            <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
                <div className="mb-6">
                    <h2 className="text-xl font-black text-slate-800">Daftar Materi</h2>
                    <p className="text-slate-500 text-sm">Pilih materi untuk mulai belajar.</p>
                </div>

                {materials.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onStartLearning(item.id, item.title)}
                        className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex items-center gap-4 group text-left"
                    >
                        {/* Icon */}
                        <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform`}>
                            {item.icon}
                        </div>

                        {/* Text Info */}
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800 text-base mb-1 group-hover:text-blue-600 transition-colors">
                                {item.title}
                            </h3>
                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                <span>{item.type}</span>
                                <span>•</span>
                                <span>{item.date}</span>
                                <span>•</span>
                                <span>{item.comments} Komentar</span>
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="text-slate-300 group-hover:text-blue-500 transition-colors">
                            ➔
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
