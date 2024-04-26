import { FDM } from "./FDM";
import * as THREE from "three";

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

camera.translateY(-1.5).translateZ(1).lookAt(new THREE.Vector3(0, 0, 0));

let angle = 0;
let rafHandle = -1;
let mesh: THREE.Mesh | null = null;

(async function reset() {
  cancelAnimationFrame(rafHandle);

  const Sol = await FDM(100, 0.01, 0.0001);

  let prev = -1;
  let start = -1;
  rafHandle = requestAnimationFrame(function render(t) {
    if (start == -1) start = t;
    if (prev == -1) prev = t;
    if (t - start > 200) {
      Sol.step(Math.round((t - prev) / 10));
    }
    prev = t;

    angle += 0.005;

    scene.remove(mesh);
    mesh = Sol.toMesh();
    mesh.geometry.translate(-0.5, -0.5, 0);
    mesh.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), angle);
    scene.add(mesh);
    renderer.render(scene, camera);

    rafHandle = requestAnimationFrame(render);
  });

  setTimeout(reset, 3000);
})();
