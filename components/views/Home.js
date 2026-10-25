'use client';
import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChoroplethMap from '../ChoroplethMap';
import { Callout, ChartTip, Legend, SignalBar, SignalLegend, TypeBadge } from '../ui';
import { APS_CLASSES, COLOR, LISA, classify, itemShort } from '@/lib/model';
import { fmt, listJoin, pct, pval, signed } from '@/lib/format';

export default function Home({ model, geo, go, selected, setSelected }) {
  const d = model.data;
  const [year, setYear] = useState(model.lastYear);
  const focus = selected || model.triRows[0].provinsi;
  const isForecast = year > model.lastYear;

  const valuesThisYear = useMemo(() => model.provinces
    .map((p) => ({ key: p.provinsi, a: model.apsAt(p.provinsi, year) }))
    .filter((x) => x.a && x.a.kind !== 'induk')
    .sort((x, y) => x.a.value - y.a.value), [model, year]);
  const rankOf = (key) => valuesThisYear.findIndex((x) => x.key === key) + 1;

  const fill = (key) => classify(model.apsAt(key, year)?.value, APS_CLASSES)?.color;
  const hatched = (key) => model.apsAt(key, year)?.kind === 'induk';
  const tooltip = (key, rich) => {
    const a = model.apsAt(key, year);
    const name = model.name(key);
    if (!rich) return `${name}: APS 16-18 ${a ? fmt(a.value) : 'tidak tersedia'} pada ${year}`;
    if (!a) return <><b>{name}</b>Tidak ada data</>;
    return (
      <>
        <b>{name}</b>
        APS 16-18 {year}: {fmt(a.value)}%
        {a.kind === 'proyeksi' && <><br />Rentang 90%: {fmt(a.lo)} sampai {fmt(a.hi)}</>}
        {a.kind === 'induk' && <><br />Sebelum pemekaran, angka sama dengan {model.name(a.parent)}</>}
      </>
    );
  };

  const fa = model.apsAt(focus, year);
  const f2025 = model.apsAt(focus, model.lastYear);
  const ft = model.tri[focus];

  const disp = d.disparity;
  const dispChart = model.years.map((y) => ({
    tahun: y,
    semua: disp.find((r) => r.cakupan === 'semua_provinsi_valid' && r.tahun === y)?.simpangan_baku,
    konsisten: disp.find((r) => r.cakupan === '32_provinsi_batas_konsisten' && r.tahun === y)?.simpangan_baku,
  }));
  const s = d.summary;
  const moranRows = d.moran.global.filter((r) => r.variabel === 'aps_16_18');
  const sigYears = moranRows.filter((r) => r.signifikan).map((r) => r.tahun);
  const lastChange = d.moran.perubahan[d.moran.perubahan.length - 1];
  const llNames = model.provinces.filter((p) => model.lisa[model.lastYear]?.[p.provinsi]?.cluster === 'LL').map((p) => p.nama);
  const itemBars = Object.entries(model.itemCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([item, n]) => ({ item: itemShort(item), n }));
  const strongest = [...model.rules].sort((a, b) => b.lift - a.lift)[0];
  const falling = d.forecast.proyeksi.filter((r) => r.delta_2026 < 0).sort((a, b) => a.delta_2026 - b.delta_2026);
  const m26 = d.forecast.model_final[String(model.forecastYears[0])];
  const trapped = model.triRows.filter((r) => r.tipologi === 'Terjebak Struktural');
  const lowest = valuesThisYear[0];
  const SET_LABEL = { Base: 'kondisi dasar saja', 'Base+Spatial': 'konteks spasial', 'Base+Pattern': 'pola risiko', Full: 'spasial dan pola sekaligus' };
  const integration = model.forecastYears.map((y, i) => {
    const h = i + 1;
    const m = d.forecast.model_final[String(y)];
    const maeOf = (f) => d.forecast.leaderboard.find((r) => r.horizon === h && r.model === m.model && r.fitur === f)?.MAE;
    const base = maeOf('Base');
    const chosen = maeOf(m.set_fitur);
    const bars = ['Base+Spatial', 'Base+Pattern', 'Full'].map((f) => ({ f, label: `+ ${SET_LABEL[f]}`, diff: maeOf(f) - base }));
    return { y, h, m, base, chosen, gain: (base - chosen) / base, bars };
  });
  const integrated = integration.filter((x) => x.m.set_fitur !== 'Base');
  const blockAbs = {};
  d.shap.full.forEach((r) => { blockAbs[r.blok] = (blockAbs[r.blok] || 0) + r.mean_abs_shap; });
  const blockTotal = Object.values(blockAbs).reduce((a, b) => a + b, 0);
  const spatialShare = (blockAbs['Spasial (Moran/LISA)'] || 0) / blockTotal;
  const patternShare = (blockAbs['Pola (aturan asosiasi)'] || 0) / blockTotal;
  const lowest2025 = model.provinces.map((p) => ({ p, v: model.panel[p.provinsi][model.lastYear].aps_16_18 })).sort((a, b) => a.v - b.v)[0];

  return (
    <>
      <section className="hero reveal" aria-labelledby="hero-title">
        <div className="hero-top">
          <div className="hero-copy">
            <h1 id="hero-title">Provinsi mana yang perlu dibantu lebih dulu?</h1>
            <p>
              EduGap-XAI membantu pemerintah pusat dan daerah memilih provinsi sasaran program partisipasi sekolah usia 16-18 tahun.
              Peta di bawah menunjukkan angkanya dari {model.years[0]} sampai proyeksi {model.forecastYears[1]}; pilih tahun, lalu klik provinsi.
            </p>
            <div className="row">
              <button type="button" className="btn primary" onClick={() => go('prioritas')}>Lihat prioritas intervensi</button>
              <button type="button" className="btn ghost" onClick={() => go('provinsi', focus)}>Siapkan lembar ringkas provinsi</button>
            </div>
          </div>
          <div className="hero-facts">
            <div className="fact"><b>{fmt(model.nationalMean[model.lastYear])}%</b><span>rata-rata APS 16-18 antarprovinsi tahun {model.lastYear}</span></div>
            <div className="fact"><b>{fmt(lowest2025.v)}%</b><span>terendah, {lowest2025.p.nama}, tahun {model.lastYear}</span></div>
            <div className="fact"><b>{fmt(model.nationalMean[model.forecastYears[1]])}%</b><span>proyeksi rata-rata tahun {model.forecastYears[1]}</span></div>
            <div className="fact"><b>{trapped.length} provinsi</b><span>ditandai oleh ketiga bukti sekaligus</span></div>
          </div>
        </div>

        <div className="year-bar">
          <div className="seg" role="group" aria-label="Pilih tahun">
            {model.allYears.map((y) => (
              <button key={y} type="button" className={y === year ? 'on' : ''} onClick={() => setYear(y)} aria-pressed={y === year}>
                {y}{y > model.lastYear && <span className="tag">proyeksi</span>}
              </button>
            ))}
          </div>
          <span className="small muted">
            {isForecast
              ? `Angka ${year} adalah proyeksi model LightGBM, bukan data BPS.`
              : `Data BPS tahun ${year}, ${valuesThisYear.length} provinsi.`}
          </span>
        </div>

        <div className="hero-map">
          <div className="stack" style={{ gap: 10 }}>
            <ChoroplethMap geo={geo} fill={fill} tooltip={tooltip} hatched={hatched} selected={focus}
              onSelect={setSelected} regions={model.regions} regionOf={(k) => model.byKey[k]?.wilayah}
              ariaLabel={`Peta APS 16-18 per provinsi tahun ${year}`} />
            <Legend items={[...APS_CLASSES.map((c) => ({ color: c.color, label: c.label })),
              ...(model.provinces.some((p) => hatched(p.provinsi)) ? [{ hatch: true, label: 'sebelum pemekaran, ikut provinsi induk' }] : [])]}
              note="Warna makin gelap berarti makin sedikit anak usia SMA yang bersekolah." />
          </div>
          <div className="info-card" aria-live="polite">
            <span className="label">Provinsi terpilih</span>
            <h3>{model.name(focus)}</h3>
            <div>
              <div className="info-num">{fa ? `${fmt(fa.value)}%` : '–'}</div>
              <p className="small muted">
                APS 16-18 tahun {year}{fa?.kind === 'proyeksi' ? ' (proyeksi)' : ''}{fa?.kind === 'induk' ? ', masih ikut provinsi induk' : ''}
              </p>
            </div>
            <dl className="kv">
              {fa?.kind !== 'induk' && <><dt>Peringkat dari bawah</dt><dd>{rankOf(focus)} dari {valuesThisYear.length}</dd></>}
              <dt>Rata-rata antarprovinsi</dt><dd>{fmt(model.nationalMean[year])}%</dd>
              {fa && f2025 && year !== model.lastYear && <><dt>Selisih dengan {model.lastYear}</dt><dd className={fa.value - f2025.value < 0 ? 'neg' : 'pos'}>{signed(fa.value - f2025.value)} poin</dd></>}
              {fa?.kind === 'proyeksi' && <><dt>Rentang keyakinan 90%</dt><dd>{fmt(fa.lo)} sampai {fmt(fa.hi)}</dd></>}
              {ft && <><dt>Prioritas intervensi</dt><dd>#{ft.peringkat_prioritas}</dd></>}
            </dl>
            {ft && <TypeBadge type={ft.tipologi} />}
            <button type="button" className="link-btn" onClick={() => go('provinsi', focus)}>Baca profil lengkap {model.name(focus)}</button>
          </div>
        </div>
        {lowest && <p className="small muted">Pada {year}, provinsi dengan APS 16-18 terendah adalah {model.name(lowest.key)} ({fmt(lowest.a.value)}%).</p>}
      </section>

      <section className="panel" aria-labelledby="temuan-h">
        <div className="panel-head"><div>
          <h2 id="temuan-h">Lima temuan untuk pengambil kebijakan</h2>
          <p className="lead">Setiap temuan di bawah dihitung langsung dari data BPS dan hasil notebook analisis. Klik tautannya untuk melihat buktinya.</p>
        </div></div>
        <div className="findings">
          <article className="finding">
            <div>
              <h3>Kesenjangan tampak melebar, padahal sebagian besar tersingkap oleh pemekaran Papua</h3>
              <p>
                Simpangan baku APS 16-18 antarprovinsi naik {pct(s.perubahan_sd_semua_provinsi)} dari {model.years[0]} ke {model.lastYear}.
                Namun pada 32 provinsi yang batas wilayahnya tidak berubah, perubahannya hanya {signed(s.perubahan_sd_32_provinsi_konsisten * 100)}%.
                Ketimpangan di dalam Papua sudah ada sejak lama, tetapi baru terlihat setelah empat provinsi baru dicatat terpisah pada 2024.
              </p>
              <button type="button" className="link-btn" onClick={() => go('metode')}>Lihat cara data pemekaran ditangani</button>
            </div>
            <div className="chart" style={{ height: 200 }}>
              <ResponsiveContainer>
                <LineChart data={dispChart} margin={{ top: 22, right: 24, left: -18, bottom: 0 }}>
                  <XAxis dataKey="tahun" tickLine={false} axisLine={false} />
                  <YAxis domain={[4, 'auto']} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTip render={(p, l) => <><b>{l}</b>{p.map((x) => <div key={x.dataKey}>{x.name}: {fmt(x.value, 2)}</div>)}</>} />} />
                  <Line name="Semua provinsi" dataKey="semua" stroke={COLOR.wine} strokeWidth={2.5} dot={{ r: 4 }}>
                    <LabelList dataKey="semua" position="top" formatter={(v) => fmt(v, 1)} fontSize={11} fill={COLOR.wine} />
                  </Line>
                  <Line name="32 provinsi batas tetap" dataKey="konsisten" stroke={COLOR.walnut} strokeWidth={2.5} dot={{ r: 4 }}>
                    <LabelList dataKey="konsisten" position="bottom" formatter={(v) => fmt(v, 1)} fontSize={11} fill={COLOR.walnut} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
              <Legend items={[{ color: COLOR.wine, label: 'Semua provinsi' }, { color: COLOR.walnut, label: '32 provinsi dengan batas tetap' }]} />
            </div>
          </article>

          <article className="finding">
            <div>
              <h3>Ketertinggalan mulai membentuk kantong di timur Indonesia</h3>
              <p>
                Moran&apos;s I mengukur apakah provinsi bertetangga cenderung punya angka yang mirip. Nilainya baru signifikan pada
                {' '}{sigYears.length ? listJoin(sigYears.map(String)) : 'tidak satu tahun pun'} (I = {fmt(s.moran_I_2025, 3)}, p = {pval(s.moran_p_2025)}).
                {llNames.length > 0 && <> Kantong &quot;rendah dikelilingi rendah&quot; tahun {model.lastYear}: {listJoin(llNames)}.</>}
                {' '}Perubahan {lastChange.periode} juga mengelompok kuat (I = {fmt(lastChange.moran_I_delta, 2)}), sehingga naik-turunnya partisipasi bersifat regional.
              </p>
              <button type="button" className="link-btn" onClick={() => go('peta')}>Buka peta klaster LISA</button>
            </div>
            <div className="chart" style={{ height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={moranRows} margin={{ top: 22, right: 8, left: -18, bottom: 0 }}>
                  <XAxis dataKey="tahun" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTip render={(p, l) => <><b>{l}</b><div>Moran&apos;s I {fmt(p[0].value, 3)}</div><div>p = {pval(p[0].payload.p_sim)}</div></>} />} />
                  <Bar dataKey="moran_I" radius={[6, 6, 0, 0]}>
                    {moranRows.map((r) => <Cell key={r.tahun} fill={r.signifikan ? LISA.LL.color : COLOR.tan} />)}
                    <LabelList dataKey="moran_I" position="top" formatter={(v) => fmt(v, 3)} fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <Legend items={[{ color: LISA.LL.color, label: 'signifikan (p < 0,05)' }, { color: COLOR.tan, label: 'belum signifikan' }]} />
            </div>
          </article>

          <article className="finding">
            <div>
              <h3>{itemShort(model.topItem?.[0] || '')} adalah benang merah pola risiko</h3>
              <p>
                Dari {model.rules.length} pola yang lolos uji statistik dan uji stabilitas, {model.topItem?.[1]} memuat
                {' '}&quot;{itemShort(model.topItem?.[0] || '').toLowerCase()}&quot;. Pola terkuat: {strongest.sentence}
              </p>
              <button type="button" className="link-btn" onClick={() => go('pola')}>Baca semua pola risiko</button>
            </div>
            <div className="chart" style={{ height: 210 }}>
              <ResponsiveContainer>
                <BarChart data={itemBars} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 0 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="item" width={170} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip content={<ChartTip render={(p) => <><b>{p[0].payload.item}</b><div>muncul di {p[0].value} pola</div></>} />} />
                  <Bar dataKey="n" fill={COLOR.walnut} radius={[0, 6, 6, 0]}>
                    <LabelList dataKey="n" position="right" fontSize={12} formatter={(v) => `${v} pola`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="finding">
            <div>
              <h3>Rata-rata diproyeksikan naik, tetapi {falling.length} provinsi diproyeksikan turun pada {model.forecastYears[0]}</h3>
              <p>
                Model {m26.model} memproyeksikan rata-rata APS 16-18 menjadi {fmt(model.nationalMean[model.forecastYears[0]])}% pada {model.forecastYears[0]}
                {' '}dan {fmt(model.nationalMean[model.forecastYears[1]])}% pada {model.forecastYears[1]}. Yang diproyeksikan turun:
                {' '}{listJoin(falling.map((r) => `${model.name(r.provinsi)} (${signed(r.delta_2026)})`))}.
                Galat model {pct(m26.skill)} lebih kecil daripada tebakan &quot;tahun depan sama dengan tahun ini&quot;.
              </p>
              <button type="button" className="link-btn" onClick={() => go('proyeksi')}>Lihat proyeksi dan ketidakpastiannya</button>
            </div>
            <div className="big-figure">
              <div><b>{fmt(m26.mae, 2)}</b><span>poin rata-rata galat proyeksi satu tahun</span></div>
              <div><b>{fmt(m26.mae_persistence, 2)}</b><span>poin galat jika hanya menebak angka tahun lalu</span></div>
              <div><b>&plusmn;{fmt(m26.conformal_halfwidth_90, 1)}</b><span>poin rentang keyakinan 90% untuk {model.forecastYears[0]}</span></div>
            </div>
          </article>

          <article className="finding">
            <div>
              <h3>{trapped.length} provinsi ditandai oleh tiga bukti yang berbeda sekaligus</h3>
              <p>
                Bukti spasial, pola risiko, dan proyeksi dihitung dengan cara yang berbeda. Ketika ketiganya sepakat, temuan itu sulit dianggap kebetulan.
                Provinsi tersebut: {listJoin(trapped.map((r) => model.name(r.provinsi)))}.
              </p>
              <button type="button" className="link-btn" onClick={() => go('prioritas')}>Lihat cara bukti digabungkan</button>
            </div>
            <div className="tags">
              {trapped.map((r) => (
                <button type="button" key={r.provinsi} className="tag-chip" onClick={() => go('provinsi', r.provinsi)}>
                  {model.name(r.provinsi)}, IPI {fmt(r.IPI, 0)}
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>


      <section className="panel" aria-labelledby="integrasi-h">
        <div className="panel-head"><div>
          <h2 id="integrasi-h">
            {integrated.length === integration.length
              ? 'Model terbaik di kedua horizon memakai hasil analisis spasial atau pola risiko'
              : integrated.length ? 'Integrasi metode menambah akurasi pada sebagian proyeksi' : 'Integrasi metode memperkaya penjelasan proyeksi'}
          </h2>
          <p className="lead">
            Setiap model dilatih empat kali: dengan kondisi dasar saja, ditambah konteks spasial dari Moran dan LISA, ditambah pola risiko,
            dan ditambah keduanya. Batang di bawah nol berarti tambahan itu membuat galat lebih kecil.
          </p>
        </div></div>
        <div className="grid-2">
          {integration.map((x) => (
            <div key={x.y} className="stack" style={{ gap: 10 }}>
              <h3>Proyeksi {x.y}: terbaik dengan {SET_LABEL[x.m.set_fitur]}</h3>
              <div className="chart" style={{ height: 190 }}>
                <ResponsiveContainer>
                  <BarChart data={x.bars} layout="vertical" margin={{ top: 4, right: 64, left: 8, bottom: 0 }}>
                    <XAxis type="number" tickLine={false} tickFormatter={(v) => fmt(v, 2)} domain={['dataMin - 0.01', 'dataMax + 0.01']} />
                    <YAxis type="category" dataKey="label" width={170} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <ReferenceLine x={0} stroke={COLOR.muted} />
                    <Tooltip content={<ChartTip render={(p) => <><b>{p[0].payload.label}</b><div>selisih MAE {signed(p[0].value, 3)} poin dibanding kondisi dasar saja</div></>} />} />
                    <Bar dataKey="diff" radius={4}>
                      {x.bars.map((b) => <Cell key={b.f} fill={b.f === x.m.set_fitur ? COLOR.sage : b.diff < 0 ? '#a8c8bb' : '#d9a3a0'} />)}
                      <LabelList dataKey="diff" position="right" formatter={(v) => signed(v, 3)} fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="small">
                {x.m.set_fitur !== 'Base'
                  ? <>Dengan {SET_LABEL[x.m.set_fitur]}, galat rata-rata turun dari {fmt(x.base, 3)} menjadi {fmt(x.chosen, 3)} poin ({pct(x.gain, 1)} lebih kecil) dibanding kondisi dasar saja. Model ini juga {pct(x.m.skill, 1)} lebih akurat daripada tebakan sama-dengan-tahun-lalu (p = {pval(x.m.p_wilcoxon_vs_persistence)}).</>
                  : <>Untuk proyeksi ini, kondisi dasar saja sudah paling akurat; konteks spasial dan pola berperan dalam penjelasan, bukan akurasi.</>}
              </p>
            </div>
          ))}
        </div>
        <Callout title="Artinya bagi pengambil kebijakan">
          {integrated.length > 0 && <>Hasil analisis spasial dan pola risiko bukan hiasan: keduanya dipakai model terbaik dan menurunkan galat proyeksi {listJoin(integrated.map((x) => String(x.y)))}. </>}
          Pada model yang memakai semua fitur, {pct(spatialShare, 1)} penjelasan berasal dari konteks spasial (Moran dan LISA) dan {pct(patternShare, 1)} dari pola risiko (aturan asosiasi).
          Selisih galatnya kecil, sehingga yang paling penting adalah keunggulan atas tebakan sederhana, yang sudah teruji signifikan.
        </Callout>
        <button type="button" className="link-btn" onClick={() => go('proyeksi')} style={{ alignSelf: 'flex-start' }}>Lihat tabel ablation lengkap</button>
      </section>

      <section className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 style={{ fontSize: '1.2rem' }}>Delapan provinsi yang perlu didahulukan</h2>
              <p className="lead">Diurutkan menurut Indeks Prioritas Intervensi (IPI, 0-100). Batang berwarna menunjukkan sumbangan tiap bukti.</p>
            </div>
            <button type="button" className="link-btn" onClick={() => go('prioritas')}>Lihat semua 38</button>
          </div>
          <ol className="prio-list">
            {model.triRows.slice(0, 8).map((r) => (
              <li key={r.provinsi}>
                <button type="button" className="prio-row" onClick={() => go('provinsi', r.provinsi)}>
                  <span className="prio-rank">{r.peringkat_prioritas}</span>
                  <span className="prio-main"><strong>{model.name(r.provinsi)}</strong><small>{r.tipologi}</small></span>
                  <SignalBar row={r} />
                  <span className="prio-score">{fmt(r.IPI, 0)}</span>
                </button>
              </li>
            ))}
          </ol>
          <SignalLegend />
        </div>

        <div className="panel field">
          <h2 style={{ fontSize: '1.2rem' }}>Cara membaca angka di situs ini</h2>
          <dl className="glossary">
            <div><dt>APS 16-18</dt><dd>Angka partisipasi sekolah: persentase penduduk usia 16-18 tahun yang sedang bersekolah. Makin tinggi makin baik.</dd></div>
            <div><dt>Moran&apos;s I</dt><dd>Angka -1 sampai 1. Positif berarti provinsi bertetangga cenderung mirip, mendekati 0 berarti acak.</dd></div>
            <div><dt>Klaster LISA</dt><dd>Label per provinsi: apakah ia bagian dari kantong rendah, kantong tinggi, atau berbeda sendiri dari tetangganya.</dd></div>
            <div><dt>Pola risiko</dt><dd>Kombinasi kondisi yang sering muncul bersama APS rendah. Confidence adalah peluangnya, lift adalah berapa kali lebih sering dari rata-rata.</dd></div>
            <div><dt>SHAP</dt><dd>Besar dorongan setiap faktor terhadap proyeksi sebuah provinsi, dalam poin APS.</dd></div>
            <div><dt>Rentang 90%</dt><dd>Kisaran tempat nilai sebenarnya diperkirakan jatuh. Makin lebar, makin tidak pasti.</dd></div>
          </dl>
        </div>
      </section>
    </>
  );
}
