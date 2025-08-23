export class RenderTarget {
  private device: GPUDevice;
  private canvas: HTMLCanvasElement;

  private depth: GPUTexture;
  private depthView: GPUTextureView;
  private clear = { r: 1, g: 1, b: 1, a: 1 };

  constructor(device: GPUDevice, canvas: HTMLCanvasElement) {
    this.device = device;
    this.canvas = canvas;
    this.recreateDepth();
  }

  recreateDepth() {
    if (this.depth) this.depth.destroy();
    this.depth = this.device.createTexture({
      size: { width: this.canvas.width, height: this.canvas.height },
      format: "depth32float",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.depthView = this.depth.createView();

    // Validate that the depth texture was created successfully
    if (!this.depth || !this.depthView) {
      throw new Error("Failed to create depth texture or view");
    }
  }

  updateCanvasSize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.recreateDepth();
  }

  beginMainPass(encoder: GPUCommandEncoder, colorView: GPUTextureView) {
    // Ensure depth texture is available
    if (!this.depthView) {
      throw new Error(
        "Depth view is not initialized. Call recreateDepth() first."
      );
    }

    return encoder.beginRenderPass({
      colorAttachments: [
        {
          view: colorView,
          clearValue: this.clear,
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: this.depthView,
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });
  }
}
