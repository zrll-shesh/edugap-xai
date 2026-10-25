'use client';
import { fmt, signed, textOn } from '@/lib/format';
import { BLOCKS, COLOR, LISA, featureBlock, featureLabel, typeMeta } from '@/lib/model';

export function PageHead({ title, children }) {
  return (
    <header className="page-head reveal">
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}

export function Panel({ title, lead, actions, children, field = false, id, className = '' }) {
  return (
    <section className={`panel${field ? ' field' : ''} ${className}`} id={id} aria-labelledby={id ? `${id}-h` : undefined}>
      {(title || actions) && (
        <div className="panel-head">
          <div>
            {title && <h2 id={id ? `${id}-h` : undefined} style={{ fontSize: '1.2rem' }}>{title}</h2>}
            {lead && <p className="lead">{lead}</p>}
          </div>
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Legend({ items, note }) {
  return (
    <div className="legend" aria-label="Keterangan warna">
      {items.map((it) => (
        <span className="sw" key={it.label}>
          <i className={it.hatch ? 'hatch' : ''} style={it.hatch ? undefined : { background: it.color }} />
          {it.label}
        </span>
      ))}
      {note && <span className="muted">{note}</span>}
    </div>
  );
}

export function TypeBadge({ type }) {
  const t = typeMeta(type);
  return <span className="badge" style={{ background: t.color, color: textOn(t.color) }}>{t.id}</span>;
}

export function LisaBadge({ cluster }) {
  const m = LISA[cluster] || LISA['Tidak signifikan'];
  return <span className="badge" style={{ background: m.color, color: textOn(m.color) }}>{m.short}</span>;
}

export function Signals({ row }) {
  const items = [
    ['Spasial', row.sinyal_spasial, BLOCKS['Spasial (Moran/LISA)'].color],
    ['Pola', row.sinyal_pola, BLOCKS['Pola (aturan asosiasi)'].color],
    ['Prediktif', row.sinyal_prediktif, COLOR.walnut],
  ];
  const on = items.filter((i) => i[1]).map((i) => i[0]);
  return (
    <span className="signals" title={on.length ? `Sinyal menyala: ${on.join(', ')}` : 'Tidak ada sinyal menyala'}
      aria-label={on.length ? `Sinyal menyala: ${on.join(', ')}` : 'Tidak ada sinyal menyala'}>
      {items.map(([label, value, color]) => <i key={label} style={{ background: value ? color : undefined }} />)}
    </span>
  );
}

export function SignalBar({ row }) {
  const parts = [
    [row.skor_spasial, BLOCKS['Spasial (Moran/LISA)'].color, 'Spasial'],
    [row.skor_pola, BLOCKS['Pola (aturan asosiasi)'].color, 'Pola'],
    [row.skor_prediktif, COLOR.walnut, 'Prediktif'],
  ];
  return (
    <div className="signal-bar" title={parts.map((p) => `${p[2]} ${fmt(p[0] * 100, 0)}`).join(', ')}>
      {parts.map(([v, color, label]) => v > 0 && <i key={label} style={{ width: `${(v / 3) * 100}%`, background: color }} />)}
    </div>
  );
}

export function SignalLegend() {
  return (
    <div className="legend">
      <span className="sw"><i style={{ background: BLOCKS['Spasial (Moran/LISA)'].color }} />Bukti spasial</span>
      <span className="sw"><i style={{ background: BLOCKS['Pola (aturan asosiasi)'].color }} />Bukti pola risiko</span>
      <span className="sw"><i style={{ background: COLOR.walnut }} />Bukti proyeksi</span>
    </div>
  );
}

export function Callout({ title, children, tone }) {
  return (
    <div className={`callout${tone === 'warn' ? ' warn' : ''}`}>
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </div>
  );
}

export function ProvincePicker({ model, value, onChange, label = 'Pilih provinsi', allowEmpty = false }) {
  return (
    <label className="stack" style={{ gap: 4 }}>
      <span className="label">{label}</span>
      <select className="picker" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        {allowEmpty && <option value="">Semua provinsi</option>}
        {model.provinces.map((p) => <option key={p.provinsi} value={p.provinsi}>{p.nama}</option>)}
      </select>
    </label>
  );
}

export function ChartTip({ active, payload, label, render }) {
  if (!active || !payload || !payload.length) return null;
  return <div className="chart-tip">{render ? render(payload, label) : payload.map((p) => <div key={p.dataKey}>{p.name}: <b>{fmt(p.value, 2)}</b></div>)}</div>;
}

export function Meter({ label, value, max, text }) {
  return (
    <div className="meter">
      <span className="muted">{label}</span>
      <div><i style={{ width: `${Math.max(2, Math.min(100, (value / max) * 100))}%` }} /></div>
      <b>{text}</b>
    </div>
  );
}

export function Waterfall({ contributions, base, total, limit = 8 }) {
  const sorted = [...contributions].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit).reduce((s, c) => s + c.value, 0);
  const rows = [...top];
  if (sorted.length > limit) rows.push({ key: 'rest', value: rest, label: 'Faktor lainnya' });
  let running = base;
  const steps = rows.map((r) => { const start = running; running += r.value; return { ...r, start, end: running }; });
  const points = [base, total, 0, ...steps.flatMap((s) => [s.start, s.end])];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pos = (v) => ((v - min) / span) * 100;
  return (
    <div className="wf" role="list">
      {steps.map((s) => (
        <div className="wf-row" key={s.key} role="listitem">
          <span>{s.label || featureLabel(s.key)}</span>
          <div className="wf-track">
            <span className="zero" style={{ left: `${pos(0)}%` }} />
            <i style={{
              left: `${pos(Math.min(s.start, s.end))}%`,
              width: `${Math.max(0.8, Math.abs(pos(s.end) - pos(s.start)))}%`,
              background: s.value < 0 ? COLOR.wine : COLOR.sage,
            }} />
          </div>
          <b className={s.value < 0 ? 'neg' : 'pos'}>{signed(s.value, 2)}</b>
        </div>
      ))}
      <p className="tiny muted">
        Garis tegak adalah nol. Proyeksi dimulai dari nilai dasar model {signed(base, 2)} poin (rata-rata perubahan semua provinsi),
        lalu setiap faktor menambah atau mengurangi hingga hasil akhir {signed(total, 2)} poin.
      </p>
    </div>
  );
}

export function BlockDot({ feature }) {
  const b = BLOCKS[featureBlock(feature)];
  return <span className="dot" style={{ background: b.color }} />;
}
