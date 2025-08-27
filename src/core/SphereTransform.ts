export class SphereTransform {
  private device: GPUDevice;
  public positions: Float32Array;
  public velocities: Float32Array; // 速度データ（SPH法/重力シミュレーション用）

  public positionBufferIn: GPUBuffer;
  public velocityBufferIn: GPUBuffer;
  public positionBufferOut: GPUBuffer;
  public velocityBufferOut: GPUBuffer;
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
    this.positionBufferIn = this.device.createBuffer({
      size: this.positions.byteLength,
      usage:
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
    new Float32Array(this.positionBufferIn.getMappedRange()).set(
      this.positions
    );
    this.positionBufferIn.unmap();

    // velocityBufferは初期値全部0
    this.velocityBufferIn = this.device.createBuffer({
      size: this.velocities.byteLength,
      usage:
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
    new Float32Array(this.velocityBufferIn.getMappedRange()).set(
      this.velocities.fill(0)
    );
    this.velocityBufferIn.unmap();

    this.positionBufferOut = this.device.createBuffer({
      size: this.positions.byteLength,
      usage:
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
    this.positionBufferOut.unmap();

    this.velocityBufferOut = this.device.createBuffer({
      size: this.velocities.byteLength,
      usage:
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
    this.velocityBufferOut.unmap();

    this.transformParamsBuffer = this.device.createBuffer({
      size: 16,
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

  updateBoxUBO(width: number, depth: number) {
    this.boxWidth = width;
    this.boxDepth = depth;

    const buf = new ArrayBuffer(16);
    const f32 = new Float32Array(buf);
    const u32 = new Uint32Array(buf);
    f32[0] = width;
    f32[1] = this.boxHeight;
    f32[2] = depth;
    u32[3] = this.sphereCount;

    this.device.queue.writeBuffer(this.transformParamsBuffer, 0, buf);
  }

  updateSphereCount(count: number) {
    this.sphereCount = count;
    this.positions = new Float32Array(this.sphereCount * 4);
    this.velocities = new Float32Array(this.sphereCount * 4);
    this.createTransformData();
    this.createBuffer();
  }

  destroy() {
    this.positionBufferIn.destroy();
    this.velocityBufferIn.destroy();
    this.positionBufferOut.destroy();
    this.velocityBufferOut.destroy();
    this.transformParamsBuffer.destroy();
  }
}
