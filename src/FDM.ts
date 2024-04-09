import { clamp, zeros } from "./utils";
import * as THREE from "three";

export function FDM(
  U: Grid,
  V: Grid,
  dudt: UserFn,
  dvdt: UserFn,
  h: Float,
  dt: Float
) {
  const m = U.length;
  const n = U[0].length;

  const u: Fn = (i, j) => U[(i + m) % m][(j + n) % n];
  const v: Fn = (i, j) => V[(i + m) % m][(j + n) % n];
  const dudx: Fn = (i, j) => (u(i, j + 1) - u(i, j - 1)) / (2 * h);
  const dudy: Fn = (i, j) => (u(i + 1, j) - u(i - 1, j)) / (2 * h);
  const d2udx2: Fn = (i, j) =>
    (u(i, j - 1) - 2 * u(i, j) + u(i, j + 1)) / h ** 2;
  const d2udy2: Fn = (i, j) =>
    (u(i - 1, j) - 2 * u(i, j) + u(i + 1, j)) / h ** 2;

  function step(iters: Int): void {
    while (iters--) {
      let U$ = zeros(m, n);
      let V$ = zeros(m, n);
      for (let i = 0; i < m; ++i) {
        for (let j = 0; j < n; ++j) {
          const du = dt * dudt(i, j, { u, v, dudx, dudy, d2udx2, d2udy2 });
          const dv = dt * dvdt(i, j, { u, v, dudx, dudy, d2udx2, d2udy2 });
          if (isNaN(du) || isNaN(dv)) throw new Error("NaN");
          U$[i][j] = U[i][j] + du;
          V$[i][j] = V[i][j] + dv;
        }
      }
      U = U$;
      V = V$;
    }
  }

  const index = (i: number, j: number) => i * n + j;

  function toMesh(width = 500, height = 200): THREE.Mesh {
    const vertices: number[] = [];
    for (let i = 0; i < m; ++i) {
      for (let j = 0; j < n; ++j) {
        vertices.push(j / (n - 1), i / (m - 1), u(i, j));
      }
    }
    const indices: number[] = [];
    for (let i = 1; i < m; ++i) {
      for (let j = 1; j < n; ++j) {
        indices.push(index(i - 1, j - 1), index(i, j), index(i, j - 1));
        indices.push(index(i, j), index(i - 1, j - 1), index(i - 1, j));
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(vertices), 3)
    );
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0,
    });
    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
  }

  return {
    step,
    toMesh,
  };
}
