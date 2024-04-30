class Flock extends Group {
    constructor() {
        super();
        this.sectionSize = 50;
    }

    lifegame() {
        for (let x = 0; x <= width; x += this.sectionSize) {
            for (let y = 0; y <= height; y += this.sectionSize) {
                let sectBoids = [];
                for (let boid of this.group) {
                    if (!(x <= boid.position.x && boid.position.x <= x + this.sectionSize)) continue;
                    if (!(y <= boid.position.y && boid.position.y <= y + this.sectionSize)) continue;
                    sectBoids.push(boid);
                }
                if (sectBoids.length === 0) continue;
                let sectDentisy = sectBoids.length / (this.sectionSize * this.sectionSize);
                sectDentisy *= 50;
                if (0.4 <= sectDentisy && sectDentisy <= 0.9) {
                    this.add(new Boid(x + this.sectionSize * random(0, 1), y + this.sectionSize * random(0, 1)));
                    this.add(new Boid(x + this.sectionSize * random(0, 1), y + this.sectionSize * random(0, 1)));
                }
            }
        }
    }

    delete(boid) {
        leaveCount++;
        super.delete(boid);
    }
}