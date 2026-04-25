const canvas = document.getElementById("grid-canvas");
const ctx = canvas.getContext("2d");

const state = {
  cursor: { x: 0, y: 0 },
  panes: [],
  waves: [],
};

const config = {
  paneSize: 60,
  paneGap: 1,
  maxTiltDeg: 30,
  perspective: 1000,
  effectRadiusFactor: 2,
  falloffExponent: 5,
  shadingStrength: 0.2,
  waveSpeed: 1500,
  waveFlipDurationMs: 500,
  waveFlipAngleDeg: 180,
  tileBackgroundColor: "#ffffff",
  color: "#ffffff",
  stroke: "rgba(0, 0, 0, 0.05)",
  background: "#f3f3f3",
};

function resolveColorInput(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }
  const color = value.trim();
  if (color.length === 0) {
    return fallback;
  }
  const parserNode = document.createElement("span");
  parserNode.style.color = "";
  parserNode.style.color = color;
  return parserNode.style.color ? color : fallback;
}

function easeInOutCubic(t) {
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getWaveRotation(nowMs, paneX, paneY) {
  if (state.waves.length === 0) {
    return 0;
  }

  let totalRotation = 0;
  for (const wave of state.waves) {
    const dx = paneX - wave.x;
    const dy = paneY - wave.y;
    const distance = Math.hypot(dx, dy);
    const arrivalMs = (distance / config.waveSpeed) * 1000;
    const localElapsed = nowMs - wave.startMs - arrivalMs;
    const localT = localElapsed / config.waveFlipDurationMs;

    if (localT <= 0 || localT >= 1) {
      continue;
    }

    const eased = easeInOutCubic(localT);
    const flipPhase = Math.sin(eased * Math.PI);
    totalRotation += flipPhase * ((config.waveFlipAngleDeg * Math.PI) / 180);
  }

  // Keep stacking behavior, but prevent extreme projection distortion.
  const maxCombinedRotation = Math.PI * 0.95;
  return Math.max(-maxCombinedRotation, Math.min(maxCombinedRotation, totalRotation));
}

function startWave(x, y, nowMs) {
  const corners = [
    { x: 0, y: 0 },
    { x: window.innerWidth, y: 0 },
    { x: 0, y: window.innerHeight },
    { x: window.innerWidth, y: window.innerHeight },
  ];
  const maxDistance = Math.max(...corners.map((corner) => Math.hypot(corner.x - x, corner.y - y)));
  const travelMs = (maxDistance / config.waveSpeed) * 1000;

  state.waves.push({
    x,
    y,
    startMs: nowMs,
    endMs: nowMs + travelMs + config.waveFlipDurationMs,
  });
}

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

function drawPane(pane, nowMs) {
  const dx = state.cursor.x - pane.x;
  const dy = state.cursor.y - pane.y;
  const distance = Math.hypot(dx, dy);
  const influenceRadius = Math.max(window.innerWidth, window.innerHeight) * config.effectRadiusFactor;
  const influence = Math.max(0, 1 - distance / influenceRadius);
  const dirX = distance > 0.0001 ? dx / distance : 0;
  const dirY = distance > 0.0001 ? dy / distance : 0;

  const maxTiltRad = (config.maxTiltDeg * Math.PI) / 180;
  const tiltStrength = Math.pow(influence, config.falloffExponent);
  const baseRotY = dirX * maxTiltRad * tiltStrength;
  const baseRotX = -dirY * maxTiltRad * tiltStrength;
  const waveRotX = getWaveRotation(nowMs, pane.x, pane.y);
  const rotY = baseRotY;
  const rotX = baseRotX + waveRotX;
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

  ctx.fillStyle = resolveColorInput(config.tileBackgroundColor, "transparent");
  ctx.globalAlpha = 1;
  ctx.fill();

  const alpha = 0.72 + influence * 0.2;
  ctx.fillStyle = resolveColorInput(config.color, "#ffffff");
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
  ctx.fillStyle = resolveColorInput(config.background, "#ececec");
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function render(nowMs = performance.now()) {
  if (state.waves.length > 0) {
    state.waves = state.waves.filter((wave) => nowMs <= wave.endMs);
  }

  drawBackground();
  for (const pane of state.panes) {
    drawPane(pane, nowMs);
  }
  requestAnimationFrame(render);
}

window.addEventListener("pointermove", (event) => {
  state.cursor.x = event.clientX;
  state.cursor.y = event.clientY;
});

canvas.addEventListener("pointerdown", (event) => {
  startWave(event.clientX, event.clientY, performance.now());
});

window.addEventListener("resize", setCanvasSize);

setCanvasSize();
render();
