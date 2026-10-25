'use client';
import { useState } from 'react';
import { Callout, PageHead, Panel } from '../ui';
import { STAGE_TITLE, prettyFile } from '@/lib/model';
import { fmt, pct } from '@/lib/format';

export default function Method({ model, manifest }) {
  const d = model.data;
  const s = d.summary;
  const meta = d.meta;
  const [stage, setStage] = useState('Semua');
  const [h1, h2] = model.forecastYears;
  const stages = Object.keys(STAGE_TITLE);
  const figures = manifest.figures.filter((f) => stage === 'Semua' || f.includes(`/${stage}/`));
  const tablesBy = stages.map((st) => ({ st, files: manifest.tables.filter((t) => t.includes(`/${st}/`)) })).filter((g) => g.files.length);
  const dataFiles = manifest.tables.filter((t) => t.includes('/data/'));
  const cov = d.forecast.uji_cakupan.find((r) => Math.abs(r.target_cakupan - 0.9) < 1e-6);

  return (
    <>
      <PageHead title="Bagaimana angka-angka ini dihasilkan">
        Sistem pendukung keputusan hanya berguna jika cara kerjanya bisa diperiksa. Halaman ini menjelaskan untuk siapa EduGap-XAI dibuat,
        langkah analisisnya, keputusan pengolahan data, batasannya, dan seluruh berkas hasil yang bisa diunduh.
      </PageHead>

      <Panel field title="Untuk siapa dan keputusan apa">
        <div className="grid-3">
          <div className="stack" style={{ gap: 6 }}>
            <h3 style={{ fontSize: '1rem' }}>Kementerian pendidikan</h3>
            <p className="small">Menentukan provinsi sasaran program afirmasi jenjang SMA dan tuas yang paling sering muncul untuk program lintas provinsi.</p>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <h3 style={{ fontSize: '1rem' }}>Perencana pembangunan</h3>
            <p className="small">Melihat kantong ketertinggalan regional dan proyeksi dua tahun untuk menyelaraskan program infrastruktur dasar dengan sasaran pendidikan.</p>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <h3 style={{ fontSize: '1rem' }}>Pemerintah dan dinas pendidikan daerah</h3>
            <p className="small">Membaca lembar ringkas provinsinya sendiri: posisinya dibanding tetangga, pola risiko yang dipenuhi, dan faktor yang menahan proyeksi.</p>
          </div>
        </div>
        <p className="small">EduGap-XAI adalah alat bantu triase. Ia menunjukkan di mana perlu melihat lebih dulu dan apa yang perlu diperiksa, bukan keputusan otomatis.</p>
      </Panel>

      <section className="grid-2">
        <Panel title="Langkah analisis">
          <ol className="steps">
            <li><b>Pembersihan data BPS.</b> {meta.jumlah_baris_panel + meta.baris_salinan_dob} baris provinsi-tahun dibaca; penanda angka sementara, tanda strip, dan desimal koma dibereskan.</li>
            <li><b>Autokorelasi spasial.</b> Global Moran&apos;s I dan LISA per tahun dengan 4 tetangga terdekat dan 9.999 permutasi, ditambah Moran&apos;s I untuk perubahan dan bivariate Moran.</li>
            <li><b>Penambangan pola.</b> FP-Growth pada transaksi provinsi-tahun berisi kondisi internal dan kondisi tetangga, diuji dengan Fisher plus koreksi FDR dan bootstrap per provinsi, lalu spatial Markov chain.</li>
            <li><b>Proyeksi.</b> ElasticNet dan LightGBM pada empat set fitur untuk {h1} dan {h2}, divalidasi berjalan maju dan dibandingkan dengan tebakan sederhana. Model dengan galat terkecil dipilih.</li>
            <li><b>Penjelasan.</b> SHAP untuk kepentingan global, uraian per provinsi, perbandingan antarhorizon, dan simulasi perbaikan kondisi.</li>
            <li><b>Triangulasi.</b> Tiga bukti digabung menjadi Indeks Prioritas Intervensi, tipologi, dan tuas kebijakan per provinsi.</li>
          </ol>
        </Panel>

        <Panel title="Keputusan pengolahan data yang penting">
          <ul className="plain-list">
            <li><b className="strong">Provinsi baru di Papua.</b> {meta.baris_salinan_dob} baris pada 2021-2023 terbukti salinan provinsi induknya, sehingga dikeluarkan. Analisis 2021-2023 memakai 34 provinsi, 2024-{model.lastYear} memakai 38.</li>
            <li><b className="strong">Imputasi.</b> {meta.sel_imputasi} sel kosong diisi dari tahun sebelumnya, tahun sesudahnya, lalu provinsi induk. Semuanya berada di baris salinan tadi, jadi tidak ada nilai imputasi di data analisis.</li>
            <li><b className="strong">Kesenjangan yang tersingkap.</b> Simpangan baku naik {pct(s.perubahan_sd_semua_provinsi)} pada semua provinsi, tetapi {fmt(s.perubahan_sd_32_provinsi_konsisten * 100, 1)}% pada 32 provinsi berbatas tetap.</li>
            <li><b className="strong">Tidak ada kebocoran informasi.</b> HLS dan IPM tidak dipakai sebagai fitur karena dihitung dari angka partisipasi sekolah sendiri. Pola risiko ditambang ulang di setiap tahun uji.</li>
            <li><b className="strong">Pola tidak sirkular.</b> Kondisi spasial pada pola memakai nilai tetangga saja, bukan kuadran LISA yang memuat APS provinsi itu sendiri.</li>
          </ul>
        </Panel>
      </section>

      <Panel title="Batasan yang perlu diingat">
        <div className="grid-2" style={{ gap: 14 }}>
          <Callout tone="warn" title="Panel pendek">Hanya lima tahun dan 34-38 provinsi. Setiap uji karena itu memakai permutasi, bootstrap, dan validasi berjalan maju.</Callout>
          <Callout tone="warn" title="Asosiasi, bukan sebab-akibat">Pola, SHAP, dan simulasi menunjukkan apa yang berjalan bersama di data, bukan dampak pasti sebuah program.</Callout>
          <Callout tone="warn" title="Ketidakpastian proyeksi">Rentang 90% hanya memuat {pct(cov?.cakupan_empiris)} nilai aktual saat diuji pada {cov?.tahun_evaluasi}, karena lonjakan nasional tahun itu. Proyeksi {h2} diuji pada satu tahun saja.</Callout>
          <Callout tone="warn" title="Lokasi dan batas wilayah">Tetangga ditentukan dari ibu kota provinsi. Batas peta disederhanakan untuk tampilan, bukan batas administrasi resmi.</Callout>
        </div>
      </Panel>

      <Panel id="unduh" title="Unduh kode, data, dan hasil" lead="Semua angka di situs ini berasal dari berkas berikut.">
        <div className="row">
          {manifest.notebook?.map((nb) => <a key={nb} className="btn primary" href={`/${nb}`} download>Unduh notebook analisis (.ipynb)</a>)}
          {manifest.zip && <a className="btn ghost" href={`/${manifest.zip}`} download>Unduh semua hasil notebook (zip)</a>}
        </div>
        {manifest.notebook && <p className="small">Notebook berisi seluruh kode dan keluaran dari data mentah sampai triangulasi. Buka di Google Colab lalu pilih Runtime, Run all untuk mereproduksi setiap angka di situs ini.</p>}
        {dataFiles.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            <h3 style={{ fontSize: '1rem' }}>Dataset</h3>
            <div className="downloads">{dataFiles.map((f) => <a key={f} href={`/${f}`} download>{prettyFile(f)}</a>)}</div>
          </div>
        )}
        {tablesBy.map((g) => (
          <div key={g.st} className="stack" style={{ gap: 6 }}>
            <h3 style={{ fontSize: '1rem' }}>Tabel: {STAGE_TITLE[g.st]}</h3>
            <div className="downloads">{g.files.map((f) => <a key={f} href={`/${f}`} download>{prettyFile(f)}</a>)}</div>
          </div>
        ))}
      </Panel>

      <Panel title={`Galeri gambar dari notebook (${figures.length})`}
        actions={(
          <select className="picker" value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Filter tahap">
            <option value="Semua">Semua tahap</option>
            {stages.map((st) => <option key={st} value={st}>{STAGE_TITLE[st]}</option>)}
          </select>
        )}>
        <div className="gallery">
          {figures.map((f) => (
            <a key={f} href={`/${f}`} target="_blank" rel="noreferrer">
              <img src={`/${f}`} alt={prettyFile(f)} loading="lazy" />
              <span>{prettyFile(f)}</span>
            </a>
          ))}
        </div>
      </Panel>

      <p className="credit">Dibuat oleh Nazril Ravi Pratama (Ketua) dan Ketut Shridhara (Anggota 1). Data diperbarui {meta.dibuat}.</p>
    </>
  );
}
