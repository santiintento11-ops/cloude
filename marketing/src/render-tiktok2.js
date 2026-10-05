// Graba la serie 2 de videos de KOVA (tiktok2.html) con voz en off y subtítulos palabra por palabra.
//   node render-tiktok2.js                 -> los 10 videos + portadas en ../tiktok-pro
//   node render-tiktok2.js costo demo      -> solo esos
//   node render-tiktok2.js preview costo 1 4.5 9   -> capturas sueltas (con tiempos estimados, sin generar voz)
//   node render-tiktok2.js voces           -> solo genera las voces que falten
//   node render-tiktok2.js portadas        -> solo rehace las portadas
// La voz la genera voz.py con Chatterbox, que necesita su propio entorno de Python:
//   KOVA_VOZ_PY=/ruta/al/venv/bin/python node render-tiktok2.js
// Las voces quedan en src/.voz-cache/ y no se regeneran si el texto no cambió.
// Requiere playwright (Chromium), ffmpeg y python3 con numpy y scipy (audio.py).
const { chromium } = require("playwright");
const { spawn, execFileSync } = require("child_process");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const FPS = 30;
const VIDS = ["empleado", "errores", "flujo", "demo", "costo", "instagram", "rediseno", "agente", "detras", "dudas"];
// [bpm, semitonos] de la música de cada video
const MUSIC = { empleado: [108, 0], errores: [116, -2], flujo: [104, 3], demo: [100, -3], costo: [112, 2],
  instagram: [118, -1], rediseno: [106, 1], agente: [96, -4], detras: [110, 4], dudas: [114, -5] };
const OUT = path.join(__dirname, "..", "tiktok-pro");
const CACHE = path.join(__dirname, ".voz-cache");
const VOZ_PY = process.env.KOVA_VOZ_PY || "python3";
const PARALLEL = 3;

async function open(browser, v, auto) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto(`file://${path.join(__dirname, "tiktok2.html")}?v=${v}${auto ? "" : "&noauto"}`);
  await page.evaluate(() => window.ready);
  return page;
}

const name = (v) => `kova-pro-${String(VIDS.indexOf(v) + 1).padStart(2, "0")}-${v}`;
const key = (texts) => crypto.createHash("sha1").update(JSON.stringify(texts) + fs.readFileSync(path.join(__dirname, "voz.py"))).digest("hex").slice(0, 12);

// Genera de una vez las voces que falten (cargar el modelo tarda ~1 min, así que se hace una sola vez)
async function voices(browser, list) {
  const jobs = [];
  for (const v of list) {
    const page = await open(browser, v, false);
    const texts = await page.evaluate(() => window.SCRIPT);
    await page.close();
    const dir = path.join(CACHE, `${v}-${key(texts)}`);
    if (!fs.existsSync(path.join(dir, "frases-info.json"))) jobs.push({ v, texts, dir });
  }
  if (jobs.length) {
    const tmp = path.join(CACHE, "_lote");
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    const all = [...new Set(jobs.flatMap((j) => j.texts))];  // la frase del cierre se repite: se genera una vez
    fs.writeFileSync(path.join(tmp, "frases.json"), JSON.stringify(all));
    console.log(`Generando ${all.length} frases de voz para: ${jobs.map((j) => j.v).join(", ")}`);
    execFileSync(VOZ_PY, [path.join(__dirname, "voz.py"), path.join(tmp, "frases.json"), tmp], { stdio: "inherit" });
    const info = JSON.parse(fs.readFileSync(path.join(tmp, "frases-info.json")));
    const wav = (i) => path.join(tmp, `frase-${String(i).padStart(2, "0")}.wav`);
    for (const j of jobs) {
      fs.mkdirSync(j.dir, { recursive: true });
      const mine = j.texts.map((text, k) => {
        const i = all.indexOf(text);
        fs.copyFileSync(wav(i), path.join(j.dir, `frase-${String(k).padStart(2, "0")}.wav`));
        return info[i];
      });
      fs.writeFileSync(path.join(j.dir, "frases-info.json"), JSON.stringify(mine));
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// Portada: el final del gancho (ya se ve todo) y sin subtítulos, que a mitad de frase quedan cortados
async function cover(page, meta, n) {
  await page.evaluate((t) => { window.seek(t); document.getElementById("caps").style.opacity = 0; }, meta.cover);
  await page.screenshot({ path: path.join(OUT, "portadas", `${n}.jpg`), type: "jpeg", quality: 92 });
  await page.evaluate(() => { document.getElementById("caps").style.opacity = ""; });
}

async function render(browser, v) {
  const page = await open(browser, v, false);
  const texts = await page.evaluate(() => window.SCRIPT);
  const dir = path.join(CACHE, `${v}-${key(texts)}`);
  const info = JSON.parse(fs.readFileSync(path.join(dir, "frases-info.json")));
  const meta = await page.evaluate((info) => window.build(info), info);
  const n = name(v);
  const work = path.join(OUT, `${n}.tmp`);
  fs.mkdirSync(work, { recursive: true });

  await cover(page, meta, n);

  const tmp = path.join(work, "video.mp4");
  const p = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
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

  const cues = meta.cues.concat([{ t: meta.end - .9, type: "riser", len: .9 }, { t: meta.end, type: "impact" }]);
  const voice = meta.voice.map((t, k) => ({ t, file: path.join(dir, `frase-${String(k).padStart(2, "0")}.wav`) }));
  const [bpm, shift] = MUSIC[v];
  fs.writeFileSync(path.join(work, "cues.json"), JSON.stringify({ dur: meta.dur, end: meta.end, cues, voice, bpm, shift }));
  execFileSync("python3", [path.join(__dirname, "audio.py"), path.join(work, "cues.json"), path.join(work, "audio.wav")], { stdio: "inherit" });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-i", path.join(work, "audio.wav"),
    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=9", "-ar", "44100", "-c:a", "aac", "-b:a", "192k",
    "-shortest", "-movflags", "+faststart", path.join(OUT, `${n}.mp4`)]);
  fs.rmSync(work, { recursive: true });
  console.log("✓", n, `${meta.dur.toFixed(1)}s`);
}

(async () => {
  const browser = await chromium.launch();
  const args = process.argv.slice(2);
  if (args[0] === "preview") {
    const [, v, ...ts] = args;
    const page = await open(browser, v, true);
    for (const t of ts) {
      await page.evaluate((t) => window.seek(t), +t);
      const out = path.join(process.env.PREVIEW_DIR || ".", `pro-${v}-${t}.jpg`);
      await page.screenshot({ path: out, type: "jpeg", quality: 80 });
      console.log(out);
    }
  } else if (args[0] === "portadas") {  // solo rehace las portadas (con las voces ya generadas)
    for (const v of args.length > 1 ? args.slice(1) : VIDS) {
      const page = await open(browser, v, false);
      const texts = await page.evaluate(() => window.SCRIPT);
      const info = JSON.parse(fs.readFileSync(path.join(CACHE, `${v}-${key(texts)}`, "frases-info.json")));
      const meta = await page.evaluate((info) => window.build(info), info);
      await cover(page, meta, name(v));
      await page.close();
    }
  } else if (args[0] === "voces") {
    await voices(browser, args.length > 1 ? args.slice(1) : VIDS);  // solo genera las voces
  } else {
    const list = args.length ? args : VIDS;
    fs.mkdirSync(path.join(OUT, "portadas"), { recursive: true });
    await voices(browser, list);
    const queue = [...list];
    await Promise.all(Array.from({ length: PARALLEL }, async () => {
      while (queue.length) await render(browser, queue.shift());
    }));
  }
  await browser.close();
})();
