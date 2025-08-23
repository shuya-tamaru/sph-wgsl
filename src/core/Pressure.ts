import { SphereTransform } from "./SphereTransform";
import { SphSettings } from "./SphSettings";
import pressureShader from "../shaders/pressure.wgsl";

export class Pressure {
  private device: GPUDevice;
  private sphereTransform: SphereTransform;
  private sphSettings: SphSettings;
  private pressureBuffer: GPUBuffer;
  private densityBuffer: GPUBuffer;

  private pipeline: GPUComputePipeline;
  private bindGroup: GPUBindGroup;

  constructor(
    device: GPUDevice,
    sphereTransform: SphereTransform,
    sphSettings: SphSettings,
    densityBuffer: GPUBuffer
  ) {
    this.device = device;
    this.sphereTransform = sphereTransform;
    this.sphSettings = sphSettings;
    this.densityBuffer = densityBuffer;
    this.init();
  }

  private init() {
    const module = this.device.createShaderModule({
      code: pressureShader,
    });

    this.pressureBuffer = this.device.createBuffer({
      size: this.sphereTransform.sphereCount * 4, // 1パーティクルあたりfloat1つ (4バイト)
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
          buffer: { type: "uniform" }, // transformParams
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // pressureParams
        },
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // pressureBuffer
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
          resource: { buffer: this.sphereTransform.positionBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.densityBuffer },
        },
        {
          binding: 2,
          resource: { buffer: this.sphereTransform.transformParamsBuffer },
        },
        {
          binding: 3,
          resource: { buffer: this.sphSettings.pressureParamsBuffer },
        },
        {
          binding: 4,
          resource: { buffer: this.pressureBuffer },
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

  getPressureBuffer() {
    return this.pressureBuffer;
  }
}
