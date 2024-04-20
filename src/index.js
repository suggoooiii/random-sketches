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
  const sphereGeometry = new SphereGeometry(1, 64, 64);

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

  const w = 64;
  const h = 64;

  let textureCurrentGeneration, texturePreviousGeneration;
  let currentGenerationMaterial, previousGenerationMaterial;
  const gameOfLifeMaterial = new ShaderMaterial({
    uniforms: {
      textureCurrentGeneration: { value: null },
      texturePreviousGeneration: { value: null },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
    uniform sampler2D textureCurrentGeneration;
    uniform sampler2D texturePreviousGeneration;
    varying vec2 vUv;

    void main() {
      vec4 currentGeneration = texture2D(textureCurrentGeneration, vUv);
      vec4 previousGeneration = texture2D(texturePreviousGeneration, vUv);

      int sum = 0;
      for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
          vec2 offset = vec2(float(i), float(j)) / 64.0;
          sum += int(texture2D(texturePreviousGeneration, vUv + offset).r);
        }
      }

      int currentState = int(previousGeneration.r);
      int newState = currentState;

      if (currentState == 1 && (sum < 2 || sum > 3)) {
        newState = 0;
      } else if (currentState == 0 && sum == 3) {
        newState = 1;
      }

      gl_FragColor = vec4(float(newState), 0.0, 0.0, 1.0);
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

  initializeTextures();

  function initializeTextures() {
    // Texture setup for storing the state
    const textureData = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      textureData[i * 4] = Math.random() > 0.5 ? 255 : 0;
    }
    textureCurrentGeneration = new DataTexture(textureData, w, h, RGBAFormat);
    textureCurrentGeneration.needsUpdate = true;

    texturePreviousGeneration = new DataTexture(textureData, w, h, RGBAFormat);
    texturePreviousGeneration.needsUpdate = true;

    gameOfLifeMaterial.uniforms.textureCurrentGeneration.value = textureCurrentGeneration;
    gameOfLifeMaterial.uniforms.texturePreviousGeneration.value = texturePreviousGeneration;
  }

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

  // works like the animate function in threejs
  wrap.render = ({ playhead }) => {
    sphere.material = gameOfLifeMaterial;
    renderer.render(scene, camera);

    const temp = textureCurrentGeneration;
    textureCurrentGeneration = texturePreviousGeneration;
    texturePreviousGeneration = temp;

    gameOfLifeMaterial.uniforms.textureCurrentGeneration.value = textureCurrentGeneration;
    gameOfLifeMaterial.uniforms.texturePreviousGeneration.value = texturePreviousGeneration;
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
  playFps: 120,
  exportFps: 60,
  framesFormat: ["webm"],
  attributes: {
    preserveDrawingBuffer: true,
  },
};

ssam(sketch, settings);
