type Box = {
  boxWidth: number;
  boxHeight: number;
  boxDepth: number;
  sphereCount: number;
};
type Opts = {
  rho0?: number; // 目標密度（既定 1.0）
  targetNeighbors?: number; // 目標近傍数（既定 40）
  mu?: number; // 粘性係数 μ（既定 0.12）
  xsphEta?: number; // XSPH 係数（既定 0.03）
  g?: number; // 重力加速度（既定 9.81）
  csFactor?: number; // c_s ≈ csFactor * sqrt(g*h)（既定 10）
  safety?: number; // CFL 安全率（既定 0.85）
};

export function deriveSphParams(b: Box, o: Opts = {}) {
  const rho0 = o.rho0 ?? 1.0;
  const targetNeighbors = o.targetNeighbors ?? 40;
  const mu = o.mu ?? 0.12;
  const xsphEta = o.xsphEta ?? 0.03;
  const g = o.g ?? 9.81;
  const csFactor = o.csFactor ?? 10;
  const safety = o.safety ?? 0.85;

  const V = b.boxWidth * b.boxHeight * b.boxDepth; // 体積
  const N = Math.max(1, b.sphereCount); // 粒子数
  const n = N / V; // 数密度 [#/vol]
  const spacing = Math.cbrt(V / N); // 平均間隔 d

  // 目標近傍数から h を解く： neighbors ≈ n * (4/3)π h^3
  let h = Math.cbrt((3 * targetNeighbors) / (4 * Math.PI * n));
  // ガード（極端な縮小/拡大を避ける）
  const hMin = 1.2 * spacing,
    hMax = 2.2 * spacing;
  h = Math.min(hMax, Math.max(hMin, h));

  // 便利な冪
  const h2 = h * h,
    h3 = h2 * h,
    h6 = h3 * h3,
    h9 = h6 * h3;

  // 物性
  const mass = rho0 / n; // = ρ0 * V / N
  const poly6 = 315 / (64 * Math.PI * h9); // 密度
  const spikyGrad = -45 / (Math.PI * h6); // 圧力勾配（負！）
  const viscLapl = 45 / (Math.PI * h6); // 粘性ラプラシアン

  // 圧力剛性 k（線形 EoS: p = k(ρ-ρ0)）
  const cs = csFactor * Math.sqrt(g * h); // 擬似音速
  const pressureStiffness = cs * cs; // k = c_s^2

  // 時間刻み（CFL）
  const nu = mu / rho0; // 動粘性
  const dtPress = (0.25 * h) / cs;
  const dtVisc = (0.125 * h2) / Math.max(nu, 1e-8);
  const dt = safety * Math.min(dtPress, dtVisc);

  // 参考：期待近傍数（最終的にどうなったか）
  const neighborsEst = n * (4 / 3) * Math.PI * h3;

  return {
    // 幾何/密度
    rho0,
    mass,
    spacing,
    neighborsEst,
    h,
    h2,
    h3,
    h6,
    h9,
    // 係数
    poly6,
    spikyGrad,
    viscLapl,
    // 力学パラメータ
    pressureStiffness,
    mu,
    xsphEta,
    // 推奨Δt
    dt,
  };
}
