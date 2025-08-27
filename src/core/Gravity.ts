import gravityShader from "../shaders/gravity.wgsl";
import { SphereTransform } from "./SphereTransform";

export class Gravity {
  private device: GPUDevice;
  private sphereTransform: SphereTransform;
  private timeStepBuffer: GPUBuffer;

  private pipeline: GPUComputePipeline;
  private bindGroup: GPUBindGroup;

  constructor(
    device: GPUDevice,
    sphereTransform: SphereTransform,
    timeStepBuffer: GPUBuffer
  ) {
    this.device = device;
    this.sphereTransform = sphereTransform;
    this.timeStepBuffer = timeStepBuffer;
    this.init();
  }

  private init() {
    const module = this.device.createShaderModule({
      code: gravityShader,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
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
        bindGroupLayouts: [bindGroupLayout],
      }),
      compute: { module, entryPoint: "cs_main" },
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
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
    pass.setBindGroup(0, this.bindGroup);
    pass.dispatchWorkgroups(Math.ceil(this.sphereTransform.sphereCount / 64));
    pass.end();
  }
}
