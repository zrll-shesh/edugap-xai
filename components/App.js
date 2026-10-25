'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Flag, House, Lightbulb, Map, MapPin, Menu, Shapes, TrendingUp, X } from 'lucide-react';
import { buildModel } from '@/lib/model';
import Home from './views/Home';
import Spatial from './views/Spatial';
import Patterns from './views/Patterns';
import Forecast from './views/Forecast';
import Explain from './views/Explain';
import Priority from './views/Priority';
import Province from './views/Province';
import Method from './views/Method';

export const NAV = [
  { id: 'ringkasan', label: 'Ringkasan', icon: House },
  { id: 'peta', label: 'Peta dan klaster spasial', icon: Map },
  { id: 'pola', label: 'Pola risiko', icon: Shapes },
  { id: 'proyeksi', label: 'Proyeksi 2026-2027', icon: TrendingUp },
  { id: 'penjelasan', label: 'Faktor pendorong', icon: Lightbulb },
  { id: 'prioritas', label: 'Prioritas intervensi', icon: Flag },
  { id: 'provinsi', label: 'Lembar ringkas provinsi', icon: MapPin },
  { id: 'metode', label: 'Metode dan data', icon: BookOpen },
];

const VIEWS = { ringkasan: Home, peta: Spatial, pola: Patterns, proyeksi: Forecast, penjelasan: Explain, prioritas: Priority, provinsi: Province, metode: Method };

function readHash() {
  if (typeof window === 'undefined') return { section: 'ringkasan', prov: null };
  const parts = window.location.hash.replace(/^#\/?/, '').split('/');
  const section = VIEWS[parts[0]] ? parts[0] : 'ringkasan';
  return { section, prov: parts[1] ? decodeURIComponent(parts[1]) : null };
}

export default function App() {
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState({ section: 'ringkasan', prov: null });
  const [selected, setSelected] = useState(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    Promise.all(['/data/edugap.json', '/data/indonesia_provinces.geojson', '/data/manifest.json'].map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(url);
      return res.json();
    }))
      .then(([data, geo, manifest]) => setRaw({ data, geo, manifest }))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const apply = () => {
      const r = readHash();
      setRoute(r);
      if (r.prov) setSelected(r.prov);
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  const model = useMemo(() => (raw ? buildModel(raw.data) : null), [raw]);

  const go = useCallback((section, prov) => {
    const target = prov || (section === 'provinsi' ? selected : null);
    if (prov) setSelected(prov);
    window.location.hash = `/${section}${target ? `/${encodeURIComponent(target)}` : ''}`;
    setMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selected]);

  const choose = useCallback((prov) => {
    setSelected(prov);
    if (route.section === 'provinsi' && prov) window.history.replaceState(null, '', `#/provinsi/${encodeURIComponent(prov)}`);
  }, [route.section]);

  if (error) {
    return (
      <div className="loading">
        <div className="brand-name">Edu<span>Gap</span>-XAI</div>
        <h2>Data dashboard tidak ditemukan</h2>
        <p className="muted">Berkas {error} gagal dimuat. Jalankan <code>npm run data -- path/ke/EduGap_XAI_outputs.zip</code>, lalu muat ulang halaman.</p>
      </div>
    );
  }
  if (!model) {
    return (
      <div className="loading">
        <div className="brand-name">Edu<span>Gap</span>-XAI</div>
        <p className="muted">Menyiapkan peta 38 provinsi dan hasil analisis...</p>
      </div>
    );
  }

  const View = VIEWS[route.section];
  const sel = selected && model.byKey[selected] ? selected : null;

  return (
    <div className="app">
      <a className="skip" href="#isi">Lewati ke isi halaman</a>
      {menu && <button type="button" className="scrim" aria-label="Tutup menu" onClick={() => setMenu(false)} />}
      <aside className={`sidebar${menu ? ' open' : ''}`} aria-label="Navigasi utama">
        <div className="brand">
          <div className="brand-name">Edu<span>Gap</span>-XAI</div>
          <div className="brand-sub">Sistem pendukung keputusan untuk pemerataan partisipasi sekolah menengah antarprovinsi</div>
        </div>
        <nav>
          <ul className="nav-list">
            {NAV.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button type="button" className={`nav${route.section === id ? ' active' : ''}`}
                  aria-current={route.section === id ? 'page' : undefined} onClick={() => go(id)}>
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="side-note">
          <strong>Data BPS {model.years[0]}-{model.lastYear}</strong>
          {model.provinces.length} provinsi, proyeksi sampai {model.forecastYears[1]}. DIMAS-TI AMLI 2026, Divisi Penambangan Data.
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <div className="brand-name">Edu<span>Gap</span>-XAI</div>
          <button type="button" className="menu-btn" onClick={() => setMenu(!menu)} aria-label={menu ? 'Tutup menu' : 'Buka menu'} aria-expanded={menu}>
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <main className="content" id="isi" key={route.section}>
          <View model={model} geo={raw.geo} manifest={raw.manifest} go={go} selected={sel} setSelected={choose} />
        </main>
        <footer className="site-foot">
          <span>EduGap-XAI untuk DIMAS-TI AMLI 2026, Divisi Penambangan Data.</span>
          <span>Sumber data: Badan Pusat Statistik, {model.years[0]}-{model.lastYear}. Analisis menunjukkan asosiasi, bukan sebab-akibat.</span>
        </footer>
      </div>
    </div>
  );
}
