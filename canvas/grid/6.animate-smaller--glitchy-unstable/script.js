console.log("Script loaded successfully");

const canvas = document.getElementById("grid-canvas");
const ctx = canvas.getContext("2d");

// Configuration variables
const SIZING_OPTIONS = [
  { min: 100, max: 150 }, // Default sizing
  { min: 80, max: 120 },
  { min: 50, max: 100 },
  { min: 150, max: 200 },
];
let currentSizingIndex = 0;
let currentMin = SIZING_OPTIONS[0].min;
let currentMax = SIZING_OPTIONS[0].max;
let targetMin = SIZING_OPTIONS[0].min;
let targetMax = SIZING_OPTIONS[0].max;
let isAnimatingSizing = false;
let currentBestSquareSize;
let targetBestSquareSize;
let targetCols;
let targetRows;

const GRID_COLOR_1 = "#ffffff"; // Light gray background color
const GRID_COLOR_2 = "#ffffff"; // White background color
const SHOW_BACKGROUND = false; // Set to false to disable cell background colors
const SHOW_GRID_LINES = false; // Set to false to disable grid lines
const SCALE_UP_DURATION = 300; // Duration in ms for scaling up on hover
const SCALE_DOWN_DURATION = 500; // Duration in ms for scaling down on mouse out

const images = {};
const svgFiles = ["nox_n.svg", "nox_o.svg", "nox_x.svg"];
const letters = ["N", "O", "X"];
let imagesLoaded = 0;
const totalImages = svgFiles.length;
let gridReady = false;
let startTime;
let grid = [];
let hoveredRow = -1;
let hoveredCol = -1;

// Debounce function to limit how often resize events trigger
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const canvasWidth = canvas.parentElement.clientWidth;
  const canvasHeight = canvas.parentElement.clientHeight;

  // Set the actual size in memory (scaled to account for extra pixel density)
  canvas.width = canvasWidth * dpr;
  canvas.height = canvasHeight * dpr;

  // Reset the context transformation and scale for device pixel ratio
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Set the display size (CSS pixels)
  canvas.style.width = canvasWidth + "px";
  canvas.style.height = canvasHeight + "px";

  // Draw the grid after resizing
  if (gridReady) drawGrid();
}

// Initial resize
resizeCanvas();

// Create debounced resize function (wait 250ms after resize stops)
const debouncedResize = debounce(resizeCanvas, 250);

function loadImages() {
  svgFiles.forEach((file) => {
    const img = new Image();
    img.onload = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        gridReady = true;
        startTime = Date.now();
        animate();
      }
    };
    img.src = `img/${file}`;
    const key = file.replace("nox_", "").replace(".svg", "");
    images[key] = img;
  });
}

function animate() {
  drawGrid();
  requestAnimationFrame(animate);
}

// Resize when window resizes
window.addEventListener("resize", debouncedResize);

// Observe parent element for resize
const resizeObserver = new ResizeObserver(() => resizeCanvas());
resizeObserver.observe(canvas.parentElement);

// Mouse event handlers for hover effect
canvas.addEventListener("mousemove", handleMouseMove);
canvas.addEventListener("mouseout", handleMouseOut);

// Click to switch sizing
canvas.addEventListener("click", () => {
  const canvasWidth = canvas.parentElement.clientWidth;
  const canvasHeight = canvas.parentElement.clientHeight;
  const nextIndex = (currentSizingIndex + 1) % SIZING_OPTIONS.length;
  targetMin = SIZING_OPTIONS[nextIndex].min;
  targetMax = SIZING_OPTIONS[nextIndex].max;
  currentSizingIndex = nextIndex;

  // Calculate target bestSquareSize
  let tempBestSquareSize = targetMin;
  let tempBestCols = Math.floor(canvasWidth / targetMin);
  let tempBestGridWidth = tempBestCols * targetMin;
  for (let size = targetMin; size <= targetMax; size++) {
    const cols = Math.floor(canvasWidth / size);
    const gridWidth = cols * size;
    if (gridWidth > tempBestGridWidth && cols > 0) {
      tempBestSquareSize = size;
      tempBestCols = cols;
      tempBestGridWidth = gridWidth;
    }
  }
  targetBestSquareSize = tempBestSquareSize;
  targetCols = tempBestCols;
  targetRows = Math.ceil(canvasHeight / targetBestSquareSize);
  isAnimatingSizing = true;
});

function handleMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  // Compute bestSquareSize
  const canvasWidth = canvas.parentElement.clientWidth;
  const canvasHeight = canvas.parentElement.clientHeight;
  const minSize = currentMin;
  const maxSize = currentMax;
  let bestSquareSize = minSize;
  let bestCols = Math.floor(canvasWidth / minSize);
  let bestGridWidth = bestCols * minSize;
  for (let size = minSize; size <= maxSize; size++) {
    const cols = Math.floor(canvasWidth / size);
    const gridWidth = cols * size;
    if (gridWidth > bestGridWidth && cols > 0) {
      bestSquareSize = size;
      bestCols = cols;
      bestGridWidth = gridWidth;
    }
  }
  const newCol = Math.floor(x / bestSquareSize);
  const newRow = Math.floor(y / bestSquareSize);
  if (newRow >= 0 && newRow < grid.length && newCol >= 0 && newCol < grid[0].length && (newRow !== hoveredRow || newCol !== hoveredCol)) {
    if (hoveredRow >= 0 && hoveredCol >= 0) {
      grid[hoveredRow][hoveredCol].isHovered = false;
      grid[hoveredRow][hoveredCol].isScalingUp = false;
      grid[hoveredRow][hoveredCol].animationStart = Date.now();
    }
    hoveredRow = newRow;
    hoveredCol = newCol;
    grid[newRow][newCol].isHovered = true;
    grid[newRow][newCol].isScalingUp = true;
    grid[newRow][newCol].animationStart = Date.now();
  }
}

function handleMouseOut() {
  if (hoveredRow >= 0 && hoveredCol >= 0) {
    grid[hoveredRow][hoveredCol].isHovered = false;
    grid[hoveredRow][hoveredCol].isScalingUp = false;
    grid[hoveredRow][hoveredCol].animationStart = Date.now();
    hoveredRow = -1;
    hoveredCol = -1;
  }
}

loadImages();

function drawGrid() {
  const canvasWidth = canvas.parentElement.clientWidth;
  const canvasHeight = canvas.parentElement.clientHeight;

  let bestSquareSize, bestCols, bestRows;

  if (isAnimatingSizing) {
    // During animation, use fixed grid size and animate square size
    currentBestSquareSize += (targetBestSquareSize - currentBestSquareSize) * 0.05;
    if (Math.abs(currentBestSquareSize - targetBestSquareSize) < 1) {
      currentBestSquareSize = targetBestSquareSize;
      isAnimatingSizing = false;
    }
    bestSquareSize = currentBestSquareSize;
    bestCols = targetCols;
    bestRows = targetRows;
  } else {
    // Normal calculation
    const minSize = SIZING_OPTIONS[currentSizingIndex].min;
    const maxSize = SIZING_OPTIONS[currentSizingIndex].max;

    bestSquareSize = minSize;
    bestCols = Math.floor(canvasWidth / minSize);
    let bestGridWidth = bestCols * minSize;

    for (let size = minSize; size <= maxSize; size++) {
      const cols = Math.floor(canvasWidth / size);
      const gridWidth = cols * size;
      if (gridWidth > bestGridWidth && cols > 0) {
        bestSquareSize = size;
        bestCols = cols;
        bestGridWidth = gridWidth;
      }
    }

    bestRows = Math.ceil(canvasHeight / bestSquareSize);
    currentBestSquareSize = bestSquareSize; // Update for animation start
  }

  // Initialize grid array if needed
  if (!grid || grid.length !== bestRows || (grid[0] && grid[0].length !== bestCols)) {
    grid = Array.from({ length: bestRows }, () =>
      Array(bestCols)
        .fill()
        .map(() => ({ letter: "", scale: 1, isHovered: false, animationStart: null, isScalingUp: false }))
    );
    for (let row = 0; row < bestRows; row++) {
      for (let col = 0; col < bestCols; col++) {
        const letterIndex = ((row % 3) + col) % 3;
        const letter = letters[letterIndex].toLowerCase();
        grid[row][col].letter = letter;
      }
    }
  }

  // Calculate actual grid dimensions
  const gridWidth = bestCols * bestSquareSize;
  const gridHeight = bestRows * bestSquareSize;

  // Fill width completely, height can overflow
  const offsetX = 0;
  const offsetY = 0;

  // Clear canvas with white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Fill squares with alternating colors for better visibility
  for (let row = 0; row < bestRows; row++) {
    for (let col = 0; col < bestCols; col++) {
      const x = offsetX + col * bestSquareSize;
      const y = offsetY + row * bestSquareSize;

      // Only draw squares that are within the canvas bounds
      if (x < canvasWidth && y < canvasHeight) {
        // Alternate between the two background colors
        if (SHOW_BACKGROUND) {
          if ((row + col) % 2 === 0) {
            ctx.fillStyle = GRID_COLOR_1; // Light gray
          } else {
            ctx.fillStyle = GRID_COLOR_2; // White
          }
          ctx.fillRect(x, y, bestSquareSize, bestSquareSize);
        }

        // Draw the SVG image
        const cell = grid[row][col];
        const img = images[cell.letter];
        if (img && img.complete) {
          const elapsed = Date.now() - startTime;
          const delay = (row + col) * 50; // 50ms delay per distance unit
          const fadeDuration = 500; // 500ms fade in
          let opacity = 0;
          if (elapsed > delay) {
            opacity = Math.min(1, (elapsed - delay) / fadeDuration);
          }
          // Update cell animation
          if (cell.animationStart) {
            const animElapsed = Date.now() - cell.animationStart;
            const duration = cell.isScalingUp ? SCALE_UP_DURATION : SCALE_DOWN_DURATION;
            const progress = Math.min(1, animElapsed / duration);
            if (cell.isScalingUp) {
              cell.scale = 1 + progress * 0.2;
            } else {
              cell.scale = 1.2 - progress * 0.2;
            }
            if (progress >= 1) {
              cell.animationStart = null;
              cell.scale = cell.isScalingUp ? 1.2 : 1;
            }
          }
          ctx.globalAlpha = opacity;
          if (cell.scale !== 1) {
            ctx.save();
            ctx.translate(x + bestSquareSize / 2, y + bestSquareSize / 2);
            ctx.scale(cell.scale, cell.scale);
            ctx.drawImage(img, -bestSquareSize / 2, -bestSquareSize / 2, bestSquareSize, bestSquareSize);
            ctx.restore();
          } else {
            ctx.drawImage(img, x, y, bestSquareSize, bestSquareSize);
          }
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  // Draw grid lines only within canvas bounds
  if (SHOW_GRID_LINES) {
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 1;

    // Draw vertical lines
    for (let i = 0; i <= bestCols; i++) {
      const x = offsetX + i * bestSquareSize;
      if (x <= canvasWidth) {
        ctx.beginPath();
        ctx.moveTo(x, offsetY);
        ctx.lineTo(x, Math.min(offsetY + gridHeight, canvasHeight));
        ctx.stroke();
      }
    }

    // Draw horizontal lines
    for (let i = 0; i <= bestRows; i++) {
      const y = offsetY + i * bestSquareSize;
      if (y <= canvasHeight) {
        ctx.beginPath();
        ctx.moveTo(offsetX, y);
        ctx.lineTo(Math.min(offsetX + gridWidth, canvasWidth), y);
        ctx.stroke();
      }
    }
  }
}
