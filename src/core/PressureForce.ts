import { SphereTransform } from "./SphereTransform";
import { SphSettings } from "./SphSettings";
import pressureForceShader from "../shaders/pressureForce.wgsl";

export class PressureForce {
  private device: GPUDevice;
  private sphereTransform: SphereTransform;
  private sphSettings: SphSettings;
  private pressureForceBuffer: GPUBuffer;
  private densityBuffer: GPUBuffer;
  private pressureBuffer: GPUBuffer;

  private pipeline: GPUComputePipeline;
  private bindGroup: GPUBindGroup;

  constructor(
    device: GPUDevice,
    sphereTransform: SphereTransform,
    densityBuffer: GPUBuffer,
    pressureBuffer: GPUBuffer,
    sphSettings: SphSettings
  ) {
    this.device = device;
    this.sphereTransform = sphereTransform;
    this.densityBuffer = densityBuffer;
    this.pressureBuffer = pressureBuffer;
    this.sphSettings = sphSettings;
    this.init();
  }

  private init() {
    const module = this.device.createShaderModule({
      code: pressureForceShader,
    });

    this.pressureForceBuffer = this.device.createBuffer({
      size: this.sphereTransform.sphereCount * 4 * 4,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }, // positionsBuffer
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }, // densityBuffer
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }, // pressureBuffer
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // transformParams
        },
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // pressureForceParams
        },
        {
          binding: 5,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // pressureForceBuffer
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
          resource: { buffer: this.densityBuffer },
        },
        {
          binding: 2,
          resource: { buffer: this.pressureBuffer },
        },
        {
          binding: 3,
          resource: { buffer: this.sphereTransform.transformParamsBuffer },
        },
        {
          binding: 4,
          resource: { buffer: this.sphSettings.pressureForceParamsBuffer },
        },
        {
          binding: 5,
          resource: { buffer: this.pressureForceBuffer },
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

  getPressureForceBuffer() {
    return this.pressureForceBuffer;
  }
}
