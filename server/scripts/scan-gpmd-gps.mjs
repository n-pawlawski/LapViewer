import fs from "node:fs";
import path from "node:path";

function findMoov(filePath, fileSize) {
  const fd = fs.openSync(filePath, "r");
  const TAIL = Math.min(fileSize, 256 * 1024 * 1024);
  const tailStart = fileSize - TAIL;
  const tail = Buffer.alloc(TAIL);
  fs.readSync(fd, tail, 0, TAIL, tailStart);
  fs.closeSync(fd);
  let pos = 0;
  while (true) {
    const idx = tail.indexOf("moov", pos);
    if (idx < 4) break;
    const s = idx - 4;
    const sz = tail.readUInt32BE(s);
    const ty = tail.toString("ascii", s + 4, s + 8);
    if (ty === "moov" && sz > 0 && s + sz <= TAIL) {
      return { off: tailStart + s, sz };
    }
    pos = idx + 4;
  }
  return null;
}

function walk(buf, start, end, visit) {
  let o = start;
  while (o + 8 <= end) {
    let sz = buf.readUInt32BE(o);
    const ty = buf.toString("ascii", o + 4, o + 8);
    let h = 8;
    if (sz === 1) {
      sz = Number(buf.readBigUInt64BE(o + 8));
      h = 16;
    }
    const e = o + sz;
    if (e > end) break;
    visit(ty, o + h, e);
    const c = new Set(["moov", "trak", "mdia", "minf", "stbl"]);
    if (c.has(ty)) walk(buf, o + h, e, visit);
    o = e;
  }
}

function gpmdGps(filePath) {
  const size = fs.statSync(filePath).size;
  const moovInfo = findMoov(filePath, size);
  if (!moovInfo) return { err: "no moov" };
  const moov = Buffer.alloc(moovInfo.sz);
  const fd = fs.openSync(filePath, "r");
  fs.readSync(fd, moov, 0, moovInfo.sz, moovInfo.off);
  let stsz = null;
  let stco = null;
  let hasGpmd = false;
  walk(moov, 0, moov.length, (ty, s, e) => {
    if (ty === "stsd" && moov.toString("ascii", s + 12, s + 16) === "gpmd") {
      hasGpmd = true;
    }
    if (ty === "stsz") stsz = { s, e };
    if (ty === "stco") stco = { s, e };
  });
  if (!hasGpmd || !stsz || !stco) {
    fs.closeSync(fd);
    return { gps5: 0, gpsu: 0, samples: 0 };
  }
  const base = stsz.s + 4;
  const n = moov.readUInt32BE(base + 4);
  const offBase = stco.s + 4;
  const sizes = [];
  let o = base + 8;
  for (let i = 0; i < n; i++) {
    sizes.push(moov.readUInt32BE(o));
    o += 4;
  }
  let gps5 = 0;
  let gpsu = 0;
  let first = null;
  for (let i = 0; i < n; i++) {
    const off = moov.readUInt32BE(offBase + 4 + i * 4);
    const sample = Buffer.alloc(sizes[i]);
    fs.readSync(fd, sample, 0, sizes[i], off);
    if (sample.includes(Buffer.from("GPS5"))) {
      gps5++;
      if (!first) {
        const idx = sample.indexOf("GPS5");
        first = {
          sample: i,
          lat: sample.readInt32BE(idx + 12) / 1e7,
          lon: sample.readInt32BE(idx + 16) / 1e7,
        };
      }
    }
    if (sample.includes(Buffer.from("GPSU"))) gpsu++;
  }
  fs.closeSync(fd);
  return { gps5, gpsu, samples: n, first };
}

const dir = "E:/Racing Videos/2-19 racing league";
for (const f of fs.readdirSync(dir).filter((n) => /\.MP4$/i.test(n)).sort()) {
  const r = gpmdGps(path.join(dir, f));
  const loc = r.first
    ? `first@${r.first.sample} lat=${r.first.lat.toFixed(5)} lon=${r.first.lon.toFixed(5)}`
    : "";
  console.log(f, `gps5=${r.gps5} gpsu=${r.gpsu}/${r.samples}`, loc);
}
