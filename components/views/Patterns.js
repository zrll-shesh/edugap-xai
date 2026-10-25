'use client';
import { useState } from 'react';
import { CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Callout, ChartTip, Legend, Meter, PageHead, Panel } from '../ui';
import { COLOR, COUNTERINTUITIVE, isSpatialItem, itemShort } from '@/lib/model';
import { fmt, mix, pct, pval, textOn } from '@/lib/format';

const LINE_COLORS = ['#7a5233', '#3f6f5e', '#b98236', '#8c2f39', '#55708a', '#a77b55', '#8a7a4e'];
const CLASSES = ['Rendah', 'Sedang', 'Tinggi'];

function MarkovMatrix({ rows, title }) {
  const get = (a, b) => rows.find((r) => r.kelas_awal === a && r.kelas_berikut === b);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <h3 style={{ fontSize: '1rem' }}>{title}</h3>
      <div className="matrix" style={{ gridTemplateColumns: '84px repeat(3, minmax(0, 1fr))' }}>
        <span />
        {CLASSES.map((c) => <span key={c} className="head">ke {c.toLowerCase()}</span>)}
        {CLASSES.map((a) => [
          <span key={`${a}-h`} className="rhead">dari {a.toLowerCase()}</span>,
          ...CLASSES.map((b) => {
            const r = get(a, b);
            const p = r?.probabilitas;
            const bg = p === null || p === undefined ? '#f4efe9' : mix('#f7f1e9', '#7a5233', p);
            const hex = p > 0.55 ? '#7a5233' : '#f7f1e9';
            return (
              <span key={`${a}-${b}`} className="cell" style={{ background: bg, color: textOn(hex) }}>
                {p === null || p === undefined ? '–' : pct(p)}
                <small>{r?.jumlah ?? 0} transisi</small>
              </span>
            );
          }),
        ])}
      </div>
    </div>
  );
}

export default function Patterns({ model, go }) {
  const d = model.data;
  const [ruleFocus, setRuleFocus] = useState(null);
  const lastYear = model.lastYear;
  const membership = d.rules.keanggotaan.filter((r) => r.tahun === lastYear);
  const provincesFor = (id) => membership.filter((r) => r[id] === 1).map((r) => r.provinsi);
  const maxLift = Math.max(...model.rules.map((r) => r.lift));

  const dyn = model.years.map((y) => {
    const row = { tahun: y };
    d.rules.dinamika.filter((r) => r.tahun === y).forEach((r) => { row[r.rule_id] = r.confidence; });
    return row;
  });
  const shown = ruleFocus ? [ruleFocus] : model.rules.map((r) => r.rule_id);

  const early = membership.filter((r) => model.rules.some((rule) => r[rule.rule_id] === 1) && r.aps_rendah === 0)
    .map((r) => ({ key: r.provinsi, n: model.rules.filter((rule) => r[rule.rule_id] === 1).length }))
    .sort((a, b) => b.n - a.n);
  const confirmed = membership.filter((r) => model.rules.some((rule) => r[rule.rule_id] === 1) && r.aps_rendah === 1).map((r) => r.provinsi);

  const cmp = d.rules.perbandingan;
  const withSp = cmp.find((r) => r.skenario.startsWith('Internal +'));
  const internal = cmp.find((r) => r.skenario === 'Internal saja');
  const mk = (ctx) => d.rules.markov.filter((r) => r.konteks === ctx);
  const stay = (ctx) => d.rules.markov.find((r) => r.konteks === ctx && r.kelas_awal === 'Rendah' && r.kelas_berikut === 'Rendah');
  const lr = d.rules.uji_lr;
  const spatialRules = model.rules.filter((r) => r.spatial);

  return (
    <>
      <PageHead title="Kondisi apa yang menyertai partisipasi SMA rendah?">
        Bagian ini mencari kombinasi kondisi yang berulang kali muncul bersama APS 16-18 rendah di {d.panel.length} pengamatan provinsi-tahun.
        Bagi pengambil kebijakan, pola ini adalah daftar periksa: provinsi yang memenuhinya patut diwaspadai walaupun angkanya hari ini belum jatuh.
      </PageHead>

      <Panel field title="Cara membaca sebuah pola">
        <div className="grid-3">
          <div><h3 style={{ fontSize: '1rem' }}>Confidence</h3><p className="small">Dari semua provinsi-tahun yang memenuhi kondisinya, berapa persen yang APS 16-18-nya berada di sepertiga terbawah.</p></div>
          <div><h3 style={{ fontSize: '1rem' }}>Lift</h3><p className="small">Berapa kali lebih sering APS rendah muncul dibanding rata-rata. Lift 2 berarti dua kali lipat.</p></div>
          <div><h3 style={{ fontSize: '1rem' }}>Stabilitas</h3><p className="small">Persentase dari 500 kali pengambilan ulang provinsi di mana pola tetap lolos ambang. Makin tinggi makin bisa diandalkan.</p></div>
        </div>
        <p className="small muted">
          &quot;Rendah&quot;, &quot;menengah&quot;, dan &quot;tinggi&quot; berarti sepertiga terbawah, tengah, dan teratas di antara provinsi pada tahun yang sama.
          Semua pola lolos uji Fisher dengan koreksi FDR (q &lt; 0,05) dan uji stabilitas bootstrap minimal 60%.
        </p>
      </Panel>

      <Panel title={`${model.rules.length} pola risiko yang lolos uji`}
        lead="Diurutkan dari yang paling stabil. Klik nama provinsi untuk membuka profilnya.">
        <ol className="rule-list">
          {model.rules.map((r) => {
            const provs = provincesFor(r.rule_id);
            return (
              <li key={r.rule_id} className="rule">
                <span className="rule-id">{r.rule_id}</span>
                <div className="stack" style={{ gap: 10 }}>
                  <p className="rule-text">
                    Jika {r.conds.map((c, i) => <span key={c}>{i > 0 && (i === r.conds.length - 1 ? ' dan ' : ', ')}<em>{c}</em></span>)},
                    maka {pct(r.confidence)} kasus berada di kelompok APS rendah, {fmt(r.lift, 1)} kali lebih sering daripada rata-rata.
                  </p>
                  {r.spatial && <span className="small" style={{ color: COLOR.sage, fontWeight: 650 }}>Memuat kondisi provinsi tetangga dari analisis spasial.</span>}
                  <p className="small muted">
                    Dibentuk oleh {r.nCases} provinsi-tahun ({r.nLow} di antaranya benar-benar ber-APS rendah), terutama {r.drivers.slice(0, 4).map((x) => `${model.name(x.key)} (${x.n} tahun)`).join(', ')}.
                    {r.topRegion && r.topRegion.share >= 0.5 && <> Sebanyak {pct(r.topRegion.share)} kasusnya berasal dari {r.topRegion.name}.</>}
                  </p>
                  {r.odd.length > 0 && (
                    <Callout title="Mengapa pola ini terlihat janggal?">
                      {r.odd.map((i) => <span key={i}>{COUNTERINTUITIVE[i]} </span>)}
                      Tafsiran ini adalah dugaan dari data, bukan kesimpulan, dan perlu dicek dengan data ketenagakerjaan remaja atau temuan lapangan dinas pendidikan setempat.
                    </Callout>
                  )}
                  <div className="stack" style={{ gap: 6 }}>
                    <span className="label">Memenuhi pola ini pada {lastYear} ({provs.length} provinsi)</span>
                    <div className="tags">
                      {provs.length ? provs.map((p) => (
                        <button key={p} type="button" className="tag-chip" onClick={() => go('provinsi', p)}>{model.name(p)}</button>
                      )) : <span className="small muted">Tidak ada.</span>}
                    </div>
                  </div>
                </div>
                <div className="rule-meta">
                  <Meter label="Confidence" value={r.confidence} max={1} text={pct(r.confidence)} />
                  <Meter label="Lift" value={r.lift} max={maxLift} text={`${fmt(r.lift, 2)}x`} />
                  <Meter label="Stabilitas" value={r.stabilitas} max={1} text={pct(r.stabilitas)} />
                  <span className="tiny muted">Support {pct(r.support, 1)}, q FDR {pval(r.q_fdr)}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </Panel>

      <section className="grid-2">
        <Panel title="Daftar waspada: memenuhi pola, tetapi APS belum jatuh"
          lead={`Provinsi berikut pada ${lastYear} memenuhi minimal satu pola risiko, tetapi APS 16-18-nya belum masuk sepertiga terbawah. Mereka kandidat intervensi pencegahan.`}>
          {early.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Provinsi</th><th className="num">Pola terpenuhi</th><th className="num">APS {lastYear}</th></tr></thead>
                <tbody>
                  {early.map((e) => (
                    <tr key={e.key} className="click" onClick={() => go('provinsi', e.key)}>
                      <td>{model.name(e.key)}</td>
                      <td className="num">{e.n}</td>
                      <td className="num">{fmt(model.panel[e.key][lastYear].aps_16_18)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted">Tidak ada provinsi dalam kategori ini.</p>}
          <p className="small muted">Sudah rendah dan memenuhi pola ({confirmed.length} provinsi): {confirmed.map((k) => model.name(k)).join(', ') || '-'}.</p>
        </Panel>

        <Panel title="Apakah kondisi tetangga menambah informasi?"
          lead="Penambangan pola diulang tanpa kondisi provinsi tetangga, dengan prosedur yang sama persis.">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Ukuran</th><th className="num">Dengan kondisi tetangga</th><th className="num">Tanpa</th></tr></thead>
              <tbody>
                <tr><td>Kandidat pola</td><td className="num">{withSp?.kandidat}</td><td className="num">{internal?.kandidat}</td></tr>
                <tr><td>Lolos uji dan stabil</td><td className="num">{withSp?.terpilih}</td><td className="num">{internal?.terpilih}</td></tr>
                <tr><td>Rata-rata confidence</td><td className="num">{pct(withSp?.rata2_confidence, 1)}</td><td className="num">{pct(internal?.rata2_confidence, 1)}</td></tr>
                <tr><td>Rata-rata lift</td><td className="num">{fmt(withSp?.rata2_lift, 2)}</td><td className="num">{fmt(internal?.rata2_lift, 2)}</td></tr>
                <tr><td>Lift tertinggi</td><td className="num">{fmt(withSp?.lift_maks, 2)}</td><td className="num">{fmt(internal?.lift_maks, 2)}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="small">
            Menambahkan konteks tetangga menghasilkan pola yang lebih kuat. {spatialRules.length > 0 && <>Pola dengan lift tertinggi ({spatialRules.map((r) => r.rule_id).join(', ')}) memuat kondisi provinsi tetangga,
            artinya posisi geografis memberi informasi yang tidak terlihat dari data provinsi itu sendiri.</>}
          </p>
        </Panel>
      </section>

      <section className="grid-2">
        <Panel title="Apakah pola bertahan dari tahun ke tahun?"
          lead="Confidence setiap pola dihitung ulang per tahun. Garis yang stabil di atas ambang menandakan pola struktural, bukan kebetulan satu tahun."
          actions={(
            <select className="picker" style={{ minWidth: 160 }} value={ruleFocus || ''} onChange={(e) => setRuleFocus(e.target.value || null)} aria-label="Pilih pola">
              <option value="">Semua pola</option>
              {model.rules.map((r) => <option key={r.rule_id} value={r.rule_id}>{r.rule_id}</option>)}
            </select>
          )}>
          <div className="chart" style={{ height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={dyn} margin={{ top: 20, right: 24, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#f0e7db" vertical={false} />
                <XAxis dataKey="tahun" tickLine={false} />
                <YAxis domain={[0, 1]} tickFormatter={(v) => pct(v)} tickLine={false} axisLine={false} />
                <ReferenceLine y={0.6} stroke={COLOR.muted} strokeDasharray="5 4" label={{ value: 'ambang 60%', fontSize: 11, fill: COLOR.muted, position: 'insideBottomRight' }} />
                <Tooltip content={<ChartTip render={(p, l) => <><b>{l}</b>{p.map((x) => <div key={x.dataKey}>{x.dataKey}: {pct(x.value)}</div>)}</>} />} />
                {model.rules.filter((r) => shown.includes(r.rule_id)).map((r, i) => (
                  <Line key={r.rule_id} dataKey={r.rule_id} stroke={LINE_COLORS[model.rules.indexOf(r) % LINE_COLORS.length]} strokeWidth={ruleFocus ? 3 : 2} dot={{ r: 3 }} connectNulls>
                    {ruleFocus && <LabelList dataKey={r.rule_id} position="top" formatter={(v) => pct(v)} fontSize={11} />}
                  </Line>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Legend items={model.rules.map((r, i) => ({ color: LINE_COLORS[i % LINE_COLORS.length], label: r.rule_id }))} />
        </Panel>

        <Panel title="Lingkungan memengaruhi peluang keluar dari kelompok bawah"
          lead="Spatial Markov chain: peluang provinsi berpindah kelas APS 16-18 dari satu tahun ke tahun berikutnya, dipisahkan menurut kondisi tetangganya.">
          <div className="grid-2" style={{ gap: 16 }}>
            <MarkovMatrix rows={mk('Tetangga lemah')} title="Tetangga dengan APS di bawah median" />
            <MarkovMatrix rows={mk('Tetangga kuat')} title="Tetangga dengan APS di atas median" />
          </div>
          <p className="small">
            Provinsi di kelas rendah yang dikelilingi tetangga lemah bertahan di kelas rendah dengan peluang {pct(stay('Tetangga lemah')?.probabilitas)},
            dibanding {pct(stay('Tetangga kuat')?.probabilitas)} jika tetangganya kuat.
          </p>
          <Callout title={lr.p < 0.05 ? 'Perbedaan signifikan' : 'Perbedaan belum signifikan secara statistik'}>
            Uji likelihood ratio: statistik {fmt(lr.statistik, 2)}, derajat bebas {lr.df}, p = {pval(lr.p)}.
            {lr.p >= 0.05 && ' Dengan hanya empat transisi tahunan, arah temuannya konsisten tetapi belum cukup kuat. Gunakan sebagai petunjuk, bukan kesimpulan.'}
          </Callout>
        </Panel>
      </section>

      <Panel title="Semua kandidat pola" lead={`${d.rules.kandidat.length} kandidat lolos ambang support 8%, confidence 60%, dan lift 1,2. Yang dicetak tebal terpilih setelah uji stabilitas dan pemangkasan pola yang berulang.`}>
        <div className="table-wrap tall">
          <table>
            <thead><tr><th>Kondisi</th><th className="num">Support</th><th className="num">Confidence</th><th className="num">Lift</th><th className="num">q FDR</th><th className="num">Stabilitas</th></tr></thead>
            <tbody>
              {[...d.rules.kandidat].sort((a, b) => b.stabilitas - a.stabilitas).map((r) => {
                const items = r.antecedent.split(' & ');
                const chosen = model.rules.some((x) => x.antecedent.join(' & ') === r.antecedent);
                return (
                  <tr key={r.antecedent} className={chosen ? 'hl' : ''}>
                    <td>{items.map((i) => itemShort(i)).join(' + ')}{items.some(isSpatialItem) ? ' (spasial)' : ''}</td>
                    <td className="num">{pct(r.support, 1)}</td>
                    <td className="num">{pct(r.confidence)}</td>
                    <td className="num">{fmt(r.lift, 2)}</td>
                    <td className="num">{pval(r.q_fdr)}</td>
                    <td className="num">{pct(r.stabilitas)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
