struct TransformParams {
  boxWidth: f32,
  boxHeight: f32,
  boxDepth: f32,
  sphereCount: u32
};

@group(0) @binding(0) var<storage, read> cellIndices: array<u32>;
@group(0) @binding(1) var<storage, read> cellStartIndices: array<u32>;
@group(0) @binding(2) var<storage, read_write> gridSphereIds: array<u32>;
@group(0) @binding(3) var<storage, read_write> cellOffsets:array<atomic<u32>>;
@group(0) @binding(4) var<uniform> transformParams: TransformParams;


@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let i = global_id.x;
  if (i >= transformParams.sphereCount) { return; }

  let cid = cellIndices[i];
  let ofs = atomicAdd(&cellOffsets[cid], 1u);
  let dst = cellStartIndices[cid] + ofs;
  gridSphereIds[dst] = i;
}