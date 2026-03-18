/*
By Okazz
*/
let colors = ["#e6302b", "#fbd400", "#36ad63", "#2B50AA", "#232323", "#f654a9"];
let ctx;
let centerX, centerY;
let bubbles = [];

// GUI settings
let settings = {
  bubbleSize: 0.3,
  wispSpawnRate: 0.02,
  wispSizeMin: 0.25,
  wispSizeMax: 0.75,
  wispDistanceMin: 0.75,
  wispDistanceMax: 1.25,
  randomizeColor: function () {
    if (bubbles.length > 0) {
      bubbles[0].clr = random(colors);
    }
  },
};

function setup() {
  createCanvas(900, 900);
  rectMode(CENTER);
  colorMode(HSB, 360, 100, 100, 100);
  ctx = drawingContext;
  centerX = width / 2;
  centerY = height / 2;
  // Single centered bubble
  let bubbleSize = width * settings.bubbleSize;
  bubbles.push(new Bubble(centerX, centerY, bubbleSize));

  // Setup GUI
  const gui = new lil.GUI({ title: "Bubble Controls" });

  gui
    .add(settings, "bubbleSize", 0.1, 0.6, 0.05)
    .name("Bubble Size")
    .onChange((v) => {
      if (bubbles.length > 0) {
        bubbles[0].d = width * v;
        bubbles[0].dst = bubbles[0].d / 2;
      }
    });

  gui.add(settings, "wispSpawnRate", 0.001, 0.1, 0.001).name("Wisp Spawn Rate");

  gui.add(settings, "wispSizeMin", 0.1, 0.5, 0.05).name("Wisp Size Min");

  gui.add(settings, "wispSizeMax", 0.5, 1.0, 0.05).name("Wisp Size Max");

  gui.add(settings, "wispDistanceMin", 0.5, 1.5, 0.05).name("Wisp Distance Min");

  gui.add(settings, "wispDistanceMax", 1.0, 2.0, 0.05).name("Wisp Distance Max");

  gui.add(settings, "randomizeColor").name("Randomize Color");
}

function draw() {
  background(255);
  for (let b of bubbles) {
    b.run();
  }
}

function aetherLink(x1, y1, d1, x2, y2, d2, dst) {
  let r = dst / 2;

  let r1 = d1 / 2;
  let r2 = d2 / 2;
  let R1 = r1 + r;
  let R2 = r2 + r;

  let dx = x2 - x1;
  let dy = y2 - y1;
  let d = sqrt(dx * dx + dy * dy);

  if (d > R1 + R2) {
    return;
  }

  let dirX = dx / d;
  let dirY = dy / d;

  let a = (R1 * R1 - R2 * R2 + d * d) / (2 * d);
  let underRoot = R1 * R1 - a * a;
  if (underRoot < 0) return;
  let h = sqrt(underRoot);

  let midX = x1 + dirX * a;
  let midY = y1 + dirY * a;

  let perpX = -dirY * h;
  let perpY = dirX * h;

  let cx1 = midX + perpX;
  let cy1 = midY + perpY;

  let cx2 = midX - perpX;
  let cy2 = midY - perpY;

  if (dist(cx1, cy1, cx2, cy2) < r * 2) {
    return;
  }

  let ang1 = atan2(y1 - cy1, x1 - cx1);
  let ang2 = atan2(y2 - cy1, x2 - cx1);
  let ang3 = atan2(y2 - cy2, x2 - cx2);
  let ang4 = atan2(y1 - cy2, x1 - cx2);

  if (ang2 < ang1) {
    ang2 += TAU;
  }
  beginShape();
  for (let i = ang1; i < ang2; i += TAU / 180) {
    vertex(cx1 + r * cos(i), cy1 + r * sin(i));
  }

  if (ang4 < ang3) {
    ang4 += TAU;
  }
  for (let i = ang3; i < ang4; i += TAU / 180) {
    vertex(cx2 + r * cos(i), cy2 + r * sin(i));
  }
  endShape();
}

function easeOutQuint(x) {
  return 1 - Math.pow(1 - x, 5);
}

class Bubble {
  constructor(x, y, d) {
    this.x = x;
    this.y = y;
    this.d = d;
    this.cage = [];
    this.dst = this.d / 2;
    this.clr = random(colors);
  }

  show() {
    push();
    translate(this.x, this.y);
    noStroke();
    fill(this.clr);
    circle(0, 0, this.d);

    for (let c of this.cage) {
      c.run();
    }

    for (let c of this.cage) {
      aetherLink(c.x, c.y, c.d, 0, 0, this.d, this.dst);
    }

    for (let i = 0; i < this.cage.length; i++) {
      if (this.cage[i].isDead) {
        this.cage.splice(i, 1);
      }
    }

    if (random() < settings.wispSpawnRate) {
      this.addWisp();
    }
    pop();
  }

  addWisp() {
    this.cage.push(
      new Wisp(
        0,
        0,
        this.d * random(settings.wispSizeMin, settings.wispSizeMax),
        this.d * random(settings.wispDistanceMin, settings.wispDistanceMax),
      ),
    );
  }

  run() {
    this.show();
  }
}

class Wisp {
  constructor(x, y, d, r) {
    this.x = x;
    this.y = y;
    this.d = d;
    this.timer = 0;
    this.endTime = int(random(60, 200));
    this.ang = random(TAU);
    this.r = r;
    this.originX = this.x;
    this.originY = this.y;
    this.targetX = this.x + this.r * cos(this.ang);
    this.targetY = this.y + this.r * sin(this.ang);
    this.originD = d;
    this.isDead = false;
  }

  show() {
    if (this.isDead == false) {
      circle(this.x, this.y, this.d);
    }
  }

  move() {
    this.timer++;
    if (0 < this.timer && this.timer < this.endTime) {
      let n = norm(this.timer, 0, this.endTime);
      this.x = lerp(this.originX, this.targetX, easeOutQuint(n));
      this.y = lerp(this.originY, this.targetY, easeOutQuint(n));
      this.d = lerp(this.originD, 0, n);
    }
    if (this.timer > this.endTime) {
      this.isDead = true;
    }
  }

  run() {
    this.show();
    this.move();
  }
}
