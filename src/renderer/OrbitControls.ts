export class OrbitControls {
  private canvas: HTMLCanvasElement;
  private camera: {
    position: [number, number, number];
    target: [number, number, number];
    up: [number, number, number];
  };

  // マウス状態
  private isMouseDown = false;
  private mouseX = 0;
  private mouseY = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private isRightClick = false; // 右クリック判定
  // カメラの初期位置を右ななめ上からに変更
  // 例: x=distance/2, y=distance/2, z=distance
  // azimuth, elevationも初期値を調整
  private initialAzimuth = Math.PI / 4; // 45度
  private initialElevation = Math.PI / 6; // 30度

  // カメラ制御パラメータ
  private distance = 10;
  private azimuth = this.initialAzimuth;
  private elevation = this.initialElevation;

  // 感度
  private rotateSpeed = 0.01;
  private panSpeed = 2.0; // パン速度を大きく
  private zoomSpeed = 0.1;

  constructor(canvas: HTMLCanvasElement, initialDistance: number = 200) {
    this.canvas = canvas;
    this.distance = initialDistance;

    // 初期カメラ設定
    this.camera = {
      position: [0, 0, this.distance],
      target: [0, 0, 0],
      up: [0, 1, 0],
    };

    this.updateCamera();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // マウスダウン
    this.canvas.addEventListener("mousedown", (e) => {
      this.isMouseDown = true;
      this.isRightClick = e.button === 2; // 右クリック判定
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      e.preventDefault();
    });

    // マウス移動
    this.canvas.addEventListener("mousemove", (e) => {
      if (!this.isMouseDown) return;

      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      if (this.isRightClick) {
        // パン（右クリックドラッグ）
        this.pan(deltaX, deltaY);
      } else {
        // 回転（左クリックドラッグ）
        this.rotate(deltaX, deltaY);
      }

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    // マウスアップ
    this.canvas.addEventListener("mouseup", (e) => {
      this.isMouseDown = false;
      e.preventDefault();
    });

    // マウスリーブ
    this.canvas.addEventListener("mouseleave", () => {
      this.isMouseDown = false;
    });

    // 右クリックメニューを無効化
    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    // ホイール（ズーム）
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.distance += e.deltaY * this.zoomSpeed;
      this.distance = Math.max(5, Math.min(500, this.distance));

      this.updateCamera();
    });
  }

  // 回転処理
  private rotate(deltaX: number, deltaY: number): void {
    this.azimuth -= deltaX * this.rotateSpeed;
    this.elevation += deltaY * this.rotateSpeed;

    // 仰角の制限
    this.elevation = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this.elevation)
    );
  }

  // パン処理
  private pan(deltaX: number, deltaY: number): void {
    // カメラの向きに基づいてパン方向を計算
    const panDistance = this.distance * 0.005; // 距離に応じてパン量を調整（5倍に増加）

    // カメラの右方向ベクトル
    const rightX = Math.cos(this.azimuth - Math.PI / 2);
    const rightY = 0;
    const rightZ = Math.sin(this.azimuth - Math.PI / 2);

    // カメラの上方向ベクトル
    const upX = -Math.sin(this.azimuth) * Math.sin(this.elevation);
    const upY = Math.cos(this.elevation);
    const upZ = -Math.cos(this.azimuth) * Math.sin(this.elevation);

    // パン量を計算
    const panX = (rightX * deltaX + upX * deltaY) * panDistance * this.panSpeed;
    const panY = (rightY * deltaX + upY * deltaY) * panDistance * this.panSpeed;
    const panZ = (rightZ * deltaX + upZ * deltaY) * panDistance * this.panSpeed;

    // カメラの位置とターゲットを移動
    this.camera.position[0] += panX;
    this.camera.position[1] += panY;
    this.camera.position[2] += panZ;

    this.camera.target[0] += panX;
    this.camera.target[1] += panY;
    this.camera.target[2] += panZ;
  }

  // カメラ位置を更新
  updateCamera(): void {
    const x = this.distance * Math.cos(this.elevation) * Math.sin(this.azimuth);
    const y = this.distance * Math.sin(this.elevation);
    const z = this.distance * Math.cos(this.elevation) * Math.cos(this.azimuth);

    this.camera.position = [x, y, z];
  }

  // カメラ行列を取得
  getViewMatrix(): Float32Array {
    const { mat4 } = require("gl-matrix");
    const view = mat4.create();
    mat4.lookAt(view, this.camera.position, this.camera.target, this.camera.up);
    return view;
  }

  // カメラ位置を取得
  getCameraPosition(): [number, number, number] {
    return this.camera.position;
  }

  // パラメータ設定
  setDistance(distance: number): void {
    this.distance = distance;
  }

  setRotateSpeed(speed: number): void {
    this.rotateSpeed = speed;
  }

  setPanSpeed(speed: number): void {
    this.panSpeed = speed;
  }

  setZoomSpeed(speed: number): void {
    this.zoomSpeed = speed;
  }
}
