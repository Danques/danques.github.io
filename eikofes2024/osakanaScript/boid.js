class Boid {
    constructor(x, y) {
        this.acceleration = createVector(0, 0);
        this.velocity = createVector(random(-1, 1), random(-1, 1));
        this.position = createVector(x, y);

        this.size = 10;
        this.maxSpeed = 3;
        this.maxForce = 0.08;
        this.neighborDist = 50;
        this.desiredSeparation = 40;
    }

    run(boids) {
        this.calcForce(boids);
        this.update();
        this.render();
        return this.borders();
    }

    applyForce(force) {
        this.acceleration.add(force);
    }

    calcForce(boids) {
        let sep = this.separate(boids);
        let ali = this.align(boids);
        let coh = this.cohesion(boids);
        let avd = this.avoid();
        sep.mult(1.5);
        ali.mult(1.2);
        coh.mult(1.5);
        avd.mult(6.0);
        if (random(0, 1) >= 0.1) {
            this.applyForce(sep);
            this.applyForce(ali);
            this.applyForce(coh);
        }
        this.applyForce(avd);
    }

    update() {
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.mult(0);
    }

    seek(target) {
        let desired = p5.Vector.sub(target, this.position);
        desired.normalize();
        desired.mult(this.maxSpeed);
        let steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(this.maxForce);
        return steer;
    }

    render() {
        const triangleHeight = this.size / 2 / Math.sqrt(3);
        let theta = this.velocity.heading() + radians(-90);
        push();
        noFill();
        stroke(255);
        strokeWeight(1);
        translate(this.position.x, this.position.y);
        rotate(theta);
        beginShape();
        vertex(0, triangleHeight * 4);
        vertex(-this.size / 2, triangleHeight);
        vertex(this.size / 2, -triangleHeight * 4);
        vertex(-this.size / 2, -triangleHeight * 4);
        vertex(this.size / 2, triangleHeight);
        endShape(CLOSE);
        pop();
    }

    borders() {
        const triangleHeight = this.size / 2 / Math.sqrt(3);
        let flag = false;
        flag ||= (this.position.x < -this.size / 2);
        flag ||= (this.position.y < -triangleHeight * 4);
        flag ||= (this.position.x > width + this.size / 2);
        flag ||= (this.position.y > height + triangleHeight * 4);
        return flag;
    }

    separate(boids) {
        let steer = createVector(0, 0);
        let count = 0;
        for (let boid of boids) {
            let d = p5.Vector.dist(this.position, boid.position);
            if (d > 0 && d < this.desiredSeparation) {
                let diff = p5.Vector.sub(this.position, boid.position);
                diff.normalize();
                diff.div(d);
                steer.add(diff);
                count++;
            }
        }
        if (count > 0) {
            steer.div(count);
        }

        if (steer.mag() > 0) {
            steer.normalize();
            steer.mult(this.maxSpeed);
            steer.sub(this.velocity);
            steer.limit(this.maxForce);
        }
        return steer;
    }

    align(boids) {
        let sum = createVector(0, 0);
        let count = 0;
        for (let boid of boids) {
            let d = p5.Vector.dist(this.position, boid.position);
            if (d > 0 && d < this.neighborDist) {
                sum.add(boid.velocity);
                count++;
            }
        }
        if (count > 0) {
            sum.div(count);
            sum.normalize();
            sum.mult(this.maxSpeed);
            let steer = p5.Vector.sub(sum, this.velocity);
            steer.limit(this.maxForce);
            return steer;
        }
        else {
            return createVector(0, 0);
        }
    }

    cohesion(boids) {
        let sum = createVector(0, 0);
        let count = 0;
        for (let boid of boids) {
            let d = p5.Vector.dist(this.position, boid.position);
            if (d > 0 && d < this.neighborDist) {
                sum.add(boid.position);
                count++;
            }
        }
        if (count > 0) {
            sum.div(count);
            return this.seek(sum);
        }
        else {
            return createVector(0, 0);
        }
    }

    avoid() {
        let fishPos = createVector(ownFishPosX, ownFishPosY);
        let dist = p5.Vector.dist(this.position, fishPos);
        fishPos.sub(this.position);
        fishPos.normalize();
        fishPos.mult(-1 / Math.exp(dist / 10.0));
        return fishPos;
    }
}