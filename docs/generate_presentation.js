const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "ADM - Agence de Développement Municipal";
pres.title = "Système de Gestion de Planning - ADM";

// ─── COLOR PALETTE ────────────────────────────────────────────────────
const C = {
  navy:       "0D2B5E",  // dark navy (dominant background)
  blue:       "1565C0",  // ADM blue
  lightBlue:  "1976D2",
  cyan:       "0288D1",
  teal:       "0097A7",
  white:      "FFFFFF",
  offWhite:   "F0F4FF",
  light:      "E8EEF9",
  muted:      "8FA8C8",
  mutedDark:  "5E7A9A",
  accent:     "42A5F5",  // bright accent
  accentGold: "FFB300",
  green:      "2E7D32",
  greenLight: "43A047",
  orange:     "E65100",
  purple:     "6A1B9A",
  red:        "C62828",
  darkBg:     "071630",
  cardBg:     "112244",
  cardBorder: "1E3A6E",
};

const makeShadow = () => ({ type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.18 });

// ─── HELPERS ──────────────────────────────────────────────────────────
function addNavyBackground(slide) {
  slide.background = { color: C.navy };
}

function addLightBackground(slide) {
  slide.background = { color: "F5F7FC" };
}

function sectionTag(slide, text, x, y) {
  // pill tag
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w: 1.8, h: 0.28,
    fill: { color: C.accent, transparency: 20 },
    line: { color: C.accent, width: 0 },
    rectRadius: 0.05,
  });
  slide.addText(text.toUpperCase(), {
    x, y: y + 0.01, w: 1.8, h: 0.28,
    fontSize: 7.5, bold: true, color: C.navy,
    align: "center", valign: "middle", margin: 0,
  });
}

function sectionHeader(slide, title, subtitle, dark = true) {
  const titleColor = dark ? C.white : C.navy;
  const subColor   = dark ? C.muted  : C.mutedDark;
  slide.addText(title, {
    x: 0.55, y: 0.22, w: 8.9, h: 0.55,
    fontSize: 26, bold: true, color: titleColor,
    fontFace: "Calibri", align: "left",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.55, y: 0.78, w: 8.9, h: 0.3,
      fontSize: 11.5, color: subColor, fontFace: "Calibri", align: "left",
    });
  }
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.55, y: 1.1, w: 8.9, h: 0.025,
    fill: { color: dark ? C.cardBorder : C.light },
    line: { color: dark ? C.cardBorder : C.light },
  });
}

function card(slide, x, y, w, h, fillColor, opts = {}) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: fillColor || C.cardBg },
    line: { color: opts.border || C.cardBorder, width: opts.borderWidth || 1 },
    shadow: opts.shadow ? makeShadow() : undefined,
  });
}

function accentCard(slide, x, y, w, h, accentColor) {
  card(slide, x, y, w, h, C.cardBg);
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w: 0.06, h,
    fill: { color: accentColor },
    line: { color: accentColor },
  });
}

function iconCircle(slide, x, y, r, fillColor) {
  slide.addShape(pres.shapes.OVAL, {
    x: x - r, y: y - r, w: r * 2, h: r * 2,
    fill: { color: fillColor, transparency: 15 },
    line: { color: fillColor, transparency: 40, width: 1 },
  });
}

function badge(slide, x, y, text, bgColor, textColor) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w: 1.3, h: 0.27,
    fill: { color: bgColor, transparency: 10 },
    line: { color: bgColor, transparency: 30 },
    rectRadius: 0.04,
  });
  slide.addText(text, {
    x, y: y + 0.01, w: 1.3, h: 0.27,
    fontSize: 8, bold: true, color: textColor || C.white,
    align: "center", valign: "middle", margin: 0,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 1 — TITLE SLIDE
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  addNavyBackground(slide);

  // Diagonal accent shape bottom-right
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 6.5, y: 2.8, w: 3.8, h: 3.2,
    fill: { color: C.blue, transparency: 82 },
    line: { color: C.blue, transparency: 80 },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 7.8, y: 0, w: 2.5, h: 5.625,
    fill: { color: C.lightBlue, transparency: 90 },
    line: { color: C.lightBlue, transparency: 88 },
  });

  // Top accent bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.07,
    fill: { color: C.accent },
    line: { color: C.accent },
  });

  // Logo area placeholder
  slide.addShape(pres.shapes.OVAL, {
    x: 0.55, y: 0.5, w: 1.0, h: 1.0,
    fill: { color: C.blue, transparency: 10 },
    line: { color: C.accent, width: 2 },
  });
  slide.addText("ADM", {
    x: 0.55, y: 0.5, w: 1.0, h: 1.0,
    fontSize: 16, bold: true, color: C.white,
    align: "center", valign: "middle", margin: 0,
    fontFace: "Calibri",
  });

  // Organization name
  slide.addText("Agence de Développement Municipal", {
    x: 1.7, y: 0.6, w: 6, h: 0.38,
    fontSize: 11, color: C.muted, fontFace: "Calibri", bold: false,
  });

  // Main title
  slide.addText("Système de Gestion\nde Planning", {
    x: 0.55, y: 1.55, w: 7.5, h: 1.6,
    fontSize: 42, bold: true, color: C.white,
    fontFace: "Calibri", align: "left", valign: "middle",
  });

  // Subtitle
  slide.addText("Application web de planification, coordination et suivi des activités", {
    x: 0.55, y: 3.2, w: 7.0, h: 0.55,
    fontSize: 14, color: C.accent, fontFace: "Calibri", align: "left",
  });

  // Three feature pills
  const pills = ["Plannings", "Réunions", "Missions", "Calendrier", "Notifications"];
  pills.forEach((p, i) => {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.55 + i * 1.72, y: 4.0, w: 1.55, h: 0.32,
      fill: { color: C.cardBg },
      line: { color: C.accent, width: 1 },
      rectRadius: 0.06,
    });
    slide.addText(p, {
      x: 0.55 + i * 1.72, y: 4.01, w: 1.55, h: 0.32,
      fontSize: 9, color: C.accent, align: "center", valign: "middle",
      margin: 0, fontFace: "Calibri",
    });
  });

  // Bottom bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.3, w: 10, h: 0.325,
    fill: { color: C.darkBg },
    line: { color: C.darkBg },
  });
  slide.addText("2025 — Document de Présentation Officiel", {
    x: 0.4, y: 5.3, w: 9.2, h: 0.325,
    fontSize: 9, color: C.muted, align: "left", valign: "middle", margin: 0,
  });
  slide.addText("Confidentiel", {
    x: 0.4, y: 5.3, w: 9.2, h: 0.325,
    fontSize: 9, color: C.muted, align: "right", valign: "middle", margin: 0,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 2 — SOMMAIRE
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  addNavyBackground(slide);
  sectionHeader(slide, "Sommaire", "Vue d'ensemble des modules présentés");

  const sections = [
    { n: "01", title: "Authentification & Profil",    desc: "Connexion sécurisée, 2FA, gestion du profil utilisateur" },
    { n: "02", title: "Tableau de Bord",               desc: "Métriques en temps réel, statistiques journalières et hebdomadaires" },
    { n: "03", title: "Gestion des Plannings",         desc: "Workflow multi-étapes, soumission, validation et consolidation" },
    { n: "04", title: "Calendrier & Événements",       desc: "Vue hebdomadaire, filtres avancés, export PDF" },
    { n: "05", title: "Gestion des Réunions",          desc: "Création, participants, fichiers joints, messagerie" },
    { n: "06", title: "Missions & Projets",            desc: "Suivi des missions terrain et gestion de projets" },
    { n: "07", title: "Salles & Ressources",           desc: "Disponibilité des salles, équipements, planning d'occupation" },
    { n: "08", title: "Notifications & Messagerie",    desc: "Centre de notifications, discussions temps réel" },
    { n: "09", title: "Administration",                desc: "Gestion utilisateurs, rôles, audit et statistiques" },
    { n: "10", title: "Architecture Technique",        desc: "Stack technologique, sécurité, déploiement" },
  ];

  // Two columns
  const col1 = sections.slice(0, 5);
  const col2 = sections.slice(5, 10);

  const renderCol = (items, startX) => {
    items.forEach((item, i) => {
      const y = 1.28 + i * 0.84;
      accentCard(slide, startX, y, 4.5, 0.72, C.cyan);
      slide.addText(item.n, {
        x: startX + 0.15, y: y + 0.05, w: 0.5, h: 0.35,
        fontSize: 18, bold: true, color: C.accent, fontFace: "Calibri",
        align: "center", valign: "middle", margin: 0,
      });
      slide.addText(item.title, {
        x: startX + 0.7, y: y + 0.06, w: 3.7, h: 0.3,
        fontSize: 11, bold: true, color: C.white, fontFace: "Calibri",
      });
      slide.addText(item.desc, {
        x: startX + 0.7, y: y + 0.38, w: 3.7, h: 0.28,
        fontSize: 8.5, color: C.muted, fontFace: "Calibri",
      });
    });
  };

  renderCol(col1, 0.4);
  renderCol(col2, 5.1);
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 3 — AUTHENTIFICATION
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  addNavyBackground(slide);
  sectionTag(slide, "Module 01", 0.4, 0.15);
  sectionHeader(slide, "Authentification & Profil Utilisateur", "Accès sécurisé avec double authentification et gestion complète du profil");

  // Main login mockup (left panel)
  card(slide, 0.4, 1.25, 4.5, 3.9, C.cardBg, { shadow: true });

  // Mock login form
  slide.addText("Connexion", {
    x: 0.65, y: 1.45, w: 4.0, h: 0.4,
    fontSize: 18, bold: true, color: C.white, fontFace: "Calibri", align: "center",
  });
  slide.addText("Système de Gestion de Planning — ADM", {
    x: 0.65, y: 1.85, w: 4.0, h: 0.28,
    fontSize: 9, color: C.muted, fontFace: "Calibri", align: "center",
  });

  // Fields
  const fields = [
    { label: "Adresse Email", y: 2.25 },
    { label: "Mot de Passe", y: 2.75 },
  ];
  fields.forEach(f => {
    slide.addText(f.label, {
      x: 0.75, y: f.y, w: 3.8, h: 0.22,
      fontSize: 8.5, color: C.muted, fontFace: "Calibri",
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.75, y: f.y + 0.22, w: 3.8, h: 0.38,
      fill: { color: C.darkBg },
      line: { color: C.cardBorder, width: 1 },
    });
  });

  // 2FA Section
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.75, y: 3.35, w: 3.8, h: 0.5,
    fill: { color: C.darkBg, transparency: 30 },
    line: { color: C.accent, width: 1 },
  });
  slide.addText("🔐  Code d'authentification à deux facteurs (2FA)", {
    x: 0.8, y: 3.38, w: 3.6, h: 0.44,
    fontSize: 8.5, color: C.accent, fontFace: "Calibri", valign: "middle",
  });

  // Login button
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.75, y: 4.0, w: 3.8, h: 0.42,
    fill: { color: C.blue },
    line: { color: C.blue },
  });
  slide.addText("Se Connecter →", {
    x: 0.75, y: 4.0, w: 3.8, h: 0.42,
    fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle",
    margin: 0, fontFace: "Calibri",
  });
  slide.addText("Mot de passe oublié ?", {
    x: 0.75, y: 4.56, w: 3.8, h: 0.28,
    fontSize: 9, color: C.accent, align: "center", fontFace: "Calibri",
  });

  // Right side — feature list
  const features = [
    { icon: "🔑", title: "Authentification JWT",        desc: "Access token (15 min) + refresh token (7 jours)" },
    { icon: "📱", title: "Double Authentification",     desc: "TOTP via application mobile (Google Authenticator)" },
    { icon: "👤", title: "Gestion du Profil",           desc: "Photo, infos personnelles, mot de passe, affectations" },
    { icon: "🎭", title: "Contrôle par Rôles",          desc: "7 rôles : Responsable, Consolidateur, DG, Admin…" },
    { icon: "🔒", title: "Sécurité Renforcée",          desc: "Historique mots de passe, indicateur de force" },
  ];

  slide.addText("Fonctionnalités de Sécurité", {
    x: 5.25, y: 1.25, w: 4.45, h: 0.38,
    fontSize: 14, bold: true, color: C.white, fontFace: "Calibri",
  });

  features.forEach((f, i) => {
    const fy = 1.72 + i * 0.78;
    accentCard(slide, 5.25, fy, 4.45, 0.65, C.blue);
    slide.addText(f.icon, {
      x: 5.35, y: fy + 0.08, w: 0.5, h: 0.48,
      fontSize: 18, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(f.title, {
      x: 5.9, y: fy + 0.07, w: 3.7, h: 0.25,
      fontSize: 10.5, bold: true, color: C.white, fontFace: "Calibri",
    });
    slide.addText(f.desc, {
      x: 5.9, y: fy + 0.33, w: 3.7, h: 0.25,
      fontSize: 8.5, color: C.muted, fontFace: "Calibri",
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 4 — TABLEAU DE BORD
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  addNavyBackground(slide);
  sectionTag(slide, "Module 02", 0.4, 0.15);
  sectionHeader(slide, "Tableau de Bord", "Vue centralisée des métriques en temps réel et indicateurs clés de performance");

  // KPI Cards row
  const kpis = [
    { val: "12", label: "Salles Total",     sub: "+2 ce mois",  color: C.cyan,   icon: "🏢" },
    { val: "7",  label: "Salles Libres",    sub: "Disponibles", color: C.greenLight, icon: "✅" },
    { val: "5",  label: "Réunions Auj.",    sub: "Planifiées",  color: C.blue,   icon: "📅" },
    { val: "23", label: "Plannings Sem.",   sub: "En cours",    color: C.accentGold, icon: "📋" },
  ];

  kpis.forEach((k, i) => {
    const x = 0.4 + i * 2.32;
    card(slide, x, 1.28, 2.12, 1.1, C.cardBg, { shadow: true });
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.28, w: 2.12, h: 0.07,
      fill: { color: k.color },
      line: { color: k.color },
    });
    slide.addText(k.icon + "  " + k.val, {
      x: x + 0.12, y: 1.36, w: 1.88, h: 0.48,
      fontSize: 26, bold: true, color: C.white, fontFace: "Calibri", valign: "middle",
    });
    slide.addText(k.label, {
      x: x + 0.12, y: 1.84, w: 1.88, h: 0.25,
      fontSize: 9.5, color: C.muted, fontFace: "Calibri",
    });
    slide.addText(k.sub, {
      x: x + 0.12, y: 2.07, w: 1.88, h: 0.22,
      fontSize: 8.5, color: k.color, fontFace: "Calibri",
    });
  });

  // Weekly occupancy chart
  card(slide, 0.4, 2.55, 5.8, 2.7, C.cardBg);
  slide.addText("Taux d'Occupation — Semaine en cours", {
    x: 0.6, y: 2.65, w: 5.4, h: 0.3,
    fontSize: 11, bold: true, color: C.white, fontFace: "Calibri",
  });

  const chartData = [{
    name: "Occupation (%)",
    labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
    values: [65, 80, 55, 90, 70, 30],
  }];
  slide.addChart(pres.charts.BAR, chartData, {
    x: 0.45, y: 2.95, w: 5.7, h: 2.15, barDir: "col",
    chartColors: [C.cyan],
    chartArea: { fill: { color: C.cardBg } },
    catAxisLabelColor: C.muted,
    valAxisLabelColor: C.muted,
    valGridLine: { color: C.cardBorder, size: 0.5 },
    catGridLine: { style: "none" },
    showValue: true,
    dataLabelColor: C.white,
    dataLabelFontSize: 9,
    dataLabelPosition: "outEnd",
    showLegend: false,
    valAxisMaxVal: 100,
  });

  // Room status list
  card(slide, 6.4, 2.55, 3.3, 2.7, C.cardBg);
  slide.addText("Statut des Salles", {
    x: 6.6, y: 2.65, w: 2.9, h: 0.3,
    fontSize: 11, bold: true, color: C.white, fontFace: "Calibri",
  });

  const rooms = [
    { name: "Salle Conseil",    status: "Occupée",    color: C.red },
    { name: "Salle Formation",  status: "Libre",       color: C.greenLight },
    { name: "Salle Réunion A",  status: "Libre",       color: C.greenLight },
    { name: "Salle Direction",  status: "Occupée",    color: C.red },
    { name: "Salle Conférence", status: "Désactivée", color: C.mutedDark },
  ];
  rooms.forEach((r, i) => {
    slide.addShape(pres.shapes.OVAL, {
      x: 6.55, y: 3.06 + i * 0.42 + 0.06, w: 0.15, h: 0.15,
      fill: { color: r.color }, line: { color: r.color },
    });
    slide.addText(r.name, {
      x: 6.75, y: 3.06 + i * 0.42, w: 2.0, h: 0.32,
      fontSize: 9, color: C.white, fontFace: "Calibri", valign: "middle",
    });
    slide.addText(r.status, {
      x: 8.8, y: 3.06 + i * 0.42, w: 0.85, h: 0.32,
      fontSize: 8, color: r.color, fontFace: "Calibri", align: "right", valign: "middle",
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 5 — GESTION DES PLANNINGS
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  addNavyBackground(slide);
  sectionTag(slide, "Module 03", 0.4, 0.15);
  sectionHeader(slide, "Gestion des Plannings", "Workflow multi-étapes avec validation hiérarchique et suivi en temps réel");

  // Workflow steps
  const steps = [
    { n: 1, label: "Brouillon",      color: C.mutedDark, icon: "📝" },
    { n: 2, label: "Soumis",         color: C.accent,    icon: "📤" },
    { n: 3, label: "En Conso.",      color: C.cyan,      icon: "🔄" },
    { n: 4, label: "Validé SG",      color: C.blue,      icon: "✅" },
    { n: 5, label: "Validé DG",      color: C.greenLight, icon: "🏆" },
    { n: 6, label: "Retourné",       color: C.orange,    icon: "↩️" },
  ];

  slide.addText("Workflow d'Approbation", {
    x: 0.4, y: 1.25, w: 9.2, h: 0.32,
    fontSize: 12, bold: true, color: C.muted, fontFace: "Calibri",
  });

  steps.forEach((s, i) => {
    const x = 0.35 + i * 1.57;
    // Circle
    slide.addShape(pres.shapes.OVAL, {
      x: x + 0.35, y: 1.62, w: 0.7, h: 0.7,
      fill: { color: s.color, transparency: 15 },
      line: { color: s.color, width: 2 },
    });
    slide.addText(s.icon, {
      x: x + 0.35, y: 1.62, w: 0.7, h: 0.7,
      fontSize: 14, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(s.label, {
      x: x, y: 2.38, w: 1.4, h: 0.3,
      fontSize: 8.5, color: C.white, fontFace: "Calibri", align: "center",
    });
    // Arrow between steps
    if (i < steps.length - 1) {
      slide.addShape(pres.shapes.LINE, {
        x: x + 1.1, y: 1.97, w: 0.47, h: 0,
        line: { color: C.cardBorder, width: 1.5, dashType: "dash" },
      });
    }
  });

  // Table mockup
  card(slide, 0.4, 2.82, 9.2, 2.5, C.cardBg);
  // Table header
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 2.82, w: 9.2, h: 0.36,
    fill: { color: C.darkBg },
    line: { color: C.cardBorder },
  });

  const tHeaders = ["Titre du Planning", "Direction", "Période", "Statut", "Créé par", "Actions"];
  const tWidths  = [2.5, 1.6, 1.8, 1.2, 1.3, 0.8];
  let tx = 0.55;
  tHeaders.forEach((h, i) => {
    slide.addText(h, {
      x: tx, y: 2.84, w: tWidths[i], h: 0.32,
      fontSize: 9, bold: true, color: C.accent, fontFace: "Calibri", valign: "middle",
    });
    tx += tWidths[i];
  });

  const rows = [
    ["Planning Dir. Finances — S20",   "Direction Financière", "13–17 Mai 2025", "Validé DG",   "Mbaye, S.",   "…"],
    ["Planning Technique — S19",        "Direction Technique",   "6–10 Mai 2025",  "Soumis",      "Diallo, A.",  "…"],
    ["Planning RH Consolidé — S21",     "DRH",                   "20–24 Mai 2025", "En Conso.",   "Ndiaye, F.",  "…"],
    ["Planning Commercial — S18",       "Dir. Commerciale",      "29 Avr–3 Mai",   "Retourné",    "Sow, M.",     "…"],
  ];

  const statusColors = {
    "Validé DG":  C.greenLight,
    "Soumis":     C.accent,
    "En Conso.":  C.cyan,
    "Retourné":   C.orange,
  };

  rows.forEach((row, ri) => {
    const ry = 3.22 + ri * 0.48;
    if (ri % 2 === 1) {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: 0.4, y: ry, w: 9.2, h: 0.42,
        fill: { color: C.darkBg, transparency: 50 },
        line: { color: C.cardBorder, transparency: 80 },
      });
    }
    let cx = 0.55;
    row.forEach((cell, ci) => {
      if (ci === 3) {
        const sc = statusColors[cell] || C.muted;
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: cx, y: ry + 0.08, w: 1.1, h: 0.26,
          fill: { color: sc, transparency: 75 },
          line: { color: sc, transparency: 40 },
          rectRadius: 0.04,
        });
        slide.addText(cell, {
          x: cx, y: ry + 0.08, w: 1.1, h: 0.26,
          fontSize: 7.5, bold: true, color: sc,
          align: "center", valign: "middle", margin: 0, fontFace: "Calibri",
        });
      } else {
        slide.addText(cell, {
          x: cx, y: ry, w: tWidths[ci], h: 0.42,
          fontSize: 8.5, color: C.white, fontFace: "Calibri", valign: "middle",
        });
      }
      cx += tWidths[ci];
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 6 — CALENDRIER & ÉVÉNEMENTS
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  addNavyBackground(slide);
  sectionTag(slide, "Module 04", 0.4, 0.15);
  sectionHeader(slide, "Calendrier & Événements", "Vue hebdomadaire interactive avec code couleur par type d'événement");

  // Calendar mockup
  card(slide, 0.4, 1.22, 6.1, 4.1, C.cardBg);

  // Day headers
  const days = ["Lun 13", "Mar 14", "Mer 15", "Jeu 16", "Ven 17"];
  const colW = 1.0;
  const startX = 1.02;

  slide.addText("Semaine 20 — Mai 2025", {
    x: 0.55, y: 1.28, w: 5.8, h: 0.3,
    fontSize: 10.5, bold: true, color: C.white, fontFace: "Calibri",
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 1.6, w: 6.1, h: 0.3,
    fill: { color: C.darkBg },
    line: { color: C.cardBorder },
  });
  slide.addText("Heure", {
    x: 0.45, y: 1.63, w: 0.55, h: 0.25,
    fontSize: 7.5, color: C.muted, fontFace: "Calibri", align: "center",
  });
  days.forEach((d, i) => {
    slide.addText(d, {
      x: startX + i * colW, y: 1.63, w: colW, h: 0.25,
      fontSize: 8, bold: true, color: C.white, fontFace: "Calibri", align: "center",
    });
  });

  // Time slots
  const hours = ["8h", "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h"];
  const slotH = 0.34;
  hours.forEach((h, i) => {
    const hy = 1.92 + i * slotH;
    slide.addText(h, {
      x: 0.42, y: hy, w: 0.55, h: slotH,
      fontSize: 7.5, color: C.muted, fontFace: "Calibri", align: "center",
    });
    slide.addShape(pres.shapes.LINE, {
      x: 0.4, y: hy, w: 6.1, h: 0,
      line: { color: C.cardBorder, width: 0.5 },
    });
  });

  // Events on calendar
  const events = [
    { day: 0, start: 1, span: 2, label: "Réunion Budget",   color: C.blue },
    { day: 1, start: 2, span: 3, label: "Formation Dev",    color: C.cyan },
    { day: 2, start: 0, span: 2, label: "Réunion DG",       color: C.orange },
    { day: 3, start: 3, span: 2, label: "Mission Terrain",  color: C.purple },
    { day: 4, start: 1, span: 4, label: "Séminaire ADM",    color: C.greenLight },
    { day: 1, start: 6, span: 2, label: "Comité Pilotage",  color: C.accent },
    { day: 3, start: 7, span: 1, label: "Point Hebdo",      color: C.teal },
  ];

  events.forEach(ev => {
    const ex = startX + ev.day * colW + 0.04;
    const ey = 1.92 + ev.start * slotH;
    const eh = ev.span * slotH - 0.04;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: ex, y: ey, w: colW - 0.08, h: eh,
      fill: { color: ev.color, transparency: 30 },
      line: { color: ev.color, width: 1 },
    });
    slide.addText(ev.label, {
      x: ex + 0.04, y: ey + 0.02, w: colW - 0.16, h: eh - 0.04,
      fontSize: 7, color: C.white, fontFace: "Calibri",
      align: "left", valign: "top",
    });
  });

  // Legend & features (right side)
  slide.addText("Légende des Événements", {
    x: 6.7, y: 1.25, w: 3.0, h: 0.32,
    fontSize: 11, bold: true, color: C.white, fontFace: "Calibri",
  });

  const legend = [
    { color: C.blue,       label: "Réunions" },
    { color: C.orange,     label: "Plannings" },
    { color: C.greenLight, label: "Missions" },
    { color: C.cyan,       label: "Formations" },
    { color: C.purple,     label: "Missions Terrain" },
  ];
  legend.forEach((l, i) => {
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 6.7, y: 1.62 + i * 0.35, w: 0.25, h: 0.2,
      fill: { color: l.color }, line: { color: l.color },
    });
    slide.addText(l.label, {
      x: 7.02, y: 1.62 + i * 0.35, w: 2.6, h: 0.22,
      fontSize: 9.5, color: C.white, fontFace: "Calibri", valign: "middle",
    });
  });

  slide.addShape(pres.shapes.LINE, {
    x: 6.7, y: 3.48, w: 3.0, h: 0,
    line: { color: C.cardBorder, width: 1 },
  });

  slide.addText("Fonctionnalités", {
    x: 6.7, y: 3.55, w: 3.0, h: 0.3,
    fontSize: 11, bold: true, color: C.white, fontFace: "Calibri",
  });

  const calFeatures = [
    "Navigation semaine précédente / suivante",
    "Grille horaire 7h00 – 21h00",
    "Filtres par type et direction",
    "Export PDF et impression",
    "Recherche d'événements avancée",
  ];
  calFeatures.forEach((f, i) => {
    slide.addShape(pres.shapes.OVAL, {
      x: 6.7, y: 3.93 + i * 0.34 + 0.08, w: 0.12, h: 0.12,
      fill: { color: C.accent }, line: { color: C.accent },
    });
    slide.addText(f, {
      x: 6.88, y: 3.93 + i * 0.34, w: 2.8, h: 0.32,
      fontSize: 9, color: C.muted, fontFace: "Calibri", valign: "middle",
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 7 — RÉUNIONS
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  addNavyBackground(slide);
  sectionTag(slide, "Module 05", 0.4, 0.15);
  sectionHeader(slide, "Gestion des Réunions", "Création, planification et suivi complet des réunions avec messagerie intégrée");

  // Left: meeting list mockup
  card(slide, 0.4, 1.25, 5.0, 3.95, C.cardBg);
  slide.addText("Liste des Réunions", {
    x: 0.6, y: 1.32, w: 4.6, h: 0.32,
    fontSize: 11, bold: true, color: C.white, fontFace: "Calibri",
  });

  // Filter bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 1.68, w: 4.6, h: 0.32,
    fill: { color: C.darkBg },
    line: { color: C.cardBorder },
  });
  slide.addText("🔍  Rechercher une réunion…", {
    x: 0.65, y: 1.68, w: 4.5, h: 0.32,
    fontSize: 8.5, color: C.mutedDark, fontFace: "Calibri", valign: "middle",
  });

  const meetings = [
    { title: "Revue Budget Q2",        date: "13 Mai 14:00", room: "Salle A",    status: "Confirmée", sc: C.greenLight },
    { title: "Comité de Direction",    date: "14 Mai 09:00", room: "Salle DG",   status: "Envoyée",   sc: C.accent },
    { title: "Formation ReactJS",      date: "15 Mai 10:00", room: "Salle Form.", status: "Brouillon", sc: C.mutedDark },
    { title: "Réunion Technique",      date: "16 Mai 15:00", room: "Salle B",    status: "Confirmée", sc: C.greenLight },
    { title: "Revue Mensuelle",        date: "17 Mai 11:00", room: "Conf. Room", status: "Annulée",   sc: C.red },
  ];

  meetings.forEach((m, i) => {
    const my = 2.07 + i * 0.62;
    if (i % 2 === 1) {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: 0.4, y: my, w: 5.0, h: 0.56,
        fill: { color: C.darkBg, transparency: 60 },
        line: { color: C.cardBorder, transparency: 90 },
      });
    }
    slide.addShape(pres.shapes.OVAL, {
      x: 0.56, y: my + 0.2, w: 0.18, h: 0.18,
      fill: { color: m.sc }, line: { color: m.sc },
    });
    slide.addText(m.title, {
      x: 0.82, y: my + 0.05, w: 2.8, h: 0.27,
      fontSize: 9.5, bold: true, color: C.white, fontFace: "Calibri",
    });
    slide.addText(m.date + " · " + m.room, {
      x: 0.82, y: my + 0.3, w: 2.8, h: 0.22,
      fontSize: 8, color: C.muted, fontFace: "Calibri",
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 3.72, y: my + 0.15, w: 1.2, h: 0.26,
      fill: { color: m.sc, transparency: 75 },
      line: { color: m.sc, transparency: 40 },
      rectRadius: 0.04,
    });
    slide.addText(m.status, {
      x: 3.72, y: my + 0.15, w: 1.2, h: 0.26,
      fontSize: 7.5, bold: true, color: m.sc,
      align: "center", valign: "middle", margin: 0, fontFace: "Calibri",
    });
  });

  // Right: feature cards
  const features = [
    { icon: "🏢", title: "Réservation de Salles",  desc: "Vérification temps réel des disponibilités et détection des conflits" },
    { icon: "👥", title: "Gestion Participants",   desc: "Invitation, suivi des confirmations, statuts de présence" },
    { icon: "📎", title: "Pièces Jointes",         desc: "Ajout de fichiers PDF, comptes rendus et documents de séance" },
    { icon: "💬", title: "Messagerie Intégrée",    desc: "Chat en temps réel entre participants de la réunion" },
    { icon: "🎥", title: "Visioconférence",        desc: "Lien de réunion à distance intégré directement dans la fiche" },
  ];

  slide.addText("Fonctionnalités Clés", {
    x: 5.6, y: 1.28, w: 4.05, h: 0.32,
    fontSize: 13, bold: true, color: C.white, fontFace: "Calibri",
  });

  features.forEach((f, i) => {
    const fy = 1.7 + i * 0.75;
    accentCard(slide, 5.6, fy, 4.05, 0.64, C.cyan);
    slide.addText(f.icon, {
      x: 5.68, y: fy + 0.06, w: 0.52, h: 0.52,
      fontSize: 18, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(f.title, {
      x: 6.25, y: fy + 0.07, w: 3.3, h: 0.25,
      fontSize: 10, bold: true, color: C.white, fontFace: "Calibri",
    });
    slide.addText(f.desc, {
      x: 6.25, y: fy + 0.34, w: 3.3, h: 0.24,
      fontSize: 8, color: C.muted, fontFace: "Calibri",
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 8 — MISSIONS & PROJETS
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  addNavyBackground(slide);
  sectionTag(slide, "Module 06", 0.4, 0.15);
  sectionHeader(slide, "Missions & Projets", "Suivi des missions terrain et gestion de portefeuille de projets");

  // Two cards side by side
  // --- MISSIONS ---
  card(slide, 0.4, 1.28, 4.5, 4.0, C.cardBg);
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 1.28, w: 4.5, h: 0.36,
    fill: { color: C.purple },
    line: { color: C.purple },
  });
  slide.addText("📍  Missions Terrain", {
    x: 0.55, y: 1.28, w: 4.2, h: 0.36,
    fontSize: 12, bold: true, color: C.white, fontFace: "Calibri", valign: "middle",
  });

  const missions = [
    { title: "Mission Contrôle Ouvrages",  loc: "Dakar Nord",  date: "12–14 Mai",   users: "3 agents", sc: C.greenLight },
    { title: "Mission Inspection Réseau",  loc: "Thiès",       date: "15–16 Mai",   users: "2 agents", sc: C.accent },
    { title: "Mission Formation Terrain",  loc: "Saint-Louis", date: "20–22 Mai",   users: "5 agents", sc: C.cyan },
    { title: "Mission Audit Sites",        loc: "Ziguinchor",  date: "27–29 Mai",   users: "4 agents", sc: C.orange },
  ];
  missions.forEach((m, i) => {
    const my = 1.72 + i * 0.73;
    accentCard(slide, 0.48, my, 4.32, 0.64, C.purple);
    slide.addText("📍", {
      x: 0.58, y: my + 0.12, w: 0.4, h: 0.4,
      fontSize: 14, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(m.title, {
      x: 1.02, y: my + 0.07, w: 2.5, h: 0.26,
      fontSize: 9.5, bold: true, color: C.white, fontFace: "Calibri",
    });
    slide.addText(m.loc + " · " + m.date, {
      x: 1.02, y: my + 0.35, w: 2.5, h: 0.22,
      fontSize: 8, color: C.muted, fontFace: "Calibri",
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 3.6, y: my + 0.19, w: 1.1, h: 0.26,
      fill: { color: m.sc, transparency: 75 },
      line: { color: m.sc, transparency: 40 },
      rectRadius: 0.04,
    });
    slide.addText(m.users, {
      x: 3.6, y: my + 0.19, w: 1.1, h: 0.26,
      fontSize: 7.5, color: m.sc, align: "center", valign: "middle",
      margin: 0, fontFace: "Calibri", bold: true,
    });
  });

  // --- PROJETS ---
  card(slide, 5.1, 1.28, 4.5, 4.0, C.cardBg);
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 5.1, y: 1.28, w: 4.5, h: 0.36,
    fill: { color: C.teal },
    line: { color: C.teal },
  });
  slide.addText("🗂️  Projets", {
    x: 5.25, y: 1.28, w: 4.2, h: 0.36,
    fontSize: 12, bold: true, color: C.white, fontFace: "Calibri", valign: "middle",
  });

  const projects = [
    { name: "Réhabilitation Voirie",    code: "ADM-001", status: "Actif",    pct: 75, color: C.greenLight },
    { name: "Système d'Eau Potable",   code: "ADM-002", status: "Actif",    pct: 45, color: C.accent },
    { name: "Marché Municipal",         code: "ADM-003", status: "En Pause", pct: 30, color: C.orange },
    { name: "Assainissement Zone Nord", code: "ADM-004", status: "Terminé", pct: 100, color: C.cyan },
  ];
  projects.forEach((p, i) => {
    const py = 1.72 + i * 0.73;
    accentCard(slide, 5.18, py, 4.32, 0.64, C.teal);
    slide.addText(p.name, {
      x: 5.32, y: py + 0.06, w: 2.6, h: 0.26,
      fontSize: 9.5, bold: true, color: C.white, fontFace: "Calibri",
    });
    slide.addText(p.code, {
      x: 5.32, y: py + 0.34, w: 1.5, h: 0.22,
      fontSize: 8, color: C.muted, fontFace: "Calibri",
    });
    // Progress bar
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 7.0, y: py + 0.38, w: 1.8, h: 0.1,
      fill: { color: C.cardBorder }, line: { color: C.cardBorder },
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 7.0, y: py + 0.38, w: 1.8 * (p.pct / 100), h: 0.1,
      fill: { color: p.color }, line: { color: p.color },
    });
    slide.addText(p.pct + "%", {
      x: 8.85, y: py + 0.3, w: 0.6, h: 0.22,
      fontSize: 8, color: p.color, fontFace: "Calibri", align: "right",
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 7.0, y: py + 0.08, w: 1.4, h: 0.24,
      fill: { color: p.color, transparency: 75 },
      line: { color: p.color, transparency: 40 },
      rectRadius: 0.04,
    });
    slide.addText(p.status, {
      x: 7.0, y: py + 0.08, w: 1.4, h: 0.24,
      fontSize: 7.5, bold: true, color: p.color,
      align: "center", valign: "middle", margin: 0, fontFace: "Calibri",
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 9 — SALLES & RESSOURCES
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  addNavyBackground(slide);
  sectionTag(slide, "Module 07", 0.4, 0.15);
  sectionHeader(slide, "Gestion des Salles & Ressources", "Disponibilité en temps réel, équipements et planning d'occupation journalier");

  // Room cards grid
  const rooms = [
    { name: "Salle du Conseil",   cap: 30, equip: "Vidéoproj, Sono, Climatisation",  status: "Libre",       sc: C.greenLight },
    { name: "Salle de Formation", cap: 20, equip: "PC x20, Tableau blanc, Wifi",       status: "Occupée",    sc: C.red },
    { name: "Salle Réunion A",    cap: 12, equip: "Télécran, Tableau, Climatisation", status: "Libre",       sc: C.greenLight },
    { name: "Salle Direction",    cap: 8,  equip: "Vidéoconf, Bureau directorial",    status: "Occupée",    sc: C.red },
    { name: "Salle Conférence",   cap: 50, equip: "Scène, Sono, Écran géant",         status: "Désactivée", sc: C.mutedDark },
    { name: "Salle Réunion B",    cap: 10, equip: "Tableau blanc, Climatisation",     status: "Libre",       sc: C.greenLight },
  ];

  rooms.forEach((r, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const rx = 0.4 + col * 3.1;
    const ry = 1.28 + row * 1.85;
    card(slide, rx, ry, 2.9, 1.7, C.cardBg, { shadow: true });

    // Status bar
    slide.addShape(pres.shapes.RECTANGLE, {
      x: rx, y: ry, w: 2.9, h: 0.06,
      fill: { color: r.sc }, line: { color: r.sc },
    });

    slide.addShape(pres.shapes.OVAL, {
      x: rx + 0.15, y: ry + 0.12, w: 0.22, h: 0.22,
      fill: { color: r.sc, transparency: 20 }, line: { color: r.sc },
    });
    slide.addText(r.status === "Libre" ? "✓" : r.status === "Occupée" ? "✕" : "–", {
      x: rx + 0.15, y: ry + 0.12, w: 0.22, h: 0.22,
      fontSize: 8, color: C.white, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(r.name, {
      x: rx + 0.44, y: ry + 0.1, w: 2.35, h: 0.28,
      fontSize: 10, bold: true, color: C.white, fontFace: "Calibri",
    });
    slide.addText("Capacité : " + r.cap + " personnes", {
      x: rx + 0.15, y: ry + 0.42, w: 2.65, h: 0.22,
      fontSize: 8.5, color: C.muted, fontFace: "Calibri",
    });
    slide.addText(r.equip, {
      x: rx + 0.15, y: ry + 0.65, w: 2.65, h: 0.42,
      fontSize: 8, color: C.mutedDark, fontFace: "Calibri",
    });
    // Status badge
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: rx + 0.15, y: ry + 1.35, w: 1.2, h: 0.24,
      fill: { color: r.sc, transparency: 75 },
      line: { color: r.sc, transparency: 30 },
      rectRadius: 0.04,
    });
    slide.addText(r.status, {
      x: rx + 0.15, y: ry + 1.35, w: 1.2, h: 0.24,
      fontSize: 7.5, bold: true, color: r.sc,
      align: "center", valign: "middle", margin: 0, fontFace: "Calibri",
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 10 — NOTIFICATIONS & MESSAGERIE
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  addNavyBackground(slide);
  sectionTag(slide, "Module 08", 0.4, 0.15);
  sectionHeader(slide, "Notifications & Messagerie", "Centre de notifications enrichi et système de messagerie directe en temps réel");

  // Notification panel mockup
  card(slide, 0.4, 1.25, 4.4, 4.0, C.cardBg);
  slide.addText("🔔  Centre de Notifications", {
    x: 0.6, y: 1.32, w: 4.0, h: 0.32,
    fontSize: 10.5, bold: true, color: C.white, fontFace: "Calibri",
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 1.66, w: 4.4, h: 0.32,
    fill: { color: C.darkBg }, line: { color: C.cardBorder },
  });

  const tabs = ["Tout (12)", "Non lu (5)", "Paramètres"];
  tabs.forEach((t, i) => {
    const isActive = i === 1;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.55 + i * 1.35, y: 1.66, w: 1.3, h: 0.32,
      fill: { color: isActive ? C.blue : C.darkBg },
      line: { color: isActive ? C.blue : C.darkBg },
    });
    slide.addText(t, {
      x: 0.55 + i * 1.35, y: 1.66, w: 1.3, h: 0.32,
      fontSize: 8.5, color: isActive ? C.white : C.muted,
      align: "center", valign: "middle", margin: 0, fontFace: "Calibri",
    });
  });

  const notifs = [
    { icon: "📋", type: "Planning",  msg: "Votre planning S20 a été validé par le DG",      time: "Il y a 5 min",  unread: true,  color: C.greenLight },
    { icon: "📅", type: "Réunion",   msg: "Réunion « Budget Q2 » commence dans 30 minutes", time: "Il y a 25 min", unread: true,  color: C.accent },
    { icon: "📍", type: "Mission",   msg: "Mission Thiès assignée à votre équipe",           time: "Il y a 1h",     unread: true,  color: C.purple },
    { icon: "👤", type: "Système",   msg: "Votre rôle a été mis à jour par l'administrateur",time: "Hier 16:32",    unread: false, color: C.cyan },
    { icon: "📢", type: "Admin",     msg: "Message broadcast : Réunion générale vendredi",   time: "Hier 09:00",    unread: false, color: C.orange },
  ];

  notifs.forEach((n, i) => {
    const ny = 2.05 + i * 0.6;
    if (n.unread) {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: 0.4, y: ny, w: 4.4, h: 0.54,
        fill: { color: C.darkBg, transparency: 30 },
        line: { color: C.cardBorder, transparency: 80 },
      });
      slide.addShape(pres.shapes.RECTANGLE, {
        x: 0.4, y: ny, w: 0.05, h: 0.54,
        fill: { color: n.color }, line: { color: n.color },
      });
    }
    slide.addText(n.icon, {
      x: 0.52, y: ny + 0.08, w: 0.4, h: 0.38,
      fontSize: 14, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(n.msg, {
      x: 0.95, y: ny + 0.04, w: 3.1, h: 0.28,
      fontSize: 8.5, color: n.unread ? C.white : C.muted, fontFace: "Calibri",
    });
    slide.addText(n.time, {
      x: 0.95, y: ny + 0.32, w: 3.1, h: 0.2,
      fontSize: 7.5, color: C.mutedDark, fontFace: "Calibri",
    });
    if (n.unread) {
      slide.addShape(pres.shapes.OVAL, {
        x: 4.58, y: ny + 0.19, w: 0.12, h: 0.12,
        fill: { color: n.color }, line: { color: n.color },
      });
    }
  });

  // Messaging panel right
  card(slide, 5.0, 1.25, 4.6, 4.0, C.cardBg);
  slide.addText("💬  Messagerie Directe", {
    x: 5.2, y: 1.32, w: 4.2, h: 0.32,
    fontSize: 10.5, bold: true, color: C.white, fontFace: "Calibri",
  });

  const convs = [
    { name: "Diallo, Amadou",   msg: "Merci pour le document…",        time: "14:32", unread: 3 },
    { name: "Ndiaye, Fatou",    msg: "La réunion est confirmée",         time: "12:15", unread: 0 },
    { name: "Équipe Technique", msg: "Planning mis à jour",              time: "11:00", unread: 1 },
    { name: "Sow, Moussa",      msg: "Peux-tu me transmettre le PV ?",  time: "Hier",  unread: 0 },
  ];

  convs.forEach((c, i) => {
    const cy = 1.7 + i * 0.68;
    slide.addShape(pres.shapes.OVAL, {
      x: 5.12, y: cy + 0.08, w: 0.44, h: 0.44,
      fill: { color: C.blue }, line: { color: C.cardBorder },
    });
    slide.addText(c.name.charAt(0), {
      x: 5.12, y: cy + 0.08, w: 0.44, h: 0.44,
      fontSize: 12, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
    slide.addText(c.name, {
      x: 5.62, y: cy + 0.06, w: 2.6, h: 0.24,
      fontSize: 9.5, bold: true, color: C.white, fontFace: "Calibri",
    });
    slide.addText(c.msg, {
      x: 5.62, y: cy + 0.32, w: 2.6, h: 0.22,
      fontSize: 8, color: C.muted, fontFace: "Calibri",
    });
    slide.addText(c.time, {
      x: 8.3, y: cy + 0.06, w: 0.9, h: 0.24,
      fontSize: 8, color: C.mutedDark, fontFace: "Calibri", align: "right",
    });
    if (c.unread > 0) {
      slide.addShape(pres.shapes.OVAL, {
        x: 8.78, y: cy + 0.32, w: 0.24, h: 0.24,
        fill: { color: C.accent }, line: { color: C.accent },
      });
      slide.addText(String(c.unread), {
        x: 8.78, y: cy + 0.32, w: 0.24, h: 0.24,
        fontSize: 8, bold: true, color: C.navy,
        align: "center", valign: "middle", margin: 0,
      });
    }
    if (i < convs.length - 1) {
      slide.addShape(pres.shapes.LINE, {
        x: 5.0, y: cy + 0.64, w: 4.6, h: 0,
        line: { color: C.cardBorder, width: 0.5 },
      });
    }
  });

  // Input area
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 5.0, y: 4.5, w: 4.6, h: 0.5,
    fill: { color: C.darkBg }, line: { color: C.cardBorder },
  });
  slide.addText("Écrire un message…", {
    x: 5.15, y: 4.5, w: 3.8, h: 0.5,
    fontSize: 8.5, color: C.mutedDark, fontFace: "Calibri", valign: "middle",
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 9.0, y: 4.5, w: 0.6, h: 0.5,
    fill: { color: C.blue }, line: { color: C.blue },
  });
  slide.addText("➤", {
    x: 9.0, y: 4.5, w: 0.6, h: 0.5,
    fontSize: 14, color: C.white, align: "center", valign: "middle", margin: 0,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 11 — ADMINISTRATION
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  addNavyBackground(slide);
  sectionTag(slide, "Module 09", 0.4, 0.15);
  sectionHeader(slide, "Panneau d'Administration", "Gestion des utilisateurs, rôles, audit complet et statistiques système");

  // Sidebar mockup
  card(slide, 0.4, 1.28, 2.1, 4.0, C.darkBg);
  slide.addText("Administration", {
    x: 0.5, y: 1.35, w: 1.9, h: 0.3,
    fontSize: 9.5, bold: true, color: C.accent, fontFace: "Calibri",
  });

  const adminMenu = [
    { icon: "👥", label: "Utilisateurs",   active: true },
    { icon: "📋", label: "Plannings",      active: false },
    { icon: "📊", label: "Statistiques",   active: false },
    { icon: "🔍", label: "Audit & Logs",   active: false },
    { icon: "🔔", label: "Notifications",  active: false },
    { icon: "🗂️", label: "Taxonomies",     active: false },
    { icon: "💾", label: "Sauvegardes",    active: false },
  ];

  adminMenu.forEach((m, i) => {
    const my = 1.72 + i * 0.48;
    if (m.active) {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: 0.4, y: my, w: 2.1, h: 0.42,
        fill: { color: C.blue, transparency: 40 },
        line: { color: C.blue },
      });
      slide.addShape(pres.shapes.RECTANGLE, {
        x: 0.4, y: my, w: 0.05, h: 0.42,
        fill: { color: C.accent }, line: { color: C.accent },
      });
    }
    slide.addText(m.icon + "  " + m.label, {
      x: 0.52, y: my, w: 1.9, h: 0.42,
      fontSize: 9, color: m.active ? C.white : C.muted, fontFace: "Calibri",
      valign: "middle",
    });
  });

  // User table
  card(slide, 2.65, 1.28, 7.0, 2.5, C.cardBg);
  slide.addText("Gestion des Utilisateurs", {
    x: 2.85, y: 1.35, w: 6.6, h: 0.3,
    fontSize: 11, bold: true, color: C.white, fontFace: "Calibri",
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 2.65, y: 1.68, w: 7.0, h: 0.32,
    fill: { color: C.darkBg }, line: { color: C.cardBorder },
  });

  const uHeaders = ["Utilisateur",   "Rôle",        "Direction",    "Statut",   "Actions"];
  const uWidths  = [2.2,              1.5,            1.8,            1.0,        0.5];
  let ux = 2.8;
  uHeaders.forEach((h, i) => {
    slide.addText(h, {
      x: ux, y: 1.7, w: uWidths[i], h: 0.28,
      fontSize: 8.5, bold: true, color: C.accent, fontFace: "Calibri", valign: "middle",
    });
    ux += uWidths[i];
  });

  const users = [
    { name: "Mbaye, Seydou",    role: "DG",            dir: "Direction Générale", status: "Actif",     rc: C.purple },
    { name: "Diallo, Amadou",   role: "Responsable",   dir: "Dir. Technique",     status: "Actif",     rc: C.blue },
    { name: "Ndiaye, Fatou",    role: "Consolidateur", dir: "DRH",                status: "Actif",     rc: C.cyan },
    { name: "Sow, Ibrahima",    role: "Admin",         dir: "Direction SI",       status: "Inactif",   rc: C.mutedDark },
  ];

  users.forEach((u, i) => {
    const uy = 2.04 + i * 0.43;
    if (i % 2 === 1) {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: 2.65, y: uy, w: 7.0, h: 0.37,
        fill: { color: C.darkBg, transparency: 60 },
        line: { color: C.cardBorder, transparency: 90 },
      });
    }
    let cx = 2.8;
    slide.addShape(pres.shapes.OVAL, {
      x: cx, y: uy + 0.08, w: 0.24, h: 0.24,
      fill: { color: C.blue }, line: { color: C.cardBorder },
    });
    slide.addText(u.name.charAt(0), {
      x: cx, y: uy + 0.08, w: 0.24, h: 0.24,
      fontSize: 8, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
    slide.addText(u.name, {
      x: cx + 0.3, y: uy, w: uWidths[0] - 0.3, h: 0.38,
      fontSize: 8.5, color: C.white, fontFace: "Calibri", valign: "middle",
    });
    cx += uWidths[0];

    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: cx, y: uy + 0.06, w: 1.25, h: 0.25,
      fill: { color: u.rc, transparency: 75 },
      line: { color: u.rc, transparency: 40 },
      rectRadius: 0.04,
    });
    slide.addText(u.role, {
      x: cx, y: uy + 0.06, w: 1.25, h: 0.25,
      fontSize: 7.5, bold: true, color: u.rc,
      align: "center", valign: "middle", margin: 0, fontFace: "Calibri",
    });
    cx += uWidths[1];

    slide.addText(u.dir, {
      x: cx, y: uy, w: uWidths[2], h: 0.38,
      fontSize: 8, color: C.muted, fontFace: "Calibri", valign: "middle",
    });
    cx += uWidths[2];

    const sc = u.status === "Actif" ? C.greenLight : C.mutedDark;
    slide.addShape(pres.shapes.OVAL, {
      x: cx + 0.15, y: uy + 0.12, w: 0.14, h: 0.14,
      fill: { color: sc }, line: { color: sc },
    });
    slide.addText(u.status, {
      x: cx + 0.32, y: uy, w: 0.65, h: 0.38,
      fontSize: 8, color: sc, fontFace: "Calibri", valign: "middle",
    });
  });

  // Stats cards + audit section
  card(slide, 2.65, 3.9, 7.0, 1.3, C.cardBg);
  slide.addText("Modules Administrateur", {
    x: 2.85, y: 3.98, w: 6.6, h: 0.28,
    fontSize: 10, bold: true, color: C.white, fontFace: "Calibri",
  });

  const adminModules = [
    { icon: "📊", label: "Statistiques", desc: "Métriques système" },
    { icon: "🔍", label: "Audit Logs",   desc: "Traçabilité complète" },
    { icon: "📢", label: "Broadcast",    desc: "Messages globaux" },
    { icon: "🗂️", label: "Taxonomies",   desc: "Directions & projets" },
    { icon: "💾", label: "Sauvegardes",  desc: "Export & restauration" },
  ];
  adminModules.forEach((m, i) => {
    const mx = 2.75 + i * 1.35;
    card(slide, mx, 4.3, 1.2, 0.75, C.darkBg, { border: C.cardBorder });
    slide.addText(m.icon, {
      x: mx, y: 4.32, w: 1.2, h: 0.3,
      fontSize: 14, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(m.label, {
      x: mx, y: 4.62, w: 1.2, h: 0.22,
      fontSize: 8.5, bold: true, color: C.white, align: "center", fontFace: "Calibri",
    });
    slide.addText(m.desc, {
      x: mx, y: 4.84, w: 1.2, h: 0.18,
      fontSize: 7, color: C.muted, align: "center", fontFace: "Calibri",
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 12 — RÉPERTOIRE & PROFIL
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  addNavyBackground(slide);
  sectionTag(slide, "Modules Additionnels", 0.4, 0.15);
  sectionHeader(slide, "Répertoire & Profil Utilisateur", "Annuaire interactif de l'organisation et gestion du profil personnel");

  // Profile mockup
  card(slide, 0.4, 1.28, 4.2, 4.0, C.cardBg);
  slide.addText("Profil Utilisateur", {
    x: 0.6, y: 1.35, w: 3.8, h: 0.3,
    fontSize: 11, bold: true, color: C.white, fontFace: "Calibri",
  });

  // Avatar circle
  slide.addShape(pres.shapes.OVAL, {
    x: 1.4, y: 1.78, w: 1.35, h: 1.35,
    fill: { color: C.blue }, line: { color: C.accent, width: 3 },
  });
  slide.addText("MD", {
    x: 1.4, y: 1.78, w: 1.35, h: 1.35,
    fontSize: 32, bold: true, color: C.white,
    align: "center", valign: "middle", margin: 0, fontFace: "Calibri",
  });

  slide.addText("Moussa Diallo", {
    x: 0.5, y: 3.2, w: 4.0, h: 0.3,
    fontSize: 13, bold: true, color: C.white, fontFace: "Calibri", align: "center",
  });
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 1.35, y: 3.52, w: 1.45, h: 0.26,
    fill: { color: C.blue, transparency: 20 },
    line: { color: C.accent, width: 1 },
    rectRadius: 0.05,
  });
  slide.addText("Responsable", {
    x: 1.35, y: 3.52, w: 1.45, h: 0.26,
    fontSize: 8, bold: true, color: C.accent,
    align: "center", valign: "middle", margin: 0,
  });

  const profileFields = [
    { label: "Email", val: "m.diallo@adm.sn" },
    { label: "Tél", val: "+221 77 123 45 67" },
    { label: "Direction", val: "Direction Technique" },
    { label: "2FA", val: "Activée ✓" },
  ];
  profileFields.forEach((f, i) => {
    slide.addText(f.label + " :", {
      x: 0.55, y: 3.88 + i * 0.3, w: 1.0, h: 0.28,
      fontSize: 8.5, color: C.muted, fontFace: "Calibri",
    });
    slide.addText(f.val, {
      x: 1.62, y: 3.88 + i * 0.3, w: 2.8, h: 0.28,
      fontSize: 8.5, color: C.white, fontFace: "Calibri",
    });
  });

  // Repertoire mockup
  card(slide, 4.8, 1.28, 4.85, 4.0, C.cardBg);
  slide.addText("📚  Répertoire des Contacts", {
    x: 5.0, y: 1.35, w: 4.4, h: 0.3,
    fontSize: 11, bold: true, color: C.white, fontFace: "Calibri",
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 5.0, y: 1.7, w: 4.4, h: 0.32,
    fill: { color: C.darkBg }, line: { color: C.cardBorder },
  });
  slide.addText("🔍  Rechercher un contact…", {
    x: 5.05, y: 1.7, w: 4.3, h: 0.32,
    fontSize: 8.5, color: C.mutedDark, fontFace: "Calibri", valign: "middle",
  });

  const contacts = [
    { name: "Mbaye, Seydou",   role: "Directeur Général",       dept: "Direction Générale" },
    { name: "Diallo, Amadou",  role: "Chef Service Technique",  dept: "Dir. Technique" },
    { name: "Ndiaye, Fatou",   role: "Responsable RH",          dept: "DRH" },
    { name: "Ba, Aissatou",    role: "Secrétaire Générale",      dept: "Secrétariat" },
    { name: "Sow, Ibrahima",   role: "Admin Système",           dept: "Direction SI" },
  ];

  contacts.forEach((c, i) => {
    const cy = 2.08 + i * 0.6;
    slide.addShape(pres.shapes.OVAL, {
      x: 5.0, y: cy + 0.1, w: 0.38, h: 0.38,
      fill: { color: C.blue, transparency: 20 },
      line: { color: C.cardBorder },
    });
    slide.addText(c.name.charAt(0), {
      x: 5.0, y: cy + 0.1, w: 0.38, h: 0.38,
      fontSize: 12, bold: true, color: C.accent,
      align: "center", valign: "middle", margin: 0,
    });
    slide.addText(c.name, {
      x: 5.44, y: cy + 0.06, w: 2.7, h: 0.24,
      fontSize: 9.5, bold: true, color: C.white, fontFace: "Calibri",
    });
    slide.addText(c.role + " · " + c.dept, {
      x: 5.44, y: cy + 0.3, w: 2.7, h: 0.22,
      fontSize: 8, color: C.muted, fontFace: "Calibri",
    });
    if (i < contacts.length - 1) {
      slide.addShape(pres.shapes.LINE, {
        x: 4.8, y: cy + 0.55, w: 4.85, h: 0,
        line: { color: C.cardBorder, width: 0.5 },
      });
    }
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 4.8, y: 5.06, w: 4.85, h: 0.2,
    fill: { color: C.darkBg }, line: { color: C.cardBorder },
  });
  slide.addText("📄 Export PDF   📝 Export Word", {
    x: 4.85, y: 5.06, w: 4.7, h: 0.2,
    fontSize: 7.5, color: C.accent, fontFace: "Calibri", align: "center", valign: "middle",
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 13 — ARCHITECTURE TECHNIQUE
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  addNavyBackground(slide);
  sectionTag(slide, "Module 10", 0.4, 0.15);
  sectionHeader(slide, "Architecture Technique", "Stack moderne, sécurité multicouches et conception scalable");

  // Three-layer architecture
  const layers = [
    {
      title: "Frontend",
      color: C.cyan,
      icon: "🖥️",
      items: ["React 19 + Vite", "Tailwind CSS 4", "Ant Design v5", "Zustand (état global)", "React Router 7", "Axios (API calls)", "PWA / Mode hors-ligne"],
    },
    {
      title: "Backend",
      color: C.blue,
      icon: "⚙️",
      items: ["Node.js + Express 5", "Prisma ORM", "JWT Access + Refresh", "2FA (TOTP/Speakeasy)", "Swagger / OpenAPI", "Winston (logging)", "Nodemailer (email)"],
    },
    {
      title: "Données & Infra",
      color: C.purple,
      icon: "🗄️",
      items: ["PostgreSQL (prod)", "SQLite (dev)", "Audit Logs (3 niveaux)", "Rate Limiting", "Password History", "Cron Jobs (rapports)", "Sauvegardes auto."],
    },
  ];

  layers.forEach((layer, i) => {
    const lx = 0.38 + i * 3.1;
    card(slide, lx, 1.28, 2.85, 4.1, C.cardBg, { shadow: true });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: lx, y: 1.28, w: 2.85, h: 0.42,
      fill: { color: layer.color, transparency: 15 },
      line: { color: layer.color },
    });
    slide.addText(layer.icon + "  " + layer.title, {
      x: lx + 0.1, y: 1.28, w: 2.65, h: 0.42,
      fontSize: 13, bold: true, color: C.white,
      fontFace: "Calibri", valign: "middle",
    });
    layer.items.forEach((item, j) => {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: lx + 0.15, y: 1.83 + j * 0.48 + 0.1, w: 0.06, h: 0.22,
        fill: { color: layer.color }, line: { color: layer.color },
      });
      slide.addText(item, {
        x: lx + 0.28, y: 1.83 + j * 0.48, w: 2.45, h: 0.42,
        fontSize: 9.5, color: C.white, fontFace: "Calibri", valign: "middle",
      });
    });
    // Arrow between layers
    if (i < 2) {
      slide.addShape(pres.shapes.LINE, {
        x: lx + 2.85, y: 3.28, w: 0.25, h: 0,
        line: { color: C.accent, width: 2 },
      });
      slide.addText("↔", {
        x: lx + 2.88, y: 3.16, w: 0.2, h: 0.24,
        fontSize: 12, color: C.accent, align: "center",
      });
    }
  });

  // Security features row
  slide.addText("Sécurité & Fiabilité", {
    x: 0.4, y: 5.22, w: 3.0, h: 0.22,
    fontSize: 9.5, bold: true, color: C.accent, fontFace: "Calibri",
  });
  const secFeatures = ["🔐 Auth 2FA", "📜 Audit trail", "⏱️ Rate limiting", "🔄 Refresh tokens", "📧 Email retry", "🔑 Pwd history"];
  secFeatures.forEach((f, i) => {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.38 + i * 1.6, y: 5.22, w: 1.4, h: 0.22,
      fill: { color: C.darkBg }, line: { color: C.cardBorder },
      rectRadius: 0.04,
    });
    slide.addText(f, {
      x: 0.38 + i * 1.6, y: 5.22, w: 1.4, h: 0.22,
      fontSize: 7.5, color: C.muted, align: "center", valign: "middle",
      margin: 0, fontFace: "Calibri",
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 14 — RÔLES & PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  addNavyBackground(slide);
  sectionTag(slide, "Gouvernance", 0.4, 0.15);
  sectionHeader(slide, "Rôles & Permissions", "Contrôle d'accès granulaire basé sur 7 rôles hiérarchiques");

  const roles = [
    { role: "Super Admin",      color: C.red,        users: "1", perms: ["Accès total système", "Sauvegardes BD", "Gestion serveur", "Suppression données"] },
    { role: "Admin",            color: C.orange,     users: "2", perms: ["Gestion utilisateurs", "Audit logs", "Statistiques", "Taxonomies"] },
    { role: "Directeur Gén.",   color: C.purple,     users: "1", perms: ["Validation finale DG", "Tous les plannings", "Statistiques globales"] },
    { role: "Secr. Général",    color: C.blue,       users: "1", perms: ["Validation SG", "Vue d'ensemble", "Rapports hebdo"] },
    { role: "Consolidateur",    color: C.cyan,       users: "5", perms: ["Consolidation plannings", "Vue multi-directions", "Commentaires"] },
    { role: "Coordinateur",     color: C.teal,       users: "10", perms: ["Gestion projet", "Assignation équipe", "Missions"] },
    { role: "Responsable",      color: C.greenLight, users: "∞", perms: ["Création planning", "Réunions", "Missions propres"] },
  ];

  roles.forEach((r, i) => {
    const col = i % 2 === 0 ? 0 : 1;
    const row = Math.floor(i / 2);
    const rx = col === 0 ? 0.4 : 5.1;
    const ry = 1.3 + row * 1.08;

    // Special handling for last item (7 items, last one centered)
    const finalRx = i === 6 ? 2.75 : rx;
    const finalW  = i === 6 ? 4.5  : 4.5;

    card(slide, finalRx, ry, finalW, 0.95, C.cardBg);
    slide.addShape(pres.shapes.RECTANGLE, {
      x: finalRx, y: ry, w: 0.07, h: 0.95,
      fill: { color: r.color }, line: { color: r.color },
    });

    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: finalRx + 0.15, y: ry + 0.08, w: 1.4, h: 0.3,
      fill: { color: r.color, transparency: 75 },
      line: { color: r.color, transparency: 30 },
      rectRadius: 0.04,
    });
    slide.addText(r.role, {
      x: finalRx + 0.15, y: ry + 0.08, w: 1.4, h: 0.3,
      fontSize: 8.5, bold: true, color: r.color,
      align: "center", valign: "middle", margin: 0, fontFace: "Calibri",
    });
    slide.addText(r.users + " util.", {
      x: finalRx + 0.15, y: ry + 0.58, w: 1.4, h: 0.28,
      fontSize: 8, color: C.muted, align: "center", fontFace: "Calibri",
    });

    const permText = r.perms.join("  ·  ");
    slide.addText(permText, {
      x: finalRx + 1.65, y: ry + 0.2, w: finalW - 1.75, h: 0.55,
      fontSize: 8.5, color: C.muted, fontFace: "Calibri", valign: "middle",
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 15 — CONCLUSION
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  addNavyBackground(slide);

  // Background accent shapes
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.07,
    fill: { color: C.accent }, line: { color: C.accent },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 7.5, y: 0, w: 2.5, h: 5.625,
    fill: { color: C.lightBlue, transparency: 90 },
    line: { color: C.lightBlue, transparency: 88 },
  });

  slide.addText("Une Solution Complète\npour la Gestion de Planning", {
    x: 0.55, y: 0.5, w: 7.0, h: 1.6,
    fontSize: 32, bold: true, color: C.white,
    fontFace: "Calibri", align: "left",
  });

  // Key numbers
  const stats = [
    { val: "10+",  label: "Modules fonctionnels" },
    { val: "7",    label: "Rôles & permissions" },
    { val: "100%", label: "Couverture workflow" },
    { val: "PWA",  label: "Mode hors-ligne" },
  ];
  stats.forEach((s, i) => {
    const sx = 0.55 + i * 2.25;
    card(slide, sx, 2.22, 2.0, 1.0, C.cardBg, { shadow: true });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: sx, y: 2.22, w: 2.0, h: 0.06,
      fill: { color: C.accent }, line: { color: C.accent },
    });
    slide.addText(s.val, {
      x: sx, y: 2.3, w: 2.0, h: 0.52,
      fontSize: 30, bold: true, color: C.accent,
      align: "center", valign: "middle", fontFace: "Calibri",
    });
    slide.addText(s.label, {
      x: sx, y: 2.82, w: 2.0, h: 0.32,
      fontSize: 9, color: C.muted, align: "center", fontFace: "Calibri",
    });
  });

  // Bottom summary
  slide.addText("Le Système de Gestion de Planning ADM centralise la planification des activités, optimise l'utilisation des ressources et garantit une traçabilité complète à travers un workflow d'approbation multi-niveaux.", {
    x: 0.55, y: 3.38, w: 7.2, h: 0.88,
    fontSize: 11.5, color: C.muted, fontFace: "Calibri",
    align: "left", valign: "top",
  });

  // Contact info
  card(slide, 0.4, 4.45, 9.2, 0.78, C.darkBg);
  slide.addText("Agence de Développement Municipal (ADM)", {
    x: 0.6, y: 4.5, w: 5.0, h: 0.3,
    fontSize: 10.5, bold: true, color: C.white, fontFace: "Calibri",
  });
  slide.addText("khouma964@gmail.com", {
    x: 0.6, y: 4.8, w: 5.0, h: 0.28,
    fontSize: 9, color: C.muted, fontFace: "Calibri",
  });
  slide.addText("Système de Gestion de Planning — v2.0", {
    x: 5.8, y: 4.6, w: 3.6, h: 0.5,
    fontSize: 9, color: C.mutedDark, fontFace: "Calibri", align: "right", valign: "middle",
  });
}

// ─── WRITE FILE ───────────────────────────────────────────────────────
pres.writeFile({ fileName: "D:/Gestion planning/ADM_GP_Presentation.pptx" })
  .then(() => console.log("✅  Présentation générée : ADM_GP_Presentation.pptx"))
  .catch(err => { console.error("❌  Erreur :", err); process.exit(1); });
