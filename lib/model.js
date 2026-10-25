import { fmt, listJoin, pct } from './format';

export const COLOR = {
  paper: '#ffffff', linen: '#f7f1e9', sand: '#ece1d2', line: '#e6d9c8', tan: '#c9a47e', walnut: '#7a5233',
  espresso: '#4a3222', ink: '#2b231d', muted: '#7c6f64', wine: '#8c2f39', sage: '#3f6f5e', ochre: '#b98236',
  sea: '#eef2f3',
};

export const APS_CLASSES = [
  { max: 60, color: '#4a2a1a', label: 'di bawah 60' },
  { max: 70, color: '#7a5233', label: '60 sampai 70' },
  { max: 75, color: '#a77b55', label: '70 sampai 75' },
  { max: 80, color: '#cfae8a', label: '75 sampai 80' },
  { max: 85, color: '#e6d3bb', label: '80 sampai 85' },
  { max: Infinity, color: '#f6eee3', label: '85 ke atas' },
];

export const CHANGE_CLASSES = [
  { max: -2, color: '#8c2f39', label: 'turun lebih dari 2' },
  { max: -0.5, color: '#d29a95', label: 'turun 0,5 sampai 2' },
  { max: 0.5, color: '#f1ebe4', label: 'hampir tetap' },
  { max: 2, color: '#a8c8bb', label: 'naik 0,5 sampai 2' },
  { max: 4, color: '#5f9783', label: 'naik 2 sampai 4' },
  { max: Infinity, color: '#2f5a4b', label: 'naik lebih dari 4' },
];

export const IPI_CLASSES = [
  { max: 20, color: '#f1e8dc', label: '0 sampai 20' },
  { max: 40, color: '#dcc3a3', label: '20 sampai 40' },
  { max: 60, color: '#b88c63', label: '40 sampai 60' },
  { max: 80, color: '#8a5a37', label: '60 sampai 80' },
  { max: Infinity, color: '#4a2a1a', label: '80 ke atas' },
];

export function classify(value, classes) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return classes.find((c) => value < c.max) || classes[classes.length - 1];
}

export const LISA = {
  LL: { color: '#8c2f39', label: 'Rendah dikelilingi rendah', short: 'Kantong rendah (LL)',
    desc: 'APS provinsi ini di bawah rata-rata dan tetangganya juga rendah. Inilah kantong ketertinggalan.' },
  HH: { color: '#3f6f5e', label: 'Tinggi dikelilingi tinggi', short: 'Kantong tinggi (HH)',
    desc: 'APS provinsi ini di atas rata-rata dan tetangganya juga tinggi.' },
  LH: { color: '#d9a3a0', label: 'Rendah di tengah tetangga tinggi', short: 'Tertinggal sendiri (LH)',
    desc: 'APS provinsi ini rendah padahal tetangganya tinggi. Masalahnya cenderung lokal.' },
  HL: { color: '#a9c9ba', label: 'Tinggi di tengah tetangga rendah', short: 'Unggul sendiri (HL)',
    desc: 'APS provinsi ini tinggi padahal tetangganya rendah. Bisa menjadi contoh bagi sekitarnya.' },
  'Tidak signifikan': { color: '#ece4da', label: 'Tidak membentuk klaster', short: 'Tidak signifikan',
    desc: 'Nilai provinsi ini tidak berbeda nyata dari pola acak terhadap tetangganya.' },
};

export const TYPES = [
  { id: 'Terjebak Struktural', color: '#6b1f2a',
    desc: 'Ketiga bukti menyala: lingkungan sekitarnya tertinggal, kondisinya cocok dengan pola risiko, dan proyeksinya termasuk terendah.' },
  { id: 'Risiko Tinggi Terkonfirmasi', color: '#a8443f',
    desc: 'Proyeksinya termasuk terendah dan dikonfirmasi oleh satu bukti lain, spasial atau pola.' },
  { id: 'Waspada Prediktif', color: '#c08a3e',
    desc: 'Hanya model proyeksi yang menandai. Perlu dipantau sebelum menjadi masalah nyata.' },
  { id: 'Terseret Lingkungan', color: '#55708a',
    desc: 'Dikelilingi provinsi tertinggal walaupun kondisi internalnya cukup baik.' },
  { id: 'Kerentanan Internal', color: '#8a7a4e',
    desc: 'Kondisinya cocok dengan pola risiko, tetapi APS-nya belum jatuh. Kandidat pencegahan.' },
  { id: 'Rawan Merosot', color: '#c9ab78',
    desc: 'Tidak ditandai bukti lain, tetapi diproyeksikan turun dalam satu atau dua tahun.' },
  { id: 'Relatif Aman', color: '#e4d9cb', desc: 'Tidak ada sinyal risiko yang menyala.' },
];
export const typeMeta = (id) => TYPES.find((t) => t.id === id) || TYPES[TYPES.length - 1];

export const BLOCKS = {
  'Sosial-ekonomi & pendidikan': { label: 'Kondisi sosial-ekonomi dan pendidikan', color: '#7a5233' },
  'Spasial (Moran/LISA)': { label: 'Konteks spasial dari Moran dan LISA', color: '#3f6f5e' },
  'Pola (aturan asosiasi)': { label: 'Pola risiko dari aturan asosiasi', color: '#c08a3e' },
};

export const FEATURE = {
  aps_16_18: { label: 'APS 16-18 tahun ini', block: 'Sosial-ekonomi & pendidikan' },
  aps_13_15: { label: 'APS 13-15 (calon siswa SMA)', block: 'Sosial-ekonomi & pendidikan' },
  miskin: { label: 'Penduduk miskin', block: 'Sosial-ekonomi & pendidikan', unit: '%' },
  listrik: { label: 'Rumah tangga berlistrik', block: 'Sosial-ekonomi & pendidikan', unit: '%' },
  air_minum_layak: { label: 'Akses air minum layak', block: 'Sosial-ekonomi & pendidikan', unit: '%' },
  log_pdrb_kapita: { label: 'PDRB per kapita', block: 'Sosial-ekonomi & pendidikan' },
  tpt: { label: 'Pengangguran terbuka', block: 'Sosial-ekonomi & pendidikan', unit: '%' },
  tpak: { label: 'Partisipasi angkatan kerja', block: 'Sosial-ekonomi & pendidikan', unit: '%' },
  ikp: { label: 'Indeks ketahanan pangan', block: 'Sosial-ekonomi & pendidikan' },
  rls: { label: 'Rata-rata lama sekolah dewasa', block: 'Sosial-ekonomi & pendidikan', unit: ' th' },
  pou: { label: 'Prevalensi kurang gizi', block: 'Sosial-ekonomi & pendidikan', unit: '%' },
  log_pengeluaran_makanan: { label: 'Pengeluaran makanan per kapita', block: 'Sosial-ekonomi & pendidikan' },
  w_aps_16_18: { label: 'APS provinsi tetangga', block: 'Spasial (Moran/LISA)' },
  w_miskin: { label: 'Kemiskinan provinsi tetangga', block: 'Spasial (Moran/LISA)' },
  regime_ll: { label: 'Berada di kuadran LL', block: 'Spasial (Moran/LISA)' },
  rule_count: { label: 'Jumlah pola risiko terpenuhi', block: 'Pola (aturan asosiasi)' },
  rule_max_conf: { label: 'Kekuatan pola risiko', block: 'Pola (aturan asosiasi)' },
};
const LABEL_TO_KEY = {
  'APS 16-18 (%)': 'aps_16_18', 'APS 13-15 (%)': 'aps_13_15', 'Penduduk Miskin (%)': 'miskin',
  'Rumah Tangga Berlistrik (%)': 'listrik', 'Air Minum Layak (%)': 'air_minum_layak', 'log PDRB per Kapita': 'log_pdrb_kapita',
  'Pengangguran Terbuka (%)': 'tpt', 'TPAK (%)': 'tpak', 'Indeks Ketahanan Pangan': 'ikp',
  'Rata-rata Lama Sekolah (th)': 'rls', 'Prevalensi Kurang Gizi (%)': 'pou', 'log Pengeluaran Makanan': 'log_pengeluaran_makanan',
  'Spatial Lag APS 16-18': 'w_aps_16_18', 'Spatial Lag Kemiskinan': 'w_miskin', 'Regime Spasial LL': 'regime_ll',
  'Jumlah Aturan Risiko Terpenuhi': 'rule_count', 'Confidence Maks Aturan Risiko': 'rule_max_conf',
};
export const featureKey = (labelOrKey) => (FEATURE[labelOrKey] ? labelOrKey : LABEL_TO_KEY[labelOrKey] || labelOrKey);
export const featureLabel = (labelOrKey) => FEATURE[featureKey(labelOrKey)]?.label || labelOrKey;
export const featureBlock = (labelOrKey) => FEATURE[featureKey(labelOrKey)]?.block || 'Sosial-ekonomi & pendidikan';

const ITEM = {
  AirMinum: 'akses air minum layak', RLS: 'rata-rata lama sekolah penduduk dewasa', Listrik: 'rumah tangga berlistrik',
  Pengangguran: 'pengangguran terbuka', Kemiskinan: 'persentase penduduk miskin', KetahananPangan: 'indeks ketahanan pangan',
  KurangGizi: 'prevalensi kurang gizi', PDRBkap: 'PDRB per kapita', TPAK: 'partisipasi angkatan kerja',
  PengeluaranMakanan: 'pengeluaran makanan per kapita', LingkunganAPS: 'APS 16-18 provinsi tetangga',
  LingkunganMiskin: 'kemiskinan provinsi tetangga',
};
const LEVEL = { Rendah: 'rendah', Sedang: 'menengah', Tinggi: 'tinggi' };
export const isSpatialItem = (item) => item.startsWith('Lingkungan');

export const COUNTERINTUITIVE = {
  'KetahananPangan=Tinggi': 'Ketahanan pangan tinggi biasanya dianggap baik. Dugaan kami, pola ini menangkap provinsi lumbung pangan yang ekonominya bertumpu pada pertanian, tempat remaja usia SMA lebih mudah terserap membantu usaha tani keluarga daripada melanjutkan sekolah.',
  'Kemiskinan=Rendah': 'Kemiskinan rendah tidak otomatis berarti akses sekolah baik. Dugaan kami, provinsi ini relatif makmur dari sektor perkebunan atau tambang, tetapi layanan dasar dan sekolah menengahnya belum menjangkau permukiman yang tersebar.',
  'LingkunganMiskin=Rendah': 'Tetangga yang relatif makmur ternyata tidak cukup. Dugaan kami, ketertinggalan provinsi ini bersifat lokal: akses air minum layak yang rendah menandai layanan dasar yang belum merata di dalam provinsi itu sendiri.',
  'PDRBkap=Tinggi': 'PDRB per kapita tinggi tidak selalu dinikmati merata. Dugaan kami, pendapatan daerah berasal dari sektor padat modal yang tidak banyak mengangkat layanan pendidikan.',
  'PengeluaranMakanan=Tinggi': 'Pengeluaran makanan tinggi bisa mencerminkan harga pangan yang mahal di daerah terpencil, bukan kesejahteraan.',
  'KurangGizi=Rendah': 'Prevalensi kurang gizi yang rendah biasanya dianggap baik, sehingga pola ini kemungkinan didorong oleh kondisi lain dalam aturan yang sama.',
  'Listrik=Tinggi': 'Elektrifikasi tinggi biasanya dianggap baik, sehingga pola ini kemungkinan didorong oleh kondisi lain dalam aturan yang sama.',
  'RLS=Tinggi': 'Rata-rata lama sekolah dewasa yang tinggi biasanya berjalan bersama partisipasi sekolah yang baik, sehingga pola ini perlu diperiksa per provinsi.',
};
export function itemPhrase(item) {
  const [name, level] = item.split('=');
  return `${ITEM[name] || name} ${LEVEL[level] || level}`;
}
export function itemShort(item) {
  const [name, level] = item.split('=');
  const base = ITEM[name] || name;
  return `${base.charAt(0).toUpperCase()}${base.slice(1)} ${LEVEL[level] || level}`;
}

export const STAGE_TITLE = {
  '01_eda_raw': 'Data mentah', '02_eda_clean': 'Data bersih', '03_spatial': 'Analisis spasial', '04_pattern': 'Pola risiko',
  '05_forecast': 'Proyeksi', '06_xai': 'Penjelasan model', '07_triangulation': 'Triangulasi',
};
export const prettyFile = (path) => path.split('/').pop().replace(/\.(png|csv)$/, '').replace(/_/g, ' ');

const REGION_ORDER = ['Sumatera', 'Jawa', 'Bali-Nusa Tenggara', 'Kalimantan', 'Sulawesi', 'Maluku-Papua'];

export function buildModel(d) {
  const provinces = [...d.provinces].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  const byKey = Object.fromEntries(provinces.map((p) => [p.provinsi, p]));
  const byCode = Object.fromEntries(provinces.map((p) => [p.kode, p]));
  const name = (key) => byKey[key]?.nama || key;
  const regions = REGION_ORDER.filter((r) => provinces.some((p) => p.wilayah === r));

  const years = d.meta.tahun;
  const lastYear = years[years.length - 1];
  const forecastYears = [lastYear + 1, lastYear + 2];
  const allYears = [...years, ...forecastYears];

  const panel = {};
  d.panel.forEach((r) => { (panel[r.provinsi] ||= {})[r.tahun] = r; });
  const fc = Object.fromEntries(d.forecast.proyeksi.map((r) => [r.provinsi, r]));
  const tri = Object.fromEntries(d.tri.rows.map((r) => [r.provinsi, r]));
  const triRows = [...d.tri.rows].sort((a, b) => a.peringkat_prioritas - b.peringkat_prioritas);
  const lisa = {};
  d.lisa.forEach((r) => { (lisa[r.tahun] ||= {})[r.provinsi] = r; });
  const bv = Object.fromEntries(d.bvLisa.map((r) => [r.provinsi, r]));
  const shapLocal = Object.fromEntries(d.shap.lokal_2026.map((r) => [r.provinsi, r]));

  function apsAt(key, year) {
    if (year <= lastYear) {
      const row = panel[key]?.[year];
      if (row) return { value: row.aps_16_18, kind: 'aktual' };
      const parent = byKey[key]?.induk;
      if (parent && panel[parent]?.[year]) return { value: panel[parent][year].aps_16_18, kind: 'induk', parent };
      return null;
    }
    const f = fc[key];
    if (!f) return null;
    return { value: f[`aps_${year}_pred`], kind: 'proyeksi', lo: f[`bawah_${year}`], hi: f[`atas_${year}`] };
  }

  const nationalMean = {};
  allYears.forEach((year) => {
    const values = provinces.map((p) => apsAt(p.provinsi, year)).filter((v) => v && v.kind !== 'induk').map((v) => v.value);
    nationalMean[year] = values.reduce((s, v) => s + v, 0) / values.length;
  });

  const latestValues = provinces.map((p) => ({ key: p.provinsi, v: panel[p.provinsi][lastYear].aps_16_18 }))
    .sort((a, b) => a.v - b.v);
  const rankLow = Object.fromEntries(latestValues.map((x, i) => [x.key, i + 1]));

  function history(key) {
    const rows = allYears.map((year) => {
      const a = apsAt(key, year);
      const row = { tahun: year, nasional: nationalMean[year] };
      if (!a) return row;
      if (a.kind === 'proyeksi') {
        row.proyeksi = a.value;
        row.band = [a.lo, a.hi];
      } else if (a.kind === 'aktual') {
        row.aktual = a.value;
      } else {
        row.induk = a.value;
      }
      return row;
    });
    const last = rows.find((r) => r.tahun === lastYear);
    if (last && last.aktual !== undefined) {
      last.proyeksi = last.aktual;
      last.band = [last.aktual, last.aktual];
    }
    return rows;
  }

  const rules = d.rules.aturan.map((r) => {
    const conds = r.antecedent.map(itemPhrase);
    const rows = d.rules.keanggotaan.filter((x) => x[r.rule_id] === 1);
    const counts = {};
    rows.forEach((x) => { counts[x.provinsi] = (counts[x.provinsi] || 0) + 1; });
    const drivers = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([key, n]) => ({ key, n }));
    const regionCount = {};
    rows.forEach((x) => { const w = byKey[x.provinsi]?.wilayah; regionCount[w] = (regionCount[w] || 0) + 1; });
    const topRegion = Object.entries(regionCount).sort((a, b) => b[1] - a[1])[0];
    const odd = r.antecedent.filter((i) => COUNTERINTUITIVE[i]);
    return {
      ...r,
      drivers,
      nCases: rows.length,
      nLow: rows.filter((x) => x.aps_rendah === 1).length,
      topRegion: topRegion ? { name: topRegion[0], share: topRegion[1] / rows.length } : null,
      odd,
      conds,
      spatial: r.antecedent.some(isSpatialItem),
      sentence: `Jika ${listJoin(conds)}, maka ${pct(r.confidence)} provinsi-tahun seperti itu berada di kelompok APS 16-18 rendah, ${fmt(r.lift, 1)} kali lebih sering daripada rata-rata.`,
    };
  });
  const matched = {};
  const lowFlag = {};
  d.rules.keanggotaan.filter((r) => r.tahun === lastYear).forEach((r) => {
    matched[r.provinsi] = rules.filter((rule) => r[rule.rule_id] === 1).map((rule) => rule.rule_id);
    lowFlag[r.provinsi] = r.aps_rendah === 1;
  });
  const itemCount = {};
  rules.forEach((r) => r.antecedent.forEach((i) => { itemCount[i] = (itemCount[i] || 0) + 1; }));
  const topItem = Object.entries(itemCount).sort((a, b) => b[1] - a[1])[0];

  const neighbors = (key) => (d.neighbors[key] || '').split(',').map((s) => s.trim()).filter(Boolean)
    .map((code) => byCode[code]).filter(Boolean);

  const median = (arr) => { const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const indicatorMedian = {};
  ['miskin', 'listrik', 'air_minum_layak', 'rls', 'pdrb_kapita', 'ikp', 'pou', 'tpt', 'aps_13_15', 'aps_16_18'].forEach((c) => {
    indicatorMedian[c] = median(provinces.map((p) => panel[p.provinsi][lastYear][c]));
  });

  return {
    data: d, provinces, byKey, byCode, name, regions, years, lastYear, forecastYears, allYears,
    panel, fc, tri, triRows, lisa, bv, shapLocal, apsAt, nationalMean, rankLow, history,
    rules, matched, lowFlag, itemCount, topItem, neighbors, indicatorMedian,
  };
}
