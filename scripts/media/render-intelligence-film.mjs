import { copyFile, mkdir, readdir, rename, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");
const mediaDir = join(repoRoot, "docs", "media");
const siteMediaDir = join(repoRoot, "site", "media");
const videoDir = join(mediaDir, ".intelligence-video-tmp");
const pageUrl = pathToFileURL(join(mediaDir, "hallow-intelligence-film.html")).href;

await mkdir(mediaDir, { recursive: true });
await mkdir(siteMediaDir, { recursive: true });
await rm(videoDir, { recursive: true, force: true });
await mkdir(videoDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const still = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const stillPage = await still.newPage();
  await stillPage.goto(`${pageUrl}?poster=1`, { waitUntil: "load" });
  await stillPage.waitForTimeout(1_200);
  await stillPage.screenshot({ path: join(mediaDir, "hallow-intelligence-poster.png") });
  await still.close();
  const context = await browser.newContext({ viewport: { width: 1080, height: 1350 }, recordVideo: { dir: videoDir, size: { width: 1080, height: 1350 } } });
  const page = await context.newPage();
  const video = page.video();
  await page.goto(pageUrl, { waitUntil: "load" });
  await page.waitForTimeout(112_400);
  await page.close();
  await context.close();
  await rename(await video.path(), join(mediaDir, "hallow-intelligence-film.webm"));
} finally {
  await browser.close();
  await rm(videoDir, { recursive: true, force: true });
}
for (const name of ["hallow-intelligence-poster.png", "hallow-intelligence-film.webm"]) await copyFile(join(mediaDir, name), join(siteMediaDir, name));
const generated = (await readdir(mediaDir)).filter((name) => /^hallow-intelligence-.*\.(png|webm)$/i.test(name));
for (const name of generated) console.log(join(mediaDir, name));
