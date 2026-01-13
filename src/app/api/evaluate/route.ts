
import { NextResponse } from 'next/server';
import { model } from '@/lib/gemini';

export async function POST(req: Request) {
    try {
        const { score, totalQuestions, sentiment, learningStyle, topic } = await req.json();

        const prompt = `
      CONTEXT:
      You are an Advanced Educational Emotion AI.
      Your goal is to accurately identify the student's emotion based on their feedback and quiz performance.
      
      INPUT DATA:
      - Topic: ${topic || 'General Math'}
      - Quiz Score: ${score}/${totalQuestions}
      - Student Feedback: "${sentiment}"
      - Learning Style: ${learningStyle || 'Unknown'}
      
      INSTRUCTIONS:
      1. Analyze the input to detect the user's emotion.
      2. STRICTLY CLASSIFY into one of these 8 Plutchik Emotions:
         - Joy (Senang/Puas)
         - Trust (Percaya/Yakin)
         - Fear (Takut/Cemas)
         - Surprise (Terkejut)
         - Sadness (Sedih/Kecewa)
         - Disgust (Jijik/Muak)
         - Anger (Marah)
         - Anticipation (Berharap/Siap)
      
      3. LOGIC & CONTEXT RULES:
         - If Score is Low AND User says "susah" or "ga ngerti" -> Sadness or Fear.
         - If Score is Low AND User says "aneh" or "salah soal" -> Anger or Disgust.
         - If Score is High -> Joy or Trust or Anticipation.
         - Context: "Kalkulus" is naturally harder; confusion is likely 'Fear' or 'Sadness', not 'Disgust'.
      
      4. DECISION RULES:
         - Joy/Trust + High Score -> "NEXT_LEVEL"
         - Fear/Sadness/Anger/Disgust -> "EASIER_CONTENT"
         - Anticipation/Surprise -> "REPEAT"
         - IF Score < 50% -> FORCE "EASIER_CONTENT" regardless of emotion.
      
      OUTPUT FORMAT (JSON ONLY):
      {
        "decision": "NEXT_LEVEL" | "REPEAT" | "EASIER_CONTENT",
        "emotion": "Joy" | "Trust" | "Fear" | "Surprise" | "Sadness" | "Disgust" | "Anger" | "Anticipation",
        "confidenceScore": number (0.0 to 1.0),
        "message": "Empathic adaptive response string in Indonesian"
      }
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Cleanup code blocks if any
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return NextResponse.json(JSON.parse(cleanText));
    } catch (error: any) {
        console.error("Error calling Gemini API:", error);

        return NextResponse.json({
            decision: "REPEAT",
            emotion: "Anticipation",
            confidenceScore: 0.0,
            message: "Sistem sedang sibuk, mari kita coba ulangi materi ini dengan perlahan.",
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
