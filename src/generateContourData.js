import { COBB_DOUGLAS, DYN_HOM_COBB_DOUGLAS, HOM_COBB_DOUGLAS } from './artifacts/utility';

export default function generateContourData(value) {

    u = COBB_DOUGLAS([.5,.5]);

    var size = 100,
        x = new Array(size),
        y = new Array(size),
        z = new Array(size),
        i,
        j;

    var d = .01;
    for (var i = 0; i < size; i++) {
        x[i] = d;
        y[i] = d;
        z[i] = new Array(size);
        d += .01;
    }


    for (var i = 0; i < size; i++) {
        const a = y.map(v => u([x[i], v]));
        z[i] = a;
    }

    return [{
        z: z,
        x: x,
        y: y,
        type: "contour",
        showscale: false,
        contours: {
            coloring: 'lines' // Only show lines, no fills
        },
        line: {
            color: 'blue' // Set the contour lines color to blue
        }
    }];
}
