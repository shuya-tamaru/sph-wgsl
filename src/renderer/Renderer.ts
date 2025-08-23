import { SphereInstance } from "../core/SphereInstance";
import { OrbitControls } from "./OrbitControls";
import { RenderPipeline } from "./RenderPipeline";
import { RenderTarget } from "./RenderTarget";
import { SetupDevice } from "./SetupDevice";
import { TransformSystem } from "./TransformSystem";

export class Renderer {
  canvas: HTMLCanvasElement;
  adapter: GPUAdapter;
  device: GPUDevice;
  context: GPUCanvasContext;
  pipeline: GPURenderPipeline;
  setupDevice: SetupDevice;
  renderTarget: RenderTarget;
  renderPipeline: RenderPipeline;
  orbitControls: OrbitControls;
  transformSystem: TransformSystem;

  sphereInstance: SphereInstance;

  timestamp: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.timestamp = 0;
  }

  async init() {
    await this.createDevice();
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.renderTarget = new RenderTarget(this.device, this.canvas);

    this.createTransformData();
    this.createSphereAssets();
    // Create and initialize render pipeline
    this.renderPipeline = new RenderPipeline(
      this.device,
      this.setupDevice.format,
      this.transformSystem.getBuffer()
    );
    this.renderPipeline.init();

    // Add resize handler
    window.addEventListener("resize", this.handleResize.bind(this));

    this.render(0);
  }

  private handleResize() {
    this.renderTarget.updateCanvasSize();
    const aspect = this.canvas.width / this.canvas.height;
    this.transformSystem.setPerspective(Math.PI / 2, aspect, 0.1, 500);
    this.transformSystem.update();
  }

  createTransformData() {
    this.transformSystem = new TransformSystem(this.device);
    const aspect = this.canvas.width / this.canvas.height;
    this.transformSystem.setPerspective(Math.PI / 2, aspect, 0.1, 500);
    this.transformSystem.update();
  }

  async createDevice() {
    this.setupDevice = new SetupDevice(this.canvas);
    await this.setupDevice.init();
    this.device = this.setupDevice.device;
    this.context = this.setupDevice.context;
  }

  createSphereAssets() {
    this.sphereInstance = new SphereInstance(this.device);
    this.orbitControls = new OrbitControls(this.canvas, 5);
  }

  render = (timestamp: number) => {
    this.orbitControls.updateCamera();
    const view = this.orbitControls.getViewMatrix();
    this.transformSystem.setView(view);
    this.transformSystem.update();

    const commandEncoder: GPUCommandEncoder =
      this.device.createCommandEncoder();

    const swapView = this.context.getCurrentTexture().createView();
    const renderpass: GPURenderPassEncoder = this.renderTarget.beginMainPass(
      commandEncoder,
      swapView
    );

    this.renderPipeline.draw(renderpass);
    renderpass.end();

    this.device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(this.render);
  };
}
