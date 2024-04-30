let flock;
let bubbles;
let sinwave;
let ownFishPosX, ownFishPosY;
let leaveCount = 0;
let adjustedTextSize;

let notoSansFont;

let lowTextFlag = false;
let crushedFlag = false;

const ownFishSize = 20;
const ownFishHeight = ownFishSize / 2 / Math.sqrt(3);

function preload() {
    notoSansFont = loadFont("../fonts/NotoSansJP-Thin.ttf");
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(50);
    flock = new Flock();
    bubbles = new Bubbles();
    sinwave = new sinWave();
    ownFishPosX = width / 2;
    ownFishPosY = height / 2;
    textFont(notoSansFont);
}

function draw() {
    adjustedTextSize = min(32, floor(32 * width / 800));
    background(50);
    if (!crushedFlag) {
        bubbles.run();
        sinwave.run();
        updateOwnFishPos();
        if (frameCount % 10 === 0) {
            const bubbleX = width * random(0, 1);
            const bubbleY = height / 2 + height / 2 * random(0, 1);
            bubbles.add(new Bubble(bubbleX, bubbleY, frameCount));
        }
        if (frameCount % 30 === 0) {
            const sinPlotX = width * random(0, 1);
            sinwave.add(new sinPlot(sinPlotX, height, frameCount));
        }

        if (frameCount % 10 === 0) flock.lifegame();
        flock.run();
        drawOwnFish(20);
    }

    drawLeaveText();
    drawExplainText();
    if (!crushedFlag) {
        if (height <= 60) {
            background(50);
            drawLowText();
            lowTextFlag = true;
            document.title = 'ㅤ';
            return;
        }
        if (height >= 60 && lowTextFlag) {
            crushedFlag = true;
            document.title = '虚無';
        }
    }
}

function drawLeaveText() {
    push();
    blendMode(EXCLUSION);
    noStroke();
    fill(255);
    textSize(adjustedTextSize);
    textAlign(CENTER, TOP);
    if (!crushedFlag) {
        text(`累計 ${leaveCount} 匹がいなくなりました。`, width / 2, 0);
    } else {
        text(`みんながいなくなりました。`, width / 2, 0);
    }
    pop();
}

function drawExplainText() {
    push();
    blendMode(EXCLUSION);
    noStroke();
    fill(255);
    textSize(adjustedTextSize);
    textAlign(LEFT, BOTTOM);
    text(`ＷＡＳＤであおざかなを動かして、みだす\nマウスを押したままで動かして、うみだす`, 0, height);
    pop();
}

function drawLowText() {
    push();
    noStroke();
    fill(255);
    textSize(adjustedTextSize);
    textAlign(CENTER, TOP);
    text(`おさかなをつぶしても良いの？`, width / 2, 0);
    pop();
}

function drawOwnFish() {
    push();
    translate(ownFishPosX, ownFishPosY);
    push();
    textSize(32);
    textAlign(CENTER, CENTER);
    noStroke();
    fill("#74b4fc");
    text("You", 0, -50);
    pop();
    push();
    noFill();
    stroke("#74b4fc");
    strokeWeight(1);
    rotate(atan2(mouseY - ownFishPosY, mouseX - ownFishPosX) - HALF_PI);
    circle(0, 2 * ownFishHeight, ownFishSize / 4);
    beginShape();
    vertex(0, ownFishHeight * 4);
    vertex(-ownFishSize / 2, ownFishHeight);
    vertex(ownFishSize / 2, -ownFishHeight * 4);
    vertex(-ownFishSize / 2, -ownFishHeight * 4);
    vertex(ownFishSize / 2, ownFishHeight);
    endShape(CLOSE);
    pop();
    pop();
}

function updateOwnFishPos() {
    const moveValue = 5;
    if (keyIsDown(87) || keyIsDown(38)) ownFishPosY -= moveValue;
    if (keyIsDown(65) || keyIsDown(37)) ownFishPosX -= moveValue;
    if (keyIsDown(83) || keyIsDown(40)) ownFishPosY += moveValue;
    if (keyIsDown(68) || keyIsDown(39)) ownFishPosX += moveValue;
    if (ownFishPosX < -ownFishSize / 2) ownFishPosX = (ownFishPosX + width) % width;
    if (ownFishPosY < -ownFishHeight * 4) ownFishPosY = (ownFishPosY + height) % height;
    if (ownFishPosX > width + ownFishSize / 2) ownFishPosX = ownFishPosX % width;
    if (ownFishPosY > height + ownFishHeight * 4) ownFishPosY = ownFishPosY % height;
}

function drawDebugGrid() {
    for (let x = 0; x <= width; x += flock.sectionSize) {
        for (let y = 0; y <= height; y += flock.sectionSize) {
            push();
            stroke(255, 127);
            strokeWeight(1);
            line(x, y, x + flock.sectionSize, y);
            line(x, y, x, y + flock.sectionSize);
            pop();
        }
    }
}

function mousePressed() {
    flock.add(new Boid(mouseX, mouseY));
}

function mouseDragged() {
    flock.add(new Boid(mouseX, mouseY));
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    background(50);
    ownFishPosX = width / 2;
    ownFishPosY = height / 2;
}