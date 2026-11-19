import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const svgPath = path.join(rootDir, "public", "icons", "icon.svg");
const outputDir = path.join(rootDir, "public", "icons");

const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated: icon-${size}x${size}.png`);
  }
}

generateIcons().catch(console.error);
