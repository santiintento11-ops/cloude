// Graba los 10 videos de KOVA para TikTok e Instagram Reels a partir de tiktok.html.
//   node render-tiktok.js                    -> 10 videos 1080×1920 + portadas en ../tiktok
//   node render-tiktok.js noche precio       -> solo esas ideas
//   node render-tiktok.js preview noche 1.4 5 11   -> capturas sueltas para revisar
// Requiere playwright (Chromium), ffmpeg en el PATH y python3 con numpy (para audio.py).
const { chromium } = require("playwright");
const { spawn, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const FPS = 30;
const CONCEPTS = ["noche", "antes", "senales", "precio", "construye", "horas", "negocios", "google", "proceso", "tienda"];
const OUT = path.join(__dirname, "..", "tiktok");
const COVERS = path.join(OUT, "portadas");
const PARALLEL = 3;

async function open(browser, c) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto(`file://${path.join(__dirname, "tiktok.html")}?c=${c}`);
  await page.evaluate(() => window.ready);
  return page;
}

function fileName(c) {
  return `kova-tt-${String(CONCEPTS.indexOf(c) + 1).padStart(2, "0")}-${c}`;
}

async function renderVideo(browser, c) {
  const page = await open(browser, c);
  const meta = await page.evaluate(() => window.META);
  const name = fileName(c);
  // Portada primero: el gancho ya visible (después de recorrer todo el video, volver atrás no es fiable)
  await page.evaluate((t) => window.seek(t), meta.cover);
  await page.screenshot({ path: path.join(COVERS, `${name}.jpg`), type: "jpeg", quality: 92 });

  const tmp = path.join(OUT, `${name}.video.mp4`);
  const p = spawn("ffmpeg", ["-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-profile:v", "high", "-r", String(FPS), tmp],
    { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => p.on("close", (code) => (code ? rej(new Error(`ffmpeg ${code}`)) : res())));
  const frames = Math.round(meta.dur * FPS);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.seek(t), i / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 94 });
    if (!p.stdin.write(buf)) await new Promise((r) => p.stdin.once("drain", r));
  }
  p.stdin.end();
  await done;

  await page.close();

  // Música original + efectos sincronizados, luego se une con el video
  const cues = path.join(OUT, `${name}.cues.json`);
  const wav = path.join(OUT, `${name}.wav`);
  fs.writeFileSync(cues, JSON.stringify(meta));
  execFileSync("python3", [path.join(__dirname, "audio.py"), cues, wav], { stdio: "inherit" });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-i", wav,
    "-map", "0:v", "-map", "1:a", "-c:v", "copy",
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=9", "-ar", "44100", "-c:a", "aac", "-b:a", "192k",
    "-shortest", "-movflags", "+faststart", path.join(OUT, `${name}.mp4`)]);
  for (const f of [tmp, wav, cues]) fs.unlinkSync(f);
  console.log("✓", name, `${meta.dur}s`);
}

(async () => {
  const browser = await chromium.launch();
  const args = process.argv.slice(2);
  if (args[0] === "preview") {
    const [, c, ...ts] = args;
    const page = await open(browser, c);
    for (const t of ts) {
      await page.evaluate((t) => window.seek(t), +t);
      const out = path.join(process.env.PREVIEW_DIR || ".", `prev-${c}-${t}.jpg`);
      await page.screenshot({ path: out, type: "jpeg", quality: 80 });
      console.log(out);
    }
  } else {
    fs.mkdirSync(COVERS, { recursive: true });
    const queue = [...(args.length ? args : CONCEPTS)];
    await Promise.all(Array.from({ length: PARALLEL }, async () => {
      while (queue.length) await renderVideo(browser, queue.shift());
    }));
  }
  await browser.close();
})();
