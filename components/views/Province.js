'use client';
import { Printer } from 'lucide-react';
import { TrajectoryChart } from './Forecast';
import { Callout, LisaBadge, Panel, ProvincePicker, Signals, TypeBadge, Waterfall } from '../ui';
import { LISA, featureLabel } from '@/lib/model';
import { fmt, listJoin, pct, pval, signed } from '@/lib/format';

const INDICATORS = [
  ['aps_13_15', 'APS 13-15 (calon siswa SMA)', '%', 1],
  ['miskin', 'Penduduk miskin', '%', -1],
  ['listrik', 'Rumah tangga berlistrik', '%', 1],
  ['air_minum_layak', 'Akses air minum layak', '%', 1],
  ['rls', 'Rata-rata lama sekolah dewasa', ' th', 1],
  ['pou', 'Prevalensi kurang gizi', '%', -1],
  ['ikp', 'Indeks ketahanan pangan', '', 1],
  ['tpt', 'Pengangguran terbuka', '%', -1],
  ['pdrb_kapita', 'PDRB per kapita (ribu Rp)', '', 1],
];

export default function Province({ model, go, selected, setSelected }) {
  const d = model.data;
  const key = selected || model.triRows[0].provinsi;
  const p = model.byKey[key];
  const t = model.tri[key];
  const f = model.fc[key];
  const now = model.panel[key][model.lastYear];
  const lisa = model.lisa[model.lastYear][key];
  const rules = model.rules.filter((r) => (model.matched[key] || []).includes(r.rule_id));
  const nb = model.neighbors(key);
  const [h1, h2] = model.forecastYears;
  const local = model.shapLocal[key];
  const contributions = local ? Object.entries(local).filter(([k]) => k !== 'provinsi').map(([k, value]) => ({ key: k, value })) : [];
  const base = d.shap.base_value;
  const total = base + contributions.reduce((s, c) => s + c.value, 0);
  const drags = contributions.filter((c) => c.value < 0).sort((a, b) => a.value - b.value).slice(0, 3);
  const projRank = [...d.forecast.proyeksi].sort((a, b) => a[`aps_${h1}_pred`] - b[`aps_${h1}_pred`]).findIndex((r) => r.provinsi === key) + 1;

  const reasons = [];
  if (t?.sinyal_spasial) reasons.push(`Bukti spasial menyala: ${LISA[lisa?.cluster]?.label.toLowerCase() || 'berada di kuadran rendah-rendah'}. Rata-rata APS empat tetangga terdekatnya ${fmt(lisa?.w_aps_16_18)}%.`);
  if (t?.sinyal_pola) reasons.push(`Bukti pola menyala: memenuhi ${rules.length} pola risiko, dengan peluang historis APS rendah hingga ${pct(t.skor_pola)}.`);
  if (t?.sinyal_prediktif) reasons.push(`Bukti proyeksi menyala: proyeksi ${h1} berada di peringkat ${projRank} terendah dari ${d.forecast.proyeksi.length} provinsi.`);
  if (!reasons.length) reasons.push('Tidak ada bukti risiko yang menyala. Provinsi ini relatif aman, tetapi tetap perlu dipantau.');

  return (
    <>
      <div className="row no-print" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <ProvincePicker model={model} value={key} onChange={setSelected} label="Lembar ringkas untuk provinsi" />
        <button type="button" className="btn ghost sm" onClick={() => window.print()}><Printer size={15} />Cetak atau simpan PDF</button>
      </div>

      <section className="hero reveal" aria-labelledby="prov-title" style={{ gap: 20 }}>
        <div className="hero-top" style={{ alignItems: 'start' }}>
          <div className="hero-copy" style={{ gap: 12 }}>
            <span className="label">{p.wilayah}{p.induk ? `, provinsi baru hasil pemekaran ${model.name(p.induk)}` : ''}</span>
            <h1 id="prov-title">{p.nama}</h1>
            <div className="row">
              {t && <TypeBadge type={t.tipologi} />}
              {lisa && <LisaBadge cluster={lisa.cluster} />}
              {t && <span className="small">Prioritas #{t.peringkat_prioritas} dari {model.triRows.length}, IPI {fmt(t.IPI, 0)}</span>}
            </div>
          </div>
          <div className="hero-facts">
            <div className="fact"><b>{fmt(now.aps_16_18)}%</b><span>APS 16-18 {model.lastYear}, terendah ke-{model.rankLow[key]} dari {model.provinces.length}</span></div>
            <div className="fact"><b>{fmt(f[`aps_${h1}_pred`])}%</b><span>proyeksi {h1} ({signed(f[`aps_${h1}_pred`] - f.aps_2025)} poin), rentang {fmt(f[`bawah_${h1}`], 0)}-{fmt(f[`atas_${h1}`], 0)}</span></div>
            <div className="fact"><b>{fmt(f[`aps_${h2}_pred`])}%</b><span>proyeksi {h2}, rentang {fmt(f[`bawah_${h2}`], 0)}-{fmt(f[`atas_${h2}`], 0)}</span></div>
            <div className="fact"><b>{rules.length} pola</b><span>pola risiko yang terpenuhi pada {model.lastYear}</span></div>
          </div>
        </div>
      </section>

      <section className="grid-2">
        <Panel title="Mengapa provinsi ini ditandai" actions={t && <Signals row={t} />}>
          <ul className="plain-list">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          {t && (
            <Callout title={`Tuas utama: ${t.tuas_utama}`}>
              Arah program yang disarankan: {t.rekomendasi}.
              {drags.length > 0 && <> Faktor yang paling menahan proyeksi {h1}: {listJoin(drags.map((c) => `${featureLabel(c.key).toLowerCase()} (${signed(c.value, 2)} poin)`))}.</>}
            </Callout>
          )}
        </Panel>
        <Panel title={`Lintasan APS 16-18 sampai ${h2}`}>
          <TrajectoryChart model={model} prov={key} height={260} />
          {p.induk && <p className="tiny muted">Sebelum 2024, angka provinsi ini ikut {model.name(p.induk)} (garis cokelat muda).</p>}
        </Panel>
      </section>

      <section className="grid-2">
        <Panel title={`Kondisi ${model.lastYear} dibanding median nasional`} lead="Hijau berarti lebih baik dari median 38 provinsi, merah berarti lebih buruk.">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Indikator</th><th className="num">{p.nama}</th><th className="num">Median</th><th className="num">Selisih</th></tr></thead>
              <tbody>
                {INDICATORS.map(([k, label, unit, dir]) => {
                  const v = now[k];
                  const m = model.indicatorMedian[k];
                  const diff = v - m;
                  const good = diff * dir > 0;
                  const digits = k === 'pdrb_kapita' ? 0 : 1;
                  return (
                    <tr key={k}>
                      <td>{label}</td>
                      <td className="num strong">{fmt(v, digits)}{unit}</td>
                      <td className="num">{fmt(m, digits)}{unit}</td>
                      <td className={`num ${Math.abs(diff) < 1e-9 ? '' : good ? 'pos' : 'neg'}`}>{signed(diff, digits)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title={`Uraian proyeksi ${h1}`} lead="Dorongan setiap faktor terhadap perubahan APS 16-18 yang diproyeksikan, dalam poin.">
          {local ? <Waterfall contributions={contributions} base={base} total={total} limit={7} /> : <p className="muted">Tidak tersedia.</p>}
        </Panel>
      </section>

      <section className="grid-2">
        <Panel title="Pola risiko yang terpenuhi">
          {rules.length ? (
            <ul className="plain-list">
              {rules.map((r) => <li key={r.rule_id}><b className="strong">{r.rule_id}.</b> {r.sentence}</li>)}
            </ul>
          ) : <p className="muted">Provinsi ini tidak memenuhi pola risiko mana pun pada {model.lastYear}.</p>}
          <button type="button" className="link-btn no-print" onClick={() => go('pola')}>Lihat semua pola risiko</button>
        </Panel>

        <Panel title="Posisi terhadap tetangga">
          {lisa ? (
            <dl className="kv">
              <dt>Klaster LISA {model.lastYear}</dt><dd>{LISA[lisa.cluster].label}</dd>
              <dt>Rata-rata APS tetangga</dt><dd>{fmt(lisa.w_aps_16_18)}%</dd>
              <dt>p permutasi</dt><dd>{pval(lisa.p_sim)}</dd>
            </dl>
          ) : null}
          <p className="small">{LISA[lisa?.cluster]?.desc}</p>
          {nb.length > 0 && (
            <div className="tags">
              {nb.map((n) => (
                <button type="button" key={n.provinsi} className="tag-chip" onClick={() => setSelected(n.provinsi)}>
                  {n.nama}: {fmt(model.panel[n.provinsi]?.[model.lastYear]?.aps_16_18)}%
                </button>
              ))}
            </div>
          )}
          <p className="tiny muted">Tetangga adalah empat ibu kota provinsi terdekat (rata-rata {fmt(d.neighborKm[key], 0)} km).</p>
        </Panel>
      </section>

      <p className="tiny muted">
        Lembar ini disusun otomatis dari data BPS {model.years[0]}-{model.lastYear} dan model EduGap-XAI. Angka proyeksi, pola, dan SHAP menunjukkan asosiasi,
        bukan sebab-akibat, dan dimaksudkan untuk mendukung, bukan menggantikan, penilaian pemangku kebijakan.
      </p>
    </>
  );
}
