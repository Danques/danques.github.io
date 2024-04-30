class sinPlot {
    constructor(x, y, startFrame) {
        this.position = createVector(x, y);
        this.startFrame = startFrame;
        this.points = 256;
        this.floatHeight = 300 + 60 * random(0, 1);
        this.amplitude = 20;
        this.animationFrame = Math.floor(120 + 180 * random(0, 1));
        this.randomValue = random(0, 1);
    }
    run(_) {
        const ratio = (frameCount - this.startFrame) / this.animationFrame;
        push();
        noStroke();
        translate(this.position.x, this.position.y);
        for (let i = 0; i < this.points; ++i) {
            if (ratio >= i / this.points) this.render(i / this.points);
        }
        pop();
        return (frameCount - this.startFrame === this.animationFrame);
    }

    render(ratio) {
        push();
        fill(255, 10);
        circle(this.amplitude * sin((ratio + this.randomValue) * TWO_PI), - this.floatHeight * ratio, 2);
        pop();
    }
}