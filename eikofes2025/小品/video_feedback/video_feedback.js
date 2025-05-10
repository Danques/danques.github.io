let cam;
let input;

const cam_defwidth = 1280;
const cam_defheight = 720;
let dur_time = 150;
let cam_width, cam_height;
let init;
let iter_st = 0, iter_lt = 0;
let sentences = ["You know about me? ", "My name is Danques! ", "I"];

function update_value() {
    dur_time = input.value();
}

let notoSans;
function preload() {
    notoSans = loadFont('./NotoSansJP-ExtraBold.ttf');
}
function setup() {
    createCanvas(windowWidth, windowHeight);
    cam = createCapture(VIDEO);
    let ratio = min(width / cam_defwidth, height / cam_defheight);
    cam_width = cam_defwidth * ratio;
    cam_height = cam_defheight * ratio;
    cam.size(cam_width, cam_height);
    cam.hide();
    fill(255);
    textFont(notoSans);
    textSize(500);
    textAlign(CENTER, CENTER);
    input = createInput();
    input.size(30);
    input.position(10, 10);
    input.input(update_value);
    init = millis();
}

function draw() {
    background(255);
    push();
    translate(width / 2, height / 2);
    imageMode(CENTER);
    image(cam, 0, 0, cam_width, cam_height);
    if (millis() - init <= dur_time) {
        let tim = millis() / 1000;
        text(sentences[iter_st][iter_lt],0, 0);
    } else {
        init = millis();
        if (iter_lt + 1 >= sentences[iter_st].length) {
            iter_st = (iter_st + 1) % sentences.length;
            iter_lt = 0;
        } else {
            iter_lt++;
        }
    }
    pop();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    let ratio = min(width / cam_defwidth, height / cam_defheight);
    cam_width = cam_defwidth * ratio;
    cam_height = cam_defheight * ratio;
    cam.size(cam_width, cam_height);
}
