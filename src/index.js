import Phaser from 'phaser';
import { createContourPlotBitmap } from './util/contour';
import { COBB_DOUGLAS, DYN_HOM_COBB_DOUGLAS, HOM_COBB_DOUGLAS } from './artifacts/utility';

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

async function createTexture(u, inverted) {
    const canvas = await createContourPlotBitmap(u, inverted);
    return canvas.toDataURL();
}

async function preload() {
    const dataURL_up = await createTexture(COBB_DOUGLAS([.5,.5]), false);
    const dataURL_dn = await createTexture(COBB_DOUGLAS([.5,.5]), true);
    this.textures.addBase64('contour_up', dataURL_up);
    this.textures.addBase64('contour_dn', dataURL_dn);
}

async function create() {
    const textureKeys = ['contour_up', 'contour_dn']; // Add all your texture keys here
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
        this.cameras.main.setBackgroundColor('#c0c0c0');
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
    }
}
