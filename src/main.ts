import { Renderer } from "./renderer/Renderer";

const canvas: HTMLCanvasElement = <HTMLCanvasElement>(
  document.getElementById("gfx-main")
);

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();

window.addEventListener("resize", resizeCanvas);

const renderer = new Renderer(canvas);
renderer.init();
