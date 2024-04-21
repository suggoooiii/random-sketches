import { ssam } from "ssam";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import baseVert from "./shaders/base.vert";
import baseFrag from "./shaders/base.frag";
import flowFieldVertexShader from "./shaders/flowfield.vert";
import flowFieldFragmentShader from "./shaders/flowfield.frag";
import { createNoise2D } from "simplex-noise";

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
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0); // Set the position to look at

  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.zoomSpeed = 1.2;
  controls.enableRotate = true;

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
  const lineMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color("red"), linewidth: 1 });

  // Create a line geometry
  const lineGeometry = new THREE.BufferGeometry();
  const linePositions = new Float32Array(1000 * 3); // Adjust the number of lines as needed
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 2));

  // Create a line mesh
  const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(lineMesh);

  const flowFieldMaterial = new THREE.ShaderMaterial({
    vertexShader: flowFieldVertexShader,
    fragmentShader: flowFieldFragmentShader,
    uniforms: {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      mousePosition: { value: new THREE.Vector2() },
    },
  });

  // Create a plane geometry and mesh for the flow field
  const planeGeometry = new THREE.PlaneGeometry(10, 10, 10, 10);
  const planeMesh = new THREE.Mesh(planeGeometry, flowFieldMaterial);
  scene.add(planeMesh);

  camera.position.z = 5;

  wrap.render = ({ playhead }) => {
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

    onMove();
    // Update the time uniform in the flow field material
    flowFieldMaterial.uniforms.time.value += playhead * 0.05;
    // // Update the line positions based on the flow field
    const positions = lineGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = ((i / 3) % 100) - 50;
      const y = Math.floor(i / 3 / 100) - 50;
      ``;
      const uv = new THREE.Vector2((x + 50) / 100, (y + 50) / 100);

      // Calculate the flow field direction at the current position
      const angle = getFlowFieldAngle(uv, flowFieldMaterial.uniforms.time.value);
      const direction = new THREE.Vector2(Math.cos(angle), Math.sin(angle));

      positions[i] = x;
      positions[i + 1] = y;
      positions[i + 2] = 0;

      positions[i + 3] = x + direction.x * 2;
      positions[i + 4] = y + direction.y * 2;
      positions[i + 5] = 0;
    }
    lineGeometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  };

  wrap.resize = ({ width, height }) => {
    renderer.setSize(window.innerWidth, window.innerHeight);
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
