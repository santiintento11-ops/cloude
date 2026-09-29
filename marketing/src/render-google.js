// Genera las imágenes para Google Ads (Máximo rendimiento) en ../google
//   node render-google.js
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
const OUT = path.join(__dirname, "..", "google");
const JOBS = [["logo-sq", null, 1200, 1200, "kova-logo-1x1.png"], ["logo-wide", null, 1200, 300, "kova-logo-4x1.png"]];
for (const c of ["bot", "web", "auto"]) {
  JOBS.push(["sq", c, 1200, 1200, `kova-${c}-1x1.jpg`], ["land", c, 1200, 628, `kova-${c}-1.91x1.jpg`]);
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  for (const [m, c, w, h, name] of JOBS) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(`file://${path.join(__dirname, "google.html")}?m=${m}${c ? "&c=" + c : ""}`);
    await p.evaluate(() => window.ready);
    const png = name.endsWith(".png");
    await p.screenshot({ path: path.join(OUT, name), type: png ? "png" : "jpeg", ...(png ? {} : { quality: 92 }) });
    await p.close();
    console.log("✓", name);
  }
  await b.close();
})();
