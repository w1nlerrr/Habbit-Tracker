/**
 * Снимки экранов для README и отчёта.
 *
 * 1. Запустите приложение (start.bat или node dist/index.js).
 * 2. Выполните: node scripts/screenshots.mjs
 * 3. Результат: docs/screenshots/*.png
 *
 * По умолчанию используется демо-учётка demo@habit.local / Demo12345!.
 */
import { mkdir } from 'node:fs/promises';

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const THEME = process.env.THEME === 'dark' ? 'dark' : 'light';
const OUTPUT_DIR = THEME === 'dark' ? 'docs/screenshots/dark' : 'docs/screenshots';
const EMAIL = process.env.DEMO_EMAIL ?? 'demo@habit.local';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo12345!';

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  locale: 'ru-RU',
  colorScheme: THEME,
});
await context.addInitScript((theme) => {
  window.localStorage.setItem('ht-theme', theme);
}, THEME);

const page = await context.newPage();

const shot = async (name) => {
  await page.screenshot({ path: `${OUTPUT_DIR}/${name}.png`, fullPage: true });
  console.log(`saved ${OUTPUT_DIR}/${name}.png`);
};

console.log(`theme: ${THEME}`);
console.log(`opening ${BASE_URL}/login`);
await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
await shot('01-login');

await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE_URL}/`, { timeout: 20_000 });
// Ждём, пока исчезнет тост «С возвращением!», чтобы не попадал на скриншот.
await page
  .waitForSelector('[data-sonner-toast]', { state: 'detached', timeout: 8_000 })
  .catch(() => {});
await page.waitForTimeout(600);
await shot('02-dashboard');

await page.goto(`${BASE_URL}/habits`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await shot('03-habits');

await page.locator('a[href^="/habits/"]').first().click();
await page.waitForTimeout(1_500);
await shot('04-habit-details');

await page.goto(`${BASE_URL}/stats`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2_000);
await shot('05-stats');

await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1_000);
await shot('06-settings');

await browser.close();
console.log('done');
