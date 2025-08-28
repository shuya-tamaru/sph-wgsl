struct TransformParams {
    boxWidth: f32,
    boxHeight: f32,
    boxDepth: f32,
    sphereCount: u32
};

struct ViscosityParams {
    viscosityMu: f32,
    viscosity: f32,
    h: f32,
    mass: f32,
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
@group(0) @binding(1) var<storage, read> velocities: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> densities: array<f32>;
@group(0) @binding(3) var<uniform> transformParams: TransformParams;
@group(0) @binding(4) var<uniform> vp: ViscosityParams;
@group(0) @binding(5) var<storage, read_write> viscosities: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read> cellStartIndices: array<u32>;
@group(0) @binding(7) var<storage, read> cellCounts: array<u32>;
@group(0) @binding(8) var<uniform> gridParams: GridParams;
@group(0) @binding(9) var<uniform> gridSizeParams: GridSizeParams;

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
fn cs_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let index = gid.x;
  if (index >= transformParams.sphereCount) { return; }

  let pi  = positions[index].xyz;
  let vi  = velocities[index].xyz;
  let rhoi = max(densities[index], 1e-8);

  var fi = vec3<f32>(0.0);
  let h2 = vp.h * vp.h;

  let cc = pos_to_cell_coord(pi);
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
        var k = start;
        loop {
          if (k >= end) { break; }
          if (k != index) {  
            let pj = positions[k].xyz;
            let d  = pi - pj;
            let r2 = dot(d, d);        
            if (r2 < h2) {
              let rinv = inverseSqrt(max(r2, 1e-8 * h2));
              let r    = 1.0 / rinv;
              let lapW = vp.viscosity * (vp.h - r);   // viscosity = 45/(π h^6)

              let rhoj = max(densities[k], 1e-8);
              let vj   = velocities[k].xyz;

              let invRhoAvg = 2.0 / (rhoi + rhoj);
              fi += vp.viscosityMu * vp.mass * (vj - vi) * invRhoAvg * lapW;
            }
          }
          k = k + 1u;
        }
      }
    }
  }
  viscosities[index] = vec4<f32>(fi, 0.0);
}
