import GUI from "lil-gui";
import { Density } from "../core/Density";
import { Gravity } from "../core/Gravity";
import { Integrate } from "../core/Integrate";
import { Pressure } from "../core/Pressure";
import { PressureForce } from "../core/PressureForce";
import { SphereInstance } from "../core/SphereInstance";
import { SphereTransform } from "../core/SphereTransform";
import { SphSettings } from "../core/SphSettings";
import { Viscosity } from "../core/Viscosity";
import { debugReadBuffer } from "../utils/debugReadBuffer";
import { TimeStep } from "../utils/TimeStep";
import { OrbitControls } from "./OrbitControls";
import { RenderPipeline } from "./RenderPipeline";
import { RenderTarget } from "./RenderTarget";
import { SetupDevice } from "./SetupDevice";
import { TransformSystem } from "./TransformSystem";
import { WireBox } from "./WireBox";
import { Grid } from "../core/Grid";
import { CalcStartIndices } from "../core/CalcStartIndices";
import { Scatter } from "../core/Scatter";
import { ReOrder } from "../core/ReOrder";
import { Swap } from "../core/Swap";

export class Renderer {
  canvas: HTMLCanvasElement;
  adapter: GPUAdapter;
  device: GPUDevice;
  context: GPUCanvasContext;
  pipeline: GPURenderPipeline;
  setupDevice: SetupDevice;
  renderTarget: RenderTarget;
  renderPipeline: RenderPipeline;

  wireBox: WireBox;
  transformSystem: TransformSystem;
  orbitControls: OrbitControls;
  sphereInstance: SphereInstance;
  sphereTransform: SphereTransform;

  grid: Grid;
  calcStartIndices: CalcStartIndices;
  scatter: Scatter;
  reOrder: ReOrder;
  swap: Swap;

  sphSettings: SphSettings;
  gravity: Gravity;
  density: Density;
  pressure: Pressure;
  pressureForce: PressureForce;
  viscosity: Viscosity;
  integrate: Integrate;

  gui: GUI;

  timestamp: TimeStep;
  cameraParams: {
    fov: number;
    aspect: number;
    near: number;
    far: number;
    distance: number;
  };
  sphereTransformParams: {
    boxWidth: number;
    boxHeight: number;
    boxDepth: number;
    sphereCount: number;
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.cameraParams = {
      fov: Math.PI / 2,
      aspect: 1,
      near: 0.1,
      far: 500,
      distance: 25,
    };
    this.sphereTransformParams = {
      boxWidth: 32,
      boxHeight: 4,
      boxDepth: 16,
      sphereCount: 10000,
    };
  }

  async init() {
    // Check if WebGPU is supported before initializing GUI
    if (!navigator.gpu) {
      this.showWebGPUError();
      return;
    }

    this.initGui();

    await this.createDevice();
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.renderTarget = new RenderTarget(this.device, this.canvas);
    this.timestamp = new TimeStep(this.device);
    this.sphSettings = new SphSettings(this.device, this.sphereTransformParams);

    this.createTransformData();
    this.createAssets();
    this.wireBox = new WireBox(
      this.device,
      this.setupDevice.format,
      this.transformSystem.getBuffer(),
      this.sphereTransform
    );
    this.createOptimizeInstance();
    this.createSphInstance();
    // Create and initialize render pipeline
    this.renderPipeline = new RenderPipeline(
      this.device,
      this.setupDevice.format,
      this.transformSystem.getBuffer(),
      this.sphereTransform,
      this.density
    );
    this.renderPipeline.init();

    // Add resize handler
    window.addEventListener("resize", this.handleResize.bind(this));

    this.render();
  }

  private initGui() {
    this.gui = new GUI();

    this.gui
      .add(this.sphereTransformParams, "boxWidth", 16, 64, 1)
      .name("Box Width")
      .onChange((v: number) => {
        this.sphereTransformParams.boxWidth = v;
        this.sphereTransform.updateBoxUBO(
          this.sphereTransformParams.boxWidth,
          this.sphereTransformParams.boxDepth
        );
        // WireBoxのサイズも更新
        this.wireBox.setSize({
          w: this.sphereTransformParams.boxWidth,
          h: this.sphereTransformParams.boxHeight,
          d: this.sphereTransformParams.boxDepth,
        });
      });
    this.gui
      .add(this.sphereTransformParams, "boxDepth", 16, 64, 1)
      .name("Box Depth")
      .onChange((v: number) => {
        this.sphereTransformParams.boxDepth = v;
        this.sphereTransform.updateBoxUBO(
          this.sphereTransformParams.boxWidth,
          this.sphereTransformParams.boxDepth
        );
        // WireBoxのサイズも更新
        this.wireBox.setSize({
          w: this.sphereTransformParams.boxWidth,
          h: this.sphereTransformParams.boxHeight,
          d: v,
        });
      });
    this.gui
      .add(this.sphereTransformParams, "sphereCount", 5000, 40000, 5000)
      .name("Sphere Count")
      .onChange((v: number) => {
        this.sphereTransformParams.sphereCount = v;
        this.resetSimulation();
      });
  }

  private createOptimizeInstance() {
    this.grid = new Grid(
      this.device,
      this.sphSettings.h,
      this.sphereTransform,
      this.sphereTransform.positionBufferIn
    );
    this.calcStartIndices = new CalcStartIndices(
      this.device,
      this.grid.gridCountBuffer,
      this.grid.cellCountsBuffer,
      this.grid.totalCellCount
    );
    this.scatter = new Scatter(
      this.device,
      this.grid.cellIndicesBuffer,
      this.calcStartIndices.cellStartIndicesBuffer,
      this.sphereTransform.transformParamsBuffer,
      this.sphereTransform.sphereCount,
      this.grid.totalCellCount
    );
    this.reOrder = new ReOrder(this.device, this.sphereTransform, this.scatter);
    this.swap = new Swap(this.device, this.sphereTransform);
  }

  private destroyOptimizeInstance() {
    this.grid.destroy();
    this.calcStartIndices.destroy();
    this.scatter.destroy();
  }

  private createSphInstance() {
    this.gravity = new Gravity(
      this.device,
      this.sphereTransform,
      this.timestamp.getBuffer()
    );
    this.density = new Density(
      this.device,
      this.sphereTransform,
      this.sphSettings,
      this.calcStartIndices.cellStartIndicesBuffer,
      this.grid.cellCountsBuffer,
      this.grid.gridCountBuffer,
      this.grid.gridSizeBuffer
    );
    this.pressure = new Pressure(
      this.device,
      this.sphereTransform,
      this.sphSettings,
      this.density.getDensityBuffer()
    );
    this.pressureForce = new PressureForce(
      this.device,
      this.sphereTransform,
      this.density.getDensityBuffer(),
      this.pressure.getPressureBuffer(),
      this.sphSettings,
      this.calcStartIndices.cellStartIndicesBuffer,
      this.grid.cellCountsBuffer,
      this.grid.gridCountBuffer,
      this.grid.gridSizeBuffer
    );
    this.viscosity = new Viscosity(
      this.device,
      this.sphereTransform,
      this.sphSettings,
      this.density.getDensityBuffer(),
      this.calcStartIndices.cellStartIndicesBuffer,
      this.grid.cellCountsBuffer,
      this.grid.gridCountBuffer,
      this.grid.gridSizeBuffer
    );
    this.integrate = new Integrate(
      this.device,
      this.sphereTransform,
      this.sphSettings,
      this.pressureForce,
      this.viscosity,
      this.timestamp
    );
  }

  private destroySphInstance() {
    this.density.destroy();
    this.pressure.destroy();
    this.pressureForce.destroy();
    this.viscosity.destroy();
  }

  private showWebGPUError() {
    const errorContainer = document.getElementById("error-container");
    if (errorContainer) {
      errorContainer.classList.add("show");
    }

    // Hide the main canvas
    const canvas = document.getElementById("gfx-main");
    if (canvas) {
      canvas.style.display = "none";
    }

    // Hide GUI if it exists
    const guiContainer = document.querySelector('.lil-gui');
    if (guiContainer) {
      (guiContainer as HTMLElement).style.display = "none";
    }
  }

  private handleResize() {
    this.renderTarget.updateCanvasSize();
    const aspect = this.canvas.width / this.canvas.height;
    this.transformSystem.setPerspective(
      this.cameraParams.fov,
      aspect,
      this.cameraParams.near,
      this.cameraParams.far
    );
    this.transformSystem.update();
  }

  private resetSimulation() {
    // 既存のSPHコンポーネントを破棄
    if (this.sphereTransform) {
      // 新しい球体数でSphereTransformを再作成
      this.sphereTransform.destroy();
      this.sphereTransform = new SphereTransform(
        this.device,
        this.sphereTransformParams.boxWidth,
        this.sphereTransformParams.boxHeight,
        this.sphereTransformParams.boxDepth,
        this.sphereTransformParams.sphereCount
      );
    }

    this.destroyOptimizeInstance();
    this.destroySphInstance();

    this.createOptimizeInstance();
    this.createSphInstance();
    // レンダリングパイプラインを更新
    this.renderPipeline = new RenderPipeline(
      this.device,
      this.setupDevice.format,
      this.transformSystem.getBuffer(),
      this.sphereTransform,
      this.density
    );
    this.renderPipeline.init();

    // タイムスタンプをリセット（最初のフレームから開始）
    this.timestamp.set(0.01);
  }

  createTransformData() {
    this.transformSystem = new TransformSystem(this.device);
    const aspect = this.canvas.width / this.canvas.height;
    this.transformSystem.setPerspective(
      this.cameraParams.fov,
      aspect,
      this.cameraParams.near,
      this.cameraParams.far
    );
    this.transformSystem.update();
  }

  async createDevice() {
    this.setupDevice = new SetupDevice(this.canvas);
    await this.setupDevice.init();
    this.device = this.setupDevice.device;
    this.context = this.setupDevice.context;
  }

  createAssets() {
    this.orbitControls = new OrbitControls(
      this.canvas,
      this.cameraParams.distance
    );
    this.sphereInstance = new SphereInstance(this.device);
    this.sphereTransform = new SphereTransform(
      this.device,
      this.sphereTransformParams.boxWidth,
      this.sphereTransformParams.boxHeight,
      this.sphereTransformParams.boxDepth,
      this.sphereTransformParams.sphereCount
    );
  }

  render = async () => {
    const dt = 0.025;
    this.timestamp.set(dt);

    this.orbitControls.updateCamera();
    const view = this.orbitControls.getViewMatrix();
    this.transformSystem.setView(view);
    this.transformSystem.update();

    const commandEncoder: GPUCommandEncoder =
      this.device.createCommandEncoder();

    this.grid.resetCellCounts();
    this.scatter.resetCellOffsets();
    this.grid.buildIndex(commandEncoder);
    this.calcStartIndices.buildIndex(commandEncoder);
    this.scatter.buildIndex(commandEncoder);
    this.reOrder.buildIndex(commandEncoder);
    this.swap.buildIndex(commandEncoder);
    // //compute sph
    this.gravity.buildIndex(commandEncoder);
    this.density.buildIndex(commandEncoder);
    this.pressure.buildIndex(commandEncoder);
    this.pressureForce.buildIndex(commandEncoder);
    this.viscosity.buildIndex(commandEncoder);
    this.integrate.buildIndex(commandEncoder);

    const swapView = this.context.getCurrentTexture().createView();
    const renderpass: GPURenderPassEncoder = this.renderTarget.beginMainPass(
      commandEncoder,
      swapView
    );

    this.renderPipeline.draw(renderpass);

    // WireBoxを描画
    this.wireBox.draw(renderpass);

    renderpass.end();

    this.device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(this.render);

    //debug
    // this.device.queue
    //   .onSubmittedWorkDone()
    //   .then(() => this.debug(this.device, this.pressureForce));
  };

  async debug(device: GPUDevice, p: PressureForce) {
    const result = await debugReadBuffer(
      this.device,
      p.getPressureForceBuffer(),
      this.sphereTransform.sphereCount * 4
    );

    //floatかunitか注意
    const float32View = new Float32Array(result);
    console.log(float32View);
  }
}
