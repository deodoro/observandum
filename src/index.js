import Phaser from 'phaser';
import { COBB_DOUGLAS, gradient, marginalUtility } from './artifacts/utility';
import { Individual, run_trade } from './agents/individual';
import { every, last } from 'lodash';
import { round } from 'math';
import { draw_contours } from './util/contour';

const MAX_ENDOWMENT = 1000;
const DENSITY = 90; // Isoline density

const COLOR_C1 = '#2d4ebb';
const COLOR_C1_N = parseInt(COLOR_C1.slice(1), 16);

const COLOR_C2 = '#511C29';
const COLOR_C2_N = parseInt(COLOR_C2.slice(1), 16);

const BACKGROUND_COLOR = '#EFEBCE';
const LABEL_COLOR = '#f0f0f0';
const CURSOR_COLOR = '#030303';
const BUTTON_COLOR = '#FFFFFF';
const DISABLED_COLOR = 0x888888;
const ENABLED_COLOR = 0x297373;
const CIRCLE_FILL_COLOR = '#ffffff';
const SOLUTION_PATH_COLOR = 0xEC9F05;

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
    adjustElements.call(game.scene.scenes[0]);
});

async function preload() {}

async function create() {
    const graphics = this.add.graphics();
    this.graphics = graphics;
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.last_interaction = Date.now();

    // Game state
    const state = {
        random_draw: true,
        do_trade: false,
        frame_count: 0,
        turn: 0,
        history: [],
        solution_history: [],
        solution_path: [],
        bids: [],
        on_off: 0,
        people: [],
    };
    this.game_state = state;

    const circle = new Phaser.Geom.Circle(this.cameras.main.centerX, this.cameras.main.centerY, 5);
    this.circle = circle;

    this.label_1 = createLabel.call(this, circle.x, circle.y + circle.radius + 10, COLOR_C1);
    this.label_2 = createLabel.call(this, circle.x, circle.y - circle.radius - 10, COLOR_C2);
    this.label_price = createLabel.call(this, this.cameras.main.width - 89, this.cameras.main.height - 50, LABEL_COLOR, 'Spot:', 20);
    this.label_price_accum = createLabel.call(this, this.cameras.main.width - 100, this.cameras.main.height - 70, LABEL_COLOR, 'Accum:', 20);
    this.coordLabel = createLabel.call(this, 0, 0, COLOR_C1, '', 12);

    this.button = createButton.call(this, this.cameras.main.width - 100, 50, 'RUN TRADE', color=DISABLED_COLOR);
    this.button_random = createButton.call(this, this.cameras.main.width - 100, 80, 'RANDOM', color=ENABLED_COLOR);

    this.button.on('pointerdown', () => {
        if (this.button.text !== 'STOP') {
            this.game_state.do_trade = true;
            this.label_price.visible = true;
            this.label_price_accum.visible = true;
            this.button.setText('STOP');
        }
        else {
            this.game_state.do_trade = false;
            this.button.setText('RUN TRADE');
        }
    });

    this.button_random.on('pointerdown', () => {
        this.game_state.random_draw = !this.game_state.random_draw;
        if (this.game_state.random_draw) {
            this.button.setTint(DISABLED_COLOR);
            this.button_random.setTint(ENABLED_COLOR);
            this.game_state.do_trade = false;
            this.button.setText('RUN TRADE');
        }
        else {
            this.button_random.setTint(DISABLED_COLOR);
            this.button.setTint(ENABLED_COLOR);
            this.game_state.do_trade = false;
            this.button.setText('RUN TRADE');
        }
    });

    this.input.on('pointerdown', pointerDownHandler.bind(this));
    this.input.on('pointerup', () => (this.isMousePressed = false));
    this.input.on('pointermove', pointerMoveHandler.bind(this));

    this.input.on('pointermove', (pointer) => {
        this.coordLabel.setText(`(${((pointer.x / this.cameras.main.width) * 1000).toFixed(0)}, ${(1000 - (pointer.y / this.cameras.main.width) * 1000).toFixed(0)})`);
        this.coordLabel.setPosition(pointer.x, pointer.y);
        this.coordLabel.visible = true;
    });

    this.game.events.on('blur', () => {
        this.coordLabel.visible = false;
    });

    this.game.events.on('focus', () => {
        this.coordLabel.visible = true;
    });

    setEntitlements.call(this, { x: 800, y: 200 });
}

function createLabel(x, y, color, text = '-', fontSize = 12) {
    return this.add.text(x, y, text, {
        fontSize: `${fontSize}px`,
        fill: color,
        align: 'center',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);
}

function createButton(x, y, text, color = BUTTON_COLOR) {
    const button = this.add.text(x, y, text, {
        fontSize: '12px',
        fontFamily: 'sans-serif'
    }).setInteractive();
    button.setTint(color);
    return button;
}

function pointerDownHandler() {
    if (!this.game_state.do_trade) {
        this.isMousePressed = true;
        this.lastPrintTime = Date.now();
        this.game_state.history = [];
        this.game_state.bids = [];
        this.label_price.visible = false;
        this.label_price_accum.visible = false;
    }
}

function pointerMoveHandler(pointer) {
    const currentTime = Date.now();
    if (!this.game_state.do_trade && this.isMousePressed && currentTime - this.lastPrintTime >= 50) {
        setEntitlementsPtr.call(this, pointer);
        this.lastPrintTime = currentTime;
    }
    this.last_interaction = currentTime;
}

function setEntitlements({ x, y }) {
    const createIndividual = (coords, weights, name, color, translate) =>
        ({ individual: new Individual(coords, COBB_DOUGLAS(weights), name, color), translate });

    this.game_state.people = [
        createIndividual([x, y], [0.25, 0.75], 'c1', COLOR_C1_N, a => [a[0] * this.cameras.main.width / DENSITY, (DENSITY - a[1]) * this.cameras.main.height / DENSITY]),
        createIndividual([1000 - x, 1000 - y], [0.75, 0.25], 'c2', COLOR_C2_N, a => [(DENSITY - a[0]) * this.cameras.main.width / DENSITY, a[1] * this.cameras.main.height / DENSITY])
    ];

    updateLabels.call(this);
}

function setEntitlementsPtr(pointer) {
    setEntitlements.call(this, { x: Math.trunc(1000 * (pointer.x / this.cameras.main.width)), y: 1000 - Math.trunc(1000 * pointer.y / this.cameras.main.height) });
}

function updateLabels() {
    const [c1, c2] = this.game_state.people.map(({ individual }) => individual);
    this.label_1.text = `[${c1.getEndowment().map(Math.round).join(',')}] = ${Math.round(c1.utility(c1.getEndowment()), 2)}`;
    this.label_2.text = `[${c2.getEndowment().map(Math.round).join(',')}] = ${Math.round(c2.utility(c2.getEndowment()), 2)}`;
    this.label_1.visible = true;
    this.label_2.visible = true;
}

function update_consumers(game) {
    const [c1, c2] = game.game_state.people.map(({ individual }) => individual);
    const round_n = num => Math.round((num + Number.EPSILON) * 100) / 100;
    const q_x = game.game_state.bids.reduce((acc, val) => acc + val.bid[0], 0);
    const q_y = game.game_state.bids.reduce((acc, val) => acc + val.bid[1], 0);
    game.label_price.text = `(spot) 1:${Math.abs(round_n(game.game_state.bids[game.game_state.bids.length - 1].bid[1] / game.game_state.bids[game.game_state.bids.length - 1].bid[0]))}`;
    game.label_price_accum.text = `1:${Math.abs(round_n(q_y / q_x))}`;
    game.label_1.text = `[${c1.getEndowment().map(Math.round).join(',')}] = ${Math.round(c1.utility(c1.getEndowment()), 2)}`;
    game.label_2.text = `[${c2.getEndowment().map(Math.round).join(',')}] = ${Math.round(c2.utility(c2.getEndowment()), 2)}`;
}

function update() {
    if (this.graphics) {
        this.graphics.clear();

        this.game_state.people.forEach(({ individual, translate }) => {
            this.graphics.lineStyle(1, individual.getColor(), .2);
            draw_contours(individual, translate, u => {
                this.graphics.beginPath();
                this.graphics.moveTo(...u.shift());
                u.forEach((v) => this.graphics.lineTo(...v));
                this.graphics.strokePath();
            });
        });

        if (this.game_state.do_trade) {
            const { people, turn, bids, history, solution_history, solution_path } = this.game_state;
            const currentPerson = people[turn].individual;
            const otherPerson = people[1 - turn].individual;
            const diffs = history.length > 1 ? [history[history.length - 2][0] - this.circle.x, history[history.length - 2][1] - this.circle.y] : [0, 0];
            const wrap_up = () => {
                const last_trade = last(history);
                const circle = new Phaser.Geom.Circle((people[0].individual.getEndowment()[0]  * this.cameras.main.width) / MAX_ENDOWMENT, ((MAX_ENDOWMENT - people[0].individual.getEndowment()[1]) * this.cameras.main.height) / MAX_ENDOWMENT, 5);
                const label = createLabel.call(this, circle.x, circle.y, BUTTON_COLOR, `${this.label_price_accum.text}`);
                solution_history.push({circle, label});
                if (history.length > 1) {
                    solution_path.push(history);
                }
                this.game_state.do_trade = false;
                this.last_interaction = Date.now();
                this.button.setText('RUN TRADE');
            };

            if (history.length > 1 && every(diffs, x => Math.abs(x) < .1)) {
                wrap_up();
            }
            else {
                if (run_trade(currentPerson, otherPerson, bids)) {
                    history.push([this.circle.x, this.circle.y]);
                    update_consumers(this);
                    this.game_state.turn = 1 - this.game_state.turn;
                } else {
                    wrap_up();
                }
            }
        }

        this.game_state.people.forEach(({ individual, translate }) => {
            this.graphics.lineStyle(1.5, individual.getColor(), 1.0);
            this.graphics.fillStyle(CIRCLE_FILL_COLOR, 0.2);
            draw_contours(individual, translate, u => {
                this.graphics.beginPath();
                this.graphics.moveTo(...u.shift());
                u.forEach((v) => this.graphics.lineTo(...v));
                this.graphics.strokePath();
                this.graphics.fillPath();
            }, individual.utility(individual.getEndowment()) * DENSITY / 100);
        });

        this.game_state.solution_history.forEach(({circle, label}) => {
            this.graphics.fillStyle(SOLUTION_PATH_COLOR, 0.4);
            this.graphics.fillCircleShape(circle);
        });

        this.game_state.solution_path.forEach(history => {
            this.graphics.lineStyle(2, SOLUTION_PATH_COLOR, 0.4);
            for (let i = 1; i < history.length - 1; i++) {
                this.graphics.beginPath();
                this.graphics.moveTo(history[i][0], history[i][1]);
                this.graphics.lineTo(history[i + 1][0], history[i + 1][1]);
                this.graphics.strokePath();
            }
        });

        if (this.game_state.history.length > 1) {
            this.graphics.lineStyle(2, 0xFFFFFF, 0.2);
            for (let i = 1; i < this.game_state.history.length - 1; i++) {
                this.graphics.beginPath();
                this.graphics.moveTo(this.game_state.history[i][0], this.game_state.history[i][1]);
                this.graphics.lineTo(this.game_state.history[i + 1][0], this.game_state.history[i + 1][1]);
                this.graphics.strokePath();
            }
        }

        const [c1] = this.game_state.people.map(({ individual }) => individual);
        if (c1) {
            this.circle.x = (c1.getEndowment()[0] * this.cameras.main.width) / MAX_ENDOWMENT;
            this.circle.y = ((MAX_ENDOWMENT - c1.getEndowment()[1]) * this.cameras.main.height) / MAX_ENDOWMENT;
            this.label_1.setPosition(this.circle.x, this.circle.y + this.circle.radius + 10);
            this.label_2.setPosition(this.circle.x, this.circle.y - this.circle.radius - 10);
        }

        if (this.game_state.do_trade  && this.game_state.on_off) {
            this.graphics.fillStyle(0xE03616, 1);
            this.graphics.fillCircleShape(this.circle);
        } else {
            this.graphics.fillStyle(0x400406, 1);
            this.graphics.fillCircleShape(this.circle);
        }

        this.game_state.frame_count++;
        if (this.game_state.frame_count % 10 === 0) this.game_state.on_off = 1 - this.game_state.on_off;

        if (this.game_state.random_draw && !this.game_state.do_trade && Date.now() - this.last_interaction > 1000) {
            this.game_state.history = [];
            this.game_state.bids = [];
            this.label_price.visible = true;
            this.label_price_accum.visible = true;
            this.game_state.do_trade = true;
            setEntitlements.call(this, { x: 1000 * Math.random(), y:  1000 * Math.random() });
        }
    }
}

function adjustElements() {
    const WIDTH = window.innerWidth;
    const HEIGHT = window.innerHeight;

    this.circle.setPosition(this.cameras.main.centerX, this.cameras.main.centerY);
    this.label_1.setPosition(this.circle.x, this.circle.y + this.circle.radius + 10);
    this.label_2.setPosition(this.circle.x, this.circle.y - this.circle.radius - 10);
    this.label_price.setPosition(WIDTH - 89, HEIGHT - 50);
    this.label_price_accum.setPosition(WIDTH - 100, HEIGHT - 70);
    this.button.setPosition(WIDTH - 100, 50);
    this.button_random.setPosition(WIDTH - 100, 70);
}
