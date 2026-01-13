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

const GEOMETRI_DATA = {
    "levels": [
        {
            "id": 1,
            "title": "Dasar-Dasar Geometri",
            "content": "Geometri modern dimulai dari unsur yang tidak didefinisikan: **Titik**, **Garis**, dan **Bidang**. Titik menunjukkan posisi, Garis adalah kumpulan titik tak terbatas, dan Bidang adalah permukaan rata.",
            "questions": [
                { "q": "Mana yang merupakan unsur tidak didefinisikan?", "a": "Titik", "options": ["Titik", "Segitiga", "Persegi"] },
                { "q": "Garis adalah kumpulan dari apa?", "a": "Titik", "options": ["Bidang", "Titik", "Sudut"] },
                { "q": "Permukaan rata yang tak terbatas disebut?", "a": "Bidang", "options": ["Garis", "Titik", "Bidang"] }
            ]
        },
        {
            "id": 2,
            "title": "Segi Banyak (Poligon)",
            "content": "Poligon adalah kurva tertutup sederhana yang terdiri dari segmen-segmen garis. Contohnya adalah Segitiga (3 sisi) dan Segiempat (4 sisi).",
            "questions": [
                { "q": "Segitiga memiliki berapa sisi?", "a": "3", "options": ["3", "4", "5"] },
                { "q": "Apa sebutan untuk kurva tertutup dari garis?", "a": "Poligon", "options": ["Lingkaran", "Garis", "Poligon"] },
                { "q": "Berapa jumlah sisi pada pentagon?", "a": "5", "options": ["4", "5", "6"] }
            ]
        },
        {
            "id": 3,
            "title": "Kekongruenan",
            "content": "Dua bangun dikatakan **Kongruen** jika memiliki bentuk dan ukuran yang sama persis (sama dan sebangun). Sisi dan sudut yang bersesuaian harus sama.",
            "questions": [
                { "q": "Apa syarat utama Kongruen?", "a": "Bentuk dan ukuran sama", "options": ["Bentuk saja", "Ukuran saja", "Bentuk dan ukuran sama"] },
                { "q": "Istilah lain kongruen adalah?", "a": "Sama dan sebangun", "options": ["Mirip", "Sama dan sebangun", "Berbeda"] },
                { "q": "Jika sisi sama panjang, maka disebut?", "a": "Kongruen", "options": ["Sebangun", "Kongruen", "Berlawanan"] }
            ]
        },
        {
            "id": 4,
            "title": "Kesebangunan",
            "content": "Bangun dikatakan **Sebangun** jika perbandingan sisi-sisi yang bersesuaian sama, meskipun ukurannya berbeda (skala).",
            "questions": [
                { "q": "Sebangun fokus pada perbandingan apa?", "a": "Sisi", "options": ["Warna", "Sisi", "Berat"] },
                { "q": "Apakah ukuran harus sama pada sebangun?", "a": "Tidak", "options": ["Ya", "Tidak", "Mungkin"] },
                { "q": "Dua segitiga sebangun jika sudutnya?", "a": "Sama besar", "options": ["Berbeda", "Sama besar", "Kecil"] }
            ]
        },
        {
            "id": 5,
            "title": "Bangun Ruang & Kaidah Euler",
            "content": "Bangun ruang dibatasi oleh sisi, rusuk, dan titik sudut. Kaidah Euler: $S + T = R + 2$.",
            "questions": [
                { "q": "Perpotongan dua sisi disebut?", "a": "Rusuk", "options": ["Titik", "Rusuk", "Diagonal"] },
                { "q": "Rumus Euler adalah?", "a": "S + T = R + 2", "options": ["a^2 + b^2 = c^2", "S + T = R + 2", "F = m . a"] },
                { "q": "Diagonal bidang berada di mana?", "a": "Pada sisi", "options": ["Luar bangun", "Dalam ruang", "Pada sisi"] }
            ]
        }
    ]
};

const TRIGONOMETRI_DATA = {
    "levels": [
        {
            "id": 1,
            "title": "Pengenalan Sinus (SinDemi)",
            "content": "Trigonometri mempelajari sudut segitiga. **Sinus (Sin)** adalah perbandingan sisi Depan dibagi sisi Miring. \n\n$$ \\text{Sin} = \\frac{\\text{Depan}}{\\text{Miring}} $$\n\nIngat: **Sin-De-Mi**.",
            "questions": [
                { "q": "Sinus adalah perbandingan Depan dengan?", "a": "Miring", "options": ["Samping", "Miring", "Lurus"] },
                { "q": "Jembatan keledai untuk Sinus?", "a": "SinDemi", "options": ["SinSami", "SinDemi", "SinDesa"] },
                { "q": "Sisi terpanjang segitiga disebut?", "a": "Miring", "options": ["Depan", "Samping", "Miring"] }
            ]
        },
        {
            "id": 2,
            "title": "Kosinus (KosSami)",
            "content": "**Kosinus (Cos)** adalah perbandingan sisi Samping sudut dibagi sisi Miring. \n\n$$ \\text{Cos} = \\frac{\\text{Samping}}{\\text{Miring}} $$\n\nIngat: **Kos-Sa-Mi**.",
            "questions": [
                { "q": "Kosinus menggunakan sisi apa?", "a": "Samping", "options": ["Depan", "Samping", "Belakang"] },
                { "q": "Rumus Kosinus adalah?", "a": "Samping/Miring", "options": ["Depan/Miring", "Samping/Miring", "Depan/Samping"] },
                { "q": "Singkatan dari Kosinus?", "a": "Cos", "options": ["Sin", "Cos", "Tan"] }
            ]
        },
        {
            "id": 3,
            "title": "Tangen (TanDesa)",
            "content": "**Tangen (Tan)** adalah perbandingan sisi Depan dibagi sisi Samping. \n\n$$ \\text{Tan} = \\frac{\\text{Depan}}{\\text{Samping}} $$\n\nIngat: **Tan-De-Sa**.",
            "questions": [
                { "q": "Tangen tidak melibatkan sisi apa?", "a": "Miring", "options": ["Depan", "Samping", "Miring"] },
                { "q": "Rumus Tangen?", "a": "Depan/Samping", "options": ["Depan/Samping", "Depan/Miring", "Samping/Miring"] },
                { "q": "TanDesa artinya?", "a": "Depan/Samping", "options": ["Depan/Samping", "Depan/Sini", "Depan/Sana"] }
            ]
        },
        {
            "id": 4,
            "title": "Kebalikan Trigonometri",
            "content": "**Kosekan** (Cosec) adalah kebalikan Sinus. **Sekan** (Sec) adalah kebalikan Kosinus. **Kotangen** (Cot) adalah kebalikan Tangen.",
            "questions": [
                { "q": "Kebalikan dari Sinus?", "a": "Kosekan", "options": ["Sekan", "Kosekan", "Kotangen"] },
                { "q": "Sekan adalah kebalikan dari?", "a": "Kosinus", "options": ["Sinus", "Kosinus", "Tangen"] },
                { "q": "Kebalikan Tangen?", "a": "Kotangen", "options": ["Sinus", "Kosekan", "Kotangen"] }
            ]
        },
        {
            "id": 5,
            "title": "Penerapan Trigonometri",
            "content": "Trigonometri digunakan untuk mengukur tinggi pohon atau gedung tanpa memanjatnya, menggunakan sudut elevasi pandangan mata.",
            "questions": [
                { "q": "Sudut elevasi digunakan untuk?", "a": "Ukur tinggi", "options": ["Ukur berat", "Ukur tinggi", "Ukur suhu"] },
                { "q": "Apa yang diukur tanpa memanjat?", "a": "Ketinggian", "options": ["Ketinggian", "Ketebalan", "Kecepatan"] },
                { "q": "Trigonometri berguna di bidang?", "a": "Arsitektur", "options": ["Memasak", "Arsitektur", "Melukis"] }
            ]
        }
    ]
};

async function seedExpansion() {
    console.log('🚀 Starting Expansion Seeding (Geometri & Trigonometri)...');

    // SEED GEOMETRI
    const geoRef = doc(db, 'curriculum', 'geometri');
    await setDoc(geoRef, {
        title: "Geometri",
        description: "Ilmu ukur yang mempelajari titik, garis, bidang, dan bangun ruang.",
        totalLevels: 5,
        updatedAt: new Date()
    });

    const geoLevelsRef = collection(geoRef, 'levels');
    for (const level of GEOMETRI_DATA.levels) {
        // Format Quiz
        const formattedQuiz = level.questions.map(q => ({
            question: q.q,
            options: q.options,
            correctAnswer: q.options.indexOf(q.a),
            explanation: "Jawaban yang tepat adalah " + q.a
        }));

        await setDoc(doc(geoLevelsRef, level.id.toString()), {
            level: level.id,
            title: level.title,
            content: level.content,
            quiz: formattedQuiz
        });
        console.log(`✅ Seeded Geometri Level ${level.id}`);
    }

    // SEED TRIGONOMETRI
    const trigoRef = doc(db, 'curriculum', 'trigonometri');
    await setDoc(trigoRef, {
        title: "Trigonometri",
        description: "Cabang matematika yang mempelajari hubungan antara panjang sisi dan sudut segitiga.",
        totalLevels: 5,
        updatedAt: new Date()
    });

    const trigoLevelsRef = collection(trigoRef, 'levels');
    for (const level of TRIGONOMETRI_DATA.levels) {
        // Format Quiz
        const formattedQuiz = level.questions.map(q => ({
            question: q.q,
            options: q.options,
            correctAnswer: q.options.indexOf(q.a),
            explanation: "Jawaban yang tepat adalah " + q.a
        }));

        await setDoc(doc(trigoLevelsRef, level.id.toString()), {
            level: level.id,
            title: level.title,
            content: level.content,
            quiz: formattedQuiz
        });
        console.log(`✅ Seeded Trigonometri Level ${level.id}`);
    }

    console.log('🎉 Expansion Seeding Complete!');
    process.exit(0);
}

seedExpansion();
