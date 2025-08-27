struct TransformParams {
  boxWidth: f32,
  boxHeight: f32,
  boxDepth: f32,
  sphereCount: u32
};

@group(0) @binding(0) var<storage, read> positionsIn: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> velocitiesIn: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> positionsOut: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> velocitiesOut: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> gridSphereIds: array<u32>;
@group(0) @binding(5) var<uniform> transformParams: TransformParams;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let i = global_id.x;
  if (i >= transformParams.sphereCount) { return; }

  let src = gridSphereIds[i];
  let dst = i;

  positionsOut[dst] = positionsIn[src];
  velocitiesOut[dst] = velocitiesIn[src];
}