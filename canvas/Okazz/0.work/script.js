const palettes = {
  Original: ["#102c33", "#fba765", "#ff3838", "#66023c", "#004f54", "#f1efe8"],
  Neon: ["#ff00ff", "#00ffff", "#ff006e", "#8338ec", "#3a86ff", "#ffffff"],
  Pastel: ["#ffadad", "#ffd6a5", "#fdffb6", "#caffbf", "#9bf6ff", "#bdb2ff"],
  Monochrome: ["#ffffff", "#d9d9d9", "#a6a6a6", "#737373", "#404040", "#0d0d0d"],
  Sunset: ["#ff4e50", "#fc913a", "#f9d423", "#ede574", "#e1f5c4", "#ffffff"],
  Ocean: ["#03045e", "#0077b6", "#00b4d8", "#90e0ef", "#caf0f8", "#ffffff"],
  Forest: ["#1b4332", "#2d6a4f", "#40916c", "#74c69d", "#b7e4c7", "#ffffff"],
  Candy: ["#ff006e", "#fb5607", "#ffbe0b", "#8338ec", "#3a86ff", "#ffffff"],
};
let colors = palettes.Original;
let resizeTimeout;
let cells = [];
let noiseFilter;
let t = 0;

const params = {
  sideRatio: 0.75,
  gridCount: 20,
  noiseAlpha: 25,
  background: 2,
  speed: 0.025,
  duration: 0.8,
  stagger: 0.004,
  paused: false,
  tailLength: 1.0,
  palette: "Original",
  vignetteSize: 0.7,
};

const actions = {
  replay: () => {
    t = 0;
    params.paused = false;
    if (window._gui) window._gui.controllers.forEach((c) => c.updateDisplay());
    loop();
  },
};

function setup() {
  const wrapper = document.querySelector(".canvas-wrapper");
  let canvas = createCanvas(wrapper.offsetWidth, wrapper.offsetHeight);
  canvas.parent(wrapper);

  const observer = new ResizeObserver(() => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resizeCanvas(wrapper.offsetWidth, wrapper.offsetHeight);
      initCells();
      buildNoiseFilter();
    }, 100);
  });
  observer.observe(wrapper);

  if (window.location.hash === "#debug") {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/lil-gui@0.19";
    script.onload = () => {
      const gui = new lil.GUI();
      window._gui = gui;

      const playback = gui.addFolder("Playback");
      playback.add(params, "speed", 0.005, 0.08, 0.001).name("Speed");
      playback.add(params, "duration", 0.1, 3, 0.05).name("Duration");
      playback.add(params, "stagger", 0, 0.015, 0.0005).name("Stagger");
      playback
        .add(params, "paused")
        .name("Paused")
        .onChange((v) => (v ? noLoop() : loop()));
      playback.add(actions, "replay").name("Replay");

      const scene = gui.addFolder("Scene");
      scene.add(params, "sideRatio", 0.1, 1, 0.01).name("Side ratio").onFinishChange(initCells);
      scene.add(params, "gridCount", 2, 60, 1).name("Grid count").onFinishChange(initCells);
      scene.add(params, "noiseAlpha", 0, 255, 1).name("Noise alpha").onFinishChange(buildNoiseFilter);
      scene.add(params, "background", 0, 360, 1).name("Background HSB");
      scene.add(params, "tailLength", 0.1, 5, 0.05).name("Tail length");
      scene.add(params, "vignetteSize", 0, 1, 0.01).name("Vignette");
      scene
        .add(params, "palette", Object.keys(palettes))
        .name("Palette")
        .onChange((v) => {
          colors = palettes[v];
          initCells();
        });
    };
    document.head.appendChild(script);
  }

  initCells();
  buildNoiseFilter();
}

const initCells = () => {
  cells = [];
  t = 0;
  const c = params.gridCount;
  const total = c * c;

  // build a shuffled index array so stagger order is random
  const order = Array.from({ length: total }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = int(random(i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  let n = 0;
  for (let i = 0; i < c; i++) {
    for (let j = 0; j < c; j++) {
      let col1idx = int(random(colors.length));
      let col2idx;
      do {
        col2idx = int(random(colors.length));
      } while (col2idx === col1idx);
      cells.push({
        i,
        j,
        col1: colors[col1idx],
        col2: colors[col2idx],
        a: int(random(8)) * (TAU / 8),
        lenFactor: random(2, 8),
        idx: order[n++],
      });
    }
  }
  loop();
};

const drawVignette = () => {
  if (params.vignetteSize <= 0) return;
  // Sample background color as RGB to build a CSS rgba string
  colorMode(HSB, 360, 100, 100, 100);
  const bg = color(params.background);
  const r = round(red(bg)),
    g = round(green(bg)),
    b = round(blue(bg));
  const fadeW = width * params.vignetteSize * 0.5;
  const fadeH = height * params.vignetteSize * 0.5;
  const opaque = `rgba(${r},${g},${b},1)`;
  const clear = `rgba(${r},${g},${b},0)`;

  drawingContext.save();

  // Four edge bands: left, right, top, bottom
  const edges = [
    { x0: 0, y0: 0, x1: fadeW, y1: 0, rx: 0, ry: 0, rw: fadeW, rh: height },
    { x0: width, y0: 0, x1: width - fadeW, y1: 0, rx: width - fadeW, ry: 0, rw: fadeW, rh: height },
    { x0: 0, y0: 0, x1: 0, y1: fadeH, rx: 0, ry: 0, rw: width, rh: fadeH },
    { x0: 0, y0: height, x1: 0, y1: height - fadeH, rx: 0, ry: height - fadeH, rw: width, rh: fadeH },
  ];

  for (const e of edges) {
    const grd = drawingContext.createLinearGradient(e.x0, e.y0, e.x1, e.y1);
    grd.addColorStop(0, opaque);
    grd.addColorStop(1, clear);
    drawingContext.fillStyle = grd;
    drawingContext.fillRect(e.rx, e.ry, e.rw, e.rh);
  }

  drawingContext.restore();
};

const buildNoiseFilter = () => {
  noiseFilter = createImage(width, height);
  noiseFilter.loadPixels();
  const pix = noiseFilter.width * noiseFilter.height * 4;
  for (let i = 0; i < pix; i += 4) {
    noiseFilter.pixels[i] = random(255);
    noiseFilter.pixels[i + 1] = random(255);
    noiseFilter.pixels[i + 2] = random(255);
    noiseFilter.pixels[i + 3] = params.noiseAlpha;
  }
  noiseFilter.updatePixels();
};

function draw() {
  t += params.speed;
  colorMode(HSB, 360, 100, 100, 100);

  background(params.background);

  const side = width * params.sideRatio;
  const c = params.gridCount;
  const w = side / c;

  const lastPhase = (cells.length - 1) * params.stagger;

  for (const cell of cells) {
    const x = cell.j * w + w / 2 + (width - side) / 2;
    const y = cell.i * w + w / 2 + (height - side) / 2;
    const phase = cell.idx * params.stagger;

    // Raw linear progress 0→1
    const raw = constrain(map(t, phase, phase + params.duration, 0, 1), 0, 1);
    // Ease-out cubic: decelerates smoothly on arrival
    const progress = 1 - pow(1 - raw, 3);

    // Compute distance from (x,y) to the canvas edge in direction cell.a
    const dx = cos(cell.a),
      dy = sin(cell.a);
    let edgeDist = 0;
    if (dx > 0) edgeDist = max(edgeDist, (width - x) / dx);
    else if (dx < 0) edgeDist = max(edgeDist, (0 - x) / dx);
    if (dy > 0) edgeDist = max(edgeDist, (height - y) / dy);
    else if (dy < 0) edgeDist = max(edgeDist, (0 - y) / dy);
    // Enforce a minimum of the canvas diagonal so every ball travels
    // a meaningful distance and always starts fully off-screen
    const diagonal = sqrt(width * width + height * height);
    const startDist = max(edgeDist + w, diagonal);

    superCircle(x, y, w * 0.5, cell.a, cell.col1, cell.col2, cell.lenFactor * params.tailLength, progress, startDist);
  }

  if (noiseFilter) image(noiseFilter, 0, 0);
  drawVignette();

  // stop once the last cell has finished arriving
  if (t > lastPhase + params.duration) noLoop();
}

const superCircle = (x, y, d, a, col1str, col2str, lenFactor, progress, startDist) => {
  const tailLen = d * lenFactor;
  // Ball travels from startDist (off-screen) → 0 (grid center)
  const bx = (1 - progress) * startDist;
  // Tail trails behind the ball, fixed length, pointing away from center
  const tailEnd = bx + tailLen;

  const col1 = color(col1str);
  const col2 = color(col2str);
  const cc = lerpColor(col1, col2, 0.5);
  col2.setAlpha(0);

  push();
  translate(x, y);
  rotate(a);

  // Draw tail from ball outward
  const grd = drawingContext.createLinearGradient(bx, 0, tailEnd, 0);
  grd.addColorStop(0, col1);
  grd.addColorStop(0.5, color(hue(cc), 100, 100, 10));
  grd.addColorStop(1, col2);
  drawingContext.strokeStyle = grd;
  strokeWeight(d);
  line(bx, 0, tailEnd, 0);

  noStroke();
  fill(col1str);
  circle(bx, 0, d);
  pop();
};
