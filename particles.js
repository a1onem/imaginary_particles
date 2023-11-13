const fileInput = document.querySelector('input');
const link = document.querySelector('a');
const canvas = document.getElementById('canvas');

let buffer, ctx, img, data, iw, ih, renderer, scene, camera, geometry, winW, winH;

let url = 'img.png';
let particles, plenght;
let click = 0;
let mouse = {x:0, y:0};
let ww = 640;
let wh = 480;
let ww2 = ww/2, wh2 = wh/2;
let time_before = Date.now();
let start = true;
const scl = 100;

let v = {
    etype: 'spiral',
    e_rad: 900,

    instant: false,
    mode: 'both',
    res: [ww, wh],
    amount: '',

    psize: 6,
    divider: 3,
    red_ch: 255,
    green_ch: 255,
    blue_channel: 255,
    threshold: 0,
    bgcolor: '#1d2a34',

    frict: 0.67,
    pspeed: 66,

    bubble: true,
    bubble_rad: 70,
    bubble_acc: 1,

    text: 'Привет!',
    font: 'Comic Sans MS',
    fontw: 'bold',
    tcolor_fill: '#eefc0b',
    tcolor_str: '#ff0000',
    tsize: 8,
    tlineW: 2,
    tstyle: 'both',
    tx: 5,
    ty: 5,

    zoom: 1,

    browse: () => {
        fileInput.click();
    },

    help: () => {
        alert('Imaginary Particles by M.Marikhov (2017) :: Created with Three.js. Have fun!');
    },

    fullscr: () => {
        document.webkitFullscreenElement ? document.webkitCancelFullScreen() : document.documentElement.webkitRequestFullscreen();
    },

    export: () => {
        link.href = renderer.domElement.toDataURL();
        link.download = 'image.png';
        setTimeout(link.click(), 1000);
    },

    explode: () => {
        let p = plenght;
        if (click == 0) {
            while(p--) { particles[p].explode(p); }
            click = 1;
        } else {
            while(p--) { particles[p].implode(); }
            click = 0;
        }
    },
}

class Particle {

    constructor(x, y) {
        this.x = v.instant ? x : 0;
        this.y = v.instant ? y : 0;
        this.dest = {x: x, y: y};
        this.vx = 0;
        this.vy = 0;
        this.friction = Math.random() * 0.09;
    }

    render(p) {
        this.vx += (this.dest.x - this.x) / v.pspeed;
        this.vy += (this.dest.y - this.y) / v.pspeed;

        this.vx *= this.friction + v.frict;
        this.vy *= this.friction + v.frict;

        this.x += this.vx;
        this.y += this.vy;

        if (v.bubble) {

            let a = this.x - mouse.x;
            let b = this.y - mouse.y;

            let distance = Math.sqrt(a * a + b * b);

            if (distance < v.bubble_rad) {
                this.vx += a / v.bubble_acc;
                this.vy += b / v.bubble_acc;
            }
        }

        geometry.vertices[p].x = this.x, 
        geometry.vertices[p].y = this.y;
    }

    explode(p) {
        this.last_dest = {x:this.dest.x, y:this.dest.y}
        let angle = v.e_rad / plenght * p;

        if (v.etype == 'spiral') {
            this.dest.x = angle * Math.cos(angle);
            this.dest.y = angle * Math.sin(angle);
        }
        else if (v.etype == 'circle') {
            this.dest.x = v.e_rad * Math.cos(angle);
            this.dest.y = v.e_rad * Math.sin(angle);
        }
        else if (v.etype == 'cloud') {
            this.dest.y = -v.e_rad + Math.random() * (v.e_rad + v.e_rad + 1);
            let xMax = Math.pow(Math.pow(v.e_rad, 2) - Math.pow(this.dest.y, 2), 0.5);
            this.dest.x = Math.random() * 2 * xMax - xMax;
        }
    }

    implode() {
        this.dest.x = this.last_dest.x;
        this.dest.y = this.last_dest.y;
    }
}

function loadImage(url) {

    img = new Image();
    img.src = url;

    img.onload = () => {
        iw = img.width;
        ih = img.height;
        compose();
    }
}

function compose() {
    buffer.width = ww, buffer.height = wh;

    if (v.mode == 'image' || v.mode == 'both') {
        let ratio = Math.min(ww / iw, wh / ih);
        ctx.drawImage(img, 0, 0, iw, ih, (ww - iw * ratio) / 2, (wh - ih * ratio) / 2, iw * ratio, ih * ratio);
    }

    if (v.mode == 'text' || v.mode == 'both') {
        ctx.font = v.fontw + ' ' + ww * (v.tsize / scl) + 'px ' + v.font;
        if (v.tstyle == 'fill' || v.tstyle == 'both') {
            ctx.fillStyle = v.tcolor_fill;
            ctx.fillText(v.text, ww * (v.tx / scl), wh * ((v.ty + v.tsize) / scl));
        }
        if (v.tstyle == 'outline' || v.tstyle == 'both') {
            ctx.strokeStyle = v.tcolor_str;
            ctx.lineWidth = v.tlineW;
            ctx.strokeText(v.text, ww * (v.tx / scl), wh * ((v.ty + v.tsize) / scl));
        }
    }

    data = ctx.getImageData(0, 0, ww, wh).data;

    ctx.clearRect(0, 0, ww, wh);

    createParticles();
}

function createParticles() {

    click = 0;
    let thr = v.threshold * 7.64;

    while(scene.children.length > 0){
        scene.remove(scene.children[0]);
    }

    particles = new Array();

    geometry = new THREE.Geometry();

    material = new THREE.PointsMaterial({
        size: v.psize,
        vertexColors: THREE.VertexColors,
        sizeAttenuation: false
    });

   for (let i = 0; i < ww; i += v.divider) {
        for (let j = 0; j < wh; j += v.divider) {

            let index = (i + j * ww) * 4;
            let r = Math.max(data[index] - 255 + v.red_ch, 0);
            let g = Math.max(data[++index] - 255 + v.green_ch, 0);
            let b = Math.max(data[++index] - 255 + v.blue_channel, 0);
            let a = data[++index];
            let rgb ="#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);

            let vertex = new THREE.Vector3();

            vertex.x = i - ww2;
            vertex.y = -j + wh2;

            if (r + g + b >= thr && a > 0) {
                particles.push(new Particle(vertex.x, vertex.y));
                geometry.vertices.push(vertex);
                geometry.colors.push(new THREE.Color(rgb));
            }
        }
    }

    scene.add(new THREE.Points(geometry, material));

    plenght = particles.length;

    if(start) {
        requestAnimationFrame(update); 
        start = false;
    }
}

function update() {
    let time_now = Date.now();
    v.amount = plenght + ' / ' + Math.round(1000 / (time_now - time_before));
    time_before = time_now;
    let p = plenght;
    while(p--) { particles[p].render(p); }

    geometry.verticesNeedUpdate = true;
    renderer.render(scene, camera);
    requestAnimationFrame(update);
};

function readFile(file) {
    let reader = new FileReader();
    reader.onload = e => {
        url = e.target.result
        loadImage(url);
    };
    reader.readAsDataURL(file);
}

// EVENTS 

window.addEventListener('resize', e => {
    getInners();
    camera.left = winW / -2;
    camera.right = winW / 2;
    camera.top = winH / 2;
    camera.bottom = winH / -2;
    camera.updateProjectionMatrix();
});

canvas.addEventListener('click', v.explode);

canvas.addEventListener('mousemove', e => {
    mouse.x = (e.clientX- window.innerWidth/2) / v.zoom;
	mouse.y = -(e.clientY -window.innerHeight/2) / v.zoom;
});

canvas.addEventListener('mousewheel', e => {
    e.preventDefault();
    if(e.deltaY < 0 && v.zoom > 1) {
        v.zoom-=.1;
    } else if (e.deltaY > 0 && v.zoom < 10) {
        v.zoom+=.1;
    }
    setZoom();
})

window.addEventListener('dragover', e => {
    e.preventDefault();
}, true);

window.addEventListener('drop', e => {
    e.preventDefault();
    let file = e.dataTransfer.files[0];
    if(!file.type.match(/image.*/)){
        return;
    }
    readFile(file);
}, true);

fileInput.addEventListener('change', e => {
    let file = e.target.files[0];
    if(!file.type.match(/image.*/)){
        return;
    }
    readFile(file);
});

// GUI

function createGUI() {

    const gui = new dat.GUI({width: 265});
    gui.add(v, 'browse').name('Browse Image');
    gui.add(v, 'export').name('Export Image');
    gui.add(v, 'fullscr').name('Fullscreen');
    gui.add(v, 'help').name('About');

    const transition = gui.addFolder('TRANSITIONS');
    transition.open();

    transition.add(v, 'explode').name('EXPLODE!');

    transition.add(v, 'etype', ['spiral', 'circle', 'cloud']).name('Explode type');

    transition.add(v, 'e_rad', 100, 2000, 10).name('_radius');

    const imagecontrols = gui.addFolder('IMAGE');
    imagecontrols.open();

    imagecontrols.add(v, 'amount').name('Particles / FPS').listen();

    imagecontrols.add(v, 'instant').name('Instant update'); 

    imagecontrols.add(v, 'mode', ['image', 'text', 'both']).name('Mode')
    .onChange(() => {
        compose();
    });

    imagecontrols.add(v, 'res', {'1280x960':'1280,960', '1024x768':'1024,768', '800x600':'800,600', '640x480':'640,480', '512x384':'512,384', '320x240':'320,240'}).name('Resolution').
    onChange(value => {
        ww = value.split(',')[0];
        wh = value.split(',')[1];
        ww2 = ww/2, wh2 = wh/2;
        compose();
    });

    imagecontrols.add(v, 'divider', 1, 10, 1).name('Divider')
    .onFinishChange(() => {
        createParticles();
    });

    imagecontrols.add(v, 'psize', 1, 8, 1).name('Particle size')
    .onFinishChange(() => {
        createParticles();
    });

    imagecontrols.add(v, 'red_ch', 0, 255, 1).name('Red channel')
    .onFinishChange(() => {
        createParticles();
    });
    imagecontrols.add(v, 'green_ch', 0, 255, 1).name('Green channel')
    .onFinishChange(() => {
        createParticles();
    });
    imagecontrols.add(v, 'blue_channel', 0, 255, 1).name('Blue channel')
    .onFinishChange(() => {
        createParticles();
    });

    imagecontrols.add(v, 'threshold', 0, 100, 1).name('Threshold')
    .onFinishChange(() => {
        createParticles();
    });

    imagecontrols.addColor(v, 'bgcolor').name('Background color').
    onChange(() => {
        renderer.setClearColor(v.bgcolor);
    });

    const partcontrols = gui.addFolder('PARTICLES');

    partcontrols.add(v, 'pspeed', 1, 200, 1).name('Speed');

    partcontrols.add(v, 'frict', 0.10, 0.90, 0.01).name('Friction');


    const bubblecontrols = gui.addFolder('BUBBLE');

    bubblecontrols.add(v, 'bubble').name('Enable Bubble');

    bubblecontrols.add(v, 'bubble_rad', 10, 200, 10).name('Radius');

    bubblecontrols.add(v, 'bubble_acc', 0.1, 10, 0.1).name('Speed');

    const textcontrols = gui.addFolder('TEXT');

    textcontrols.add(v, 'text').name('Message')
    .onFinishChange(() => {
        compose();
    });

    textcontrols.add(v, 'font', ['Arial', 'Arial Black', 'Comic Sans MS', 'Courier New', 'Georgia', 'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Palatino Linotype', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana']).name('Font')
    .onChange(() => {
        compose();
    });

    textcontrols.add(v, 'fontw', ['normal', 'bold', 'italic']).name('Font weight')
    .onChange(() => {
        compose();
    });

    textcontrols.addColor(v, 'tcolor_fill').name('Fill color')
    .onFinishChange(() => {
        compose();
    });

    textcontrols.addColor(v, 'tcolor_str').name('Stroke color')
    .onFinishChange(() => {
        compose();
    });

    textcontrols.add(v, 'tsize', 5, 50, 1).name('Size')
    .onFinishChange(() => {
        compose();
    });

    textcontrols.add(v, 'tlineW', 1, 20, 1).name('Stroke width')
    .onFinishChange(() => {
        compose();
    });

    textcontrols.add(v, 'tstyle', ['fill', 'outline', 'both']).name('Style')
    .onChange(() => {
        compose();
    });

    textcontrols.add(v, 'tx', 0, 100, 1).name('X pos')
    .onFinishChange(() => {
        compose();
    });

    textcontrols.add(v, 'ty', 0, 100, 1).name('Y pos')
    .onFinishChange(() => {
        compose();
    });

    const camcontrols = gui.addFolder('CAMERA');

    camcontrols.add(v, 'zoom', 1, 10, 0.1).name('Zoom').listen()
    .onChange(() => {
        setZoom();
    });
}

function setZoom() {
    camera.zoom = v.zoom;
    camera.updateProjectionMatrix();
}

function getInners() {
    winW = window.innerWidth;
    winH = window.innerHeight;
    renderer.setSize(winW, winH);
}

function setup() {

    buffer = document.createElement('canvas');
    ctx = buffer.getContext('2d');

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById("canvas"),
        antialias: true,
        preserveDrawingBuffer: true
    });
    renderer.setClearColor(v.bgcolor);
    getInners();
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(winW / - 2, winW / 2, winH / 2,  winH / - 2, 0, 1);
    setZoom();
}

setup();
createGUI();
loadImage(url);