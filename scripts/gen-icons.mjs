// Renders raindrop-icon.svg to public/icon-192.png and public/icon-512.png
// Uses @resvg/resvg-js (dev dep) — pure Rust renderer, no system deps.
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';

const src = readFileSync('public/icon.svg', 'utf8');

for (const size of [192, 512]) {
  const resvg = new Resvg(src, {
    fitTo: { mode: 'width', value: size },
  });
  const png = resvg.render().asPng();
  writeFileSync(`public/icon-${size}.png`, png);
  console.log(`✓ public/icon-${size}.png (${size}×${size})`);
}
