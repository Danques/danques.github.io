let posX, posY;
let commandStr = [];
const lineLeng = 4;
const interval = 1;

let x = 0;
let v = 1;
let a = 1;

function setup() {
    createCanvas(innerWidth, innerWidth);
    background(255);
    strokeWeight(1);
    colorMode(HSB);
    posX = 10;
    posY = 10;
    drawHilbert(floor(Math.log2(min(innerWidth, innerHeight) / lineLeng)), 0);
}

function draw() {
    for (let i = floor(x); i < floor(x + v) && i < commandStr.length; ++i) {
        stroke(i % 256, 255, 255);
        drawLine(commandStr[i]);
    }
    x += v;
    v += a;
}

function drawHilbert(n, dir) {
    if (n <= 0) return;
    drawHilbert(n - 1, 1 - dir);
    commandStr.push(dir + 2);
    drawHilbert(n - 1, dir);
    commandStr.push(3 - dir);
    drawHilbert(n - 1, dir);
    commandStr.push(dir);
    drawHilbert(n - 1, 3 - dir);
    return;
}

function drawLine(c) {
    c = c % 4;
    if (c < 0) c += 4;
    switch (c) {
        // up
        case 0:
            line(posX, posY, posX, posY - lineLeng);
            posY -= lineLeng;
            break;
        // left
        case 1:
            line(posX, posY, posX - lineLeng, posY);
            posX -= lineLeng;
            break;
        // down
        case 2:
            line(posX, posY, posX, posY + lineLeng);
            posY += lineLeng;
            break;
        // right
        case 3:
            line(posX, posY, posX + lineLeng, posY);
            posX += lineLeng;
            break;
    }
}