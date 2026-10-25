# EduGap-XAI Web

Sistem pendukung keputusan untuk pemerataan partisipasi sekolah usia 16-18 tahun antarprovinsi di Indonesia.
Dashboard ini menampilkan hasil notebook EduGap-XAI: peta choropleth 38 provinsi, klaster spasial (Moran's I dan LISA),
pola risiko (association rule mining), proyeksi 2026-2027 (LightGBM dan ElasticNet), penjelasan SHAP, dan prioritas intervensi.

## Menjalankan di komputer

Butuh Node.js 18.18 atau lebih baru.

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

## Memperbarui data dari notebook

Jika notebook dijalankan ulang dan menghasilkan `EduGap_XAI_outputs.zip` baru:

```bash
npm run data -- path/ke/EduGap_XAI_outputs.zip
```

Notebook di folder `notebook/` ikut disalin agar bisa diunduh dari halaman Metode dan data. Ganti berkasnya jika ada versi baru.

Perintah ini (butuh Python 3, tanpa paket tambahan) menulis ulang `public/data/edugap.json`, gambar di `public/figures/`,
dan berkas unduhan di `public/downloads/`. Semua angka dan kalimat temuan di situs dihitung dari berkas ini, jadi tidak ada angka yang perlu diubah manual.

## Deploy ke Vercel

1. Push folder ini ke repositori GitHub.
2. Di Vercel, pilih Add New Project, lalu impor repositori tersebut.
3. Framework terdeteksi otomatis sebagai Next.js. Klik Deploy.

## Struktur

```
app/                  layout, halaman, dan gaya global
components/App.js     kerangka aplikasi, navigasi, dan routing berbasis hash
components/ChoroplethMap.js  peta SVG 38 provinsi (zoom, geser, fokus wilayah)
components/views/     delapan halaman dashboard
lib/                  model data, palet warna, dan format angka
public/data/          data dashboard dan batas provinsi (GeoJSON)
scripts/build_data.py penyusun data dari hasil notebook
```

Batas provinsi pada peta disederhanakan untuk tampilan dan bukan batas administrasi resmi.
