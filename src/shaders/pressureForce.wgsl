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

@group(0) @binding(0) var<storage, read> positions: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> densities: array<f32>;
@group(0) @binding(2) var<storage, read> pressures: array<f32>;
@group(0) @binding(3) var<uniform> transformParams: TransformParams;
@group(0) @binding(4) var<uniform> pf: PressureForceParams;
@group(0) @binding(5) var<storage, read_write> pressureForces: array<vec4<f32>>;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;

  if (index >= transformParams.sphereCount) { 
    return; 
  }

  let pi = positions[index].xyz;
  let pi_press = pressures[index];
  var rhoi = pf.restDensity;

  var fi = vec3<f32>(0.0, 0.0, 0.0);
  
  for (var j: u32 = 0u; j < transformParams.sphereCount; j++) {
    if (j == index) { continue; }
    let d = pi - positions[j].xyz;
    
    let r2  = dot(d, d);
    if (r2 >= pf.h2) { continue; }
    let rinv = inverseSqrt(max(r2, 1e-8));
    let r    = 1.0 * rinv;
    let dir  = d * rinv; 
    let t = max(0.0, pf.h - r);
    let gradW = pf.spiky * (t * t) * dir;

    let rhoj = densities[j];
    let pj_press = pressures[j];
    let term = (pi_press / (rhoi * rhoi)) + (pj_press / (rhoj * rhoj));
    fi += -(pf.mass * pf.mass) * term * gradW;
  }
  pressureForces[index] = vec4<f32>(fi, 0.0);

}