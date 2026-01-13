
import { NextResponse } from 'next/server';
import { model } from '@/lib/gemini';

export async function POST(req: Request) {
    try {
        console.log("⚡ [API] POST /api/adaptive received");
        const body = await req.json();
        console.log("📦 [API] Request Body:", JSON.stringify(body, null, 2));
        const { text, style, topic, mode } = body;

        if (!text) {
            console.warn("⚠️ [API] Missing 'text' field");
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        let prompt;

        if (mode === 'STEP_BY_STEP') {
            // DYNAMIC PROMPT BUILDER BASED ON STYLE
            let specificInstructions = "";
            let outputFormat = "";

            if (style === 'AUDITORY') {
                specificInstructions = `
                - Focus on **Narrative and Flow**. Write as if you are giving a podcast or a lecture.
                - Use "Conversational Markers" (e.g., "Listen close...", "Imagine hearing...", "So, here's the deal...").
                - Avoid complex visual tables; use rhythmic lists instead.
                `;
                outputFormat = `
                ### 🎙️ Penjelasan Audio [Nama Materi]
                
                **Narasi Pembuka**:
                [A welcoming, spoken-word style intro. "Halo! Mari kita bahas..."]

                **Analogi Bercerita**:
                [A story-based analogy that flows well when read aloud.]

                **Inti Materi (Gaya Ceramah)**:
                [Explain the concept in clear, connected paragraphs. Use bold text for emphasis.]

                **Bedah Rumus (Narasi)**:
                [Explain the math formula in words first, THEN show the Latex. Example: "Untuk mencari luas, kita kalikan sisi dengan sisi. Jadi rumusnya adalah..." followed by $$L = s \\times s$$]

                **Kesimpulan**:
                [A punchy sign-off message.]
                `;
            } else if (style === 'KINESTHETIC') {
                specificInstructions = `
                - Focus on **Action, Simulation, and Real-World Application**.
                - Frame the explanation as a "Mission" or "Experiment".
                - Use active verbs ("Ambil", "Geser", "Bayangkan", "Hitung").
                `;
                outputFormat = `
                ### 🛠️ Simulasi Praktik [Nama Materi]

                **Misi Kamu Hari Ini**:
                [Define the problem as a real-world task. e.g. "Kamu adalah arsitek yang perlu menghitung..."]

                **Simulasi Langkah-demi-Langkah**:
                1. **[Aksi 1]**: [Physical or mental action step]
                2. **[Aksi 2]**: [Next action]
                
                **Eksperimen Pemahaman**:
                [A mini-activity the user can try physically or mentally right now.]

                **Bedah Rumus (Alat Bantu)**:
                [Present the formula as a 'Tool' or 'Cheat code'. Use $$...$$ for formulas.]

                **Kesimpulan**:
                [Encourage them to try it out.]
                `;
            } else {
                // DEFAULT: VISUAL
                specificInstructions = `
                - Focus on **Imagery, Diagrams, and Layout**.
                - Describe visual structures clearly.
                - Use analogies involving sight/shapes.
                `;
                outputFormat = `
                ### 💡 Konsep Visual [Nama Materi]

                **Analogi Kreatif**:
                [Write 1-2 paragraphs using a vivid, fun, and memorable real-world analogy. Example: Algebra as a balance scale.]

                **Visualisasi Aksi (Langkah-demi-Langkah)**:
                1. **[Langkah 1]**: [Describe the first logical step visually]
                2. **[Langkah 2]**: [Describe the next step]

                **Bedah Rumus (Format Formal)**:
                [Explain the math logic. CRITICAL: WRAP ALL MATH FORMULAS IN DOUBLE DOLLAR SIGNS LIKE $$x^2$$ to ensure rendering.]

                **Kesimpulan**:
                [A short, empowering closing sentence.]
                `;
            }

            prompt = `
Jelaskan konsep matematika ini dengan cara yang mudah dipahami:

**Materi:** ${text}
**Topik:** ${topic || 'Matematika'}

Berikan penjelasan dalam format berikut:
1. **Analogi Sederhana**: Satu kalimat analogi yang relate dengan kehidupan sehari-hari
2. **Langkah Penyelesaian**: Jelaskan step-by-step dengan poin bernomor
3. **Rumus**: Tulis rumus dalam format $$rumus$$

Gunakan bahasa Indonesia yang ramah dan memotivasi. Maksimal 150 kata.
            `;
        } else if (mode === 'WELCOME') {
            const stylePrompt = style === 'VISUAL' ? "Mention diagrams, mind maps, or seeing the big picture." :
                style === 'AUDITORY' ? "Invite them to listen, mention the audio feature, use a warm conversational tone." :
                    style === 'KINESTHETIC' ? "Use action words, invite them to practice/simulate, 'Get ready to act'." :
                        "General encouraging welcome.";

            prompt = `
            Act as a personal AI Tutor.
            Context: Student is starting a new level on "${topic}".
            Style: ${style} (${stylePrompt})

            Task: Write a very short welcome message (Max 2 sentences).
            Example Visual: "Halo! Mari kita bedah konsep ini melalui peta konsep dan diagram yang sudah saya siapkan untukmu."
            Example Auditory: "Selamat datang kembali. Silakan tekan tombol putar di bawah, aku akan membacakan inti materi level ini khusus untukmu."
            Example Kinestetik: "Sudah siap beraksi? Ayo kita langsung praktikkan rumus ini ke dalam studi kasus nyata!"

            Output: JUST the message text.
            `;
        } else if (mode === 'REPORT') {
            prompt = `
            Act as an Educational Psychologist and AI Tutor.
            Analyze the following student data summary: "${text}"

            Task: Provide a BRIEF, nurturing, and insightful report (Max 3-4 sentences).
            - Acknowledge their dominant emotion (e.g., if Fear: "It's normal to feel anxious...").
            - Connect it to their performance (e.g., "Despite the fear, your accuracy is high!").
            - Give one specific tip for the next week.
            - Tone: Empathetic, Professional, but Warm.

            Output: Just the paragraph report.
            `;
        } else {
            // STANDARD SHORT PROMPT
            const stylePrompt = style === 'VISUAL' ? "Use strong visual imagery, metaphors of physical objects." :
                style === 'AUDITORY' ? "Write conversationally as if speaking. Use natural rhythm." :
                    style === 'KINESTHETIC' ? "Use active verbs and describe a physical action." :
                        "Use clear step-by-step logic.";

            prompt = `
            Act as a fun Math Tutor. Explain the following concept to a student.
            
            Concept: "${text}"
            
            Student Learning Style: ${style} (${stylePrompt})
            
            Instructions:
            - Use specific advice for this learning style.
            - Keep it short (max 3 sentences).
            - Be encouraging.
            `;
        }

        console.log(`🤖 [API] Mode: ${mode}, Style: ${style}, Topic: ${topic}`);
        console.log("📝 [API] Generated Prompt (Truncated):", prompt.substring(0, 200) + "...");

        // Retry logic for 429 errors
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const result = await model.generateContent(prompt);
                console.log("✅ [API] Gemini generation complete");

                const response = await result.response;
                const explanation = response.text();
                console.log("📤 [API] Full Response:", explanation); // DEBUG: Print full response
                console.log("📤 [API] Response Length:", explanation.length);

                return NextResponse.json({ explanation });
            } catch (retryError: any) {
                attempts++;
                if (retryError.message?.includes("429") && attempts < maxAttempts) {
                    console.warn(`⚠️ [API] Rate limited. Retry ${attempts}/${maxAttempts} in 5s...`);
                    await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds
                } else {
                    throw retryError; // Re-throw if not 429 or max attempts reached
                }
            }
        }

        throw new Error("Max retry attempts reached");
    } catch (error: any) {
        console.error("❌ [API] Error calling Gemini API:", error);
        console.error("❌ [API] Error Details:", JSON.stringify(error, null, 2));
        if (error.message?.includes("API key")) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 500 });
        }
        if (error.message?.includes("429")) {
            return NextResponse.json({ error: 'Kuota API habis. Coba lagi dalam beberapa menit.', details: 'Rate limited' }, { status: 429 });
        }
        return NextResponse.json({ error: 'Failed to get explanation', details: error.message }, { status: 500 });
    }
}
