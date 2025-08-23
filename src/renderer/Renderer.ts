import { SetupDevice } from "./SetupDevice";

export class Renderer {
  canvas: HTMLCanvasElement;
  adapter: GPUAdapter;
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  pipeline: GPURenderPipeline;
  setupDevice: SetupDevice;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init() {
    await this.createDevice();
  }

  async createDevice() {
    this.setupDevice = new SetupDevice(this.canvas);
    await this.setupDevice.init();
    this.device = this.setupDevice.device;
  }
}
