export class SphSettings {
  private device: GPUDevice;
  private h: number;
  private h2: number;
  private h3: number;
  private h6: number;
  private h9: number;
  private poly6: number;
  private spiky: number;
  private viscosity: number;
  private restDensity: number;
  private mass: number;
  private smoothingRadius: number;
  private pressureStiffness: number;
  private viscosityMu: number;
  private tangentDamping: number;
  private restitution: number;

  public densityParamsBuffer: GPUBuffer;
  public pressureParamsBuffer: GPUBuffer;
  public pressureForceParamsBuffer: GPUBuffer;
  public integrateParamsBuffer: GPUBuffer;

  constructor(device: GPUDevice) {
    this.device = device;
    this.h = 3.0;
    this.h2 = this.h * this.h;
    this.h3 = this.h * this.h2;
    this.h6 = this.h3 * this.h3;
    this.h9 = this.h3 * this.h3 * this.h3;
    this.poly6 = 315 / (64 * Math.PI * this.h9);
    this.spiky = -45 / (Math.PI * this.h6);
    this.viscosity = 45 / (Math.PI * this.h2);
    this.mass = 1.0;
    this.restDensity = 0.1;
    this.pressureStiffness = 1.0;
    this.viscosityMu = 1.0;
    this.tangentDamping = 0.1;
    this.restitution = 0.1;

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

    this.pressureForceParamsBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const pressureForceParams = new ArrayBuffer(32);
    const f32View_pressureForce = new Float32Array(pressureForceParams);
    f32View_pressureForce[0] = this.h;
    f32View_pressureForce[1] = this.h2;
    f32View_pressureForce[2] = this.spiky;
    f32View_pressureForce[3] = this.mass;
    f32View_pressureForce[4] = this.restDensity;
    f32View_pressureForce[5] = 0;
    f32View_pressureForce[6] = 0;
    f32View_pressureForce[7] = 0;

    this.device.queue.writeBuffer(
      this.pressureForceParamsBuffer,
      0,
      pressureForceParams
    );

    this.integrateParamsBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const integrateParams = new ArrayBuffer(16);
    const f32View_integrate = new Float32Array(integrateParams);
    f32View_integrate[0] = this.tangentDamping;
    f32View_integrate[1] = this.restitution;
    f32View_integrate[2] = this.mass;
    f32View_integrate[3] = 0;
    this.device.queue.writeBuffer(
      this.integrateParamsBuffer,
      0,
      integrateParams
    );
  }
}
