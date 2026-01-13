export interface ExpertInsight {
    explanation: string;
    nextStep: string;
    isOffline: boolean;
    emotion?: string;
}

import { ALJABAR_CURRICULUM } from './curriculumData';

export class ExpertSystem {
    static generateStaticInsight(
        score: number,
        emotion: string,
        topic: string,
        level: number
    ): ExpertInsight {
        const isHighScore = score >= 80;
        const isNegativeEmotion = ['Fear', 'Sadness', 'Anger', 'Disgust'].some(e => emotion.includes(e));

        // Persona: Lumi (Warm, Specific)
        // Hardcoded 'Teman' if name not available, but UI should pass name ideally.
        // We focus on the provided request format.

        let greeting = "";
        let body = "";
        let closing = "";

        if (isHighScore) {
            greeting = `Hai Sobat Lumi! Aku Lumi. 👋`;
            body = `**Keren banget!** Akurasi kuis kamu mencapai **${score}%** di Level ${level}. Aku melihat energi positif dari emosi *${emotion}*-mu. Ini saatnya kita gaspol ke level berikutnya!`;
            closing = "Siap untuk tantangan baru? Aku yakin kamu bisa menaklukkannya! 🚀";
        } else {
            greeting = `Halo! Lumi di sini. Jangan sedih ya... 🤗`;
            body = `Skor **${score}%** hanyalah angka awal. Aku tahu kamu merasa sedikit *${emotion}*, dan itu wajar kok saat belajar hal baru. Kamu hanya perlu sedikit latihan lagi di **${topic}**.`;
            closing = "Yuk kita coba lagi pelan-pelan. Aku akan temani kamu sampai bisa! 💪";
        }

        const tips = [
            "💡 **Tips Visual**: Coba gambarkan soal ceritanya dulu.",
            "💡 **Tips Auditori**: Coba jelaskan ulang jawabanmu dengan suara keras.",
            "💡 **Tips Kinestetik**: Gunakan jari atau benda sekitar untuk simulasi hitungan."
        ];
        const randomTip = tips[Math.floor(Math.random() * tips.length)];

        return {
            explanation: `# ${greeting}\n\n${body}\n\n${randomTip}\n\n> ${closing}`,
            nextStep: isHighScore ? "NEXT_LEVEL" : "REPEAT",
            isOffline: true,
            emotion: emotion
        };
    }

    static getFallbackContent(topic: string, style: string): string {
        return `# 🤖 Mode Offline: ${topic}\n\nMaaf ya, Lumi sedang kesulitan terhubung ke server utama. Tapi jangan khawatir, materinya tetap bisa kamu pelajari dari catatan lokal ini!\n\n**Tips Cepat:**\n- Fokus pada definisi dasar.\n- Perhatikan contoh soal.\n- Kerjakan pelan-pelan.\n\n*Semangat belajar!*`;
    }

    static getCurriculumContent(topic: string, level: number): ExpertInsight | null {
        const normalizedTopic = topic.toLowerCase();

        if (normalizedTopic.includes('aljabar') && ALJABAR_CURRICULUM[level]) {
            const data = ALJABAR_CURRICULUM[level];

            // Format Quiz into Markdown-like structure if needed, or return raw object?
            // The API usually returns markdown explanation + quiz JSON.
            // But here we return ExpertInsight which is mostly explanation.
            // Wait, route.ts expects explanation string + separate quiz questions. 
            // We'll format the explanation here.

            return {
                explanation: data.content,
                nextStep: "NEXT_QUIZ",
                isOffline: false, // It's valid content
                emotion: "Neutral" // Default
            };
        }
        return null;
    }
}
