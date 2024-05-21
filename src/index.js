import Phaser from 'phaser';
import { createContourPlotBitmap } from './util/contour';
import { COBB_DOUGLAS } from './artifacts/utility';
import { Individual } from './agents/individual';
import { isoLines } from 'marchingsquares';
import { last } from 'lodash';

const SCALE = 1000;
const SIZE = 100;
const DELTA = 10;
const x_gen = new Array(SIZE);
const y_gen = new Array(SIZE);
var z_gen;

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
        fill: '#0000ff',
        align: 'center',
        FontFace: 'sans-serif'
    }).setOrigin(0.5, 0.5);
    this.label_1 = label_1;
    this.label_1.text = `[${c1.getEndowment().join(',')}]`;

    const label_2 = this.add.text(circle.x, circle.y - circle.radius - 10, '-', {
        fontSize: '12px',
        fill: '#00ff00',
        align: 'center',
        FontFace: 'sans-serif'
    }).setOrigin(0.5, 0.5);
    this.label_2 = label_2;
    this.label_2.text = `[${c2.getEndowment().join(',')}]`;

    this.cameras.main.setBackgroundColor('#efefef');

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
        lastPrintTime = Date.now();
        isMousePressed = true;
    });

    this.input.on('pointerup', function () {
        isMousePressed = false;
    });

    this.input.on('pointermove', function (pointer) {
        const currentTime = Date.now();
        if (isMousePressed && (currentTime - lastPrintTime >= 50)) { // 5000 ms = 5 seconds
            setEntitlements(pointer);
            lastPrintTime = currentTime;
        }
    });
}

function draw_contours(graphics, u, color, translate) {
    graphics.lineStyle(0.5, color, 1.0);
    gen_contour(u).forEach((v) => {
        v.forEach((z) => {
            const u = z.map((v) => translate(v));
            graphics.beginPath();
            graphics.moveTo(...u.shift());
            u.forEach((v) => graphics.lineTo(...v));
            graphics.strokePath();
        });
    });
}

function draw_single_curve(graphics, u, color, translate, v) {
    graphics.lineStyle(1, color, 1.0);
    gen_contour(u, v).forEach((v) => {
        v.forEach((z) => {
            const u = z.map((v) => translate(v));
            graphics.beginPath();
            graphics.moveTo(...u.shift());
            u.forEach((v) => graphics.lineTo(...v));
            graphics.strokePath();
        });
    });
}

function update() {
    if (this.graphics) {
        this.graphics.clear();

        circle.x = c1.getEndowment()[0] * 800 / SCALE;
        circle.y = (SCALE - c1.getEndowment()[1]) * 600 / SCALE;
        this.label_1.setPosition(circle.x, circle.y + circle.radius + 10);
        this.label_2.setPosition(circle.x, circle.y - circle.radius - 10);
        this.graphics.fillStyle(0xff00ff, 1);
        this.graphics.fillCircleShape(circle);

        const SCALE2 = 95;
        draw_contours(this.graphics, c1.utility, 0x0000ff, a => [a[0] * 800 / SCALE2, (SCALE2 - a[1]) * 600 / SCALE2]);
        draw_contours(this.graphics, c2.utility, 0x00ff00, a => [(SCALE2 - a[0]) * 800 / SCALE2, (a[1]) * 600 / SCALE2]);

        // Requires to reduce 5% of utility to get the lines in place
        // Otherwise it will overshoot vertical for c1, horizontal for c2 in the top corners
        draw_single_curve(this.graphics, c1.utility, 0xff0000, a => [a[0] * 800 / SCALE2, (SCALE2 - a[1]) * 600 / SCALE2], c1.utility(c1.getEndowment()) * .95);
        draw_single_curve(this.graphics, c2.utility, 0xff0000, a => [(SCALE2 - a[0]) * 800 / SCALE2, a[1] * 600 / SCALE2], c2.utility(c2.getEndowment()) * .95);
    }
}

function gen_contour(u, v) {
    const z = x_gen.map((v, i) => y_gen.map(t => u([t, v])));
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
