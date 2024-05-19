import Plotly from 'plotly.js-dist-min';

const SIZE = 100;

export default function generateContourData(u) {
    var x = new Array(SIZE),
        y = new Array(SIZE),
        z = new Array(SIZE),
        i,
        j;

    var d = .01;
    for (var i = 0; i < SIZE; i++) {
        x[i] = y[i] = d += .01;
    }

    x.forEach((v, i) => z[i] = y.map(t => u([v, t])));

    return [{
        z: z,
        x: x,
        y: y,
        type: "contour",
        showscale: false,
        autocontour: false,
        ncontours: 20,
        contours: {
            coloring: 'lines' // Only show lines, no fills
        },
        line: {
            color: 'blue' // Set the contour lines color to blue
        }
    }];
}

async function createEmptyPlotBitmap() {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        resolve(canvas);
    });
}

async function createContourPlotBitmap(u, inverted = false) {
    return new Promise((resolve, reject) => {
        const data = generateContourData(u);
        const layout = {
            xaxis: {
                visible: false
            },
            yaxis: {
                visible: false
            },
            showlegend: false,
            annotations: [],
            title: '',
            margin: {
                l: 0,
                r: 0,
                t: 0,
                b: 0
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
        };

        const gd = document.createElement('div');
        gd.style.backgroundColor = 'rgba(0,0,0,0)';
        document.body.appendChild(gd);

        Plotly.newPlot(gd, data, layout).then(function(gd) {
            Plotly.toImage(gd, {format: 'png', width: 800, height: 600}).then(function(url) {
                const img = new Image();
                img.src = url;
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    if (inverted) {
                        ctx.translate(canvas.width / 2, canvas.height / 2);
                        ctx.rotate(Math.PI);
                        ctx.drawImage(img, -canvas.width/2, -canvas.height/2);
                    }
                    else {
                        ctx.drawImage(img, 0, 0);
                    }
                    document.body.removeChild(gd);
                    resolve(canvas);
                };
            }).catch(reject);
        }).catch(reject);
    });
}

export { createEmptyPlotBitmap, createContourPlotBitmap };
