# Helpers SVG — dona y gauge (JS vanilla, CSP-safe)

Funciones listas para copiar dentro del `<script>` inline del dashboard (ver el
esqueleto completo en `layout.md`). Ambas devuelven un string SVG/HTML; no dependen
de ninguna libreria.

```js
const C={ok:'#1a7f4b',warn:'#b26a00',fail:'#c0392b',info:'#2c5aa0',muted:'#5b6470'};
const SEV={CRITICO:'#c0392b',ALTO:'#e06c1f',MEDIO:'#b26a00',BAJO:'#2c5aa0',SUGERENCIA:'#5b6470'};
const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

// Dona: data = [{label,value,color}]
function donut(data,size=160){
  const tot=data.reduce((s,d)=>s+d.value,0)||1, r=size/2, ir=r*0.6; let a=-Math.PI/2, seg='';
  for(const d of data){ if(d.value<=0) continue; const a2=a+2*Math.PI*d.value/tot;
    const x1=r+r*Math.cos(a),y1=r+r*Math.sin(a),x2=r+r*Math.cos(a2),y2=r+r*Math.sin(a2);
    const xi1=r+ir*Math.cos(a2),yi1=r+ir*Math.sin(a2),xi2=r+ir*Math.cos(a),yi2=r+ir*Math.sin(a);
    const big=(a2-a)>Math.PI?1:0;
    seg+=`<path d="M${x1} ${y1} A${r} ${r} 0 ${big} 1 ${x2} ${y2} L${xi1} ${yi1} A${ir} ${ir} 0 ${big} 0 ${xi2} ${yi2} Z" fill="${d.color}"></path>`; a=a2; }
  const leg=data.map(d=>`<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin:2px 0"><span style="width:10px;height:10px;background:${d.color};border-radius:2px;display:inline-block"></span>${esc(d.label)}: <b>${d.value}</b></div>`).join('');
  return `<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${seg}<text x="${r}" y="${r+5}" text-anchor="middle" font-size="20" font-weight="700">${tot}</text></svg><div>${leg}</div></div>`;
}

// Gauge semicircular: val vs umbral. higherIsBetter=true (cobertura) o false (duplicacion)
function gauge(val,threshold,higherIsBetter,unit='%'){
  if(val==null) return '<p style="color:#5b6470">Sin dato</p>';
  const w=200,h=120,r=80,cx=w/2,cy=h; const pct=Math.max(0,Math.min(100,val));
  const ok=higherIsBetter?val>=threshold:val<=threshold; const col=ok?C.ok:C.fail;
  const a=Math.PI*(1-pct/100); const x=cx+r*Math.cos(a),y=cy-r*Math.sin(a);
  const tA=Math.PI*(1-threshold/100),tx=cx+r*Math.cos(tA),ty=cy-r*Math.sin(tA);
  return `<svg width="${w}" height="${h+30}" viewBox="0 0 ${w} ${h+30}">
    <path d="M${cx-r} ${cy} A${r} ${r} 0 0 1 ${cx+r} ${cy}" fill="none" stroke="#e3e6ea" stroke-width="14"/>
    <path d="M${cx-r} ${cy} A${r} ${r} 0 0 1 ${x} ${y}" fill="none" stroke="${col}" stroke-width="14"/>
    <line x1="${tx}" y1="${ty}" x2="${cx+(r-16)*Math.cos(tA)}" y2="${cy-(r-16)*Math.sin(tA)}" stroke="#1c2024" stroke-width="2"/>
    <text x="${cx}" y="${cy-10}" text-anchor="middle" font-size="26" font-weight="700" fill="${col}">${val}${unit}</text>
    <text x="${cx}" y="${h+22}" text-anchor="middle" font-size="12" fill="#5b6470">umbral ${threshold}${unit} ${ok?'✓':'✗'}</text>
  </svg>`;
}
```

## Notas de uso

- `donut(data)` — pensado para distribuciones por categoria (p. ej. hallazgos por
  severidad). Cada entrada `{label, value, color}`; usa la paleta `SEV` de
  `SKILL.md` para mantener el semaforo consistente.
- `gauge(val, threshold, higherIsBetter, unit)` — pensado para una metrica contra un
  umbral (cobertura, duplicacion). `higherIsBetter=true` pinta verde cuando
  `val >= threshold` (cobertura); `false` cuando `val <= threshold` (duplicacion).
- Si necesitas una barra horizontal/vertical simple (no incluida en el esqueleto
  base), sigue el mismo patron: un `<svg>` con `<rect>`/`<path>` calculados desde
  `DATA`, sin libreria externa, reusando `esc()` para escapar texto.
- Ambas funciones asumen que `C` y `SEV` (definidos arriba) ya existen en el
  `<script>` — van una sola vez por archivo, junto al resto del render (ver
  `layout.md`).
