import { ssam } from "ssam";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import baseVert from "./shaders/base.vert";
// import baseFrag from "./shaders/base.frag";
// import flowFieldVertexShader from "./shaders/flowfield.vert";
// import flowFieldFragmentShader from "./shaders/flowfield.frag";
import * as dat from "dat.gui";

const sketch = ({ wrap, canvas, width, height, pixelRatio }) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  // Create a GUI instance
  const gui = new dat.GUI();

  // function createFBO() {
  //   // width and height of FBO
  //   const width = 512;
  //   const height = 512;
  //   const fbo = new THREE.WebGLRenderTarget(width, height, {
  //     minFilter: THREE.LinearFilter,
  //     magFilter: THREE.LinearFilter,
  //     wrapS: THREE.RepeatWrapping,
  //     wrapT: THREE.RepeatWrapping,
  //   });
  //   return fbo;
  // }

  renderer.setPixelRatio(pixelRatio);
  // renderer.setClearColor(0xffffff, 1);
  renderer.setClearColor(0x000000, 1); // Set background to black

  renderer.setSize(width, height);
  document.body.appendChild(renderer.domElement);

  // Particle geometry and material using a shader
  const particles = 10000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particles * 3);
  const velocities = new Float32Array(particles * 3);
  for (let i = 0; i < particles * 3; i++) {
    positions[i] = (Math.random() * 2 - 1) * 5;
    velocities[i] = 0;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      pointSize: { value: 2.0 },
      attractor: { value: new THREE.Vector3(0, 0, 0) },
      time: { value: 0 },
      color: { value: new THREE.Color(0xffffff) },
    },
    vertexShader: `
    precision highp float;
    uniform vec3 attractor;
    attribute vec3 velocity;
    uniform float pointSize;
    varying vec3 vColor;
    uniform float time;

    void main() {
      
        vec3 acc = attractor - position;
        vec3 vel = velocity + 0.05 * acc; // Attraction strength
        vel *= 0.95; // Damping

        vec3 newPos = position + vel;
        vColor = vec3(vel.x + 0.5, vel.y + 0.5, vel.z + 0.5); // Color based on velocity
        float colorFactor = sin(time + length(newPos) * 0.5);
        vColor += vec3(colorFactor, 0.5, 1.0 - colorFactor);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
        gl_PointSize = pointSize;
    }
`,
    fragmentShader: `
    precision highp float;
    varying vec3 vColor;

    void main() {
        float intensity = 10.0 / length(gl_PointCoord - vec2(0.5, 0.5));
        gl_FragColor = vec4(vColor * intensity, 1.0);
      }
`,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
  });

  const particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);

  // Create a render target to hold trail effects
  const renderTarget = new THREE.WebGLRenderTarget(512, 512, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
  });

  const trailMaterial = new THREE.ShaderMaterial({
    uniforms: {
      texture: { value: renderTarget.texture },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      decay: { value: 0.95 }, // Controls how fast the trails fade; closer to 1 is slower
    },
    vertexShader: `
    precision highp float;
    varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        precision highp float;

        uniform sampler2D texture;
        uniform vec2 resolution;
        uniform float decay;
        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(texture, vUv);
          gl_FragColor = vec4(color.rgb * decay,1.0);  // Apply decay to fade the trail
        }
    `,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    depthTest: false,
    transparent: true,
  });

  const trailMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), trailMaterial);
  scene.add(trailMesh);

  function makeGUI() {
    const TWEAKS = {
      pointSize: 2.0,
      attractorX: 0,
      attractorY: 0,
      attractorZ: 0,
      color: "#ffffff",
    };
    // GUI for particle point size
    gui.add(TWEAKS, "pointSize", 1.0, 10.0).onChange((value) => {
      material.uniforms.pointSize.value = value;
    });

    // GUI for attractor position
    gui.add(TWEAKS, "attractorX", -5, 5).onChange((value) => {
      material.uniforms.attractor.value.x = value;
    });
    gui.add(TWEAKS, "attractorY", -5, 5).onChange((value) => {
      material.uniforms.attractor.value.y = value;
    });
    gui.add(TWEAKS, "attractorZ", -5, 5).onChange((value) => {
      material.uniforms.attractor.value.z = value;
    });
    gui.addColor(TWEAKS, "color").onChange((value) => {
      material.uniforms.color.value.setStyle(value);
    });
  }

  function onMouseMove() {
    document.addEventListener("mousemove", function (event) {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      const vector = new THREE.Vector3(x, y, 0);
      vector.unproject(camera);
      const dir = vector.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;
      const pos = camera.position.clone().add(dir.multiplyScalar(distance));
      material.uniforms.attractor.value = pos;
    });
  }

  makeGUI();
  onMouseMove();
  wrap.render = ({ playhead }) => {
    // Render the particle system to the render target
    renderer.setRenderTarget(renderTarget);
    renderer.clear();

    // Render the trail effect onto the screen
    renderer.setRenderTarget(null);
    trailMesh.material.uniforms.texture.value = renderTarget.texture;
    const anim = playhead * Math.PI * 0.05;
    material.uniforms.time.value += anim;
    particleSystem.rotation.y += 0.005;
    // particleSystem.rotation.x += anim;
    particleSystem.rotation.z += 0.005;
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = trueDSA
    renderer.render(scene, camera);
    geometry.attributes.position.needsUpdate = true;
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
