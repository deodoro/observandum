import Plotly from 'plotly.js-dist-min';
import Phaser from 'phaser';
import generateContourData from './generateContourData';

// Testing
async function createEmptyPlotBitmap(value, func) {
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

async function createContourPlotBitmap(value, func) {
    return new Promise((resolve, reject) => {
        const data = [{
            z: func(value),
            type: 'contour'
        }];
        const layout = {
            title: 'Contour Plot'
        };

        const gd = document.createElement('div');
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
                    ctx.drawImage(img, 0, 0);
                    document.body.removeChild(gd);
                    resolve(canvas);
                };
            }).catch(reject);
        }).catch(reject);
    });
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        preload: preload,
        create: create
    }
};

const game = new Phaser.Game(config);

async function preload() {
    const canvas = await createContourPlotBitmap(5, generateContourData);
    const dataURL = canvas.toDataURL();
    this.textures.addBase64('contour', dataURL);
}

async function create() {
    this.textures.on('onload', (key, texture) => {
        this.add.image(400, 300, 'contour');
    });
}
