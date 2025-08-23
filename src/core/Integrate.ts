import { TimeStep } from "../utils/TimeStep";
import { PressureForce } from "./PressureForce";
import { SphereTransform } from "./SphereTransform";
import { SphSettings } from "./SphSettings";
import integrateShader from "../shaders/integrate.wgsl";

export class Integrate {
  private device: GPUDevice;
  private sphereTransform: SphereTransform;
  private sphSettings: SphSettings;
  private pressureForce: PressureForce;
  private timestamp: TimeStep;

  private pipeline: GPUComputePipeline;
  private bindGroup: GPUBindGroup;

  constructor(
    device: GPUDevice,
    sphereTransform: SphereTransform,
    sphSettings: SphSettings,
    pressureForce: PressureForce,
    timestamp: TimeStep
  ) {
    this.device = device;
    this.sphereTransform = sphereTransform;
    this.sphSettings = sphSettings;
    this.pressureForce = pressureForce;
    this.timestamp = timestamp;
    this.init();
  }

  private init() {
    const module = this.device.createShaderModule({
      code: integrateShader,
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
          buffer: { type: "read-only-storage" }, // pressureForces
        },
        // {
        //   binding: 3,
        //   visibility: GPUShaderStage.COMPUTE,
        //   buffer: { type: "storage" }, // viscositiesBuffer
        // },
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // sphereTransformParamsBuffer
        },
        {
          binding: 5,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // integrateParamsBuffer
        },
        {
          binding: 6,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // timeStepBuffer
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
        { binding: 0, resource: this.sphereTransform.positionBuffer },
        { binding: 1, resource: this.sphereTransform.velocityBuffer },
        { binding: 2, resource: this.pressureForce.getPressureForceBuffer() },
        // { binding: 3, resource: this.particles.viscosityBuffer },
        { binding: 4, resource: this.sphereTransform.transformParamsBuffer },
        { binding: 5, resource: this.sphSettings.integrateParamsBuffer },
        { binding: 6, resource: this.timestamp.getBuffer() },
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
