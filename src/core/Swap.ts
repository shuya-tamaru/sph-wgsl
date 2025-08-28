import { SphereTransform } from "./SphereTransform";
import swapShader from "../shaders/swap.wgsl";

export class Swap {
  private device: GPUDevice;
  private sphereTransform: SphereTransform;

  private pipeline: GPUComputePipeline;
  private bindGroupLayout: GPUBindGroupLayout;

  constructor(device: GPUDevice, sphereTransform: SphereTransform) {
    this.device = device;
    this.sphereTransform = sphereTransform;

    this.initPipelineAndBuffers();
  }

  private initPipelineAndBuffers() {
    const module = this.device.createShaderModule({
      code: swapShader,
    });
    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }, // positionsBufferOut
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }, // velocitiesBufferOut
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // positionsBufferIn
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // velocitiesBufferIn
        },
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // transformParams
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout],
    });

    this.pipeline = this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: {
        module: module,
        entryPoint: "cs_main",
      },
    });
  }

  private makeBindGroup(): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.sphereTransform.positionBufferOut },
        },
        {
          binding: 1,
          resource: { buffer: this.sphereTransform.velocityBufferOut },
        },
        {
          binding: 2,
          resource: { buffer: this.sphereTransform.positionBufferIn },
        },
        {
          binding: 3,
          resource: { buffer: this.sphereTransform.velocityBufferIn },
        },
        {
          binding: 4,
          resource: { buffer: this.sphereTransform.transformParamsBuffer },
        },
      ],
    });
  }

  buildIndex(encoder: GPUCommandEncoder) {
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.makeBindGroup());
    pass.dispatchWorkgroups(Math.ceil(this.sphereTransform.sphereCount / 64));
    pass.end();
  }
}
