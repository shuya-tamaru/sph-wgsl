struct TransformData {
   model: mat4x4<f32>,
   view: mat4x4<f32>,
   projection: mat4x4<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
}

const RADIUS: f32 = 0.2;

@group(0) @binding(0) var<uniform> transformUBO: TransformData;
@group(0) @binding(1) var<storage, read> positions: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> velocities: array<vec4<f32>>; 

// 速度ベクトルから色を決める関数（青→シアン→緑→黄→赤のグラデーション）
fn velocity_to_color(velocity: vec3<f32>) -> vec3<f32> {
  let speed = length(velocity);
  // 速度の最大値を仮定（調整可）
  let maxSpeed = 10.0;
  let t = clamp(speed / maxSpeed, 0.0, 1.0);

  // 0.0: 青, 0.25: シアン, 0.5: 緑, 0.75: 黄, 1.0: 赤
  if (t < 0.25) {
    // 青→シアン
    let k = t / 0.25;
    return mix(vec3<f32>(0.0, 0.0, 1.0), vec3<f32>(0.0, 1.0, 1.0), k);
  } else if (t < 0.5) {
    // シアン→緑
    let k = (t - 0.25) / 0.25;
    return mix(vec3<f32>(0.0, 1.0, 1.0), vec3<f32>(0.0, 1.0, 0.0), k);
  } else if (t < 0.75) {
    // 緑→黄
    let k = (t - 0.5) / 0.25;
    return mix(vec3<f32>(0.0, 1.0, 0.0), vec3<f32>(1.0, 1.0, 0.0), k);
  } else {
    // 黄→赤
    let k = (t - 0.75) / 0.25;
    return mix(vec3<f32>(1.0, 1.0, 0.0), vec3<f32>(1.0, 0.0, 0.0), k);
  }
}


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
  // 法線ベクトルを計算（球の中心から頂点への方向）
  let normal = normalize(vertPos.xyz);

  // 簡易的なディレクショナルライト
  let lightDir = normalize(vec3<f32>(0.3, 1.0, 0.5)); // 上から斜め
  let lightColor = vec3<f32>(1.0, 1.0, 1.0);
  let ambient = 0.5;

  // Lambert拡散反射
  let diff = max(dot(normal, lightDir), 0.0);

  // シェーディング色
  let baseColor = velocity_to_color(velocity.xyz);
  // let baseColor = vec3<f32>(0.0, 0.0, 1.0);
  let shaded = baseColor * (ambient + diff * 0.8);



  output.color = vec4<f32>(shaded, 1.0);

  return output;
}

@fragment
fn fs_main(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
  return color;
}