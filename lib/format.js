const nf = new Map();

function formatter(digits) {
  if (!nf.has(digits)) {
    nf.set(digits, new Intl.NumberFormat('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  }
  return nf.get(digits);
}

export function fmt(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '–';
  return formatter(digits).format(Number(value));
}

export function signed(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '–';
  const v = Number(value);
  if (Math.abs(v) < 0.5 * 10 ** -digits) return fmt(0, digits);
  return `${v > 0 ? '+' : '−'}${fmt(Math.abs(v), digits)}`;
}

export function pct(value, digits = 0) {
  if (value === null || value === undefined) return '–';
  return `${fmt(Number(value) * 100, digits)}%`;
}

export function pval(p) {
  if (p === null || p === undefined) return '–';
  if (p < 0.001) return '< 0,001';
  return fmt(p, 3);
}

export function listJoin(items) {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} dan ${items[items.length - 1]}`;
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export function mix(a, b, t) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return `rgb(${c.join(',')})`;
}

export function textOn(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#2b231d' : '#ffffff';
}
