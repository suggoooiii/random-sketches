import { ssam } from "ssam";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as dat from "dat.gui";
import * as THREE from "three";

const sketch = ({ wrap, canvas, width, height, pixelRatio }) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(0, 0, 5);

  scene.fog = new THREE.Fog(0x000000, 100, 1000);
  scene.background = new THREE.Color("0.5", 0.0, 0.8);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  // Create a GUI instance
  const gui = new dat.GUI();

  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 1);

  renderer.setSize(width, height);
  document.body.appendChild(renderer.domElement);

  const TWEAKS = {};
  const material = new THREE.ShaderMaterial({
    uniforms: {
      cameraPosition: { value: new THREE.Vector3() },
    },
    vertexShader: `
    uniform float time;
    varying vec3 vNormal;

    void main() {
        float displacement = sin(position.x * 3.0 + time * 2.0) * 0.1;
        vec3 newPosition = position + normal * displacement;
    
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }`,
    fragmentShader: `
    uniform vec3 u_cameraPos;
    varying vec3 vNormal;

    void main() {
      
        vec3 lightDirection = normalize(vec3(1, 1, 1));
        float lightIntensity = max(dot(vNormal, lightDirection), 0.0);
        
        vec3 viewDirection = normalize(cameraPosition - gl_FragCoord.xyz);
        float specularity = pow(max(dot(reflect(-lightDirection, vNormal), viewDirection), 0.0), 32.0);
        
        vec3 color = mix(vec3(0.6, 0.7, 0.8), vec3(1.0, 1.0, 1.0), specularity);
        gl_FragColor = vec4(color * lightIntensity, 1.0);
    };`,
  });

  scene.add(new THREE.Mesh(new THREE.CircleGeometry(1, 32), material));
  // const trailMesh = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), trailMaterial);
  // scene.add(trailMesh);

  // GUI for particle point size
  // wrap
  wrap.render = ({ playhead }) => {
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = trueDSA
    renderer.render(scene, camera);
  };

  wrap.resize = ({ width, height }) => {
    renderer.setSize(width, height);
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
