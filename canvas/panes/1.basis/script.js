const canvas = document.getElementById("grid-canvas");
const ctx = canvas.getContext("2d");

const state = {
  cursor: { x: 0, y: 0 },
  panes: [],
};

const config = {
  paneSize: 100,
  paneGap: 1,
  maxTiltDeg: 30,
  perspective: 1000,
  effectRadiusFactor: 0.7,
  falloffExponent: 3,
  shadingStrength: 0.2,
  color: "#ffffff",
  stroke: "rgba(0, 0, 0, 0.15)",
  background: "#ececec",
};

function setCanvasSize() {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rebuildPaneGrid(width, height);

  if (state.cursor.x === 0 && state.cursor.y === 0) {
    state.cursor.x = width * 0.5;
    state.cursor.y = height * 0.5;
  }
}

function rebuildPaneGrid(width, height) {
  state.panes = [];

  const step = config.paneSize + config.paneGap;
  const cols = Math.ceil((width + config.paneGap) / step);
  const rows = Math.ceil((height + config.paneGap) / step);
  const startX = config.paneSize * 0.5;
  const startY = config.paneSize * 0.5;

  for (let row = 0; row <= rows; row += 1) {
    for (let col = 0; col <= cols; col += 1) {
      state.panes.push({
        x: startX + col * step,
        y: startY + row * step,
      });
    }
  }
}

function rotateAndProjectPoint(localX, localY, rotX, rotY, centerX, centerY) {
  let x = localX;
  let y = localY;
  let z = 0;

  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);

  const y1 = y * cosX - z * sinX;
  const z1 = y * sinX + z * cosX;

  const x2 = x * cosY + z1 * sinY;
  const z2 = -x * sinY + z1 * cosY;

  const scale = config.perspective / (config.perspective - z2);

  return {
    x: centerX + x2 * scale,
    y: centerY + y1 * scale,
  };
}

function drawPane(pane) {
  const dx = state.cursor.x - pane.x;
  const dy = state.cursor.y - pane.y;
  const distance = Math.hypot(dx, dy);
  const influenceRadius = Math.max(window.innerWidth, window.innerHeight) * config.effectRadiusFactor;
  const influence = Math.max(0, 1 - distance / influenceRadius);
  const dirX = distance > 0.0001 ? dx / distance : 0;
  const dirY = distance > 0.0001 ? dy / distance : 0;

  const maxTiltRad = (config.maxTiltDeg * Math.PI) / 180;
  const tiltStrength = Math.pow(influence, config.falloffExponent);
  const rotY = dirX * maxTiltRad * tiltStrength;
  const rotX = -dirY * maxTiltRad * tiltStrength;
  const normal = {
    x: Math.sin(rotY),
    y: -Math.sin(rotX),
    z: Math.cos(rotX) * Math.cos(rotY),
  };
  const lightDir = { x: -0.35, y: -0.45, z: 0.82 };
  const lightDot = Math.max(-1, Math.min(1, normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z));
  const shade = (lightDot + 1) * 0.5;

  const half = config.paneSize * 0.5;
  const projected = [
    rotateAndProjectPoint(-half, -half, rotX, rotY, pane.x, pane.y),
    rotateAndProjectPoint(half, -half, rotX, rotY, pane.x, pane.y),
    rotateAndProjectPoint(half, half, rotX, rotY, pane.x, pane.y),
    rotateAndProjectPoint(-half, half, rotX, rotY, pane.x, pane.y),
  ];

  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  ctx.lineTo(projected[1].x, projected[1].y);
  ctx.lineTo(projected[2].x, projected[2].y);
  ctx.lineTo(projected[3].x, projected[3].y);
  ctx.closePath();

  const alpha = 0.72 + influence * 0.2;
  ctx.fillStyle = config.color;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = config.stroke;
  ctx.lineWidth = 1;
  ctx.fill();
  const shadeAlpha = (1 - shade) * config.shadingStrength;
  if (shadeAlpha > 0.001) {
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = shadeAlpha;
    ctx.fill();
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBackground() {
  ctx.fillStyle = config.background;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function render() {
  drawBackground();
  for (const pane of state.panes) {
    drawPane(pane);
  }
  requestAnimationFrame(render);
}

window.addEventListener("pointermove", (event) => {
  state.cursor.x = event.clientX;
  state.cursor.y = event.clientY;
});

window.addEventListener("resize", setCanvasSize);

setCanvasSize();
render();
