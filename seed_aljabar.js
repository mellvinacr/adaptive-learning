const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CURRICULUM_DATA = {
    "levels": [
        {
            "id": 1,
            "title": "Filosofi Aljabar & Si Kotak Misteri",
            "content": "Al-jabr berasal dari bahasa Arab yang artinya restorasi atau melengkapi. Huruf x adalah Kotak Misteri yang menyimpan angka rahasia. Tugas kita adalah mencari tahu isinya agar timbangan tetap seimbang.",
            "questions": [
                { "q": "Siapa penemu konsep Aljabar?", "a": "Al-Khawarizmi", "options": ["Al-Khawarizmi", "Pythagoras", "Newton"] },
                { "q": "Jika x + 4 = 10, berapa isi x?", "a": "6", "options": ["4", "6", "14"] },
                { "q": "Apa arti kata Al-jabr?", "a": "Restorasi", "options": ["Penghancuran", "Pengurangan", "Restorasi"] }
            ]
        },
        {
            "id": 2,
            "title": "Anatomi Bentuk Aljabar",
            "content": "Variabel adalah huruf yang nilainya berubah. Koefisien adalah angka di depan variabel. Konstanta adalah angka tetap.",
            "questions": [
                { "q": "Pada 5y + 12, mana konstantanya?", "a": "12", "options": ["5", "y", "12"] },
                { "q": "Mana variabel pada 3a - 7?", "a": "a", "options": ["3", "a", "-7"] },
                { "q": "Apa itu koefisien?", "a": "Angka di depan variabel", "options": ["Nilai tetap", "Angka di depan variabel", "Huruf"] }
            ]
        },
        {
            "id": 3,
            "title": "Operasi Penjumlahan & Pengurangan",
            "content": "Hanya suku sejenis (variabel & pangkat sama) yang bisa dijumlah atau dikurang.",
            "questions": [
                { "q": "Hasil dari 4x + 2y + 3x?", "a": "7x + 2y", "options": ["9xy", "7x + 2y", "5x + 4y"] },
                { "q": "Sederhanakan 8a - 3a + 5", "a": "5a + 5", "options": ["5a + 5", "11a", "5a - 5"] },
                { "q": "Hasil 10p - (3p + 2)?", "a": "7p - 2", "options": ["7p + 2", "7p - 2", "13p + 2"] }
            ]
        },
        {
            "id": 4,
            "title": "Keajaiban Perkalian Distributif",
            "content": "Perkalian aljabar bisa dilakukan pada suku tidak sejenis menggunakan metode distributif (sebar). Rumus: a(b + c) = ab + ac.",
            "questions": [
                { "q": "Berapakah hasil dari (3x) dikali (2y)?", "a": "6xy", "options": ["5xy", "6xy", "6x+y"] },
                { "q": "Gunakan distributif untuk 4(2p + 3)", "a": "8p + 12", "options": ["8p + 3", "8p + 12", "6p + 7"] },
                { "q": "Hasil dari (x + 2)(x + 3)?", "a": "x^2 + 5x + 6", "options": ["x^2 + 5x + 6", "x^2 + 6", "x^2 + 5x + 5"] }
            ]
        },
        {
            "id": 5,
            "title": "Seni Pemfaktoran Aljabar",
            "content": "Pemfaktoran adalah menguraikan persamaan ke bentuk faktor. Cari dua angka yang jika dikali hasilnya c dan dijumlah hasilnya b.",
            "questions": [
                { "q": "Apa tujuan dari Pemfaktoran?", "a": "Menguraikan ke bentuk faktor", "options": ["Menambah angka", "Menguraikan ke bentuk faktor", "Menghilangkan variabel"] },
                { "q": "Faktorkan x^2 - 5x + 6", "a": "(x-2)(x-3)", "options": ["(x-1)(x-5)", "(x-2)(x-3)", "(x+2)(x+3)"] },
                { "q": "Faktorkan x^2 + 7x + 10", "a": "(x+2)(x+5)", "options": ["(x+2)(x+5)", "(x+1)(x+10)", "(x-2)(x-5)"] }
            ]
        }
    ]
};

async function seedAljabar() {
    console.log('🚀 Starting Client-Side Aljabar Seeding...');

    // Use subcollection approach: curriculum/aljabar/levels/{id}
    // OR matching the 'fragments' and 'quiz' collections used by the app if we want to replace dynamic loading?
    // The App reads from 'fragments' and 'quiz' collections in fetchData(). 
    // But also reads 'curriculum/aljabar' if we change the code?
    // The User request specifically said "Impor ... ke koleksi curriculum/aljabar".

    // We will respect that exact path.
    const curriculumRef = doc(db, 'curriculum', 'aljabar');

    // 1. Set Main Info
    await setDoc(curriculumRef, {
        title: "Aljabar",
        description: "Cabang matematika yang menggunakan simbol dan huruf untuk memecahkan masalah.",
        totalLevels: 5,
        updatedAt: new Date()
    });

    // 2. Seed Levels as Subcollection 'levels'
    const levelsCollectionRef = collection(curriculumRef, 'levels');

    for (const level of CURRICULUM_DATA.levels) {
        const levelDocRef = doc(levelsCollectionRef, level.id.toString());

        // Format Quiz
        const formattedQuiz = level.questions.map(q => ({
            question: q.q,
            options: q.options,
            correctAnswer: q.options.indexOf(q.a),
            explanation: "Jawaban yang tepat adalah " + q.a
        }));

        await setDoc(levelDocRef, {
            title: level.title,
            content: level.content,
            quiz: formattedQuiz,
            level: level.id
        });

        console.log(`✅ Seeded Level ${level.id}: ${level.title}`);
    }

    console.log('🎉 Aljabar Seeding Complete!');
    process.exit(0);
}

seedAljabar();
