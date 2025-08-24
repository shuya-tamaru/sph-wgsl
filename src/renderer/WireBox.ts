import { SphereTransform } from "../core/SphereTransform";
import boundaryWire from "../shaders/boundaryWire.wgsl";
import { TransformSystem } from "./TransformSystem";

export class WireBox {
  private device: GPUDevice;
  private format: GPUTextureFormat;
  private pipeline: GPURenderPipeline;
  private vertexBuffer: GPUBuffer;
  private indexBuffer: GPUBuffer;
  private transformBuffer: GPUBuffer;
  private size: { w: number; h: number; d: number };
  private bindGroup: GPUBindGroup;
  private indexCount = 24;

  constructor(
    device: GPUDevice,
    format: GPUTextureFormat,
    transformBuffer: GPUBuffer,
    sphereTransformParams: SphereTransform
  ) {
    this.device = device;
    this.format = format;
    this.transformBuffer = transformBuffer;
    this.size = {
      w: sphereTransformParams.boxWidth,
      h: sphereTransformParams.boxHeight,
      d: sphereTransformParams.boxDepth,
    };
    this.init();
  }

  private init() {
    const { vertices, indices } = this.createGeometry(this.size);
    this.vertexBuffer = this.device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.indexBuffer = this.device.createBuffer({
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.vertexBuffer, 0, vertices);
    this.device.queue.writeBuffer(this.indexBuffer, 0, indices);

    this.indexCount = indices.length;

    this.createPipeline();
  }

  private createPipeline() {
    const shaderModule = this.device.createShaderModule({
      code: boundaryWire,
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: 16, // float32x4
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x4" }],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: "line-list",
        cullMode: "none",
      },
      depthStencil: this.format
        ? {
            format: "depth32float",
            depthCompare: "less",
            depthWriteEnabled: false,
          }
        : undefined,
    });
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.transformBuffer } }],
    });
  }

  private createGeometry({ w, h, d }: { w: number; h: number; d: number }) {
    const hx = w * 0.5;
    const hy = h * 0.5;
    const hz = d * 0.5;
    const upperOffset = 12.0;

    // prettier-ignore
    const v = new Float32Array([
      -hx,-hy,-hz,0,   +hx,-hy,-hz,0,   +hx,+hy+upperOffset,-hz,0,   -hx,+hy+upperOffset,-hz,0, // 0..3 (near)
      -hx,-hy,+hz,0,   +hx,-hy,+hz,0,   +hx,+hy+upperOffset,+hz,0,   -hx,+hy+upperOffset,+hz,0, // 4..7 (far)
    ]);

    // prettier-ignore
    const idx = new Uint16Array([
      0,1, 1,2, 2,3, 3,0,  // near face
      4,5, 5,6, 6,7, 7,4,  // far face
      0,4, 1,5, 2,6, 3,7,  // vertical
    ]);

    return { vertices: v, indices: idx };
  }

  setSize(size: { w: number; h: number; d: number }) {
    const { vertices, indices } = this.createGeometry(size);
    this.device.queue.writeBuffer(this.vertexBuffer, 0, vertices);
    this.device.queue.writeBuffer(this.indexBuffer, 0, indices);
  }

  draw(pass: GPURenderPassEncoder) {
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setIndexBuffer(this.indexBuffer, "uint16");
    pass.drawIndexed(this.indexCount);
  }
}
