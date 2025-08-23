export class SphereTransform {
  private device: GPUDevice;
  public positions: Float32Array;
  public velocities: Float32Array; // 速度データ（SPH法/重力シミュレーション用）
  public colors: Float32Array;

  public positionBuffer: GPUBuffer;
  public velocityBuffer: GPUBuffer;
  public transformParamsBuffer: GPUBuffer;

  public boxWidth: number;
  public boxHeight: number;
  public boxDepth: number;
  public sphereCount: number;

  public transformParams: {
    boxWidth: number;
    boxHeight: number;
    boxDepth: number;
    sphereCount: number;
  };

  constructor(
    device: GPUDevice,
    width: number,
    height: number,
    depth: number,
    sphereCount: number
  ) {
    this.device = device;
    this.boxWidth = width;
    this.boxHeight = height;
    this.boxDepth = depth;
    this.sphereCount = sphereCount;
    this.init();
  }

  init() {
    this.createTransformData();
    this.createBuffer();
  }

  createTransformData() {
    this.positions = new Float32Array(this.sphereCount * 4);
    this.velocities = new Float32Array(this.sphereCount * 4);

    for (let i = 0; i < this.sphereCount; i++) {
      // 高さ方向の初期位置はBoxの下面から中間前の範囲
      this.positions[i * 4 + 0] = (Math.random() - 0.5) * this.boxWidth;
      this.positions[i * 4 + 1] = (Math.random() - 0.5) * this.boxHeight;
      // this.positions[i * 4 + 1] =
      //   -0.5 * this.boxHeight + Math.random() * (0.5 * this.boxHeight);
      this.positions[i * 4 + 2] = (Math.random() - 0.5) * this.boxDepth;
      this.positions[i * 4 + 3] = 0.0; // w成分
    }
  }
  createBuffer() {
    this.positionBuffer = this.device.createBuffer({
      size: this.positions.byteLength,
      usage:
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
    new Float32Array(this.positionBuffer.getMappedRange()).set(this.positions);
    this.positionBuffer.unmap();

    // velocityBufferは初期値全部0
    this.velocityBuffer = this.device.createBuffer({
      size: this.velocities.byteLength,
      usage:
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
    new Float32Array(this.velocityBuffer.getMappedRange()).set(
      this.velocities.fill(0)
    );
    this.velocityBuffer.unmap();

    this.transformParamsBuffer = this.device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });
    const transformParamsArray = new ArrayBuffer(16);
    const u32View = new Uint32Array(transformParamsArray);
    const f32View = new Float32Array(transformParamsArray);
    f32View[0] = this.boxWidth;
    f32View[1] = this.boxHeight;
    f32View[2] = this.boxDepth;
    u32View[3] = this.sphereCount;

    this.device.queue.writeBuffer(
      this.transformParamsBuffer,
      0,
      transformParamsArray
    );
  }
}
