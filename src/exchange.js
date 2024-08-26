import Phaser from "phaser";
import { COBB_DOUGLAS, gradient, marginalUtility } from "./artifacts/utility";
import { PairedIndividual, run_trade } from "./agents/individual";
import { every, last, wrap } from "lodash";
import { round } from "math";
import { draw_contours } from "./util/contour";

const MAX_ENDOWMENT = 1000;
const DENSITY = 90; // Isoline density

const COLOR_C1 = "#2d4ebb";
const COLOR_C1_N = parseInt(COLOR_C1.slice(1), 16);

const COLOR_C2 = "#511C29";
const COLOR_C2_N = parseInt(COLOR_C2.slice(1), 16);

const BACKGROUND_COLOR = "#EFEBCE";
const LABEL_COLOR = "#f0f0f0";
const CURSOR_COLOR = "#030303";
const BUTTON_COLOR = "#FFFFFF";
const DISABLED_COLOR = 0x888888;
const ENABLED_COLOR = 0x297373;
const CIRCLE_FILL_COLOR = "#ffffff";
const SOLUTION_PATH_COLOR = 0xec9f05;

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
  // \if (game.click_random()) {
  // } else {
  // }
});

async function preload() { }

async function create() {
  const graphics = this.add.graphics();
  this.graphics = graphics;
  this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
}

function update() {
  if (this.graphics) {
    this.graphics.clear();
  }
}
