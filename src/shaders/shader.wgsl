struct TransformData {
   model: mat4x4<f32>,
   view: mat4x4<f32>,
   projection: mat4x4<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
}

const RADIUS: f32 = 0.1;

@group(0) @binding(0) var<uniform> transformUBO: TransformData;
@group(0) @binding(1) var<storage, read> positions: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> velocities: array<vec4<f32>>; 

@vertex
fn vs_main(
  @location(0) vertPos: vec4<f32>,
  @builtin(instance_index) iid: u32
) -> VertexOutput {
  var output: VertexOutput;
  let center = positions[iid];
  let velocity = velocities[iid];
  let worldPos = center.xyz + vertPos.xyz * RADIUS;
  let mvp = transformUBO.projection * transformUBO.view * transformUBO.model;
  output.position = mvp * vec4<f32>(worldPos, 1.0);
  output.color = vec4<f32>(0.0, 0.0, 1.0, 1.0);

  return output;
}

@fragment
fn fs_main(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
  return color;
}