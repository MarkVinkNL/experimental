/*
By Okazz
*/
let ctx;
let agents = [];
let gridAngle = 0;
let gridScale = 1;
let strokeSize = 0;
let timer = 0;
let resizeTimeout;

const params = {
  loopTime: 180,
  cellCount: 13,
  strokeWidth: 1,
  bgColor: "#ffffff",
  crossColor: "#000000",
  palette: ["#c1292e", "#f1d302", "#1A53C0", "#d67ab1", "#ff8c42", "#81c14b", "#2e933c", "#e4572e", "#17bebb"],
};

function setup() {
  const wrapper = document.querySelector(".canvas-wrapper");
  let canvas = createCanvas(wrapper.offsetWidth, wrapper.offsetHeight);
  canvas.parent(wrapper);
  rectMode(CENTER);
  ctx = drawingContext;
  strokeCap(SQUARE);

  if (window.location.href.includes("#debug")) {
    const gui = new lil.GUI();
    gui.add(params, "loopTime", 200, 1000, 1).name("Loop Time").onFinishChange(INIT);
    gui.add(params, "cellCount", 3, 30, 1).name("Cell Count").onFinishChange(INIT);
    gui.add(params, "strokeWidth", 0.1, 5, 0.01).name("Cross Width");
    gui.addColor(params, "bgColor").name("Background");
    gui.addColor(params, "crossColor").name("Cross Color");

    const paletteFolder = gui.addFolder("Palette");
    params.palette.forEach((_, i) => {
      paletteFolder.addColor(params.palette, i).name(`Color ${i + 1}`);
    });

    gui.add({ restart: INIT }, "restart").name("Restart");
  }

  INIT();
}

function windowResized() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const wrapper = document.querySelector(".canvas-wrapper");
    resizeCanvas(wrapper.offsetWidth, wrapper.offsetHeight);
    INIT();
  }, 100);
}

function draw() {
  background(params.bgColor);
  push();
  translate(width / 2, height / 2);
  scale(gridScale);
  scale(1.1);
  rotate(gridAngle);
  translate(-width / 2, -height / 2);
  for (let i of agents) {
    i.run();
  }
  pop();

  if (timer % params.loopTime == 0) {
    INIT();
  }

  gridAngle += PI / 4 / params.loopTime;
  gridScale += 0.415 / params.loopTime;
  strokeSize = map(timer, 0, params.loopTime, width * 0.01, width * 0.007) * params.strokeWidth;
  timer++;
}

function easeInOutQuint(x) {
  return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
}

function INIT() {
  agents = [];
  gridScale = 1;
  gridAngle = 0;
  timer = 0;
  let cellCount = params.cellCount;
  let size = max(width, height);
  let cellSize = size / cellCount;
  let offsetX = (width - size) / 2;
  let offsetY = (height - size) / 2;

  for (let i = 0; i < cellCount; i++) {
    for (let j = 0; j < cellCount; j++) {
      let x = i * cellSize + cellSize / 2 + offsetX;
      let y = j * cellSize + cellSize / 2 + offsetY;
      let dst = dist(x, y, width / 2, height / 2);
      let t = -int(dst / 4);
      agents.push(new Cross(x, y, cellSize, t));
    }
  }
}

class Cross {
  constructor(x, y, w, t) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.ang = 0;
    this.l = this.w / 2;
    this.t = t;
    this.t1 = 60;
    this.clr1 = color(params.crossColor);
    this.clr2 = color(random(params.palette));
    this.clr = this.clr1;
  }

  show() {
    push();
    translate(this.x, this.y);
    rotate(this.ang);
    strokeWeight(strokeSize);
    stroke(this.clr);
    line(this.l, 0, -this.l, 0);
    line(0, this.l, 0, -this.l);
    pop();
  }

  move() {
    if (0 < this.t && this.t < this.t1) {
      let n = norm(this.t, 0, this.t1 - 1);
      this.ang = lerp(0, PI / 4, easeInOutQuint(n));
      this.l = lerp(this.w / 2, dist(0, 0, this.w / 2, this.w / 2), easeInOutQuint(n));
      this.clr = lerpColor(this.clr1, this.clr2, sin(n * PI));
    }
    this.t++;
  }

  run() {
    this.show();
    this.move();
  }
}
