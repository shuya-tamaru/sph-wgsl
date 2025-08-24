export class Grid {
  private device: GPUDevice;
  private cellSize: number;
  private gridCount: number;
  private gridBuffer: GPUBuffer;
  private sphereCount: number;
  private cellCountX: number;
  private cellCountY: number;
  private cellCountZ: number;
  private totalCellCount: number;
  private cellIndicesBuffer: GPUBuffer;

  constructor(
    device: GPUDevice,
    h: number,
    sphereTransformParams: {
      boxWidth: number;
      boxHeight: number;
      boxDepth: number;
      sphereCount: number;
    }
  ) {
    this.device = device;
    this.cellSize = h;
    this.sphereCount = sphereTransformParams.sphereCount;

    this.cellCountX = Math.ceil(sphereTransformParams.boxWidth / this.cellSize);
    this.cellCountY = Math.ceil(
      sphereTransformParams.boxHeight / this.cellSize
    );
    this.cellCountZ = Math.ceil(sphereTransformParams.boxDepth / this.cellSize);
    this.totalCellCount = this.cellCountX * this.cellCountY * this.cellCountZ;

    this.init();
  }

  private init() {}

  private createBuffer() {
    this.cellIndicesBuffer = this.device.createBuffer({
      size: this.sphereCount * 4,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
  }
}
