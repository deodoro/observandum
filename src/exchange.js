import Phaser from "phaser";

const BACKGROUND_COLOR = "#EFEBCE";
const N = 10;  // Number of balls

const config = {
  type: Phaser.AUTO,
  width: document.getElementById("container-exchange-multiple").clientWidth,
  height: document.getElementById("container-exchange-multiple").clientHeight,
  parent: "container-exchange-multiple",
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};
const game = new Phaser.Game(config);

window.addEventListener("resize", () => {
  game.scale.resize(
    document.getElementById("container-exchange-multiple").clientWidth,
    document.getElementById("container-exchange-multiple").clientHeight,
  );
  adjustElements.call(
    game.scene.scenes[0],
    document.getElementById("container-exchange-multiple").clientWidth,
    document.getElementById("container-exchange-multiple").clientHeight,
  );
});

document.getElementById("stop-simulation").addEventListener("click", () => {
  if (game.click_random()) {
  } else {
  }
});

let balls = [];

function preload() {}

function create() {
  const graphics = this.add.graphics();
  this.graphics = graphics;
  this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

  // Create balls
  for (let i = 0; i < N; i++) {
    let overlapping = true;
    let ball;
    while (overlapping) {
      ball = {
        x: Phaser.Math.Between(50, config.width - 50),  // Ensure balls are within bounds
        y: Phaser.Math.Between(50, config.height - 50), // Ensure balls are within bounds
        size: Phaser.Math.Between(10, 50),
        velocityX: Phaser.Math.Between(-1, 1),
        velocityY: Phaser.Math.Between(-1, 1)
      };

      // Check if the new ball overlaps with any existing ball
      overlapping = balls.some(existingBall => {
        let dx = ball.x - existingBall.x;
        let dy = ball.y - existingBall.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let minDist = ball.size + existingBall.size;
        return distance < minDist;
      });
    }
    balls.push(ball);
  }
}

function update() {
  if (this.graphics) {
    this.graphics.clear();

    balls.forEach(ball => {
      // Update ball position
      ball.x += ball.velocityX;
      ball.y += ball.velocityY;

      // Draw the ball
      this.graphics.fillStyle(0xff0000, 1);
      this.graphics.fillCircle(ball.x, ball.y, ball.size);

      // Check for collisions with the boundaries and reverse velocity if needed
      if (ball.x < ball.size || ball.x > config.width - ball.size) {
        ball.velocityX *= -1;
      }
      if (ball.y < ball.size || ball.y > config.height - ball.size) {
        ball.velocityY *= -1;
      }
    });

    // Check for collisions between balls
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        let ball1 = balls[i];
        let ball2 = balls[j];

        let dx = ball2.x - ball1.x;
        let dy = ball2.y - ball1.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let minDist = ball1.size + ball2.size;

        if (distance < minDist) {
          // Simple elastic collision
          let angle = Math.atan2(dy, dx);
          let sine = Math.sin(angle);
          let cosine = Math.cos(angle);

          // Rotate ball1's position
          let x1 = 0;
          let y1 = 0;

          // Rotate ball2's velocity
          let x2 = dx * cosine + dy * sine;
          let y2 = dy * cosine - dx * sine;

          // Rotate ball1's velocity
          let vx1 = ball1.velocityX * cosine + ball1.velocityY * sine;
          let vy1 = ball1.velocityY * cosine - ball1.velocityX * sine;

          // Rotate ball2's velocity
          let vx2 = ball2.velocityX * cosine + ball2.velocityY * sine;
          let vy2 = ball2.velocityY * cosine - ball2.velocityX * sine;

          // Collision reaction
          let vxTotal = vx1 - vx2;
          vx1 = vx2;
          vx2 = vxTotal + vx2;

          // Update position to avoid balls sticking together
          x1 += vx1;
          x2 += vx2;

          // Rotate positions back
          ball2.x = ball1.x + (x2 * cosine - y2 * sine);
          ball2.y = ball1.y + (y2 * cosine + x2 * sine);
          ball1.x = ball1.x + (x1 * cosine - y1 * sine);
          ball1.y = ball1.y + (y1 * cosine + x1 * sine);

          // Rotate velocities back
          ball1.velocityX = vx1 * cosine - vy1 * sine;
          ball1.velocityY = vy1 * cosine + vx1 * sine;
          ball2.velocityX = vx2 * cosine - vy2 * sine;
          ball2.velocityY = vy2 * cosine + vx2 * sine;
        }
      }
    }
  }
}
