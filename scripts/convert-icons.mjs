import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { optimize } from "svgo";

const inputDir = "./icons-svg";
const outputDir = "./public/icons";

function cleanSvg(svg) {
  const result = optimize(svg, {
    multipass: true,
    plugins: [
      "removeMetadata",
      "removeXMLNS",
      {
        name: "removeAttrs",
        params: {
          attrs: ["stroke", "stroke-width"],
        },
      },
    ],
  });

  return result.data;
}

async function convertIcons() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs.readdirSync(inputDir);

  for (const file of files) {
    if (!file.endsWith(".svg")) continue;

    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file.replace(".svg", ".png"));

    try {
      // 1. Read SVG
      const rawSvg = fs.readFileSync(inputPath, "utf8");

      // 2. Clean SVG with SVGO
      const cleanedSvg = cleanSvg(rawSvg);

      // 3. Convert cleaned SVG buffer to PNG
      await sharp(Buffer.from(cleanedSvg))
        .resize(24, 24)
        .png()
        .toFile(outputPath);

      console.log(`Converted ${file}`);
    } catch (err) {
      console.error(`Failed ${file}:`, err);
    }
  }

  console.log("Done 🎉");
}

convertIcons();
