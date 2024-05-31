import Phaser from 'phaser';
import { COBB_DOUGLAS, negative } from './artifacts/utility';
import { Individual, run_trade } from './agents/individual';
import { last } from 'lodash';
import { round } from 'math';
import { draw_contours } from './util/contour';

const MAX_ENDOWMENT = 1000;
const DENSITY = 90; // Isoline density

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

async function preload() {
}

async function create() {
    const graphics = this.add.graphics();
    this.graphics = graphics;
    this.cameras.main.setBackgroundColor('#c2b8aa');

    // game state
    const state = {
        do_trade: false,
        frame_count: 0,
        turn: 0,
        history: [],
        bids: [],
        on_off: 0
    };
    this.game_state = state;


    const circle = new Phaser.Geom.Circle(400, 300, 5);
    this.circle = circle;

    this.label_1 = this.add.text(circle.x, circle.y + circle.radius + 10, '-', {
        fontSize: '12px',
        fill: '#2d4ebb',
        align: 'center',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);

    this.label_2 = this.add.text(circle.x, circle.y - circle.radius - 10, '-', {
        fontSize: '12px',
        fill: '#437e07',
        align: 'center',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);

    this.label_price = this.add.text(711, 550, 'Spot:', {
        fontSize: '20px',
        fill: '#f0f0f0',
        align: 'left',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);
    this.label_price.visible = false;

    this.label_price_accum = this.add.text(700, 530, 'Accum:', {
        fontSize: '20px',
        fill: '#f0f0f0',
        align: 'left',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);
    this.label_price_accum.visible = false;

    this.button_circle = new Phaser.Geom.Circle(718, 60, 25);;

    const button = this.add.text(700, 50, 'TRADE', {
        fontSize: '12px',
        fill: '#FFFFFF',
        fontFamily: 'sans-serif'
    }).setInteractive();

    let isMousePressed = false;
    let lastPrintTime = 0;
    const setEntitlements = ({x,y}) => {
        this.game_state.people = [];
        this.game_state.people.push({individual: new Individual([x, y], COBB_DOUGLAS([.25, .75]), name='c1', color = 0x2d4ebb), translate: a => [a[0] * 800 / DENSITY, (DENSITY - a[1]) * 600 / DENSITY]});
        this.game_state.people.push({individual: new Individual([1000-x, 1000-y], COBB_DOUGLAS([.75, .25]), name='c2', color = 0x305d04), translate: a => [(DENSITY - a[0]) * 800 / DENSITY, a[1] * 600 / DENSITY]});
        const c1 = this.game_state.people[0].individual;
        const c2 = this.game_state.people[1].individual;
        this.label_1.text = `[${c1.getEndowment().join(',')}]=${Math.round(c1.utility(c1.getEndowment()),2)}`;
        this.label_2.text = `[${c2.getEndowment().join(',')}]=${Math.round(c2.utility(c2.getEndowment()),2)}`;
        this.label_1.visible = true;
        this.label_2.visible = true;
    }
    const setEntitlementsPtr = pointer => {
        setEntitlements({x: Math.trunc(1000 * (pointer.x / 800)) , y: 1000 - Math.trunc(1000 * pointer.y / 600)});
    };

    this.input.on('pointerdown', (pointer) => {
        if (!this.game_state.do_trade) {
            isMousePressed = true;
            lastPrintTime = Date.now();
            this.game_state.history = [];
            this.game_state.bids = []
            this.label_price.visible = false;
            this.label_price_accum.visible = false;
        }
    });

    this.input.on('pointerup', _ => {
        isMousePressed = false;
    });

    this.input.on('pointermove', (pointer) => {
        const currentTime = Date.now();
        if (!this.game_state.do_trade && isMousePressed && (currentTime - lastPrintTime >= 50)) { // 5000 ms = 5 seconds
            setEntitlementsPtr(pointer);
            lastPrintTime = currentTime;
        }
    });

    button.on('pointerdown', () => {
        this.game_state.do_trade = true;
        this.label_price.visible = true;
        this.label_price_accum.visible = true;
    });

    setEntitlements({x: 800, y: 200});
}

function update_consumers(game) {
    const c1 = game.game_state.people[0].individual;
    const c2 = game.game_state.people[1].individual;
    const round_n = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
    const q_x = game.game_state.bids.reduce((acc, val) => acc + val['bid'][0], 0);
    const q_y = game.game_state.bids.reduce((acc, val) => acc + val['bid'][1], 0);
    game.label_price.text = `Spot: 1:${Math.abs(round_n(game.game_state.bids[game.game_state.bids.length - 1]['bid'][1]/game.game_state.bids[game.game_state.bids.length - 1]['bid'][0]))}`;
    game.label_price_accum.text = `Accum: 1:${round_n(q_y/q_x)}`;
    game.label_1.text = `[${c1.getEndowment().map(Math.round).join(',')}]=${Math.round(c1.utility(c1.getEndowment()),2)}`;
    game.label_2.text = `[${c2.getEndowment().map(Math.round).join(',')}]=${Math.round(c2.utility(c2.getEndowment()),2)}`;
}

function update() {
    if (this.graphics) {
        this.graphics.clear();

        this.game_state.people.forEach(({individual, translate}) => {
                draw_contours(this.graphics, individual, translate);
        });

        if (this.game_state.do_trade) {
            if (run_trade(
                    this.game_state.people[this.game_state.turn].individual,
                    this.game_state.people[1-this.game_state.turn].individual,
                    this.game_state.bids)) {
                this.game_state.history.push([this.circle.x, this.circle.y]);
                update_consumers(this);
                this.game_state.turn = 1 - this.game_state.turn;
            }
            else
                this.game_state.do_trade = false;
        }

        this.game_state.people.forEach(({individual, translate}) => {
            draw_contours(this.graphics, individual, translate, individual.utility(individual.getEndowment()) * DENSITY/100);
        });

        if (this.game_state.history.length > 1) {
            this.graphics.lineStyle(2, 0xFFFFFF, .2);
            for (var i = 0; i < this.game_state.history.length - 1; i++) {
                this.graphics.beginPath();
                this.graphics.moveTo(this.game_state.history[i][0], this.game_state.history[i][1]);
                this.graphics.lineTo(this.game_state.history[i + 1][0], this.game_state.history[i + 1][1]);
                this.graphics.strokePath();
            }
        }

        this.circle.x = this.game_state.people[0].individual.getEndowment()[0] * 800 / MAX_ENDOWMENT;
        this.circle.y = (MAX_ENDOWMENT - this.game_state.people[0].individual.getEndowment()[1]) * 600 / MAX_ENDOWMENT;
        this.label_1.setPosition(this.circle.x, this.circle.y + this.circle.radius + 10);
        this.label_2.setPosition(this.circle.x, this.circle.y - this.circle.radius - 10);
        if (this.game_state.do_trade && this.game_state.on_off) {
            this.graphics.fillStyle(0x390b0b, 1);
            this.graphics.fillCircleShape(this.circle);
        }
        else {
            this.graphics.fillStyle(0x8a0a0a, 1);
            this.graphics.fillCircleShape(this.circle);
        }
        this.graphics.fillStyle(0xffffff, 0.2);
        this.graphics.fillCircleShape(this.button_circle);

        this.game_state.frame_count++;
        if (this.game_state.frame_count % 10 == 0) this.game_state.on_off = 1 - this.game_state.on_off;
    }
}
