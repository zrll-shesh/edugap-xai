'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { geoArea, geoMercator, geoPath } from 'd3-geo';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { COLOR } from '@/lib/model';

const W = 1000;
const H = 420;

function rewind(feature) {
  const fixPolygon = (rings) => {
    const poly = { type: 'Polygon', coordinates: rings };
    return geoArea(poly) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings;
  };
  const g = feature.geometry;
  const geometry = g.type === 'Polygon'
    ? { type: 'Polygon', coordinates: fixPolygon(g.coordinates) }
    : { type: 'MultiPolygon', coordinates: g.coordinates.map(fixPolygon) };
  return { ...feature, geometry };
}

export default function ChoroplethMap({
  geo, fill, tooltip, selected, onSelect, hatched = () => false, regions, regionOf, ariaLabel = 'Peta provinsi Indonesia',
}) {
  const wrapRef = useRef(null);
  const drag = useRef(null);
  const [view, setView] = useState([0, 0, W, H]);
  const [hover, setHover] = useState(null);
  const [region, setRegion] = useState('Semua');

  const shapes = useMemo(() => {
    const features = geo.features.map(rewind);
    const projection = geoMercator().fitExtent([[12, 12], [W - 12, H - 12]], { type: 'FeatureCollection', features });
    const path = geoPath(projection);
    return features.map((f) => ({ key: f.properties.provinsi, d: path(f), bounds: path.bounds(f), centroid: path.centroid(f) }));
  }, [geo]);

  useEffect(() => { setHover(null); }, [fill]);

  const fitTo = (bounds) => {
    const [[x0, y0], [x1, y1]] = bounds;
    const pad = 24;
    let w = x1 - x0 + pad * 2;
    let h = y1 - y0 + pad * 2;
    const ratio = W / H;
    if (w / h > ratio) h = w / ratio; else w = h * ratio;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    setView([cx - w / 2, cy - h / 2, w, h]);
  };

  const focusRegion = (name) => {
    setRegion(name);
    if (name === 'Semua') { setView([0, 0, W, H]); return; }
    const inRegion = shapes.filter((s) => regionOf(s.key) === name);
    const x0 = Math.min(...inRegion.map((s) => s.bounds[0][0]));
    const y0 = Math.min(...inRegion.map((s) => s.bounds[0][1]));
    const x1 = Math.max(...inRegion.map((s) => s.bounds[1][0]));
    const y1 = Math.max(...inRegion.map((s) => s.bounds[1][1]));
    fitTo([[x0, y0], [x1, y1]]);
  };

  const zoom = (factor) => {
    setView(([x, y, w, h]) => {
      const nw = Math.min(W, Math.max(W / 8, w * factor));
      const nh = nw * (H / W);
      const cx = x + w / 2;
      const cy = y + h / 2;
      return [cx - nw / 2, cy - nh / 2, nw, nh];
    });
  };

  const toLocal = (event) => {
    const rect = wrapRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, width: rect.width };
  };

  const onPointerDown = (event) => {
    drag.current = { x: event.clientX, y: event.clientY, view, moved: false, id: event.pointerId };
  };
  const onPointerMove = (event) => {
    if (drag.current && event.buttons) {
      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) {
        drag.current.moved = true;
        const rect = wrapRef.current.getBoundingClientRect();
        const [x, y, w, h] = drag.current.view;
        const scale = w / rect.width;
        setView([x - dx * scale, y - dy * scale, w, h]);
        setHover(null);
      }
    }
  };
  const onPointerUp = () => { setTimeout(() => { drag.current = null; }, 0); };

  const hoverAt = (key, event) => {
    if (event.pointerType === 'touch') return;
    if (drag.current?.moved) return;
    setHover({ key, ...toLocal(event) });
  };

  const select = (key) => {
    if (drag.current?.moved) return;
    onSelect?.(key);
  };

  const tipStyle = hover ? {
    left: Math.max(8, Math.min(hover.x + 14, (hover.width || 0) - 250)),
    top: hover.y + 14,
  } : null;

  const sorted = useMemo(() => {
    const rest = shapes.filter((s) => s.key !== selected);
    const sel = shapes.filter((s) => s.key === selected);
    return [...rest, ...sel];
  }, [shapes, selected]);

  return (
    <div className="stack" style={{ gap: 10 }}>
      {regions && (
        <div className="map-regions" role="group" aria-label="Fokus wilayah">
          {['Semua', ...regions].map((r) => (
            <button key={r} type="button" className={`chip${region === r ? ' on' : ''}`} onClick={() => focusRegion(r)}>{r}</button>
          ))}
        </div>
      )}
      <div className="map-wrap" ref={wrapRef} style={{ background: COLOR.sea }}>
        <svg
          viewBox={view.join(' ')}
          role="img"
          aria-label={ariaLabel}
          className={drag.current?.moved ? 'dragging' : ''}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => { setHover(null); }}
          onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoom(e.deltaY > 0 ? 1.15 : 0.87); } }}
        >
          <defs>
            <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="transparent" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeWidth="2.2" />
            </pattern>
          </defs>
          {sorted.map((s) => {
            const isSel = s.key === selected;
            const isHover = hover?.key === s.key;
            return (
              <g key={s.key}>
                <path
                  className="prov"
                  d={s.d}
                  fill={fill(s.key) || '#ddd'}
                  stroke={isSel ? COLOR.ink : isHover ? COLOR.espresso : '#ffffff'}
                  strokeWidth={isSel ? 2.4 : isHover ? 1.6 : 0.7}
                  vectorEffect="non-scaling-stroke"
                  tabIndex={0}
                  role="button"
                  aria-label={tooltip(s.key, false)}
                  onPointerMove={(e) => hoverAt(s.key, e)}
                  onClick={() => select(s.key)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(s.key); } }}
                  onFocus={() => {
                    const rect = wrapRef.current.getBoundingClientRect();
                    const [x, y, w] = view;
                    const k = rect.width / w;
                    setHover({ key: s.key, x: (s.centroid[0] - x) * k, y: (s.centroid[1] - y) * k, width: rect.width });
                  }}
                  onBlur={() => setHover(null)}
                />
                {hatched(s.key) && <path d={s.d} fill="url(#hatch)" pointerEvents="none" />}
              </g>
            );
          })}
        </svg>
        <div className="map-tools">
          <button type="button" onClick={() => zoom(0.7)} aria-label="Perbesar peta"><Plus size={16} /></button>
          <button type="button" onClick={() => zoom(1.4)} aria-label="Perkecil peta"><Minus size={16} /></button>
          <button type="button" onClick={() => focusRegion('Semua')} aria-label="Kembalikan tampilan peta"><RotateCcw size={15} /></button>
        </div>
        {hover && (
          <div className="map-tip" style={tipStyle} role="status">
            {tooltip(hover.key, true)}
          </div>
        )}
      </div>
    </div>
  );
}
