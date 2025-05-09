let waveShader;

function preload() {
    mengerShader = loadShader("./twisting.vert", "./twisting.frag");
}

function setup() {
    createCanvas(512, 512, WEBGL).parent("canvas-container");
    pixelDensity(1.);
    noStroke();
}
function draw() {
    shader(mengerShader);
    mengerShader.setUniform('u_time', millis() / 1000);
    mengerShader.setUniform('u_resolution', [width, height]);
    mengerShader.setUniform('u_mouse', [mouseX, mouseY]);
    rect(0, 0, width, height);
    resetShader();
}
function windowResized() {
    resizeCanvas(512, 512, WEBGL);
}