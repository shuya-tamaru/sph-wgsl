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
  private bindGroupLayout: GPUBindGroupLayout;
  private cellStartIndicesBuffer: GPUBuffer;
  private cellCountsBuffer: GPUBuffer;
  private gridCountBuffer: GPUBuffer;
  private gridSizeParams: GPUBuffer;

  constructor(
    device: GPUDevice,
    sphereTransform: SphereTransform,
    sphSettings: SphSettings,
    densityBuffer: GPUBuffer,
    cellStartIndicesBuffer: GPUBuffer,
    cellCountsBuffer: GPUBuffer,
    gridCountBuffer: GPUBuffer,
    gridSizeParams: GPUBuffer
  ) {
    this.device = device;
    this.sphereTransform = sphereTransform;
    this.sphSettings = sphSettings;
    this.densityBuffer = densityBuffer;
    this.cellStartIndicesBuffer = cellStartIndicesBuffer;
    this.cellCountsBuffer = cellCountsBuffer;
    this.gridCountBuffer = gridCountBuffer;
    this.gridSizeParams = gridSizeParams;
    this.initPipelineAndBuffers();
  }
  private initPipelineAndBuffers() {
    const module = this.device.createShaderModule({
      code: viscosityShader,
    });
    this.viscosityBuffer = this.device.createBuffer({
      size: this.sphereTransform.sphereCount * 4 * 4,
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
        {
          binding: 6,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        }, // cellStart
        {
          binding: 7,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        }, // cellCounts
        {
          binding: 8,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        }, // gridParams
        {
          binding: 9,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        }, // gridSizeParams
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
        {
          binding: 6,
          resource: { buffer: this.cellStartIndicesBuffer },
        },
        {
          binding: 7,
          resource: { buffer: this.cellCountsBuffer },
        },
        {
          binding: 8,
          resource: { buffer: this.gridCountBuffer },
        },
        {
          binding: 9,
          resource: { buffer: this.gridSizeParams },
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

  getViscosityBuffer() {
    return this.viscosityBuffer;
  }

  destroy() {
    this.viscosityBuffer.destroy();
  }
}
