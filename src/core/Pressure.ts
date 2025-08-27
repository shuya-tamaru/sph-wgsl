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
  private bindGroupLayout: GPUBindGroupLayout;

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
    this.initPipelineAndBuffers();
  }

  private initPipelineAndBuffers() {
    const module = this.device.createShaderModule({
      code: pressureShader,
    });

    this.pressureBuffer = this.device.createBuffer({
      size: this.sphereTransform.sphereCount * 4,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });

    this.bindGroupLayout = this.device.createBindGroupLayout({
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
    pass.setBindGroup(0, this.makeBindGroup());
    pass.dispatchWorkgroups(Math.ceil(this.sphereTransform.sphereCount / 64));
    pass.end();
  }

  getPressureBuffer() {
    return this.pressureBuffer;
  }
}
