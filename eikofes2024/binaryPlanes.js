import * as THREE from "three";

import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

checkOpenCVLoaded();
function checkOpenCVLoaded() {
    if (typeof cv !== 'undefined') {
        cv['onRuntimeInitialized'] = () => {
            const loadingMessage = document.getElementById('loadingMessage');
            loadingMessage.parentNode.removeChild(loadingMessage);
            onAllLoaded();
        };
    } else {
        setTimeout(checkOpenCVLoaded, 100);
    }
}

function onAllLoaded() {
    const planeLength = 4;
    const brightnessThreshold = 0.5;
    const pixelRatio = Math.min(2, window.devicePixelRatio);

    let frameCount = 0;
    let mouseSquareX = 0, mouseSquareY = 0;
    let rotateX = 0, rotateY = 0;
    let touchStartX = 0, touchStartY = 0;

    let keyboard = {};
    const planeMaterials = [];
    const dependOnCanvas = [];
    const nonBloomObjects = [];
    const nonBloomMaterials = [];

    const basicVertexShader = `
    precision mediump float;
    uniform mat4 projectionMatrix;
    uniform mat4 viewMatrix;
    uniform mat4 modelMatrix;

    attribute vec2 uv;
    attribute vec3 position;

    varying vec2 vUV;

    void main(){
        vUV = uv;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
    }`;

    const blackTexture = new THREE.Texture();

    const allClock = new THREE.Clock();

    // init renderer
    const initWidth = window.innerWidth;
    const initHeight = window.innerHeight;
    const renderCanvas = document.getElementById("renderCanvas");
    const renderer = new THREE.WebGLRenderer({
        canvas: renderCanvas
    });
    renderer.setSize(initWidth, initHeight);
    renderer.setPixelRatio(pixelRatio);

    // init scene and camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, initWidth / initHeight, 0.1, 100);
    camera.position.set(0, 0, 10);

    // background
    /*
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const hdriLoader = new RGBELoader();
    let envMap;
    hdriLoader.load('./binaryPlanesImages/hdr_back/CloudedSunGlow4k.hdr', function (texture) {
        envMap = pmremGenerator.fromEquirectangular(texture).texture;
        texture.exposure = 1;
        scene.environment = envMap;
        scene.background = envMap;
    }, undefined, function (error) {
        console.log(error)
    });
    */

    // add light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    scene.add(directionalLight);

    // render pass
    const renderScene = new RenderPass(scene, camera);

    // bloom pass
    const bloomParams = {
        threshold: 0,
        strength: 1.2,
        radius: 0,
        exposure: 1
    };
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(initWidth, initHeight),
        bloomParams.strength,
        bloomParams.radius,
        bloomParams.threshold,
    );

    // output pass
    const outputPass = new OutputPass();
    outputPass.renderToScreen = true;

    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.setPixelRatio(pixelRatio);
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);
    bloomComposer.addPass(outputPass);

    // integration pass
    const integrationPass = new ShaderPass(
        new THREE.RawShaderMaterial({
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: bloomComposer.renderTarget2.texture }
            },
            vertexShader: basicVertexShader,
            fragmentShader: `
            precision mediump float;
            uniform sampler2D baseTexture;
            uniform sampler2D bloomTexture;
            varying vec2 vUV;

            void main() {
                gl_FragColor = ( texture2D( baseTexture, vUV ) + vec4( 1.0 ) * texture2D( bloomTexture, vUV ) );
            }
            `,
            defines: {}
        }), "baseTexture"
    );
    integrationPass.needsSwap = true;

    const finalComposer = new EffectComposer(renderer);
    finalComposer.setPixelRatio(pixelRatio);
    finalComposer.addPass(renderScene);
    finalComposer.addPass(integrationPass);
    finalComposer.addPass(outputPass);

    // badapple video
    const badappleVideo = document.createElement('video');
    badappleVideo.src = './binaryPlanesImages/badapple.mp4';
    badappleVideo.muted = true;
    badappleVideo.loop = true;
    badappleVideo.preload = 'auto';

    // badapple video frame
    const videoCanvas = document.createElement('canvas');
    const videoCanvasContext = videoCanvas.getContext('2d', { willReadFrequently: true });
    videoCanvas.width = 512;
    videoCanvas.height = 512;

    // badapple video texture
    const badappleTexture = new THREE.VideoTexture(badappleVideo);
    badappleTexture.minFilter = THREE.LinearFilter;
    badappleTexture.magFilter = THREE.LinearFilter;
    badappleTexture.format = THREE.RGBAFormat;

    createFloorPlane();

    const wavePlane = new shaderPlane(new THREE.Vector3(0, 0, 0), planeLength, null, "wave");
    const dotNoisePlane = new shaderPlane(new THREE.Vector3(-4, 0, -8), planeLength, badappleTexture, "dotNoiseBadapple");
    const convexPlane = new shaderPlane(new THREE.Vector3(4, 0, -8), planeLength, badappleTexture, "convexBadapple");
    const layerBadappleBlack = new shaderPlane(new THREE.Vector3(0, 0, -16.5), planeLength, badappleTexture, "layerBadappleBlack");
    const layerBadappleWhite = new shaderPlane(new THREE.Vector3(0, 0, -15.5), planeLength, badappleTexture, "layerBadappleWhite");

    const videoParticlePlane = new particlePlane(new THREE.Vector3(8, 0, -16), planeLength);
    const videoVectorScan = new vectorScan(new THREE.Vector3(-8, 0, -16), planeLength, 0.01);

    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('mousemove', onMouseMove);

    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    tick();

    function tick() {
        requestAnimationFrame(tick);
        updateScene();
        const blackMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.DoubleSide,
            transparent: true
        });
        for (let i = 0; i < nonBloomObjects.length; ++i) {
            nonBloomObjects[i].material = blackMaterial;
        }
        scene.background = 0x000000;
        scene.environment = blackTexture;
        bloomComposer.render();
        for (let i = 0; i < nonBloomObjects.length; ++i) {
            nonBloomObjects[i].material = nonBloomMaterials[i];
        }
        scene.environment = envMap;
        scene.background = envMap;
        finalComposer.render();
    }

    function updateScene() {
        // update u_time
        for (let i = 0; i < planeMaterials.length; ++i) {
            planeMaterials[i].uniforms.u_time.value = allClock.getElapsedTime();
        }

        // update a videoCanvas frame
        videoCanvasContext.drawImage(badappleVideo, 0, 0, videoCanvas.width, videoCanvas.height);

        // update dependOnCanvasss
        for (let i = 0; i < dependOnCanvas.length; ++i) {
            dependOnCanvas[i].dispose();
            dependOnCanvas[i].create();
        }

        // mouse FPS
        let lookdir = new THREE.Vector3(0, 0, -1);
        lookdir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotateX);
        let lookdir_orthogonal = new THREE.Vector3();
        lookdir_orthogonal.crossVectors(lookdir, new THREE.Vector3(0, 1, 0));
        lookdir_orthogonal.normalize();
        lookdir.applyAxisAngle(lookdir_orthogonal, -rotateY);
        camera.lookAt(camera.position.clone().add(lookdir));

        // key input
        let keyMovingSpeed = 0.1;
        if (keyboard["Shift"]) {
            keyMovingSpeed = 2.0;
        }
        // W key
        if (keyboard["w"] || keyboard["ArrowUp"]) {
            camera.position.x += keyMovingSpeed * lookdir.x;
            camera.position.z += keyMovingSpeed * lookdir.z;
        }
        // S key
        if (keyboard["s"] || keyboard["ArrowDown"]) {
            camera.position.x -= keyMovingSpeed * lookdir.x;
            camera.position.z -= keyMovingSpeed * lookdir.z;
        }
        // D key
        if (keyboard["d"] || keyboard["ArrowRight"]) {
            camera.position.x += keyMovingSpeed * lookdir_orthogonal.x;
            camera.position.z += keyMovingSpeed * lookdir_orthogonal.z;
        }
        // A key
        if (keyboard["a"] || keyboard["ArrowLeft"]) {
            camera.position.x -= keyMovingSpeed * lookdir_orthogonal.x;
            camera.position.z -= keyMovingSpeed * lookdir_orthogonal.z;
        }
    }

    function createFloorPlane() {
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.5,
            side: THREE.DoubleSide
        })
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.rotation.x = Math.PI / 2;
        floorMesh.position.set(0, -2, 0);
        scene.add(floorMesh);
        nonBloomObjects.push(floorMesh);
        nonBloomMaterials.push(floorMaterial);
    }

    function onWindowBlur() {
        for (let key in keyboard) {
            keyboard[key] = false;
        }
    }

    function keyDown(event) {
        badappleVideo.play();
        keyboard[event.key] = true;
    }

    function keyUp(event) {
        keyboard[event.key] = false;
    }

    function onMouseMove(event) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        mouseSquareX = (event.clientX * 2.0 - width) / Math.min(width, height);
        mouseSquareY = (event.clientY * 2.0 - height) / Math.min(width, height);
        for (let i = 0; i < planeMaterials.length; ++i) {
            planeMaterials[i].uniforms.u_mouse.value = new THREE.Vector2(mouseSquareX, mouseSquareY);
        }

        let movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        let movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        const mouseSensitivity = 10.0;
        movementX /= width;
        movementY /= height;
        movementX *= mouseSensitivity;
        movementY *= mouseSensitivity;
        // E key
        if (keyboard["e"]) {
            rotateX += movementX;
            if (Math.abs(rotateY + movementY) <= Math.PI * 0.25) rotateY += movementY;
        }
    }

    function onTouchStart(event) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        mouseSquareX = (event.touches[0].clientX * 2.0 - width) / Math.min(width, height);
        mouseSquareY = (event.touches[0].clientY * 2.0 - height) / Math.min(width, height);
        for (let i = 0; i < planeMaterials.length; ++i) {
            planeMaterials[i].uniforms.u_mouse.value = new THREE.Vector2(mouseSquareX, mouseSquareY);
        }

        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
    }

    function onTouchMove(event) {
        if (event.touches.length == 1) {
            const width = window.innerWidth;
            const height = window.innerHeight;
            mouseSquareX = (event.touches[0].clientX * 2.0 - width) / Math.min(width, height);
            mouseSquareY = (event.touches[0].clientY * 2.0 - height) / Math.min(width, height);
            for (let i = 0; i < planeMaterials.length; ++i) {
                planeMaterials[i].uniforms.u_mouse.value = new THREE.Vector2(mouseSquareX, mouseSquareY);
            }
            let movementX = event.touches[0].clientX - touchStartX;
            let movementY = event.touches[0].clientY - touchStartY;
            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;

            const touchSensitivity = 10.0;
            movementX /= width;
            movementY /= height;
            movementX *= touchSensitivity;
            movementY *= touchSensitivity;
            rotateX += movementX;
            if (Math.abs(rotateY + movementY) <= Math.PI * 0.25) rotateY += movementY;
        }
    }

    function onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        bloomComposer.setSize(width, height);
        finalComposer.setSize(width, height);
    }

    function shaderPlane(position, length, texture, name) {
        this.position = position;
        this.length = length;
        this.texture = texture;
        this.name = name;
        this.create = function () {
            const uniforms = {
                u_time: { type: "f", value: 0.0 },
                u_mouse: { type: "v2", value: new THREE.Vector2(mouseSquareX, mouseSquareY) },
                texture: { type: "t", value: this.texture },
                threshold: { type: "f", value: brightnessThreshold }
            };

            fetch(`./shaders/vertex/${this.name}.vert`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.text();
                })
                .then(vertexShaderText => {
                    fetch(`./shaders/fragment/${this.name}.frag`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Network response was not ok');
                            }
                            return response.text();
                        })
                        .then(fragmentShaderText => {
                            const material = new THREE.RawShaderMaterial({
                                uniforms: uniforms,
                                vertexShader: vertexShaderText,
                                fragmentShader: fragmentShaderText,
                                side: THREE.DoubleSide,
                                transparent: true
                            });
                            planeMaterials.push(material);
                            const planeMesh = new THREE.Mesh(
                                new THREE.PlaneGeometry(this.length, this.length, 64, 64),
                                material
                            );
                            planeMesh.position.set(this.position.x, this.position.y, this.position.z);
                            scene.add(planeMesh);

                            nonBloomObjects.push(planeMesh);
                            nonBloomMaterials.push(material);
                        })
                        .catch(error => {
                            console.error('There was a problem with the fetch operation:', error);
                        });
                })
                .catch(error => {
                    console.error('There was a problem with the fetch operation:', error);
                });
        }
        this.create();
    }

    function particlePlane(position, length) {
        this.position = position;
        this.length = length;
        this.object = null;
        this.create = function () {
            const length = this.length / 2;
            const pointsNumber = 2000;
            const vertices = [];
            for (let i = 0; i < pointsNumber; i++) {
                let x = Math.random();
                let y = Math.random();
                const pixelData = videoCanvasContext.getImageData(Math.floor(x * videoCanvas.width), Math.floor((1 - y) * videoCanvas.height), 1, 1).data;
                const pixelValue = Math.max(pixelData[0], pixelData[1], pixelData[2]) / 255;
                if (pixelValue >= brightnessThreshold) {
                    x = 2 * x - 1;
                    y = 2 * y - 1;
                    vertices.push(this.position.x + length * x, this.position.y + length * y, this.position.z);
                }
            }
            const pointsGeometry = new THREE.BufferGeometry();
            pointsGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
            pointsGeometry.setAttribute('id', new THREE.BufferAttribute(new Float32Array(Array.from({ length: pointsNumber }, (_, index) => index)), 1))
            const pointsMaterial = new THREE.RawShaderMaterial({
                uniforms: {
                    color: { value: new THREE.Color(0xe4991b) }
                },
                vertexShader: `
                precision mediump float;
                uniform mat4 projectionMatrix;
                uniform mat4 viewMatrix;
                uniform mat4 modelMatrix;
    
                attribute vec3 position;
                attribute float id;
            
                varying float vID;
            
                void main(){
                    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
                    gl_PointSize = 5.0;
                    vID = id;
                }`,
                fragmentShader: `
                precision mediump float;
                uniform vec3 color;
    
                varying float vID;
        
                void main() {
                    vec2 p = gl_PointCoord.xy;
                    
                    float val = (mod(vID, 4.0) <= 2.0) ? step(p.x, p.y) : step(1.0, p.x + p.y);
                    val = (mod(vID, 2.0) <= 1.0) ? val : 1.0 - val;
                    gl_FragColor = vec4(color, val);
                }
                `,
                transparent: true,
                vertexColors: true,
                side: THREE.DoubleSide
            });
            this.object = new THREE.Points(pointsGeometry, pointsMaterial);
            scene.add(this.object);
        }
        this.dispose = function () {
            this.object.geometry.dispose();
            this.object.material.dispose();
            scene.remove(this.object);
        }
        this.create();
        dependOnCanvas.push(this);
    }

    function vectorScan(position, length, bold) {
        this.position = position;
        this.length = length;
        this.bold = bold;
        this.object = null;
        this.create = function () {
            const length = this.length / 2;
            const frameData = videoCanvasContext.getImageData(0, 0, videoCanvas.width, videoCanvas.height);
            const inputImage = cv.matFromImageData(frameData);
            cv.cvtColor(inputImage, inputImage, cv.COLOR_RGBA2GRAY, 0);
            const maxValue = 255;
            cv.threshold(inputImage, inputImage, Math.floor(maxValue * brightnessThreshold), maxValue, cv.THRESH_BINARY);
            let contours = new cv.MatVector();
            let hierarchy = new cv.Mat();
            cv.findContours(inputImage, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_TC89_KCOS);

            const lineGeometry = new THREE.BufferGeometry();
            const vertices = [];
            const indices = [];
            let verticesCount = 0;
            for (let i = 0; i < contours.size(); ++i) {
                const contour = contours.get(i);
                const approx = new cv.Mat();
                cv.approxPolyDP(contour, approx, 0.0015 * cv.arcLength(contour, true), true);

                const endPoints = [];
                for (let j = 0; j < approx.rows; ++j) {
                    const xRatio = (approx.data32S[j * 2] * 2 - videoCanvas.width) / videoCanvas.width;
                    const yRatio = (videoCanvas.height - approx.data32S[j * 2 + 1] * 2) / videoCanvas.height;
                    endPoints.push(new THREE.Vector2(this.position.x + xRatio * length, this.position.y + yRatio * length));
                }
                for (let j = 0; j < approx.rows; ++j) {
                    const prevj = (j - 1 + approx.rows) % approx.rows;
                    const nextj = (j + 1) % approx.rows;
                    const lineNormalPrev = new THREE.Vector2(endPoints[j].y - endPoints[prevj].y, endPoints[prevj].x - endPoints[j].x).normalize();
                    const lineNormalNext = new THREE.Vector2(endPoints[nextj].y - endPoints[j].y, endPoints[j].x - endPoints[nextj].x).normalize();
                    const lineNormal = lineNormalPrev.clone().add(lineNormalNext).multiplyScalar(0.5 * this.bold);
                    vertices.push(endPoints[j].x + lineNormal.x, endPoints[j].y + lineNormal.y, this.position.z);
                    vertices.push(endPoints[j].x - lineNormal.x, endPoints[j].y - lineNormal.y, this.position.z);
                }
                for (let j = 0; j < approx.rows; ++j) {
                    const nextj = (j + 1) % approx.rows;
                    indices.push(verticesCount + j * 2, verticesCount + j * 2 + 1, verticesCount + nextj * 2);
                    indices.push(verticesCount + j * 2 + 1, verticesCount + nextj * 2 + 1, verticesCount + nextj * 2);
                }
                verticesCount += approx.rows * 2;
                approx.delete();
                contour.delete();
            }
            hierarchy.delete();
            contours.delete();
            inputImage.delete();

            lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
            lineGeometry.setIndex(indices);
            const lineMaterial = new THREE.MeshBasicMaterial({
                color: 0xd94700,
                side: THREE.DoubleSide,
                transparent: true
            });
            this.object = new THREE.Mesh(lineGeometry, lineMaterial);
            scene.add(this.object);
        }
        this.dispose = function () {
            this.object.geometry.dispose();
            this.object.material.dispose();
            scene.remove(this.object);
        }
        this.create();
        dependOnCanvas.push(this);
    }
}