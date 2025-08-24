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

  // タッチ状態
  private isTouchActive = false;
  private touchStartDistance = 0;
  private touchStartX = 0;
  private touchStartY = 0;
  private lastTouchX = 0;
  private lastTouchY = 0;
  private touchCount = 0;

  // カメラの初期位置を右ななめ上からに変更
  // 例: x=distance/2, y=distance/2, z=distance
  // azimuth, elevationも初期値を調整
  private initialAzimuth = 0; // 45度
  private initialElevation = Math.PI / 6; // 30度

  // カメラ制御パラメータ
  private distance = 10;
  private azimuth = this.initialAzimuth;
  private elevation = this.initialElevation;

  // 感度
  private rotateSpeed = 0.01;
  private panSpeed = 2.0; // パン速度を大きく
  private zoomSpeed = 0.1;
  private touchRotateSpeed = 1.2; // 初期値をより大きく
  private touchPanSpeed = 8.0; // 初期値をより大きく
  private touchZoomSpeed = 0.8; // 初期値をより大きく

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
    // マウスイベント
    this.setupMouseEvents();

    // タッチイベント
    this.setupTouchEvents();
  }

  private setupMouseEvents(): void {
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

  private setupTouchEvents(): void {
    // タッチ開始
    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        this.isTouchActive = true;
        this.touchCount = e.touches.length;

        if (this.touchCount === 1) {
          // 単一タッチ：回転
          const touch = e.touches[0];
          this.touchStartX = touch.clientX;
          this.touchStartY = touch.clientY;
          this.lastTouchX = touch.clientX;
          this.lastTouchY = touch.clientY;
        } else if (this.touchCount === 2) {
          // 二本指：ズームとパン
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          this.touchStartDistance = this.getTouchDistance(touch1, touch2);
          this.touchStartX = (touch1.clientX + touch2.clientX) / 2;
          this.touchStartY = (touch1.clientY + touch2.clientY) / 2;
          this.lastTouchX = this.touchStartX;
          this.lastTouchY = this.touchStartY;
        }
      },
      { passive: false }
    );

    // タッチ移動
    // setupTouchEventsメソッド内のtouchmoveイベントリスナーを修正

    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        if (!this.isTouchActive) return;

        if (this.touchCount === 1) {
          // 単一タッチ：回転
          const touch = e.touches[0];
          const deltaX = touch.clientX - this.lastTouchX;
          const deltaY = touch.clientY - this.lastTouchY;

          // 閾値を削除して、すべての動きを拾う
          this.rotate(
            deltaX * this.touchRotateSpeed,
            deltaY * this.touchRotateSpeed
          );

          this.lastTouchX = touch.clientX;
          this.lastTouchY = touch.clientY;
        } else if (this.touchCount === 2) {
          // 二本指：ズームとパン
          // ... 既存のコードを維持 ...
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const currentDistance = this.getTouchDistance(touch1, touch2);
          const currentX = (touch1.clientX + touch2.clientX) / 2;
          const currentY = (touch1.clientY + touch2.clientY) / 2;

          // より敏感なズーム
          const zoomDelta = this.touchStartDistance - currentDistance;
          this.distance += zoomDelta * this.touchZoomSpeed;
          this.distance = Math.max(5, Math.min(500, this.distance));

          // より敏感なパン
          const deltaX = currentX - this.lastTouchX;
          const deltaY = currentY - this.lastTouchY;

          this.pan(deltaX * this.touchPanSpeed, deltaY * this.touchPanSpeed);

          this.touchStartDistance = currentDistance;
          this.lastTouchX = currentX;
          this.lastTouchY = currentY;
        }
      },
      { passive: false }
    );

    // タッチ終了
    this.canvas.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        this.isTouchActive = false;
        this.touchCount = 0;
      },
      { passive: false }
    );

    // タッチキャンセル
    this.canvas.addEventListener(
      "touchcancel",
      (e) => {
        e.preventDefault();
        this.isTouchActive = false;
        this.touchCount = 0;
      },
      { passive: false }
    );
  }

  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
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

  // タッチ用パラメータ設定
  setTouchRotateSpeed(speed: number): void {
    this.touchRotateSpeed = speed;
  }

  setTouchPanSpeed(speed: number): void {
    this.touchPanSpeed = speed;
  }

  setTouchZoomSpeed(speed: number): void {
    this.touchZoomSpeed = speed;
  }

  // タッチ感度を一括設定
  setTouchSensitivity(
    rotateSpeed: number,
    panSpeed: number,
    zoomSpeed: number
  ): void {
    this.touchRotateSpeed = rotateSpeed;
    this.touchPanSpeed = panSpeed;
    this.touchZoomSpeed = zoomSpeed;
  }

  // 現在のタッチ感度を取得
  getTouchSensitivity(): { rotate: number; pan: number; zoom: number } {
    return {
      rotate: this.touchRotateSpeed,
      pan: this.touchPanSpeed,
      zoom: this.touchZoomSpeed,
    };
  }

  // 高感度モードに設定
  setHighSensitivityMode(): void {
    this.setTouchSensitivity(0.08, 8.0, 0.8);
  }

  // 標準感度モードに設定
  setNormalSensitivityMode(): void {
    this.setTouchSensitivity(0.05, 6.0, 0.5);
  }

  // 低感度モードに設定
  setLowSensitivityMode(): void {
    this.setTouchSensitivity(0.03, 4.0, 0.3);
  }
}
