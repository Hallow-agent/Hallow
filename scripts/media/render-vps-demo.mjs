import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");
const mediaDir = join(repoRoot, "docs", "media");
const videoDir = join(mediaDir, ".video-tmp");
const htmlPath = join(mediaDir, "hallow-vps-terminal-demo.html");

await mkdir(mediaDir, { recursive: true });
await rm(videoDir, { recursive: true, force: true });
await mkdir(videoDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const stillContext = await browser.newContext({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 1
  });
  const stillPage = await stillContext.newPage();
  for (const scene of ["install", "runtime", "chat"]) {
    await stillPage.goto(`${pathToFileURL(htmlPath).href}?scene=${scene}`, { waitUntil: "load" });
    await stillPage.screenshot({ path: join(mediaDir, `hallow-vps-${scene}.png`) });
  }
  await stillContext.close();

  const videoContext = await browser.newContext({
    viewport: { width: 1080, height: 1350 },
    recordVideo: { dir: videoDir, size: { width: 1080, height: 1350 } }
  });
  const videoPage = await videoContext.newPage();
  const video = videoPage.video();
  await videoPage.goto(`${pathToFileURL(htmlPath).href}?scene=video`, { waitUntil: "load" });
  await videoPage.waitForTimeout(12_800);
  await videoPage.close();
  await videoContext.close();
  const recordedPath = await video.path();
  await rename(recordedPath, join(mediaDir, "hallow-vps-launch.webm"));
} finally {
  await browser.close();
  await rm(videoDir, { recursive: true, force: true });
}

const generated = (await readdir(mediaDir)).filter((name) => /\.(png|webm)$/i.test(name));
for (const name of generated) console.log(join(mediaDir, name));
