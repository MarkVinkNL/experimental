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
let particles = [];
let canvas, gl;
let shaderProgram, circleShaderProgram;
let resizeTimeout;

// Vertex shader for triangles
const triangleVertShader = `
attribute vec2 aPosition;
attribute vec4 aColor;
uniform vec2 uResolution;
varying vec4 vColor;

void main() {
  vec2 clipSpace = (aPosition / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  vColor = aColor;
}
`;

// Fragment shader for triangles with effects
const triangleFragShader = `
precision mediump float;
varying vec4 vColor;

void main() {
  vec3 color = vColor.rgb;
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  vec3 saturated = mix(vec3(luminance), color, 1.15);
  gl_FragColor = vec4(saturated, vColor.a);
}
`;

// Vertex shader for circles (particles)
const circleVertShader = `
attribute vec2 aPosition;
attribute vec2 aCenter;
attribute vec4 aColor;
attribute float aSize;
uniform vec2 uResolution;
varying vec4 vColor;
varying vec2 vPos;

void main() {
  vec2 pos = aCenter + aPosition * aSize;
  vec2 clipSpace = (pos / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  vColor = aColor;
  vPos = aPosition;
}
`;

// Fragment shader for circles with smooth edges
const circleFragShader = `
precision mediump float;
varying vec4 vColor;
varying vec2 vPos;

void main() {
  float dist = length(vPos);
  if (dist > 1.0) discard;
  float alpha = vColor.a * smoothstep(1.0, 0.8, dist);
  gl_FragColor = vec4(vColor.rgb, alpha);
}
`;

function init() {
  canvas = document.querySelector("canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    document.querySelector(".canvas-wrapper").appendChild(canvas);
  }

  gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: true,
  });

  if (!gl) {
    console.error("WebGL not supported");
    return;
  }

  resizeCanvas();

  // Create shader programs
  shaderProgram = createShaderProgram(triangleVertShader, triangleFragShader);
  circleShaderProgram = createShaderProgram(circleVertShader, circleFragShader);

  if (!shaderProgram) {
    console.error("Failed to create triangle shader program");
  }
  if (!circleShaderProgram) {
    console.error("Failed to create circle shader program");
  }

  initializeParticles();
  setupGUI();
  setupResizeObserver();

  // Start animation loop
  requestAnimationFrame(draw);
}

function createShaderProgram(vertSource, fragSource) {
  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, vertSource);
  gl.compileShader(vertShader);

  if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
    console.error("Vertex shader error:", gl.getShaderInfoLog(vertShader));
    return null;
  }

  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, fragSource);
  gl.compileShader(fragShader);

  if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
    console.error("Fragment shader error:", gl.getShaderInfoLog(fragShader));
    return null;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    return null;
  }

  return program;
}

function resizeCanvas() {
  const parent = document.querySelector(".canvas-wrapper");
  canvas.width = parent.offsetWidth;
  canvas.height = parent.offsetHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function setupResizeObserver() {
  const parent = document.querySelector(".canvas-wrapper");
  const resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resizeCanvas();
    }, 100);
  });
  resizeObserver.observe(parent);
}

function initializeParticles() {
  particles = [];
  for (let i = 0; i < config.ballCount; i++) {
    let x = (0.4 + Math.random() * 0.2) * canvas.width;
    let y = (0.4 + Math.random() * 0.2) * canvas.height;
    particles.push(new Particle(x, y, config.ballSize, config.palette[i % config.palette.length]));
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
    .add(config, "ballCount", 10, 2000, 1)
    .name("Ball Count")
    .onChange(() => {
      initializeParticles();
    });

  gui
    .add(config, "ballSize", 1, 20, 0.5)
    .name("Ball Size")
    .onChange(() => {
      initializeParticles();
    });

  gui.add(config, "velocity", 0.001, 0.05, 0.001).name("Velocity");
  gui.add(config, "repulsionForce", 0, 5, 0.1).name("Repulsion Force");
  gui.add(config, "maxSpeed", 0.5, 10, 0.5).name("Max Speed");
  gui.add(config, "opacity", 0, 100, 1).name("Shape Opacity");
}

function draw() {
  // Clear canvas with background color
  const bgColor = hexToRgb(config.backgroundColor);
  gl.clearColor(bgColor.r / 255, bgColor.g / 255, bgColor.b / 255, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Enable blending for transparency
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // Update physics
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      particles[i].applyRepulsion(particles[j]);
    }
  }

  for (let particle of particles) {
    particle.update();
  }

  // Draw triangles
  drawTriangles();

  // Draw circles
  drawCircles();

  requestAnimationFrame(draw);
}

function drawTriangles() {
  gl.useProgram(shaderProgram);

  const positionLoc = gl.getAttribLocation(shaderProgram, "aPosition");
  const colorLoc = gl.getAttribLocation(shaderProgram, "aColor");
  const resolutionLoc = gl.getUniformLocation(shaderProgram, "uResolution");

  gl.uniform2f(resolutionLoc, canvas.width, canvas.height);

  // Build triangle vertex data
  const vertices = [];
  const alpha = config.opacity / 100;

  for (let i = 0; i < particles.length; i++) {
    const p1 = particles[i];
    const neighbors = [];

    for (let j = 0; j < particles.length; j++) {
      if (i === j) continue;
      const dist = Math.hypot(p1.x - particles[j].x, p1.y - particles[j].y);
      neighbors.push({ particle: particles[j], distance: dist });
    }

    neighbors.sort((a, b) => a.distance - b.distance);
    const color = hexToRgb(config.palette[i % config.palette.length]);

    // Draw triangles connecting to 3 nearest neighbors
    if (neighbors.length >= 3) {
      // Triangle 1: p1 -> neighbor[0] -> neighbor[1]
      vertices.push(
        p1.x,
        p1.y,
        color.r / 255,
        color.g / 255,
        color.b / 255,
        alpha,
        neighbors[0].particle.x,
        neighbors[0].particle.y,
        color.r / 255,
        color.g / 255,
        color.b / 255,
        alpha,
        neighbors[1].particle.x,
        neighbors[1].particle.y,
        color.r / 255,
        color.g / 255,
        color.b / 255,
        alpha,
      );

      // Triangle 2: p1 -> neighbor[1] -> neighbor[2]
      vertices.push(
        p1.x,
        p1.y,
        color.r / 255,
        color.g / 255,
        color.b / 255,
        alpha,
        neighbors[1].particle.x,
        neighbors[1].particle.y,
        color.r / 255,
        color.g / 255,
        color.b / 255,
        alpha,
        neighbors[2].particle.x,
        neighbors[2].particle.y,
        color.r / 255,
        color.g / 255,
        color.b / 255,
        alpha,
      );
    }
  }

  if (vertices.length === 0) return;

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  const stride = 6 * 4; // 6 floats per vertex

  if (positionLoc >= 0) {
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0);
  }

  if (colorLoc >= 0) {
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 2 * 4);
  }

  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 6);

  // Disable attributes after drawing
  if (positionLoc >= 0) gl.disableVertexAttribArray(positionLoc);
  if (colorLoc >= 0) gl.disableVertexAttribArray(colorLoc);

  gl.deleteBuffer(buffer);
}

function drawCircles() {
  gl.useProgram(circleShaderProgram);

  const positionLoc = gl.getAttribLocation(circleShaderProgram, "aPosition");
  const centerLoc = gl.getAttribLocation(circleShaderProgram, "aCenter");
  const colorLoc = gl.getAttribLocation(circleShaderProgram, "aColor");
  const sizeLoc = gl.getAttribLocation(circleShaderProgram, "aSize");
  const resolutionLoc = gl.getUniformLocation(circleShaderProgram, "uResolution");

  gl.uniform2f(resolutionLoc, canvas.width, canvas.height);

  // Circle quad vertices (unit square)
  const quadPositions = [-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1];

  // Build instance data
  const instanceData = [];

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const color = hexToRgb(p.color);
    const radius = config.ballSize;

    for (let j = 0; j < 6; j++) {
      instanceData.push(
        quadPositions[j * 2],
        quadPositions[j * 2 + 1], // position
        p.x,
        p.y, // center
        color.r / 255,
        color.g / 255,
        color.b / 255,
        0.86, // color
        radius, // size
      );
    }
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceData), gl.STATIC_DRAW);

  const stride = 9 * 4;

  if (positionLoc >= 0) {
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0);
  }

  if (centerLoc >= 0) {
    gl.enableVertexAttribArray(centerLoc);
    gl.vertexAttribPointer(centerLoc, 2, gl.FLOAT, false, stride, 2 * 4);
  }

  if (colorLoc >= 0) {
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 4 * 4);
  }

  if (sizeLoc >= 0) {
    gl.enableVertexAttribArray(sizeLoc);
    gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, stride, 8 * 4);
  }

  gl.drawArrays(gl.TRIANGLES, 0, instanceData.length / 9);

  // Disable attributes after drawing
  if (positionLoc >= 0) gl.disableVertexAttribArray(positionLoc);
  if (centerLoc >= 0) gl.disableVertexAttribArray(centerLoc);
  if (colorLoc >= 0) gl.disableVertexAttribArray(colorLoc);
  if (sizeLoc >= 0) gl.disableVertexAttribArray(sizeLoc);

  gl.deleteBuffer(buffer);
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function constrain(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

class Particle {
  constructor(x, y, d, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * canvas.width * config.velocity;
    this.vy = (Math.random() - 0.5) * canvas.height * config.velocity;
    this.ax = 0;
    this.ay = 0;
    this.d = d;
    this.color = color;
  }

  applyRepulsion(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dist = Math.hypot(dx, dy);
    const repelDist = this.d * 2;

    if (dist < repelDist && dist > 0) {
      const force = dist / repelDist;
      const strength = (1 - force) * config.repulsionForce;
      const fx = (dx / dist) * strength;
      const fy = (dy / dist) * strength;

      this.ax += fx;
      this.ay += fy;
      other.ax -= fx;
      other.ay -= fy;
    }
  }

  update() {
    this.vx += this.ax;
    this.vy += this.ay;

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > config.maxSpeed) {
      this.vx = (this.vx / speed) * config.maxSpeed;
      this.vy = (this.vy / speed) * config.maxSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    this.vx *= 0.999;
    this.vy *= 0.999;
    this.ax = 0;
    this.ay = 0;

    const r = this.d / 2;
    if (this.x <= r || this.x >= canvas.width - r) this.vx *= -1;
    if (this.y <= r || this.y >= canvas.height - r) this.vy *= -1;

    this.x = constrain(this.x, r, canvas.width - r);
    this.y = constrain(this.y, r, canvas.height - r);
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
