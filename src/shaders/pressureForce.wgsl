struct TransformParams {
    boxWidth: f32,
    boxHeight: f32,
    boxDepth: f32,
    sphereCount: u32
};

struct PressureForceParams {
    h: f32,
    h2: f32,
    spiky: f32,
    mass: f32,
    restDensity: f32,
    _pad0: f32,
    _pad1: f32,
    _pad2: f32,
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
@group(0) @binding(1) var<storage, read> densities: array<f32>;
@group(0) @binding(2) var<storage, read> pressures: array<f32>;
@group(0) @binding(3) var<uniform> transformParams: TransformParams;
@group(0) @binding(4) var<uniform> pf: PressureForceParams;
@group(0) @binding(5) var<storage, read_write> pressureForces: array<vec4<f32>>;
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
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;

  if (index >= transformParams.sphereCount) { 
    return; 
  }

  let pi = positions[index].xyz;
  let pi_press = pressures[index];
  var rhoi = max(densities[index], 1e-8);

  var fi = vec3<f32>(0.0);

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
            if (r2 < pf.h2) {
              let rinv = inverseSqrt(max(r2, 1e-8 * pf.h2));
              let r    = 1.0 / rinv;
              let t    = pf.h - r;
              if(t > 0.0) {
                let dir  = d * rinv; 
                let gradW = pf.spiky * (t * t) * dir;
                let rhoj = max(densities[k], 1e-8);
                let pj_press = pressures[k];
                let term = (pi_press / (rhoi * rhoi)) + (pj_press / (rhoj * rhoj));
                fi += -(pf.mass * pf.mass) * term * gradW; 
              }
            }
          }
          k = k + 1u;
        }
      }
    }
  }
  pressureForces[index] = vec4<f32>(fi / 4.0, 0.0);
}
  

  // for (var j: u32 = 0u; j < transformParams.sphereCount; j++) {
  //   if (j == index) { continue; }
  //   let d = pi - positions[j].xyz;
    
  //   let r2  = dot(d, d);
  //   if (r2 >= pf.h2) { continue; }
  //   let rinv = inverseSqrt(max(r2, 1e-8 * pf.h2));
  //   let r    = 1.0 / rinv;
  //   let dir  = d * rinv; 
  //   let t    = pf.h - r;
  //   if (t <= 0.0) { continue; }
  //   let gradW = pf.spiky * (t * t) * dir;

  //   let rhoj = max(densities[j], 1e-8);
  //   let pj_press = pressures[j];
  //   let term = (pi_press / (rhoi * rhoi)) + (pj_press / (rhoj * rhoj));
  //   fi += -(pf.mass * pf.mass) * term * gradW; 
  // }