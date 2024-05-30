import Phaser from 'phaser';
import { createContourPlotBitmap } from './util/contour';
import { COBB_DOUGLAS, negative } from './artifacts/utility';
import { Individual } from './agents/individual';
import { isoBands, isoLines } from 'marchingsquares';
import { last } from 'lodash';

const SCALE = 1000;
const SCALE2 = 95;
const SIZE = 100;
const DELTA = 10;
const x_gen = new Array(SIZE);
const y_gen = new Array(SIZE);
var z_gen;
var do_trade = false;
var frame_count = 0;
var turn = 0;
const cache = {};
const cache_map = {};
var history = [];
var bids = []

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
var people = [];

async function createTexture(inverted, u, v) {
    const canvas = await createContourPlotBitmap(inverted, u, v);
    return canvas.toDataURL();
}

async function addIndividual(individual, translate) {
    cache[individual.getName()] = individual.utility;
    people.push({individual, translate});
}

async function preload() {
    addIndividual(new Individual([800, 200], COBB_DOUGLAS([.25, .75]), name='c1', color = 0x2d4ebb), translate = a => [a[0] * 800 / SCALE2, (SCALE2 - a[1]) * 600 / SCALE2]);
    addIndividual(new Individual([200, 800], COBB_DOUGLAS([.75, .25]), name='c2', color = 0x305d04), translate = a => [(SCALE2 - a[0]) * 800 / SCALE2, a[1] * 600 / SCALE2]);
}

async function create() {
    var d = 0;
    for (var i = 0; i < SIZE; i++) {
        x_gen[i] = y_gen[i] = d;
        d += DELTA;
    }
    // z_gen = x_gen.map((v, i) => y_gen.map(t => c1.utility([v,t])))

    const graphics = this.add.graphics();
    this.graphics = graphics;
    circle = new Phaser.Geom.Circle(400, 300, 5);
    graphics.fillStyle(0xff00ff, 1);
    graphics.fillCircleShape(circle);

    const label_1 = this.add.text(circle.x, circle.y + circle.radius + 10, '-', {
        fontSize: '12px',
        fill: '#2d4ebb',
        align: 'center',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);
    this.label_1 = label_1;
    // this.label_1.text = `[${c1.getEndowment().join(',')}]`;

    const label_2 = this.add.text(circle.x, circle.y - circle.radius - 10, '-', {
        fontSize: '12px',
        fill: '#437e07',
        align: 'center',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);
    this.label_2 = label_2;
    // this.label_2.text = `[${c2.getEndowment().join(',')}]`;

    const label_price = this.add.text(711, 550, 'Spot:', {
        fontSize: '20px',
        fill: '#f0f0f0',
        align: 'left',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);
    this.label_price = label_price;
    this.label_price.visible = false;

    const label_price_accum = this.add.text(700, 530, 'Accum:', {
        fontSize: '20px',
        fill: '#f0f0f0',
        align: 'left',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);
    this.label_price_accum = label_price_accum;
    this.label_price_accum.visible = false;

    this.cameras.main.setBackgroundColor('#c2b8aa');

    this.input.on('pointerdown', pointer => {
    });

    let isMousePressed = false;
    let lastPrintTime = 0;
    let setEntitlements = pointer => {
        people = [];

        addIndividual(new Individual([Math.trunc(1000 * (pointer.x / 800)) , 1000 - Math.trunc(1000 * pointer.y / 600)], COBB_DOUGLAS([.25, .75]), name='c1', color = 0x2d4ebb), translate = a => [a[0] * 800 / SCALE2, (SCALE2 - a[1]) * 600 / SCALE2]);
        addIndividual(new Individual([1000 - Math.trunc(1000 * (pointer.x / 800)) , Math.trunc(1000 * pointer.y / 600)], COBB_DOUGLAS([.75, .25]), name='c2', color = 0x305d04), translate = a => [(SCALE2 - a[0]) * 800 / SCALE2, a[1] * 600 / SCALE2]);
        const c1 = people[0].individual;
        const c2 = people[1].individual;
        this.label_1.text = `[${c1.getEndowment().join(',')}]=${Math.round(c1.utility(c1.getEndowment()),2)}`;
        this.label_2.text = `[${c2.getEndowment().join(',')}]=${Math.round(c2.utility(c2.getEndowment()),2)}`;
    }

    this.input.on('pointerdown', function (pointer) {
        isMousePressed = true;
        lastPrintTime = Date.now();
    });

    this.input.on('pointerup', (pointer) => {
        const currentTime = Date.now();
        if (!do_trade && isMousePressed && (currentTime - lastPrintTime >= 50)) { // 5000 ms = 5 seconds
            setEntitlements(pointer);
            lastPrintTime = currentTime;
            history = [];
            bids = []
            this.label_price.visible = false;
            this.label_price_accum.visible = false;
        }
        isMousePressed = false;
    });

    this.input.on('pointermove', (pointer) => {
        const currentTime = Date.now();
        if (!do_trade && isMousePressed && (currentTime - lastPrintTime >= 50)) { // 5000 ms = 5 seconds
            setEntitlements(pointer);
            lastPrintTime = currentTime;
            history = [];
            bids = []
            this.label_price.visible = false;
            this.label_price_accum.visible = false;
        }
    });

    const button = this.add.text(700, 50, 'Trade', {
        fontSize: '20px',
        fill: '#ff0000',
        fontFamily: 'sans-serif'
    }).setInteractive();

    button.on('pointerdown', () => {
        do_trade = true;
        history = [];
        bids = []
        this.label_price.visible = true;
        this.label_price_accum.visible = true;
    });
}

function update() {
    if (this.graphics) {
        const c1 = people[0].individual;
        const c2 = people[1].individual;
        this.graphics.clear();

        people.forEach(({individual, translate}) => {
                draw_contours(this.graphics, individual, translate);
        });

        if (do_trade) {
            const round_n = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
            var bid_accepted = false;
            var proposer = people[turn].individual;
            var counterpart = people[1-turn].individual;
            const bid = proposer.bestTrade();
            if (counterpart.evaluate(negative(bid))) {
                proposer.trade(bid);
                counterpart.trade(negative(bid));
                bid_accepted = true;
                bids.push({'proposer': proposer.getName(), 'bid': bid});
            }
            turn = 1 - turn;
            if (!bid_accepted) {
                console.log('No more trades');
                console.dir(bids);
                do_trade = false;
            }
            else {
                this.label_1.text = `[${c1.getEndowment().join(',')}]=${Math.round(c1.utility(c1.getEndowment()),2)}`;
                this.label_2.text = `[${c2.getEndowment().join(',')}]=${Math.round(c2.utility(c2.getEndowment()),2)}`;
                const q_x = bids.reduce((acc, val) => acc + val['bid'][0], 0);
                const q_y = bids.reduce((acc, val) => acc + val['bid'][1], 0);
                this.label_price.text = `Spot: 1:${Math.abs(round_n(bids[bids.length - 1]['bid'][1]/bids[bids.length - 1]['bid'][0]))}`;
                this.label_price_accum.text = `Accum: 1:${round_n(q_y/q_x)}`;
                history.push([circle.x, circle.y]);
            }
        }

        // Requires to reduce 5% of utility to get the lines in place
        // Otherwise it will overshoot vertical for c1, horizontal for c2 in the top corners
        // PS: I can't explain it, can you?
        people.forEach(({individual, translate}) => {
            draw_single_curve(this.graphics, individual, translate, individual.utility(individual.getEndowment()) * .95);
        });

        if (history.length > 1) {
            this.graphics.lineStyle(1, 0xFFFFFF, .5);
            for (var i = 0; i < history.length - 1; i++) {
                this.graphics.beginPath();
                this.graphics.moveTo(history[i][0], history[i][1]);
                this.graphics.lineTo(history[i + 1][0], history[i + 1][1]);
                this.graphics.strokePath();
            }
        }

        circle.x = c1.getEndowment()[0] * 800 / SCALE;
        circle.y = (SCALE - c1.getEndowment()[1]) * 600 / SCALE;
        this.label_1.setPosition(circle.x, circle.y + circle.radius + 10);
        this.label_2.setPosition(circle.x, circle.y - circle.radius - 10);
        this.graphics.fillStyle(0xff00ff, 1);
        this.graphics.fillCircleShape(circle);

        frame_count++;
    }
}

function get_function(u, key) {
    if (cache_map[key] === undefined) {
        cache_map[key] = x_gen.map((v, i) => y_gen.map(t => u([t, v])))
    }
    return cache_map[key]
}

function gen_contour(u, k, v) {
    const z = get_function(u,k);
    const max = Math.max(...z.flat());
    const min = Math.min(...z.flat());
    var levels = [];

    if (v === undefined) {
        const LEVELS = 20;
        for (var i = 0; i < LEVELS; i++)
            levels.push(min + i * (max - min) / LEVELS);
    } else {
        levels = [v];
    }
    return isoLines(z, levels);
}

function draw_contours(graphics, individual, translate) {
    var i = 0;
    gen_contour(individual.getUtility(), individual.getName()).forEach((v) => {
        v.forEach((z) => {
            const u = z.map(translate);
            graphics.lineStyle(0.5, individual.getColor(), 1.0);
            graphics.beginPath();
            graphics.moveTo(...u.shift());
            u.forEach((v) => graphics.lineTo(...v));
            graphics.strokePath();
        });
    });
}

function draw_single_curve(graphics, individual, translate, utility_level) {
    graphics.lineStyle(1.5, individual.getColor(), 1.0);
    graphics.fillStyle('#ff0000', 0.2);
    gen_contour(individual.getUtility(), individual.getName(), utility_level).forEach((v) => {
        v.forEach((z) => {
            const u = z.map(translate);
            graphics.beginPath();
            graphics.moveTo(...u.shift());
            u.forEach((v) => graphics.lineTo(...v));
            graphics.strokePath();
            graphics.fillPath();
        });
    });
}
