struct TransformData {
   model: mat4x4<f32>,
   view: mat4x4<f32>,
   projection: mat4x4<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
}

@binding(0) @group(0) var<uniform> transformUBO: TransformData;

@vertex
fn vs_main(
  @location(0) position: vec4<f32>,
) -> VertexOutput {
    var output: VertexOutput;
  output.position = transformUBO.projection * transformUBO.view * transformUBO.model * vec4<f32>(position.xyz, 1.0);
  
  output.color = vec4<f32>(position.x, 0.0, 0.0, 1.0);
  return output;
}

@fragment
fn fs_main(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
  return color;
}