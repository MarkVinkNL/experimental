const config = {
  backgroundColor: "#ffffff",
  palette: ["#ff9500", "#18a2be", "#ff009c", "#015df6", "#8600b7"],
  ballCount: 100,
  ballSize: 5,
  velocity: 0.01,
  repulsionForce: 2,
  maxSpeed: 2,
  opacity: 13,
};

let gui;
let pos = [];
let ctx;
let centerX, centerY;
let resizeTimeout;

function setup() {
  let parent = document.querySelector(".canvas-wrapper");
  let canvas = createCanvas(parent.offsetWidth, parent.offsetHeight);
  canvas.parent(parent);
  rectMode(CENTER);
  colorMode(HSB, 360, 100, 100, 100);
  blendMode(MULTIPLY);
  ctx = drawingContext;
  centerX = width / 2;
  centerY = height / 2;

  initializeBalls();
  setupGUI();
  setupResizeObserver();
}

function setupResizeObserver() {
  const parent = document.querySelector(".canvas-wrapper");
  const resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resizeCanvas(parent.offsetWidth, parent.offsetHeight);
      centerX = width / 2;
      centerY = height / 2;
    }, 100);
  });
  resizeObserver.observe(parent);
}

function windowResized() {
  // Handled by ResizeObserver instead
}

function initializeBalls() {
  pos = [];
  for (let i = 0; i < config.ballCount; i++) {
    let x = random(0.4, 0.6) * width;
    let y = random(0.4, 0.6) * height;
    pos.push(new Ball(x, y, config.ballSize, config.palette[i % config.palette.length]));
  }
}

function setupGUI() {
  gui = new lil.GUI();

  gui.addColor(config, "backgroundColor").name("Background Color");

  const paletteFolder = gui.addFolder("Palette Colors");
  config.palette.forEach((color, index) => {
    paletteFolder.addColor(config.palette, index).name(`Color ${index + 1}`);
  });
  paletteFolder.open();

  gui
    .add(config, "ballCount", 10, 200, 1)
    .name("Ball Count")
    .onChange(() => {
      initializeBalls();
    });

  gui
    .add(config, "ballSize", 1, 20, 0.5)
    .name("Ball Size")
    .onChange(() => {
      initializeBalls();
    });

  gui.add(config, "velocity", 0.001, 0.05, 0.001).name("Velocity");
  gui.add(config, "repulsionForce", 0, 5, 0.1).name("Repulsion Force");
  gui.add(config, "maxSpeed", 0.5, 10, 0.5).name("Max Speed");
  gui.add(config, "opacity", 0, 100, 1).name("Shape Opacity");
}

function draw() {
  clear();
  background(config.backgroundColor);

  for (let i = 0; i < pos.length; i++) {
    for (let j = i + 1; j < pos.length; j++) {
      pos[i].applyRepulsion(pos[j]);
    }
  }

  for (let i = 0; i < pos.length; i++) {
    let p1 = pos[i];
    let neighbors = [];
    for (let j = 0; j < pos.length; j++) {
      if (i === j) continue;
      let d = dist(p1.x, p1.y, pos[j].x, pos[j].y);
      neighbors.push({ point: pos[j], distance: d });
    }
    neighbors.sort((a, b) => a.distance - b.distance);

    let c = color(config.palette[i % config.palette.length]);
    c.setAlpha(config.opacity);
    fill(c);
    stroke(c);
    beginShape();
    vertex(p1.x, p1.y);
    for (let j = 0; j < 3; j++) {
      let p = neighbors[j].point;
      vertex(p.x, p.y);
    }
    endShape();
  }

  for (let i of pos) {
    i.run();
  }
}

class Ball {
  constructor(x, y, d, clr) {
    this.x = x;
    this.y = y;
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(width * config.velocity);
    this.acc = createVector(0, 0);
    this.d = d;
    this.clr = clr;
  }

  applyRepulsion(other) {
    let force = p5.Vector.sub(this.pos, other.pos);
    let distance = force.mag();
    let repelDist = this.d * 2;

    if (distance < repelDist && distance > 0) {
      force.normalize();
      let strength = map(distance, 0, repelDist, config.repulsionForce, 0);
      force.mult(strength);

      this.acc.add(force);
      other.acc.sub(force);
    }
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(config.maxSpeed);
    this.pos.add(this.vel);

    this.vel.mult(0.999);
    this.acc.mult(0);

    let r = this.d / 2;
    if (this.pos.x <= r || this.pos.x >= width - r) this.vel.x *= -1;
    if (this.pos.y <= r || this.pos.y >= height - r) this.vel.y *= -1;

    this.pos.x = constrain(this.pos.x, r, width - r);
    this.pos.y = constrain(this.pos.y, r, height - r);

    this.x = this.pos.x;
    this.y = this.pos.y;
  }

  display() {
    fill(this.clr);
    noStroke();
    ellipse(this.x, this.y, this.d);
  }

  run() {
    this.update();
    this.display();
  }
}
