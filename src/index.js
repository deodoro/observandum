import Phaser from 'phaser';
import { COBB_DOUGLAS, negative } from './artifacts/utility';
import { Individual } from './agents/individual';
import { last } from 'lodash';
import { round } from 'math';
import { draw_contours } from './util/contour';

const MAX_ENDOWMENT = 1000;
const DENSITY = 90; // Isoline density
var do_trade = false;
var frame_count = 0;
var turn = 0;
var history = [];
var bids = [];
var circle;
var new_circle;
var on_off = 0;

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
var people = [];

async function addIndividual(individual, translate) {
    people.push({individual, translate});
}

async function preload() {
}

async function create() {
    const graphics = this.add.graphics();
    this.graphics = graphics;
    circle = new Phaser.Geom.Circle(400, 300, 5);
    graphics.fillStyle(0xff00ff, 1);
    graphics.fillCircleShape(circle);

    const label_1 = this.add.text(circle.x, circle.y + circle.radius + 10, '-', {
        fontSize: '12px',
        fill: '#2d4ebb',
        align: 'center',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);
    this.label_1 = label_1;

    const label_2 = this.add.text(circle.x, circle.y - circle.radius - 10, '-', {
        fontSize: '12px',
        fill: '#437e07',
        align: 'center',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);
    this.label_2 = label_2;

    const label_price = this.add.text(711, 550, 'Spot:', {
        fontSize: '20px',
        fill: '#f0f0f0',
        align: 'left',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);
    this.label_price = label_price;
    this.label_price.visible = false;

    const label_price_accum = this.add.text(700, 530, 'Accum:', {
        fontSize: '20px',
        fill: '#f0f0f0',
        align: 'left',
        fontFamily: 'sans-serif'
    }).setOrigin(0.5, 0.5);
    this.label_price_accum = label_price_accum;
    this.label_price_accum.visible = false;

    this.cameras.main.setBackgroundColor('#c2b8aa');

    this.input.on('pointerdown', pointer => {
    });

    let isMousePressed = false;
    let lastPrintTime = 0;
    let setEntitlements = ({x,y}) => {
        people = [];
        addIndividual(new Individual([x, y], COBB_DOUGLAS([.25, .75]), name='c1', color = 0x2d4ebb), translate = a => [a[0] * 800 / DENSITY, (DENSITY - a[1]) * 600 / DENSITY]);
        addIndividual(new Individual([1000-x, 1000-y], COBB_DOUGLAS([.75, .25]), name='c2', color = 0x305d04), translate = a => [(DENSITY - a[0]) * 800 / DENSITY, a[1] * 600 / DENSITY]);
        const c1 = people[0].individual;
        const c2 = people[1].individual;
        this.label_1.text = `[${c1.getEndowment().join(',')}]=${Math.round(c1.utility(c1.getEndowment()),2)}`;
        this.label_2.text = `[${c2.getEndowment().join(',')}]=${Math.round(c2.utility(c2.getEndowment()),2)}`;
        this.label_1.visible = true;
        this.label_2.visible = true;
    }
    let setEntitlementsPtr = pointer => {
        setEntitlements({x: Math.trunc(1000 * (pointer.x / 800)) , y: 1000 - Math.trunc(1000 * pointer.y / 600)});
    };

    setEntitlements({x: 800, y: 200});

    this.input.on('pointerdown', function (pointer) {
        isMousePressed = true;
        lastPrintTime = Date.now();
    });

    this.input.on('pointerup', (pointer) => {
        const currentTime = Date.now();
        if (!do_trade && isMousePressed && (currentTime - lastPrintTime >= 50)) { // 5000 ms = 5 seconds
            setEntitlementsPtr(pointer);
            lastPrintTime = currentTime;
            history = [];
            bids = []
            this.label_price.visible = false;
            this.label_price_accum.visible = false;
        }
        isMousePressed = false;
    });

    this.input.on('pointermove', (pointer) => {
        const currentTime = Date.now();
        if (!do_trade && isMousePressed && (currentTime - lastPrintTime >= 50)) { // 5000 ms = 5 seconds
            setEntitlementsPtr(pointer);
            lastPrintTime = currentTime;
            history = [];
            bids = []
            this.label_price.visible = false;
            this.label_price_accum.visible = false;
        }
    });

    new_circle = new Phaser.Geom.Circle(718, 60, 25);

    const button = this.add.text(700, 50, 'TRADE', {
        fontSize: '12px',
        fill: '#FFFFFF',
        fontFamily: 'sans-serif'
    }).setInteractive();

    button.on('pointerdown', () => {
        do_trade = true;
        history = [];
        bids = []
        this.label_price.visible = false;
        this.label_price_accum.visible = false;
    });
}

function update() {
    if (this.graphics) {
        const c1 = people[0].individual;
        const c2 = people[1].individual;
        this.graphics.clear();

        people.forEach(({individual, translate}) => {
                draw_contours(this.graphics, individual, translate);
        });

        if (do_trade) {
            const round_n = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
            var bid_accepted = false;
            var proposer = people[turn].individual;
            var counterpart = people[1-turn].individual;
            const bid = proposer.bestTrade();
            if (counterpart.evaluate(negative(bid))) {
                proposer.trade(bid);
                counterpart.trade(negative(bid));
                bid_accepted = true;
                bids.push({'proposer': proposer.getName(), 'bid': bid});
            }
            turn = 1 - turn;
            if (!bid_accepted) {
                console.log('No more trades');
                console.dir(bids);
                do_trade = false;
            }
            else {
                this.label_1.text = `[${c1.getEndowment().map(Math.round).join(',')}]=${Math.round(c1.utility(c1.getEndowment()),2)}`;
                this.label_2.text = `[${c2.getEndowment().map(Math.round).join(',')}]=${Math.round(c2.utility(c2.getEndowment()),2)}`;
                const q_x = bids.reduce((acc, val) => acc + val['bid'][0], 0);
                const q_y = bids.reduce((acc, val) => acc + val['bid'][1], 0);
                this.label_price.text = `Spot: 1:${Math.abs(round_n(bids[bids.length - 1]['bid'][1]/bids[bids.length - 1]['bid'][0]))}`;
                this.label_price_accum.text = `Accum: 1:${round_n(q_y/q_x)}`;
                history.push([circle.x, circle.y]);
            }
        }

        people.forEach(({individual, translate}) => {
            draw_contours(this.graphics, individual, translate, individual.utility(individual.getEndowment()) * DENSITY/100);
        });

        if (history.length > 1) {
            this.graphics.lineStyle(2, 0xFFFFFF, .2);
            for (var i = 0; i < history.length - 1; i++) {
                this.graphics.beginPath();
                this.graphics.moveTo(history[i][0], history[i][1]);
                this.graphics.lineTo(history[i + 1][0], history[i + 1][1]);
                this.graphics.strokePath();
            }
        }

        circle.x = c1.getEndowment()[0] * 800 / MAX_ENDOWMENT;
        circle.y = (MAX_ENDOWMENT - c1.getEndowment()[1]) * 600 / MAX_ENDOWMENT;
        this.label_1.setPosition(circle.x, circle.y + circle.radius + 10);
        this.label_2.setPosition(circle.x, circle.y - circle.radius - 10);
        if (do_trade && on_off) {
            this.graphics.fillStyle(0x390b0b, 1);
            this.graphics.fillCircleShape(circle);
        }
        else {
            this.graphics.fillStyle(0x8a0a0a, 1);
            this.graphics.fillCircleShape(circle);
        }
        this.graphics.fillStyle(0xffffff, 0.2);
        this.graphics.fillCircleShape(new_circle);

        frame_count++;
        if (frame_count % 10 == 0) on_off = 1 - on_off;
    }
}
