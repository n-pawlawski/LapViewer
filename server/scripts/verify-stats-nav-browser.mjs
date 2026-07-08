import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.argv[2] ?? "http://localhost:3090";
const screenshotDir = process.argv[3] ?? path.join(process.cwd(), "stats-verify-screenshots");

fs.mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

async function snap(name) {
  const file = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("Screenshot:", file);
}

async function devLogin() {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Dev login" }).click();
  await page.getByLabel("Username").fill("root");
  await page.getByLabel("Password").fill("root");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForFunction(() => !document.body.innerText.includes("Sign in with Google"), null, {
    timeout: 15000,
  });
  await page.waitForLoadState("networkidle");
}

try {
  await devLogin();
  await snap("00-after-login");

  await page.goto(`${baseUrl}/account`, { waitUntil: "networkidle" });
  await page.waitForSelector('h1:has-text("Account settings")', { timeout: 15000 });
  await snap("01-account-page");

  const statsButton = page.getByRole("button", { name: "Stats" });
  const statsCount = await statsButton.count();
  console.log("Stats button count on /account:", statsCount);

  const hubNav = page.locator(".account-hub-nav");
  const hubVisible = await hubNav.isVisible();
  console.log("Account hub nav visible:", hubVisible);
  if (hubVisible) {
    console.log("Hub nav text:", (await hubNav.innerText()).replace(/\s+/g, " ").trim());
  }

  if (statsCount === 0) {
    throw new Error("Stats button not found on account page");
  }

  await statsButton.click();
  await page.waitForURL(/\/account\/stats/, { timeout: 10000 });
  await snap("02-stats-page");
  console.log("URL after click:", page.url());
  console.log("PASS: Stats nav visible and navigates to stats page");
} finally {
  await browser.close();
}
