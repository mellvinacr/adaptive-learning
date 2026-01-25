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

export const GEOMETRI_CURRICULUM: Record<number, any> = {
    1: {
        id: 1,
        title: "Dasar-Dasar Geometri & Aksioma",
        content: "Level ini membahas pondasi utama geometri: \n1. **Empat Pilar Struktur**: Struktur geometri terdiri dari unsur tidak didefinisikan (titik, garis, bidang), unsur didefinisikan (sinar garis, ruas garis), aksioma/postulat, dan teorema/rumus. \n2. **Garis & Sinar**: Garis bersifat tidak terbatas ke dua arah, sedangkan sinar garis hanya memanjang ke satu arah. \n3. **Aksioma Kesejajaran**: Melalui sebuah titik P di luar garis g, tepat ada satu garis h yang sejajar dengan g.",
        contentVisual: "Garis (↔) tidak terbatas, Ruas Garis (•---•) punya ujung dan pangkal yang bisa diukur panjangnya.",
        contentAuditory: "Bayangkan garis sebagai jalan tanpa ujung, sedangkan ruas garis adalah jembatan dengan dua gerbang di ujungnya.",
        contentKinesthetic: "Gunakan penggaris untuk menggambar ruas garis AB, lalu buatlah titik C di luarnya dan tarik garis sejajar.",
        quiz: [
            { question: "Mana yang merupakan konsep yang disepakati benar tanpa perlu pembuktian?", correctAnswer: 1, options: ["Teorema", "Aksioma", "Definisi"], explanation: "Aksioma atau postulat adalah konsep yang disepakati benar tanpa pembuktian deduktif." },
            { question: "Unsur geometri satu dimensi yang hanya memiliki panjang saja disebut?", correctAnswer: 0, options: ["Garis", "Bidang", "Titik"], explanation: "Garis disebut unsur satu dimensi karena hanya memiliki unsur panjang." },
            { question: "Dua garis disebut sejajar jika?", correctAnswer: 2, options: ["Berpotongan", "Tegak lurus", "Tidak punya titik potong"], explanation: "Dua garis sejajar (g // h) tidak memiliki titik sekutu atau titik potong sama sekali." }
        ]
    },
    2: {
        id: 2,
        title: "Klasifikasi Segitiga & Garis Istimewa",
        content: "Kita akan membedah anatomi segitiga: \n1. **Jenis Berdasarkan Sudut**: Terdiri dari segitiga lancip (<90°), siku-siku (90°), dan tumpul (90°-180°). \n2. **Garis-Garis Penting**: Garis tinggi (menghubungkan titik sudut tegak lurus sisi depan), garis bagi (membagi sudut sama besar), dan garis berat (membagi sisi depan sama panjang). \n3. **Teorema Jumlah Sudut**: Jumlah seluruh sudut dalam segitiga mana pun adalah tepat $180^{\\circ}$.",
        contentVisual: ". Lihat bagaimana ketiga garis istimewa berpotongan di satu titik.",
        quiz: [
            { question: "Satu sudut segitiga besarnya 110 derajat. Segitiga ini termasuk jenis?", correctAnswer: 1, options: ["Lancip", "Tumpul", "Siku-siku"], explanation: "Segitiga tumpul memiliki salah satu sudut antara 90 dan 180 derajat." },
            { question: "Garis yang membagi sisi di depan sudut menjadi dua bagian sama panjang disebut?", correctAnswer: 2, options: ["Garis Tinggi", "Garis Bagi", "Garis Berat"], explanation: "Garis berat menghubungkan titik sudut dan membagi sisi dihadapannya sama panjang." },
            { question: "Pada segitiga sama sisi, berapakah besar setiap sudutnya?", correctAnswer: 0, options: ["60 derajat", "90 derajat", "45 derajat"], explanation: "Setiap sudut pada segitiga sama sisi besarnya adalah 60 derajat." }
        ]
    },
    5: {
        id: 5,
        title: "Bangun Ruang & Kaidah Euler",
        content: "Level akhir tentang geometri dimensi tiga: \n1. **Unsur Bangun Ruang**: Meliputi Sisi (bidang pembatas), Rusuk (perpotongan sisi), dan Titik Sudut. \n2. **Diagonal**: Terdapat Diagonal Sisi (pada permukaan bidang) dan Diagonal Ruang (menghubungkan titik sudut seberang di dalam ruang). \n3. **Mantra Euler**: Hubungan komponen pada prisma/limas adalah $S + T = R + 2$.",
        contentVisual: "Kubus: 6 Sisi + 8 Titik Sudut = 12 Rusuk + 2 (14 = 14).",
        quiz: [
            { question: "Garis yang menghubungkan dua titik sudut berhadapan pada satu sisi disebut?", correctAnswer: 0, options: ["Diagonal Sisi", "Diagonal Ruang", "Rusuk"], explanation: "Diagonal sisi atau bidang menghubungkan titik sudut berhadapan pada sebuah sisi." },
            { question: "Jika sebuah bangun ruang memiliki 5 sisi dan 9 rusuk, berapakah titik sudutnya?", correctAnswer: 1, options: ["5", "6", "8"], explanation: "Gunakan Euler: S + T = R + 2 -> 5 + T = 9 + 2 -> T = 11 - 5 = 6." },
            { question: "Bangun ruang yang dibatasi dua poligon kongruen yang sejajar adalah?", correctAnswer: 1, options: ["Limas", "Prisma", "Bola"], explanation: "Prisma dibentuk oleh dua daerah poligon kongruen yang terletak pada bidang sejajar." }
        ]
    }
};

export const TRIGONOMETRI_CURRICULUM: Record<number, any> = {
    1: {
        id: 1,
        title: "Rasio Dasar (SinDemi & KosSami)",
        content: "Mengenal perbandingan pada segitiga siku-siku: \n1. **Sinus (Sin)**: Perbandingan panjang sisi di Depan sudut dengan sisi Miring (**Sin-De-Mi**). \n2. **Kosinus (Cos)**: Perbandingan sisi di Samping sudut dengan sisi Miring (**Kos-Sa-Mi**). \n3. **Teorema Pythagoras**: Pondasi mencari sisi yang hilang: $a^2 = b^2 + c^2$, di mana $a$ adalah sisi miring.",
        contentVisual: "Sisi miring (r) selalu berada di depan sudut siku-siku.",
        quiz: [
            { question: "Jika sisi depan = 3 dan sisi miring = 5, berapakah nilai sinusnya?", correctAnswer: 0, options: ["3/5", "4/5", "3/4"], explanation: "Sinus adalah perbandingan Depan / Miring." },
            { question: "Sisi terpanjang pada segitiga siku-siku disebut?", correctAnswer: 2, options: ["Sisi Mendatar", "Sisi Tegak", "Hipotenusa"], explanation: "Hipotenusa atau sisi miring adalah sisi terpanjang segitiga." }
        ]
    },
    3: {
        id: 3,
        title: "Tangen & Identitas Kebalikan",
        content: "Mendalami rasio lainnya: \n1. **Tangen (Tan)**: Perbandingan sisi Depan dengan sisi Samping (**Tan-De-Sa**). \n2. **Identitas Tangen**: Nilai Tan juga bisa didapat dari perbandingan Sinus dibagi Kosinus ($Tan = Sin/Cos$). \n3. **Fungsi Kebalikan**: Sekan (Sec) adalah 1/Cos, Kosekan (Cosec) adalah 1/Sin, dan Kotangen (Cot) adalah 1/Tan.",
        contentVisual: "Pola Hafalan: Sin ↔ Cosec | Cos ↔ Sec | Tan ↔ Cot.",
        quiz: [
            { question: "Manakah perbandingan yang tepat untuk Tangen?", correctAnswer: 1, options: ["Samping / Miring", "Depan / Samping", "Depan / Miring"], explanation: "Tangen adalah perbandingan sisi depan sudut dengan sisi samping." },
            { question: "Sekan merupakan kebalikan dari fungsi?", correctAnswer: 1, options: ["Sinus", "Kosinus", "Tangen"], explanation: "Sekan adalah kebalikan dari kosinus." }
        ]
    },
    5: {
        id: 5,
        title: "Aplikasi Dunia Nyata & Elevasi",
        content: "Trigonometri bukan hanya teori: \n1. **Sudut Elevasi**: Sudut yang terbentuk antara pandangan mata ke atas dengan garis mendatar. \n2. **Pengukuran Jarak Jauh**: Mengukur tinggi pohon atau gedung tanpa memanjat menggunakan konsep Tangen dan sudut elevasi. \n3. **Navigasi & Olahraga**: Digunakan untuk mengatur kemiringan jalan hingga menghitung sudut tendangan bola agar masuk ke gawang.",
        contentVisual: "Bayangkan garis horizontal mata ke objek. Sudut ke arah atas adalah Elevasi, sudut ke arah bawah adalah Depresi.",
        quiz: [
            { question: "Sudut yang terbentuk saat mata memandang puncak pohon disebut?", correctAnswer: 1, options: ["Sudut Depresi", "Sudut Elevasi", "Sudut Siku-siku"], explanation: "Melihat objek di ketinggian memanfaatkan sudut elevasi pandangan mata." },
            { question: "Bidang pekerjaan apa yang sangat terbantu oleh konsep trigonometri?", correctAnswer: 1, options: ["Koki", "Arsitek", "Penulis"], explanation: "Insinyur dan arsitek menggunakan trigonometri untuk mengukur kemiringan dan ketinggian struktur." }
        ]
    }
};