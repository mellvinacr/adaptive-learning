export interface CurriculumLevel {
    title: string;
    content: string;
    quiz: {
        question: string;
        options: string[];
        correctAnswer: number; // Index 0-based
        explanation: string;
    }[];
}

export const ALJABAR_CURRICULUM: Record<number, CurriculumLevel & { contentVisual: string; contentAuditory: string; contentKinesthetic: string }> = {
    1: {
        title: "Filosofi Aljabar & Si Kotak Misteri",
        content: "Al-jabr berasal dari bahasa Arab yang artinya restorasi atau melengkapi. Huruf x adalah Kotak Misteri yang menyimpan angka rahasia. Tugas kita adalah mencari tahu isinya agar timbangan tetap seimbang.",
        contentVisual: `### 🏛️ Asal Usul Aljabar
**Al-Khawarizmi** menemukan Aljabar untuk **"Menyeimbangkan"**.

### 📦 Si Kotak Misteri (Konsep Visual)
Bayangkan timbangan:
| Sisi Kiri | Tanda | Sisi Kanan |
| :---: | :---: | :---: |
| $x + 4$ | $=$ | $10$ |

Untuk seimbang, "Kotak $x$" harus berisi angka **6**.
$(6) + 4 = 10$ ✅`,
        contentAuditory: `### 🎧 Cerita Aljabar
Dengarkan baik-baik ya! Aljabar itu seperti teka-teki detektif.
Kata kuncinya adalah **MENYEIMBANGKAN**.

Bayangkan kamu punya **Kotak Rahasia** bernama X.
Jika Kotak X ditambah 4 hasilnya 10...
Kira-kira berapa isi kotaknya?
Yap! Isinya pasti 6. Karena 6 tambah 4 sama dengan 10.`,
        contentKinesthetic: `### 🛠️ Lab Aljabar: Mari Mencoba!
Ambil 10 benda kecil (koin/batu) di sekitarmu.

**Langkah 1:**
Taruh 4 koin di meja sebelah kiri.
Taruh 10 koin di meja sebelah kanan.

**Langkah 2:**
Tanya dirimu: "Berapa koin lagi yang harus aku taruh di kiri supaya jumlahnya SAMA dengan kanan?"`,
        quiz: [
            {
                question: "Siapa penemu konsep Aljabar?",
                options: ["Al-Khawarizmi", "Pythagoras", "Newton"],
                correctAnswer: 0,
                explanation: "Tepat! Al-Khawarizmi adalah Bapak Aljabar."
            },
            {
                question: "Jika x + 4 = 10, berapa isi x?",
                options: ["4", "6", "14"],
                correctAnswer: 1,
                explanation: "Betul! 6 + 4 = 10."
            },
            {
                question: "Apa arti kata Al-jabr?",
                options: ["Penghancuran", "Pengurangan", "Restorasi"],
                correctAnswer: 2,
                explanation: "Benar! Al-jabr artinya restorasi/melengkapi."
            }
        ]
    },
    2: {
        title: "Anatomi Bentuk Aljabar",
        content: "Variabel adalah huruf yang nilainya berubah. Koefisien adalah angka di depan variabel. Konstanta adalah angka tetap.",
        contentVisual: `### 🦴 Anatomi Aljabar (Diagram)
Lihat bentuk ini: **$3x + 8$**

| Bagian | Nama | Fungsi |
| :---: | :---: | :--- |
| **$x$** | **Variabel** | Si "Kotak Misteri" (Berubah-ubah) |
| **$3$** | **Koefisien** | Jumlah Kotak (Menempel di variabel) |
| **$8$** | **Konstanta** | Angka Jomblo (Tetap) |`,
        contentAuditory: `### 🎧 Lagu Anatomi Aljabar
Ayo ingat tiga istilah penting ini:

1. **Variabel**: Itu hurufnya! Bisa $x$, bisa $y$. Isinya misterius.
2. **Koefisien**: Itu angka di depan huruf. Dia bosnya huruf.
3. **Konstanta**: Angka yang sendirian. Dia konstan, tidak berubah.`,
        contentKinesthetic: `### 🖐️ Gerak Aljabar
Ayo gunakan tanganmu!

1. Kepalkan tangan kiri = Ini **Variabel ($x$)**.
2. Tunjukkan 3 jari tangan kanan = Ini **Koefisien ($3$)**.
3. Taruh benda diam di meja = Ini **Konstanta**.`,
        quiz: [
            {
                question: "Pada 5y + 12, mana konstantanya?",
                options: ["5", "y", "12"],
                correctAnswer: 2,
                explanation: "Tepat! 12 adalah angka yang berdiri sendiri."
            },
            {
                question: "Mana variabel pada 3a - 7?",
                options: ["3", "a", "-7"],
                correctAnswer: 1,
                explanation: "Benar! 'a' adalah huruf/variabelnya."
            },
            {
                question: "Apa itu koefisien?",
                options: ["Nilai tetap", "Angka di depan variabel", "Huruf"],
                correctAnswer: 1,
                explanation: "Betul! Angka yang menempel di depan variabel."
            }
        ]
    },
    3: {
        title: "Operasi Penjumlahan & Pengurangan",
        content: "Hanya suku sejenis (variabel & pangkat sama) yang bisa dijumlah atau dikurang.",
        contentVisual: `### 🍎 Visualisasi Suku Sejenis
Aturan: **Hanya benda SAMA yang boleh dijumlah.**

| Benda | Simbol | Operasi | Hasil |
| :---: | :---: | :---: | :---: |
| 3 Apel | $3a$ | + 2 Apel ($2a$) | $5a$ ✅ |
| 3 Apel | $3a$ | + 2 Jeruk ($2j$) | $3a+2j$ ❌ |`,
        contentAuditory: `### 🎧 Cerita Pasar Buah
Bayangkan kamu ke pasar.
Kamu beli **3 Apel ($3a$)**.
Lalu beli **2 Jeruk ($2j$)**.

Bisakah kamu bilang: "Saya beli 5 Apel-Jeruk?"
Tentu TIDAK! Hanya yang sama yang bisa dijumlah.`,
        contentKinesthetic: `### 🧺 Sortir Barang
Ambil 2 jenis benda (misal: Pensil dan Penghapus).

1. Tumpuk 3 Pensil + 4 Pensil. Hitung! (7 Pensil).
2. Tumpuk 2 Penghapus.
Itulah prinsip Suku Sejenis.`,
        quiz: [
            {
                question: "Hasil dari 4x + 2y + 3x?",
                options: ["9xy", "7x + 2y", "5x + 4y"],
                correctAnswer: 1,
                explanation: "Tepat! 4x + 3x = 7x. 2y tetap."
            },
            {
                question: "Sederhanakan 8a - 3a + 5",
                options: ["5a + 5", "11a", "5a - 5"],
                correctAnswer: 0,
                explanation: "Benar! 8a - 3a = 5a."
            },
            {
                question: "Hasil 10p - (3p + 2)?",
                options: ["7p + 2", "7p - 2", "13p + 2"],
                correctAnswer: 1,
                explanation: "Hati-hati tanda kurung! 10p - 3p = 7p. Dan -2."
            }
        ]
    },
    4: {
        title: "Keajaiban Perkalian Distributif",
        content: "Perkalian aljabar bisa dilakukan pada suku tidak sejenis menggunakan metode distributif (sebar). Rumus: a(b + c) = ab + ac.",
        contentVisual: `### 🌈 Metode Pelangi (Distributif)
Rumus: $a(b + c) = ab + ac$

**Visualisasi Panah:**
      ┌───> b
    a ( b + c )
      └───> c`,
        contentAuditory: `### 🎧 Paket Hadiah
Bayangkan angka di luar kurung adalah **Hadiah Spesial**.
Jika kamu membawa hadiah masuk ke rumah...
Kamu harus memberikan hadiah itu ke **SETIAP** teman di dalam.`,
        contentKinesthetic: `### 🤝 Salaman Keliling
Bayangkan kamu di luar kurung.
Di dalam ada 2 orang.
Tugasmu: **Masuk dan Salaman dengan SEMUA orang.**`,
        quiz: [
            {
                question: "Berapakah hasil dari (3x) dikali (2y)?",
                options: ["5xy", "6xy", "6x+y"],
                correctAnswer: 1,
                explanation: "Tepat! Kalikan angkanya (3x2=6) dan hurufnya (xy)."
            },
            {
                question: "Gunakan distributif untuk 4(2p + 3)",
                options: ["8p + 3", "8p + 12", "6p + 7"],
                correctAnswer: 1,
                explanation: "Benar! 4x2p=8p, 4x3=12."
            },
            {
                question: "Hasil dari (x + 2)(x + 3)?",
                options: ["x^2 + 5x + 6", "x^2 + 6", "x^2 + 5x + 5"],
                correctAnswer: 0,
                explanation: "Luar biasa! Metode pelangi ganda."
            }
        ]
    },
    5: {
        title: "Seni Pemfaktoran Aljabar",
        content: "Pemfaktoran adalah menguraikan persamaan ke bentuk faktor. Cari dua angka yang jika dikali hasilnya c dan dijumlah hasilnya b.",
        contentVisual: `### 🧩 Puzzle Pemfaktoran
Misi: $x^2 + 5x + 6 \\rightarrow (__)(__)$

Cari dua angka yang memenuhi kotak ini:
| Dikali (Belakang) | Dijumlah (Tengah) |
| :---: | :---: |
| $\\times = 6$ | $+ = 5$ |
| **2 dan 3** | **2 + 3** |`,
        contentAuditory: `### 🎧 Tebak Angka Rahasia
"Kalau dikali hasilnya 6, kalau dijumlah hasilnya 5."
Coba tebak...
1 dan 6? (Jumlahnya 7, salah).
2 dan 3? (Kali 6, Jumlah 5). BENAR!`,
        contentKinesthetic: `### 🏗️ Bongkar Pasang Lego
Persamaan Kuadrat itu seperti bangunan Lego yang sudah jadi.
Tugas kita adalah **Membongkarnya** kembali.`,
        quiz: [
            {
                question: "Apa tujuan dari Pemfaktoran?",
                options: ["Menambah angka", "Menguraikan ke bentuk faktor", "Menghilangkan variabel"],
                correctAnswer: 1,
                explanation: "Tepat! Kita ingin memecahnya menjadi perkalian."
            },
            {
                question: "Faktorkan x^2 - 5x + 6",
                options: ["(x-1)(x-5)", "(x-2)(x-3)", "(x+2)(x+3)"],
                correctAnswer: 1,
                explanation: "Benar! -2 dan -3."
            },
            {
                question: "Faktorkan x^2 + 7x + 10",
                options: ["(x+2)(x+5)", "(x+1)(x+10)", "(x-2)(x-5)"],
                correctAnswer: 0,
                explanation: "Pintar! 2 dan 5 jika dikali 10, dijumlah 7."
            }
        ]
    }
};
