import { SphereTransform } from "./SphereTransform";
import densityShader from "../shaders/density.wgsl";
import { SphSettings } from "./SphSettings";

export class Density {
  private device: GPUDevice;
  private sphereTransform: SphereTransform;
  private densityBuffer: GPUBuffer;
  private sphSettings: SphSettings;

  private pipeline: GPUComputePipeline;
  private bindGroup: GPUBindGroup;

  constructor(
    device: GPUDevice,
    sphereTransform: SphereTransform,
    sphSettings: SphSettings
  ) {
    this.device = device;
    this.sphereTransform = sphereTransform;
    this.sphSettings = sphSettings;
    this.init();
  }

  private init() {
    const module = this.device.createShaderModule({
      code: densityShader,
    });

    this.densityBuffer = this.device.createBuffer({
      size: this.sphereTransform.sphereCount * 4,
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
          buffer: { type: "storage" }, // positionsBuffer
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // densityBuffer
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // transformParams
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // sphSettings
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
          resource: { buffer: this.sphSettings.getDensityParamsBuffer() },
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

  getDensityBuffer() {
    return this.densityBuffer;
  }
}
