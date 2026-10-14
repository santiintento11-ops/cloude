// Renderiza escena.html fotograma a fotograma y lo une con la mezcla de audio.
//   node render.js                    -> ../huellitas-creativas.mp4 (1920x1080, 24 fps, 8 s) + portada
//   node render.js preview 0 2 4.5 7  -> capturas sueltas en build/ para revisar
// Antes: python3 voz.py && python3 musica.py   (generan build/boca.json y build/mezcla.wav)
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

const FPS = 24, DUR = 8;
const ROOT = __dirname;
const BUILD = path.join(ROOT, "build");
const OUT = path.join(ROOT, "..", "huellitas-creativas.mp4");
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };

function servidor() {
  const srv = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r(srv)));
}

(async () => {
  const srv = await servidor();
  const url = `http://127.0.0.1:${srv.address().port}/escena.html`;
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("[page]", m.text()); });
  page.on("pageerror", (e) => console.log("[page error]", e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.ready, null, { timeout: 300000 });
  const canvas = await page.$("canvas");
  const args = process.argv.slice(2);

  if (args[0] === "preview") {
    for (const t of args.slice(1)) {
      const t0 = Date.now();
      await page.evaluate((t) => window.seek(t), +t);
      const out = path.join(BUILD, `prev-${t}.jpg`);
      await canvas.screenshot({ path: out, type: "jpeg", quality: 85 });
      console.log(out, `${Date.now() - t0} ms`);
    }
  } else {
    const tmp = OUT + ".part.mp4";
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error",
      "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
      "-i", path.join(BUILD, "mezcla.wav"),
      "-map", "0:v", "-map", "1:a", "-t", String(DUR),
      "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-profile:v", "high", "-r", String(FPS),
      "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp], { stdio: ["pipe", "inherit", "inherit"] });
    const done = new Promise((res, rej) => ff.on("close", (c) => (c ? rej(new Error(`ffmpeg ${c}`)) : res())));
    const t0 = Date.now();
    for (let i = 0; i < FPS * DUR; i++) {
      await page.evaluate((t) => window.seek(t), i / FPS);
      const buf = await canvas.screenshot({ type: "png" });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      if (i % 12 === 0) console.log(`fotograma ${i}/${FPS * DUR} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    ff.stdin.end();
    await done;
    fs.renameSync(tmp, OUT);
    await page.evaluate(() => window.seek(5.2));
    await canvas.screenshot({ path: path.join(ROOT, "..", "portada.jpg"), type: "jpeg", quality: 92 });
    console.log("✓", OUT);
  }
  await browser.close();
  srv.close();
})();
