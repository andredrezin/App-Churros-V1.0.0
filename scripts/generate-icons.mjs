// Gera icon-192.png e icon-512.png para PWA usando apenas Node/Bun built-ins
// Cria um PNG mínimo válido com as cores da marca (fundo vermelho + chama dourada em SVG inline)

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");

// SVG do ícone com identidade visual da marca
const makeSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#C0001A"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-size="${size * 0.55}" font-family="serif">🔥</text>
</svg>`;

// Converte SVG para Data URL e salva como arquivo .svg (renomeado para .png no manifest)
// Para PWA funcionar corretamente sem dependências externas, salvamos como SVG
// e atualizamos o manifest para referenciar o SVG

const svg192 = makeSvg(192);
const svg512 = makeSvg(512);

writeFileSync(resolve(publicDir, "icon-192.svg"), svg192);
writeFileSync(resolve(publicDir, "icon-512.svg"), svg512);

console.log("✅ Ícones SVG gerados em public/");
console.log("   → icon-192.svg");
console.log("   → icon-512.svg");
