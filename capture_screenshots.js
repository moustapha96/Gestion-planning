"use strict";
const puppeteer = require("C:/Users/alhus/AppData/Roaming/npm/node_modules/puppeteer");
const fs   = require("fs");
const path = require("path");
const http = require("http");

const BASE_URL       = "http://localhost:5173";
const API_URL        = "http://localhost:3001";
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots_ui");
const CREDENTIALS    = { email: "admin@example.com", password: "Admin123!" };

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function apiLogin() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(CREDENTIALS);
    const req  = http.request(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    }, res => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function injectTokens(page, tokens) {
  await page.evaluate(t => {
    localStorage.setItem("accessToken",  t.accessToken);
    localStorage.setItem("refreshToken", t.refreshToken);
    localStorage.setItem("user", JSON.stringify(t.user));
  }, tokens);
}

async function capture(page, tokens, name, route, opts = {}) {
  try {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle2", timeout: 20000 });
    // Re-inject tokens on every page load to be safe
    await injectTokens(page, tokens);
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle2", timeout: 20000 });

    if (opts.clickSel) {
      const el = await page.$(opts.clickSel);
      if (el) { await el.click(); await wait(1500); }
    }
    if (opts.extraWait) await wait(opts.extraWait);

    await wait(1200);
    const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  ✓ ${name}`);
    return file;
  } catch(e) {
    console.log(`  ✗ ${name}: ${e.message.split("\n")[0]}`);
    return null;
  }
}

async function main() {
  console.log("→ Authenticating...");
  const tokens = await apiLogin();
  if (!tokens.accessToken) { console.error("Auth failed:", tokens); process.exit(1); }
  console.log(`  ✓ ${tokens.user.email} (${tokens.user.role})`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();

  // Capture login page BEFORE injecting tokens
  console.log("\n— Public pages —");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
  await wait(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "01_login.png") });
  console.log("  ✓ 01_login");

  // Inject tokens once on base URL
  await page.goto(BASE_URL, { waitUntil: "networkidle2" });
  await injectTokens(page, tokens);

  // Home / public page
  await capture(page, tokens, "02_home_public",   "/home",           { extraWait: 500 });

  console.log("\n— Tableau de bord —");
  await capture(page, tokens, "03_dashboard",      "/",               { extraWait: 1000 });

  console.log("\n— Planning —");
  await capture(page, tokens, "04_planning_liste",  "/planning",       { extraWait: 800 });
  await capture(page, tokens, "05_planning_detail", "/planning",       {
    clickSel: ".ant-table-row:first-child, table tbody tr:first-child",
    extraWait: 1000
  });

  console.log("\n— Réunions —");
  await capture(page, tokens, "06_reunions_liste",  "/meetings",       { extraWait: 800 });
  await capture(page, tokens, "07_reunion_form",    "/meetings/new",   { extraWait: 800 });

  console.log("\n— Missions —");
  await capture(page, tokens, "08_missions_liste",  "/missions",       { extraWait: 800 });
  await capture(page, tokens, "09_mission_create",  "/missions/new",   { extraWait: 800 });

  console.log("\n— Événements & Calendrier —");
  await capture(page, tokens, "10_evenements",      "/events",         { extraWait: 800 });
  await capture(page, tokens, "11_calendrier",      "/calendar",       { extraWait: 1500 });

  console.log("\n— Communication —");
  await capture(page, tokens, "12_notifications",   "/notifications",  { extraWait: 800 });
  await capture(page, tokens, "13_discussions",     "/discussions",    { extraWait: 800 });

  console.log("\n— Administration —");
  await capture(page, tokens, "14_utilisateurs",    "/users",          { extraWait: 800 });
  await capture(page, tokens, "15_admin_notifs",    "/admin",          { extraWait: 1000 });
  // Admin tabs
  await capture(page, tokens, "16_admin_plannings", "/admin", {
    clickSel: ".ant-tabs-tab:nth-child(2)",
    extraWait: 1000
  });
  await capture(page, tokens, "17_admin_stats",     "/admin", {
    clickSel: ".ant-tabs-tab:nth-child(3)",
    extraWait: 1200
  });
  await capture(page, tokens, "18_admin_backups",   "/admin", {
    clickSel: ".ant-tabs-tab:nth-child(4)",
    extraWait: 800
  });

  console.log("\n— Autres modules —");
  await capture(page, tokens, "19_repertoire",      "/repertoire",     { extraWait: 800 });
  await capture(page, tokens, "20_profil",          "/profile",        { extraWait: 800 });
  await capture(page, tokens, "21_projets",         "/projects",       { extraWait: 800 });
  await capture(page, tokens, "22_salles",          "/rooms",          { extraWait: 800 });

  await browser.close();

  const pngs = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith(".png"));
  console.log(`\n✅ ${pngs.length} screenshots — ${SCREENSHOTS_DIR}`);
}

main().catch(console.error);
