'use client';
import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import ChoroplethMap from '../ChoroplethMap';
import { Callout, ChartTip, Legend, LisaBadge, PageHead, Panel } from '../ui';
import { APS_CLASSES, COLOR, LISA, classify } from '@/lib/model';
import { fmt, listJoin, pval, signed } from '@/lib/format';

const BV = {
  LH: { color: '#8c2f39', label: 'APS rendah, tetangga lebih miskin' },
  LL: { color: '#d9a3a0', label: 'APS rendah, tetangga kurang miskin' },
  HH: { color: '#c9a47e', label: 'APS tinggi, tetangga lebih miskin' },
  HL: { color: '#3f6f5e', label: 'APS tinggi, tetangga kurang miskin' },
  'Tidak signifikan': { color: '#ece4da', label: 'tidak signifikan' },
};

export default function Spatial({ model, geo, go, selected, setSelected }) {
  const d = model.data;
  const [layer, setLayer] = useState('lisa');
  const [year, setYear] = useState(model.lastYear);
  const focus = selected || model.provinces.find((p) => model.lisa[model.lastYear][p.provinsi]?.cluster === 'LL')?.provinsi || model.provinces[0].provinsi;
  const yr = layer === 'bv' ? model.lastYear : year;
  const L = model.lisa[yr] || {};

  const fill = (key) => {
    if (layer === 'bv') return BV[model.bv[key]?.cluster_bv]?.color;
    const r = L[key];
    if (!r) return '#e9e4dc';
    if (layer === 'lisa') return LISA[r.cluster]?.color;
    return classify(r.w_aps_16_18, APS_CLASSES)?.color;
  };
  const hatched = (key) => layer !== 'bv' && !L[key];
  const tooltip = (key, rich) => {
    const name = model.name(key);
    if (layer === 'bv') {
      const b = model.bv[key];
      if (!rich) return `${name}: ${BV[b?.cluster_bv]?.label}`;
      return <><b>{name}</b>{BV[b?.cluster_bv]?.label}<br />APS {fmt(b?.aps_16_18)}%, miskin {fmt(b?.miskin)}%, p = {pval(b?.p_sim_bv)}</>;
    }
    const r = L[key];
    if (!r) return rich ? <><b>{name}</b>Belum tercatat terpisah pada {yr}</> : `${name}: belum tercatat terpisah`;
    if (!rich) return `${name}: ${LISA[r.cluster].label}`;
    return layer === 'lisa'
      ? <><b>{name}</b>{LISA[r.cluster].label}<br />APS {fmt(r.aps_16_18)}%, tetangga {fmt(r.w_aps_16_18)}%, p = {pval(r.p_sim)}</>
      : <><b>{name}</b>Rata-rata APS tetangga: {fmt(r.w_aps_16_18)}%<br />APS sendiri: {fmt(r.aps_16_18)}%</>;
  };

  const sel = L[focus];
  const nb = model.neighbors(focus);
  const moranRows = model.years.map((y) => {
    const a = d.moran.global.find((r) => r.tahun === y && r.variabel === 'aps_16_18');
    const b = d.moran.global.find((r) => r.tahun === y && r.variabel === 'aps_19_23');
    return { tahun: y, sma: a?.moran_I, pt: b?.moran_I, psma: a?.p_sim, ppt: b?.p_sim, sig: a?.signifikan, n: a?.n, ei: a?.E_I };
  });

  const scatter = useMemo(() => {
    const rows = Object.values(model.lisa[model.lastYear]);
    const mean = rows.reduce((s, r) => s + r.aps_16_18, 0) / rows.length;
    const sd = Math.sqrt(rows.reduce((s, r) => s + (r.aps_16_18 - mean) ** 2, 0) / rows.length);
    return rows.map((r) => ({ key: r.provinsi, name: model.name(r.provinsi), x: (r.aps_16_18 - mean) / sd, y: (r.w_aps_16_18 - mean) / sd, regime: r.regime, aps: r.aps_16_18 }));
  }, [model]);
  const I = d.summary.moran_I_2025;
  const xs = scatter.map((p) => p.x);
  const x0 = Math.min(...xs) - 0.3;
  const x1 = Math.max(...xs) + 0.3;

  const sigYears = moranRows.filter((r) => r.sig).map((r) => r.tahun);
  const changes = d.moran.perubahan;
  const bv = [...d.moran.bivariat].sort((a, b) => a.moran_I_bv - b.moran_I_bv);
  const strongestBv = [...d.moran.bivariat].sort((a, b) => Math.abs(b.moran_I_bv) - Math.abs(a.moran_I_bv))[0];
  const sens = d.moran.sensitivitas_k;
  const ks = [...new Set(sens.map((r) => r.k))];
  const counts = model.years.map((y) => {
    const rows = Object.values(model.lisa[y] || {});
    const c = { tahun: y, n: rows.length };
    ['LL', 'HH', 'LH', 'HL', 'Tidak signifikan'].forEach((k) => { c[k] = rows.filter((r) => r.cluster === k).length; });
    c.fdr = rows.filter((r) => r.sig_fdr).length;
    return c;
  });

  return (
    <>
      <PageHead title="Apakah ketertinggalan mengelompok di wilayah tertentu?">
        Jika provinsi dengan APS rendah cenderung bertetangga, masalahnya bersifat regional dan intervensinya sebaiknya lintas provinsi.
        Halaman ini mengujinya dengan Moran&apos;s I untuk seluruh Indonesia dan LISA untuk setiap provinsi, memakai 4 tetangga terdekat
        antaribu kota provinsi karena banyak provinsi kepulauan tidak berbatasan darat.
      </PageHead>

      <div className="grid-map">
        <Panel title="Peta klaster spasial"
          lead={layer === 'lisa' ? 'Warna menunjukkan klaster LISA yang signifikan pada p < 0,05.'
            : layer === 'lag' ? 'Warna menunjukkan rata-rata APS 16-18 dari empat provinsi tetangga terdekat.'
              : 'Warna menghubungkan APS 16-18 sebuah provinsi dengan kemiskinan di provinsi tetangganya, tahun 2025.'}
          actions={(
            <div className="seg" role="group" aria-label="Lapisan peta">
              {[['lisa', 'Klaster LISA'], ['lag', 'Rata-rata tetangga'], ['bv', 'APS vs kemiskinan tetangga']].map(([id, l]) => (
                <button key={id} type="button" className={layer === id ? 'on' : ''} onClick={() => setLayer(id)}>{l}</button>
              ))}
            </div>
          )}>
          {layer !== 'bv' && (
            <div className="seg" role="group" aria-label="Tahun">
              {model.years.map((y) => <button key={y} type="button" className={y === year ? 'on' : ''} onClick={() => setYear(y)}>{y}</button>)}
            </div>
          )}
          <ChoroplethMap geo={geo} fill={fill} tooltip={tooltip} hatched={hatched} selected={focus} onSelect={setSelected}
            regions={model.regions} regionOf={(k) => model.byKey[k]?.wilayah} ariaLabel="Peta klaster spasial APS 16-18" />
          {layer === 'lisa' && <Legend items={Object.entries(LISA).map(([k, m]) => ({ color: m.color, label: `${m.label} (${counts.find((c) => c.tahun === yr)?.[k] ?? 0})` }))} />}
          {layer === 'lag' && <Legend items={APS_CLASSES.map((c) => ({ color: c.color, label: c.label }))} note="Rata-rata APS tetangga (%)." />}
          {layer === 'bv' && <Legend items={Object.entries(BV).map(([k, m]) => ({ color: m.color, label: m.label }))} />}
          {layer !== 'bv' && yr < 2024 && <p className="tiny muted">Pada {yr}, empat provinsi baru di Papua belum tercatat terpisah (diarsir). Analisisnya memakai 34 provinsi dengan batas lama.</p>}
        </Panel>

        <div className="info-card" style={{ background: COLOR.linen }}>
          <span className="label">Provinsi terpilih, {yr}</span>
          <h3>{model.name(focus)}</h3>
          {sel ? (
            <>
              <LisaBadge cluster={sel.cluster} />
              <p className="small">{LISA[sel.cluster].desc}</p>
              <dl className="kv">
                <dt>APS 16-18</dt><dd>{fmt(sel.aps_16_18)}%</dd>
                <dt>Rata-rata tetangga</dt><dd>{fmt(sel.w_aps_16_18)}%</dd>
                <dt>Kuadran</dt><dd>{sel.regime}</dd>
                <dt>Local Moran&apos;s I</dt><dd>{fmt(sel.local_I, 3)}</dd>
                <dt>p permutasi</dt><dd>{pval(sel.p_sim)}</dd>
                <dt>q setelah koreksi FDR</dt><dd>{pval(sel.q_fdr)}</dd>
              </dl>
            </>
          ) : <p className="small muted">Provinsi ini belum tercatat terpisah pada {yr}. Pilih tahun 2024 atau 2025.</p>}
          {nb.length > 0 && (
            <div className="stack" style={{ gap: 6 }}>
              <span className="label">Empat tetangga terdekat ({fmt(d.neighborKm[focus], 0)} km rata-rata)</span>
              <div className="tags">
                {nb.map((p) => (
                  <button type="button" key={p.provinsi} className="tag-chip" onClick={() => setSelected(p.provinsi)}>
                    {p.nama} {fmt(model.panel[p.provinsi]?.[model.lastYear]?.aps_16_18)}%
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="button" className="link-btn" onClick={() => go('provinsi', focus)}>Profil lengkap {model.name(focus)}</button>
        </div>
      </div>

      <section className="grid-2">
        <Panel title="Pengelompokan menguat pada 2025"
          lead="Moran's I per tahun. Garis putus-putus adalah nilai yang diharapkan jika provinsi tersebar acak. Signifikansi diuji dengan 9.999 permutasi.">
          <div className="chart" style={{ height: 270 }}>
            <ResponsiveContainer>
              <LineChart data={moranRows} margin={{ top: 24, right: 24, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#f0e7db" vertical={false} />
                <XAxis dataKey="tahun" tickLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={[-0.05, 'auto']} />
                <ReferenceLine y={moranRows[moranRows.length - 1].ei} stroke={COLOR.muted} strokeDasharray="5 4" />
                <Tooltip content={<ChartTip render={(p, l) => <><b>{l}</b>{p.map((x) => <div key={x.dataKey}>{x.name}: I = {fmt(x.value, 3)}, p = {pval(x.dataKey === 'sma' ? x.payload.psma : x.payload.ppt)}</div>)}</>} />} />
                <Line name="APS 16-18" dataKey="sma" stroke={COLOR.wine} strokeWidth={2.8} dot={{ r: 5 }}>
                  <LabelList dataKey="sma" position="top" formatter={(v) => fmt(v, 3)} fontSize={11} fill={COLOR.wine} />
                </Line>
                <Line name="APS 19-23" dataKey="pt" stroke={COLOR.tan} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Legend items={[{ color: COLOR.wine, label: 'APS 16-18 (SMA)' }, { color: COLOR.tan, label: 'APS 19-23 (perguruan tinggi)' }]} />
          <p className="small">
            Untuk usia SMA, autokorelasi positif setiap tahun tetapi baru signifikan pada {sigYears.length ? listJoin(sigYears.map(String)) : '-'}.
            Untuk usia perguruan tinggi, pengelompokan justru melemah pada 2024-2025. Pola regional ini khas jenjang SMA.
          </p>
        </Panel>

        <Panel title="Perubahan juga menular ke tetangga"
          lead="Moran's I untuk kenaikan atau penurunan APS 16-18 dari satu tahun ke tahun berikutnya. Merah berarti signifikan.">
          <div className="chart" style={{ height: 270 }}>
            <ResponsiveContainer>
              <BarChart data={changes} margin={{ top: 40, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#f0e7db" vertical={false} />
                <XAxis dataKey="periode" tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} />
                <ReferenceLine y={0} stroke={COLOR.muted} />
                <Tooltip content={<ChartTip render={(p, l) => <><b>{l}</b><div>I = {fmt(p[0].value, 3)}, p = {pval(p[0].payload.p_sim)}</div><div>{p[0].payload.n} provinsi, rata-rata perubahan {signed(p[0].payload.rata2_delta, 2)} poin</div></>} />} />
                <Bar dataKey="moran_I_delta" radius={[6, 6, 0, 0]}>
                  {changes.map((r) => <Cell key={r.periode} fill={r.signifikan ? COLOR.wine : COLOR.tan} />)}
                  <LabelList dataKey="moran_I_delta" position="top" formatter={(v) => fmt(v, 2)} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="small">
            Pada {changes[changes.length - 1].periode}, provinsi bertetangga naik atau turun bersama (I = {fmt(changes[changes.length - 1].moran_I_delta, 2)},
            p = {pval(changes[changes.length - 1].p_sim)}). Lonjakan partisipasi tahun itu tidak merata, melainkan bergerak per kawasan.
          </p>
        </Panel>
      </section>

      <section className="grid-2">
        <Panel title={`Moran scatterplot ${model.lastYear}`}
          lead="Setiap titik adalah provinsi. Sumbu datar: APS sendiri, sumbu tegak: APS tetangga, keduanya dalam simpangan baku dari rata-rata. Kemiringan garis sama dengan Moran's I.">
          <div className="chart" style={{ height: 340 }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 10, right: 16, left: -10, bottom: 10 }}>
                <CartesianGrid stroke="#f0e7db" />
                <XAxis type="number" dataKey="x" domain={[Math.floor(x0), Math.ceil(x1)]} tickLine={false} name="APS sendiri" />
                <YAxis type="number" dataKey="y" tickLine={false} name="APS tetangga" />
                <ZAxis range={[70, 70]} />
                <ReferenceLine x={0} stroke={COLOR.muted} />
                <ReferenceLine y={0} stroke={COLOR.muted} />
                <ReferenceLine segment={[{ x: x0, y: I * x0 }, { x: x1, y: I * x1 }]} stroke={COLOR.ink} strokeWidth={1.5} />
                <Tooltip content={<ChartTip render={(p) => { const r = p[0].payload; return <><b>{r.name}</b><div>APS {fmt(r.aps)}%, kuadran {r.regime}</div></>; }} />} />
                <Scatter data={scatter} onClick={(p) => setSelected(p.key)} cursor="pointer">
                  {scatter.map((p) => <Cell key={p.key} fill={LISA[p.regime].color} stroke={p.key === focus ? COLOR.ink : '#fff'} strokeWidth={p.key === focus ? 2 : 1} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <Legend items={['HH', 'LH', 'LL', 'HL'].map((k) => ({ color: LISA[k].color, label: `${k}: ${LISA[k].label.toLowerCase()} (${scatter.filter((p) => p.regime === k).length})` }))} />
        </Panel>

        <Panel title="Kondisi tetangga yang paling berkaitan"
          lead={`Bivariate Moran's I ${model.lastYear}: hubungan APS 16-18 sebuah provinsi dengan kondisi rata-rata di provinsi tetangganya.`}>
          <div className="chart" style={{ height: 270 }}>
            <ResponsiveContainer>
              <BarChart data={bv} layout="vertical" margin={{ top: 4, right: 70, left: 10, bottom: 0 }}>
                <XAxis type="number" domain={[-0.5, 0.5]} tickLine={false} />
                <YAxis type="category" dataKey="label" width={170} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <ReferenceLine x={0} stroke={COLOR.muted} />
                <Tooltip content={<ChartTip render={(p) => <><b>{p[0].payload.label}</b><div>I = {fmt(p[0].value, 3)}, p = {pval(p[0].payload.p_sim)}</div></>} />} />
                <Bar dataKey="moran_I_bv" radius={4}>
                  {bv.map((r) => <Cell key={r.variabel_tetangga} fill={!r.signifikan ? '#d8ccbd' : r.moran_I_bv < 0 ? COLOR.wine : COLOR.sage} />)}
                  <LabelList dataKey="moran_I_bv" position="right" formatter={(v) => fmt(v, 2)} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="small">
            Hubungan terkuat: {strongestBv.label.toLowerCase()} di provinsi tetangga (I = {fmt(strongestBv.moran_I_bv, 2)}, p = {pval(strongestBv.p_sim)}).
            Provinsi yang dikelilingi tetangga miskin dan kurang gizi cenderung memiliki APS 16-18 lebih rendah; tetangga dengan listrik dan air minum layak
            yang lebih baik berjalan bersama APS yang lebih tinggi. Batang abu-abu tidak signifikan.
          </p>
        </Panel>
      </section>

      <section className="grid-2">
        <Panel title="Apakah hasilnya bergantung pada jumlah tetangga?"
          lead="Moran's I dihitung ulang dengan 3 sampai 6 tetangga terdekat. Tanda bintang berarti p < 0,05.">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tetangga</th>{model.years.map((y) => <th key={y} className="num">{y}</th>)}</tr></thead>
              <tbody>
                {ks.map((k) => (
                  <tr key={k} className={k === 4 ? 'hl' : ''}>
                    <td>k = {k}{k === 4 ? ' (dipakai)' : ''}</td>
                    {model.years.map((y) => { const r = sens.find((x) => x.k === k && x.tahun === y); return <td key={y} className="num">{fmt(r?.moran_I, 3)}{r?.p_sim < 0.05 ? '*' : ''}</td>; })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small">Arah hasil sama untuk semua pilihan k: autokorelasi positif dan paling kuat pada {model.lastYear}. Kesimpulan tidak bergantung pada satu pilihan parameter.</p>
        </Panel>

        <Panel title="Jumlah provinsi per klaster LISA" lead="Klaster dihitung dengan p < 0,05. Kolom terakhir menghitung provinsi yang tetap signifikan setelah koreksi FDR untuk banyak uji sekaligus.">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tahun</th><th className="num">Provinsi</th><th className="num">LL</th><th className="num">HH</th><th className="num">LH</th><th className="num">HL</th><th className="num">Lolos FDR</th></tr></thead>
              <tbody>
                {counts.map((c) => <tr key={c.tahun}><td>{c.tahun}</td><td className="num">{c.n}</td><td className="num">{c.LL}</td><td className="num">{c.HH}</td><td className="num">{c.LH}</td><td className="num">{c.HL}</td><td className="num">{c.fdr}</td></tr>)}
              </tbody>
            </table>
          </div>
          <Callout title="Cara membaca dengan jujur">
            Setelah koreksi FDR, hanya sedikit provinsi yang tetap signifikan. Klaster LISA karena itu dibaca sebagai petunjuk lokasi kantong,
            sedangkan bukti pengelompokan yang kuat datang dari Moran&apos;s I global dan Moran&apos;s I perubahan.
          </Callout>
        </Panel>
      </section>
    </>
  );
}
