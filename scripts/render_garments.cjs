/**
 * Genera las imágenes de producto a partir de los modelos 3D (con `npm run dev` corriendo en :5173).
 * Uso: node scripts/render_garments.cjs <carpeta de salida> [url extra de prueba...]
 * Después: python3 scripts/trim_garments.py <carpeta> public/media/garments
 */
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2];
const base = process.env.RENDER_BASE || 'http://localhost:5173/tools/render-garments.html';
const COLORS = {
  tee: { 'off-white': '#ece6da', negro: '#1b1a18', piedra: '#9b958a' },
  hoodie: { verde: '#2f3a30', negro: '#1b1a18', piedra: '#9b958a' },
};
const SIZES = { tee: 'w=1200&h=1400', hoodie: 'w=1700&h=1200' };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1800, height: 1500 } });
  p.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
  const jobs = [];
  const extra = process.argv.slice(3);
  if (extra.length) extra.forEach((qs, i) => jobs.push({ file: `test-${i}`, qs }));
  else
    for (const [model, colors] of Object.entries(COLORS))
      for (const [id, hex] of Object.entries(colors)) {
        const qs = `model=${model}&color=${encodeURIComponent(hex)}&${SIZES[model]}`;
        jobs.push({ file: `${model}-${id}`, qs: `${qs}&hang=0` });
        jobs.push({ file: `${model}-${id}-hang`, qs: `${qs}&hang=1&pass=garment` });
        // La sombra es igual para todos los colores: se dibuja una vez por modelo
        if (!jobs.some((j) => j.file === `${model}-shadow`)) jobs.push({ file: `${model}-shadow`, qs: `${qs}&hang=1&pass=shadow` });
      }
  for (const j of jobs) {
    await p.goto(`${base}?${j.qs}`, { timeout: 120000 });
    await p.waitForFunction(() => window.__done === true, null, { timeout: 120000 });
    const data = await p.evaluate(() => document.getElementById('c').toDataURL('image/png'));
    fs.writeFileSync(`${out}/${j.file}.png`, Buffer.from(data.split(',')[1], 'base64'));
    console.log('ok', j.file);
  }
  await b.close();
})();
