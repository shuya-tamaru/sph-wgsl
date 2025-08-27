import calcCellStartIndicesShader from "../shaders/calcCellStartIndices.wgsl";

export class CalcStartIndices {
  private device: GPUDevice;
  public cellStartIndicesBuffer: GPUBuffer;
  public gridCountBuffer: GPUBuffer;
  public cellCountsBuffer: GPUBuffer;
  public totalCellCount: number;

  private pipeline: GPUComputePipeline;
  private bindGroup: GPUBindGroup;

  constructor(
    device: GPUDevice,
    gridCountBuffer: GPUBuffer,
    cellCountsBuffer: GPUBuffer,
    totalCellCount: number
  ) {
    this.device = device;
    this.gridCountBuffer = gridCountBuffer;
    this.cellCountsBuffer = cellCountsBuffer;
    this.totalCellCount = totalCellCount;

    this.createBuffer();
    this.init();
  }

  private init() {
    const module = this.device.createShaderModule({
      code: calcCellStartIndicesShader,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // cellCountsBuffer
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // cellStartIndicesBuffer
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // gridCountParams
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
          resource: { buffer: this.cellCountsBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.cellStartIndicesBuffer },
        },
        {
          binding: 2,
          resource: { buffer: this.gridCountBuffer },
        },
      ],
    });
  }

  private createBuffer() {
    this.cellStartIndicesBuffer = this.device.createBuffer({
      size: this.totalCellCount * 4,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
  }

  buildIndex(encoder: GPUCommandEncoder) {
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.dispatchWorkgroups(Math.ceil(this.totalCellCount / 64));
    pass.end();
  }
}
