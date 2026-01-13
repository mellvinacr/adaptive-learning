
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

const SAMPLE_CONTENT = [
    // 1. Aljabar (Algebra)
    { order: 1, level: 1, topic: "Aljabar", text: "Aljabar adalah cabang matematika yang menggunakan simbol dan huruf untuk mewakili angka dan nilai yang tidak diketahui." },
    { order: 2, level: 1, topic: "Aljabar", text: "Dalam persamaan linear y = mx + c, 'm' adalah gradien (kemiringan) dan 'c' adalah konstanta y-intercept." },
    { order: 3, level: 1, topic: "Aljabar", text: "Pertidaksamaan linear mirip dengan persamaan, tetapi menggunakan tanda <, >, ≤, atau ≥." },

    // 2. Trigonometri
    { order: 1, level: 1, topic: "Trigonometri", text: "Trigonometri mempelajari hubungan antara panjang sisi dan sudut segitiga." },
    { order: 2, level: 1, topic: "Trigonometri", text: "Sinus (sin) adalah perbandingan sisi depan sudut dengan sisi miring segitiga siku-siku." },
    { order: 3, level: 1, topic: "Trigonometri", text: "Cosinus (cos) adalah perbandingan sisi samping sudut dengan sisi miring." },

    // 3. Geometri
    { order: 1, level: 1, topic: "Geometri", text: "Geometri membahas bentuk, ukuran, posisi relatif gambar, dan sifat ruang." },
    { order: 2, level: 1, topic: "Geometri", text: "Teorema Pythagoras (a² + b² = c²) hanya berlaku pada segitiga siku-siku." },
    { order: 3, level: 1, topic: "Geometri", text: "Luas lingkaran dihitung dengan rumus πr², dimana r adalah jari-jari lingkaran." },

    // 4. Statistika
    { order: 1, level: 1, topic: "Statistika", text: "Statistika adalah ilmu mengumpulkan, menganalisis, dan menafsirkan data." },
    { order: 2, level: 1, topic: "Statistika", text: "Mean adalah rata-rata nilai, Median adalah nilai tengah, dan Modus adalah nilai yang paling sering muncul." },

    // 5. Kalkulus
    { order: 1, level: 1, topic: "Kalkulus", text: "Kalkulus berfokus pada perubahan, meliputi limit, turunan, dan integral." },
    { order: 2, level: 1, topic: "Kalkulus", text: "Turunan (derivatif) mengukur seberapa cepat suatu fungsi berubah pada titik tertentu." },

    // 6. Logika Matematika
    { order: 1, level: 1, topic: "Logika", text: "Logika matematika menggunakan operator seperti AND, OR, NOT, dan IMPLIKASI untuk menentukan kebenaran argumen." },
    { order: 2, level: 1, topic: "Logika", text: "Pernyataan 'Jika P maka Q' bernilai salah HANYA jika P benar dan Q salah." }
];

const SAMPLE_QUIZ = [
    // Aljabar
    {
        id: "q1_aljabar",
        level: 1,
        topic: "Aljabar",
        question: "Dalam persamaan y = 3x + 5, angka 3 melambangkan apa?",
        options: ["Konstanta", "Gradien (Kemiringan)", "Variabel", "Y-intercept"],
        correctAnswer: 1
    },
    // Trigonometri
    {
        id: "q1_trigo",
        level: 1,
        topic: "Trigonometri",
        question: "Rasio sisi depan dibagi sisi miring pada segitiga siku-siku disebut?",
        options: ["Cosinus", "Tangen", "Sinus", "Secan"],
        correctAnswer: 2
    },
    // Geometri
    {
        id: "q1_geo",
        level: 1,
        topic: "Geometri",
        question: "Rumus luas lingkaran adalah?",
        options: ["2πr", "πr²", "πd", "p x l"],
        correctAnswer: 1
    },
    // Statistika
    {
        id: "q1_stat",
        level: 1,
        topic: "Statistika",
        question: "Nilai tengah dari sekumpulan data yang telah diurutkan disebut?",
        options: ["Mean", "Modus", "Median", "Range"],
        correctAnswer: 2
    },
    // Kalkulus
    {
        id: "q1_kal",
        level: 1,
        topic: "Kalkulus",
        question: "Cabang matematika yang mempelajari laju perubahan adalah?",
        options: ["Aljabar", "Geometri", "Kalkulus", "Trigonometri"],
        correctAnswer: 2
    },
    // Logika
    {
        id: "q1_log",
        level: 1,
        topic: "Logika",
        question: "Ingkaran dari pernyataan 'Semua siswa lulus' adalah?",
        options: ["Semua siswa tidak lulus", "Ada siswa yang tidak lulus", "Tidak ada siswa yang lulus", "Beberapa siswa lulus"],
        correctAnswer: 1
    }
];

export async function POST() {
    try {
        const batch = writeBatch(db);

        // Seed Fragments
        const fragmentsRef = collection(db, 'fragments');
        // Delete all existing fragments first (optional, but cleaner for dev)
        // For now, we just overwrite based on IDs which might leave old stuff if IDs change.
        // Ideally we'd delete collection but that's expensive in client-side Firestore SDK without Admin SDK.

        SAMPLE_CONTENT.forEach((item) => {
            // ID format: fragment-[topic]-l[level]-[order]
            // Sanitize topic for ID
            const topicId = item.topic.toLowerCase().replace(/\s+/g, '-');
            const docRef = doc(fragmentsRef, `fragment-${topicId}-l${item.level}-${item.order}`);
            batch.set(docRef, item);
        });

        // Seed Quiz
        const quizRef = collection(db, 'quiz');
        SAMPLE_QUIZ.forEach((item) => {
            const docRef = doc(quizRef, item.id);
            batch.set(docRef, item);
        });


        await batch.commit();

        return NextResponse.json({ message: 'Database seeded with Math SMA Content & Quiz', count: SAMPLE_CONTENT.length + SAMPLE_QUIZ.length });
    } catch (error) {
        console.error("Error seeding database:", error);
        return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
    }
}
