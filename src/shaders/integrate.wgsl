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
  sphereCount: u32,
};

struct IntegrateParams {
  tangentDamping: f32,
  restitution: f32,
  mass: f32,
  _pad0: f32,
};

// 境界衝突処理を行う関数
fn handleBoundaryCollision(
  pos: vec3<f32>,
  vel: vec3<f32>,
  n: vec3<f32>,
  params: IntegrateParams
) -> vec3<f32> {
  let vn = dot(vel, n);
  let vt = vel - vn * n;
  return (-vn * params.restitution) + vt * (1.0 - params.tangentDamping);
}

@group(0) @binding(0) var<storage, read_write> positions: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> pressureForces: array<vec4<f32>>;
// viscosity
@group(0) @binding(4) var<uniform> transformParams: TransformParams;
@group(0) @binding(5) var<uniform> integrateParams: IntegrateParams;
@group(0) @binding(6) var<uniform> timeStep: TimeStep;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let i = global_id.x;

  if (i >= transformParams.sphereCount) { 
    return; 
  }

  var pos_i = positions[i].xyz;
  var vel_i = velocities[i].xyz;
  var force_i = pressureForces[i].xyz;
  let a = force_i / integrateParams.mass;

  var new_vel_i = vel_i + a * timeStep.dt;
  var new_pos_i = pos_i + new_vel_i * timeStep.dt;

  // 境界衝突処理を関数化して適用
  if(new_pos_i.x > transformParams.boxWidth) {
    new_pos_i.x = transformParams.boxWidth;
    new_vel_i = handleBoundaryCollision(new_pos_i, new_vel_i, vec3<f32>(1.0, 0.0, 0.0), integrateParams);
  }
  if(new_pos_i.x < -transformParams.boxWidth) {
    new_pos_i.x = -transformParams.boxWidth;
    new_vel_i = handleBoundaryCollision(new_pos_i, new_vel_i, vec3<f32>(-1.0, 0.0, 0.0), integrateParams);
  }
  if(new_pos_i.y > transformParams.boxHeight) {
    new_pos_i.y = transformParams.boxHeight;
    new_vel_i = handleBoundaryCollision(new_pos_i, new_vel_i, vec3<f32>(0.0, 1.0, 0.0), integrateParams);
  }
  if(new_pos_i.y < -transformParams.boxHeight) {
    new_pos_i.y = -transformParams.boxHeight;
    new_vel_i = handleBoundaryCollision(new_pos_i, new_vel_i, vec3<f32>(0.0, -1.0, 0.0), integrateParams);
  }
  if(new_pos_i.z > transformParams.boxDepth) {
    new_pos_i.z = transformParams.boxDepth;
    new_vel_i = handleBoundaryCollision(new_pos_i, new_vel_i, vec3<f32>(0.0, 0.0, 1.0), integrateParams);
  }
  if(new_pos_i.z < -transformParams.boxDepth) {
    new_pos_i.z = -transformParams.boxDepth;
    new_vel_i = handleBoundaryCollision(new_pos_i, new_vel_i, vec3<f32>(0.0, 0.0, -1.0), integrateParams);
  }

  positions[i] = vec4<f32>(new_pos_i, 0.0);
  velocities[i] = vec4<f32>(new_vel_i, 0.0);
}