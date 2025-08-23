import { Density } from "../core/Density";
import { Gravity } from "../core/Gravity";
import { Pressure } from "../core/Pressure";
import { SphereInstance } from "../core/SphereInstance";
import { SphereTransform } from "../core/SphereTransform";
import { SphSettings } from "../core/SphSettings";
import { debugReadBuffer } from "../utils/debugReadBuffer";
import { TimeStep } from "../utils/TimeStep";
import { OrbitControls } from "./OrbitControls";
import { RenderPipeline } from "./RenderPipeline";
import { RenderTarget } from "./RenderTarget";
import { SetupDevice } from "./SetupDevice";
import { TransformSystem } from "./TransformSystem";

export class Renderer {
  canvas: HTMLCanvasElement;
  adapter: GPUAdapter;
  device: GPUDevice;
  context: GPUCanvasContext;
  pipeline: GPURenderPipeline;
  setupDevice: SetupDevice;
  renderTarget: RenderTarget;
  renderPipeline: RenderPipeline;

  transformSystem: TransformSystem;
  orbitControls: OrbitControls;
  sphereInstance: SphereInstance;
  sphereTransform: SphereTransform;

  sphSettings: SphSettings;
  gravity: Gravity;
  density: Density;
  pressure: Pressure;

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
      distance: 15,
    };
    this.sphereTransformParams = {
      boxWidth: 10,
      boxHeight: 10,
      boxDepth: 10,
      sphereCount: 1000,
    };
  }

  async init() {
    await this.createDevice();
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.renderTarget = new RenderTarget(this.device, this.canvas);
    this.timestamp = new TimeStep(this.device);
    this.sphSettings = new SphSettings(this.device);

    this.createTransformData();
    this.createAssets();
    this.gravity = new Gravity(
      this.device,
      this.sphereTransform,
      this.timestamp.getBuffer()
    );
    this.density = new Density(
      this.device,
      this.sphereTransform,
      this.sphSettings
    );
    this.pressure = new Pressure(
      this.device,
      this.sphereTransform,
      this.sphSettings,
      this.density.getDensityBuffer()
    );

    // Create and initialize render pipeline
    this.renderPipeline = new RenderPipeline(
      this.device,
      this.setupDevice.format,
      this.transformSystem.getBuffer(),
      this.sphereTransform
    );
    this.renderPipeline.init();

    // Add resize handler
    window.addEventListener("resize", this.handleResize.bind(this));

    this.render();
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

  render = () => {
    const dt = 0.016;
    this.timestamp.set(dt);

    this.orbitControls.updateCamera();
    const view = this.orbitControls.getViewMatrix();
    this.transformSystem.setView(view);
    this.transformSystem.update();

    const commandEncoder: GPUCommandEncoder =
      this.device.createCommandEncoder();
    this.gravity.buildIndex(commandEncoder);
    this.density.buildIndex(commandEncoder);
    this.pressure.buildIndex(commandEncoder);

    const swapView = this.context.getCurrentTexture().createView();
    const renderpass: GPURenderPassEncoder = this.renderTarget.beginMainPass(
      commandEncoder,
      swapView
    );

    this.renderPipeline.draw(renderpass);
    renderpass.end();

    this.device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(this.render);

    //debug
    // this.device.queue
    //   .onSubmittedWorkDone()
    //   .then(() => this.debug(this.device, this.pressure));
  };

  async debug(device: GPUDevice, p: Pressure) {
    const result = await debugReadBuffer(
      this.device,
      this.pressure.getPressureBuffer(),
      this.sphereTransform.sphereCount * 4
    );

    const float32View = new Float32Array(result);
    console.log(float32View);
  }
}
