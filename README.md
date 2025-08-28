# SPH Fluid Simulation with WebGPU & WGSL

このリポジトリは、WebGPU と WGSL（WebGPU Shading Language）を用いて実装した SPH（Smoothed Particle Hydrodynamics）流体シミュレーションのデモです。

## 特徴

- **WebGPU + TypeScript**: 最新の WebGPU API と TypeScript で記述
- **WGSL シェーダ**: 物理計算や描画処理を WGSL で実装
- **SPH 法**: 密度・圧力・粘性・重力などの物理モデルを GPU で並列計算
- **インタラクティブ GUI**: dat.GUI によるパラメータ調整
- **数千〜1 万粒子**: GPU の力で大量粒子をリアルタイムにシミュレート

## デモ

[デモページはこちら](https://www.styublog.com/shader/sph-wgsl)

## 使い方

1. このリポジトリをクローン
2. `npm install`
3. `npm run dev` でローカルサーバ起動
4. ブラウザで `http://localhost:xxxx` にアクセス

## ディレクトリ構成

- `src/renderer/Renderer.ts` ... レンダラ本体・初期化・描画ループ
- `src/core/SphSettings.ts` ... SPH 物理パラメータ管理
- `src/shaders/` ... WGSL シェーダ群
  - `gravity.wgsl` ... 重力・境界処理
  - `integrate.wgsl` ... 力積分・境界反射
  - `shader.wgsl` ... 頂点・フラグメントシェーダ（描画）

---
