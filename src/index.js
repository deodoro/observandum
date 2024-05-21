import Phaser from 'phaser';
import { createContourPlotBitmap } from './util/contour';
import { COBB_DOUGLAS } from './artifacts/utility';
import { Individual } from './agents/individual';
import { isoLines } from 'marchingsquares';

const SCALE = 1000;
const SIZE = 100;
const DELTA = 10;
const x_gen = new Array(SIZE);
const y_gen = new Array(SIZE);

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
    c1 = new Individual([800, 200], COBB_DOUGLAS([.25,.75]));
    c2 = new Individual([200, 800], COBB_DOUGLAS([.75,.25]));
    console.log(c1.utility(c1.getEndowment()));
    // const dataURL_up = await createTexture(inverted=false,c1.utility);
    // const dataURL_dn = await createTexture(inverted=true,c2.utility);
    // this.textures.addBase64('contour_up', dataURL_up);
    // this.textures.addBase64('contour_dn', dataURL_dn);

    // const dataURL_line1 = await createTexture(inverted=false,c1.utility, c1.utility(c1.getEndowment()));
    // this.textures.addBase64('contour_line1', dataURL_line1);

    // const dataURL_line2 = await createTexture(inverted=false,c2.utility, c2.utility(c2.getEndowment()));
    // this.textures.addBase64('contour_line2', dataURL_line2);
}

async function create() {
    var d = 0;
    for (var i = 0; i < SIZE; i++) {
        x_gen[i] = y_gen[i] = d;
        d += DELTA;
    }
    const graphics = this.add.graphics();
    rectangle = new Phaser.Geom.Rectangle(0, 300, 100, 50);
    graphics.fillStyle(0x00ff00, 1);
    graphics.fillRectShape(rectangle);

    circle = new Phaser.Geom.Circle(400,300,5);
    graphics.fillStyle(0xff00ff, 1);
    graphics.fillCircleShape(circle);

    this.cameras.main.setBackgroundColor('#efefef');
    this.graphics = graphics;
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
        })
    });
}

function draw_single_curve(graphics, u, color, translate, v) {
    graphics.lineStyle(1, color, 1.0);
    gen_contour(u,v).forEach((v) => {
        v.forEach((z) => {
            const u = z.map((v) => translate(v));
            graphics.beginPath();
            graphics.moveTo(...u.shift());
            u.forEach((v) => graphics.lineTo(...v));
            graphics.strokePath();
        })
    });
}

var frames = 0;
var line = 0;

function update() {
    if (this.graphics) {
        this.graphics.clear();

        rectangle.x += 1;
        this.graphics.fillStyle(0x00ff00, 1);
        this.graphics.fillRectShape(rectangle);
        if (rectangle.x > config.width) {
            rectangle.x = -rectangle.width;
        }

        circle.x = c1.getEndowment()[0] * 800 / SCALE;
        circle.y = (SCALE-c1.getEndowment()[1]) * 600 / SCALE;
        this.graphics.fillStyle(0xff00ff, 1);
        this.graphics.fillCircleShape(circle);

        const SCALE2 = 95;
        draw_contours(this.graphics, c1.utility, 0x0000ff, a => [a[0] * 800 / SCALE2, (SCALE2 - a[1]) * 600 / SCALE2]);
        draw_contours(this.graphics, c2.utility, 0xff00ff, a => [(SCALE2 - a[0]) * 800 / SCALE2, (a[1]) * 600 / SCALE2]);

        // if (frames++ % 45 == 0) {
        //     line += 50;
        //     if (line > 1000) line = 0;
        // }
        line = 200;
        draw_single_curve(this.graphics, c1.utility, 0xff0000, a => [a[0] * 800 / SCALE2, (SCALE2 - a[1]) * 600 / SCALE2], line);
    }
}

var done = false;

function gen_contour(u, v) {
    const z = x_gen.map((v, i) => y_gen.map(t => u([v, t])));
    const max = Math.max(...z.flat());
    const min = Math.min(...z.flat());
    var levels = [];

    if (v === undefined) {
        const LEVELS = 20;
        for (var i = 0; i < LEVELS; i++)
            levels.push(min + i * (max - min) / LEVELS);
    }
    else {
        levels = [v];
        if (!done) {
            console.log(z);
            console.dir(isoLines(z, levels));
            done = true;
        }
    }

    return isoLines(z, levels);
}
