class Bubble {
    constructor(x, y, startFrame) {
        this.position = createVector(x, y);
        this.startFrame = startFrame;
        this.maxRadius = 20 + 50 * random(0, 1);
        this.floatHeight = 100 + 75 * random(0, 1);
        this.animationFrame = Math.floor(120 + 180 * random(0, 1));
        this.randomValue = random(0, 1);
    }

    run(_) {
        const ratio = (frameCount - this.startFrame) / this.animationFrame;
        push();
        noFill();
        strokeWeight(1);
        translate(this.position.x, this.position.y);
        if (ratio >= 1 / 3) this.render(1 / 3);
        if (ratio >= 2 / 3) this.render(2 / 3);
        this.render(ratio);
        pop();
        return (frameCount - this.startFrame === this.animationFrame);
    }

    render(ratio) {
        const minRadius = 5;
        const shakeLength = 5;
        push();
        stroke(255, floor(20 * ratio));
        circle(shakeLength * sin(ratio * TWO_PI + this.randomValue * TWO_PI), - this.floatHeight * ratio, minRadius + (this.maxRadius - minRadius) * ratio);
        pop();
    }
}