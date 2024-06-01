import Phaser from 'phaser';
import { COBB_DOUGLAS, gradient, marginalUtility } from './artifacts/utility';
import { Individual, run_trade } from './agents/individual';
import { last } from 'lodash';
import { round } from 'math';
import { draw_contours } from './util/contour';

const MAX_ENDOWMENT = 1000;
const DENSITY = 90; // Isoline density

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
    this.cameras.main.setBackgroundColor('#eee7dd');
    this.last_interaction = Date.now();

    // Game state
    const state = {
        do_trade: false,
        frame_count: 0,
        turn: 0,
        history: [],
        solution_history: [],
        bids: [],
        on_off: 0,
        people: []
    };
    this.game_state = state;

    const circle = new Phaser.Geom.Circle(this.cameras.main.centerX, this.cameras.main.centerY, 5);
    this.circle = circle;

    this.label_1 = createLabel.call(this, circle.x, circle.y + circle.radius + 10, '#2d4ebb');
    this.label_2 = createLabel.call(this, circle.x, circle.y - circle.radius - 10, '#437e07');
    this.label_price = createLabel.call(this, this.cameras.main.width - 89, this.cameras.main.height - 50, '#f0f0f0', 'Spot:', 20);
    this.label_price_accum = createLabel.call(this, this.cameras.main.width - 100, this.cameras.main.height - 70, '#f0f0f0', 'Accum:', 20);

    this.button_circle = new Phaser.Geom.Circle(this.cameras.main.width - 82, 60, 25);
    this.button = createButton.call(this, this.cameras.main.width - 100, 50, 'TRADE');

    this.button.on('pointerdown', () => {
        this.game_state.do_trade = true;
        this.label_price.visible = true;
        this.label_price_accum.visible = true;
    });

    this.input.on('pointerdown', pointerDownHandler.bind(this));
    this.input.on('pointerup', () => (this.isMousePressed = false));
    this.input.on('pointermove', pointerMoveHandler.bind(this));

    setEntitlements.call(this, { x: 800, y: 200 });
    // const c1 = this.game_state.people[0].individual;
    // const c2 = this.game_state.people[1].individual;
    // const SIZE=100;
    // const DELTA=10;
    // const x_gen = new Array(SIZE);
    // const y_gen = new Array(SIZE);
    // var d = 0;

    // for (var i = 0; i < SIZE; i++) {
    //     x_gen[i] = y_gen[i] = d;
    //     d += DELTA;
    // }
    // const z_1 = x_gen.map((v, i) => y_gen.map(t => gradient(c1.utility, [t, v])))
    // const z_2 = x_gen.map((v, i) => y_gen.map(t => gradient(c2.utility, [t, v])))
    // const z_3 = new Array(SIZE);
    // z_3.fill(new Array(SIZE));
    // for (var i = 0; i < SIZE; i++) {
    //     for (var j = 0; j < SIZE; j++) {
    //         z_3[i][j] = z_1[i][j].map((v,idx) => v - z_2[SIZE-i-1][SIZE-j-1][idx]);
    //     }
    // }
    // console.dir(z_1);
    // console.dir(z_2);
    // console.dir(z_3);
}

function createLabel(x, y, color, text = '-', fontSize = 12) {
    return this.add.text(x, y, text, {
        fontSize: `${fontSize}px`,
        fill: color,
        align: 'center',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);
}

function createButton(x, y, text) {
    return this.add.text(x, y, text, {
        fontSize: '12px',
        fill: '#FFFFFF',
        fontFamily: 'sans-serif'
    }).setInteractive();
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
        createIndividual([x, y], [0.25, 0.75], 'c1', 0x2d4ebb, a => [a[0] * this.cameras.main.width / DENSITY, (DENSITY - a[1]) * this.cameras.main.height / DENSITY]),
        createIndividual([1000 - x, 1000 - y], [0.75, 0.25], 'c2', 0x305d04, a => [(DENSITY - a[0]) * this.cameras.main.width / DENSITY, a[1] * this.cameras.main.height / DENSITY])
    ];

    updateLabels.call(this);
}

function setEntitlementsPtr(pointer) {
    setEntitlements.call(this, { x: Math.trunc(1000 * (pointer.x / this.cameras.main.width)), y: 1000 - Math.trunc(1000 * pointer.y / this.cameras.main.height) });
}

function updateLabels() {
    const [c1, c2] = this.game_state.people.map(({ individual }) => individual);
    this.label_1.text = `[${c1.getEndowment().join(',')}] = ${Math.round(c1.utility(c1.getEndowment()), 2)}`;
    this.label_2.text = `[${c2.getEndowment().join(',')}] = ${Math.round(c2.utility(c2.getEndowment()), 2)}`;
    this.label_1.visible = true;
    this.label_2.visible = true;
}

function update_consumers(game) {
    const [c1, c2] = game.game_state.people.map(({ individual }) => individual);
    const round_n = num => Math.round((num + Number.EPSILON) * 100) / 100;
    const q_x = game.game_state.bids.reduce((acc, val) => acc + val.bid[0], 0);
    const q_y = game.game_state.bids.reduce((acc, val) => acc + val.bid[1], 0);
    game.label_price.text = `Spot: 1:${Math.abs(round_n(game.game_state.bids[game.game_state.bids.length - 1].bid[1] / game.game_state.bids[game.game_state.bids.length - 1].bid[0]))}`;
    game.label_price_accum.text = `Accum: 1:${round_n(q_y / q_x)}`;
    game.label_1.text = `[${c1.getEndowment().map(Math.round).join(',')}] = ${Math.round(c1.utility(c1.getEndowment()), 2)}`;
    game.label_2.text = `[${c2.getEndowment().map(Math.round).join(',')}] = ${Math.round(c2.utility(c2.getEndowment()), 2)}`;
}

function update() {
    if (this.graphics) {
        this.graphics.clear();
        this.game_state.people.forEach(({ individual, translate }) => draw_contours(this.graphics, individual, translate));

        if (this.game_state.do_trade) {
            const { people, turn, bids, history, solution_history } = this.game_state;
            const currentPerson = people[turn].individual;
            const otherPerson = people[1 - turn].individual;
            if (run_trade(currentPerson, otherPerson, bids)) {
                history.push([this.circle.x, this.circle.y]);
                update_consumers(this);
                this.game_state.turn = 1 - this.game_state.turn;
            } else {
                const last_trade = last(history);
                const circle = new Phaser.Geom.Circle((people[0].individual.getEndowment()[0]  * this.cameras.main.width) / MAX_ENDOWMENT, ((MAX_ENDOWMENT - people[0].individual.getEndowment()[1]) * this.cameras.main.height) / MAX_ENDOWMENT, 5);
                console.dir(circle);
                console.dir(currentPerson.getEndowment());
                solution_history.push(circle);
                this.game_state.do_trade = false;
                this.last_interaction = Date.now();
            }
        }

        this.game_state.people.forEach(({ individual, translate }) =>
            draw_contours(this.graphics, individual, translate, individual.utility(individual.getEndowment()) * DENSITY / 100));

        this.game_state.solution_history.forEach(circle => {
            this.graphics.fillStyle(0xf0f0f0, 0.2);
            this.graphics.fillCircleShape(circle);
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

        if (this.game_state.do_trade && this.game_state.on_off) {
            this.graphics.fillStyle(0x390b0b, 1);
            this.graphics.fillCircleShape(this.circle);
        } else {
            this.graphics.fillStyle(0x8a0a0a, 1);
            this.graphics.fillCircleShape(this.circle);
        }
        this.graphics.fillStyle(0xffffff, 0.2);
        this.graphics.fillCircleShape(this.button_circle);

        this.game_state.frame_count++;
        if (this.game_state.frame_count % 10 === 0) this.game_state.on_off = 1 - this.game_state.on_off;

        if (!this.game_state.do_trade && Date.now() - this.last_interaction > 1000) {
            this.game_state.history = [];
            this.label_price.visible = false;
            this.label_price_accum.visible = false;
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
    this.button_circle.setPosition(WIDTH - 82, 60);
    this.button.setPosition(WIDTH - 100, 50);
}
