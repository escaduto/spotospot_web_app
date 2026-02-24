import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { optimize } from "svgo";

const inputDir = "./icons-svg";
const outputDir = "./public/icons";

// ─── Output size ───
const SIZE = 48; // px – final PNG dimensions
const ICON_RATIO = 0.55; // icon occupies 55% of the circle diameter

// ─── Build icon-filename → color map from poi-config.ts ───
function buildIconColorMap() {
  const configPath = path.resolve("src/map/scripts/poi-config.ts");
  const src = fs.readFileSync(configPath, "utf8");

  /** Map<iconName, color>  – first match wins */
  const map = new Map();

  const entryRe =
    /{\s*[^}]*?color:\s*"(#[0-9A-Fa-f]+)"[^}]*?icon:\s*"([^"]+)"[^}]*?}|{\s*[^}]*?icon:\s*"([^"]+)"[^}]*?color:\s*"(#[0-9A-Fa-f]+)"[^}]*?}/g;
  let m;
  while ((m = entryRe.exec(src))) {
    const color = m[1] || m[4];
    const icon = m[2] || m[3];
    if (icon && color && !map.has(icon)) {
      map.set(icon, color);
    }
  }

  return map;
}

// ─── Hex → RGB ───
function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// ─── Lighten / darken helpers for gradient stops ───
function lighten(hex, pct) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 + pct;
  const clamp = (v) => Math.min(255, Math.round(v * f));
  return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
}
function darken(hex, pct) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - pct;
  const clamp = (v) => Math.max(0, Math.round(v * f));
  return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
}

// ─── Extract viewBox from the raw SVG ───
function extractViewBox(svg) {
  const m = svg.match(/viewBox="([^"]+)"/i);
  if (m) return m[1]; // e.g. "0 0 15 15"

  // Fallback: try width/height attrs
  const w = svg.match(/\bwidth="(\d+)"/i);
  const h = svg.match(/\bheight="(\d+)"/i);
  if (w && h) return `0 0 ${w[1]} ${h[1]}`;

  return "0 0 15 15"; // safe default
}

// ─── Clean SVG & strip outer <svg> wrapper, return only inner elements ───
function stripOuterSvg(svg) {
  const cleaned = optimize(svg, {
    multipass: true,
    plugins: [
      "removeMetadata",
      "removeXMLNS",
      "removeXMLProcInst",
      "removeComments",
      "removeTitle",
      "removeDesc",
      "removeDoctype",
      {
        name: "removeAttrs",
        params: {
          attrs: [
            "stroke",
            "stroke-width",
            "class",
            "style",
            "id",
            "version",
            "xmlns",
            "xmlns:xlink",
          ],
        },
      },
    ],
  }).data;

  // Strip the outer <svg …> … </svg>, keep inner content only
  return cleaned
    .replace(/<svg[^>]*>/i, "")
    .replace(/<\/svg>/i, "")
    .trim();
}

// ─── Compose flat square SVG for transit icons ───
function composeSvgSquareFlat(innerPaths, viewBox, color) {
  const iconSide = SIZE * 0.8;
  const iconOffset = (SIZE - iconSide) / 2;
  const cornerRadius = Math.round(SIZE * 0.15); // ~7 px at 48 px

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <!-- Square flat background -->
  <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${color}"/>

  <!-- Inner icon -->
  <svg x="${iconOffset}" y="${iconOffset}"
       width="${iconSide}" height="${iconSide}"
       viewBox="${viewBox}">
    <g fill="white">
      ${innerPaths}
    </g>
  </svg>
</svg>`;
}

// ─── Compose final SVG with glossy circle + white icon ───
function composeSvg(innerPaths, viewBox, color) {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r = SIZE / 2;
  const border = 2; // white border thickness in px
  const ri = r - border; // inner radius (colored area)

  // The inner icon area (centered square inside the circle)
  const iconSide = SIZE * ICON_RATIO;
  const iconOffset = (SIZE - iconSide) / 2;

  const highlight = lighten(color, 0.35);
  const shadow = darken(color, 0.2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="60%" fx="50%" fy="35%">
      <stop offset="0%" stop-color="${highlight}"/>
      <stop offset="100%" stop-color="${shadow}"/>
    </radialGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity="0.55"/>
      <stop offset="50%" stop-color="white" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="shd" cx="50%" cy="100%" r="60%">
      <stop offset="0%" stop-color="black" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="black" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- White border ring -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="white"/>
  <!-- Circle background -->
  <circle cx="${cx}" cy="${cy}" r="${ri}" fill="url(#bg)"/>
  <!-- Bottom shadow -->
  <circle cx="${cx}" cy="${cy}" r="${ri}" fill="url(#shd)"/>
  <!-- Glossy top highlight -->
  <ellipse cx="${cx}" cy="${cy * 0.72}" rx="${ri * 0.8}" ry="${ri * 0.55}" fill="url(#gloss)"/>

  <!-- Inner icon: nested <svg> normalises any viewBox to the icon area -->
  <svg x="${iconOffset}" y="${iconOffset}"
       width="${iconSide}" height="${iconSide}"
       viewBox="${viewBox}">
    <g fill="white">
      ${innerPaths}
    </g>
  </svg>
</svg>`;
}

// ─── Main ───
async function convertIcons() {
  const iconColorMap = buildIconColorMap();
  const defaultColor = "#95A5A6"; // matches DEFAULT_CATEGORY

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs.readdirSync(inputDir).filter((f) => f.endsWith(".svg"));
  let converted = 0;

  for (const file of files) {
    const iconName = file.replace(".svg", "");
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file.replace(".svg", ".png"));

    try {
      const rawSvg = fs.readFileSync(inputPath, "utf8");
      const viewBox = extractViewBox(rawSvg);
      const innerPaths = stripOuterSvg(rawSvg);
      const color = iconColorMap.get(iconName) ?? defaultColor;
      const TRANSIT_COLOR = "#729bb0";
      const finalSvg =
        color === TRANSIT_COLOR
          ? composeSvgSquareFlat(innerPaths, viewBox, color)
          : composeSvg(innerPaths, viewBox, color);

      await sharp(Buffer.from(finalSvg))
        .resize(SIZE, SIZE)
        .png()
        .toFile(outputPath);

      converted++;
      console.log(`✓ ${iconName} (${color}) [${viewBox}]`);
    } catch (err) {
      console.error(`✗ ${file}:`, err.message);
    }
  }

  console.log(`\nDone — ${converted}/${files.length} icons converted 🎉`);
}

convertIcons();
