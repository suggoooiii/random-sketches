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

export function getImage(img, width, height, elevation) {
  var ctx = getContext(null, width, height);
  ctx.drawImage(img, 0, 0);

  var imgData = ctx.getImageData(0, 0, width, height);
  var iData = imgData.data;

  var l = width * height;
  var data = new Float32Array(l * 3);
  for (var i = 0; i < l; i++) {
    var i3 = i * 3;
    var i4 = i * 4;
    data[i3] = ((i % width) / width - 0.5) * width;
    data[i3 + 1] =
      ((iData[i4] / 0xff) * 0.299 + (iData[i4 + 1] / 0xff) * 0.587 + (iData[i4 + 2] / 0xff) * 0.114) * elevation;
    data[i3 + 2] = (i / width / height - 0.5) * height;
  }
  return data;
}

//returns an array of random 3D coordinates
export function getRandomData(width, height, size) {
  var len = width * height * 3;
  var data = new Float32Array(len);
  while (len--) data[len] = (Math.random() * 2 - 1) * size;
  return data;
}

//then you convert it to a Data texture:
// var data = getRandomData( width, height, 256 );
// var positions = new THREE.DataTexture( data, width, height, THREE.RGBFormat, THREE.FloatType );
// positions.needsUpdate = true;
