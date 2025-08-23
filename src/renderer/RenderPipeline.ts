import shader from "../shaders/shader.wgsl";
import { SphereInstance } from "../core/SphereInstance";

export class RenderPipeline {
  private device: GPUDevice;
  private format: GPUTextureFormat;

  private pipeline: GPURenderPipeline;
  private bindGroup: GPUBindGroup;
  private sphereInstance: SphereInstance;
  private transformBuffer: GPUBuffer;

  constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    transformBuffer: GPUBuffer
  ) {
    this.device = device;
    this.format = format;
    this.sphereInstance = new SphereInstance(device);
    this.transformBuffer = transformBuffer;
  }

  public init() {
    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {},
        },
      ],
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.transformBuffer } }],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    this.pipeline = this.device.createRenderPipeline({
      vertex: {
        module: this.device.createShaderModule({ code: shader }),
        entryPoint: "vs_main",
        buffers: [this.sphereInstance.getVertexBufferLayout()],
      },
      fragment: {
        module: this.device.createShaderModule({ code: shader }),
        entryPoint: "fs_main",
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: "triangle-list",
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth32float",
      },
      layout: pipelineLayout,
    });
  }

  draw(pass: GPURenderPassEncoder) {
    pass.setPipeline(this.pipeline);
    pass.setVertexBuffer(0, this.sphereInstance.getVertexBuffer());
    pass.setIndexBuffer(this.sphereInstance.getIndexBuffer(), "uint16");
    pass.setBindGroup(0, this.bindGroup);
    pass.drawIndexed(this.sphereInstance.getIndexCount(), 1, 0, 0, 0);
  }

  dispose() {}
}
