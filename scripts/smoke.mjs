// Быстрая проверка клиента: консольные ошибки и доступность ключевых страниц.
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const ROUTES = ['/', '/habits', '/stats', '/settings'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', (message) => {
  if (message.type() !== 'error') return;
  const text = message.text();
  // Ожидаемый 401 при проверке сессии у неавторизованного пользователя.
  if (text.includes('/auth/refresh') || text.includes('401 (Unauthorized)')) return;
  errors.push(text);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', process.env.DEMO_EMAIL ?? 'demo@habit.local');
await page.fill('input[type="password"]', process.env.DEMO_PASSWORD ?? 'Demo12345!');
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE_URL}/`, { timeout: 20_000 });

for (const route of ROUTES) {
  const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
  const heading = (await page.locator('h1').first().textContent())?.trim() ?? '';
  console.log(`${route.padEnd(10)} HTTP ${response?.status() ?? '???'}  h1="${heading}"`);
}

await page.goto(`${BASE_URL}/habits`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Новая привычка' }).click();
await page.waitForTimeout(500);
const modalVisible = await page.getByRole('dialog').isVisible();
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
const modalClosed = !(await page.getByRole('dialog').isVisible().catch(() => false));

console.log(`modal opens: ${modalVisible}, closes by Escape: ${modalClosed}`);
console.log(`console errors: ${errors.length}`);
for (const error of errors.slice(0, 10)) console.log(`  - ${error}`);

await browser.close();
process.exit(errors.length === 0 && modalVisible && modalClosed ? 0 : 1);
