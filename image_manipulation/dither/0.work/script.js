const img = document.querySelector(".image img");
const imageWrapper = document.querySelector(".image");

const PALETTES = {
  synthwave: ["#080020", "#2e003e", "#9b0060", "#c0007a", "#ff2d80", "#bf5fff", "#00d4ff", "#e8f4ff"],
  grayscale: ["#000000", "#333333", "#666666", "#999999", "#cccccc", "#ffffff"],
  sepia: ["#1c0a00", "#4b2800", "#7c4a1e", "#b07d45", "#d4aa70", "#f2d9a2", "#fff8ee"],
  forest: ["#0a1a0a", "#1a3a1a", "#2d6a2d", "#4a9e4a", "#80c280", "#b8e8b8", "#e8f8e8"],
};

// Density ramp: darkest (most ink) → lightest (least ink / space)
const ASCII_CHARS = "@#%S*+=-:,. ";

const config = {
  palette: "synthwave",
  cellSize: 24,
  lightness: 0,
  bloomRadius: 8,
  bloomStrength: 0.6,
};

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};



// ── Canvas state ──────────────────────────────────────────────────────────────

let asciiCanvas = null;
let bloomCanvas = null;
let imgPixels = null; // cached Uint8ClampedArray of source pixels
let imgWidth = 0;
let imgHeight = 0;

// ── Init ──────────────────────────────────────────────────────────────────────

const initCanvas = async () => {
  const blob = await fetch(img.src).then((r) => r.blob());
  const bitmap = await createImageBitmap(blob);
  imgWidth = bitmap.width;
  imgHeight = bitmap.height;

  // Offscreen canvas — read pixel data once and cache it
  const offscreen = document.createElement("canvas");
  offscreen.width = imgWidth;
  offscreen.height = imgHeight;
  const offCtx = offscreen.getContext("2d");
  offCtx.drawImage(bitmap, 0, 0);
  imgPixels = offCtx.getImageData(0, 0, imgWidth, imgHeight).data;
  bitmap.close();

  // Visible ASCII canvas — positioned on top of the source image
  asciiCanvas = document.createElement("canvas");
  asciiCanvas.classList.add("dither-canvas");
  asciiCanvas.width = imgWidth;
  asciiCanvas.height = imgHeight;
  imageWrapper.appendChild(asciiCanvas);
};

// ── Render ────────────────────────────────────────────────────────────────────

const render = () => {
  if (!imgPixels) return;

  const palette = PALETTES[config.palette];
  const paletteRgb = palette.map(hexToRgb);
  const cellSize = config.cellSize;
  const chars = ASCII_CHARS;
  const charCount = chars.length;

  // Resizing clears the canvas
  asciiCanvas.width = imgWidth;
  asciiCanvas.height = imgHeight;

  const ctx = asciiCanvas.getContext("2d");

  // Background = darkest palette colour
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, imgWidth, imgHeight);

  ctx.font = `bold ${cellSize}px monospace`;
  ctx.textBaseline = "top";

  const cols = Math.ceil(imgWidth / cellSize);
  const rows = Math.ceil(imgHeight / cellSize);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = col * cellSize;
      const py = row * cellSize;

      // Accumulate average colour for this cell
      let sumR = 0,
        sumG = 0,
        sumB = 0,
        count = 0;
      const xEnd = Math.min(px + cellSize, imgWidth);
      const yEnd = Math.min(py + cellSize, imgHeight);

      for (let y = py; y < yEnd; y++) {
        for (let x = px; x < xEnd; x++) {
          const i = (y * imgWidth + x) * 4;
          sumR += imgPixels[i];
          sumG += imgPixels[i + 1];
          sumB += imgPixels[i + 2];
          count++;
        }
      }

      // Raw luminance [0..1]
      const rawLum = (0.299 * sumR + 0.587 * sumG + 0.114 * sumB) / count / 255;

      // Apply lightness: shift normalised luminance then clamp to [0,1]
      const lum = Math.min(1, Math.max(0, rawLum + config.lightness));

      // Luminance → ASCII character (brighter = sparser glyph)
      const charIdx = Math.floor(lum * (charCount - 1));
      const char = chars[charIdx];

      // Luminance → palette colour (same index drives both char and colour)
      const palIdx = Math.min(paletteRgb.length - 1, Math.floor(lum * paletteRgb.length));
      const [cr, cg, cb] = paletteRgb[palIdx];
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.fillText(char, px, py);
    }
  }

  // Bloom: additive blur composited on a second canvas drawn on top
  if (config.bloomRadius > 0 && config.bloomStrength > 0) {
    if (!bloomCanvas) {
      bloomCanvas = document.createElement("canvas");
      bloomCanvas.classList.add("dither-canvas");
      imageWrapper.appendChild(bloomCanvas); // after asciiCanvas → renders on top
    }
    bloomCanvas.width = imgWidth;
    bloomCanvas.height = imgHeight;
    bloomCanvas.style.display = "block";

    const bCtx = bloomCanvas.getContext("2d");
    bCtx.clearRect(0, 0, imgWidth, imgHeight);
    bCtx.filter = `blur(${config.bloomRadius}px)`;
    bCtx.globalAlpha = config.bloomStrength;
    bCtx.globalCompositeOperation = "lighter";
    bCtx.drawImage(asciiCanvas, 0, 0);
    bCtx.globalCompositeOperation = "source-over";
    bCtx.globalAlpha = 1;
    bCtx.filter = "none";
  } else if (bloomCanvas) {
    bloomCanvas.style.display = "none";
  }
};

// ── GUI ───────────────────────────────────────────────────────────────────────

const gui = new lil.GUI();
gui.add(config, "palette", Object.keys(PALETTES)).name("Palette").onChange(render);
gui.add(config, "cellSize", 24, 120, 1).name("Cell Size").onChange(render);
gui.add(config, "lightness", -1, 1, 0.01).name("Lightness").onChange(render);
const bloomFolder = gui.addFolder("Bloom");
bloomFolder.add(config, "bloomRadius", 0, 30, 1).name("Radius").onChange(render);
bloomFolder.add(config, "bloomStrength", 0, 1, 0.05).name("Strength").onChange(render);

// ── Bootstrap ─────────────────────────────────────────────────────────────────

const init = async () => {
  await initCanvas();
  render();
};

if (img.complete && img.naturalWidth > 0) {
  init().catch(console.error);
} else {
  img.addEventListener("load", () => init().catch(console.error));
}
