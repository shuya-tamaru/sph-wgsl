struct TransformParams {
    boxWidth: f32,
    boxHeight: f32,
    boxDepth: f32,
    sphereCount: u32
};

struct GridParams {
  x: u32,
  y: u32,
  z: u32,
  total: u32
};

struct GridSizeParams {
  xMin: f32,
  yMin: f32,
  zMin: f32,
  cellSize: f32
};

@group(0) @binding(0) var<storage, read> positions: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> cellIndices: array<u32>;
@group(0) @binding(2) var<storage, read_write> cellCounts: array<atomic<u32>>;
@group(0) @binding(3) var<uniform> gridParams: GridParams;
@group(0) @binding(4) var<uniform> gridSizeParams: GridSizeParams;
@group(0) @binding(5) var<uniform> transformParams: TransformParams;

fn pos_to_cell_index(p: vec3<f32>) -> u32 {
  let res = (p - vec3(gridSizeParams.xMin, gridSizeParams.yMin, gridSizeParams.zMin)) / gridSizeParams.cellSize;
  let cx = i32(floor(res.x));
  let cy = i32(floor(res.y));
  let cz = i32(floor(res.z));

  let cxc = clamp(cx, 0, i32(gridParams.x) - 1);
  let cyc = clamp(cy, 0, i32(gridParams.y) - 1);
  let czc = clamp(cz, 0, i32(gridParams.z) - 1);

  return u32(cxc)
      + u32(cyc) * gridParams.x
      + u32(czc) * gridParams.x * gridParams.y;
}

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= transformParams.sphereCount) {
    return;
  }
  let pos = positions[index].xyz;
  let cellIndex = pos_to_cell_index(pos);
  cellIndices[index] = cellIndex;
  atomicAdd(&(cellCounts[cellIndex]), 1u);
}