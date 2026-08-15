// One-off script to generate placeholder app icons (solid color squares) so the
// project has valid icon files before `tauri icon` can be run with real Rust tooling.
// Not part of the app build; safe to delete once real icons are generated.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT_DIR = path.join(__dirname, "..", "src-tauri", "icons");
const BG = [14, 99, 156]; // matches --color-vscode-button
const FG = [255, 255, 255];

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// draws a simple "T" glyph on the square so it's visually distinct from a flat color
function pixelAt(x, y, size) {
  const pad = Math.round(size * 0.28);
  const barH = Math.max(2, Math.round(size * 0.12));
  const stemW = Math.max(2, Math.round(size * 0.16));
  const innerW = size - pad * 2;
  const inTopBar = y >= pad && y < pad + barH && x >= pad && x < pad + innerW;
  const stemX0 = size / 2 - stemW / 2;
  const inStem = y >= pad && y < size - pad && x >= stemX0 && x < stemX0 + stemW;
  return inTopBar || inStem ? FG : BG;
}

function makePng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelAt(x, y, size);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeIco(pngBuf, size) {
  // ICO with a single PNG-compressed image (valid since Windows Vista)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // count

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size; // width (0 = 256)
  entry[1] = size >= 256 ? 0 : size; // height
  entry[2] = 0; // color palette
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuf.length, 8); // image size
  entry.writeUInt32LE(6 + 16, 12); // offset

  return Buffer.concat([header, entry, pngBuf]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const sizes = [
  ["32x32.png", 32],
  ["128x128.png", 128],
  ["128x128@2x.png", 256],
  ["icon.png", 512],
];

for (const [name, size] of sizes) {
  fs.writeFileSync(path.join(OUT_DIR, name), makePng(size));
  console.log("wrote", name);
}

const icoPng = makePng(256);
fs.writeFileSync(path.join(OUT_DIR, "icon.ico"), makeIco(icoPng, 256));
console.log("wrote icon.ico");
