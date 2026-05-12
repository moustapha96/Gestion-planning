"use strict";
const puppeteer = require("C:/Users/alhus/AppData/Roaming/npm/node_modules/puppeteer");
const http = require("http");
const fs   = require("fs");
const path = require("path");

const DIR  = path.join(__dirname, "screenshots_ui");
const BASE = "http://localhost:5173";
const API  = "http://localhost:3001";

function apiLogin() {
  return new Promise((res, rej) => {
    const body = JSON.stringify({ email: "admin@example.com", password: "Admin123!" });
    const req = http.request(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    }, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); });
    req.on("error", rej); req.write(body); req.end();
  });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function goAuth(page, tokens, route) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2", timeout: 20000 });
  await page.evaluate(t => {
    localStorage.setItem("accessToken",  t.accessToken);
    localStorage.setItem("refreshToken", t.refreshToken);
    localStorage.setItem("user", JSON.stringify(t.user));
  }, tokens);
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2", timeout: 20000 });
  await wait(1400);
}

async function snap(page, name) {
  await wait(1000);
  await page.screenshot({ path: path.join(DIR, `${name}.png`), fullPage: false });
  console.log("  ✓", name);
}

async function main() {
  const tokens = await apiLogin();
  console.log("✓ Auth:", tokens.user.email);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();

  // Dashboard (Tableau de bord)
  await goAuth(page, tokens, "/dashboard");
  await snap(page, "03_tableau_de_bord");

  // Planning detail — click "Voir" link/button
  await goAuth(page, tokens, "/planning");
  await wait(800);
  try {
    // Try clicking the first "Voir" button
    const voirBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button, a"));
      return btns.find(b => b.textContent.trim() === "Voir" || b.textContent.includes("Voir"));
    });
    const el = voirBtn.asElement();
    if (el) {
      await el.click();
      await wait(1800);
    }
  } catch(e) { console.log("  - Voir btn not found:", e.message); }
  await snap(page, "05_planning_detail");

  // Réunion detail — click first row
  await goAuth(page, tokens, "/meetings");
  await wait(800);
  try {
    const rows = await page.$$("tr.ant-table-row, tbody tr");
    if (rows.length > 0) { await rows[0].click(); await wait(1600); }
  } catch(e) { console.log("  - meeting row:", e.message); }
  await snap(page, "06b_reunion_detail");

  // Mission detail — click first row
  await goAuth(page, tokens, "/missions");
  await wait(800);
  try {
    const rows = await page.$$("tr.ant-table-row, tbody tr");
    if (rows.length > 0) { await rows[0].click(); await wait(1600); }
  } catch(e) { console.log("  - mission row:", e.message); }
  await snap(page, "08b_mission_detail");

  // Forgot password page
  await page.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle2" });
  await wait(1200);
  await snap(page, "01b_forgot_password");

  // Admin - Utilisateurs sub-menu
  await goAuth(page, tokens, "/admin");
  await wait(1000);
  try {
    const menuItems = await page.$$(".ant-menu-item, li[role='menuitem']");
    if (menuItems.length > 1) { await menuItems[1].click(); await wait(1400); }
  } catch(e) {}
  await snap(page, "14b_admin_utilisateurs");

  // Admin - Salles sub-menu
  await goAuth(page, tokens, "/admin");
  await wait(1000);
  try {
    const menuItems = await page.$$(".ant-menu-item, li[role='menuitem']");
    if (menuItems.length > 3) { await menuItems[3].click(); await wait(1400); }
  } catch(e) {}
  await snap(page, "14c_admin_salles");

  await browser.close();
  console.log("\n✅ Extra screenshots done.");
}

main().catch(console.error);
