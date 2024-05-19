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
        const data = func(value);
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
        console.dir(data);

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
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

async function preload() {
    const canvas = await createContourPlotBitmap(4, generateContourData);
    const dataURL = canvas.toDataURL();
    this.textures.addBase64('contour', dataURL);
}

async function create() {
    this.textures.on('onload', (key, texture) => {
        this.add.image(400, 300, 'contour').setDepth(0);
        const graphics = this.add.graphics();

        // Draw a rectangle
        rectangle = new Phaser.Geom.Rectangle(0, 300, 100, 50);
        graphics.fillStyle(0x00ff00, 1);
        graphics.fillRectShape(rectangle);
        this.cameras.main.setBackgroundColor('#808080');

        // Save the graphics object for use in the update loop
        this.graphics = graphics;
    });
}

function update() {
    if (this.graphics) {
        // Clear the previous frame
        this.graphics.clear();

        // Move the rectangle to the right
        rectangle.x += 1;

        // Draw the rectangle at its new position
        this.graphics.fillStyle(0x00ff00, 1);
        this.graphics.fillRectShape(rectangle);

        // Reset the rectangle's position if it goes off screen
        if (rectangle.x > config.width) {
            rectangle.x = -rectangle.width;
        }
    }
}
