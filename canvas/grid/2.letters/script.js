console.log("Script loaded successfully");

const canvas = document.getElementById("grid-canvas");
const ctx = canvas.getContext("2d");

// Configuration variables
const GRID_MIN_SIZE = 80; // Minimum grid cell size in pixels
const GRID_MAX_SIZE = 120; // Maximum grid cell size in pixels
const GRID_COLOR_1 = "#f0f0f0"; // Light gray background color
const GRID_COLOR_2 = "#ffffff"; // White background color

const images = {};
const svgFiles = ["nox_n.svg", "nox_o.svg", "nox_x.svg"];
const letters = ["N", "O", "X"];
let imagesLoaded = 0;
const totalImages = svgFiles.length;
let gridReady = false;

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
  const canvasWidth = window.innerWidth;
  const canvasHeight = window.innerHeight;

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
        drawGrid();
      }
    };
    img.src = `img/${file}`;
    const key = file.replace("nox_", "").replace(".svg", "");
    images[key] = img;
  });
}

// Resize when window resizes
window.addEventListener("resize", debouncedResize);

loadImages();

function drawGrid() {
  const canvasWidth = window.innerWidth;
  const canvasHeight = window.innerHeight;

  // Target square size range
  const minSize = GRID_MIN_SIZE;
  const maxSize = GRID_MAX_SIZE;

  // Find the square size that fills the width most completely
  let bestSquareSize = minSize;
  let bestCols = Math.floor(canvasWidth / minSize);
  let bestGridWidth = bestCols * minSize;

  // Try all sizes in range to find the one that fills width best
  for (let size = minSize; size <= maxSize; size++) {
    const cols = Math.floor(canvasWidth / size);
    const gridWidth = cols * size;

    // Choose the size that gives the widest grid (least remaining width)
    if (gridWidth > bestGridWidth && cols > 0) {
      bestSquareSize = size;
      bestCols = cols;
      bestGridWidth = gridWidth;
    }
  }

  // Calculate rows needed to cover full height (allowing overflow)
  const bestRows = Math.ceil(canvasHeight / bestSquareSize);

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
        if ((row + col) % 2 === 0) {
          ctx.fillStyle = GRID_COLOR_1; // Light gray
        } else {
          ctx.fillStyle = GRID_COLOR_2; // White
        }
        ctx.fillRect(x, y, bestSquareSize, bestSquareSize);

        // Draw the SVG image
        const letterIndex = ((row % 3) + col) % 3;
        const letter = letters[letterIndex].toLowerCase();
        const img = images[letter];
        if (img && img.complete) {
          ctx.drawImage(img, x, y, bestSquareSize, bestSquareSize);
        }
      }
    }
  }

  // Draw grid lines only within canvas bounds
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
