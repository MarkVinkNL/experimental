// ─── WebGL Metaball — vanilla JS, no libraries ──────────────────────────────

const canvas = document.getElementById("grid-canvas");
const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

if (!gl) console.error("WebGL not supported");

// ── Constants ────────────────────────────────────────────────────────────────
const TRAIL_LENGTH = 14;

// Blob size configuration (easy to adjust)
let MAIN_BLOB_SIZE_VH = 0.05; // Main blob size as fraction of viewport height (0.05 = 5vh)
let MOBILE_BLOB_SCALE = 0.5; // Mobile blob head size as fraction of main blob (0.15 = 15%)
let MOBILE_BLOB_TAPER = 0.08; // Tapering rate for mobile blob trail

// ── State ────────────────────────────────────────────────────────────────────
let hue = Math.random(); // 0–1 rainbow hue
const trail = Array.from({ length: TRAIL_LENGTH }, () => ({ x: -99, y: -99 }));

// ── Shaders ──────────────────────────────────────────────────────────────────
const VERT_SRC = `
  attribute vec2 a_pos;
  void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  precision highp float;

  uniform vec2  uResolution;
  uniform float uHue;
  uniform float uBlobR;
  uniform float uMobileScale;  // Mobile blob scale factor
  uniform float uMobileTaper;  // Mobile blob taper rate
  uniform vec2  uTrail[${TRAIL_LENGTH}];

  const float EPS = 1e-4;
  const int   ITR = 36;

  // ── SDF / smooth blend ───────────────────────────────────────────────────
  float sdSphere(vec3 p, float r) { return length(p) - r; }

  float smin(float a, float b, float k) {
    float h = exp(-k * a) + exp(-k * b);
    return -log(h) / k;
  }

  // ── Scene ────────────────────────────────────────────────────────────────
  float map(vec3 p) {
    float k = 8.0;
    float d = 1e5;

    // Static central blob — the big one
    d = smin(d, sdSphere(p, uBlobR), k);

    // Mobile cursor blob — size controlled by uniforms
    float baseR = uBlobR * uMobileTaper;
    float headR = uBlobR * uMobileScale;
    for (int i = 0; i < ${TRAIL_LENGTH}; i++) {
      float r = headR - baseR * float(i);
      if (r > 0.001)
        d = smin(d, sdSphere(p - vec3(uTrail[i], 0.0), r), k);
    }
    return d;
  }

  // ── Normal via central differences ───────────────────────────────────────
  vec3 calcNormal(vec3 p) {
    return normalize(vec3(
      map(p + vec3( EPS, 0.0, 0.0)) - map(p + vec3(-EPS, 0.0, 0.0)),
      map(p + vec3( 0.0, EPS, 0.0)) - map(p + vec3( 0.0,-EPS, 0.0)),
      map(p + vec3( 0.0, 0.0, EPS)) - map(p + vec3( 0.0, 0.0,-EPS))
    ));
  }

  // ── HSL → RGB ─────────────────────────────────────────────────────────────
  vec3 hue2rgb(float h) {
    h = fract(h);
    return clamp(vec3(
      abs(h * 6.0 - 3.0) - 1.0,
      2.0 - abs(h * 6.0 - 2.0),
      2.0 - abs(h * 6.0 - 4.0)
    ), 0.0, 1.0);
  }
  vec3 hsl(float h, float s, float l) {
    vec3 rgb = hue2rgb(h);
    return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  void main() {
    vec2 p = (gl_FragCoord.xy * 2.0 - uResolution) / min(uResolution.x, uResolution.y);

    vec3 ray    = vec3(p, 1.0);
    vec3 rayDir = vec3(0.0, 0.0, -1.0);

    float dist = 0.0;
    for (int i = 0; i < ITR; i++) {
      dist = map(ray);
      if (dist < EPS) break;
      ray += rayDir * dist;
    }

    vec3 color = vec3(1.0); // Start with white background
    
    // Antialiasing: smooth edge based on distance field
    float edgeWidth = 0.015; // Width of antialiasing band
    float alpha = 1.0 - smoothstep(-edgeWidth, edgeWidth, dist);
    
    if (alpha > 0.0) {
      // Flat shading - just solid color
      vec3 blobColor = hsl(uHue, 0.85, 0.50);
      // Blend blob color over white background
      color = mix(vec3(1.0), blobColor, alpha);
    }

    // Soft ambient glow halo
    float glow = smoothstep(0.20, 0.0, dist) * 0.12;
    vec3 glowColor = hsl(uHue, 0.9, 0.55);
    color = mix(color, glowColor, glow);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ── Compile helper ────────────────────────────────────────────────────────────
const compileShader = (type, src) => {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
  return sh;
};

// ── Build program ─────────────────────────────────────────────────────────────
const prog = gl.createProgram();
gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, VERT_SRC));
gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, FRAG_SRC));
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);

// ── Fullscreen quad ───────────────────────────────────────────────────────────
const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
const aPos = gl.getAttribLocation(prog, "a_pos");
gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

// ── Uniform locations ─────────────────────────────────────────────────────────
const uRes = gl.getUniformLocation(prog, "uResolution");
const uHueL = gl.getUniformLocation(prog, "uHue");
const uBlobRL = gl.getUniformLocation(prog, "uBlobR");
const uMobileScaleL = gl.getUniformLocation(prog, "uMobileScale");
const uMobileTaperL = gl.getUniformLocation(prog, "uMobileTaper");
const uTrailL = Array.from({ length: TRAIL_LENGTH }, (_, i) => gl.getUniformLocation(prog, `uTrail[${i}]`));

// ── Resize ────────────────────────────────────────────────────────────────────
const resize = () => {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  gl.viewport(0, 0, canvas.width, canvas.height);
};
resize();
window.addEventListener("resize", resize);

// ── Pointer tracking ──────────────────────────────────────────────────────────
const pushTrail = (clientX, clientY) => {
  const rect = canvas.getBoundingClientRect();
  const minSz = Math.min(rect.width, rect.height);
  const nx = (2 * (clientX - rect.left) - rect.width) / minSz;
  const ny = (rect.height - 2 * (clientY - rect.top)) / minSz;
  for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
    trail[i].x = trail[i - 1].x;
    trail[i].y = trail[i - 1].y;
  }
  trail[0].x = nx;
  trail[0].y = ny;
};

canvas.addEventListener("mousemove", (e) => pushTrail(e.clientX, e.clientY));
canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    pushTrail(e.touches[0].clientX, e.touches[0].clientY);
  },
  { passive: false },
);

// Click to cycle to a new random rainbow hue
canvas.addEventListener("click", () => {
  hue = Math.random();
});

// ── Debug UI (lil-gui) ────────────────────────────────────────────────────────
const gui = new lil.GUI({ title: "Metaball Controls" });

const settings = {
  mainBlobSize: MAIN_BLOB_SIZE_VH,
  mobileBlobScale: MOBILE_BLOB_SCALE,
  mobileBlobTaper: MOBILE_BLOB_TAPER,
  randomizeColor: () => {
    hue = Math.random();
  },
};

gui
  .add(settings, "mainBlobSize", 0.01, 0.15, 0.005)
  .name("Main Blob Size")
  .onChange((v) => {
    MAIN_BLOB_SIZE_VH = v;
  });

gui
  .add(settings, "mobileBlobScale", 0.05, 0.8, 0.01)
  .name("Mobile Blob Scale")
  .onChange((v) => {
    MOBILE_BLOB_SCALE = v;
  });

gui
  .add(settings, "mobileBlobTaper", 0.01, 0.2, 0.01)
  .name("Mobile Blob Taper")
  .onChange((v) => {
    MOBILE_BLOB_TAPER = v;
  });

gui.add(settings, "randomizeColor").name("Randomize Color");

// ── Render loop ───────────────────────────────────────────────────────────────
const render = () => {
  const minSz = Math.min(canvas.offsetWidth, canvas.offsetHeight);
  // Main blob size in NDC (shorter-axis spans [-1,+1] = 2 units)
  const blobR = (window.innerHeight * MAIN_BLOB_SIZE_VH) / minSz;

  gl.uniform2f(uRes, canvas.width, canvas.height);
  gl.uniform1f(uHueL, hue);
  gl.uniform1f(uBlobRL, blobR);
  gl.uniform1f(uMobileScaleL, MOBILE_BLOB_SCALE);
  gl.uniform1f(uMobileTaperL, MOBILE_BLOB_TAPER);
  for (let i = 0; i < TRAIL_LENGTH; i++) gl.uniform2f(uTrailL[i], trail[i].x, trail[i].y);

  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  requestAnimationFrame(render);
};

render();
