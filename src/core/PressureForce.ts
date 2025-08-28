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

  private cellStartIndicesBuffer: GPUBuffer;
  private cellCountsBuffer: GPUBuffer;
  private gridCountBuffer: GPUBuffer;
  private gridSizeParams: GPUBuffer;

  private pipeline: GPUComputePipeline;
  private bindGroupLayout: GPUBindGroupLayout;

  constructor(
    device: GPUDevice,
    sphereTransform: SphereTransform,
    densityBuffer: GPUBuffer,
    pressureBuffer: GPUBuffer,
    sphSettings: SphSettings,
    cellStartIndicesBuffer: GPUBuffer,
    cellCountsBuffer: GPUBuffer,
    gridCountBuffer: GPUBuffer,
    gridSizeParams: GPUBuffer
  ) {
    this.device = device;
    this.sphereTransform = sphereTransform;
    this.densityBuffer = densityBuffer;
    this.pressureBuffer = pressureBuffer;
    this.sphSettings = sphSettings;
    this.cellStartIndicesBuffer = cellStartIndicesBuffer;
    this.cellCountsBuffer = cellCountsBuffer;
    this.gridCountBuffer = gridCountBuffer;
    this.gridSizeParams = gridSizeParams;
    this.initPipelineAndBuffers();
  }

  private initPipelineAndBuffers() {
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
        { binding: 1, resource: { buffer: this.densityBuffer } },
        { binding: 2, resource: { buffer: this.pressureBuffer } },
        {
          binding: 3,
          resource: { buffer: this.sphereTransform.transformParamsBuffer },
        },
        {
          binding: 4,
          resource: { buffer: this.sphSettings.pressureForceParamsBuffer },
        },
        { binding: 5, resource: { buffer: this.pressureForceBuffer } },
        { binding: 6, resource: { buffer: this.cellStartIndicesBuffer } },
        { binding: 7, resource: { buffer: this.cellCountsBuffer } },
        { binding: 8, resource: { buffer: this.gridCountBuffer } },
        { binding: 9, resource: { buffer: this.gridSizeParams } },
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

  getPressureForceBuffer() {
    return this.pressureForceBuffer;
  }

  destroy() {
    this.pressureForceBuffer.destroy();
  }
}
