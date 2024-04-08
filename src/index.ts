import { makeGrid, zeros } from "./utils";
import { FDM } from "./FDM";
import * as THREE from "three";

const N = 50;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(light);

const directionalLight1 = new THREE.DirectionalLight(0xffffff);
scene.add(directionalLight1);

const directionalLight2 = new THREE.DirectionalLight(0xffff00);
directionalLight2.position.set(1, 0, 1);
scene.add(directionalLight2);

camera.translateY(-1.5).translateZ(1.5).lookAt(new THREE.Vector3(0, 0, 0));

const AMPLITUDE = 0.5;

function rand(start: number, end: number) {
  return start + (end - start) * Math.random();
}

function initialValue(M: number): Fn {
  const gaussians: Array<[Float, Float, Float, Float]> = [];
  for (let i = 0; i < M; ++i) {
    gaussians.push([
      rand(1 / 4, 3 / 4) * N,
      rand(1 / 4, 3 / 4) * N,
      (AMPLITUDE / Math.sqrt(M)) * rand(0.5, 1),
      rand(0.1, 0.11),
    ]);
  }
  return (i, j) => {
    let u = 0;
    for (const [ci, cj, ampl, k] of gaussians) {
      u += ampl * Math.exp(-k * ((i - ci) ** 2 + (j - cj) ** 2));
    }
    return u;
  };
}

const dudt: UserFn = (i, j, { v }) => v(i, j);
const dvdt: UserFn = (i, j, { d2udx2, d2udy2 }) =>
  300 * (d2udx2(i, j) + d2udy2(i, j));

let angle = 0;
let numOfPeaks = 0;
let rafHandle = -1;
let mesh: THREE.Mesh | null = null;

(function reset() {
  cancelAnimationFrame(rafHandle);

  numOfPeaks = (numOfPeaks + 1) % 10;

  const Sol = FDM(
    makeGrid(N, N, initialValue(numOfPeaks + 1)),
    zeros(N, N),
    dudt,
    dvdt,
    1,
    0.0001
  );

  let start = Date.now();

  rafHandle = requestAnimationFrame(function render() {
    angle += 0.002;

    if (Date.now() - start > 500) {
      Sol.step(100);
    }

    scene.remove(mesh);
    mesh = Sol.toMesh();
    mesh.geometry.translate(-0.5, -0.5, 0);
    mesh.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), angle);
    scene.add(mesh);
    renderer.render(scene, camera);

    rafHandle = requestAnimationFrame(render);
  });

  setTimeout(reset, 2000);
})();
