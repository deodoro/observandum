import { isoBands, isoLines } from 'marchingsquares';
const cache_map = {};

const SIZE = 100;
const LEVELS = 20;
const DELTA = 10;

function get_function(u, key) {
    if (cache_map[key] === undefined) {
        const x_gen = new Array(SIZE);
        const y_gen = new Array(SIZE);
        var d = 0;

        for (var i = 0; i < SIZE; i++) {
            x_gen[i] = y_gen[i] = d;
            d += DELTA;
        }
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
        for (var i = 0; i < LEVELS; i++)
            levels.push(min + i * (max - min) / LEVELS);
    } else {
        levels = [v];
    }
    return isoLines(z, levels);
}

function draw_contours(graphics, individual, translate, utility_level) {
    const is_field = utility_level === undefined;
    if (is_field) {
        graphics.lineStyle(0.7, individual.getColor(), 1.0);
    }
    else {
        graphics.lineStyle(1.5, individual.getColor(), 1.0);
        graphics.fillStyle('#ff0000', 0.2);
    }
    gen_contour(individual.getUtility(), individual.getName(), utility_level).forEach((v) => {
        v.forEach((z) => {
            const u = z.map(translate);
            graphics.beginPath();
            graphics.moveTo(...u.shift());
            u.forEach((v) => graphics.lineTo(...v));
            graphics.strokePath();
            if (!is_field)
                graphics.fillPath();
        });
    });
}

export { draw_contours };
