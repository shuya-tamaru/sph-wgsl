struct TimeStep {
  dt: f32, _pad0: f32, _pad1: f32, _pad2: f32,
};

struct TransformParams {
  boxWidth: f32,
  boxHeight: f32,
  boxDepth: f32,
  sphereCount: u32,
};

struct IntegrateParams {
  tangentDamping: f32,   // 0..1
  restitution:   f32,    // 0..1
  mass:          f32,    // 粒子質量（Force→Accel で割る）
  _pad0:         f32,
};

// 反射 + 減衰（法線 n は正規化済み想定）
fn reflect_damped(vel: vec3<f32>, n: vec3<f32>, p: IntegrateParams) -> vec3<f32> {
  let vn  = dot(vel, n);
  let v_n = vn * n;                          // 法線成分ベクトル
  let v_t = vel - v_n;                       // 接線成分
  return (-p.restitution) * v_n + (1.0 - p.tangentDamping) * v_t;
}

const GRAVITY: f32 = 9.8 ;

@group(0) @binding(0) var<storage, read_write> positions:      array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities:     array<vec4<f32>>;
@group(0) @binding(2) var<storage, read>       pressureForces: array<vec4<f32>>; // Force
@group(0) @binding(3) var<storage, read>       viscosityForces:array<vec4<f32>>; // Force
@group(0) @binding(4) var<uniform>             tp:             TransformParams;
@group(0) @binding(5) var<uniform>             ip:             IntegrateParams;
@group(0) @binding(6) var<uniform>             ts:             TimeStep;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= tp.sphereCount) { return; }

  var pos = positions[i].xyz;
  var vel = velocities[i].xyz;

  // Force → Accel に変換して合算（重力は加速度のまま）
  let Fp = pressureForces[i].xyz;
  let Fv = viscosityForces[i].xyz;
  // let g  = vec3<f32>(0.0, -GRAVITY, 0.0);

  let invMass = 1.0 / max(ip.mass, 1e-8);
  let a = (Fp + Fv) * invMass ;

  // Symplectic Euler
  vel = vel + a * ts.dt;
  pos = pos + vel * ts.dt;

  // 境界は中心±半幅で判定（可視半径 r があるなら hx -= r など）
  let hx = 0.5 * tp.boxWidth;
  let hy = 0.5 * tp.boxHeight;
  let hz = 0.5 * tp.boxDepth;

  // if (pos.x >  hx) { pos.x =  hx; vel = reflect_damped(vel, vec3<f32>( 1.0, 0.0, 0.0), ip); }
  // if (pos.x < -hx) { pos.x = -hx; vel = reflect_damped(vel, vec3<f32>(-1.0, 0.0, 0.0), ip); }
  // if (pos.y >  hy) { pos.y =  hy; vel = reflect_damped(vel, vec3<f32>( 0.0, 1.0, 0.0), ip); }
  // if (pos.y < -hy) { pos.y = -hy; vel = reflect_damped(vel, vec3<f32>( 0.0,-1.0, 0.0), ip); }
  // if (pos.z >  hz) { pos.z =  hz; vel = reflect_damped(vel, vec3<f32>( 0.0, 0.0, 1.0), ip); }
  // if (pos.z < -hz) { pos.z = -hz; vel = reflect_damped(vel, vec3<f32>( 0.0, 0.0,-1.0), ip); }

  positions[i]  = vec4<f32>(pos, 0.0);
  velocities[i] = vec4<f32>(vel, 0.0);
}


// struct TimeStep {
//   dt: f32,
//   _pad0: f32,
//   _pad1: f32,
//   _pad2: f32,
// };

// struct TransformParams {
//   boxWidth: f32,
//   boxHeight: f32,
//   boxDepth: f32,
//   sphereCount: u32,
// };

// struct IntegrateParams {
//   tangentDamping: f32,
//   restitution: f32,
//   mass: f32,
//   _pad0: f32,
// };

// // 境界衝突処理を行う関数
// fn handleBoundaryCollision(
//   pos: vec3<f32>,
//   vel: vec3<f32>,
//   n: vec3<f32>,
//   params: IntegrateParams
// ) -> vec3<f32> {
//   let vn = dot(vel, n);
//   let vt = vel - vn * n;
//   return (-vn * params.restitution) + vt * (1.0 - params.tangentDamping);
// }

// const GRAVITY: f32 = 9.8;

// @group(0) @binding(0) var<storage, read_write> positions: array<vec4<f32>>;
// @group(0) @binding(1) var<storage, read_write> velocities: array<vec4<f32>>;
// @group(0) @binding(2) var<storage, read> pressureForces: array<vec4<f32>>;
// @group(0) @binding(3) var<storage, read> viscosities: array<vec4<f32>>;
// @group(0) @binding(4) var<uniform> transformParams: TransformParams;
// @group(0) @binding(5) var<uniform> integrateParams: IntegrateParams;
// @group(0) @binding(6) var<uniform> timeStep: TimeStep;

// @compute @workgroup_size(64)
// fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
//   let i = global_id.x;

//   if (i >= transformParams.sphereCount) { 
//     return; 
//   }

//   var pos_i = positions[i].xyz;
//   var vel_i = velocities[i].xyz;
//   var force_i = pressureForces[i].xyz ;
//   var viscosity_i = viscosities[i].xyz;
//   let gravity = vec3<f32>(0.0, -GRAVITY, 0.0);
//   let a = (force_i + gravity + viscosity_i) / integrateParams.mass;

//   var new_vel_i = vel_i + a * timeStep.dt;
//   var new_pos_i = pos_i + new_vel_i * timeStep.dt;

//   // 境界衝突処理を関数化して適用
//   if(new_pos_i.x > transformParams.boxWidth) {
//     new_pos_i.x = transformParams.boxWidth;
//     new_vel_i = handleBoundaryCollision(new_pos_i, new_vel_i, vec3<f32>(1.0, 0.0, 0.0), integrateParams);
//   }
//   if(new_pos_i.x < -transformParams.boxWidth) {
//     new_pos_i.x = -transformParams.boxWidth;
//     new_vel_i = handleBoundaryCollision(new_pos_i, new_vel_i, vec3<f32>(-1.0, 0.0, 0.0), integrateParams);
//   }
//   if(new_pos_i.y > transformParams.boxHeight) {
//     new_pos_i.y = transformParams.boxHeight;
//     new_vel_i = handleBoundaryCollision(new_pos_i, new_vel_i, vec3<f32>(0.0, 1.0, 0.0), integrateParams);
//   }
//   if(new_pos_i.y < -transformParams.boxHeight) {
//     new_pos_i.y = -transformParams.boxHeight;
//     new_vel_i = handleBoundaryCollision(new_pos_i, new_vel_i, vec3<f32>(0.0, -1.0, 0.0), integrateParams);
//   }
//   if(new_pos_i.z > transformParams.boxDepth) {
//     new_pos_i.z = transformParams.boxDepth;
//     new_vel_i = handleBoundaryCollision(new_pos_i, new_vel_i, vec3<f32>(0.0, 0.0, 1.0), integrateParams);
//   }
//   if(new_pos_i.z < -transformParams.boxDepth) {
//     new_pos_i.z = -transformParams.boxDepth;
//     new_vel_i = handleBoundaryCollision(new_pos_i, new_vel_i, vec3<f32>(0.0, 0.0, -1.0), integrateParams);
//   }

//   positions[i] = vec4<f32>(new_pos_i, 0.0);
//   velocities[i] = vec4<f32>(new_vel_i, 0.0);
// }
