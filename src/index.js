import { ssam } from "ssam";
import {
  Mesh,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
  MeshBasicMaterial,
  DoubleSide,
  Vector2,
  Vector3,
  PerspectiveCamera,
  ShaderMaterial,
  OrthographicCamera,
  BoxGeometry,
  Camera,
  DataTexture,
  WebGLRenderTarget,
  NearestFilter,
  RGBAFormat,
  FloatType,
  SphereGeometry,
  AmbientLight,
  DirectionalLight,
  PointLight,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import baseVert from "./shaders/base.vert";
import baseFrag from "./shaders/base.frag";

const sketch = ({ wrap, canvas, width, height, pixelRatio }) => {
  // rendere
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0xffffff, 1);

  const gridMax = 100; // Define the size of the grid
  const cellSize = 1; // Define the size of each cell

  // scene
  const scene = new Scene();
  // camera
  const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 2;

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  // controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  // controls.dampingFactor = 0.25;
  // controls.screenSpacePanning = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.0;

  // const geometry = new BoxGeometry(cellSize, cellSize, cellSize);
  // const uniforms = {
  //   resolution: { value: new Vector2(width, height) },
  //   time: { value: 0.0 },
  // };

  // Create a sphere geometry
  const sphereGeometry = new SphereGeometry(1, 32, 32);

  // Shader material setup
  const shaderMaterial = new ShaderMaterial({
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D currentState;
        varying vec2 vUv;
        void main() {
            float state = texture2D(currentState, vUv).r;
            gl_FragColor = vec4(vec3(state), 1.0);
        }
    `,
    uniforms: {
      currentState: { value: null },
    },
  });

  const gameOfLifeMaterial = new ShaderMaterial({
    uniforms: {
      inputTexture: { value: null },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D inputTexture;
      varying vec2 vUv;
  
      void main() {
        float width = float(textureSize(inputTexture, 0).x);
        float height = float(textureSize(inputTexture, 0).y);
        vec2 onePixel = vec2(1.0 / width, 1.0 / height);
  
        int alive = 0;
        for(int dx = -1; dx <= 1; dx++) {
          for(int dy = -1; dy <= 1; dy++) {
            if(dx == 0 && dy == 0) continue;
            vec2 neighborUv = vUv + vec2(float(dx), float(dy)) * onePixel;
            // Handle wrapping
            neighborUv.x = mod(neighborUv.x, 1.0);
            neighborUv.y = mod(neighborUv.y, 1.0);
            alive += int(texture(inputTexture, neighborUv).r > 0.5);
          }
        }
        float current = texture(inputTexture, vUv).r;
        float nextState = current;
        if(current > 0.5) { // Alive
          nextState = (alive == 2 || alive == 3) ? 1.0 : 0.2;
        } else { // Dead
          nextState = (alive == 3) ? 1.0 : 0.5;
        }
        gl_FragColor = vec4(nextState, nextState, nextState, 1);
      }
    `,
    // side: DoubleSide,
    // wireframe: true,
    precision: "highp",
  });

  const boxgeometry = new BoxGeometry(2, 2, 2);
  // Create a mesh with the sphere geometry and shader material
  const boxy = new Mesh(boxgeometry, gameOfLifeMaterial);
  const sphere = new Mesh(sphereGeometry, gameOfLifeMaterial);
  scene.add(sphere);
  scene.add(boxy);
  boxy.position.set(5, 2, 5);

  // Texture setup for storing the state
  const gridSize = 256;
  const data = new Float32Array(gridSize * gridSize * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.random() > 0.5 ? 1.0 : 0;
  }
  let textureA = new DataTexture(data, gridSize, gridSize, RGBAFormat, FloatType);
  textureA.needsUpdate = true;

  let textureB = new DataTexture(data, gridSize, gridSize, RGBAFormat, FloatType);
  textureB.needsUpdate = true;

  // shaderMaterial.uniforms.currentState.value = textureA;

  const webglW = 1024;
  const webglH = 2048;
  const targetA = new WebGLRenderTarget(256, 256, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    format: RGBAFormat,
    type: FloatType,
    depthBuffer: false,
  });

  const targetB = new WebGLRenderTarget(256, 256, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    format: RGBAFormat,
    type: FloatType,
    depthBuffer: false,
  });

  let readBuffer = targetA;
  let writeBuffer = targetB;

  readBuffer.texture = textureA;
  writeBuffer.texture = textureB;

  // works like the animate function in threejs
  wrap.render = ({ playhead }) => {
    // Swap the buffers
    let temp = readBuffer;
    readBuffer = writeBuffer;
    writeBuffer = temp;
    // Set input texture for shader
    gameOfLifeMaterial.uniforms.inputTexture.value = readBuffer.texture;
    renderer.setRenderTarget(writeBuffer);
    renderer.render(scene, camera);

    // // Reset to default buffer (optional, if you want to do something with the results on screen)
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);

    controls.update();
  };

  wrap.resize = ({ width, height }) => {
    renderer.setSize(width, height);
    camera.aspect = width / height;

    wrap.unload = () => {
      renderer.dispose();
      renderer.forceContextLoss();
    };
  };
};

const settings = {
  mode: "webgl2",
  pixelRatio: window.devicePixelRatio,
  animate: true,
  duration: 20_000,
  playFps: 60,
  exportFps: 60,
  framesFormat: ["webm"],
  attributes: {
    preserveDrawingBuffer: true,
  },
};

ssam(sketch, settings);
