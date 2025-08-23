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

const GRAVITY: f32 = 9.8;

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
  let g  = vec3<f32>(0.0, -GRAVITY, 0.0);

  let invMass = 1.0 / max(ip.mass, 1e-8);
  let a = (Fp + Fv) * invMass + g;

  // Symplectic Euler
  vel = vel + a * ts.dt;
  pos = pos + vel * ts.dt;

  // 境界は中心±半幅で判定（可視半径 r があるなら hx -= r など）
  let hx = 0.5 * tp.boxWidth;
  let hy = 0.5 * tp.boxHeight;
  let hz = 0.5 * tp.boxDepth;

  if (pos.x >  hx) { pos.x =  hx; vel = reflect_damped(vel, vec3<f32>( 1.0, 0.0, 0.0), ip); }
  if (pos.x < -hx) { pos.x = -hx; vel = reflect_damped(vel, vec3<f32>(-1.0, 0.0, 0.0), ip); }
  // if (pos.y >  hy) { pos.y =  hy; vel = reflect_damped(vel, vec3<f32>( 0.0, 1.0, 0.0), ip); }
  if (pos.y < -hy) { pos.y = -hy; vel = reflect_damped(vel, vec3<f32>( 0.0,-1.0, 0.0), ip); }
  if (pos.z >  hz) { pos.z =  hz; vel = reflect_damped(vel, vec3<f32>( 0.0, 0.0, 1.0), ip); }
  if (pos.z < -hz) { pos.z = -hz; vel = reflect_damped(vel, vec3<f32>( 0.0, 0.0,-1.0), ip); }

  positions[i]  = vec4<f32>(pos, 0.0);
  velocities[i] = vec4<f32>(vel, 0.0);
}
