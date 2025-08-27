import reorderShader from "../shaders/reorder.wgsl";

export class ReOrder {
  private device: GPUDevice;
  private gridSphereIdsBuffer: GPUBuffer;
  private transformParamsBuffer: GPUBuffer;
  private sphereCount: number;
  private positionsBuffer: GPUBuffer;
  private velocitiesBuffer: GPUBuffer;

  private pipeline: GPUComputePipeline;
  private bindGroup: GPUBindGroup;

  constructor(
    device: GPUDevice,
    positionsBuffer: GPUBuffer,
    velocitiesBuffer: GPUBuffer,
    gridSphereIdsBuffer: GPUBuffer,
    transformParamsBuffer: GPUBuffer,
    sphereCount: number
  ) {
    this.device = device;
    this.positionsBuffer = positionsBuffer;
    this.velocitiesBuffer = velocitiesBuffer;
    this.gridSphereIdsBuffer = gridSphereIdsBuffer;
    this.transformParamsBuffer = transformParamsBuffer;
    this.sphereCount = sphereCount;

    this.init();
  }

  private init() {
    const module = this.device.createShaderModule({
      code: reorderShader,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // positionsBuffer
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" }, // velocitiesBuffer
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" }, // gridSphereIdsBuffer
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }, // transformParamsBuffer
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
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.positionsBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.velocitiesBuffer },
        },
        {
          binding: 2,
          resource: { buffer: this.gridSphereIdsBuffer },
        },
        {
          binding: 3,
          resource: { buffer: this.transformParamsBuffer },
        },
      ],
    });
  }

  buildIndex(encoder: GPUCommandEncoder) {
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.dispatchWorkgroups(Math.ceil(this.sphereCount / 128));
    pass.end();
  }
}
