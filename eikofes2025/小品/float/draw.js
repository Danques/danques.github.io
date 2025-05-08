let waves;
const number = 30;
function setup() {
    createCanvas(512, 512).parent("canvas-container");
    waves = new Group();
    noStroke();
    background(255);
    fillElements();
}

function draw() {
    waves.run();
    if (waves.size() === 0) {
        fillElements();
    }
}

function fillElements() {
    for (let i = 0; i < number; ++i) {
        waves.add(new BlockWave(width / number * i, height + 50));
    }
}

function windowResized() {
    resizeCanvas(512, 512, WEBGL);
}
class BlockWave {
    constructor(x, y) {
        this.progress = 0;
        this.velocity = 0;
        this.acceleration = 0;
        this.init_position = createVector(x, y);
        this.position = createVector(x, y);
        this.dist = 10;
        this.box = 30;
        this.gray = random(0, 1);
        this.gray_velocity = 0;
    }

    run() {
        this.update();
        this.render();
        return this.border();
    }

    update() {
        this.acceleration += random(0, 0.001) - this.velocity * random(0.003, 0.005);
        this.velocity += this.acceleration;
        this.progress += this.velocity;
        let add_vector = createVector(this.progress, sin(this.progress) * random(0, 0.)).mult(this.dist);
        add_vector.rotate(-PI / 2);
        this.position = this.init_position.copy().add(add_vector);
        this.gray_velocity += 0.03 * random(-1, 1);
        this.gray = sin(this.gray_velocity * PI) * 0.5 + 0.5;
    }


    render() {
        push();
        translate(this.position);
        fill(120 * this.gray + 50);
        let size = this.box * (this.velocity * 2. + 0.5);
        rotate(PI / 2);
        quad(0, - size, size, 0, 0, size, 0 - size, 0);
        pop();
    }

    border() {
        const margin = 100;
        return this.position.x < -margin || this.position.x > width + margin || this.position.y < -margin || this.position.y > height + margin;
    }
}
class Group {
    constructor() {
        this.group = new Set();
    }

    run() {
        for (let element of this.group) {
            if (element.run(this.group)) {
                this.delete(element);
            }
        }
    }

    add(element) {
        this.group.add(element);
    }

    delete(element) {
        this.group.delete(element);
    }

    size() {
        return this.group.size;
    }
}