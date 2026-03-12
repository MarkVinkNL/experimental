const img = document.querySelector(".image img");
const imageWrapper = document.querySelector(".image");

const applyAtkinsonDither = async () => {
  // Fetch as blob to avoid canvas taint, then decode via createImageBitmap
  const blob = await fetch(img.src).then((r) => r.blob());
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;

  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const offCtx = offscreen.getContext("2d");
  offCtx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = offCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Grayscale luminance buffer (floats preserve error accumulation)
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  // Atkinson error diffusion — spreads 6/8 of the error across 6 neighbours
  //  . * 1 1
  //  1 1 1 .
  //  . 1 . .
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = gray[idx];
      const newVal = oldVal < 128 ? 0 : 255;
      const err = (oldVal - newVal) / 8;

      // Write quantized value directly into imageData
      data[idx * 4] = data[idx * 4 + 1] = data[idx * 4 + 2] = newVal;
      data[idx * 4 + 3] = 255;

      if (x + 1 < width) gray[idx + 1] += err;
      if (x + 2 < width) gray[idx + 2] += err;
      if (y + 1 < height) {
        if (x - 1 >= 0) gray[idx + width - 1] += err;
        gray[idx + width] += err;
        if (x + 1 < width) gray[idx + width + 1] += err;
      }
      if (y + 2 < height) gray[idx + width * 2] += err;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.classList.add("dither-canvas");
  canvas.width = width;
  canvas.height = height;
  imageWrapper.appendChild(canvas);
  canvas.getContext("2d").putImageData(imageData, 0, 0);
};

const runDither = () => applyAtkinsonDither().catch(console.error);

if (img.complete && img.naturalWidth > 0) {
  runDither();
} else {
  img.addEventListener("load", runDither);
}
