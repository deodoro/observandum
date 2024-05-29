import Phaser from 'phaser';
import { createContourPlotBitmap } from './util/contour';
import { COBB_DOUGLAS, negative } from './artifacts/utility';
import { Individual } from './agents/individual';
import { isoBands, isoLines } from 'marchingsquares';
import { last } from 'lodash';

const SCALE = 1000;
const SIZE = 100;
const DELTA = 10;
const x_gen = new Array(SIZE);
const y_gen = new Array(SIZE);
var z_gen;
var do_trade = false;
var frame_count = 0;
var turn = 0;
var cache = {};
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
var c1, c2;

async function createTexture(inverted, u, v) {
    const canvas = await createContourPlotBitmap(inverted, u, v);
    return canvas.toDataURL();
}

async function preload() {
    c1 = new Individual([800, 200], COBB_DOUGLAS([.25, .75]));
    c2 = new Individual([200, 800], COBB_DOUGLAS([.75, .25]));
    cache['c1'] = c1.utility;
    cache['c2'] = c2.utility;
}

async function create() {
    var d = 0;
    for (var i = 0; i < SIZE; i++) {
        x_gen[i] = y_gen[i] = d;
        d += DELTA;
    }
    z_gen = x_gen.map((v, i) => y_gen.map(t => c1.utility([v,t])))
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
    this.label_1.text = `[${c1.getEndowment().join(',')}]`;

    const label_2 = this.add.text(circle.x, circle.y - circle.radius - 10, '-', {
        fontSize: '12px',
        fill: '#305d04',
        align: 'center',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);
    this.label_2 = label_2;
    this.label_2.text = `[${c2.getEndowment().join(',')}]`;

    const label_price = this.add.text(700, 550, 'Price', {
        fontSize: '20px',
        fill: '#305d04',
        align: 'center',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);
    this.label_price = label_price;
    this.label_price.visible = false;

    const label_price_accum = this.add.text(700, 500, 'Accum', {
        fontSize: '20px',
        fill: '#305d04',
        align: 'center',
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
        c1 = new Individual([Math.trunc(1000 * (pointer.x / 800)) , 1000 - Math.trunc(1000 * pointer.y / 600)], COBB_DOUGLAS([.25, .75]));
        c2 = new Individual([1000 - Math.trunc(1000 * (pointer.x / 800)) , Math.trunc(1000 * pointer.y / 600)], COBB_DOUGLAS([.75, .25]));
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

    do_trade = false;
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

function draw_contours(graphics, u, color, translate) {
    var i = 0;
    gen_contour(u).forEach((v) => {
        v.forEach((z) => {
            const u = z.map(translate);
            graphics.lineStyle(0.5, color, 1.0);
            graphics.beginPath();
            graphics.moveTo(...u.shift());
            u.forEach((v) => graphics.lineTo(...v));
            graphics.strokePath();
        });
    });
}

var flag = true;

function draw_single_curve(graphics, u, color, translate, v) {
    graphics.lineStyle(4, color, .5);
    graphics.fillStyle('#ff0000', 0.2);
    gen_contour(u, v).forEach((v) => {
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

function update() {
    if (this.graphics) {
        this.graphics.clear();

        const SCALE2 = 95;
        draw_contours(this.graphics, 'c1', 0x2d4ebb, a => [a[0] * 800 / SCALE2, (SCALE2 - a[1]) * 600 / SCALE2]);
        draw_contours(this.graphics, 'c2', 0x305d04, a => [(SCALE2 - a[0]) * 800 / SCALE2, (a[1]) * 600 / SCALE2]);

        if (do_trade) {
            const round_n = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
            var bid_accepted = false;

            if (turn === 0) {
                const bid = c1.bestTrade();
                if (c2.evaluate(negative(bid))) {
                    // console.log(`c1 bids [${bid}]`);
                    c1.trade(bid);
                    c2.trade(negative(bid));
                    this.label_1.text = `[${c1.getEndowment().join(',')}]=${Math.round(c1.utility(c1.getEndowment()),2)}`;
                    this.label_2.text = `[${c2.getEndowment().join(',')}]=${Math.round(c2.utility(c2.getEndowment()),2)}`;
                    bid_accepted = true;
                    bids.push(bid.map(Math.abs));
                    const q_x = bids.reduce((acc, val) => acc + val[0], 0);
                    const q_y = bids.reduce((acc, val) => acc + val[1], 0);
                    this.label_price.text = `Spot: 1:${round_n(bids[bids.length - 1][1]/bids[bids.length - 1][0])}`;
                    this.label_price_accum.text = `Accum: 1:${round_n(q_y/q_x)}`;
                }
            }
            else {
                const bid = c2.bestTrade();
                if (c1.evaluate(negative(bid))) {
                    // console.log(`c2 bids [${bid}]`);
                    c2.trade(bid);
                    c1.trade(negative(bid));
                    this.label_1.text = `[${c1.getEndowment().join(',')}]=${Math.round(c1.utility(c1.getEndowment()),2)}`;
                    this.label_2.text = `[${c2.getEndowment().join(',')}]=${Math.round(c2.utility(c2.getEndowment()),2)}`;
                    bid_accepted = true;
                    bids.push(bid.map(Math.abs));
                    const q_x = bids.reduce((acc, val) => acc + val[0], 0);
                    const q_y = bids.reduce((acc, val) => acc + val[1], 0);
                    this.label_price.text = `Spot: 1:${round_n(bids[bids.length - 1][1]/bids[bids.length - 1][0])}`;
                    this.label_price_accum.text = `Accum: 1:${round_n(q_y/q_x)}`;
                }
            }
            turn = 1 - turn;
            if (!bid_accepted) {
                console.log('No more trades');
                console.dir(bids);
                do_trade = false;
            }
            else
                history.push([circle.x, circle.y]);
        }

        // Requires to reduce 5% of utility to get the lines in place
        // Otherwise it will overshoot vertical for c1, horizontal for c2 in the top corners
        // PS: I can't explain it, can you?
        draw_single_curve(this.graphics, 'c1', 0x2d4ebb, a => [a[0] * 800 / SCALE2, (SCALE2 - a[1]) * 600 / SCALE2], c1.utility(c1.getEndowment()) * .95);
        draw_single_curve(this.graphics, 'c2', 0x305d04, a => [(SCALE2 - a[0]) * 800 / SCALE2, a[1] * 600 / SCALE2], c2.utility(c2.getEndowment()) * .95);

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

const cache_map = {};

function get_function(u) {
    if (cache_map[u] === undefined)
        cache_map[u] = x_gen.map((v, i) => y_gen.map(t => cache[u]([t, v])))
    return cache_map[u]
}

function gen_contour(u, v) {
    const z = get_function(u);
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

function gen_bands(u, v) {
    const z = get_function(u);
    const max = Math.max(...z.flat());
    const min = Math.min(...z.flat());
    var levels = [];

    levels = [v];

    return isoBands(z, v, max - v, {polygons: true});
}
