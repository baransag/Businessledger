// scripts/generate-icons.mjs
// Generate PWA icons using SVG → PNG via sharp or just write SVG-based PNGs
import { writeFileSync } from 'fs';

// Simple colored square PNG (minimal valid PNG for PWA)
// We'll generate a proper icon using a base64-encoded blue square PNG
const iconSVG192 = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#4f8ef7"/>
  <text x="96" y="130" font-family="Arial,sans-serif" font-size="100" font-weight="bold" fill="white" text-anchor="middle">L</text>
</svg>`;

const iconSVG512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#4f8ef7"/>
  <text x="256" y="350" font-family="Arial,sans-serif" font-size="280" font-weight="bold" fill="white" text-anchor="middle">L</text>
</svg>`;

writeFileSync('public/pwa-192x192.svg', iconSVG192);
writeFileSync('public/pwa-512x512.svg', iconSVG512);

console.log('SVG icons written to public/');
