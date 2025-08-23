export class SphSettings {
  private device: GPUDevice;
  private h: number;
  private h2: number;
  private h3: number;
  private h9: number;
  private poly6: number;
  private spiky: number;
  private viscosity: number;
  private restDensity: number;
  private mass: number;
  private smoothingRadius: number;
  private pressureStiffness: number;
  private viscosityMu: number;
  private radius: number;

  private densityParams: {
    mass: number;
    h: number;
    h2: number;
    h3: number;
    poly6: number;
    _pad0: number;
    _pad1: number;
    _pad2: number;
  };

  private densityParamsBuffer: GPUBuffer;

  constructor(device: GPUDevice) {
    this.device = device;
    this.h = 3.0;
    this.h2 = this.h * this.h;
    this.h3 = this.h * this.h2;
    this.h9 = this.h3 * this.h3 * this.h3;
    this.poly6 = 315 / (64 * Math.PI * this.h9);
    this.spiky = -45 / (Math.PI * this.h3);
    this.viscosity = 45 / (Math.PI * this.h2);

    this.mass = 1.0;
    this.init();
  }

  init() {
    this.createBuffer();
  }
  createBuffer() {
    this.densityParamsBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const densityParams = new ArrayBuffer(32);
    const f32View_sph = new Float32Array(densityParams);
    f32View_sph[0] = this.mass;
    f32View_sph[1] = this.h;
    f32View_sph[2] = this.h2;
    f32View_sph[3] = this.h3;
    f32View_sph[4] = this.poly6;
    f32View_sph[5] = 0;
    f32View_sph[6] = 0;
    f32View_sph[7] = 0;
    this.device.queue.writeBuffer(this.densityParamsBuffer, 0, densityParams);
  }

  getDensityParamsBuffer() {
    return this.densityParamsBuffer;
  }
}
