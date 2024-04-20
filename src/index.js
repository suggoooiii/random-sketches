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
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import baseVert from "./shaders/base.vert";
import baseFrag from "./shaders/base.frag";

const sketch = ({ wrap, canvas, width, height, pixelRatio }) => {
  // rendere
  const renderer = new WebGLRenderer({
    canvas,
    //  antialias: true
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0xffffff, 1);

  const gridMax = 100; // Define the size of the grid
  const cellSize = 1; // Define the size of each cell

  // scene
  const scene = new Scene();
  // camera
  const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.z = 50;

  const gridSize = 256;

  const sphereGeometry = new SphereGeometry(20, 64, 64);

  // Create two textures for current and next states
  const data = new Float32Array(gridSize * gridSize * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.random() > 0.5 ? 1.0 : 0.0; // Initialize random state
  }

  const textureA = new DataTexture(
    data,
    gridSize,
    gridSize,
    RGBAFormat,
    FloatType,
  );
  textureA.needsUpdate = true;

  const textureB = new DataTexture(
    data,
    gridSize,
    gridSize,
    RGBAFormat,
    FloatType,
  );
  textureB.needsUpdate = true;

  // Setup a render target
  const targetA = new WebGLRenderTarget(gridSize, gridSize, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    format: RGBAFormat,
    type: FloatType,
  });
  const targetB = new WebGLRenderTarget(gridSize, gridSize, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    format: RGBAFormat,
    type: FloatType,
  });

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.25;
  controls.screenSpacePanning = false;

  // const geometry = new BoxGeometry(cellSize, cellSize, cellSize);
  // const uniforms = {
  //   resolution: { value: new Vector2(width, height) },
  //   time: { value: 0.0 },
  // };

  // GLSL shaders
  const fragmentShader = `
precision highp float;

uniform sampler2D currentState;
uniform vec2 texSize;

void main() {
    vec2 onePixel = vec2(1.0, 1.0) / texSize;
    int aliveNeighbors = 0;
    vec2 uv = gl_FragCoord.xy / texSize;

    for(int dx = -1; dx <= 1; dx++) {
        for(int dy = -1; dy <= 1; dy++) {
            if(dx != 0 || dy != 0) {
                vec2 neighborUv = uv + vec2(float(dx), float(dy)) * onePixel;
                float neighborState = texture2D(currentState, neighborUv).r;
                if(neighborState > 0.5) {
                    aliveNeighbors++;
                }
            }
        }
    }

    float currentState = texture2D(currentState, uv).r;
    float nextState;

    if(currentState > 0.5 && (aliveNeighbors < 2 || aliveNeighbors > 3)) {
        nextState = 0.0;
    } else if(currentState < 0.5 && aliveNeighbors == 3) {
        nextState = 1.0;
    } else {
        nextState = currentState;
    }

    gl_FragColor = vec4(nextState, 0.0, 0.0, 1.0);
}
`;

  const vertexShader = `
void main() {
    gl_Position = vec4(position, 1.0);
}
`;

  // Shader material setup
  const material = new ShaderMaterial({
    uniforms: {
      currentState: { value: textureA },
      texSize: { value: new Vector2(gridSize, gridSize) },
    },
    vertexShader,
    fragmentShader,
  });

  // Full-screen quad to run the shader
  const plane = new PlaneGeometry(2, 2);
  const quad = new Mesh(plane, material);
  // scene.add(quad);
  const sphere = new Mesh(sphereGeometry, material);

  const aliveMaterial = new MeshBasicMaterial({
    color: "red",
    side: DoubleSide,
  });
  const deadMaterial = new MeshBasicMaterial({
    color: "black",
    side: DoubleSide,
  });
  const grid = [];
  // for (let i = 0; i < gridMax; i++) {
  //   grid[i] = [];
  //   for (let j = 0; j < gridMax; j++) {
  //     grid[i][j] = [];
  //     for (let k = 0; k < gridMax; k++) {
  //       const material = Math.random() > 0.5 ? aliveMaterial : deadMaterial;
  //       const cell = new Mesh(geometry, material);
  //       cell.position.set(i - gridMax / 2, j - gridMax / 2, k - gridMax / 2);
  //       cell.userData = {
  //         state: material === aliveMaterial ? 1 : 0,
  //         position: { x: i, y: j, z: k },
  //       };
  //       scene.add(cell);
  //       grid[i][j][k] = cell;
  //     }
  //   }
  // }

  // function updateGameOfLife(grid) {
  //   const neighbours = [
  //     [-1, -1, -1],
  //     [-1, -1, 0],
  //     [-1, -1, 1],
  //     [-1, 0, -1],
  //     [-1, 0, 0],
  //     [-1, 0, 1],
  //     [-1, 1, -1],
  //     [-1, 1, 0],
  //     [-1, 1, 1],
  //     [0, -1, -1],
  //     [0, -1, 0],
  //     [0, -1, 1],
  //     [0, 0, -1],
  //     [0, 0, 1],
  //     [0, 1, -1],
  //     [0, 1, 0],
  //     [0, 1, 1],
  //     [1, -1, -1],
  //     [1, -1, 0],
  //     [1, -1, 1],
  //     [1, 0, -1],
  //     [1, 0, 0],
  //     [1, 0, 1],
  //     [1, 1, -1],
  //     [1, 1, 0],
  //     [1, 1, 1],
  //   ];

  //   grid.forEach((layer) =>
  //     layer.forEach((row) =>
  //       row.forEach((cell) => {
  //         let liveNeighbours = 0;
  //         const x = cell.userData.position.x;
  //         const y = cell.userData.position.y;
  //         const z = cell.userData.position.z;

  //         neighbours.forEach(([dx, dy, dz]) => {
  //           const nx = x + dx;
  //           const ny = y + dy;
  //           const nz = z + dz;
  //           if (
  //             nx >= 0 &&
  //             nx < gridMax &&
  //             ny >= 0 &&
  //             ny < gridMax &&
  //             nz >= 0 &&
  //             nz < gridMax
  //           ) {
  //             const neighbour = grid[nx][ny][nz];
  //             if (neighbour.userData.state === 1) {
  //               liveNeighbours++;
  //             }
  //           }
  //         });

  //         cell.userData.liveNeighbours = liveNeighbours;
  //       }),
  //     ),
  //   );

  //   grid.forEach((layer) =>
  //     layer.forEach((row) =>
  //       row.forEach((cell) => {
  //         const liveNeighbours = cell.userData.liveNeighbours;
  //         const currentState = cell.userData.state;

  //         if (
  //           currentState === 1 &&
  //           (liveNeighbours < 2 || liveNeighbours > 3)
  //         ) {
  //           cell.userData.state = 0;
  //           cell.material = deadMaterial;
  //         } else if (currentState === 0 && liveNeighbours === 3) {
  //           cell.userData.state = 1;
  //           cell.material = aliveMaterial;
  //         }
  //       }),
  //     ),
  //   );
  // }

  // const mesh = new Mesh(geometry, material);
  // scene.add(mesh);

  // works like the animate function in threejs
  wrap.render = ({ playhead }) => {
    // uniforms["time"].value = playhead * Math.PI * 2;
    // Alternate textures
    if (material.uniforms.currentState.value === textureA) {
      material.uniforms.currentState.value = textureA;
      renderer.setRenderTarget(targetB);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      material.uniforms.currentState.value = textureB;
    } else {
      material.uniforms.currentState.value = textureB;
      renderer.setRenderTarget(targetA);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      material.uniforms.currentState.value = textureA;
    }
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
  duration: 9_000,
  playFps: 60,
  exportFps: 60,
  framesFormat: ["webm"],
  attributes: {
    // preserveDrawingBuffer: true,
  },
};

ssam(sketch, settings);
