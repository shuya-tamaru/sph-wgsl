struct TimeStep {
  dt: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
};

struct TransformParams {
    boxWidth: f32,
    boxHeight: f32,
    boxDepth: f32,
    sphereCount: u32
};

@group(0) @binding(0) var<storage, read_write> positions: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec4<f32>>; 
@group(0) @binding(2) var<uniform> timeStep: TimeStep;
@group(0) @binding(3) var<uniform> transformParams: TransformParams;
@group(0) @binding(4) var<storage, read_write> gravities: array<vec4<f32>>;

const GRAVITY: f32 = 9.8;
const COLLISION_DAMPING: f32 = 0.9;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= transformParams.sphereCount) { 
        return; 
    }
    let currentPosition = positions[index].xyz;
    let currentVelocity = velocities[index].xyz;

    var newVelocity = currentVelocity + vec3<f32>(0.0, -GRAVITY, 0.0) * timeStep.dt;
    var newPosition = currentPosition + newVelocity * timeStep.dt;

      // X方向の境界判定
  // if (abs(newPosition.x) > transformParams.boxWidth) {
  //   newPosition.x = transformParams.boxWidth * sign(newPosition.x);
  //   newVelocity.x *= -1.0 * COLLISION_DAMPING;
  // }

  // if (abs(newPosition.y) > transformParams.boxHeight) {
  //   newPosition.y = transformParams.boxHeight * sign(newPosition.y);
  //   newVelocity.y *= -1.0 * COLLISION_DAMPING;
  // }


  // // Z方向の境界判定（2Dなら不要だが一応）
  // if (abs(newPosition.z) > transformParams.boxDepth) {
  //   newPosition.z = transformParams.boxDepth * sign(newPosition.z);
  //   newVelocity.z *= -1.0 * COLLISION_DAMPING;
  // }


    positions[index] = vec4<f32>(newPosition, 0.0);
    velocities[index] = vec4<f32>(newVelocity, 0.0);

  

    
}