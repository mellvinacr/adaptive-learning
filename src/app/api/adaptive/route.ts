import { NextResponse } from 'next/server';
import { model } from '@/lib/gemini';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFallbackContent } from './fallbackData';

// ============================================
// RICH OFFLINE CONTENT DATABASE
// ============================================
const OFFLINE_CONTENT: Record<string, Record<number, string>> = {
    aljabar: {
        1: `### 💡 Pengantar Aljabar - Level 1

**Analogi Dunia Nyata**: 
Bayangkan aljabar seperti timbangan dapur. Apa pun yang kamu lakukan di sisi kiri, harus kamu lakukan juga di sisi kanan agar tetap seimbang!

**Langkah Penyelesaian Persamaan Linear**:
1. **Identifikasi**: Temukan variabel (biasanya x) dan konstanta (angka biasa)
2. **Kelompokkan**: Pindahkan variabel ke satu sisi, konstanta ke sisi lain
3. **Selesaikan**: Bagi kedua sisi dengan koefisien variabel

**Contoh Soal**:
$$2x + 5 = 13$$
- Kurangi 5 dari kedua sisi: $$2x = 8$$
- Bagi kedua sisi dengan 2: $$x = 4$$

**Tips Mengingat**: "Yang pindah rumah, ganti tanda!" 🏠➡️`,

        2: `### 💡 Persamaan Linear Dua Variabel - Level 2

**Analogi Dunia Nyata**:
Seperti mencari harga 2 barang di toko. Kamu butuh 2 petunjuk (persamaan) untuk menemukan harga masing-masing!

**Metode Substitusi**:
1. Nyatakan satu variabel dalam variabel lain dari persamaan pertama
2. Substitusikan ke persamaan kedua
3. Selesaikan variabel yang tersisa
4. Cari nilai variabel pertama

**Metode Eliminasi**:
1. Samakan koefisien salah satu variabel
2. Kurangkan atau jumlahkan kedua persamaan
3. Selesaikan variabel yang tersisa

**Rumus Umum**:
$$ax + by = c$$
$$dx + ey = f$$

**Tips**: Eliminasi lebih cepat, Substitusi lebih aman! ⚡`,

        3: `### 💡 Pertidaksamaan Linear - Level 3

**Konsep Kunci**:
Pertidaksamaan seperti persamaan, tapi jawabannya berupa RANGE nilai, bukan satu angka!

**Simbol Penting**:
- $$>$$ : lebih dari
- $$<$$ : kurang dari
- $$\\geq$$ : lebih dari atau sama dengan
- $$\\leq$$ : kurang dari atau sama dengan

**Aturan Emas**:
Jika mengalikan/membagi dengan bilangan NEGATIF, tanda pertidaksamaan BERBALIK!

$$-2x > 6 \\Rightarrow x < -3$$

**Tips Menggambar**: Garis bilangan adalah teman terbaikmu! 📏`,

        4: `### 💡 Sistem Persamaan Kuadrat - Level 4

**Rumus ABC (Kuadrat)**:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

**Langkah Penggunaan**:
1. Tulis dalam bentuk standar: $$ax^2 + bx + c = 0$$
2. Identifikasi nilai a, b, dan c
3. Substitusi ke rumus ABC
4. Hitung kedua kemungkinan (+ dan -)

**Diskriminan** ($$D = b^2 - 4ac$$):
- D > 0: Dua akar berbeda
- D = 0: Satu akar (kembar)
- D < 0: Tidak ada akar real

**Tips**: Hafalkan rumus ABC seperti lagu! 🎵`,

        5: `### 💡 Aplikasi Aljabar dalam Kehidupan - Level 5

**Contoh Aplikasi**:
1. **Ekonomi**: Menghitung break-even point bisnis
2. **Fisika**: Persamaan gerak lurus berubah beraturan
3. **Teknologi**: Algoritma dan pemrograman

**Soal Cerita Tips**:
1. Baca dengan teliti, tandai angka-angka penting
2. Tentukan apa yang dicari (variabel)
3. Tulis persamaan berdasarkan informasi
4. Selesaikan dan periksa jawaban

**Rumus Praktis**:
$$Jarak = Kecepatan \\times Waktu$$
$$s = v \\times t$$

**Kamu sudah di level tertinggi! Luar biasa!** 🏆`
    }
};

const DEFAULT_FALLBACK = `### 💡 Panduan Belajar

**Langkah Dasar Mengerjakan Soal**:
1. Baca soal dengan teliti
2. Identifikasi apa yang diketahui
3. Tentukan apa yang ditanyakan
4. Pilih rumus yang sesuai
5. Substitusi dan hitung
6. Periksa jawaban

*Konten offline - API akan segera tersedia!*`;

// ============================================
// API ROUTE HANDLER
// ============================================
export async function POST(req: Request) {
    const body = await req.json();
    const { text, style, topic, mode, level } = body;
    const currentLevel = level || 1;

    // Silent logging - only essential info
    console.log(`📦 [API] ${mode} | ${topic} L${currentLevel} | ${style}`);

    if (!text) {
        return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // ============================================
    // 1. CACHE FIRST - Always check before API
    // ============================================
    const cacheKey = `${topic}_L${currentLevel}_${style}_${mode}`.replace(/\s+/g, '_');

    try {
        const cacheRef = doc(db, 'materi_cache', cacheKey);
        const cacheDoc = await getDoc(cacheRef);

        if (cacheDoc.exists()) {
            console.log(`✅ Cache HIT: ${cacheKey}`);
            return NextResponse.json({
                explanation: cacheDoc.data()?.explanation,
                fromCache: true
            });
        }
    } catch (cacheErr) {
        // Silent fail for cache - continue to API
    }

    // ============================================
    // 2. BUILD PROMPT (Only if cache miss)
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
    try {
        const result = await model.generateContent(prompt);
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

        return NextResponse.json({ explanation });

    } catch (apiError: any) {
        // QUIET ERROR HANDLING - No red console spam
        if (apiError.message?.includes("429")) {
            console.log(`ℹ️ [API] Serving offline content (Quota limit)`);
        } else {
            console.log(`ℹ️ [API] Fallback mode: ${apiError.message?.substring(0, 50)}`);
        }

        // Get rich offline content from fallbackData.ts
        const offlineExplanation = getFallbackContent(topic, currentLevel);

        return NextResponse.json({
            explanation: offlineExplanation,
            isOffline: true,
            retryAfter: 60
        });
    }
}

// ============================================
// PROMPT BUILDERS
// ============================================
function buildStepByStepPrompt(text: string, topic: string, style: string): string {
    return `Jelaskan konsep matematika ini dengan detail:

**Materi:** ${text}
**Topik:** ${topic}

FORMAT WAJIB:
### 💡 [Judul]

**Analogi Dunia Nyata**: [1 paragraf relate dengan kehidupan siswa SMA]

**Langkah Penyelesaian**:
1. [Langkah 1 dengan penjelasan]
2. [Langkah 2]
3. [Langkah 3]

**Rumus**: $$[LaTeX format]$$

**Tips Mengingat**: [1 kalimat catchy]

Bahasa Indonesia ramah. Max 200 kata. Semua rumus pakai $$...$$.`;
}

function buildWelcomePrompt(topic: string, style: string): string {
    return `Sapaan singkat (2 kalimat) untuk siswa mulai belajar "${topic}". 
Gaya ${style}. Bahasa Indonesia, ramah, memotivasi.`;
}

function buildReportPrompt(text: string): string {
    return `Analisis singkat (3 kalimat) data siswa: "${text}"
1. Akui emosi mereka
2. Hubungkan dengan performa
3. Beri 1 tips spesifik
Nada hangat dan profesional.`;
}
