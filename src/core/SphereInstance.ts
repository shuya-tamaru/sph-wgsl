export class SphereInstance {
  private device: GPUDevice;
  private vertexBuffer: GPUBuffer;
  private vertexBufferLayout: GPUVertexBufferLayout;
  private indexBuffer: GPUBuffer;
  private indexCount: number;

  constructor(device: GPUDevice) {
    this.device = device;
    this.createSphereGeometry();
    this.createVertexBufferLayout();
  }

  private createSphereGeometry() {
    const segments = 32;
    const rings = 16;
    const vertices: number[] = [];
    const indices: number[] = [];

    // Generate sphere vertices
    for (let ring = 0; ring <= rings; ring++) {
      const phi = (ring / rings) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let segment = 0; segment <= segments; segment++) {
        const theta = (segment / segments) * 2 * Math.PI;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        const x = cosTheta * sinPhi;
        const y = cosPhi;
        const z = sinTheta * sinPhi;
        const w = 0;

        // Position (x, y, z)
        vertices.push(x, y, z, w);
        // Normal (x, y, z) - same as position for unit sphere
        // vertices.push(x, y, z, w);
        // UV coordinates
        // vertices.push(segment / segments, ring / rings);
      }
    }

    // Generate indices
    for (let ring = 0; ring < rings; ring++) {
      for (let segment = 0; segment < segments; segment++) {
        const a = ring * (segments + 1) + segment;
        const b = ring * (segments + 1) + segment + 1;
        const c = (ring + 1) * (segments + 1) + segment;
        const d = (ring + 1) * (segments + 1) + segment + 1;

        // First triangle
        indices.push(a, b, c);
        // Second triangle
        indices.push(b, d, c);
      }
    }

    this.indexCount = indices.length;

    // Create vertex buffer
    this.vertexBuffer = this.device.createBuffer({
      size: vertices.length * 4, // 4 bytes per float
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(
      this.vertexBuffer,
      0,
      new Float32Array(vertices)
    );

    // Create index buffer
    this.indexBuffer = this.device.createBuffer({
      size: indices.length * 2, // 2 bytes per uint16
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(
      this.indexBuffer,
      0,
      new Uint16Array(indices)
    );
  }

  private createVertexBufferLayout() {
    this.vertexBufferLayout = {
      arrayStride: 16,
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: "float32x4",
        },
      ],
    };
  }

  getVertexBuffer(): GPUBuffer {
    return this.vertexBuffer;
  }

  getVertexBufferLayout(): GPUVertexBufferLayout {
    return this.vertexBufferLayout;
  }

  getIndexBuffer(): GPUBuffer {
    return this.indexBuffer;
  }

  getIndexCount(): number {
    return this.indexCount;
  }

  dispose() {
    this.vertexBuffer.destroy();
    this.indexBuffer.destroy();
  }
}
