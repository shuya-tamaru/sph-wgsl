struct TransformParams {
    boxWidth: f32,
    boxHeight: f32,
    boxDepth: f32,
    sphereCount: u32
};

struct DensityParams {
    mass: f32,
    h: f32,
    h2: f32,
    h3: f32,
    poly6: f32,
    _pad0: f32,
    _pad1: f32,
    _pad2: f32
  }

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
@group(0) @binding(1) var<storage, read_write> densities: array<f32>;
@group(0) @binding(2) var<uniform> transformParams: TransformParams;
@group(0) @binding(3) var<uniform> densityParams: DensityParams;
@group(0) @binding(4) var<storage, read> cellStartIndices: array<u32>;
@group(0) @binding(5) var<storage, read> cellCounts: array<u32>;
@group(0) @binding(6) var<uniform> gridParams: GridParams;
@group(0) @binding(7) var<uniform> gridSizeParams: GridSizeParams;

fn pos_to_cell_coord(p: vec3<f32>) -> vec3<i32> {
  let r = (p - vec3(gridSizeParams.xMin, gridSizeParams.yMin, gridSizeParams.zMin))
          / gridSizeParams.cellSize;
  return vec3<i32>(
    clamp(i32(floor(r.x)), 0, i32(gridParams.x)-1),
    clamp(i32(floor(r.y)), 0, i32(gridParams.y)-1),
    clamp(i32(floor(r.z)), 0, i32(gridParams.z)-1)
  );
}

fn coord_to_index(c: vec3<i32>) -> u32 {
  return u32(c.x) + u32(c.y)*gridParams.x + u32(c.z)*gridParams.x*gridParams.y;
}

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= transformParams.sphereCount) { 
      return; 
  }

  let pi = positions[index].xyz;     // ★reordered 配列の i 番目
  var rho = 0.0;

  // 自セル座標
  let cc = pos_to_cell_coord(pi);

  // 27セルを走査（-1..1 の立方近傍）
  for (var dz = -1; dz <= 1; dz = dz + 1) {
    let zc = clamp(cc.z + dz, 0, i32(gridParams.z)-1);
    for (var dy = -1; dy <= 1; dy = dy + 1) {
      let yc = clamp(cc.y + dy, 0, i32(gridParams.y)-1);
      for (var dx = -1; dx <= 1; dx = dx + 1) {
        let xc = clamp(cc.x + dx, 0, i32(gridParams.x)-1);

        let cidx = coord_to_index(vec3<i32>(xc, yc, zc));
        let start = cellStartIndices[cidx];
        let count = cellCounts[cidx];
        let end   = start + count;

        // セル内の粒子は reorded 配列で連続
        var k = start;
        loop {
          if (k >= end) { break; }
         
          if (k != index) {                   
            let pj = positions[k].xyz;
            let r  = pi - pj;
            let r2 = dot(r, r);
            if (r2 < densityParams.h2) {
              let t = densityParams.h2 - r2;
              rho += densityParams.mass * densityParams.poly6 * (t*t*t);
            }
          }
          k = k + 1u;
        }
      }
    }
  }

  // self 項（W(0)）を入れるなら
  let h6 = densityParams.h2 * densityParams.h2 * densityParams.h2;
  rho += densityParams.mass * densityParams.poly6 * h6;

  densities[index] = rho;
}
