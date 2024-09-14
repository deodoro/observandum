import Phaser from "phaser";
import { IndividualTrader, run_trade } from "./agents/individual.js";
import { COBB_DOUGLAS } from "./artifacts/utility.js";

const BACKGROUND_COLOR = "#EFEBCE";
const N = 10; // Number of balls
const MAX_SIZE = 40;
const minVelocity = 0.5;
const maxVelocity = 1.0;
let balls = [];
let bids = [];

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

function preload() { }

function doesOverlap(ball1, ball2) {
  let dx = ball1.x - ball2.x;
  let dy = ball1.y - ball2.y;
  let distance = Math.sqrt(dx * dx + dy * dy);
  let minDist = 2 * (ball1.size + ball2.size);
  return distance < minDist;
}

function createNonOverlappingBall(balls) {
  let ball;
  let overlapping;
  do {
    ball = {
      x: Phaser.Math.Between(MAX_SIZE * 1.5, config.width - MAX_SIZE),
      y: Phaser.Math.Between(MAX_SIZE * 1.5, config.height - MAX_SIZE),
      size: Phaser.Math.Between(10, MAX_SIZE),
      velocityX: Phaser.Math.Between(-maxVelocity, maxVelocity),
      velocityY: Phaser.Math.Between(-maxVelocity, maxVelocity),
      flashFrames: 0,
    };

    if (Math.abs(ball.velocityX) < minVelocity) {
      ball.velocityX = ball.velocityX < 0 ? -minVelocity : minVelocity;
    }
    if (Math.abs(ball.velocityY) < minVelocity) {
      ball.velocityY = ball.velocityY < 0 ? -minVelocity : minVelocity;
    }

    overlapping = balls.some((existingBall) =>
      doesOverlap(ball, existingBall),
    );
  } while (overlapping);

  return ball;
}

const SCALE = 10;
function create() {
  const graphics = this.add.graphics();
  this.graphics = graphics;
  this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

  const agents = [];

  for (let i = 0; i < N; i++) {
    let newBall = createNonOverlappingBall(balls);
    const x = Phaser.Math.Between(10, MAX_SIZE);
    const e =
      newBall.size > x
        ? [SCALE * newBall.size, SCALE * (newBall.size - x)]
        : [SCALE * newBall.size, SCALE * (x - newBall.size)];
    const x_exp = Math.random().toFixed(2) * .9 + .05;
    const agent = new IndividualTrader({
      endowment: e,
      utility: COBB_DOUGLAS([x_exp, 1 - x_exp]),
      obj: newBall,
    });

      const text = agent.getEndowment().join(', ');
      const textstyle = { font: "12px arial", fill: "#000000", align: "center" };
      const textobj = this.make.text({
        x: newBall.x,
        y: newBall.y - 8,
        text: text,
        style: textstyle,
        origin: 0.5,
      });
    newBall.text = textobj;

    agents.push(agent);
    newBall.agent = agent;
    balls.push(newBall);
  }

  this.agents = agents;
}

function update() {
  if (this.graphics) {
    this.graphics.clear();

    balls.forEach((ball) => {
      ball.size = ball.agent.getEndowment().reduce((a, b) => a + b, 0) / SCALE;

      ball.x += ball.velocityX;
      ball.y += ball.velocityY;
      ball.text.x = ball.x;
      ball.text.y = ball.y;
      ball.text.text = ball.agent.getEndowment().map(Math.round).join(', ');

      if (ball.flashFrames > 0) {
        if (ball.flashFrames > 10) {
          this.graphics.fillStyle(0xcc9900, 1); // Red color
        } else {
          this.graphics.fillStyle(0xf0f0f0, 1); // Red color
        }
        ball.flashFrames -= 1;
      } else {
        this.graphics.fillStyle(ball.agent.color, 1);
      }

      this.graphics.fillCircle(ball.x, ball.y, ball.size);

      if (ball.x < ball.size || ball.x > config.width - ball.size) {
        ball.velocityX *= -1;
      }
      if (ball.y < ball.size || ball.y > config.height - ball.size) {
        ball.velocityY *= -1;
      }
    });

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        let ball1 = balls[i];
        let ball2 = balls[j];

        let dx = ball2.x - ball1.x;
        let dy = ball2.y - ball1.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let minDist = ball1.size + ball2.size;

        if (distance < minDist) {

          let angle = Math.atan2(dy, dx);
          let sine = Math.sin(angle);
          let cosine = Math.cos(angle);


          let vx1 = ball1.velocityX * cosine + ball1.velocityY * sine;
          let vy1 = ball1.velocityY * cosine - ball1.velocityX * sine;

          let vx2 = ball2.velocityX * cosine + ball2.velocityY * sine;
          let vy2 = ball2.velocityY * cosine - ball2.velocityX * sine;

          let vxTotal = vx1 - vx2;
          vx1 = vx2;
          vx2 = vxTotal + vx2;


          ball1.velocityX = vx1 * cosine - vy1 * sine;
          ball1.velocityY = vy1 * cosine + vx1 * sine;
          ball2.velocityX = vx2 * cosine - vy2 * sine;
          ball2.velocityY = vy2 * cosine + vx2 * sine;

          if (run_trade(ball1.agent, ball2.agent, bids)) {
            ball1.flashFrames += 15;
            ball2.flashFrames += 15;
            flag = true;
          }
        }
      }
    }
  }
}
