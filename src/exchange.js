import Phaser from "phaser";
import { IndividualTrader } from "./agents/individual.js";
import { COBB_DOUGLAS } from "./artifacts/utility.js";

const BACKGROUND_COLOR = "#EFEBCE";
const N = 10; // Number of balls

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

const MAX_SIZE = 40;

function create() {
   const graphics = this.add.graphics();
   this.graphics = graphics;
   this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

   // Function to check if two balls overlap
   function doesOverlap(ball1, ball2) {
      let dx = ball1.x - ball2.x;
      let dy = ball1.y - ball2.y;
      // Distance between ball centers
      let distance = Math.sqrt(dx * dx + dy * dy);
      // Minimum distance to ensure no overlap
      let minDist = 2 * (ball1.size + ball2.size);
      return distance < minDist;
   }

   const minVelocity = 0.5;
   const maxVelocity = 1.0;
   // Function to create a non-overlapping ball
   function createNonOverlappingBall(balls) {
      let ball;
      let overlapping;
      do {
         ball = {
            x: Phaser.Math.Between(MAX_SIZE * 1.5, config.width - MAX_SIZE), // Ensure balls are within bounds
            y: Phaser.Math.Between(MAX_SIZE * 1.5, config.height - MAX_SIZE), // Ensure balls are within bounds
            size: Phaser.Math.Between(10, MAX_SIZE),
            velocityX: Phaser.Math.Between(-maxVelocity, maxVelocity),
            velocityY: Phaser.Math.Between(-maxVelocity, maxVelocity),
         };
         if (Math.abs(ball.velocityX) < minVelocity) {
            ball.velocityX = ball.velocityX < 0 ? -minVelocity : minVelocity;
         }
         if (Math.abs(ball.velocityY) < minVelocity) {
            ball.velocityY = ball.velocityY < 0 ? -minVelocity : minVelocity;
         }

         // Check if this new ball overlaps with any existing balls
         overlapping = balls.some((existingBall) =>
            doesOverlap(ball, existingBall),
         );
      } while (overlapping);

      return ball;
   }

   // Main loop to create the required number of balls
   for (let i = 0; i < N; i++) {
      let newBall = createNonOverlappingBall(balls);
      balls.push(newBall);
   }

   const agents = [];
   balls.forEach((ball) => {
      const x = Phaser.Math.Between(10, MAX_SIZE);
      const e =
         ball.size > x
            ? [ball.size, ball.size - x]
            : [ball.size, x - ball.size];
      const x_exp = Phaser.Math.Between(0, 1);
      agents.push(
         new IndividualTrader({
            endowment: e,
            utility: COBB_DOUGLAS([x_exp, 1 - x_exp]),
            obj: ball,
         }),
      );
   });
   this.agents = agents;
}

function update() {
   if (this.graphics) {
      this.graphics.clear();

      this.agents.forEach((agent) => {
         var ball = agent.getObj();
         ball.size = agent.getEndowment().reduce((a, b) => a + b, 0);

         // Update ball position
         ball.x += ball.velocityX;
         ball.y += ball.velocityY;

         // Draw the ball
         this.graphics.fillStyle(agent.color, 1);
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
