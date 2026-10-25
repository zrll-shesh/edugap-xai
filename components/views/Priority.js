'use client';
import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import ChoroplethMap from '../ChoroplethMap';
import { Callout, Legend, PageHead, Panel, SignalBar, SignalLegend, Signals, TypeBadge } from '../ui';
import { BLOCKS, COLOR, LISA, TYPES, typeMeta } from '@/lib/model';
import { fmt, listJoin, mix, pct, signed } from '@/lib/format';

function toCsv(rows) {
  const head = ['peringkat', 'provinsi', 'wilayah', 'tipologi', 'IPI', 'skor_spasial', 'skor_pola', 'skor_prediktif', 'aps_2025', 'proyeksi_2026', 'proyeksi_2027', 'tuas_utama', 'rekomendasi'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [r.peringkat_prioritas, r.provinsi, r.wilayah, r.tipologi, r.IPI.toFixed(1), r.skor_spasial.toFixed(3), r.skor_pola.toFixed(3),
    r.skor_prediktif.toFixed(3), r.aps_2025, r.aps_2026_pred.toFixed(2), r.aps_2027_pred.toFixed(2), r.tuas_utama, r.rekomendasi].map(esc).join(','));
  return [head.join(','), ...lines].join('\n');
}

export default function Priority({ model, geo, go, selected, setSelected }) {
  const d = model.data;
  const [type, setType] = useState('Semua');
  const [region, setRegion] = useState('Semua');
  const [mapMode, setMapMode] = useState('tipologi');

  const rows = useMemo(() => model.triRows.filter((r) => (type === 'Semua' || r.tipologi === type) && (region === 'Semua' || r.wilayah === region)), [model, type, region]);
  const counts = Object.fromEntries(TYPES.map((t) => [t.id, model.triRows.filter((r) => r.tipologi === t.id).length]));
  const present = TYPES.filter((t) => counts[t.id] > 0);

  const fill = (key) => {
    const r = model.tri[key];
    if (!r) return null;
    if (type !== 'Semua' && r.tipologi !== type) return '#efe9e2';
    return mapMode === 'tipologi' ? typeMeta(r.tipologi).color : mix('#f3ebe0', '#4a2a1a', r.IPI / 100);
  };
  const tooltip = (key, rich) => {
    const r = model.tri[key];
    const name = model.name(key);
    if (!r) return name;
    if (!rich) return `${name}: ${r.tipologi}, IPI ${fmt(r.IPI, 0)}`;
    return <><b>{name}</b>{r.tipologi}<br />IPI {fmt(r.IPI, 0)}, peringkat {r.peringkat_prioritas}<br />Tuas utama: {r.tuas_utama}</>;
  };

  const download = () => {
    const blob = new Blob([`\ufeff${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prioritas_intervensi_${type === 'Semua' ? 'semua' : type.toLowerCase().replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kappa = d.tri.kappa;
  const sigNames = ['Spasial', 'Pola', 'Prediktif'];
  const pairs = [['Spasial', 'Pola'], ['Spasial', 'Prediktif'], ['Pola', 'Prediktif']].map(([a, b]) => ({ a, b, k: kappa.find((r) => r.sinyal === a)?.[b] }));
  const bobot = d.tri.bobot;
  const weightCorr = bobot.length ? Math.min(...bobot.flatMap((r) => Object.entries(r).filter(([k]) => k !== 'skema').map(([, v]) => v))) : null;
  const leverCount = {};
  model.triRows.filter((r) => r.jumlah_sinyal >= 2).forEach((r) => { leverCount[r.tuas_utama] = (leverCount[r.tuas_utama] || 0) + 1; });
  const levers = Object.entries(leverCount).sort((a, b) => b[1] - a[1]);
  const active = type === 'Semua' ? null : typeMeta(type);

  return (
    <>
      <PageHead title="Provinsi mana yang perlu didahulukan, dan lewat tuas apa?">
        Halaman ini adalah inti sistem pendukung keputusan. Tiga bukti yang dihitung dengan cara berbeda digabung menjadi Indeks Prioritas Intervensi,
        lalu setiap provinsi diberi tipologi dan tuas kebijakan yang paling berpengaruh menurut model. Hasilnya bisa difilter dan diunduh sebagai CSV.
      </PageHead>

      <Panel field title="Bagaimana prioritas dihitung">
        <div className="grid-3">
          <div className="stack" style={{ gap: 6 }}>
            <span className="row" style={{ gap: 8 }}><span className="dot" style={{ background: BLOCKS['Spasial (Moran/LISA)'].color }} /><h3 style={{ fontSize: '1rem' }}>Bukti spasial</h3></span>
            <p className="small">Nilai 1 jika provinsi termasuk klaster LISA &quot;{LISA.LL.label.toLowerCase()}&quot; yang signifikan, 0,5 jika berada di kuadran itu tetapi belum signifikan, 0 selain itu.</p>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <span className="row" style={{ gap: 8 }}><span className="dot" style={{ background: BLOCKS['Pola (aturan asosiasi)'].color }} /><h3 style={{ fontSize: '1rem' }}>Bukti pola risiko</h3></span>
            <p className="small">Confidence tertinggi dari pola risiko yang dipenuhi provinsi pada {model.lastYear}, yaitu peluang historis APS rendah untuk kondisi seperti itu.</p>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <span className="row" style={{ gap: 8 }}><span className="dot" style={{ background: COLOR.walnut }} /><h3 style={{ fontSize: '1rem' }}>Bukti proyeksi</h3></span>
            <p className="small">Seberapa rendah proyeksi APS 16-18 tahun {model.forecastYears[0]} dibanding provinsi lain, dari 0 (tertinggi) sampai 1 (terendah).</p>
          </div>
        </div>
        <p className="small">
          <b>IPI = rata-rata ketiga skor x 100.</b> Sebuah bukti dianggap menyala jika skor spasial minimal 0,5, skor pola minimal 0,6, atau proyeksi berada di sepertiga terbawah.
          Bobot setara dipilih karena peringkat hampir tidak berubah di bawah tiga skema bobot lain (korelasi peringkat terendah {fmt(weightCorr, 3)}).
        </p>
      </Panel>

      <Panel title="Tipologi provinsi" lead="Pilih tipologi untuk menyaring peta dan tabel.">
        <div className="tags">
          <button type="button" className={`chip${type === 'Semua' ? ' on' : ''}`} onClick={() => setType('Semua')}>Semua ({model.triRows.length})</button>
          {present.map((t) => (
            <button key={t.id} type="button" className={`chip${type === t.id ? ' on' : ''}`} onClick={() => setType(t.id)}>
              <span className="dot" style={{ background: t.color, marginRight: 6, verticalAlign: '-1px' }} />{t.id} ({counts[t.id]})
            </button>
          ))}
        </div>
        {active ? <Callout title={active.id}>{active.desc}</Callout> : (
          <div className="grid-2" style={{ gap: 10 }}>
            {present.map((t) => (
              <div key={t.id} className="row" style={{ alignItems: 'flex-start', gap: 10, flexWrap: 'nowrap' }}>
                <span className="dot" style={{ background: t.color, marginTop: 7 }} />
                <span className="small"><b className="strong">{t.id}.</b> {t.desc}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Peta prioritas"
        actions={(
          <div className="seg" role="group" aria-label="Mode peta">
            <button type="button" className={mapMode === 'tipologi' ? 'on' : ''} onClick={() => setMapMode('tipologi')}>Tipologi</button>
            <button type="button" className={mapMode === 'ipi' ? 'on' : ''} onClick={() => setMapMode('ipi')}>Nilai IPI</button>
          </div>
        )}>
        <ChoroplethMap geo={geo} fill={fill} tooltip={tooltip} selected={selected} onSelect={(k) => go('provinsi', k)}
          regions={model.regions} regionOf={(k) => model.byKey[k]?.wilayah} ariaLabel="Peta prioritas intervensi" />
        {mapMode === 'tipologi'
          ? <Legend items={present.map((t) => ({ color: t.color, label: `${t.id} (${counts[t.id]})` }))} />
          : <Legend items={[0, 25, 50, 75, 100].map((v) => ({ color: mix('#f3ebe0', '#4a2a1a', v / 100), label: `IPI ${v}` }))} note="Makin gelap makin prioritas." />}
        <p className="tiny muted">Klik provinsi untuk membuka lembar ringkasnya.</p>
      </Panel>

      <Panel title={`Daftar prioritas${type !== 'Semua' ? `: ${type}` : ''}${region !== 'Semua' ? `, ${region}` : ''} (${rows.length} provinsi)`}
        lead="Tuas utama adalah faktor yang bisa diubah lewat kebijakan dengan dorongan negatif terbesar pada proyeksi provinsi itu."
        actions={(
          <>
            <select className="picker" style={{ minWidth: 170 }} value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Filter wilayah">
              <option value="Semua">Semua wilayah</option>
              {model.regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button type="button" className="btn ghost sm" onClick={download}><Download size={15} />Unduh CSV</button>
          </>
        )}>
        <div className="table-wrap tall">
          <table>
            <thead>
              <tr>
                <th className="num">#</th><th>Provinsi</th><th>Tipologi</th><th>Bukti menyala</th><th style={{ minWidth: 150 }}>IPI</th>
                <th className="num">APS {model.lastYear}</th><th className="num">Proyeksi {model.forecastYears[0]}</th><th>Tuas utama dan arah program</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.provinsi} className={`click${r.provinsi === selected ? ' hl' : ''}`} onClick={() => go('provinsi', r.provinsi)}>
                  <td className="num strong">{r.peringkat_prioritas}</td>
                  <td><b className="strong">{model.name(r.provinsi)}</b><br /><span className="tiny muted">{r.wilayah}</span></td>
                  <td><TypeBadge type={r.tipologi} /></td>
                  <td><Signals row={r} /> <span className="tiny muted">{r.jumlah_sinyal} dari 3</span></td>
                  <td><div className="row" style={{ flexWrap: 'nowrap', gap: 8 }}><div style={{ flex: 1, minWidth: 80 }}><SignalBar row={r} /></div><b>{fmt(r.IPI, 0)}</b></div></td>
                  <td className="num">{fmt(r.aps_2025)}</td>
                  <td className={`num ${r.delta_2026 < 0 ? 'neg' : ''}`}>{fmt(r.aps_2026_pred)} <span className="tiny">({signed(r.delta_2026)})</span></td>
                  <td><span className="small"><b className="strong">{r.tuas_utama}</b><br />{r.rekomendasi}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SignalLegend />
      </Panel>

      <section className="grid-2">
        <Panel title="Tuas yang paling sering muncul" lead="Dihitung pada provinsi dengan minimal dua bukti menyala.">
          <div className="stack" style={{ gap: 10 }}>
            {levers.map(([lever, n]) => (
              <div key={lever} className="meter" style={{ gridTemplateColumns: 'minmax(140px, 220px) 1fr 40px' }}>
                <span>{lever}</span>
                <div><i style={{ width: `${(n / levers[0][1]) * 100}%` }} /></div>
                <b>{n}</b>
              </div>
            ))}
          </div>
          {levers.length > 0 && (
            <p className="small">
              {levers[0][0]} menjadi tuas utama di {levers[0][1]} provinsi berprioritas tinggi. Untuk program nasional, ini kandidat intervensi lintas provinsi
              yang paling efisien; tuas lain lebih cocok ditangani per daerah.
            </p>
          )}
        </Panel>

        <Panel title="Seberapa sepakat ketiga bukti?" lead="Cohen's kappa mengukur kesepakatan setelah dikurangi faktor kebetulan: 0 berarti setara acak, 1 berarti sepakat penuh.">
          <div className="stack" style={{ gap: 10 }}>
            {pairs.map((p) => (
              <div key={`${p.a}-${p.b}`} className="meter" style={{ gridTemplateColumns: '160px 1fr 48px' }}>
                <span>{p.a} dan {p.b}</span>
                <div><i style={{ width: `${Math.max(0, p.k) * 100}%`, background: COLOR.sage }} /></div>
                <b>{fmt(p.k, 2)}</b>
              </div>
            ))}
          </div>
          <p className="small">
            Kesepakatan sedang, bukan sempurna, dan itu yang diharapkan: tiga metode menangkap sisi yang berbeda. Provinsi yang ditandai ketiganya sekaligus
            ({listJoin(model.triRows.filter((r) => r.jumlah_sinyal === 3).map((r) => model.name(r.provinsi)))}) adalah temuan paling kokoh.
          </p>
          <span className="tiny muted">Sinyal: {sigNames.join(', ')}. Persentase provinsi dengan minimal satu bukti menyala: {pct(model.triRows.filter((r) => r.jumlah_sinyal > 0).length / model.triRows.length)}.</span>
        </Panel>
      </section>
    </>
  );
}
