import { ssam } from "ssam";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import baseVert from "./shaders/base.vert";
import baseFrag from "./shaders/base.frag";
import flowFieldVertexShader from "./shaders/flowfield.vert";
import flowFieldFragmentShader from "./shaders/flowfield.frag";
import { createNoise2D } from "simplex-noise";
import * as dat from "dat.gui";

const sketch = ({ wrap, canvas, width, height, pixelRatio }) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(pixelRatio);
  // renderer.setClearColor(0xffffff, 1);
  renderer.setClearColor(0x000000, 1); // Set background to black

  renderer.setSize(width, height);
  document.body.appendChild(renderer.domElement);
  const cameraParams = {
    positionX: 0,
    positionY: 0,
    positionZ: -20,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
  };

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(cameraParams.targetX, cameraParams.targetY, cameraParams.targetZ);

  // Initialize camera parameters

  let planeParams = {
    width: 10,
    height: 10,
    widthSegments: 10,
    heightSegments: 10,
  };
  let planeGeometry = new THREE.PlaneGeometry(
    planeParams.width,
    planeParams.height,
    planeParams.widthSegments,
    planeParams.heightSegments,
  );

  // Initialize grid parameters
  const gridParams = {
    width: 200,
    height: 200,
    margin: 0.5, // 50% extra margin
    resolution: 5, // Number of pixels per grid cell
    defaultAngle: Math.PI * 0.25, // Default flow field angle in radians
    angleMultiplier: 2, // Multiplier for angle variation
  };

  let clock = new THREE.Clock();
  const angleExpression = (playhead) => playhead * Math.PI * gridParams.angleMultiplier;

  // Calculate grid dimensions
  const leftX = gridParams.width * -gridParams.margin;
  const rightX = gridParams.width * (1 + gridParams.margin);
  const topY = gridParams.height * -gridParams.margin;
  const bottomY = gridParams.height * (1 + gridParams.margin);
  const numColumns = (rightX - leftX) / gridParams.resolution;
  const numRows = (bottomY - topY) / gridParams.resolution;

  // Initialize the grid with default angles
  const grid = new Array(numColumns).fill(null).map(() => new Array(numRows).fill(gridParams.defaultAngle));

  // Create a line material
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });

  // Create a group to hold all the line segments
  const lineGroup = new THREE.Group();
  scene.add(lineGroup);
  camera.position.z = 5;

  // Function to create line segments based on the grid
  function createLineSegments(playhead) {
    // let modifier = playhead * Math.PI * gridParams.angleMultiplier;
    for (let column = 0; column < numColumns; column++) {
      for (let row = 0; row < numRows; row++) {
        const startX = leftX + column * gridParams.resolution;
        const startY = topY + row * gridParams.resolution;
        const angle = grid[column][row];
        const direction = new THREE.Vector2(Math.cos(angle), Math.sin(angle));
        const endX = startX + direction.x * gridParams.resolution;
        const endY = startY + direction.y * gridParams.resolution;

        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(startX, startY, 0),
          new THREE.Vector3(endX, endY, 0),
        ]);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        lineGroup.add(line);
      }
    }
  }

  // Function to draw a curve based on the flow field grid
  function drawCurve(startX, startY, numSteps, stepLength) {
    const curveGeometry = new THREE.BufferGeometry();
    const curveVertices = [];

    let x = startX,
      y = startY;
    const leftX = gridParams.width * -gridParams.margin;
    const topY = gridParams.height * -gridParams.margin;
    const resolution = gridParams.resolution;

    for (let n = 0; n < numSteps; n++) {
      curveVertices.push(new THREE.Vector3(x, y, 0));

      const xOffset = x - leftX;
      const yOffset = y - topY;
      const columnIndex = Math.floor(xOffset / resolution);
      const rowIndex = Math.floor(yOffset / resolution);

      // Ensure we're within bounds
      const gridAngle =
        grid[Math.min(Math.max(columnIndex, 0), numColumns - 1)][Math.min(Math.max(rowIndex, 0), numRows - 1)];

      const xStep = stepLength * Math.cos(gridAngle);
      const yStep = stepLength * Math.sin(gridAngle);

      x += xStep;
      y += yStep;
    }

    curveGeometry.setFromPoints(curveVertices);
    const curveMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const curve = new THREE.Line(curveGeometry, curveMaterial);
    scene.add(curve);
  }

  const params = {
    Amplitude: 0.5,
    Frequency: 20.0,
  };
  // Create a line segment geometry and a custom shader material
  const segmentCount = 5000;
  const positions = new Float32Array(segmentCount * 6);
  const colors = new Float32Array(segmentCount * 6);

  for (let i = 0; i < segmentCount; i++) {
    const x = Math.random() * 10 - 5;
    const y = Math.random() * 10 - 5;
    const z = 0;

    positions[i * 6] = x;
    positions[i * 6 + 1] = y;
    positions[i * 6 + 2] = z;
    positions[i * 6 + 3] = x;
    positions[i * 6 + 4] = y;
    positions[i * 6 + 5] = z;

    colors[i * 6] = Math.random();
    colors[i * 6 + 1] = Math.random();
    colors[i * 6 + 2] = Math.random();
    colors[i * 6 + 3] = Math.random();
    colors[i * 6 + 4] = Math.random();
    colors[i * 6 + 5] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  // Define the material with a GLSL shader
  const material = new THREE.ShaderMaterial({
    vertexShader: flowFieldVertexShader,
    fragmentShader: flowFieldFragmentShader,
    uniforms: {
      time: { value: 0.0 },
      // amplitude: { value: 0.5 },
      // frequency: { value: 20.0 },
    },
  });

  // Create a line segment object using the geometry and material, and add it to the scene
  const lineSegments = new THREE.LineSegments(geometry, material);
  scene.add(lineSegments);
  // gui.add(params, "Amplitude", 0, 2).onChange((value) => {
  //   mesh.material.uniforms.amplitude.value = value;
  // });
  // gui.add(params, "Frequency", 0, 40).onChange((value) => {
  //   mesh.material.uniforms.frequency.value = value;
  // });
  // Define the geometry
  // Create the mesh and add it to the scene
  // const mesh = new THREE.Mesh(geometry, material);
  // scene.add(mesh);
  // Function to update the grid and line segments when parameters change

  wrap.render = ({ playhead }) => {
    material.uniforms.time.value += playhead;
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = trueDSA
    renderer.render(scene, camera);
  };

  wrap.resize = ({ width, height }) => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  wrap.unload = () => {
    renderer.dispose();
    renderer.forceContextLoss();
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
