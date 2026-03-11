const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

// Calculate container circle properties
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const containerRadius = (Math.min(canvas.width, canvas.height) * 0.9) / 2;

// Configurable variables
const PARTICLE_COUNT = 500; // Adjust this value to change the number of particles
const MOUSE_REPULSION_FORCE = 0.8; // Adjust this value to change mouse repulsion strength (0.1-2.0 recommended)
const CONTAINER_BOUNCE_DAMPING = 0.1; // Adjust this value to change how much energy is lost on container collisions (0.0-1.0, lower = more damping)
const DENSITY_DAMPENING_STRENGTH = 0.4; // Adjust this value to change how strongly density affects particle movement (0.0-0.5 recommended)
const DENSITY_NEIGHBOR_THRESHOLD = 8; // Adjust this value to change at what neighbor count maximum dampening occurs (higher = less sensitive)
const PARTICLE_SIZE = 6; // Adjust this value to change the uniform size of all particles (recommended: 2-8)

// Settings
const settings = {
  circleCount: PARTICLE_COUNT,
  circleBounce: CONTAINER_BOUNCE_DAMPING,
  circleMaxSpeed: 8,
  gravity: 0.1,
  friction: 0.99,
  circleColor: "rgba(100, 150, 255, 0.8)",
  mouseRepulsionForce: MOUSE_REPULSION_FORCE,
  mouseRepulsionRadius: 100,
};

// Mouse tracking
let mouse = { x: canvas.width / 2, y: canvas.height / 2, active: false };

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
  mouse.active = true;
});

canvas.addEventListener("mouseleave", () => {
  mouse.active = false;
});

// Circle class (adapted for circular container)
class Circle {
  constructor(x, y, vx, vy, radius) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = "hsl(210, 80%, 60%)"; // Consistent blue color for all particles
  }

  update() {
    // Apply gravity
    this.vy += settings.gravity;

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off circular container boundary
    const dx = this.x - centerX;
    const dy = this.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance + this.radius > containerRadius) {
      // Calculate collision normal
      const nx = dx / distance;
      const ny = dy / distance;

      // Move particle back inside boundary
      this.x = centerX + nx * (containerRadius - this.radius);
      this.y = centerY + ny * (containerRadius - this.radius);

      // Reflect velocity with bounce
      const dot = this.vx * nx + this.vy * ny;
      this.vx -= 2 * dot * nx * settings.circleBounce;
      this.vy -= 2 * dot * ny * settings.circleBounce;
    }

    // Apply friction
    this.vx *= settings.friction;
    this.vy *= settings.friction;

    // Limit max speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > settings.circleMaxSpeed) {
      this.vx = (this.vx / speed) * settings.circleMaxSpeed;
      this.vy = (this.vy / speed) * settings.circleMaxSpeed;
    }

    // Mouse interaction - repel particles from cursor
    if (mouse.active) {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < settings.mouseRepulsionRadius && distance > 0) {
        // Calculate repulsion force (stronger when closer to mouse)
        const force = (settings.mouseRepulsionRadius - distance) / settings.mouseRepulsionRadius;
        const repulsionStrength = force * settings.mouseRepulsionForce;

        // Apply repulsion in the direction away from mouse
        const nx = dx / distance;
        const ny = dy / distance;

        this.vx += nx * repulsionStrength;
        this.vy += ny * repulsionStrength;
      }
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  distanceTo(other) {
    return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
  }
}

// Create circles
const circles = [];
for (let i = 0; i < PARTICLE_COUNT; i++) {
  const radius = PARTICLE_SIZE;
  // Start particles in random positions within the container circle
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * (containerRadius - radius * 2);
  const x = centerX + Math.cos(angle) * distance;
  const y = centerY + Math.sin(angle) * distance;
  const vx = (Math.random() - 0.5) * 4;
  const vy = (Math.random() - 0.5) * 4;
  circles.push(new Circle(x, y, vx, vy, radius));
}

function animate() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update circles
  circles.forEach((circle) => {
    circle.update();
  });

  // Ultra-gentle collision system with density-based dampening
  for (let i = 0; i < circles.length; i++) {
    const c1 = circles[i];
    let neighborCount = 0;
    let totalDampening = 0;

    // Check density around each particle
    for (let j = 0; j < circles.length; j++) {
      if (i === j) continue;

      const c2 = circles[j];
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = c1.radius + c2.radius;

      // Count neighbors within 1.5x the minimum distance
      if (dist < minDist * 1.5) {
        neighborCount++;
      }

      // Handle collision if too close
      if (dist < minDist && dist > 0.001) {
        // Calculate unit vector
        const nx = dx / dist;
        const ny = dy / dist;

        // Very gentle separation
        const overlap = minDist - dist;
        const tinyCorrection = overlap * 0.02;

        c1.x -= nx * tinyCorrection;
        c1.y -= ny * tinyCorrection;
        c2.x += nx * tinyCorrection;
        c2.y += ny * tinyCorrection;
      }
    }

    // Apply density-based dampening
    // More neighbors = more dampening (more viscous)
    if (neighborCount > 2) {
      const densityFactor = Math.min(neighborCount / DENSITY_NEIGHBOR_THRESHOLD, 1); // Max dampening at threshold+ neighbors
      const extraDampening = DENSITY_DAMPENING_STRENGTH * densityFactor; // Additional dampening based on density
      c1.vx *= 1 - extraDampening;
      c1.vy *= 1 - extraDampening;
    }
  }

  // Hard constraint pass to prevent any overlap
  for (let iteration = 0; iteration < 2; iteration++) {
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const c1 = circles[i];
        const c2 = circles[j];
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = c1.radius + c2.radius;

        if (dist < minDist && dist > 0.001) {
          // Calculate unit vector
          const nx = dx / dist;
          const ny = dy / dist;

          // Hard constraint: enforce exact minimum distance
          const overlap = minDist - dist;
          const correction = overlap * 0.5; // Split correction equally

          c1.x -= nx * correction;
          c1.y -= ny * correction;
          c2.x += nx * correction;
          c2.y += ny * correction;
        }
      }
    }
  }

  // Draw container circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, containerRadius, 0, 2 * Math.PI);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw circles
  circles.forEach((circle) => {
    circle.draw();
  });

  requestAnimationFrame(animate);
}

animate();
