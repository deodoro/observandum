import { isNumber, wrap } from 'lodash';
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
        if (!isNumber(v)) {
            throw new Error(`Invalid utility level: ${v}`);
        }
        levels = [v];
    }
    return isoLines(z, levels);
}

function draw_contours(individual, translate, draw_callback, utility_level) {
  try {
    gen_contour(individual.getUtility(), individual.getName(), utility_level).forEach((v) => {
        v.forEach((z) => {
            const u = z.map(translate);
            draw_callback(u);
        });
    });
  }
  catch (Exception) {
    console.log(Exception);
  }
}

export { draw_contours };
