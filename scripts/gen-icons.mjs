// Generates public/icon-192.png and public/icon-512.png
// Pure Node.js — no dependencies.
import { deflateSync } from 'zlib';
import { writeFileSync } from 'fs';

// CRC32
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[i] = c;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}

// Raindrop hit-test on a 24x24 coordinate space.
// Shape: pointed top at (12, 2.5), circular base centre (12, 15.2) r=7.
// Upper taper uses a power curve that matches the SVG bezier.
function isInDrop(nx, ny) {
  const x = nx * 24, y = ny * 24;
  const cx = 12, cy = 15.2, r = 7;
  if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) return true;
  if (y >= 2.5 && y < cy) {
    const t = (y - 2.5) / (cy - 2.5);
    const hw = r * Math.pow(t, 0.6); // power curve approximates the cubic bezier
    if (Math.abs(x - cx) <= hw) return true;
  }
  return false;
}

function makePNG(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const ss = 4; // 4×4 supersampling
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    const row = py * (size * 4 + 1);
    raw[row] = 0; // filter: None
    for (let px = 0; px < size; px++) {
      let hit = 0;
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++)
          if (isInDrop((px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size)) hit++;
      const cov = hit / (ss * ss);
      // White drop blended onto Deep Teal #124E4A = rgb(18, 78, 74)
      raw[row + 1 + px * 4]     = Math.round(18  + (255 - 18)  * cov); // R
      raw[row + 1 + px * 4 + 1] = Math.round(78  + (255 - 78)  * cov); // G
      raw[row + 1 + px * 4 + 2] = Math.round(74  + (255 - 74)  * cov); // B
      raw[row + 1 + px * 4 + 3] = 255;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.png`, makePNG(size));
  console.log(`✓ public/icon-${size}.png`);
}
