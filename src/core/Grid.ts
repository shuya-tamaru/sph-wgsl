import calcCellIndicesShader from "../shaders/calcCellIndices.wgsl";
import { SphereTransform } from "./SphereTransform";
export class Grid {
  private device: GPUDevice;
  private cellSize: number;
  private sphereTransform: SphereTransform;
  public cellIndicesBuffer: GPUBuffer;
  public cellCountsBuffer: GPUBuffer;
  public gridSizeBuffer: GPUBuffer;
  public gridCountBuffer: GPUBuffer;
  private gridSizeParams: {
    xMin: number;
    yMin: number;
    zMin: number;
    cellSize: number;
  };
  private gridCountParams: {
    x: number;
    y: number;
    z: number;
    total: number;
  };
  public sphereCount: number;
  public cellCountX: number;
  public cellCountY: number;
  public cellCountZ: number;
  public totalCellCount: number;
  private positionBuffer: GPUBuffer;

  private pipeline: GPUComputePipeline;
  private bindGroup: GPUBindGroup;

  constructor(
    device: GPUDevice,
    h: number,
    sphereTransform: SphereTransform,
    positionBuffer: GPUBuffer
  ) {
    this.device = device;
    this.positionBuffer = positionBuffer;
    this.cellSize = h;
    this.sphereCount = sphereTransform.sphereCount;
    this.sphereTransform = sphereTransform;

    this.cellCountX = Math.ceil(sphereTransform.boxWidth / this.cellSize);
    this.cellCountY = Math.ceil(sphereTransform.boxHeight / this.cellSize);
    this.cellCountZ = Math.ceil(sphereTransform.boxDepth / this.cellSize);
    this.totalCellCount = this.cellCountX * this.cellCountY * this.cellCountZ;

    this.gridCountParams = {
      x: this.cellCountX,
      y: this.cellCountY,
      z: this.cellCountZ,
      total: this.totalCellCount,
    };

    this.gridSizeParams = {
      xMin: -sphereTransform.boxWidth / 2,
      yMin: -sphereTransform.boxHeight / 2,
      zMin: -sphereTransform.boxDepth / 2,
      cellSize: this.cellSize,
    };

    this.createBuffer();
    this.init();
  }

  private init() {
    const module = this.device.createShaderModule({
      code: calcCellIndicesShader,
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
          buffer: { type: "storage" }, // cellIndicesBuffer
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // cellCountsBuffer
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // gridParams
        },
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // gridSizeParams
        },
        {
          binding: 5,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // sphereTransformBuffer
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
          resource: { buffer: this.positionBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.cellIndicesBuffer },
        },
        {
          binding: 2,
          resource: { buffer: this.cellCountsBuffer },
        },
        {
          binding: 3,
          resource: { buffer: this.gridCountBuffer },
        },
        {
          binding: 4,
          resource: { buffer: this.gridSizeBuffer },
        },
        {
          binding: 5,
          resource: { buffer: this.sphereTransform.transformParamsBuffer },
        },
      ],
    });
  }

  private createBuffer() {
    this.cellIndicesBuffer = this.device.createBuffer({
      size: this.sphereCount * 4,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });

    this.cellCountsBuffer = this.device.createBuffer({
      size: this.totalCellCount * 4,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
    const cellCounts = new Uint32Array(this.totalCellCount);
    cellCounts.fill(0);
    this.device.queue.writeBuffer(this.cellCountsBuffer, 0, cellCounts);

    this.gridSizeBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const gridSizeArray = new ArrayBuffer(16);
    const f32View = new Float32Array(gridSizeArray);
    f32View[0] = this.gridSizeParams.xMin;
    f32View[1] = this.gridSizeParams.yMin;
    f32View[2] = this.gridSizeParams.zMin;
    f32View[3] = this.gridSizeParams.cellSize;
    this.device.queue.writeBuffer(this.gridSizeBuffer, 0, gridSizeArray);

    this.gridCountBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const gridCountArray = new ArrayBuffer(16);
    const u32View = new Uint32Array(gridCountArray);
    u32View[0] = this.gridCountParams.x;
    u32View[1] = this.gridCountParams.y;
    u32View[2] = this.gridCountParams.z;
    u32View[3] = this.gridCountParams.total;
    this.device.queue.writeBuffer(this.gridCountBuffer, 0, gridCountArray);
  }

  buildIndex(encoder: GPUCommandEncoder) {
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.dispatchWorkgroups(Math.ceil(this.sphereCount / 64));
    pass.end();
  }
}
