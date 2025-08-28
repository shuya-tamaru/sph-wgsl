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
const EMISSIVE_GAIN: f32 = 1.2;
const MAX_SPEED: f32 = 10.0;

@group(0) @binding(0) var<uniform> transformUBO: TransformData;
@group(0) @binding(1) var<storage, read> positions: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> velocities: array<vec4<f32>>; 


fn velocity_to_color_ocean(velocity: vec3<f32>) -> vec3<f32> {
  let speed = length(velocity);

  // 波の色: 深い青→青緑→白
  // 0.0: 深い青, 0.5: 青緑, 1.0: 白
  let t = clamp(speed / MAX_SPEED, 0.0, 1.0);

  if (t < 0.5) {
    // 深い青 (0.0, 0.2, 0.6) → 青緑 (0.0, 0.7, 0.8)
    let k = t / 0.5;
    return mix(vec3<f32>(0.0, 0.2, 0.6), vec3<f32>(0.0, 0.7, 0.8), k);
  } else {
    // 青緑 (0.0, 0.7, 0.8) → 白 (1.0, 1.0, 1.0)
    let k = (t - 0.5) / 0.5;
    return mix(vec3<f32>(0.0, 0.7, 0.8), vec3<f32>(1.0, 1.0, 1.0), k);
  }
}

fn depth_to_color_ocean(y: f32, min_y: f32, max_y: f32) -> vec3<f32> {
  // Y座標を0.0〜1.0の範囲に正規化
  let t = clamp((y - min_y) / (max_y - min_y), 0.0, 1.0);
  
  // 深い海の色から浅瀬の色へのグラデーション
  // 深い海: 濃い青 (0.0, 0.1, 0.4)
  // 中間: 青 (0.0, 0.3, 0.7) 
  // 浅瀬: 青緑 (0.0, 0.6, 0.8)
  // 波打ち際: 白っぽい青 (0.7, 0.9, 1.0)
  
  if (t < 0.3) {
    // 深い海 → 中間の青
    let k = t / 0.3;
    return mix(vec3<f32>(0.0, 0.1, 0.4), vec3<f32>(0.0, 0.3, 0.7), k);
  } else if (t < 0.7) {
    // 中間の青 → 浅瀬の青緑
    let k = (t - 0.3) / 0.4;
    return mix(vec3<f32>(0.0, 0.3, 0.7), vec3<f32>(0.0, 0.6, 0.8), k);
  } else {
    // 浅瀬 → 波打ち際
    let k = (t - 0.7) / 0.3;
    return mix(vec3<f32>(0.0, 0.6, 0.8), vec3<f32>(0.7, 0.9, 1.0), k);
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
  let ambient = 0.3;

  // Lambert拡散反射
  let diff = max(dot(normal, lightDir), 0.0);

     //  let baseColor = velocity_to_color_ocean(velocity.xyz);
   let baseColor = depth_to_color_ocean(worldPos.y, -1.0, 1.0);
   // 速度に依存しないemissive（深さに基づく）
   let emissive = baseColor * EMISSIVE_GAIN * 0.3;

  // シェーディング色
  // let baseColor = vec3<f32>(0.0, 0.0, 1.0);
  let shaded = baseColor * (ambient + diff * 0.8);



  // output.color = vec4<f32>(shaded, 1.0);
  output.color = vec4<f32>(shaded + emissive, 1.0);

  return output;
}

@fragment
fn fs_main(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
  return color;
}