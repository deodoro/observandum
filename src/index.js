import Phaser from 'phaser';
import { createContourPlotBitmap } from './util/contour';
import { COBB_DOUGLAS } from './artifacts/utility';
import { Individual } from './agents/individual';

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
    c1 = new Individual([.8, .2], COBB_DOUGLAS([.25,.75]));
    c2 = new Individual([.2, .8], COBB_DOUGLAS([.75,.25]));
    const dataURL_up = await createTexture(inverted=false,c1.utility);
    const dataURL_dn = await createTexture(inverted=true,c2.utility);
    const dataURL_line1 = await createTexture(inverted=false,c1.utility, c1.utility(c1.getEndowment()));
    // const dataURL_line2 = await createTexture(inverted=false,c2.utility, c2.utility(c2.getEndowment()));

    this.textures.addBase64('contour_up', dataURL_up);
    this.textures.addBase64('contour_dn', dataURL_dn);
    this.textures.addBase64('contour_line1', dataURL_line1);
    // this.textures.addBase64('contour_line2', dataURL_line2);
}

async function create() {
    // const textureKeys = ['contour_up'];
    // const textureKeys = ['contour_up', 'contour_dn'];
    const textureKeys = ['contour_up', 'contour_dn', 'contour_line1'];
    const loadTexture = (scene, key) => {
        return new Promise((resolve) => {
            scene.textures.on('onload', (loadedKey) => {
                if (loadedKey === key) {
                    scene.add.image(400, 300, key);
                    resolve();
                }
            });
        });
    }
    const texturePromises = textureKeys.map(key => loadTexture(this, key));

    const initGraphics = () => {
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
    this.textures.on('onload', (key, texture) => {
        this.add.image(400, 300, key);
    });

    Promise.all(texturePromises).then(() => {
        initGraphics();
    });

}

function update() {
    if (this.graphics) {
        this.graphics.clear();

        rectangle.x += 1;
        this.graphics.fillStyle(0x00ff00, 1);
        this.graphics.fillRectShape(rectangle);
        if (rectangle.x > config.width) {
            rectangle.x = -rectangle.width;
        }

        circle.x = c1.getEndowment()[0] * 800;
        circle.y = (1-c1.getEndowment()[1]) * 600;
        this.graphics.fillStyle(0xff00ff, 1);
        this.graphics.fillCircleShape(circle);

    }
}
