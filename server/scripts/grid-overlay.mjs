import sharp from "sharp";
import path from "node:path";

const dir =
  "c:/Users/RecoveryAdmin/repos/LapViewer/data/cache/lapstart-spike-d645a1fd-0d37-4162-bb3a-f2789836faa5";
const W = 640;
const H = 360;

let lines = "";
for (let i = 0; i <= 10; i++) {
  const x = Math.round((i / 10) * W);
  lines += `<line x1='${x}' y1='0' x2='${x}' y2='${H}' stroke='red' stroke-width='1' opacity='0.55'/>`;
  lines += `<text x='${x + 2}' y='14' fill='red' font-size='13' font-family='monospace'>${(i / 10).toFixed(1)}</text>`;
}
for (let j = 0; j <= 10; j++) {
  const y = Math.round((j / 10) * H);
  lines += `<line x1='0' y1='${y}' x2='${W}' y2='${y}' stroke='red' stroke-width='1' opacity='0.55'/>`;
  lines += `<text x='2' y='${y + 13}' fill='red' font-size='13' font-family='monospace'>${(j / 10).toFixed(1)}</text>`;
}
const svg = Buffer.from(`<svg width='${W}' height='${H}'>${lines}</svg>`);

for (const name of ["full-lap1", "full-lap7", "full-lap12"]) {
  await sharp(path.join(dir, name + ".png"))
    .resize(W, H)
    .composite([{ input: svg }])
    .toFile(path.join(dir, name + "-grid.png"));
}
console.log("grids written");
