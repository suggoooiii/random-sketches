precision highp float;

varying vec2 vUv;

void main(){
  // Assign colors based on the UV coordinates
  gl_FragColor=vec4(vUv,0.,1.);
}