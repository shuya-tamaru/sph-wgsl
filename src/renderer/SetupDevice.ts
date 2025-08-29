export class SetupDevice {
  canvas: HTMLCanvasElement;
  adapter: GPUAdapter;
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init() {
    // Check if WebGPU is supported
    if (!navigator.gpu) {
      this.showWebGPUError();
      throw new Error("WebGPU not supported");
    }

    this.adapter = (await navigator.gpu.requestAdapter()) as GPUAdapter;
    if (!this.adapter) {
      this.showWebGPUError();
      throw new Error("No WebGPU adapter found");
    }

    this.device = (await this.adapter.requestDevice()) as GPUDevice;
    const context = this.canvas.getContext("webgpu");
    if (!context) {
      this.showWebGPUError();
      throw new Error("WebGPU context not supported");
    }

    this.context = context as unknown as GPUCanvasContext;
    this.format = "bgra8unorm";
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque",
    });

    return {
      adapter: this.adapter,
      device: this.device,
      context: this.context,
      format: this.format,
    };
  }

  private showWebGPUError() {
    const errorContainer = document.getElementById("error-container");
    if (errorContainer) {
      errorContainer.classList.add("show");
    }

    // Hide the main canvas
    const canvas = document.getElementById("gfx-main");
    if (canvas) {
      canvas.style.display = "none";
    }

    // Hide GUI if it exists
    const guiContainer = document.querySelector('.lil-gui');
    if (guiContainer) {
      (guiContainer as HTMLElement).style.display = "none";
    }
  }
}
