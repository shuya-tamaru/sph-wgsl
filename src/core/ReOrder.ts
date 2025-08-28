import reorderShader from "../shaders/reorder.wgsl";
import { Scatter } from "./Scatter";
import { SphereTransform } from "./SphereTransform";

export class ReOrder {
  private device: GPUDevice;
  private sphereTransform: SphereTransform;
  private scatter: Scatter;

  private pipeline: GPUComputePipeline;
  private bindGroupLayout: GPUBindGroupLayout;

  constructor(
    device: GPUDevice,
    sphereTransform: SphereTransform,
    scatter: Scatter
  ) {
    this.device = device;
    this.sphereTransform = sphereTransform;
    this.scatter = scatter;

    this.initPipelineAndBuffers();
  }

  private initPipelineAndBuffers() {
    const module = this.device.createShaderModule({
      code: reorderShader,
    });

    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }, // positionsBufferIn
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }, // velocitiesBufferIn
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // positionsBufferOut
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // velocitiesBufferOut
        },
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }, // gridSphereIdsBuffer
        },
        {
          binding: 5,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // transformParamsBuffer
        },
      ],
    });

    this.pipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout],
      }),
      compute: { module, entryPoint: "cs_main" },
    });
  }

  private makeBindGroup(): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.sphereTransform.positionBufferIn },
        },
        {
          binding: 1,
          resource: { buffer: this.sphereTransform.velocityBufferIn },
        },
        {
          binding: 2,
          resource: { buffer: this.sphereTransform.positionBufferOut },
        },
        {
          binding: 3,
          resource: { buffer: this.sphereTransform.velocityBufferOut },
        },
        {
          binding: 4,
          resource: { buffer: this.scatter.gridSphereIdsBuffer },
        },
        {
          binding: 5,
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
