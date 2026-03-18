let colors = ["#00916e", "#f71735", "#ff9f1c", "#067bc2", "#ecc30b", "#ffffff"];
let resizeTimeout;
let cells = [];
let noiseFilter;
let t = 0;

const params = {
  sideRatio: 0.75,
  gridCount: 20,
  noiseAlpha: 25,
  background: 2,
  speed: 0.004,
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
      gui.add(params, "sideRatio", 0.1, 1, 0.01).name("Side ratio").onFinishChange(initCells);
      gui.add(params, "gridCount", 2, 60, 1).name("Grid count").onFinishChange(initCells);
      gui.add(params, "noiseAlpha", 0, 255, 1).name("Noise alpha").onFinishChange(buildNoiseFilter);
      gui.add(params, "background", 0, 360, 1).name("Background");
      gui.add(params, "speed", 0, 0.02, 0.001).name("Speed");
    };
    document.head.appendChild(script);
  }

  initCells();
  buildNoiseFilter();
}

const initCells = () => {
  cells = [];
  const c = params.gridCount;
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
        nx: random(1000),
        ny: random(1000),
      });
    }
  }
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

  for (const cell of cells) {
    const x = cell.j * w + w / 2 + (width - side) / 2;
    const y = cell.i * w + w / 2 + (height - side) / 2;
    const a = noise(cell.nx + t, cell.ny + t) * TAU * 2;
    const lenFactor = map(noise(cell.nx + t * 0.5 + 500, cell.ny + t * 0.5 + 500), 0, 1, 1.5, 8);
    superCircle(x, y, w * 0.5, a, cell.col1, cell.col2, lenFactor);
  }

  if (noiseFilter) image(noiseFilter, 0, 0);
}

const superCircle = (x, y, d, a, col1str, col2str, lenFactor) => {
  const len = d * lenFactor;
  const grd = drawingContext.createLinearGradient(0, 0, len, 0);
  const col1 = color(col1str);
  const col2 = color(col2str);
  const cc = lerpColor(col1, col2, 0.5);
  col2.setAlpha(0);
  push();
  translate(x, y);
  rotate(a);
  grd.addColorStop(0, col1);
  grd.addColorStop(0.5, color(hue(cc), 100, 100, 10));
  grd.addColorStop(1, col2);
  drawingContext.strokeStyle = grd;
  strokeWeight(d);
  line(0, 0, len, 0);
  noStroke();
  fill(col1str);
  circle(0, 0, d);
  pop();
};
