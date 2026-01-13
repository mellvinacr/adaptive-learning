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

export const ALJABAR_CURRICULUM: Record<number, CurriculumLevel> = {
    1: {
        title: "Filosofi Aljabar & Si Kotak Misteri",
        content: `### 🏛️ Asal Usul Aljabar
Tahukah kamu? Kata **"Al-jabr"** berasal dari bahasa Arab yang artinya *restorasi* atau *melengkapi*. Ilmu keren ini ditemukan oleh cendekiawan besar bernama **Al-Khawarizmi**.

### 📦 Si Kotak Misteri
Dalam Aljabar, kamu akan sering bertemu huruf seperti $x, a, \\text{ atau } b$. 
**Jangan panik!** Anggap saja huruf-huruf ini sebagai **Kotak Misteri** yang menyimpan angka rahasia.

Tugas kita adalah menjadi **detektif** 🕵️‍♂️ yang mencari tahu isi di dalam kotak tersebut agar timbangan matematika tetap seimbang.

Contoh: 
Jika $x + 4 = 10$, itu artinya:
*"Angka berapa yang jika ditambah 4 hasilnya 10?"*
Jawabannya pasti 6! Jadi, $x = 6$.`,
        quiz: [
            {
                question: "Jika kotak misteri $x$ ditambah 5 hasilnya 12 ($x + 5 = 12$), berapakah $x$?",
                options: ["5", "7", "17"],
                correctAnswer: 1,
                explanation: "Tepat! Karena 7 + 5 = 12."
            },
            {
                question: "Angka berapa yang jika dikurangi 3 hasilnya 10? ($a - 3 = 10$)",
                options: ["7", "13", "30"],
                correctAnswer: 1,
                explanation: "Betul! 13 - 3 = 10."
            },
            {
                question: "Jika $2 \\times x = 10$, itu artinya $x$ berisi angka...",
                options: ["5", "8", "12"],
                correctAnswer: 0,
                explanation: "Pintar! 2 dikali 5 hasilnya 10."
            }
        ]
    },
    2: {
        title: "Anatomi Bentuk Aljabar",
        content: `### 🦴 Bedah Tubuh Aljabar
Sama seperti manusia punya kepala, tangan, dan kaki, bentuk Aljabar juga punya bagian-bagian tubuh lho!

Mari kita lihat bentuk: $3x + 8$

1. **Variabel** ($x$): Huruf yang nilainya bisa berubah-ubah. Ini si "Kotak Misteri" tadi.
2. **Koefisien** ($3$): Angka yang *menempel* di depan variabel. Dia menunjukkan berapa banyak kotaknya.
3. **Konstanta** ($8$): Angka jomblo yang berdiri sendiri tanpa huruf. Nilainya tetap (konstan).

### 🤝 Suku Sejenis
Gabungan koefisien & variabel disebut **Suku**. 
Ingat aturan ini: **"Hanya suku sejenis yang bisa dijumlahkan!"**
- $2x$ dan $5x$ = SEJENIS (Sama-sama $x$)
- $3a$ dan $3b$ = TIDAK SEJENIS (Huruf beda)`,
        quiz: [
            {
                question: "Manakah yang merupakan konstanta dari bentuk $3x + 8$?",
                options: ["3", "x", "8"],
                correctAnswer: 2,
                explanation: "Betul! 8 adalah angka yang berdiri sendiri."
            },
            {
                question: "Pada bentuk $7y - 2$, angka 7 disebut sebagai...",
                options: ["Variabel", "Koefisien", "Konstanta"],
                correctAnswer: 1,
                explanation: "Tepat! Koefisien selalu menempel di depan variabel."
            },
            {
                question: "Manakah pasangan suku yang sejenis?",
                options: ["$2x$ dan $2y$", "$5a$ dan $-2a$", "$3x$ dan $3$"],
                correctAnswer: 1,
                explanation: "Benar! Keduanya memuat variabel 'a'."
            }
        ]
    },
    3: {
        title: "Operasi Penjumlahan & Pengurangan",
        content: `### 🍎 Aturan Emas Lumi
Ingat mantra ini: **"Hanya Suku Sejenis yang Boleh Bersatu!"**

Bayangkan kamu punya:
- 5 Apel ($5a$) 🍎🍎🍎🍎🍎
- 6 Jeruk ($6j$) 🍊🍊🍊🍊🍊🍊

Kamu **TIDAK BISA** menjumlahkan apel dan jeruk.
Tapi kalau ada yang mengambil 2 Apel ($2a$), maka:
$5a - 2a = 3a$ (3 Apel).

### ⚠️ Hati-hati!
Jika soalnya tercampur, kumpulkan dulu yang sejenis.
Contoh: $5a + 6a - 2b$
1. Kelompokkan $a$: $5a + 6a = 11a$
2. Biarkan $b$: $-2b$
3. Hasil: $11a - 2b$`,
        quiz: [
            {
                question: "Sederhanakan bentuk $5a + 6a - 2b$:",
                options: ["$9ab$", "$11a - 2b$", "$9a$"],
                correctAnswer: 1,
                explanation: "Tepat! 5a dan 6a dijumlahkan jadi 11a. 2b tetap sendiri."
            },
            {
                question: "Hasil dari $3x + 4x$ adalah...",
                options: ["$7x$", "$12x$", "$7x^2$"],
                correctAnswer: 0,
                explanation: "Mudah kan? 3 Apel + 4 Apel = 7 Apel."
            },
            {
                question: "Berapakah hasil $10y - 3y + 2$?",
                options: ["$9y$", "$7y + 2$", "$13y$"],
                correctAnswer: 1,
                explanation: "Betul! Kerjakan yang hurufnya sama dulu: 10y - 3y = 7y."
            }
        ]
    },
    4: {
        title: "Keajaiban Perkalian Distributif",
        content: `### ✨ Kebebasan Perkalian
Berbeda dengan penjumlahan, perkalian Aljabar itu bebas! Kamu bisa mengalikan suku yang **tidak sejenis**.

### 🚀 Metode Pelangi (Distributif)
Bayangkan kamu menyebar benih ke ladang.
Angka di luar kurung harus dikalikan **satu per satu** ke SEMUA angka di dalam.

Rumus: $a(b + c) = ab + ac$

Contoh: $4(2p + 3)$
1. $4 \\times 2p = 8p$
2. $4 \\times 3 = 12$
3. Hasil: $8p + 12$

Kalau double kurung? $(x+2)(x+3)$
Kalikan pelangi 4 kali: $x^2 + 3x + 2x + 6$`,
        quiz: [
            {
                question: "Hasil perkalian pelangi dari $4(2p + 3)$ adalah...",
                options: ["$8p + 3$", "$6p + 7$", "$8p + 12$"],
                correctAnswer: 2,
                explanation: "Keren! Kalikan ke depan (4x2p) dan ke belakang (4x3)."
            },
            {
                question: "Jabarkan bentuk $3(x - 5)$:",
                options: ["$3x - 5$", "$3x - 15$", "$3x + 15$"],
                correctAnswer: 1,
                explanation: "Hati-hati tanda minus! 3 dikali -5 hasilnya -15."
            },
            {
                question: "Berapakah hasil $(x) \\times (x)$?",
                options: ["$2x$", "$x^2$", "$x$"],
                correctAnswer: 1,
                explanation: "Ingat dasar pangkat! x kali x itu x kuadrat."
            }
        ]
    },
    5: {
        title: "Seni Pemfaktoran Aljabar",
        content: `### 🧩 Memecahkan Kode Rahasia
Pemfaktoran adalah kebalikan dari perkalian. Kita seperti detektif yang ingin tahu: 
*"Dari mana persamaan ini berasal?"*

Kita menguraikan persamaan panjang menjadi faktor-faktor perkaliannya.

### 🔍 Misi: $x^2 + bx + c$
Cari dua angka rahasia yang:
1. Jika **Dikali** hasilnya $c$ (belakang)
2. Jika **Dijumlah** hasilnya $b$ (tengah)

Contoh: $x^2 - 5x + 6$
- Cari angka yg dikali = 6, dijumlah = -5.
- Angkanya adalah -2 dan -3! 
  (-2 x -3 = 6) ✅
  (-2 + -3 = -5) ✅
- Jadi faktornya: $(x - 2)(x - 3)$`,
        quiz: [
            {
                question: "Faktorkan persamaan kuadrat $x^2 - 5x + 6$:",
                options: ["$(x+2)(x+3)$", "$(x-2)(x-3)$", "$(x-1)(x-6)$"],
                correctAnswer: 1,
                explanation: "Luar biasa! -2 dan -3 jika dikali 6, jika dijumlah -5."
            },
            {
                question: "Cari faktor dari $x^2 + 3x + 2$:",
                options: ["$(x+1)(x+2)$", "$(x+3)(x-1)$", "$(x+2)(x-1)$"],
                correctAnswer: 0,
                explanation: "Tepat! 1 dan 2. (1x2=2, 1+2=3)."
            },
            {
                question: "Angka berapa yang jika dikali hasilnya 12, dijumlah hasilnya 7?",
                options: ["2 dan 6", "3 dan 4", "1 dan 12"],
                correctAnswer: 1,
                explanation: "Matematikamu makin tajam! 3x4=12, 3+4=7."
            }
        ]
    }
};
