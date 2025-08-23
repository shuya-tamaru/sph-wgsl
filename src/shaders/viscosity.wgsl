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

@group(0) @binding(0) var<storage, read> positions: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> velocities: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> densities: array<f32>;
@group(0) @binding(3) var<uniform> transformParams: TransformParams;
@group(0) @binding(4) var<uniform> vp: ViscosityParams;
@group(0) @binding(5) var<storage, read_write> viscosities: array<vec4<f32>>;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let i = global_id.x;
  if (i >= transformParams.sphereCount) { return; }

  let pi = positions[i].xyz;
  let vi = velocities[i].xyz;
  let rhoi = densities[i];

  var f_visc = vec3<f32>(0.0);
  let h2 = vp.h * vp.h;

  for (var j: u32 = 0u; j < transformParams.sphereCount; j++) {
    if (j == i) { continue; }
    let d  = pi - positions[j].xyz; 
    let r2 = dot(d, d);
    if (r2 >= h2) { continue; }
    // ∇²W_visc = (45/(π h^6)) * (h - r)
    let rinv = inverseSqrt(max(r2, 1e-8 * h2));
    let r    = 1.0 / rinv;
    let lapW = vp.viscosity * (vp.h - r); 

    let rhoj = max(densities[j], 1e-8);
    let vj   = velocities[j].xyz;

    f_visc += vp.viscosityMu * vp.mass * (vj - vi) / rhoj * lapW;
  }

  viscosities[i] = vec4<f32>(f_visc, 0.0);
  
  
}