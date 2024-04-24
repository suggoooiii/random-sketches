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
  renderer.setClearColor(0xffffff, 1);
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

  // Draw a curve starting at (500, 100) with 100 steps and a step length of 10
  // drawCurve(100, 10, 100, 2);

  // Create line segments based on the grid
  // Set up dat.gui
  const gui = new dat.GUI();
  const gridFolder = gui.addFolder("Grid Parameters");
  gridFolder.add(gridParams, "margin", 0, 1).onChange(updateGrid);
  gridFolder.add(gridParams, "resolution", 1, 100).step(1).onChange(updateGrid);
  gridFolder.add(gridParams, "defaultAngle", 0, Math.PI * 2).onChange(updateGrid);
  gridFolder.open();
  // Set up dat.gui for camera parameters
  const cameraFolder = gui.addFolder("Camera");
  cameraFolder.add(cameraParams, "positionX", -10, 10).onChange(updateCamera);
  cameraFolder.add(cameraParams, "positionY", -10, 10).onChange(updateCamera);
  cameraFolder.add(cameraParams, "positionZ", -10, 10).onChange(updateCamera);
  cameraFolder.add(cameraParams, "targetX", -10, 10).onChange(updateCamera);
  cameraFolder.add(cameraParams, "targetY", -10, 10).onChange(updateCamera);
  cameraFolder.add(cameraParams, "targetZ", -10, 10).onChange(updateCamera);
  cameraFolder.open();

  // Instead, you can adjust OrbitControls properties for a similar effect.
  const orbitControlsFolder = gui.addFolder("OrbitControls");
  orbitControlsFolder.add(controls, "enableZoom").name("Zoom Enabled");
  orbitControlsFolder.add(controls, "enableRotate").name("Rotate Enabled");
  orbitControlsFolder.add(controls, "enablePan").name("Pan Enabled");
  orbitControlsFolder.open();
  // Function to update the camera position and target when parameters change
  function updateCamera() {
    camera.position.set(cameraParams.positionX, cameraParams.positionY, cameraParams.positionZ);
    camera.lookAt(new THREE.Vector3(cameraParams.targetX, cameraParams.targetY, cameraParams.targetZ));
  }

  // Define the material with a GLSL shader
  const material = new THREE.ShaderMaterial({
    vertexShader: `
      uniform float time;
      uniform float amplitude;
      uniform float frequency;
      varying vec2 vUv;

      void main() {
          vUv = uv;
          vec3 pos = position;
          float PI = 3.1415926535897932384626433832795;
          // float amplitude = 0.5;
          // float frequency = 20.0;
          float wave = sin(frequency * pos.x + time) * amplitude;
          pos.z = wave;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
  `,
    fragmentShader: `
      varying vec2 vUv;

      void main() {
          gl_FragColor = vec4(vUv, 0.5, 1.0);
      }
  `,
    uniforms: {
      time: { value: 0.0 },
      amplitude: { value: 0.5 },
      frequency: { value: 20.0 },
    },
  });
  const params = {
    Amplitude: 0.5,
    Frequency: 20.0,
  };
  gui.add(params, "Amplitude", 0, 2).onChange((value) => {
    mesh.material.uniforms.amplitude.value = value;
  });
  gui.add(params, "Frequency", 0, 40).onChange((value) => {
    mesh.material.uniforms.frequency.value = value;
  });
  // Define the geometry
  const geometry = new THREE.PlaneGeometry(10, 10, 200, 200);
  // Create the mesh and add it to the scene
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  // Function to update the grid and line segments when parameters change
  function updateGrid() {
    // Remove existing line segments
    lineGroup.clear();

    // Recalculate grid dimensions
    const leftX = gridParams.width * -gridParams.margin;
    const rightX = gridParams.width * (1 + gridParams.margin);
    const topY = gridParams.height * -gridParams.margin;
    const bottomY = gridParams.height * (1 + gridParams.margin);
    const numColumns = Math.floor((rightX - leftX) / gridParams.resolution);
    const numRows = Math.floor((bottomY - topY) / gridParams.resolution);

    // Check if numColumns and numRows are within valid range
    if (numColumns > 0 && numRows > 0) {
      // Recreate the grid with updated parameters
      const grid = new Array(numColumns).fill(null).map(() => new Array(numRows).fill(gridParams.defaultAngle));

      // Create new line segments based on the updated grid
      createLineSegments();
    }
  }

  function onMove() {
    document.addEventListener("mousemove", (event) => {
      const mouseX = (event.clientX / width) * 2 - 1;
      const mouseY = -(event.clientY / height) * 2 + 1;
      flowFieldMaterial.uniforms.mousePosition.value.set(mouseX, mouseY);
    });
  }

  // Helper function to calculate the flow field angle at a given position and time
  function getFlowFieldAngle(uv, time) {
    const noise2D = createNoise2D();
    const value2d = noise2D(uv.x * 0.1 + time * 0.1, uv.y * 0.1 + time * 0.1) * Math.PI * 2;
    return value2d;
  }
  // Create a line material

  // Create a line geometry
  // const lineGeometry = new THREE.BufferGeometry();
  // const linePositions = new Float32Array(1000 * 3); // Adjust the number of lines as needed
  // lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 2));

  // Create a line mesh
  // const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
  // scene.add(lineMesh);

  const flowfieldMaterial = new THREE.ShaderMaterial({
    vertexShader: flowFieldVertexShader,
    fragmentShader: flowFieldFragmentShader,
    uniforms: {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      mousePosition: { value: new THREE.Vector2() },
    },
  });
  // createLineSegments();

  // Create a plane geometry and mesh for the flow field
  // const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
  // Create line segments within the plane geometry

  // const planeMesh = new THREE.Mesh(planeGeometry, flowFieldMaterial);
  // scene.add(planeMesh);

  camera.position.z = 10;
  wrap.render = ({ playhead }) => {
    mesh.material.uniforms.time.value += playhead;
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
