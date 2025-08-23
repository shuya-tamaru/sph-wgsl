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

@group(0) @binding(0) var<storage, read_write> positions: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> densities: array<f32>;
@group(0) @binding(2) var<uniform> transformParams: TransformParams;
@group(0) @binding(3) var<uniform> densityParams: DensityParams;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= transformParams.sphereCount) { 
      return; 
  }

  let p = positions[index].xyz;
  var density = 0.0;

  for(var i: u32 = 0; i < transformParams.sphereCount; i++) {
    if (i == index) { continue; }
    let dp = p - positions[i].xyz;
    let r2 = dot(dp, dp);
    //tはh^2-r^2
    let t  = max(0.0, densityParams.h2 - r2);
    let t2   = t * t;
    let t3   = t2 * t;
    density += densityParams.mass * densityParams.poly6 * t3;
  }

  densities[index] = density;
}