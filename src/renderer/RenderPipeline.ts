import shader from "../shaders/shader.wgsl";
import { SphereInstance } from "../core/SphereInstance";
import { SphereTransform } from "../core/SphereTransform";

export class RenderPipeline {
  private device: GPUDevice;
  private format: GPUTextureFormat;

  private pipeline: GPURenderPipeline;
  private bindGroupLayout: GPUBindGroupLayout;
  private sphereInstance: SphereInstance;
  private sphereTransform: SphereTransform;
  private transformBuffer: GPUBuffer;

  constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    transformBuffer: GPUBuffer,
    sphereTransform: SphereTransform
  ) {
    this.device = device;
    this.format = format;
    this.sphereInstance = new SphereInstance(device);
    this.transformBuffer = transformBuffer;
    this.sphereTransform = sphereTransform;
  }

  public init() {
    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {}, //transformParams
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" }, //position
        },
        {
          binding: 2,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" }, //velocity
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout],
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

  private makeBindGroup(): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.transformBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.sphereTransform.positionBufferIn },
        },
        {
          binding: 2,
          resource: { buffer: this.sphereTransform.velocityBufferIn },
        },
      ],
    });
  }

  draw(pass: GPURenderPassEncoder) {
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.makeBindGroup());
    pass.setVertexBuffer(0, this.sphereInstance.getVertexBuffer());
    pass.setIndexBuffer(this.sphereInstance.getIndexBuffer(), "uint16");
    pass.drawIndexed(
      this.sphereInstance.getIndexCount(),
      this.sphereTransform.sphereCount
    );
  }

  dispose() {}
}
