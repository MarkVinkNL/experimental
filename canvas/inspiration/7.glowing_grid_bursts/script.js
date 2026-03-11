let colors = ["#00916e", "#f71735", "#ff9f1c", "#067bc2", "#ecc30b", "#ffffff"];
let resizeTimeout;

const params = {
  sideRatio: 0.75,
  gridCount: 20,
  noiseAlpha: 25,
  background: 2,
};

function setup() {
  const wrapper = document.querySelector(".canvas-wrapper");
  let canvas = createCanvas(wrapper.offsetWidth, wrapper.offsetHeight);
  canvas.parent(wrapper);

  const observer = new ResizeObserver(() => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resizeCanvas(wrapper.offsetWidth, wrapper.offsetHeight);
      render();
    }, 100);
  });
  observer.observe(wrapper);

  if (window.location.hash === "#debug") {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/lil-gui@0.19";
    script.onload = () => {
      const gui = new lil.GUI();
      gui.add(params, "sideRatio", 0.1, 1, 0.01).name("Side ratio").onFinishChange(render);
      gui.add(params, "gridCount", 2, 60, 1).name("Grid count").onFinishChange(render);
      gui.add(params, "noiseAlpha", 0, 255, 1).name("Noise alpha").onFinishChange(render);
      gui.add(params, "background", 0, 360, 1).name("Background").onFinishChange(render);
    };
    document.head.appendChild(script);
  }

  render();
}

function draw() {}

function render() {
  colorMode(HSB, 360, 100, 100, 100);
  background(params.background);
  let side = width * params.sideRatio;
  let c = params.gridCount;
  let w = side / c;
  for (let i = 0; i < c; i++) {
    for (let j = 0; j < c; j++) {
      let x = j * w + w / 2 + (width - side) / 2;
      let y = i * w + w / 2 + (height - side) / 2;
      superCircle(x, y, w * 0.5, int(random(8)) * (TAU / 8));
    }
  }

  let noiseFilter;
  noiseFilter = createImage(width, height);
  noiseFilter.loadPixels();
  let pix = noiseFilter.width * noiseFilter.height * 4;
  for (let i = 0; i < pix; i += 4) {
    noiseFilter.pixels[i] = random(255);
    noiseFilter.pixels[i + 1] = random(255);
    noiseFilter.pixels[i + 2] = random(255);
    noiseFilter.pixels[i + 3] = params.noiseAlpha;
  }
  noiseFilter.updatePixels();
  image(noiseFilter, 0, 0);
}

function superCircle(x, y, d, a) {
  let len = d * random(2, 10);
  let grd = drawingContext.createLinearGradient(0, 0, len, 0);
  let col1 = (col2 = "🫠");
  while (col1 == col2) {
    col1 = color(random(colors));
    col2 = color(random(colors));
  }
  let cc = lerpColor(col1, col2, 0.5);
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
  fill(col1);
  circle(0, 0, d);
  pop();
}
