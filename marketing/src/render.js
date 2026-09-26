// Graba los videos de anuncios a partir de ad.html.
//   node render.js                  -> los 12 videos + miniaturas en ../videos
//   node render.js preview bot wa story 1.5 5 8   -> capturas sueltas para revisar
// Requiere playwright (Chromium) e imageio-ffmpeg (pip) o ffmpeg en el PATH.
const { chromium } = require("playwright");
const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const FPS = 30, DUR = 15;
const SIZES = { story: [1080, 1920], feed: [1080, 1350] };
const CONCEPTS = ["bot", "web", "auto"];
const DESTS = ["wa", "web"];
const OUT = path.join(__dirname, "..", "videos");

function ffmpegBin() {
  try { return execSync("python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'").toString().trim(); }
  catch { return "ffmpeg"; }
}

async function open(browser, c, d, f) {
  const [w, h] = SIZES[f];
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`file://${path.join(__dirname, "ad.html")}?c=${c}&d=${d}&f=${f}`);
  await page.evaluate(() => window.ready);
  return page;
}

async function renderVideo(browser, ff, c, d, f) {
  const page = await open(browser, c, d, f);
  const name = `kova-${c}-${d}-${f}`;
  const file = path.join(OUT, `${name}.mp4`);
  const p = spawn(ff, ["-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-map", "0:v", "-map", "1:a", "-shortest",
    "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", file], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => p.on("close", (code) => (code ? rej(new Error(`ffmpeg ${code}`)) : res())));
  for (let i = 0; i < FPS * DUR; i++) {
    await page.evaluate((t) => window.seek(t), i / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!p.stdin.write(buf)) await new Promise((r) => p.stdin.once("drain", r));
  }
  p.stdin.end();
  await done;
  // Miniatura (portada) en el segundo 2.2, con el gancho ya visible
  await page.evaluate(() => window.seek(2.2));
  await page.screenshot({ path: path.join(OUT, "portadas", `${name}.jpg`), type: "jpeg", quality: 90 });
  await page.close();
  console.log("✓", name);
}

(async () => {
  const browser = await chromium.launch();
  const args = process.argv.slice(2);
  if (args[0] === "preview") {
    const [, c, d, f, ...ts] = args;
    const page = await open(browser, c, d, f);
    for (const t of ts) {
      await page.evaluate((t) => window.seek(t), +t);
      const out = path.join(process.env.PREVIEW_DIR || ".", `prev-${c}-${d}-${f}-${t}.jpg`);
      await page.screenshot({ path: out, type: "jpeg", quality: 80 });
      console.log(out);
    }
  } else {
    fs.mkdirSync(path.join(OUT, "portadas"), { recursive: true });
    const ff = ffmpegBin();
    for (const c of CONCEPTS) for (const d of DESTS) for (const f of Object.keys(SIZES)) await renderVideo(browser, ff, c, d, f);
  }
  await browser.close();
})();
