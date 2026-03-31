// Script de génération des icônes PNG pour PWA
// Usage : node scripts/generate-icons.mjs
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dir, '..', 'public');
const iconsDir = join(publicDir, 'icons');

mkdirSync(iconsDir, { recursive: true });

// SVG source complet pour les icônes (fond blanc + icône)
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1A365D"/>
      <stop offset="100%" stop-color="#1e4d8c"/>
    </linearGradient>
    <linearGradient id="ag" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38A169"/>
      <stop offset="100%" stop-color="#68D391"/>
    </linearGradient>
    <clipPath id="c">
      <path d="M256,52 C164,52 96,120 96,198 C96,308 256,460 256,460 C256,460 416,308 416,198 C416,120 348,52 256,52 Z"/>
    </clipPath>
  </defs>
  <rect width="512" height="512" fill="white"/>
  <path d="M256,36 C156,36 76,116 76,198 C76,322 256,484 256,484 C256,484 436,322 436,198 C436,116 356,36 256,36 Z"
        fill="none" stroke="url(#bg)" stroke-width="22"/>
  <path d="M102,198 A154,154 0 0,1 256,44" fill="none" stroke="#1A365D" stroke-width="20"
        stroke-linecap="round" opacity="0.45"/>
  <g clip-path="url(#c)">
    <rect x="96"  y="330" width="48" height="134" rx="8" fill="#1A365D" opacity="0.85"/>
    <rect x="154" y="282" width="48" height="182" rx="8" fill="#1A365D" opacity="0.85"/>
    <rect x="212" y="228" width="48" height="236" rx="8" fill="#1A365D" opacity="0.85"/>
    <rect x="270" y="170" width="48" height="294" rx="8" fill="#1A365D" opacity="0.85"/>
    <rect x="328" y="110" width="48" height="354" rx="8" fill="#1A365D" opacity="0.85"/>
    <line x1="90" y1="378" x2="398" y2="78" stroke="url(#ag)" stroke-width="30"
          stroke-linecap="round"/>
    <polygon points="398,78 316,96 356,158" fill="#48BB78"/>
  </g>
</svg>`;

// Version maskable : fond coloré plein pour Android (safe zone = 80% du centre)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1A365D"/>
      <stop offset="100%" stop-color="#1e4d8c"/>
    </linearGradient>
    <linearGradient id="ag2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38A169"/>
      <stop offset="100%" stop-color="#68D391"/>
    </linearGradient>
    <clipPath id="c2">
      <path d="M256,80 C184,80 128,136 128,196 C128,290 256,432 256,432 C256,432 384,290 384,196 C384,136 328,80 256,80 Z"/>
    </clipPath>
  </defs>
  <!-- Fond plein (requis pour maskable) -->
  <rect width="512" height="512" fill="#1A365D"/>
  <!-- Icône centré dans la safe zone (80%) -->
  <path d="M256,70 C178,70 118,130 118,196 C118,296 256,446 256,446 C256,446 394,296 394,196 C394,130 334,70 256,70 Z"
        fill="none" stroke="white" stroke-width="16" opacity="0.9"/>
  <path d="M130,196 A126,126 0 0,1 256,70" fill="none" stroke="white" stroke-width="14"
        stroke-linecap="round" opacity="0.4"/>
  <g clip-path="url(#c2)">
    <rect x="128" y="320" width="38" height="114" rx="6" fill="white" opacity="0.7"/>
    <rect x="174" y="278" width="38" height="156" rx="6" fill="white" opacity="0.7"/>
    <rect x="220" y="232" width="38" height="202" rx="6" fill="white" opacity="0.7"/>
    <rect x="266" y="182" width="38" height="252" rx="6" fill="white" opacity="0.7"/>
    <rect x="312" y="130" width="38" height="304" rx="6" fill="white" opacity="0.7"/>
    <line x1="122" y1="360" x2="354" y2="110" stroke="url(#ag2)" stroke-width="24"
          stroke-linecap="round"/>
    <polygon points="354,110 290,128 316,162" fill="#48BB78"/>
  </g>
</svg>`;

const icons = [
  { name: 'icon-192.png',           size: 192,  svg: iconSvg },
  { name: 'icon-512.png',           size: 512,  svg: iconSvg },
  { name: 'icon-192-maskable.png',  size: 192,  svg: maskableSvg },
  { name: 'icon-512-maskable.png',  size: 512,  svg: maskableSvg },
  { name: 'apple-touch-icon.png',   size: 180,  svg: iconSvg },
  { name: 'favicon-32.png',         size: 32,   svg: iconSvg },
  { name: 'favicon-16.png',         size: 16,   svg: iconSvg },
];

for (const icon of icons) {
  const outPath = join(iconsDir, icon.name);
  await sharp(Buffer.from(icon.svg))
    .resize(icon.size, icon.size)
    .png()
    .toFile(outPath);
  console.log(`✓ ${icon.name} (${icon.size}×${icon.size})`);
}

// Favicon ICO-like PNG à la racine public
await sharp(Buffer.from(iconSvg))
  .resize(32, 32)
  .png()
  .toFile(join(publicDir, 'favicon.png'));
console.log('✓ favicon.png (32×32)');

console.log('\nToutes les icônes générées avec succès !');
