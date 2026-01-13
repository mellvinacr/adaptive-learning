const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, deleteDoc } = require('firebase/firestore');
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

const MATH_FRAGMENTS = [
    // LEVEL 1: Basic Algebra (Variables)
    {
        level: 1,
        order: 1,
        text: "Aljabar sebenarnya hanya teka-teki. Jika 🍎 + 2 = 5, berapakah nilai 🍎? Ya, 3! Dalam matematika, kita ganti apel dengan huruf 'x'. Jadi x + 2 = 5."
    },
    {
        level: 1,
        order: 2,
        text: "Variabel adalah tempat penyimpanan. Bayangkan 'x' adalah kotak kosong. Jika 2 dikali kotak kosong sama dengan 10 (2x = 10), maka kotak itu pasti berisi 5."
    },
    {
        level: 1,
        order: 3,
        text: "Untuk mencari 'x', kita harus memindah angka lain. 'x + 3 = 7'. Kita kurangi kedua sisi dengan 3. Maka x = 4. Kuncinya: adil kiri dan kanan!"
    },

    // LEVEL 2: Linear Equations
    {
        level: 2,
        order: 1,
        text: "Sekarang lebih seru: 2x + 1 = 9. Pertama, buang '+1' dengan mengurangi 1 di kedua sisi. Jadi 2x = 8. Lalu bagi 2. Hasilnya x = 4."
    },
    {
        level: 2,
        order: 2,
        text: "Hati-hati dengan tanda negatif! Jika x - 5 = 2, kita harus MENAMBAH 5 ke kedua sisi agar -5 hilang. Jadi x = 7."
    }
];

const MATH_QUIZZES = [
    // LEVEL 1
    {
        level: 1,
        question: "Jika x + 4 = 10, berapakah x?",
        options: ["4", "5", "6", "14"],
        correctAnswer: 2 // index 2 -> 6
    },
    {
        level: 1,
        question: "Apa arti 3x?",
        options: ["3 ditambah x", "3 dikali x", "3 pangkat x", "x dibagi 3"],
        correctAnswer: 1
    },

    // LEVEL 2
    {
        level: 2,
        question: "Selesaikan: 2x = 12",
        options: ["x = 6", "x = 10", "x = 24", "x = 2"],
        correctAnswer: 0
    },
    {
        level: 2,
        question: "Selesaikan: 3x + 2 = 11",
        options: ["x = 2", "x = 3", "x = 4", "x = 9"],
        correctAnswer: 1 // 3x = 9 -> x = 3
    }
];

async function seed() {
    console.log("Seeding Math Data...");

    // Clear old data
    console.log("Clearing old fragments...");
    const f = await getDocs(collection(db, 'fragments'));
    f.forEach(d => deleteDoc(d.ref));

    console.log("Clearing old quizzes...");
    const q = await getDocs(collection(db, 'quiz'));
    q.forEach(d => deleteDoc(d.ref));

    // Add new data
    for (const item of MATH_FRAGMENTS) {
        await addDoc(collection(db, 'fragments'), item);
        console.log(`Added fragment lvl ${item.level}`);
    }

    for (const item of MATH_QUIZZES) {
        await addDoc(collection(db, 'quiz'), item);
        console.log(`Added quiz lvl ${item.level}`);
    }

    console.log("Done!");
    process.exit(0);
}

seed();
