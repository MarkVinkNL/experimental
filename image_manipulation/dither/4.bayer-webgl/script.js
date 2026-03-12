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
  bloomRadius: 8,
  bloomStrength: 0.6,
};

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// 8×8 Bayer matrix — values 0–63 normalised to 0–255 for LUMINANCE texture
const BAYER_DATA = new Uint8Array(
  [
    0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33,
    9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
  ].map((v) => Math.round((v / 63) * 255)),
);

// ── Shaders ──────────────────────────────────────────────────────────────────

const VS = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

// Bayer ordered dithering: each fragment is independent — no serial dependency
const FS = `
  precision mediump float;
  uniform sampler2D uImage;    // source photo (Y-flipped on upload)
  uniform sampler2D uBayer;    // 8×8 LUMINANCE threshold texture (REPEAT)
  uniform sampler2D uPalette;  // 8×1 RGB palette texture
  uniform vec2  uResolution;
  uniform float uBlockSize;
  uniform int   uPaletteSize;
  varying vec2 vUv;

  void main() {
    vec2 fragCoord = vUv * uResolution;

    // Snap UV to block centre for pixelation, flip Y to match source orientation
    vec2 blockUv = (floor(fragCoord / uBlockSize) + 0.5) * uBlockSize / uResolution;
    blockUv.y = 1.0 - blockUv.y;

    // Luminance of the block's average colour
    float lum = dot(texture2D(uImage, blockUv).rgb, vec3(0.299, 0.587, 0.114));

    // Bayer threshold [0,1] tiled across the screen at pixel resolution
    float threshold = texture2D(uBayer, mod(fragCoord, 8.0) / 8.0).r;

    // Perturb luminance by the threshold, then quantise to palette
    float n        = float(uPaletteSize);
    float dithered = clamp(lum + (threshold - 0.5) / max(n - 1.0, 1.0), 0.0, 1.0);
    float palIdx   = min(floor(dithered * n), n - 1.0);

    // Sample 8-wide palette texture
    vec3 col = texture2D(uPalette, vec2((palIdx + 0.5) / 8.0, 0.5)).rgb;
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── WebGL state ───────────────────────────────────────────────────────────────

let glCanvas = null;
let bloomCanvas = null;
let gl = null;
let prog = null;
let imageTex = null;
let bayerTex = null;
let paletteTex = null;
let imgWidth = 0;
let imgHeight = 0;

const makeShader = (type, src) => {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
};

const makeTexture = (data, w, h, format, filter = gl.NEAREST, wrap = gl.REPEAT) => {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, format, w, h, 0, format, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  return tex;
};

const initGL = async () => {
  const blob = await fetch(img.src).then((r) => r.blob());
  const bitmap = await createImageBitmap(blob);
  imgWidth = bitmap.width;
  imgHeight = bitmap.height;

  glCanvas = document.createElement("canvas");
  glCanvas.classList.add("dither-canvas");
  glCanvas.width = imgWidth;
  glCanvas.height = imgHeight;
  imageWrapper.appendChild(glCanvas);

  gl = glCanvas.getContext("webgl");

  // Compile & link
  const vs = makeShader(gl.VERTEX_SHADER, VS.trim());
  const fs = makeShader(gl.FRAGMENT_SHADER, FS.trim());
  prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // Full-screen triangle strip
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // Image texture
  imageTex = makeTexture(null, 0, 0, gl.RGBA, gl.LINEAR, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
  bitmap.close();

  // Static Bayer texture
  bayerTex = makeTexture(BAYER_DATA, 8, 8, gl.LUMINANCE);

  // Palette texture — contents updated each render
  paletteTex = makeTexture(new Uint8Array(24).fill(0), 8, 1, gl.RGB);
};

const updatePaletteTexture = () => {
  const colors = PALETTES[config.palette].map(hexToRgb);
  const data = new Uint8Array(24).fill(0); // 8 × RGB
  colors.forEach(([r, g, b], i) => {
    data[i * 3] = r;
    data[i * 3 + 1] = g;
    data[i * 3 + 2] = b;
  });
  gl.bindTexture(gl.TEXTURE_2D, paletteTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 8, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, data);
};

const render = () => {
  if (!gl) return;
  updatePaletteTexture();

  gl.viewport(0, 0, imgWidth, imgHeight);
  gl.useProgram(prog);

  const bind = (tex, unit, name) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(prog, name), unit);
  };
  bind(imageTex, 0, "uImage");
  bind(bayerTex, 1, "uBayer");
  bind(paletteTex, 2, "uPalette");

  gl.uniform2f(gl.getUniformLocation(prog, "uResolution"), imgWidth, imgHeight);
  gl.uniform1f(gl.getUniformLocation(prog, "uBlockSize"), config.blockSize);
  gl.uniform1i(gl.getUniformLocation(prog, "uPaletteSize"), PALETTES[config.palette].length);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Bloom: 2D canvas drawn on top with additive blur compositing
  if (config.bloomRadius > 0 && config.bloomStrength > 0) {
    if (!bloomCanvas) {
      bloomCanvas = document.createElement("canvas");
      bloomCanvas.classList.add("dither-canvas");
      imageWrapper.appendChild(bloomCanvas); // appended after glCanvas → renders on top
    }
    bloomCanvas.width = imgWidth;
    bloomCanvas.height = imgHeight;
    bloomCanvas.style.display = "block";

    const bCtx = bloomCanvas.getContext("2d");
    bCtx.clearRect(0, 0, imgWidth, imgHeight);
    bCtx.filter = `blur(${config.bloomRadius}px)`;
    bCtx.globalAlpha = config.bloomStrength;
    bCtx.globalCompositeOperation = "lighter";
    bCtx.drawImage(glCanvas, 0, 0);
    bCtx.globalCompositeOperation = "source-over";
    bCtx.globalAlpha = 1;
    bCtx.filter = "none";
  } else if (bloomCanvas) {
    bloomCanvas.style.display = "none";
  }
};

const runDither = () => render();

const gui = new lil.GUI();
gui.add(config, "palette", Object.keys(PALETTES)).name("Palette").onChange(runDither);
gui.add(config, "blockSize", 1, 10, 1).name("Block Size").onChange(runDither);
const bloomFolder = gui.addFolder("Bloom");
bloomFolder.add(config, "bloomRadius", 0, 30, 1).name("Radius").onChange(runDither);
bloomFolder.add(config, "bloomStrength", 0, 1, 0.05).name("Strength").onChange(runDither);

const init = async () => {
  await initGL();
  render();
};

if (img.complete && img.naturalWidth > 0) {
  init().catch(console.error);
} else {
  img.addEventListener("load", () => init().catch(console.error));
}
