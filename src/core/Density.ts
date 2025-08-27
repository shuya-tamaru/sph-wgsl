import { SphereTransform } from "./SphereTransform";
import densityShader from "../shaders/density.wgsl";
import { SphSettings } from "./SphSettings";

export class Density {
  private device: GPUDevice;
  private sphereTransform: SphereTransform;
  private sphSettings: SphSettings;

  private cellStartIndicesBuffer: GPUBuffer;
  private cellCountsBuffer: GPUBuffer;
  private gridCountBuffer: GPUBuffer;
  private gridSizeParams: GPUBuffer;

  private densityBuffer: GPUBuffer;

  private pipeline: GPUComputePipeline;
  private bindGroupLayout: GPUBindGroupLayout; // ← layout は固定で持つ

  constructor(
    device: GPUDevice,
    sphereTransform: SphereTransform,
    sphSettings: SphSettings,
    cellStartIndicesBuffer: GPUBuffer,
    cellCountsBuffer: GPUBuffer,
    gridCountBuffer: GPUBuffer,
    gridSizeParams: GPUBuffer
  ) {
    this.device = device;
    this.sphereTransform = sphereTransform;
    this.sphSettings = sphSettings;
    this.cellStartIndicesBuffer = cellStartIndicesBuffer;
    this.cellCountsBuffer = cellCountsBuffer;
    this.gridCountBuffer = gridCountBuffer;
    this.gridSizeParams = gridSizeParams;

    this.initPipelineAndBuffers();
  }

  private initPipelineAndBuffers() {
    const module = this.device.createShaderModule({ code: densityShader });

    // 出力バッファ
    const bytes = this.sphereTransform.sphereCount * 4; // f32 × N
    this.densityBuffer = this.device.createBuffer({
      size: bytes,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
      label: "densityBuffer",
    });

    // layout は固定でOK
    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        }, // positions (In)
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        }, // densities (RW)
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        }, // transformParams
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        }, // densityParams
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        }, // cellStart
        {
          binding: 5,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
        }, // cellCounts
        {
          binding: 6,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        }, // gridParams
        {
          binding: 7,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
        }, // gridSizeParams
      ],
    });

    this.pipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout],
      }),
      compute: { module, entryPoint: "cs_main" },
    });
  }

  // ★ 毎フレーム“今の In”で bindGroup を作る
  private makeBindGroup(): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.sphereTransform.positionBufferIn },
        }, // ← swap 後の In
        { binding: 1, resource: { buffer: this.densityBuffer } },
        {
          binding: 2,
          resource: { buffer: this.sphereTransform.transformParamsBuffer },
        },
        {
          binding: 3,
          resource: { buffer: this.sphSettings.densityParamsBuffer },
        },
        { binding: 4, resource: { buffer: this.cellStartIndicesBuffer } },
        { binding: 5, resource: { buffer: this.cellCountsBuffer } },
        { binding: 6, resource: { buffer: this.gridCountBuffer } },
        { binding: 7, resource: { buffer: this.gridSizeParams } },
      ],
    });
  }

  buildIndex(encoder: GPUCommandEncoder) {
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.makeBindGroup());
    pass.dispatchWorkgroups(Math.ceil(this.sphereTransform.sphereCount / 64));
    pass.end();
  }

  getDensityBuffer() {
    return this.densityBuffer;
  }

  // もし sphereCount 変更後に再初期化が必要なら
  destroy() {
    this.densityBuffer.destroy?.();
  }
}
