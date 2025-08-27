import gravityShader from "../shaders/gravity.wgsl";
import { SphereTransform } from "./SphereTransform";

export class Gravity {
  private device: GPUDevice;
  private sphereTransform: SphereTransform;
  private timeStepBuffer: GPUBuffer;

  private pipeline: GPUComputePipeline;
  private bindGroupLayout: GPUBindGroupLayout; // ← layout は固定で持つ

  constructor(
    device: GPUDevice,
    sphereTransform: SphereTransform,
    timeStepBuffer: GPUBuffer
  ) {
    this.device = device;
    this.sphereTransform = sphereTransform;
    this.timeStepBuffer = timeStepBuffer;
    this.initPipelineAndBuffers();
  }

  private initPipelineAndBuffers() {
    const module = this.device.createShaderModule({
      code: gravityShader,
    });

    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // positionsBuffer
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // velocitiesBuffer
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // timeStepBuffer
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // transformParams
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
        { binding: 2, resource: { buffer: this.timeStepBuffer } },
        {
          binding: 3,
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

  getVelocityBuffer() {
    return this.sphereTransform.velocityBufferOut;
  }
}
