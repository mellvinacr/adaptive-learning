'use client';

import { useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { BookOpen, Eye, MousePointerClick, CheckCircle } from 'lucide-react';

interface Question {
    id: number;
    text: string;
    options: {
        text: string;
        style: 'VISUAL' | 'TEXT' | 'UINTERACTIVE'; // UINTERACTIVE for Kinesthetic/Interactive
        icon: any;
    }[];
}

const QUESTIONS: Question[] = [
    {
        id: 1,
        text: "Jika kamu ingin belajar tentang pecahan (misal 1/2), apa yang paling membantumu?",
        options: [
            { text: "Melihat gambar pizza yang dipotong", style: 'VISUAL', icon: Eye },
            { text: "Membaca penjelasan tentang pembagian", style: 'TEXT', icon: BookOpen },
            { text: "Memotong kertas sendiri menjadi dua", style: 'UINTERACTIVE', icon: MousePointerClick }
        ]
    },
    {
        id: 2,
        text: "Saat soal matematika sulit, apa yang kamu lakukan?",
        options: [
            { text: "Menggambarnya di kertas", style: 'VISUAL', icon: Eye },
            { text: "Mencari rumus di buku", style: 'TEXT', icon: BookOpen },
            { text: "Mencoba menghitung dengan benda di sekitar", style: 'UINTERACTIVE', icon: MousePointerClick }
        ]
    },
    {
        id: 3,
        text: "Manakah yang lebih seru?",
        options: [
            { text: "Video animasi warna-warni", style: 'VISUAL', icon: Eye },
            { text: "Cerita soal yang menarik", style: 'TEXT', icon: BookOpen },
            { text: "Game drag-and-drop angka", style: 'UINTERACTIVE', icon: MousePointerClick }
        ]
    }
];

export default function Onboarding({ user, onComplete }: { user: User, onComplete: () => void }) {
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handleAnswer = async (style: string) => {
        const newAnswers = [...answers, style];
        setAnswers(newAnswers);

        if (step + 1 < QUESTIONS.length) {
            setStep(step + 1);
        } else {
            await finishOnboarding(newAnswers);
        }
    };

    const finishOnboarding = async (finalAnswers: string[]) => {
        setLoading(true);
        // Calculate distinct style
        const counts = finalAnswers.reduce((acc, curr) => {
            acc[curr] = (acc[curr] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const bestStyle = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);

        try {
            await setDoc(doc(db, 'users', user.uid), {
                learningStyle: bestStyle,
                onboardingCompleted: true,
                mathLevel: 1,
                lastUpdate: new Date()
            }, { merge: true });

            onComplete();
        } catch (error) {
            console.error("Error saving profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const currentQuestion = QUESTIONS[step];

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Yuk, Kenalan Dulu! 👋</h1>
                <p className="text-gray-600">Bantu AI menyesuaikan cara belajar yang cocok buat kamu.</p>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
                <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
                ></div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-600 w-8 h-8 flex items-center justify-center rounded-full text-sm">
                        {step + 1}
                    </span>
                    {currentQuestion.text}
                </h2>

                <div className="space-y-4">
                    {currentQuestion.options.map((opt, idx) => {
                        const Icon = opt.icon;
                        return (
                            <button
                                key={idx}
                                disabled={loading}
                                onClick={() => handleAnswer(opt.style)}
                                className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group flex items-center gap-4"
                            >
                                <div className="bg-white p-2 rounded-lg text-gray-400 group-hover:text-emerald-500 border border-gray-100 group-hover:border-emerald-200">
                                    <Icon size={24} />
                                </div>
                                <span className="font-medium text-gray-700 group-hover:text-emerald-700">
                                    {opt.text}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
