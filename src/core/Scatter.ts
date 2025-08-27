import scatterShader from "../shaders/scatter.wgsl";

export class Scatter {
  private device: GPUDevice;
  private cellIndicesBuffer: GPUBuffer;
  private cellStartIndicesBuffer: GPUBuffer;
  public gridSphereIdsBuffer: GPUBuffer;
  private cellOffsetsBuffer: GPUBuffer;
  private transformParamsBuffer: GPUBuffer;
  public sphereCount: number;
  public totalCellCount: number;

  private pipeline: GPUComputePipeline;
  private bindGroupLayout: GPUBindGroupLayout;

  constructor(
    device: GPUDevice,
    cellIndicesBuffer: GPUBuffer,
    cellStartIndicesBuffer: GPUBuffer,
    transformParamsBuffer: GPUBuffer,
    sphereCount: number,
    totalCellCount: number
  ) {
    this.device = device;
    this.cellIndicesBuffer = cellIndicesBuffer;
    this.cellStartIndicesBuffer = cellStartIndicesBuffer;
    this.transformParamsBuffer = transformParamsBuffer;
    this.sphereCount = sphereCount;
    this.totalCellCount = totalCellCount;

    this.initPipelineAndBuffers();
  }
  private initPipelineAndBuffers() {
    this.createBuffer();
    const module = this.device.createShaderModule({
      code: scatterShader,
    });

    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }, // cellIndicesBuffer
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }, // cellStartIndicesBuffer
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // gridParticleIdsBuffer
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // cellOffsetsBuffer
        },
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // transformParamsBuffer
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
          resource: { buffer: this.cellIndicesBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.cellStartIndicesBuffer },
        },
        {
          binding: 2,
          resource: { buffer: this.gridSphereIdsBuffer },
        },
        {
          binding: 3,
          resource: { buffer: this.cellOffsetsBuffer },
        },
        {
          binding: 4,
          resource: { buffer: this.transformParamsBuffer },
        },
      ],
    });
  }

  private createBuffer() {
    this.gridSphereIdsBuffer = this.device.createBuffer({
      size: this.sphereCount * 4,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });

    this.cellOffsetsBuffer = this.device.createBuffer({
      size: this.totalCellCount * 4,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
    this.device.queue.writeBuffer(
      this.cellOffsetsBuffer,
      0,
      new Uint32Array(this.totalCellCount)
    );
  }

  resetCellOffsets() {
    this.device.queue.writeBuffer(
      this.cellOffsetsBuffer,
      0,
      new Uint32Array(this.totalCellCount)
    );
  }

  buildIndex(encoder: GPUCommandEncoder) {
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.makeBindGroup());
    pass.dispatchWorkgroups(Math.ceil(this.sphereCount / 64));
    pass.end();
  }
}
