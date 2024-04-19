import { ssam } from "ssam";
import {
  Mesh,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
  MeshBasicMaterial,
  DoubleSide,
  Vector2,
  PerspectiveCamera,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import baseVert from "./shaders/base.vert";
import baseFrag from "./shaders/base.frag";

const sketch = ({ wrap, canvas, width, height, pixelRatio }) => {
  const renderer = new WebGLRenderer({ canvas });
  renderer.setSize(width, height);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0xffffff, 1);

  const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 0, 5);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);

  const scene = new Scene();

  const geometry = new PlaneGeometry(2, 2);
  const uniforms = {
    resolution: { value: new Vector2(width, height) },
    time: { value: 0.0 },
  };

  const material = new MeshBasicMaterial({ color: 0x00ff00, side: DoubleSide });
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  wrap.render = ({ playhead }) => {
    uniforms["time"].value = playhead * Math.PI * 2;
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
  duration: 6000,
  playFps: 60,
  exportFps: 60,
  framesFormat: ["webm"],
  attributes: {
    preserveDrawingBuffer: true,
  },
};

ssam(sketch, settings);
