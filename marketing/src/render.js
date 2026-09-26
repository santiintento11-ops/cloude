// Graba los anuncios de KOVA a partir de ad.html.
//   node render.js                 -> 3 videos 9:16 + portadas + 3 imágenes 4:5 en ../videos y ../imagenes
//   node render.js web             -> solo la idea "web" (vale bot, web, auto)
//   node render.js preview bot story 1.5 5 8   -> capturas sueltas para revisar (usa "img" en vez de "story" para las imágenes)
// Requiere playwright (Chromium) e imageio-ffmpeg (pip) o ffmpeg en el PATH.
const { chromium } = require("playwright");
const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const FPS = 30, DUR = 15;
const SIZES = { story: [1080, 1920], feed: [1080, 1350], img: [1080, 1350] };
const CONCEPTS = ["bot", "web", "auto"];
const VIDEOS = path.join(__dirname, "..", "videos");
const IMAGES = path.join(__dirname, "..", "imagenes");

function ffmpegBin() {
  try { return execSync("python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'").toString().trim(); }
  catch { return "ffmpeg"; }
}

async function open(browser, c, f) {
  const [w, h] = SIZES[f];
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const q = f === "img" ? `c=${c}&m=img` : `c=${c}&f=${f}`;
  await page.goto(`file://${path.join(__dirname, "ad.html")}?${q}`);
  await page.evaluate(() => window.ready);
  return page;
}

async function renderVideo(browser, ff, c) {
  const page = await open(browser, c, "story");
  const file = path.join(VIDEOS, `kova-${c}.mp4`);
  const tmp = file + ".part.mp4";
  const p = spawn(ff, ["-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-map", "0:v", "-map", "1:a", "-shortest",
    "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", tmp], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => p.on("close", (code) => (code ? rej(new Error(`ffmpeg ${code}`)) : res())));
  for (let i = 0; i < FPS * DUR; i++) {
    await page.evaluate((t) => window.seek(t), i / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!p.stdin.write(buf)) await new Promise((r) => p.stdin.once("drain", r));
  }
  p.stdin.end();
  await done;
  fs.renameSync(tmp, file);
  // Portada en el segundo 2.2, con el gancho ya visible
  await page.evaluate(() => window.seek(2.2));
  await page.screenshot({ path: path.join(VIDEOS, "portadas", `kova-${c}.jpg`), type: "jpeg", quality: 90 });
  await page.close();
  console.log("✓ video", c);
}

async function renderImage(browser, c) {
  const page = await open(browser, c, "img");
  await page.evaluate(() => window.seek(6));
  await page.screenshot({ path: path.join(IMAGES, `kova-${c}.jpg`), type: "jpeg", quality: 93 });
  await page.close();
  console.log("✓ imagen", c);
}

(async () => {
  const browser = await chromium.launch();
  const args = process.argv.slice(2);
  if (args[0] === "preview") {
    const [, c, f, ...ts] = args;
    const page = await open(browser, c, f);
    for (const t of ts) {
      await page.evaluate((t) => window.seek(t), +t);
      const out = path.join(process.env.PREVIEW_DIR || ".", `prev-${c}-${f}-${t}.jpg`);
      await page.screenshot({ path: out, type: "jpeg", quality: 80 });
      console.log(out);
    }
  } else {
    fs.mkdirSync(path.join(VIDEOS, "portadas"), { recursive: true });
    fs.mkdirSync(IMAGES, { recursive: true });
    const list = args.length ? args : CONCEPTS;
    for (const c of list) await renderImage(browser, c);
    const ff = ffmpegBin();
    for (const c of list) await renderVideo(browser, ff, c);
  }
  await browser.close();
})();
