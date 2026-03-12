const img = document.querySelector(".image img");
const imageWrapper = document.querySelector(".image");

const PALETTES = {
  synthwave: ["#080020", "#2e003e", "#9b0060", "#c0007a", "#ff2d80", "#bf5fff", "#00d4ff", "#e8f4ff"],
  grayscale: ["#000000", "#333333", "#666666", "#999999", "#cccccc", "#ffffff"],
  sepia: ["#1c0a00", "#4b2800", "#7c4a1e", "#b07d45", "#d4aa70", "#f2d9a2", "#fff8ee"],
  forest: ["#0a1a0a", "#1a3a1a", "#2d6a2d", "#4a9e4a", "#80c280", "#b8e8b8", "#e8f8e8"],
};

const config = {
  palette: "synthwave",
  blockSize: 2,
};

// Parse hex color string to [r, g, b]
const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

let canvas = null;

const applyAtkinsonDither = async () => {
  const blob = await fetch(img.src).then((r) => r.blob());
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;

  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const offCtx = offscreen.getContext("2d");
  offCtx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const src = offCtx.getImageData(0, 0, width, height).data;
  const palette = PALETTES[config.palette].map(hexToRgb);
  const blockSize = config.blockSize;
  const cols = Math.ceil(width / blockSize);
  const rows = Math.ceil(height / blockSize);

  // Average luminance per block
  const lum = new Float32Array(cols * rows);
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      let sum = 0,
        count = 0;
      for (let dy = 0; dy < blockSize; dy++) {
        for (let dx = 0; dx < blockSize; dx++) {
          const px = bx * blockSize + dx;
          const py = by * blockSize + dy;
          if (px < width && py < height) {
            const i = (py * width + px) * 4;
            sum += 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
            count++;
          }
        }
      }
      lum[by * cols + bx] = sum / count;
    }
  }

  // Atkinson error diffusion on block grid, quantize to palette via luminance
  const colorGrid = new Array(cols * rows);
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const idx = by * cols + bx;
      const oldVal = lum[idx];
      const palIdx = Math.min(Math.floor((oldVal / 255) * palette.length), palette.length - 1);
      colorGrid[idx] = palette[palIdx];

      // Map chosen palette index back to a luminance value for error calculation
      const newVal = (palIdx / (palette.length - 1)) * 255;
      const err = (oldVal - newVal) / 8;

      if (bx + 1 < cols) lum[idx + 1] += err;
      if (bx + 2 < cols) lum[idx + 2] += err;
      if (by + 1 < rows) {
        if (bx - 1 >= 0) lum[idx + cols - 1] += err;
        lum[idx + cols] += err;
        if (bx + 1 < cols) lum[idx + cols + 1] += err;
      }
      if (by + 2 < rows) lum[idx + cols * 2] += err;
    }
  }

  // Create or reuse overlay canvas
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.classList.add("dither-canvas");
    imageWrapper.appendChild(canvas);
  }
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const [r, g, b] = colorGrid[by * cols + bx];
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(bx * blockSize, by * blockSize, blockSize, blockSize);
    }
  }
};

const runDither = () => applyAtkinsonDither().catch(console.error);

const gui = new lil.GUI();
gui.add(config, "palette", Object.keys(PALETTES)).name("Palette").onChange(runDither);
gui.add(config, "blockSize", 1, 10, 1).name("Block Size").onChange(runDither);

if (img.complete && img.naturalWidth > 0) {
  runDither();
} else {
  img.addEventListener("load", runDither);
}
