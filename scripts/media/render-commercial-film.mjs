import { copyFile, mkdir, rename, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");
const mediaDir = join(repoRoot, "docs", "media");
const siteMediaDir = join(repoRoot, "site", "media");
const videoDir = join(mediaDir, ".commercial-video-tmp");
const pageUrl = pathToFileURL(join(mediaDir, "hallow-commercial-film.html")).href;

await mkdir(mediaDir, { recursive: true });
await mkdir(siteMediaDir, { recursive: true });
await rm(videoDir, { recursive: true, force: true });
await mkdir(videoDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const still = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const stillPage = await still.newPage();
  await stillPage.goto(`${pageUrl}?poster=1&t=9`, { waitUntil: "load" });
  await stillPage.waitForTimeout(800);
  await stillPage.screenshot({ path: join(mediaDir, "hallow-commercial-poster.png") });
  await still.close();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } } });
  const page = await context.newPage();
  const video = page.video();
  await page.goto(pageUrl, { waitUntil: "load" });
  await page.waitForTimeout(113_400);
  await page.close();
  await context.close();
  await rename(await video.path(), join(mediaDir, "hallow-commercial-film.webm"));
} finally {
  await browser.close();
  await rm(videoDir, { recursive: true, force: true });
}
for (const name of ["hallow-commercial-poster.png", "hallow-commercial-film.webm"]) await copyFile(join(mediaDir, name), join(siteMediaDir, name));
