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

  public densityParamsBuffer: GPUBuffer;
  public pressureParamsBuffer: GPUBuffer;

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
    this.restDensity = 0.1;
    this.pressureStiffness = 1.0;
    this.viscosityMu = 1.0;

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
    const f32View_density = new Float32Array(densityParams);
    f32View_density[0] = this.mass;
    f32View_density[1] = this.h;
    f32View_density[2] = this.h2;
    f32View_density[3] = this.h3;
    f32View_density[4] = this.poly6;
    f32View_density[5] = 0;
    f32View_density[6] = 0;
    f32View_density[7] = 0;
    this.device.queue.writeBuffer(this.densityParamsBuffer, 0, densityParams);

    this.pressureParamsBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const pressureParams = new ArrayBuffer(16);
    const f32View_pressure = new Float32Array(pressureParams);
    f32View_pressure[0] = this.pressureStiffness;
    f32View_pressure[1] = this.restDensity;
    f32View_pressure[2] = 0;
    f32View_pressure[3] = 0;
    this.device.queue.writeBuffer(this.pressureParamsBuffer, 0, pressureParams);
  }

  getDensityParamsBuffer() {
    return this.densityParamsBuffer;
  }

  getPressureParamsBuffer() {
    return this.pressureParamsBuffer;
  }
}
