
struct TransformParams {
    boxWidth: f32,
    boxHeight: f32,
    boxDepth: f32,
    sphereCount: u32
};

struct PressureParams {
    pressureStiffness: f32,
    restDensity: f32,
    _pad0: f32,
    _pad1: f32,
  }

@group(0) @binding(0) var<storage, read> positions: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> densities: array<f32>;
@group(0) @binding(2) var<uniform> transformParams: TransformParams;
@group(0) @binding(3) var<uniform> pressureParams: PressureParams;
@group(0) @binding(4) var<storage, read_write> pressures: array<f32>;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;

  if (index >= transformParams.sphereCount) { 
    return; 
  }

  let rho = max(densities[index], 1e-8);
  let p = pressureParams.pressureStiffness * (rho - pressureParams.restDensity);
  pressures[index] = max(p, 0.0);
}