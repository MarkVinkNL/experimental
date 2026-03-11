<?php
$name = isset($_GET['name']) ? preg_replace('/[^a-zA-Z0-9 ]/', '', $_GET['name']) : 'Jij!';
?>
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You Deserve Confetti <?php echo $name; ?></title>
  <style>
    body,
    html {
      height: 100%;
      margin: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #f0f0f0;
      font-family: 'Arial', sans-serif;
      overflow: hidden;
    }

    .name-display {
      font-size: 10rem;
      font-weight: bold;
      color: #333;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
      z-index: 10;
      text-align: center;
      padding: 20px;
    }

    @media (max-width: 600px) {
      .name-display {
        font-size: 6rem;
      }
    }
  </style>
</head>

<body>
  <div class="name-display">
    <?php
    echo $name;
    ?>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>
  <script>
    var duration = 60 * 60 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 0,
      scalar: 1.5 // Bigger confetti
    };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    function getConfettiParams() {
      var area = window.innerWidth * window.innerHeight;

      // Particle count: approx 1 per 10000px
      var particleCount = Math.floor(area / 10000);

      // Velocity: map area to 15 (mobile) -> 35 (4k)
      var minArea = 250000;
      var maxArea = 8300000;
      var minVel = 15;
      var maxVel = 60;
      var velocity = minVel + (maxVel - minVel) * (Math.min(Math.max(area, minArea), maxArea) - minArea) / (maxArea - minArea);

      return {
        particleCount: particleCount,
        velocity: velocity
      };
    }

    var interval = setInterval(function() {
      var timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      var params = getConfettiParams();
      var particleCount = params.particleCount * (timeLeft / duration);

      var options = {
        ...defaults,
        particleCount,
        startVelocity: params.velocity
      };

      confetti({
        ...options,
        origin: {
          x: randomInRange(0.1, 0.3),
          y: Math.random() - 0.2
        }
      });
      confetti({
        ...options,
        origin: {
          x: randomInRange(0.7, 0.9),
          y: Math.random() - 0.2
        }
      });
    }, 150); // Increased frequency
  </script>
</body>

</html>