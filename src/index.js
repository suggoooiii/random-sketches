import { ssam } from "ssam";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import baseVert from "./shaders/base.vert";
import baseFrag from "./shaders/base.frag";
import flowFieldVertexShader from "./shaders/flowfield.vert";
import flowFieldFragmentShader from "./shaders/flowfield.frag";

const sketch = ({ wrap, canvas, width, height, pixelRatio }) => {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1);

  function onMove() {
    document.addEventListener("mousemove", (event) => {
      const mouseX = (event.clientX / width) * 2 - 1;
      const mouseY = -(event.clientY / height) * 2 + 1;
      flowFieldMaterial.uniforms.mousePosition.value.set(mouseX, mouseY);
    });
  }

  function getRandomData(width, height, size) {
    var len = width * height * 3;
    var data = new Float32Array(len);
    while (len--) data[len] = (Math.random() * 2 - 1) * size;
    return data;
  }
  const options = {
    minFilter: THREE.NearestFilter, //important as we want to sample square pixels
    magFilter: THREE.NearestFilter, //
    format: THREE.RGBFormat, //could be RGBAFormat
    type: THREE.FloatType, //important as we need precise coordinates (not ints)
  };
  // rendere
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0xffffff, 1);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.25;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.0;
  const rtt = new THREE.WebGLRenderTarget(width, height, options);

  //create a bi-unit quadrilateral and uses the simulation material to update the Float Texture
  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]), 3),
  );
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]), 2));
  const flowFieldMaterial = new THREE.ShaderMaterial({
    vertexShader: flowFieldVertexShader,
    fragmentShader: flowFieldFragmentShader,
    uniforms: {
      time: { value: 0 },
      mousePosition: { value: new THREE.Vector2(0, 0) },
    },
  });

  scene.add(new THREE.Mesh(geom, flowFieldMaterial));

  // works like the animate function in threejs
  wrap.render = ({ playhead }) => {
    onMove();
    flowFieldMaterial.uniforms.time.value += playhead * 0.05;
    renderer.render(scene, camera);
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
