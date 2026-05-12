"use strict";
const pptxgen = require("C:/Users/alhus/AppData/Roaming/npm/node_modules/pptxgenjs");
const path    = require("path");
const fs      = require("fs");

const SS  = path.join(__dirname, "screenshots_ui");
const OUT = "D:/Gestion planning/docs/Interfaces_Gestion_Planning_ADM.pptx";

// ── Palette ──────────────────────────────────────────────────────────────────
const NAVY   = "0F2744";
const BLUE   = "1A5276";
const LBLUE  = "2E86C1";
const GOLD   = "C9952A";
const WHITE  = "FFFFFF";
const LGREY  = "EAF0F6";
const GREY   = "7F8C8D";
const DTEXT  = "1C2833";
const GREEN  = "0E6655";
const ORANGE = "CA6F1E";
const PURPLE = "6C3483";

function img(name) { return path.join(SS, name + ".png"); }
function exists(f) { return fs.existsSync(f); }

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeShadow() {
  return { type: "outer", color: "000000", blur: 12, offset: 4, angle: 135, opacity: 0.14 };
}

// Dark section divider slide
function sectionSlide(pres, number, label, sub, accentColor) {
  const sl = pres.addSlide();
  sl.background = { color: NAVY };

  // Decorative half-circle on right
  sl.addShape("ellipse", { x: 7.5, y: -1.5, w: 5, h: 5, fill: { color: accentColor, transparency: 75 }, line: { color: accentColor, transparency: 75 } });
  sl.addShape("ellipse", { x: 8.2, y: 2.8,  w: 3, h: 3, fill: { color: accentColor, transparency: 60 }, line: { color: accentColor, transparency: 60 } });

  // Left gold bar
  sl.addShape("rect", { x: 0, y: 0, w: 0.1, h: 5.625, fill: { color: GOLD }, line: { color: GOLD } });

  // Number
  sl.addText(String(number).padStart(2, "0"), {
    x: 0.35, y: 1.2, w: 3, h: 1.6,
    fontSize: 80, bold: true, color: GOLD, margin: 0,
    fontFace: "Arial Black"
  });

  sl.addText(label, {
    x: 0.35, y: 2.75, w: 9, h: 0.75,
    fontSize: 30, bold: true, color: WHITE, margin: 0, fontFace: "Calibri"
  });
  if (sub) {
    sl.addText(sub, {
      x: 0.35, y: 3.55, w: 7.5, h: 0.45,
      fontSize: 14, color: GREY, margin: 0, fontFace: "Calibri"
    });
  }
  return sl;
}

// Interface slide: title bar + screenshot + description
function interfaceSlide(pres, title, imgFile, description, accentColor, badge) {
  const sl = pres.addSlide();
  sl.background = { color: LGREY };

  // Top title bar
  sl.addShape("rect", { x: 0, y: 0, w: 10, h: 0.72, fill: { color: accentColor || NAVY }, line: { color: accentColor || NAVY } });

  // Badge (optional, e.g. "ADMIN" "PUBLIC")
  if (badge) {
    sl.addShape("rect", { x: 0.25, y: 0.14, w: 0.9, h: 0.34, fill: { color: GOLD }, line: { color: GOLD } });
    sl.addText(badge, { x: 0.25, y: 0.14, w: 0.9, h: 0.34, fontSize: 8, bold: true, color: NAVY, align: "center", valign: "middle", margin: 0 });
    sl.addText(title, { x: 1.25, y: 0, w: 8.5, h: 0.72, fontSize: 19, bold: true, color: WHITE, valign: "middle", margin: 0, fontFace: "Calibri" });
  } else {
    sl.addText(title, { x: 0.3, y: 0, w: 9.4, h: 0.72, fontSize: 19, bold: true, color: WHITE, valign: "middle", margin: 0, fontFace: "Calibri" });
  }

  // Gold dot
  sl.addShape("ellipse", { x: 9.6, y: 0.19, w: 0.32, h: 0.32, fill: { color: GOLD }, line: { color: GOLD } });

  // Screenshot frame (white card with shadow)
  const imgW = 9.1, imgH = 4.2;
  const imgX = 0.45, imgY = 0.87;

  sl.addShape("rect", {
    x: imgX - 0.05, y: imgY - 0.05, w: imgW + 0.1, h: imgH + 0.1,
    fill: { color: WHITE }, line: { color: "D5D8DC", width: 0.5 },
    shadow: makeShadow()
  });

  if (exists(imgFile)) {
    sl.addImage({ path: imgFile, x: imgX, y: imgY, w: imgW, h: imgH, sizing: { type: "cover", w: imgW, h: imgH } });
  }

  // Bottom description strip
  sl.addShape("rect", { x: 0, y: 5.17, w: 10, h: 0.46, fill: { color: NAVY }, line: { color: NAVY } });
  sl.addText(description, {
    x: 0.35, y: 5.17, w: 9.3, h: 0.46,
    fontSize: 10.5, color: WHITE, valign: "middle", margin: 0, fontFace: "Calibri"
  });

  return sl;
}

// Two-screenshot slide
function dualSlide(pres, title, imgL, lblL, imgR, lblR, accentColor) {
  const sl = pres.addSlide();
  sl.background = { color: LGREY };

  sl.addShape("rect", { x: 0, y: 0, w: 10, h: 0.65, fill: { color: accentColor || NAVY }, line: { color: accentColor || NAVY } });
  sl.addText(title, { x: 0.3, y: 0, w: 9.4, h: 0.65, fontSize: 18, bold: true, color: WHITE, valign: "middle", margin: 0 });
  sl.addShape("ellipse", { x: 9.6, y: 0.17, w: 0.3, h: 0.3, fill: { color: GOLD }, line: { color: GOLD } });

  const W = 4.55, H = 4.0;

  // Left image
  sl.addShape("rect", { x: 0.2, y: 0.8, w: W + 0.1, h: H + 0.1, fill: { color: WHITE }, line: { color: "D5D8DC", width: 0.5 }, shadow: makeShadow() });
  if (exists(imgL)) sl.addImage({ path: imgL, x: 0.25, y: 0.85, w: W, h: H, sizing: { type: "cover", w: W, h: H } });
  sl.addShape("rect", { x: 0.2, y: 4.9, w: W + 0.1, h: 0.38, fill: { color: accentColor || BLUE }, line: { color: accentColor || BLUE } });
  sl.addText(lblL, { x: 0.25, y: 4.9, w: W, h: 0.38, fontSize: 10, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });

  // Right image
  sl.addShape("rect", { x: 5.25, y: 0.8, w: W + 0.1, h: H + 0.1, fill: { color: WHITE }, line: { color: "D5D8DC", width: 0.5 }, shadow: makeShadow() });
  if (exists(imgR)) sl.addImage({ path: imgR, x: 5.3, y: 0.85, w: W, h: H, sizing: { type: "cover", w: W, h: H } });
  sl.addShape("rect", { x: 5.25, y: 4.9, w: W + 0.1, h: 0.38, fill: { color: accentColor || BLUE }, line: { color: accentColor || BLUE } });
  sl.addText(lblR, { x: 5.3, y: 4.9, w: W, h: 0.38, fontSize: 10, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });

  return sl;
}

// ── BUILD ────────────────────────────────────────────────────────────────────
async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "ADM — Agence de Développement Municipal";
  pres.title  = "Gestion Planning — Interfaces Utilisateur";

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 1 — COVER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const sl = pres.addSlide();
    sl.background = { color: NAVY };

    // Decorative shapes
    sl.addShape("ellipse", { x: 6.8, y: -1.5, w: 5.5, h: 5.5, fill: { color: BLUE }, line: { color: BLUE } });
    sl.addShape("ellipse", { x: 7.6, y: -0.6, w: 3.8, h: 3.8, fill: { color: LBLUE }, line: { color: LBLUE } });
    sl.addShape("ellipse", { x: 7.8, y: 2.9,  w: 3.0, h: 3.0, fill: { color: GOLD,  transparency: 40 }, line: { color: GOLD, transparency: 40 } });

    // Left accent
    sl.addShape("rect", { x: 0, y: 0, w: 0.1, h: 5.625, fill: { color: GOLD }, line: { color: GOLD } });

    // ADM badge
    sl.addShape("rect", { x: 0.45, y: 0.5, w: 1.6, h: 0.5, fill: { color: GOLD }, line: { color: GOLD } });
    sl.addText("ADM", { x: 0.45, y: 0.5, w: 1.6, h: 0.5, fontSize: 18, bold: true, color: NAVY, align: "center", valign: "middle", margin: 0, fontFace: "Arial Black" });
    sl.addText("Agence de Développement Municipal", { x: 2.2, y: 0.57, w: 5.5, h: 0.35, fontSize: 10, color: GREY, margin: 0 });

    // Main titles
    sl.addText("GESTION PLANNING", { x: 0.45, y: 1.35, w: 8, h: 1.0, fontSize: 46, bold: true, color: WHITE, margin: 0, fontFace: "Arial Black" });
    sl.addText("Interfaces & Pages de la Plateforme", { x: 0.45, y: 2.45, w: 8, h: 0.55, fontSize: 18, color: GOLD, margin: 0, fontFace: "Calibri" });

    // Divider
    sl.addShape("line", { x: 0.45, y: 3.1, w: 6, h: 0, line: { color: GOLD, width: 1.5 } });

    // Subtitle
    sl.addText("Présentation visuelle des 20+ interfaces utilisateurs de l'application", {
      x: 0.45, y: 3.3, w: 8, h: 0.4, fontSize: 12, color: GREY, margin: 0
    });

    // Stats chips
    const chips = [
      { v: "22", l: "Interfaces" },
      { v: "7",  l: "Rôles" },
      { v: "15+", l: "Modules" },
      { v: "PWA", l: "Mobile" },
    ];
    chips.forEach(({ v, l }, i) => {
      const x = 0.45 + i * 1.55;
      sl.addShape("rect", { x, y: 3.95, w: 1.4, h: 0.8, fill: { color: BLUE }, line: { color: BLUE } });
      sl.addText(v, { x, y: 4.0,  w: 1.4, h: 0.35, fontSize: 22, bold: true, color: GOLD,  align: "center", margin: 0, fontFace: "Arial Black" });
      sl.addText(l, { x, y: 4.35, w: 1.4, h: 0.3,  fontSize: 9,  color: WHITE, align: "center", margin: 0 });
    });

    sl.addText("Mai 2026  |  Version 2.0", { x: 0.45, y: 5.05, w: 5, h: 0.3, fontSize: 9, color: GREY, margin: 0 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 2 — SOMMAIRE VISUEL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const sl = pres.addSlide();
    sl.background = { color: "F0F4F8" };

    sl.addShape("rect", { x: 0, y: 0, w: 10, h: 0.7, fill: { color: NAVY }, line: { color: NAVY } });
    sl.addText("PLAN DE LA PRÉSENTATION", { x: 0.35, y: 0, w: 9, h: 0.7, fontSize: 18, bold: true, color: WHITE, valign: "middle", margin: 0 });
    sl.addShape("ellipse", { x: 9.6, y: 0.2, w: 0.3, h: 0.3, fill: { color: GOLD }, line: { color: GOLD } });

    const sections = [
      { n: "01", t: "Accès & Authentification",     subs: ["Login", "Mot de passe oublié", "Page publique"],             color: LBLUE  },
      { n: "02", t: "Tableau de Bord",               subs: ["Dashboard général", "KPIs temps réel", "Mon agenda"],         color: BLUE   },
      { n: "03", t: "Plannings",                     subs: ["Liste plannings", "Détail & circuit validation"],             color: NAVY   },
      { n: "04", t: "Réunions & Missions",           subs: ["Liste réunions", "Formulaire", "Missions"],                   color: GREEN  },
      { n: "05", t: "Événements & Calendrier",       subs: ["Vue événements", "Calendrier mensuel"],                       color: PURPLE },
      { n: "06", t: "Notifications & Discussions",   subs: ["Centre notifs", "Messagerie privée"],                         color: ORANGE },
      { n: "07", t: "Administration & Paramètres",   subs: ["Utilisateurs", "Salles", "Stats", "Backups"],                 color: NAVY   },
      { n: "08", t: "Profil & Outils",               subs: ["Répertoire", "Profil", "Projets", "Salles"],                  color: BLUE   },
    ];

    sections.forEach(({ n, t, subs, color }, i) => {
      const col = i < 4 ? 0 : 1;
      const row = i % 4;
      const x = col === 0 ? 0.3 : 5.1;
      const y = 0.9 + row * 1.16;

      sl.addShape("rect", { x, y, w: 4.6, h: 1.0, fill: { color: WHITE }, line: { color: "D5D8DC" }, shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.08 } });
      sl.addShape("rect", { x, y, w: 0.55, h: 1.0, fill: { color: color }, line: { color: color } });
      sl.addText(n, { x, y, w: 0.55, h: 1.0, fontSize: 14, bold: true, color: GOLD, align: "center", valign: "middle", margin: 0 });
      sl.addText(t, { x: x + 0.65, y: y + 0.1, w: 3.8, h: 0.28, fontSize: 11, bold: true, color: DTEXT, margin: 0 });
      sl.addText(subs.join("  ·  "), { x: x + 0.65, y: y + 0.45, w: 3.8, h: 0.45, fontSize: 8.5, color: GREY, margin: 0, wrap: true });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 01 — AUTHENTIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  sectionSlide(pres, 1, "Accès & Authentification", "Login, récupération de mot de passe, page publique", LBLUE);

  interfaceSlide(pres,
    "Page de Connexion",
    img("01_login"),
    "Formulaire d'authentification avec logo ADM — Email + mot de passe + lien vers la page publique",
    LBLUE, "PUBLIC"
  );

  interfaceSlide(pres,
    "Mot de Passe Oublié",
    img("01b_forgot_password"),
    "Formulaire de récupération — L'utilisateur saisit son email et reçoit un lien de réinitialisation sécurisé",
    LBLUE, "PUBLIC"
  );

  interfaceSlide(pres,
    "Page d'Accueil Publique — Disponibilité des Salles",
    img("02_home_public"),
    "Vue publique temps réel : salles libres/occupées avec planning horaire — accessible sans authentification",
    BLUE, "PUBLIC"
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 02 — TABLEAU DE BORD
  // ═══════════════════════════════════════════════════════════════════════════
  sectionSlide(pres, 2, "Tableau de Bord", "Vue générale, KPIs et agenda personnel", BLUE);

  interfaceSlide(pres,
    "Tableau de Bord — Vue Générale",
    img("03_tableau_de_bord"),
    "KPIs en temps réel : salles libres, réunions du jour, plannings en attente · Agenda hebdomadaire · État des salles",
    NAVY
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 03 — PLANNINGS
  // ═══════════════════════════════════════════════════════════════════════════
  sectionSlide(pres, 3, "Gestion des Plannings", "Liste, détail et circuit complet de validation en 6 étapes", NAVY);

  interfaceSlide(pres,
    "Plannings — Liste et Filtres",
    img("04_planning_liste"),
    "Tableau des plannings de la semaine · Filtres par statut et responsable · Actions : Voir, Consolider, Supprimer",
    NAVY
  );

  interfaceSlide(pres,
    "Détail Planning — Circuit de Validation",
    img("05_planning_detail"),
    "Circuit en 6 étapes : Brouillon → Soumis → Coordinateur → SG/Direction → SG/Direction → Validé · Événements de la semaine · Missions croisées",
    NAVY
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 04 — RÉUNIONS & MISSIONS
  // ═══════════════════════════════════════════════════════════════════════════
  sectionSlide(pres, 4, "Réunions & Missions", "Gestion complète des réunions, formulaires et missions", GREEN);

  dualSlide(pres,
    "Réunions — Liste & Détail",
    img("06_reunions_liste"), "Liste des réunions avec filtres",
    img("06b_reunion_detail"), "Détail d'une réunion",
    GREEN
  );

  interfaceSlide(pres,
    "Nouvelle Réunion — Formulaire de Création",
    img("07_reunion_form"),
    "Formulaire complet : titre, date/heure, lieu, participants, ordre du jour · Invitation automatique par email",
    GREEN
  );

  dualSlide(pres,
    "Missions — Liste & Détail",
    img("08_missions_liste"), "Liste des missions actives",
    img("08b_mission_detail"), "Détail d'une mission",
    GREEN
  );

  interfaceSlide(pres,
    "Nouvelle Mission — Formulaire de Création",
    img("09_mission_create"),
    "Création mission : titre, description, dates, lieu, priorité, membres assignés · Notifications automatiques à l'assignation",
    GREEN
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 05 — ÉVÉNEMENTS & CALENDRIER
  // ═══════════════════════════════════════════════════════════════════════════
  sectionSlide(pres, 5, "Événements & Calendrier", "Vue calendrier unifiée — plannings, réunions, missions", PURPLE);

  interfaceSlide(pres,
    "Gestion des Événements",
    img("10_evenements"),
    "Événements unifiés : réunions, missions, plannings · Types personnalisables avec couleurs · Filtres avancés",
    PURPLE
  );

  interfaceSlide(pres,
    "Calendrier — Vue Mensuelle",
    img("11_calendrier"),
    "Vue mensuelle avec code couleur : Réunion (bleu) · Mission (violet) · Planning (vert) · Navigation intuitive · Export · Vue semaine/jour",
    PURPLE
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 06 — NOTIFICATIONS & DISCUSSIONS
  // ═══════════════════════════════════════════════════════════════════════════
  sectionSlide(pres, 6, "Notifications & Discussions", "Centre d'alertes temps réel et messagerie intégrée", ORANGE);

  interfaceSlide(pres,
    "Centre de Notifications",
    img("12_notifications"),
    "Toutes les alertes système : plannings soumis, réunions créées, missions assignées · Marquage lu/non-lu · Polling 30 secondes",
    ORANGE
  );

  interfaceSlide(pres,
    "Discussions — Messagerie Privée",
    img("13_discussions"),
    "Messagerie en temps réel : conversations privées + onglet Direction · Recherche · Mode audit Super Admin (toutes les conversations)",
    ORANGE
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 07 — ADMINISTRATION
  // ═══════════════════════════════════════════════════════════════════════════
  sectionSlide(pres, 7, "Administration & Paramètres", "Gestion utilisateurs, salles, statistiques et sauvegardes", NAVY);

  interfaceSlide(pres,
    "Gestion des Utilisateurs",
    img("14_utilisateurs"),
    "Liste complète des utilisateurs · Création, modification, désactivation · Attribution des rôles · Envoi lien de réinitialisation",
    NAVY, "ADMIN"
  );

  dualSlide(pres,
    "Administration — Utilisateurs & Salles",
    img("14b_admin_utilisateurs"), "Onglet Utilisateurs (Admin)",
    img("14c_admin_salles"), "Onglet Salles (Admin)",
    NAVY
  );

  interfaceSlide(pres,
    "Administration — Statistiques Globales",
    img("15_admin_notifs"),
    "Dashboard admin : 8 utilisateurs actifs, taux de validation, missions actives, réunions · Plannings par statut · Utilisateurs par rôle",
    NAVY, "ADMIN"
  );

  dualSlide(pres,
    "Administration — Plannings & Statistiques",
    img("16_admin_plannings"), "Vue admin des plannings",
    img("17_admin_stats"), "Statistiques détaillées",
    NAVY
  );

  interfaceSlide(pres,
    "Administration — Sauvegardes Système",
    img("18_admin_backups"),
    "Gestion des sauvegardes : déclenchement manuel, historique, restauration · Export CSV des logs · Surveillance système",
    NAVY, "SUPER ADMIN"
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 08 — PROFIL & OUTILS
  // ═══════════════════════════════════════════════════════════════════════════
  sectionSlide(pres, 8, "Profil & Outils Complémentaires", "Répertoire, profil, projets et gestion des salles", BLUE);

  interfaceSlide(pres,
    "Répertoire / Annuaire",
    img("19_repertoire"),
    "Annuaire de tous les utilisateurs · Recherche par nom, rôle, direction · Fiche contact avec email et téléphone",
    BLUE
  );

  interfaceSlide(pres,
    "Profil Utilisateur",
    img("20_profil"),
    "Gestion du profil : informations personnelles, photo avatar, changement de mot de passe · Historique des connexions",
    BLUE
  );

  dualSlide(pres,
    "Projets & Gestion des Salles",
    img("21_projets"), "Module Projets",
    img("22_salles"),  "Gestion des Salles",
    BLUE
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE FINALE — CONCLUSION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const sl = pres.addSlide();
    sl.background = { color: NAVY };

    sl.addShape("ellipse", { x: 6.5, y: -1.2, w: 5, h: 5, fill: { color: BLUE }, line: { color: BLUE } });
    sl.addShape("ellipse", { x: 7.4, y: 3.0,  w: 3.5, h: 3.5, fill: { color: GOLD, transparency: 50 }, line: { color: GOLD, transparency: 50 } });
    sl.addShape("rect", { x: 0, y: 0, w: 0.1, h: 5.625, fill: { color: GOLD }, line: { color: GOLD } });

    sl.addText("Merci", { x: 0.45, y: 0.7, w: 6.5, h: 1.3, fontSize: 66, bold: true, color: WHITE, margin: 0, fontFace: "Arial Black" });
    sl.addText("pour votre attention", { x: 0.45, y: 1.9, w: 7, h: 0.65, fontSize: 24, color: GOLD, margin: 0 });

    sl.addShape("line", { x: 0.45, y: 2.7, w: 6.5, h: 0, line: { color: GOLD, width: 1.5 } });

    sl.addText("ADM — Agence de Développement Municipal", { x: 0.45, y: 2.95, w: 7, h: 0.38, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    sl.addText("Plateforme Gestion Planning · Version 2.0 · Mai 2026", { x: 0.45, y: 3.38, w: 7, h: 0.32, fontSize: 11, color: GREY, margin: 0 });

    // Summary grid
    const items = [
      { v: "22", l: "Interfaces\ncapturées",  col: LBLUE },
      { v: "7",  l: "Rôles\nutilisateurs",    col: BLUE  },
      { v: "15+", l: "Modules\nfonctionnels", col: NAVY  },
      { v: "PWA", l: "Support\nmobile",       col: GOLD  },
    ];
    items.forEach(({ v, l, col }, i) => {
      const x = 0.45 + i * 1.6;
      sl.addShape("rect", { x, y: 3.95, w: 1.45, h: 1.0, fill: { color: col }, line: { color: col } });
      sl.addText(v, { x, y: 4.0,  w: 1.45, h: 0.42, fontSize: 24, bold: true, color: col === GOLD ? NAVY : GOLD, align: "center", margin: 0, fontFace: "Arial Black" });
      sl.addText(l, { x, y: 4.45, w: 1.45, h: 0.42, fontSize: 8,  color: col === GOLD ? NAVY : WHITE, align: "center", margin: 0, wrap: true });
    });
  }

  // ── WRITE ──────────────────────────────────────────────────────────────────
  await pres.writeFile({ fileName: OUT });
  console.log("✅ Présentation créée :", OUT);

  const { size } = fs.statSync(OUT);
  console.log(`   Taille : ${(size / 1024 / 1024).toFixed(2)} MB`);

  // Count slides
  const slides = pres.slides ? pres.slides.length : "?";
  console.log(`   Diapositives : ${slides}`);
}

main().catch(e => { console.error(e); process.exit(1); });
