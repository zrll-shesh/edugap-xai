'use client';
import { useMemo, useState } from 'react';
import {
  Area, Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Legend as RLegend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import ChoroplethMap from '../ChoroplethMap';
import { Callout, ChartTip, Legend, PageHead, Panel, ProvincePicker } from '../ui';
import { APS_CLASSES, CHANGE_CLASSES, COLOR, classify } from '@/lib/model';
import { fmt, listJoin, pct, pval, signed } from '@/lib/format';

const FEATURE_SET = { Base: 'kondisi dasar', 'Base+Spatial': 'kondisi dasar + konteks spasial', 'Base+Pattern': 'kondisi dasar + pola risiko', Full: 'semua fitur' };

export function TrajectoryChart({ model, prov, height = 300 }) {
  const rows = model.history(prov);
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ top: 20, right: 20, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#f0e7db" vertical={false} />
          <XAxis dataKey="tahun" tickLine={false} />
          <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} />
          <ReferenceLine x={model.lastYear + 0.5} stroke={COLOR.muted} strokeDasharray="4 4" />
          <Tooltip content={<ChartTip render={(p, l) => {
            const r = p[0].payload;
            return (
              <>
                <b>{l}</b>
                {r.aktual !== undefined && <div>Aktual: {fmt(r.aktual)}%</div>}
                {r.induk !== undefined && <div>Ikut provinsi induk: {fmt(r.induk)}%</div>}
                {r.proyeksi !== undefined && l > model.lastYear && <div>Proyeksi: {fmt(r.proyeksi)}% (rentang {fmt(r.band[0])} sampai {fmt(r.band[1])})</div>}
                <div>Rata-rata antarprovinsi: {fmt(r.nasional)}%</div>
              </>
            );
          }} />} />
          <Area dataKey="band" stroke="none" fill={COLOR.tan} fillOpacity={0.3} name="Rentang 90%" isAnimationActive={false} />
          <Line dataKey="nasional" stroke={COLOR.muted} strokeDasharray="5 4" dot={false} strokeWidth={1.5} name="Rata-rata antarprovinsi" />
          <Line dataKey="induk" stroke={COLOR.tan} strokeWidth={2} dot={{ r: 3 }} name="Ikut provinsi induk" connectNulls />
          <Line dataKey="aktual" stroke={COLOR.espresso} strokeWidth={3} dot={{ r: 4 }} name="Aktual BPS">
            <LabelList dataKey="aktual" position="top" formatter={(v) => fmt(v)} fontSize={11} />
          </Line>
          <Line dataKey="proyeksi" stroke={COLOR.wine} strokeWidth={3} strokeDasharray="6 4" dot={{ r: 4 }} name="Proyeksi">
            <LabelList dataKey="proyeksi" position="top" formatter={(v) => fmt(v)} fontSize={11} content={(props) => {
              const { x, y, value, index } = props;
              if (rows[index]?.tahun <= model.lastYear || value === undefined) return null;
              return <text x={x} y={y - 10} textAnchor="middle" fontSize={11} fill={COLOR.wine}>{fmt(value)}</text>;
            }} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Forecast({ model, geo, go, selected, setSelected }) {
  const d = model.data;
  const [h1, h2] = model.forecastYears;
  const [layer, setLayer] = useState(`v${h1}`);
  const [horizon, setHorizon] = useState(1);
  const [sort, setSort] = useState({ key: `aps_${h1}_pred`, dir: 1 });
  const focus = selected || model.triRows[0].provinsi;
  const mf = d.forecast.model_final;

  const year = layer.endsWith(String(h2)) ? h2 : h1;
  const isChange = layer.startsWith('d');
  const fill = (key) => {
    const r = model.fc[key];
    if (!r) return null;
    return isChange ? classify(r[`aps_${year}_pred`] - r.aps_2025, CHANGE_CLASSES)?.color : classify(r[`aps_${year}_pred`], APS_CLASSES)?.color;
  };
  const tooltip = (key, rich) => {
    const r = model.fc[key];
    const name = model.name(key);
    if (!r) return name;
    const v = r[`aps_${year}_pred`];
    if (!rich) return `${name}: proyeksi ${year} ${fmt(v)}%`;
    return <><b>{name}</b>Proyeksi {year}: {fmt(v)}% ({signed(v - r.aps_2025)} dari {model.lastYear})<br />Rentang 90%: {fmt(r[`bawah_${year}`])} sampai {fmt(r[`atas_${year}`])}</>;
  };

  const board = d.forecast.leaderboard.filter((r) => r.horizon === horizon);
  const chosen = mf[String(model.forecastYears[horizon - 1])];
  const ablationModels = ['LightGBM', 'ElasticNet'];
  const sets = ['Base', 'Base+Spatial', 'Base+Pattern', 'Full'];
  const mae = (m, f) => board.find((r) => r.model === m && r.fitur === f)?.MAE;
  const persist = board.find((r) => r.model === 'Persistence')?.MAE;
  const maeAll = board.filter((r) => ablationModels.includes(r.model)).map((r) => r.MAE);
  const minMae = Math.min(...maeAll);
  const maxMae = Math.max(...maeAll, persist);

  const folds = d.forecast.mae_per_fold.map((r) => ({ ...r, label: r.fold.replace('h1: ', '1 th, ').replace('h2: ', '2 th, ').replace('->', '-') }));
  const cov = d.forecast.uji_cakupan.find((r) => Math.abs(r.target_cakupan - 0.9) < 1e-6);
  const enet = d.forecast.elasticnet;
  const fall26 = d.forecast.proyeksi.filter((r) => r.delta_2026 < 0);
  const dobProv = model.provinces.filter((p) => p.induk).map((p) => p.provinsi);

  const table = useMemo(() => {
    const rows = d.forecast.proyeksi.map((r) => ({ ...r, nama: model.name(r.provinsi), ch1: r[`aps_${h1}_pred`] - r.aps_2025, ch2: r[`aps_${h2}_pred`] - r.aps_2025 }));
    return rows.sort((a, b) => (a[sort.key] > b[sort.key] ? 1 : -1) * sort.dir);
  }, [d, sort, h1, h2, model]);
  const th = (key, label, cls = 'num') => (
    <th className={cls} aria-sort={sort.key === key ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))}>{label}{sort.key === key ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}</button>
    </th>
  );

  return (
    <>
      <PageHead title={`Ke mana arah APS 16-18 pada ${h1} dan ${h2}?`}>
        Proyeksi membantu pemerintah bertindak sebelum angka turun, bukan sesudahnya. Setiap angka di sini disertai rentang keyakinan 90%
        dan dibandingkan dengan tebakan paling sederhana, agar pembaca tahu seberapa jauh proyeksi boleh dipercaya.
      </PageHead>

      <section className="grid-2">
        {model.forecastYears.map((y, i) => {
          const m = mf[String(y)];
          return (
            <div key={y} className="panel field">
              <span className="label">Proyeksi {y}, {i === 0 ? 'satu' : 'dua'} tahun ke depan</span>
              <h2 style={{ fontSize: '1.25rem' }}>{m.model} dengan {FEATURE_SET[m.set_fitur] || m.set_fitur}</h2>
              <div className="big-figure">
                <div><b>{fmt(m.mae, 2)}</b><span>poin rata-rata galat saat diuji</span></div>
                <div><b>{pct(m.skill, 1)}</b><span>lebih akurat daripada menebak angka tahun lalu</span></div>
                <div><b>&plusmn;{fmt(m.conformal_halfwidth_90, 1)}</b><span>poin rentang keyakinan 90%</span></div>
              </div>
              <p className="small">
                Model ini terpilih karena galat validasinya paling kecil di antara ElasticNet dan LightGBM pada empat set fitur.
                Keunggulannya atas tebakan &quot;sama dengan tahun lalu&quot; signifikan secara statistik (uji Wilcoxon, p = {pval(m.p_wilcoxon_vs_persistence)}).
              </p>
            </div>
          );
        })}
      </section>

      <div className="grid-map">
        <Panel title="Peta proyeksi"
          lead={isChange ? `Perubahan APS 16-18 dari ${model.lastYear} ke ${year}, dalam poin persentase.` : `Proyeksi APS 16-18 tahun ${year}.`}
          actions={(
            <div className="seg" role="group" aria-label="Lapisan peta proyeksi">
              {[[`v${h1}`, `APS ${h1}`], [`v${h2}`, `APS ${h2}`], [`d${h1}`, `Perubahan ke ${h1}`], [`d${h2}`, `Perubahan ke ${h2}`]].map(([id, l]) => (
                <button key={id} type="button" className={layer === id ? 'on' : ''} onClick={() => setLayer(id)}>{l}</button>
              ))}
            </div>
          )}>
          <ChoroplethMap geo={geo} fill={fill} tooltip={tooltip} selected={focus} onSelect={setSelected}
            regions={model.regions} regionOf={(k) => model.byKey[k]?.wilayah} ariaLabel={`Peta proyeksi ${year}`} />
          <Legend items={(isChange ? CHANGE_CLASSES : APS_CLASSES).map((c) => ({ color: c.color, label: c.label }))}
            note={isChange ? 'Merah: diproyeksikan turun. Hijau: diproyeksikan naik.' : 'Makin gelap, makin rendah.'} />
        </Panel>
        <div className="info-card" style={{ background: COLOR.linen }}>
          <ProvincePicker model={model} value={focus} onChange={setSelected} />
          <h3>{model.name(focus)}</h3>
          <dl className="kv">
            <dt>Aktual {model.lastYear}</dt><dd>{fmt(model.fc[focus].aps_2025)}%</dd>
            {model.forecastYears.map((y) => (
              <span key={y} style={{ display: 'contents' }}>
                <dt>Proyeksi {y}</dt>
                <dd>{fmt(model.fc[focus][`aps_${y}_pred`])}% <span className={model.fc[focus][`aps_${y}_pred`] < model.fc[focus].aps_2025 ? 'neg' : 'pos'}>({signed(model.fc[focus][`aps_${y}_pred`] - model.fc[focus].aps_2025)})</span></dd>
                <dt>Rentang 90% {y}</dt><dd>{fmt(model.fc[focus][`bawah_${y}`])} sampai {fmt(model.fc[focus][`atas_${y}`])}</dd>
              </span>
            ))}
          </dl>
          {dobProv.includes(focus) && (
            <p className="tiny muted">Provinsi ini baru tercatat terpisah sejak 2024. Proyeksi {h2} tidak punya contoh latih dari provinsi baru, jadi baca sebagai arah kasar.</p>
          )}
          <button type="button" className="link-btn" onClick={() => go('penjelasan', focus)}>Mengapa proyeksinya begini?</button>
        </div>
      </div>

      <Panel title={`Lintasan ${model.name(focus)}`} lead="Garis penuh adalah data BPS, garis putus-putus merah adalah proyeksi, pita cokelat adalah rentang keyakinan 90%, dan garis abu-abu adalah rata-rata antarprovinsi.">
        <TrajectoryChart model={model} prov={focus} />
      </Panel>

      <section className="grid-2">
        <Panel title="Bagaimana model dipilih"
          lead="Dua model diuji pada empat set fitur dengan validasi berjalan maju: model hanya belajar dari tahun sebelum tahun yang ditebak."
          actions={(
            <div className="seg" role="group" aria-label="Horizon">
              {[1, 2].map((hh) => <button key={hh} type="button" className={horizon === hh ? 'on' : ''} onClick={() => setHorizon(hh)}>{model.forecastYears[hh - 1]}</button>)}
            </div>
          )}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Model</th>{sets.map((s) => <th key={s} className="num">{FEATURE_SET[s]}</th>)}</tr></thead>
              <tbody>
                {ablationModels.map((m) => (
                  <tr key={m}>
                    <td>{m}</td>
                    {sets.map((s) => {
                      const v = mae(m, s);
                      const best = chosen.model === m && chosen.set_fitur === s;
                      const t = (v - minMae) / (maxMae - minMae || 1);
                      return <td key={s} className="num" style={{ background: best ? '#e6d3bb' : `rgba(201,164,126,${0.08 + (1 - t) * 0.22})`, fontWeight: best ? 800 : 500 }}>{fmt(v, 3)}</td>;
                    })}
                  </tr>
                ))}
                <tr><td>Tebakan &quot;sama dengan tahun lalu&quot;</td><td className="num" colSpan={4}>{fmt(persist, 3)}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="small">
            Angka adalah rata-rata galat absolut (MAE) dalam poin APS; makin kecil makin baik. Sel tersorot adalah model terpilih.
            ElasticNet hampir menyamai rata-rata perubahan karena regularisasinya menyusutkan banyak koefisien; hubungan antara kondisi provinsi
            dan perubahan APS ternyata tidak linear, sehingga LightGBM lebih tepat.
          </p>
          <details>
            <summary className="small strong" style={{ cursor: 'pointer' }}>Lihat metrik lengkap</summary>
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table>
                <thead><tr><th>Model</th><th>Fitur</th><th className="num">MAE</th><th className="num">RMSE</th><th className="num">MAPE</th><th className="num">Arah benar</th><th className="num">Skill</th><th className="num">p Wilcoxon</th></tr></thead>
                <tbody>
                  {board.map((r) => (
                    <tr key={`${r.model}-${r.fitur}`} className={r.model === chosen.model && r.fitur === chosen.set_fitur ? 'hl' : ''}>
                      <td>{r.model}</td><td>{r.fitur}</td><td className="num">{fmt(r.MAE, 3)}</td><td className="num">{fmt(r.RMSE, 3)}</td>
                      <td className="num">{fmt(r.MAPE_persen, 2)}%</td><td className="num">{r.akurasi_arah ? pct(r.akurasi_arah) : '–'}</td>
                      <td className="num">{pct(r.skill_agregat, 1)}</td><td className="num">{pval(r.p_wilcoxon_vs_persistence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Panel>

        <Panel title="Galat per tahun uji" lead="MAE model terpilih dibandingkan tebakan sama-dengan-tahun-lalu dan tebakan rata-rata perubahan.">
          <div className="chart" style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={folds} margin={{ top: 22, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid stroke="#f0e7db" vertical={false} />
                <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 11 }} interval={0} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTip render={(p, l) => <><b>{l}</b>{p.map((x) => <div key={x.dataKey}>{x.name}: {fmt(x.value, 3)}</div>)}</>} />} />
                <RLegend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Persistence" name="Sama dengan tahun lalu" fill="#d8ccbd" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Drift" name="Rata-rata perubahan" fill={COLOR.tan} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Model final" name="Model terpilih" fill={COLOR.walnut} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Model final" position="top" formatter={(v) => fmt(v, 2)} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="small">
            Label 1 th berarti proyeksi satu tahun ke depan, 2 th berarti dua tahun ke depan. Model terpilih paling unggul justru saat perubahannya besar, misalnya lonjakan 2025.
            Pada tahun yang tenang, tebakan sederhana sudah cukup baik.
          </p>
        </Panel>
      </section>

      <Panel title="Batas yang perlu diketahui sebelum memakai proyeksi">
        <div className="grid-3">
          <Callout tone="warn" title="Rentang keyakinan bisa terlalu sempit">
            Saat diuji pada 2025, rentang 90% hanya memuat {pct(cov?.cakupan_empiris)} nilai aktual karena kenaikan nasional tahun itu jauh di atas tahun-tahun sebelumnya.
            Rentang untuk {h1} sudah dilebarkan memakai seluruh galat, termasuk tahun lonjakan.
          </Callout>
          <Callout tone="warn" title={`Proyeksi ${h2} hanya diuji satu kali`}>
            Dengan data lima tahun, proyeksi dua tahun hanya punya satu tahun uji. Rentangnya lebar (&plusmn;{fmt(mf[String(h2)].conformal_halfwidth_90, 1)} poin)
            dan sebaiknya dipakai untuk melihat arah, bukan angka pasti.
          </Callout>
          <Callout tone="warn" title="Provinsi baru di Papua">
            {listJoin(dobProv.map((k) => model.name(k)))} baru tercatat terpisah sejak 2024, sehingga model {h2} tidak punya contoh dari provinsi ini.
            Proyeksi {h1} adalah sinyal yang lebih bisa dipegang untuk keempatnya.
          </Callout>
        </div>
        <p className="small muted">
          Diagnostik ElasticNet: koefisien tidak nol {enet.map((e) => `${e.koefisien_tidak_nol} dari ${e.jumlah_fitur} pada horizon ${e.horizon}`).join(', ')}.
          Provinsi yang diproyeksikan turun pada {h1}: {fall26.map((r) => model.name(r.provinsi)).join(', ') || 'tidak ada'}.
        </p>
      </Panel>

      <Panel title="Tabel proyeksi 38 provinsi" lead="Klik judul kolom untuk mengurutkan, klik baris untuk membuka profil provinsi.">
        <div className="table-wrap tall">
          <table>
            <thead>
              <tr>
                {th('nama', 'Provinsi', '')}
                {th('aps_2025', `Aktual ${model.lastYear}`)}
                {th(`aps_${h1}_pred`, `Proyeksi ${h1}`)}
                {th('ch1', `Perubahan ke ${h1}`)}
                {th(`aps_${h2}_pred`, `Proyeksi ${h2}`)}
                {th('ch2', `Perubahan ke ${h2}`)}
              </tr>
            </thead>
            <tbody>
              {table.map((r) => (
                <tr key={r.provinsi} className={`click${r.provinsi === focus ? ' hl' : ''}`} onClick={() => go('provinsi', r.provinsi)}>
                  <td>{r.nama}</td>
                  <td className="num">{fmt(r.aps_2025)}</td>
                  <td className="num">{fmt(r[`aps_${h1}_pred`])} <span className="tiny muted">({fmt(r[`bawah_${h1}`], 0)}-{fmt(r[`atas_${h1}`], 0)})</span></td>
                  <td className={`num ${r.ch1 < 0 ? 'neg' : ''}`}>{signed(r.ch1)}</td>
                  <td className="num">{fmt(r[`aps_${h2}_pred`])} <span className="tiny muted">({fmt(r[`bawah_${h2}`], 0)}-{fmt(r[`atas_${h2}`], 0)})</span></td>
                  <td className={`num ${r.ch2 < 0 ? 'neg' : ''}`}>{signed(r.ch2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
