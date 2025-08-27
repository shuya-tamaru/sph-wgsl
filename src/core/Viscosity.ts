import { SphereTransform } from "./SphereTransform";
import { SphSettings } from "./SphSettings";
import viscosityShader from "../shaders/viscosity.wgsl";

export class Viscosity {
  private device: GPUDevice;
  private sphereTransform: SphereTransform;
  private sphSettings: SphSettings;
  private densityBuffer: GPUBuffer;
  private viscosityBuffer: GPUBuffer;

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
      code: viscosityShader,
    });
    this.viscosityBuffer = this.device.createBuffer({
      size: this.sphereTransform.sphereCount * 4 * 4, // 1パーティクルあたりfloat1つ (4バイト)
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
          buffer: { type: "read-only-storage" }, // velocitiesBuffer
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }, // densityBuffer
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // transformParams
        },
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // viscosityParams
        },
        {
          binding: 5,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // viscosityBuffer
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

        {
          binding: 2,
          resource: { buffer: this.densityBuffer },
        },

        {
          binding: 3,
          resource: { buffer: this.sphereTransform.transformParamsBuffer },
        },

        {
          binding: 4,
          resource: { buffer: this.sphSettings.viscosityParamsBuffer },
        },

        {
          binding: 5,
          resource: { buffer: this.viscosityBuffer },
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

  getViscosityBuffer() {
    return this.viscosityBuffer;
  }
}
