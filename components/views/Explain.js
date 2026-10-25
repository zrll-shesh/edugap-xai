'use client';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend as RLegend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Callout, ChartTip, Legend, PageHead, Panel, ProvincePicker, Waterfall } from '../ui';
import { BLOCKS, COLOR, featureBlock, featureKey, featureLabel } from '@/lib/model';
import { fmt, listJoin, signed } from '@/lib/format';

export default function Explain({ model, go, selected, setSelected }) {
  const d = model.data;
  const [h1, h2] = model.forecastYears;
  const focus = selected || model.triRows[0].provinsi;
  const mf = d.shap ? d.forecast.model_final[String(h1)] : null;

  const global = [...d.shap.global].sort((a, b) => b.mean_abs_shap - a.mean_abs_shap)
    .map((r) => ({ ...r, nama: featureLabel(r.fitur), color: BLOCKS[featureBlock(r.fitur)].color }));
  const ACTION = ['miskin', 'listrik', 'air_minum_layak', 'rls', 'pou', 'ikp', 'tpt', 'log_pdrb_kapita', 'log_pengeluaran_makanan'];
  const actionable = global.filter((r) => ACTION.includes(featureKey(r.fitur)));
  const blockTotals = {};
  d.shap.full.forEach((r) => { blockTotals[r.blok] = (blockTotals[r.blok] || 0) + r.mean_abs_shap; });
  const blockSum = Object.values(blockTotals).reduce((s, v) => s + v, 0);
  const blocks = Object.entries(blockTotals).map(([k, v]) => ({ k, share: v / blockSum })).sort((a, b) => b.share - a.share);

  const hz = d.shap.horizon.map((r) => ({ nama: featureLabel(r.fitur), a: r[Object.keys(r).find((k) => k.startsWith(String(h1)))], b: r[Object.keys(r).find((k) => k.startsWith(String(h2)))] }))
    .sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b)).slice(0, 10);

  const local = model.shapLocal[focus];
  const contributions = local ? Object.entries(local).filter(([k]) => k !== 'provinsi').map(([key, value]) => ({ key, value })) : [];
  const base = d.shap.base_value;
  const total = base + contributions.reduce((s, c) => s + c.value, 0);
  const negatives = contributions.filter((c) => c.value < 0).sort((a, b) => a.value - b.value).slice(0, 3);
  const positives = contributions.filter((c) => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 3);

  const scenarioProv = [...new Set(d.shap.skenario.map((r) => r.provinsi))];
  const [scProv, setScProv] = useState(scenarioProv.includes(focus) ? focus : scenarioProv[0]);
  const sc = d.shap.skenario.filter((r) => r.provinsi === scProv);
  const bestSc = [...sc].filter((r) => r.skenario !== 'Gabungan semua').sort((a, b) => b.perubahan_proyeksi - a.perubahan_proyeksi)[0];
  const combo = sc.find((r) => r.skenario === 'Gabungan semua');

  const folds = d.shap.per_fold;
  const foldCols = Object.keys(folds[0] || {}).filter((k) => k !== 'fitur');
  const ranked = foldCols.map((c) => Object.fromEntries([...folds].sort((a, b) => b[c] - a[c]).map((r, i) => [r.fitur, i + 1])));
  const finalOrder = [...folds].sort((a, b) => b[foldCols[foldCols.length - 1]] - a[foldCols[foldCols.length - 1]]);

  return (
    <>
      <PageHead title="Faktor apa yang menggerakkan proyeksi?">
        Sistem pendukung keputusan harus bisa ditanya &quot;mengapa&quot;. Dengan SHAP, setiap proyeksi diuraikan menjadi dorongan dari tiap faktor
        dalam satuan poin APS, sehingga pemerintah bisa melihat tuas kebijakan mana yang paling berpengaruh untuk tiap provinsi.
      </PageHead>

      <section className="grid-2">
        <Panel title={`Faktor terpenting untuk proyeksi ${h1}`}
          lead={`Rata-rata besar dorongan setiap faktor pada model ${mf?.model} terpilih. Angka adalah porsi dari seluruh penjelasan.`}>
          <div className="chart" style={{ height: Math.max(300, global.length * 30) }}>
            <ResponsiveContainer>
              <BarChart data={global} layout="vertical" margin={{ top: 0, right: 56, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nama" width={200} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip content={<ChartTip render={(p) => <><b>{p[0].payload.nama}</b><div>rata-rata |SHAP| {fmt(p[0].payload.mean_abs_shap, 3)} poin</div></>} />} />
                <Bar dataKey="porsi_persen" radius={[0, 5, 5, 0]}>
                  {global.map((r) => <Cell key={r.fitur} fill={r.color} />)}
                  <LabelList dataKey="porsi_persen" position="right" formatter={(v) => `${fmt(v, 1)}%`} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legend items={Object.values(BLOCKS).map((b) => ({ color: b.color, label: b.label }))} />
          <p className="small">
            Di antara faktor yang bisa digerakkan lewat program pemerintah, yang terbesar adalah {listJoin(actionable.slice(0, 2).map((r) => r.nama.toLowerCase()))}.
            Faktor inilah yang paling layak menjadi tuas kebijakan.
          </p>
        </Panel>

        <div className="stack" style={{ gap: 24 }}>
          <Panel title="Seberapa besar peran hasil analisis spasial dan pola?"
            lead="Porsi penjelasan per kelompok faktor pada varian model yang memakai semua fitur.">
            <div className="signal-bar" style={{ height: 30, borderRadius: 10 }}>
              {blocks.map((b) => <i key={b.k} style={{ width: `${b.share * 100}%`, background: BLOCKS[b.k]?.color }} title={`${BLOCKS[b.k]?.label} ${fmt(b.share * 100, 1)}%`} />)}
            </div>
            <div className="stack" style={{ gap: 6 }}>
              {blocks.map((b) => (
                <div key={b.k} className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="row" style={{ gap: 8 }}><span className="dot" style={{ background: BLOCKS[b.k]?.color }} />{BLOCKS[b.k]?.label}</span>
                  <b>{fmt(b.share * 100, 1)}%</b>
                </div>
              ))}
            </div>
            <p className="small">Kondisi tetangga ikut menjelaskan proyeksi, sejalan dengan temuan Moran&apos;s I bahwa perubahan APS bergerak per kawasan.</p>
          </Panel>

          <Panel title={`Pendorong jangka pendek dan menengah`}
            lead={`Porsi kepentingan sepuluh faktor teratas pada model ${h1} dibandingkan model ${h2}.`}>
            <div className="chart" style={{ height: 360 }}>
              <ResponsiveContainer>
                <BarChart data={hz} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="nama" width={180} tickLine={false} axisLine={false} tick={{ fontSize: 11.5 }} />
                  <Tooltip content={<ChartTip render={(p) => <><b>{p[0].payload.nama}</b><div>{h1}: {fmt(p[0].payload.a, 1)}%</div><div>{h2}: {fmt(p[0].payload.b, 1)}%</div></>} />} />
                  <RLegend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="a" name={`Proyeksi ${h1}`} fill={COLOR.walnut} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="a" position="right" formatter={(v) => (v > 0 ? fmt(v, 1) : '')} fontSize={10} />
                  </Bar>
                  <Bar dataKey="b" name={`Proyeksi ${h2}`} fill={COLOR.tan} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="b" position="right" formatter={(v) => (v > 0 ? fmt(v, 1) : '')} fontSize={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </section>

      <Panel title={`Mengapa proyeksi ${model.name(focus)} seperti ini?`}
        lead={`Uraian proyeksi perubahan APS 16-18 dari ${model.lastYear} ke ${h1}. Merah menurunkan proyeksi, hijau menaikkan.`}
        actions={<ProvincePicker model={model} value={focus} onChange={setSelected} />}>
        {local ? (
          <div className="grid-2">
            <Waterfall contributions={contributions} base={base} total={total} />
            <div className="stack">
              <div className="big-figure">
                <div><b className={total < 0 ? 'neg' : 'pos'}>{signed(total, 2)}</b><span>poin perubahan diproyeksikan ke {h1}</span></div>
                <div><b>{fmt(model.fc[focus]?.[`aps_${h1}_pred`])}%</b><span>proyeksi APS 16-18 {h1}</span></div>
              </div>
              <p>
                {negatives.length > 0 && <>Proyeksi tertahan terutama oleh {listJoin(negatives.map((c) => `${featureLabel(c.key).toLowerCase()} (${signed(c.value, 2)})`))}. </>}
                {positives.length > 0 && <>Yang menopangnya: {listJoin(positives.map((c) => `${featureLabel(c.key).toLowerCase()} (${signed(c.value, 2)})`))}.</>}
              </p>
              <Callout title="Cara memakai uraian ini">
                Faktor merah terbesar yang bisa diubah lewat kebijakan adalah kandidat tuas intervensi. Angka SHAP menunjukkan asosiasi di dalam model,
                bukan jaminan bahwa memperbaiki faktor itu akan menaikkan APS sebesar angka tersebut.
              </Callout>
              <button type="button" className="link-btn" onClick={() => go('provinsi', focus)}>Buka lembar ringkas {model.name(focus)}</button>
            </div>
          </div>
        ) : <p className="muted">Uraian tidak tersedia untuk provinsi ini.</p>}
      </Panel>

      <Panel title="Simulasi kebijakan: bagaimana jika kondisi diperbaiki?"
        lead="Kondisi provinsi dinaikkan ke median nasional (hanya bila saat ini di bawah median), lalu proyeksi dihitung ulang. Tersedia untuk enam provinsi dengan proyeksi terendah."
        actions={(
          <label className="stack" style={{ gap: 4 }}>
            <span className="label">Provinsi simulasi</span>
            <select className="picker" value={scProv} onChange={(e) => setScProv(e.target.value)}>
              {scenarioProv.map((p) => <option key={p} value={p}>{model.name(p)}</option>)}
            </select>
          </label>
        )}>
        <div className="grid-2">
          <div className="chart" style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={sc} layout="vertical" margin={{ top: 0, right: 56, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#f0e7db" horizontal={false} />
                <XAxis type="number" tickLine={false} />
                <YAxis type="category" dataKey="skenario" width={160} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <ReferenceLine x={0} stroke={COLOR.muted} />
                <Tooltip content={<ChartTip render={(p) => <><b>{p[0].payload.skenario}</b><div>proyeksi berubah {signed(p[0].value, 2)} poin</div></>} />} />
                <Bar dataKey="perubahan_proyeksi" radius={4}>
                  {sc.map((r) => <Cell key={r.skenario} fill={r.skenario === 'Gabungan semua' ? COLOR.espresso : r.perubahan_proyeksi >= 0 ? COLOR.sage : COLOR.wine} />)}
                  <LabelList dataKey="perubahan_proyeksi" position="right" formatter={(v) => signed(v, 2)} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="stack">
            {bestSc && (
              <p>
                Untuk {model.name(scProv)}, perbaikan tunggal yang paling menaikkan proyeksi adalah <b>{bestSc.skenario.toLowerCase()}</b> ({signed(bestSc.perubahan_proyeksi, 2)} poin).
                {combo && <> Jika keempatnya dilakukan bersamaan, proyeksi perubahan {h1} bergeser dari {signed(combo.prediksi_delta_awal, 2)} menjadi {signed(combo.prediksi_delta_skenario, 2)} poin.</>}
              </p>
            )}
            <Callout tone="warn" title="Ini sensitivitas model, bukan janji hasil">
              Simulasi menunjukkan faktor mana yang paling &quot;didengarkan&quot; model. Nilai nol berarti provinsi itu sudah di atas median untuk faktor tersebut.
              Dampak nyata sebuah program tetap perlu dievaluasi di lapangan.
            </Callout>
          </div>
        </div>
      </Panel>

      <Panel title="Apakah penjelasannya konsisten?" lead="Peringkat kepentingan faktor dihitung ulang dari model yang dilatih di setiap tahun uji. Angka kecil berarti lebih penting.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Faktor</th>{foldCols.map((c) => <th key={c} className="num">{c.replace('Fold ', 'Uji ')}</th>)}</tr></thead>
            <tbody>
              {finalOrder.map((r) => (
                <tr key={r.fitur}>
                  <td>{featureLabel(featureKey(r.fitur))}</td>
                  {foldCols.map((c, i) => <td key={c} className="num">{ranked[i][r.fitur]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">Model uji pertama hanya belajar dari satu tahun data sehingga peringkatnya paling berbeda. Peringkat model akhir paling dekat dengan uji terakhir yang datanya paling banyak.</p>
      </Panel>
    </>
  );
}
