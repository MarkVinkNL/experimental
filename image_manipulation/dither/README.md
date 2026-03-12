# Dithering Experiments

A collection of image dithering techniques implemented with HTML5 Canvas and WebGL.

---

## 0.work — ASCII Art Dithering W.I.P.

Converts an image into ASCII art by sampling the average luminance of fixed-size cells and mapping each to a character from a density ramp (`@#%S*+=-:,. `). Supports multiple color palettes (Synthwave, Grayscale, Sepia, Forest), adjustable cell size, lightness, and a bloom post-processing effect. Built with the HTML5 Canvas 2D API and `lil-gui` for interactive controls.

---

## 1.floyd-steinberg — Floyd-Steinberg Dithering

Implements the classic Floyd-Steinberg error-diffusion algorithm. The image is converted to grayscale and each pixel is quantized to black or white; the resulting error is distributed to four neighboring pixels (right, bottom-left, bottom, bottom-right) using the standard coefficient matrix. Produces the familiar newspaper-style black-and-white dithered look.

---

## 2.bill-atkinson — Atkinson Dithering

A variant of error diffusion invented by Bill Atkinson at Apple. Only ¾ of the quantization error is diffused, spread across six neighbors in an extended pattern. The retained error increases local contrast and reduces speckling in very bright or dark regions, giving images the high-contrast aesthetic of early Macintosh graphics.

---

## 3.colored — Palette-Based Color Dithering

Applies Atkinson-style error diffusion to a multi-color palette instead of plain black and white. Each pixel's luminance is mapped to a color from a predefined palette (Synthwave, Forest, etc.), and the error is diffused accordingly. A configurable block size adds an optional large-pixel, pixelated look.

---

## 4.bayer-webgl — GPU-Accelerated Ordered Dithering (WebGL)

Performs ordered dithering on the GPU using an 8×8 Bayer threshold matrix encoded as a tiling `LUMINANCE` texture. A GLSL fragment shader compares each pixel's brightness against the Bayer threshold and snaps it to the nearest palette color entirely in parallel, making the effect real-time and highly performant even at large resolutions.
