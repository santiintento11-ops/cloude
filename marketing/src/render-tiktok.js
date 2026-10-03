// Graba los 10 videos de KOVA para TikTok e Instagram Reels a partir de tiktok.html.
//   node render-tiktok.js                    -> 10 videos 1080×1920 con música + portadas en ../tiktok
//   node render-tiktok.js --voz              -> los mismos 10 con voz en off (IA) en ../tiktok-voz
//   node render-tiktok.js --voz noche precio -> solo esas ideas
//   node render-tiktok.js preview noche 1.4 5 11   -> capturas sueltas para revisar (segundos de la plantilla)
// Requiere playwright (Chromium), ffmpeg en el PATH y python3 con numpy y scipy (audio.py); con --voz también piper-tts (tts.py).
const { chromium } = require("playwright");
const { spawn, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const FPS = 30;
const CONCEPTS = ["noche", "antes", "senales", "precio", "construye", "horas", "negocios", "google", "proceso", "tienda"];
const PARALLEL = 3;

async function open(browser, c) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto(`file://${path.join(__dirname, "tiktok.html")}?c=${c}`);
  await page.evaluate(() => window.ready);
  return page;
}

function fileName(c, voz) {
  return `kova-tt-${String(CONCEPTS.indexOf(c) + 1).padStart(2, "0")}-${c}${voz ? "-voz" : ""}`;
}

// Reloj del video con voz: cada frase empieza en su segundo de la plantilla y, si no le alcanza el tiempo
// hasta la siguiente, la plantilla se queda quieta (antes de que salga la escena) hasta que termina.
// Devuelve los puntos [segundo de plantilla, segundo de video] que usa setWarp() en tiktok.html.
function buildWarp(meta, durs) {
  const LEAD = .05, GAP = .2, TAIL = 1.1;
  const knots = [[0, 0]], starts = [];
  let v = 0, tau = 0;
  meta.vo.forEach(([a], k) => {
    const n = k + 1 < meta.vo.length ? meta.vo[k + 1][0] : meta.dur;
    v += a - tau; tau = a;
    starts.push(v + LEAD);
    const extra = LEAD + durs[k] + (k + 1 < meta.vo.length ? GAP : TAIL) - (n - a);
    if (extra > 0) {
      let h = n;
      for (const b of meta.bounds) if (b > a && b <= n) h = Math.min(h, b - .4);
      h = Math.max(h, Math.min(a + .6, n));
      knots.push([h, v + h - a], [h, v + h - a + extra]);
      v += extra;
    }
  });
  v += meta.dur - tau;
  knots.push([meta.dur, v]);
  const at = (t) => {  // segundo de plantilla -> segundo de video
    for (let i = 1; i < knots.length; i++) {
      const [a, b] = [knots[i - 1], knots[i]];
      if (t <= b[0] && b[0] > a[0]) return a[1] + t - a[0];
    }
    return knots[knots.length - 1][1] + t - meta.dur;
  };
  return { knots, starts, dur: Math.round(v * FPS) / FPS, at };
}

async function renderVideo(browser, c, voz) {
  const OUT = path.join(__dirname, "..", voz ? "tiktok-voz" : "tiktok");
  const page = await open(browser, c);
  const meta = await page.evaluate(() => window.META);
  const name = fileName(c, voz);
  const work = path.join(OUT, `${name}.tmp`);
  fs.mkdirSync(work, { recursive: true });

  // Portada primero, en segundos de la plantilla: el gancho ya visible
  // (después de recorrer todo el video, volver atrás no es fiable)
  await page.evaluate((t) => window.seek(t), meta.cover);
  await page.screenshot({ path: path.join(OUT, "portadas", `${name}.jpg`), type: "jpeg", quality: 92 });

  let dur = meta.dur, voice = [];
  if (voz) {
    fs.writeFileSync(path.join(work, "frases.json"), JSON.stringify(meta.vo.map(([, text]) => text)));
    execFileSync("python3", [path.join(__dirname, "tts.py"), path.join(work, "frases.json"), work], { stdio: "inherit" });
    const durs = JSON.parse(fs.readFileSync(path.join(work, "duraciones.json")));
    const w = buildWarp(meta, durs);
    await page.evaluate((k) => window.setWarp(k), w.knots);
    dur = w.dur;
    voice = w.starts.map((t, i) => ({ t, file: path.join(work, `frase-${String(i).padStart(2, "0")}.wav`) }));
    meta.cues = meta.cues.filter((q) => q.type !== "riser" && q.type !== "impact")
      .map((q) => ({ ...q, t: w.at(q.t) }))
      .concat([{ t: w.at(meta.end) - .9, type: "riser", len: .9 }, { t: w.at(meta.end), type: "impact" }]);
    meta.end = w.at(meta.end);
  }

  const tmp = path.join(work, "video.mp4");
  const p = spawn("ffmpeg", ["-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-profile:v", "high", "-r", String(FPS), tmp],
    { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => p.on("close", (code) => (code ? rej(new Error(`ffmpeg ${code}`)) : res())));
  const frames = Math.round(dur * FPS);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.seek(t), i / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 94 });
    if (!p.stdin.write(buf)) await new Promise((r) => p.stdin.once("drain", r));
  }
  p.stdin.end();
  await done;
  await page.close();

  // Música original + efectos sincronizados (+ voz), luego se une con el video
  const cues = path.join(work, "cues.json");
  const wav = path.join(work, "audio.wav");
  fs.writeFileSync(cues, JSON.stringify({ ...meta, dur, voice }));
  execFileSync("python3", [path.join(__dirname, "audio.py"), cues, wav], { stdio: "inherit" });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-i", wav,
    "-map", "0:v", "-map", "1:a", "-c:v", "copy",
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=9", "-ar", "44100", "-c:a", "aac", "-b:a", "192k",
    "-shortest", "-movflags", "+faststart", path.join(OUT, `${name}.mp4`)]);
  fs.rmSync(work, { recursive: true });
  console.log("✓", name, `${dur.toFixed(1)}s`);
}

(async () => {
  const browser = await chromium.launch();
  let args = process.argv.slice(2);
  const voz = args.includes("--voz");
  args = args.filter((a) => a !== "--voz");
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
    fs.mkdirSync(path.join(__dirname, "..", voz ? "tiktok-voz" : "tiktok", "portadas"), { recursive: true });
    const queue = [...(args.length ? args : CONCEPTS)];
    await Promise.all(Array.from({ length: PARALLEL }, async () => {
      while (queue.length) await renderVideo(browser, queue.shift(), voz);
    }));
  }
  await browser.close();
})();
