import * as THREE from "three";

export function hexToRgb(hex) {
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
}

// Randomly positions points on a sphere
export function getRandomSpherePoint() {
  const u = Math.random();
  const v = Math.random();

  const theta = u * 2.0 * Math.PI;
  const phi = Math.acos(2.0 * v - 1.0);
  const r = Math.cbrt(Math.random());

  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);

  const vector = new THREE.Vector3();

  vector.x = r * sinPhi * cosTheta;
  vector.y = r * sinPhi * sinTheta;
  vector.z = r * cosPhi;

  return vector;
}
