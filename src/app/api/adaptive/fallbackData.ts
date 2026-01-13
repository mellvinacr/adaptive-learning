// ============================================
// RICH OFFLINE FALLBACK DATA
// Gemini-quality explanations for when API is unavailable
// ============================================

export interface FallbackContent {
    explanation: string;
    topic: string;
    level: number;
    style: string;
}

// Aljabar Content - Detailed and Educational
export const ALJABAR_FALLBACK: Record<number, string> = {
    1: `### 💡 Pengantar Aljabar - Level 1

**🎯 Analogi Dunia Nyata: Timbangan Dapur**

Bayangkan aljabar adalah sebuah **timbangan dapur** yang harus selalu seimbang. Di sisi kiri ada barang-barang yang ingin kamu timbang, dan di sisi kanan ada anak timbangan. Apa pun yang kamu lakukan di satu sisi, **harus kamu lakukan juga di sisi lain** agar timbangan tetap seimbang!

Misalnya, jika kamu menambahkan 100 gram di sisi kiri, kamu juga harus menambahkan 100 gram di sisi kanan. Begitu juga dalam aljabar - jika kamu menambah atau mengurangi sesuatu di satu ruas, lakukan hal yang sama di ruas lainnya.

---

**📝 Langkah Penyelesaian Persamaan Linear:**

1. **Identifikasi Komponen**
   - Temukan variabel (biasanya huruf seperti x, y, z)
   - Temukan konstanta (angka biasa seperti 2, 5, 10)
   - Temukan koefisien (angka di depan variabel)

2. **Kelompokkan Suku Sejenis**
   - Pindahkan semua variabel ke sisi kiri
   - Pindahkan semua konstanta ke sisi kanan
   - **Aturan Emas**: Yang pindah ruas, ganti tanda! ➕ jadi ➖, ✖️ jadi ➗

3. **Selesaikan Variabel**
   - Bagi kedua ruas dengan koefisien variabel
   - Sederhanakan sampai dapat nilai variabel

---

**🧮 Contoh Soal:**

Selesaikan: $$2x + 5 = 13$$

**Langkah 1**: Pindahkan 5 ke kanan (ganti tanda)
$$2x = 13 - 5$$
$$2x = 8$$

**Langkah 2**: Bagi kedua ruas dengan 2
$$x = \\frac{8}{2}$$
$$x = 4$$

**Langkah 3**: Verifikasi dengan substitusi balik
$$2(4) + 5 = 8 + 5 = 13$$ ✅

---

**📐 Rumus Umum:**

$$ax + b = c$$

Maka: $$x = \\frac{c - b}{a}$$

---

**💡 Tips Mengingat:**
> "Yang pindah rumah, ganti tanda!" 🏠➡️🏠

**🌟 Motivasi:**
Kamu sudah memahami dasar yang paling penting! Aljabar adalah bahasa universal matematika - dengan menguasainya, kamu bisa menyelesaikan berbagai masalah di dunia nyata!`,

    2: `### 💡 Sistem Persamaan Linear Dua Variabel (SPLDV) - Level 2

**🎯 Analogi Dunia Nyata: Detektif Belanja**

Bayangkan kamu adalah seorang **detektif** yang sedang menyelidiki harga dua barang di toko. Kamu tidak bisa melihat label harga, tapi kamu punya dua petunjuk:
- "2 apel + 3 jeruk = Rp 15.000"
- "1 apel + 2 jeruk = Rp 8.000"

Dari dua petunjuk ini, kamu bisa menemukan harga masing-masing buah! Itulah esensi SPLDV - **dua persamaan untuk mencari dua nilai yang tidak diketahui**.

---

**📝 Metode Penyelesaian:**

**A. Metode Substitusi** (Mengganti)

1. Pilih satu persamaan, nyatakan satu variabel dalam variabel lain
   $$x + 2y = 8 \\Rightarrow x = 8 - 2y$$

2. Substitusikan ke persamaan kedua
   $$2(8 - 2y) + 3y = 15$$

3. Selesaikan variabel yang tersisa
   $$16 - 4y + 3y = 15$$
   $$-y = -1$$
   $$y = 1$$

4. Cari nilai variabel pertama
   $$x = 8 - 2(1) = 6$$

**B. Metode Eliminasi** (Menghilangkan)

1. Samakan koefisien salah satu variabel
   - Persamaan 1: $$2x + 3y = 15$$ [× 1]
   - Persamaan 2: $$x + 2y = 8$$ [× 2] → $$2x + 4y = 16$$

2. Kurangkan kedua persamaan
   $$(2x + 4y) - (2x + 3y) = 16 - 15$$
   $$y = 1$$

3. Substitusi balik untuk cari x
   $$x + 2(1) = 8 \\Rightarrow x = 6$$

---

**🧮 Bentuk Umum SPLDV:**

$$a_1x + b_1y = c_1$$
$$a_2x + b_2y = c_2$$

**Solusi dengan Rumus Cramer:**

$$x = \\frac{c_1b_2 - c_2b_1}{a_1b_2 - a_2b_1}$$

$$y = \\frac{a_1c_2 - a_2c_1}{a_1b_2 - a_2b_1}$$

---

**💡 Tips Memilih Metode:**
- **Substitusi**: Jika ada koefisien 1 (mudah dinyatakan)
- **Eliminasi**: Jika koefisien rumit atau sama

**🌟 Fun Fact:**
SPLDV digunakan oleh ekonom untuk menghitung titik keseimbangan pasar, oleh insinyur untuk merancang jembatan, dan oleh programmer untuk membuat game!`,

    3: `### 💡 Pertidaksamaan Linear - Level 3

**🎯 Analogi Dunia Nyata: Batas Kecepatan**

Pernahkah kamu melihat rambu "Kecepatan Maksimal 60 km/jam"? Itu adalah pertidaksamaan! Kamu boleh berkendara dengan kecepatan $$v \\leq 60$$, artinya 50, 55, atau 60 km/jam semua boleh - tapi **tidak boleh lebih** dari 60!

Berbeda dengan persamaan yang punya **satu jawaban**, pertidaksamaan punya **banyak jawaban** dalam satu rentang!

---

**📝 Simbol-Simbol Penting:**

| Simbol | Arti | Contoh |
|--------|------|--------|
| $$>$$ | Lebih dari | $$x > 5$$ (6, 7, 8, ...) |
| $$<$$ | Kurang dari | $$x < 3$$ (..., 1, 2) |
| $$\\geq$$ | Lebih dari atau sama dengan | $$x \\geq 5$$ (5, 6, 7, ...) |
| $$\\leq$$ | Kurang dari atau sama dengan | $$x \\leq 3$$ (..., 2, 3) |

---

**⚠️ ATURAN EMAS - SANGAT PENTING!**

> Jika mengalikan atau membagi dengan **bilangan NEGATIF**, tanda pertidaksamaan **BERBALIK**!

**Contoh:**
$$-2x > 6$$

Bagi dengan -2 (negatif), tanda berbalik:
$$x < -3$$

---

**🧮 Langkah Penyelesaian:**

Selesaikan: $$3x - 7 \\leq 5$$

**Langkah 1**: Pindahkan konstanta
$$3x \\leq 5 + 7$$
$$3x \\leq 12$$

**Langkah 2**: Bagi dengan koefisien (positif, tanda tetap)
$$x \\leq 4$$

**Langkah 3**: Gambar di garis bilangan
$$\\leftarrow \\bullet \\text{────────}$$
(Titik padat di 4, panah ke kiri)

---

**📊 Cara Menggambar di Garis Bilangan:**

- $$\\leq$$ atau $$\\geq$$: Gunakan **titik padat** (termasuk)
- $$<$$ atau $$>$$: Gunakan **lingkaran kosong** (tidak termasuk)

---

**💡 Tips Pro:**
Selalu **periksa** dengan memasukkan satu angka dari himpunan penyelesaian ke pertidaksamaan awal!

**🌟 Aplikasi:**
Pertidaksamaan digunakan untuk optimasi bisnis, menentukan batas aman obat, dan bahkan mengoptimalkan rute di Google Maps!`,

    4: `### 💡 Persamaan Kuadrat - Level 4

**🎯 Analogi Dunia Nyata: Lompatan Bola**

Ketika kamu melempar bola ke atas, lintasannya membentuk **parabola** - itulah kurva dari persamaan kuadrat! Bola naik, mencapai titik tertinggi, lalu turun. Matematikanya menjelaskan kapan bola ada di ketinggian tertentu, dan kapan menyentuh tanah.

---

**📝 Bentuk Umum:**

$$ax^2 + bx + c = 0$$

Di mana:
- $$a$$ = koefisien $$x^2$$ (tidak boleh 0)
- $$b$$ = koefisien $$x$$
- $$c$$ = konstanta

---

**🧮 Metode Penyelesaian:**

**A. Rumus ABC (Kuadrat) - Paling Ampuh!**

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

**Langkah Penggunaan:**
1. Identifikasi nilai a, b, c
2. Hitung diskriminan: $$D = b^2 - 4ac$$
3. Substitusi ke rumus
4. Hitung dua kemungkinan (+ dan -)

**B. Pemfaktoran** (Jika memungkinkan)

$$x^2 - 5x + 6 = 0$$
$$(x - 2)(x - 3) = 0$$
$$x = 2$$ atau $$x = 3$$

**C. Melengkapkan Kuadrat Sempurna**

Berguna untuk mengubah ke bentuk $$(x - p)^2 = q$$

---

**📊 Diskriminan (D) - Penentu Jenis Akar:**

$$D = b^2 - 4ac$$

| Nilai D | Jenis Akar | Grafik |
|---------|------------|--------|
| $$D > 0$$ | 2 akar real berbeda | Memotong sumbu-x di 2 titik |
| $$D = 0$$ | 1 akar real (kembar) | Menyinggung sumbu-x |
| $$D < 0$$ | Tidak ada akar real | Tidak memotong sumbu-x |

---

**🎵 Tips Menghafal Rumus ABC:**
Nyanyikan dengan nada lagu sederhana:
> "Negatif b, plus minus akar, b kuadrat kurang empat ac, semuanya dibagi dua a!"

---

**💡 Contoh Soal:**

Selesaikan: $$x^2 - 5x + 6 = 0$$

$$a = 1, b = -5, c = 6$$
$$D = (-5)^2 - 4(1)(6) = 25 - 24 = 1 > 0$$ → 2 akar berbeda

$$x = \\frac{5 \\pm \\sqrt{1}}{2} = \\frac{5 \\pm 1}{2}$$

$$x_1 = \\frac{5 + 1}{2} = 3$$
$$x_2 = \\frac{5 - 1}{2} = 2$$

**🌟 Aplikasi:**
Fisika (gerak peluru), ekonomi (profit maksimum), arsitektur (lengkungan jembatan)!`,

    5: `### 💡 Aplikasi Aljabar dalam Kehidupan Nyata - Level 5

**🏆 Selamat! Kamu sudah di level tertinggi!**

Sekarang saatnya melihat bagaimana aljabar yang kamu pelajari digunakan di **dunia nyata** oleh profesional setiap hari!

---

**🏢 1. Ekonomi & Bisnis**

**Break-Even Point (Titik Impas)**

$$\\text{Pendapatan} = \\text{Biaya}$$
$$p \\cdot x = \\text{Biaya Tetap} + \\text{Biaya Variabel} \\cdot x$$

Di mana:
- $$p$$ = harga jual per unit
- $$x$$ = jumlah unit

Contoh: Berapa es krim harus dijual agar modal kembali?

---

**🚀 2. Fisika - Gerak Lurus Berubah Beraturan**

$$s = v_0 t + \\frac{1}{2}at^2$$

$$v = v_0 + at$$

$$v^2 = v_0^2 + 2as$$

**Contoh:** Mobil rem mendadak, kapan berhenti total?

---

**💻 3. Teknologi & Programming**

Setiap algoritma komputer menggunakan aljabar!

\`\`\`
if (score >= 80) {
    grade = "A";
} else if (score >= 60) {
    grade = "B";
}
\`\`\`

Ini adalah pertidaksamaan dalam kode!

---

**📝 Strategi Soal Cerita:**

1. **BACA** - Baca soal 2x dengan teliti
2. **IDENTIFIKASI** - Tandai angka dan kata kunci
3. **VARIABELKAN** - Tentukan apa yang dicari (misal x = ?)
4. **MODELKAN** - Tulis persamaan berdasarkan informasi
5. **SELESAIKAN** - Gunakan teknik yang tepat
6. **PERIKSA** - Substitusi balik, apakah masuk akal?

---

**🧮 Contoh Soal Cerita:**

> "Umur Ayah 4 kali umur Budi. 5 tahun lagi, umur Ayah 3 kali umur Budi. Berapakah umur mereka sekarang?"

**Model:**
- Budi sekarang = $$x$$
- Ayah sekarang = $$4x$$
- 5 tahun lagi: $$4x + 5 = 3(x + 5)$$

**Selesaikan:**
$$4x + 5 = 3x + 15$$
$$x = 10$$

Jadi Budi 10 tahun, Ayah 40 tahun! ✅

---

**🌟 Pesan Penutup:**
Kamu telah menguasai aljabar dari dasar hingga aplikasi nyata. Skill ini akan membuatmu unggul di berbagai bidang. **Terus berlatih dan jangan pernah berhenti belajar!** 🎓`
};

// Other topics can be added here
export const TRIGONOMETRI_FALLBACK: Record<number, string> = {
    1: `### 💡 Pengantar Trigonometri - Level 1

**🎯 Analogi:** Trigonometri seperti GPS internal untuk mengukur sudut dan jarak!

**Rasio Dasar dalam Segitiga Siku-siku:**
- $$\\sin \\theta = \\frac{\\text{depan}}{\\text{miring}}$$
- $$\\cos \\theta = \\frac{\\text{samping}}{\\text{miring}}$$
- $$\\tan \\theta = \\frac{\\text{depan}}{\\text{samping}}$$

**Tips Mengingat:** "SOH-CAH-TOA"
- **S**in = **O**pposite / **H**ypotenuse
- **C**os = **A**djacent / **H**ypotenuse  
- **T**an = **O**pposite / **A**djacent

*Konten offline - API akan segera tersedia!*`
};

// Default fallback for any topic
export const DEFAULT_FALLBACK = `### 💡 Panduan Belajar Matematika

**📝 Langkah Sistematis Mengerjakan Soal:**

1. **Baca dengan Teliti**
   - Baca soal minimal 2 kali
   - Garis bawahi kata kunci dan angka penting

2. **Identifikasi Masalah**
   - Apa yang diketahui?
   - Apa yang ditanyakan?
   - Konsep apa yang relevan?

3. **Rencanakan Strategi**
   - Pilih rumus yang sesuai
   - Tentukan langkah-langkah penyelesaian

4. **Eksekusi**
   - Kerjakan dengan rapi
   - Tulis setiap langkah

5. **Verifikasi**
   - Periksa jawaban dengan substitusi
   - Apakah jawabannya masuk akal?

---

**💡 Tips Umum:**
- Latihan rutin lebih baik dari belajar maraton
- Pahami konsep, bukan hafal rumus
- Jangan malu bertanya!

*Konten offline - Data dari cache lokal*`;

// Helper function to get fallback content
export function getFallbackContent(topic: string, level: number): string {
    const topicLower = topic.toLowerCase();

    if (topicLower === 'aljabar') {
        return ALJABAR_FALLBACK[level] || ALJABAR_FALLBACK[1] || DEFAULT_FALLBACK;
    }

    if (topicLower === 'trigonometri') {
        return TRIGONOMETRI_FALLBACK[level] || TRIGONOMETRI_FALLBACK[1] || DEFAULT_FALLBACK;
    }

    return DEFAULT_FALLBACK;
}
