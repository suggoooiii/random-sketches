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
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import baseVert from "./shaders/base.vert";
import baseFrag from "./shaders/base.frag";

const sketch = ({ wrap, canvas, width, height, pixelRatio }) => {
  // rendere
  const renderer = new WebGLRenderer({ canvas });
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
  // camera.position.set(0, 0, 5);
  // const camera = new OrthographicCamera(
  //   -window.innerWidth / 2,
  //   window.innerWidth / 2,
  //   window.innerHeight / 2,
  //   -window.innerHeight / 2,
  //   0.1,
  //   10,
  // );

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  // controls.autoRotate = true;
  controls.autoRotateSpeed = 10.0;

  // geo & materials
  const geometry = new PlaneGeometry(cellSize, cellSize);
  const uniforms = {
    resolution: { value: new Vector2(width, height) },
    time: { value: 0.0 },
  };

  const material = new MeshBasicMaterial({ color: 0x00ff00, side: DoubleSide });
  const aliveMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    side: DoubleSide,
  });
  const deadMaterial = new MeshBasicMaterial({
    color: 0x000000,
    side: DoubleSide,
  });
  // const material = new ShaderMaterial({
  //   vertexShader: baseVert,
  //   fragmentShader: baseFrag,
  //   uniforms: uniforms,
  // });

  // Initialize grid
  const grid = [];
  for (let i = 0; i < gridMax; i++) {
    grid[i] = [];
    for (let j = 0; j < gridMax; j++) {
      const material = Math.random() > 0.5 ? aliveMaterial : deadMaterial;
      const cell = new Mesh(geometry, material);
      cell.position.x = i - gridMax / 2;
      cell.position.y = j - gridMax / 2;
      cell.userData = {
        state: material === aliveMaterial ? 1 : 0,
        position: { x: i, y: j },
      };
      scene.add(cell);
      grid[i][j] = cell;
    }
  }

  camera.position.z = 150;

  function updateGameOfLife(grid) {
    const neighbours = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ];

    grid.forEach((row) =>
      row.forEach((cell) => {
        let liveNeighbours = 0;
        const x = cell.userData.position.x;
        const y = cell.userData.position.y;

        neighbours.forEach(([dx, dy]) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < gridMax && ny >= 0 && ny < gridMax) {
            const neighbour = grid[nx][ny];
            if (neighbour.userData.state === 1) {
              liveNeighbours++;
            }
          }
        });

        cell.userData.liveNeighbours = liveNeighbours;
      }),
    );

    grid.forEach((row) =>
      row.forEach((cell) => {
        const liveNeighbours = cell.userData.liveNeighbours;
        const currentState = cell.userData.state;

        if (currentState === 1 && (liveNeighbours < 2 || liveNeighbours > 3)) {
          cell.userData.state = 0;
          cell.material = deadMaterial;
        } else if (currentState === 0 && liveNeighbours === 3) {
          cell.userData.state = 1;
          cell.material = aliveMaterial;
        }
      }),
    );
  }
  camera.position.z = 100;
  // const mesh = new Mesh(geometry, material);
  // scene.add(mesh);

  // works like the animate function in threejs
  wrap.render = ({ playhead }) => {
    uniforms["time"].value = playhead * Math.PI * 2;
    updateGameOfLife(grid);
    controls.update();
    renderer.render(scene, camera);
  };

  wrap.resize = ({ width, height }) => {
    uniforms["resolution"].value.set(width, height);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

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
    preserveDrawingBuffer: true,
  },
};

ssam(sketch, settings);
