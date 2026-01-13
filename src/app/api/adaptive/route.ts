import { NextResponse } from 'next/server';
import { model } from '@/lib/gemini';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFallbackContent } from './fallbackData';
import { ExpertSystem } from '@/lib/expertSystem';

// ============================================
// HARD-CODED "KOTAK MISTERI" FALLBACK
// Premium offline content - always available
// ============================================
const KOTAK_MISTERI_FALLBACK = `### ✨ Hai! Aku Lumi, Teman Belajarmu!

**Tenang, Aljabar itu bukan monster!** Justru ini adalah permainan tebak-tebakan yang seru! Aku Lumi, dan aku akan jelaskan dengan cara yang menyenangkan! 💙

---

**🎯 Analogi Kotak Misteri**

Aljabar adalah tentang **mencari tahu isi sebuah kotak tersembunyi**. Huruf **"x"** itu hanyalah sebuah **Kotak Misteri** 🎁 yang isinya belum kita tahu.

Bayangkan kamu punya kotak dan seseorang bilang: *"Isi kotak ini ditambah 2 hasilnya 5"*. Berapa isi kotaknya? Tentu saja **3**! Karena $$3 + 2 = 5$$.

Nah, dalam matematika kita tulis: $$x + 2 = 5$$

---

**📌 LANGKAH 1: Persamaan Awal**

Kita punya Kotak Misteri:
$$x + 2 = 5$$

Artinya: *"Isi kotak ditambah 2 sama dengan 5"*

---

**📌 LANGKAH 2: Mencari Isi Kotak**

Untuk menemukan isi kotak, kita perlu **menyingkirkan angka 2** dari sisi kiri.

Caranya? Kurangi kedua sisi dengan 2:
$$x + 2 - 2 = 5 - 2$$
$$x = 3$$

💡 **Ingat**: Apa yang dilakukan di kiri, harus dilakukan juga di kanan!

---

**📌 LANGKAH 3: Solusi Akhir**

$$x = 3$$

✅ **Verifikasi**: Mari kita buktikan!
$$3 + 2 = 5$$ ✓ Benar!

---

**💪 Tips dari Lumi**

> *"Yang pindah rumah, ganti tanda!"* 🏠➡️🏠
> 
> Jika angka pindah dari kiri ke kanan (atau sebaliknya), tandanya berubah:
> - $$+$$ menjadi $$-$$
> - $$\\times$$ menjadi $$\\div$$

---

**🌟 Lumi Bangga Padamu!**

Selamat! Kamu sudah memahami konsep dasar aljabar. Ingat, **x** itu cuma kotak misteri - dan kamu adalah detektif yang mencari isinya! 🕵️

**Kita taklukkan level berikutnya bersama!** 💙`;

const DEFAULT_FALLBACK = `### ✨ Hai! Aku Lumi!

**Lumi** sedang mengisi energi sebentar, tapi tenang, aku sudah menyimpan catatan penting untukmu di sini...

**💡 Langkah Dasar Mengerjakan Soal:**
1. Baca soal dengan teliti
2. Identifikasi apa yang diketahui
3. Tentukan apa yang ditanyakan
4. Pilih rumus yang sesuai
5. Substitusi dan hitung
6. Periksa jawaban

**Lumi percaya padamu! Kita taklukkan level ini bersama!** 💙`;

// ============================================
// API ROUTE HANDLER
// ============================================
export async function POST(req: Request) {
    const body = await req.json();
    const { text, style, topic, mode, level } = body;
    const currentLevel = level || 1;

    // Silent logging - only essential info
    console.log(`📦 [API] ${mode} | ${topic} L${currentLevel} | ${style}`);

    // ============================================
    // 1. CACHE FIRST - Always check before API
    // ============================================
    const cacheKey = `${topic}_L${currentLevel}_${style}_${mode}_v2`.replace(/\s+/g, '_');
    try {
        const cacheRef = doc(db, 'materi_cache', cacheKey);
        const cacheDoc = await getDoc(cacheRef);
        if (cacheDoc.exists()) {
            const cachedExplanation = cacheDoc.data()?.explanation || '';

            // VALIDATION: Reject old non-Lumi cached content
            const invalidPhrases = ['Halo calon', 'Guru Motivator', 'Ibu/Bapak', 'Sistem sedang sibuk'];
            const hasInvalidContent = invalidPhrases.some(phrase =>
                cachedExplanation.toLowerCase().includes(phrase.toLowerCase())
            );

            if (!hasInvalidContent && cachedExplanation.length > 50) {
                console.log(`✅ Cache HIT (Valid): ${cacheKey}`);
                return NextResponse.json({
                    explanation: cachedExplanation,
                    isOffline: false,
                    fromCache: true
                });
            } else {
                console.log(`⚠️ Cache INVALID (Old format): ${cacheKey}`);
            }
        } else {
            console.log(`📭 Cache MISS: ${cacheKey}`);
        }
    } catch (cacheErr) {
        // Silent fail - proceed to API
    }

    // ============================================
    // 2. BUILD PROMPT
    // ============================================
    let prompt = '';
    if (mode === 'STEP_BY_STEP') {
        prompt = buildStepByStepPrompt(text, topic, style);
    } else if (mode === 'WELCOME') {
        prompt = buildWelcomePrompt(topic, style);
    } else if (mode === 'REPORT') {
        prompt = buildReportPrompt(text);
    } else {
        prompt = `Jelaskan singkat: "${text}". Gaya: ${style}. Bahasa Indonesia.`;
    }

    // ============================================
    // 3. API CALL WITH SMART FALLBACK
    // ============================================
    // 3. Fallback / Static Curriculum Check (BEFORE API CALL)
    // 3. Fallback / Static Curriculum Check (BEFORE API CALL)

    // A. ALJABAR (Static File)
    if (topic.toLowerCase() === 'aljabar') {
        const { ALJABAR_CURRICULUM } = require('@/lib/curriculumData');
        const levelData = ALJABAR_CURRICULUM[currentLevel];
        if (levelData && mode !== 'REPORT') {
            return NextResponse.json({
                explanation: levelData.content, // Default to content as explanation base
                content: levelData.content,
                contentVisual: levelData.contentVisual,
                contentAuditory: levelData.contentAuditory,
                contentKinesthetic: levelData.contentKinesthetic,
                quiz: levelData.quiz,
                isOffline: false
            });
        }
    }

    // B. GEOMETRI & TRIGONOMETRI (Static File - Turbo Mode)
    if (['geometri', 'trigonometri'].includes(topic.toLowerCase())) {
        const { GEOMETRI_CURRICULUM, TRIGONOMETRI_CURRICULUM } = require('@/lib/curriculumExpansion');
        const targetCurriculum = topic.toLowerCase().includes('geometri') ? GEOMETRI_CURRICULUM : TRIGONOMETRI_CURRICULUM;
        const levelData = targetCurriculum[currentLevel];

        if (levelData) {
            console.log(`✅ Loaded Static ${topic} Level ${currentLevel}`);
            return NextResponse.json({
                explanation: levelData.content,
                content: levelData.content,
                contentVisual: levelData.contentVisual || levelData.content,
                contentAuditory: levelData.contentAuditory || levelData.content,
                contentKinesthetic: levelData.contentKinesthetic || levelData.content,
                quiz: levelData.quiz || [],
                isOffline: false
            });
        }
    }

    // C. OLD STATIC CHECK (Deprecated or fallback)
    const staticContent = ExpertSystem.getCurriculumContent(topic as string, currentLevel);
    if (staticContent && mode === 'TEACH' && topic === 'aljabar') { // Redundant but safe
        // ... handled above
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        clearTimeout(timeoutId);

        const response = await result.response;
        const explanation = response.text();

        console.log(`✅ Gemini OK (${explanation.length} chars)`);

        // Cache successful response
        try {
            await setDoc(doc(db, 'materi_cache', cacheKey), {
                explanation, topic, style, mode, level: currentLevel,
                createdAt: new Date()
            });
        } catch (e) { /* Silent cache fail */ }

        return NextResponse.json({
            explanation,
            isOffline: false
        });

    } catch (apiError: any) {
        // QUIET ERROR HANDLING
        const isQuota = apiError.message?.includes("429");
        if (isQuota) {
            console.log(`ℹ️ [API] Serving offline content (Quota limit)`);
        } else {
            console.log(`ℹ️ [API] Fallback mode: ${apiError.message?.substring(0, 50)}`);
        }

        let offlineExplanation = "";
        let isExpertFallback = false;

        if (mode === 'REPORT') {
            // Expert System for Reports
            const scoreMatch = text ? text.match(/Akurasi:\s*(\d+)/) : null;
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 70;
            const emotionMatch = text ? text.match(/Emosi Dominan.*:\s*(\w+)/) : null;
            const emotion = emotionMatch ? emotionMatch[1] : 'Neutral';

            const insight = ExpertSystem.generateStaticInsight(score, emotion, topic as string, currentLevel);
            offlineExplanation = insight.explanation;
            isExpertFallback = true;
        } else {
            // Content Fallback
            if (topic?.toLowerCase().includes('aljabar') && currentLevel === 1) {
                offlineExplanation = KOTAK_MISTERI_FALLBACK;
                isExpertFallback = true;
            } else {
                offlineExplanation = getFallbackContent(topic, currentLevel) || DEFAULT_FALLBACK;
            }
        }

        return NextResponse.json({
            explanation: offlineExplanation,
            isOffline: true,
            isExpertFallback,
            retryAfter: isQuota ? 60 : 5
        });
    }
}

// ============================================
// PROMPT BUILDERS
// ============================================
function buildStepByStepPrompt(text: string, topic: string, style: string): string {
    if (style === 'KINESTHETIC') {
        return `Kamu adalah Lumi, instruktur latihan matematika yang energik. Fokus pada "Learning by Doing".
        
**Konteks:** Siswa Kinestetik sedang belajar "${topic}" dan ingin mempraktikkan: "${text}"

**OUTPUT FORMAT (Markdown):**
Gunakan format berikut secara ketat:

# Ayo kita praktikkan! 🖐️✨
[Sapaan semangat 1 kalimat]

## 🎯 Misi Latihan
[Deskripsi singkat aktivitas fisik yang akan dilakukan]

### LANGKAH 1: Persiapan Objek 🛠️
[Instruksi ambil benda nyata]

### LANGKAH 2: Eksekusi Manipulasi ⚡
[Instruksi geser/pisahkan benda]

### LANGKAH 3: Pembuktian Fisik 🔍
[Hitung sisa benda]

> Mari kita buktikan! Jumlah benda yang tersisa adalah jawaban dari rumus. ✅

$$ [Rumus Matematika Akhir] $$

**Tips**: "Gerakkan tanganmu agar ingatannya menempel!" 💪💙
---
Bahasa Indonesia, instruktif, penuh emoji.`;
    }

    if (style === 'VISUAL') {
        return `Kamu adalah Lumi, teman belajar yang jago memvisualisasikan konsep. 
        
**Konteks:** Siswa Visual belajar "${topic}" tentang: "${text}"

**OUTPUT FORMAT (Markdown):**
Gunakan format berikut secara ketat:

# Hai! Matamu Tajam Sekali! 👁️✨
[Sapaan apresiatif 1 kalimat]

## 🎯 Analogi Kotak Misteri
[Jelaskan konsep dengan visualisasi "Kotak Kado" atau "Timbangan". Gunakan emoji yang relevan.]

### LANGKAH 1: Visualisasi Masalah 🎨
[Gambarkan masalah dengan objek visual. Jangan pakai rumus dulu.]

### LANGKAH 2: Strategi Mengisolasi 🧩
[Jelaskan bagaimana kita "membuang" pengganggu visual (misal: kurangi 2 bola di kiri & kanan).]
*Gunakan **bold** untuk kata kunci aksi.*

### LANGKAH 3: Membuka Kotak 🎁
[Hasil akhir setelah isolasi.]

> Mari kita buktikan! Jika kita masukkan kembali nilai ini ke kotak awal, timbangan pasti seimbang. ✅

$$ [Tulis Solusi Akhir: x = ...] $$

"Sekarang semuanya terlihat jelas kan? Siap level selanjutnya! 👁️💙"
---
Bahasa Indonesia, deskriptif visual, terstruktur.`;
    }

    // Default (Auditory/General)
    return `Kamu adalah Lumi, chatbot teman belajar yang ceria dan suportif. Kamu ahli menjelaskan matematika dengan analogi menyenangkan.

**Konteks:** Siswa SMA sedang belajar "${topic}" dan BINGUNG tentang: "${text}"

**INSTRUKSI WAJIB:**

1. **Sapaan Lumi**: Mulai dengan "Hai! Aku Lumi, dan aku akan bantu kamu! ✨"

2. **Analogi Kotak Misteri**:
   - Jelaskan konsep seperti permainan tebak-tebakan
   - Contoh: "Bayangkan x sebagai kotak misteri yang isinya belum kita tahu..."
   - Gunakan nada ceria: "Tenang, ${topic} itu seru! Ayo kita pecahkan bersama..."

3. **Langkah Penyelesaian Terstruktur**:
   
   **📌 LANGKAH 1: Persamaan Awal**
   [Tulis persamaan yang diberikan dengan jelas]
   
   **📌 LANGKAH 2: Mencari Isi Kotak**
   [Jelaskan proses menemukan nilai variabel step by step]
   
   **📌 LANGKAH 3: Solusi Akhir**
   [Tuliskan jawaban final dan verifikasi]

4. **Rumus dengan LaTeX**: Semua rumus WAJIB pakai format $$...$$ 
   Contoh: $$x = \\frac{8}{2} = 4$$

5. **Penutup Lumi**: "Lumi bangga padamu! Kita taklukkan level berikutnya bersama! 💙"

---
Bahasa Indonesia yang ceria seperti teman sebaya. Max 250 kata.`;
}

function buildWelcomePrompt(topic: string, style: string): string {
    return `Kamu adalah Lumi, chatbot teman belajar. Buat sapaan singkat (2 kalimat) untuk siswa mulai belajar "${topic}". 
Contoh: "Halo! Aku Lumi. Mari kita taklukkan ${topic} bersama dengan gaya belajar ${style} favoritmu! ✨"
Bahasa Indonesia, ceria, ramah seperti teman.`;
}

// ============================================
// PROMPT FOR 'SMART INSIGHTS' (LUMI PERSONA)
// ============================================
function buildReportPrompt(text: string): string {
    return `Kamu adalah Lumi, asisten belajar AI yang ramah, hangat, dan cerdas (Persona: Kakak Pembimbing yang suportif).

**DATA SISWA:**
${text}

**TUGAS:**
Buat ulasan perkembangan singkat (Max 150 kata) yang TERASA PERSONAL.

**INSTRUKSI WAJIB:**
1. **Sapaan Hangat**: "Hai [Nama/Teman]! Lumi di sini. Senang sekali melihat progresmu..."
2. **Analisis Emosi (Specific)**: Gunakan data emosi Plutchik.
   - Contoh: "Aku melihat rasa *Anticipation* yang tinggi. Itu artinya kamu penasaran dan siap untuk materi baru!"
   - Jika *Fear*: "Wajar kok merasa deg-degan. Itu tandanya kamu peduli dengan hasilmu. Yuk pelan-pelan!"
3. **Feedback Akurasi**: Sebutkan angka akurasi secara spesifik.
   - "Akurasi kuis kamu [X]%, keren! Tinggal sedikit lagi sentuh angka sempurna."
4. **Saran Topik**: Berikan arah belajar selanjutnya berdasarkan Level.

**FORMAT REFLECTIVE (Markdown):**
- **👋 Sapaan & Validasi Emosi**: (Gabungkan sapaan dan interpretasi perasaan)
- **📊 Bedah Performa**: (Komentari Akurasi & Waktu Belajar)
- **💡 Tips Spesifik Lumi**: (Saran V-A-K konkrit)
- **🚀 Penutup Semangat**: (Kalimat penutup pendek yang memotivasi)

Gunakan bahasa Indonesia sehari-hari, *italic* untuk istilah emosi, dan emoji yang relevan. Jangan kaku seperti robot!`;
}
