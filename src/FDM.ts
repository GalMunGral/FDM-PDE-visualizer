import * as THREE from "three";
import { createProgramFromScripts, rand } from "./utils";

const canvas = new OffscreenCanvas(1, 1);
const gl = canvas.getContext("webgl2")!;
const program = await createProgramFromScripts(
  gl,
  "./vertex.glsl",
  "./FDM.glsl"
);

gl.getExtension("EXT_color_buffer_float");

const vertices = [-1, 1, 1, 1, -1, -1, 1, -1];
var buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
var positionLoc = gl.getAttribLocation(program, "ndcCoord");
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
const indices = [2, 1, 0, 1, 2, 3];
gl.bufferData(
  gl.ELEMENT_ARRAY_BUFFER,
  new Uint16Array(indices),
  gl.STATIC_DRAW
);

export function createImage(
  gl: WebGL2RenderingContext,
  N: int,
  init: Float32Array
): WebGLTexture {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, N, N, 0, gl.RG, gl.FLOAT, init, 0);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

export async function FDM(N: int, h: float, dt: float) {
  canvas.width = N;
  canvas.height = N;
  gl.viewport(0, 0, N, N);
  gl.useProgram(program);

  // initial values
  const gaussians: Array<[float, float, float, float]> = [];
  const M = 100;
  for (let i = 0; i < M; ++i) {
    const m = 1 / 4;
    gaussians.push([
      rand(m, 1 - m) * N,
      rand(m, 1 - m) * N,
      rand(0, 0.5) / Math.sqrt(M),
      N / 20,
    ]);
  }

  const UV = new Float32Array(
    Array(N * N)
      .fill(0)
      .flatMap((_, k) => {
        let u = 0;
        for (const [ci, cj, ampl, sigma] of gaussians) {
          u +=
            ampl *
            Math.exp(
              -((Math.floor(k / N) - ci) ** 2 + ((k % N) - cj) ** 2) /
                sigma ** 2
            );
        }
        return [u, 0];
      })
  );

  let texture0 = createImage(gl, N, new Float32Array(UV));
  let texture1 = createImage(gl, N, new Float32Array(UV));

  gl.uniform1i(gl.getUniformLocation(program, "UV"), 0);
  gl.uniform1f(gl.getUniformLocation(program, "N"), N);
  gl.uniform1f(gl.getUniformLocation(program, "h"), h);
  gl.uniform1f(gl.getUniformLocation(program, "dt"), dt);

  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

  function step(n: int) {
    while (n--) {
      gl.bindTexture(gl.TEXTURE_2D, texture0);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture1,
        0
      );
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
      [texture0, texture1] = [texture1, texture0];
    }
  }

  step(1);

  const index = (i: number, j: number) => i * N + j;

  function toMesh(): THREE.Mesh {
    gl.readPixels(0, 0, N, N, gl.RG, gl.FLOAT, UV, 0);

    const vertices: number[] = [];
    for (let i = 0; i < N; ++i) {
      for (let j = 0; j < N; ++j) {
        vertices.push(j / (N - 1), i / (N - 1), UV[index(i, j) * 2]);
      }
    }
    const indices: number[] = [];
    for (let i = 1; i < N; ++i) {
      for (let j = 1; j < N; ++j) {
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
