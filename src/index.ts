import { makeGrid, zeros } from "./utils";
import { FDM } from "./FDM";

const N = 40;

setup(
  document.querySelector("#advection–diffusion"),
  (i, j, { dudx, d2udx2, d2udy2 }) =>
    20 * dudx(i, j) + 20 * (d2udx2(i, j) + d2udy2(i, j))
);

setup(
  document.querySelector("#wave"),
  (i, j, { v }) => v(i, j),
  (i, j, { d2udx2, d2udy2 }) => 200 * (d2udx2(i, j) + d2udy2(i, j))
);

function initialValue(): Fn {
  const gaussians: Array<[Float, Float, Float]> = [];
  let n = 20;
  while (n--) {
    gaussians.push([
      (Math.random() * 0.8 + 0.1) * N,
      (Math.random() * 0.8 + 0.1) * N,
      Math.random() * 0.01 + 0.1,
    ]);
  }
  return (i, j) => {
    let u = 0;
    for (const [ci, cj, k] of gaussians) {
      u += Math.exp(-k * ((i - ci) ** 2 + (j - cj) ** 2));
    }
    return u;
  };
}

function setup(
  canvas: HTMLCanvasElement,
  dudt: UserFn,
  dvdt: UserFn = () => 0
) {
  const ctx = canvas.getContext("2d")!;
  const height = ctx.canvas.height;
  const width = ctx.canvas.width;
  const imageData = new ImageData(width, height);

  let rafHandle = -1;
  (function reset() {
    cancelAnimationFrame(rafHandle);

    const Sol = FDM(
      makeGrid(N, N, initialValue()),
      zeros(50, 50),
      dudt,
      dvdt,
      1,
      0.0001
    );

    rafHandle = requestAnimationFrame(function render() {
      Sol.step(100);
      Sol.transfer(imageData, 0, 1);
      ctx.putImageData(imageData, 0, 0);
      rafHandle = requestAnimationFrame(render);
    });

    setTimeout(reset, 10000);
  })();
}
