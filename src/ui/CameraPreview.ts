/**
 * カメラプレビュー
 * カメラ映像のプレビュー表示と検出されたつま先位置のオーバーレイ表示を担当する。
 * 画面左下にピクチャーインピクチャー風に固定配置される。
 * 3段階の表示モード: 折りたたみ ↔ 小窓 ↔ フルスクリーン
 */
export type PreviewMode = 'collapsed' | 'pip' | 'fullscreen';

export class CameraPreview {
  private container: HTMLElement;
  private wrapperElement: HTMLDivElement;
  private videoElement: HTMLVideoElement;
  private canvasElement: HTMLCanvasElement;
  private toggleButton: HTMLButtonElement;
  private fullscreenButton: HTMLButtonElement;
  private styleElement: HTMLStyleElement;
  private canvasCtx: CanvasRenderingContext2D | null;

  private mode: PreviewMode = 'pip';
  private toePosition: { x: number; y: number } | null = null;

  /** デフォルトのプレビューサイズ */
  static readonly DEFAULT_WIDTH = 320;
  static readonly DEFAULT_HEIGHT = 240;

  /** つま先マーカーの半径 (px) */
  private static readonly MARKER_RADIUS = 8;

  constructor(container?: HTMLElement) {
    this.container = container ?? document.body;

    this.styleElement = this.createStyles();
    this.videoElement = this.createVideoElement();
    this.canvasElement = this.createCanvasElement();
    this.canvasCtx = this.canvasElement.getContext('2d');
    this.toggleButton = this.createToggleButton();
    this.fullscreenButton = this.createFullscreenButton();
    this.wrapperElement = this.createWrapperElement();

    this.wrapperElement.appendChild(this.videoElement);
    this.wrapperElement.appendChild(this.canvasElement);
    this.wrapperElement.appendChild(this.toggleButton);
    this.wrapperElement.appendChild(this.fullscreenButton);
    this.container.appendChild(this.styleElement);
    this.container.appendChild(this.wrapperElement);
  }

  /** カメラ映像ソースを接続する */
  setVideoSource(video: HTMLVideoElement): void {
    if (video.srcObject) {
      this.videoElement.srcObject = video.srcObject;
    }
    const playResult = this.videoElement.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {
        // autoplay may be blocked; ignore silently
      });
    }
  }

  /** 検出されたつま先位置を更新しマーカーを描画する */
  updateToePosition(x: number, y: number): void {
    this.toePosition = { x, y };
    this.drawMarker();
  }

  /** つま先マーカーをクリアする */
  clearToePosition(): void {
    this.toePosition = null;
    this.clearCanvas();
  }

  /** プレビューの折りたたみ/展開を切り替える（collapsed ↔ pip） */
  toggle(): void {
    if (this.mode === 'fullscreen') {
      this.setMode('pip');
    } else if (this.mode === 'pip') {
      this.setMode('collapsed');
    } else {
      this.setMode('pip');
    }
  }

  /** フルスクリーン表示を切り替える（pip ↔ fullscreen） */
  toggleFullscreen(): void {
    if (this.mode === 'fullscreen') {
      this.setMode('pip');
    } else {
      this.setMode('fullscreen');
    }
  }

  /** 表示モードを設定する */
  setMode(mode: PreviewMode): void {
    this.mode = mode;

    this.wrapperElement.classList.remove(
      'toe-camera-preview-collapsed',
      'toe-camera-preview-fullscreen',
    );

    switch (mode) {
      case 'collapsed':
        this.wrapperElement.classList.add('toe-camera-preview-collapsed');
        this.toggleButton.textContent = '▶';
        this.toggleButton.setAttribute('aria-label', 'プレビューを展開');
        this.fullscreenButton.style.display = 'none';
        break;
      case 'pip':
        this.toggleButton.textContent = '◀';
        this.toggleButton.setAttribute('aria-label', 'プレビューを折りたたむ');
        this.fullscreenButton.textContent = '⛶';
        this.fullscreenButton.setAttribute('aria-label', 'フルスクリーン');
        this.fullscreenButton.style.display = 'flex';
        break;
      case 'fullscreen':
        this.wrapperElement.classList.add('toe-camera-preview-fullscreen');
        this.toggleButton.textContent = '◀';
        this.toggleButton.setAttribute('aria-label', 'プレビューを折りたたむ');
        this.fullscreenButton.textContent = '⛶';
        this.fullscreenButton.setAttribute('aria-label', '小窓に戻す');
        this.fullscreenButton.style.display = 'flex';
        break;
    }
  }

  /** 現在の表示モードを取得する */
  getMode(): PreviewMode {
    return this.mode;
  }

  /** 折りたたみ状態を取得する（後方互換） */
  isCollapsed(): boolean {
    return this.mode === 'collapsed';
  }

  /** ラッパーDOM要素を取得する（テスト用） */
  getElement(): HTMLDivElement {
    return this.wrapperElement;
  }

  /** video要素を取得する（テスト用） */
  getVideoElement(): HTMLVideoElement {
    return this.videoElement;
  }

  /** canvas要素を取得する（テスト用） */
  getCanvasElement(): HTMLCanvasElement {
    return this.canvasElement;
  }

  /** リソースを解放しDOM要素を削除する */
  dispose(): void {
    this.videoElement.srcObject = null;
    this.wrapperElement.remove();
    this.styleElement.remove();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private drawMarker(): void {
    if (!this.canvasCtx || !this.toePosition) return;

    this.clearCanvas();

    const ctx = this.canvasCtx;
    const { x, y } = this.toePosition;

    // 外側のリング
    ctx.beginPath();
    ctx.arc(x, y, CameraPreview.MARKER_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 内側の塗りつぶし
    ctx.beginPath();
    ctx.arc(x, y, CameraPreview.MARKER_RADIUS * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.fill();
  }

  private clearCanvas(): void {
    if (!this.canvasCtx) return;
    this.canvasCtx.clearRect(
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height,
    );
  }

  private createStyles(): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = `
      .toe-camera-preview {
        position: fixed;
        bottom: 12px;
        left: 12px;
        width: ${CameraPreview.DEFAULT_WIDTH}px;
        height: ${CameraPreview.DEFAULT_HEIGHT}px;
        background-color: #000;
        border-radius: 8px;
        overflow: hidden;
        z-index: 99997;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        transition: all 0.3s ease;
        user-select: none;
      }

      .toe-camera-preview-collapsed {
        width: 48px;
        height: 48px;
        opacity: 0.7;
      }

      .toe-camera-preview-fullscreen {
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100%;
        border-radius: 0;
        z-index: 99998;
      }

      .toe-camera-preview video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .toe-camera-preview-fullscreen video {
        object-fit: contain;
      }

      .toe-camera-preview-collapsed video,
      .toe-camera-preview-collapsed canvas {
        display: none;
      }

      .toe-camera-preview canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .toe-camera-preview-toggle {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 24px;
        height: 24px;
        border: none;
        border-radius: 4px;
        background-color: rgba(0, 0, 0, 0.5);
        color: #fff;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        line-height: 1;
        z-index: 1;
      }

      .toe-camera-preview-toggle:hover {
        background-color: rgba(0, 0, 0, 0.7);
      }

      .toe-camera-preview-collapsed .toe-camera-preview-toggle {
        top: 50%;
        left: 50%;
        right: auto;
        transform: translate(-50%, -50%);
      }

      .toe-camera-preview-fullscreen-btn {
        position: absolute;
        top: 4px;
        right: 32px;
        width: 24px;
        height: 24px;
        border: none;
        border-radius: 4px;
        background-color: rgba(0, 0, 0, 0.5);
        color: #fff;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        line-height: 1;
        z-index: 1;
      }

      .toe-camera-preview-fullscreen-btn:hover {
        background-color: rgba(0, 0, 0, 0.7);
      }

      .toe-camera-preview-fullscreen .toe-camera-preview-toggle,
      .toe-camera-preview-fullscreen .toe-camera-preview-fullscreen-btn {
        top: 12px;
        width: 36px;
        height: 36px;
        font-size: 16px;
        border-radius: 6px;
      }

      .toe-camera-preview-fullscreen .toe-camera-preview-toggle {
        right: 12px;
      }

      .toe-camera-preview-fullscreen .toe-camera-preview-fullscreen-btn {
        right: 56px;
      }
    `;
    return style;
  }

  private createWrapperElement(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'toe-camera-preview';
    return el;
  }

  private createVideoElement(): HTMLVideoElement {
    const el = document.createElement('video');
    el.autoplay = true;
    el.muted = true;
    el.playsInline = true;
    el.setAttribute('aria-label', 'カメラプレビュー');
    return el;
  }

  private createCanvasElement(): HTMLCanvasElement {
    const el = document.createElement('canvas');
    el.width = CameraPreview.DEFAULT_WIDTH;
    el.height = CameraPreview.DEFAULT_HEIGHT;
    return el;
  }

  private createToggleButton(): HTMLButtonElement {
    const el = document.createElement('button');
    el.className = 'toe-camera-preview-toggle';
    el.textContent = '◀';
    el.setAttribute('aria-label', 'プレビューを折りたたむ');
    el.addEventListener('click', () => this.toggle());
    return el;
  }

  private createFullscreenButton(): HTMLButtonElement {
    const el = document.createElement('button');
    el.className = 'toe-camera-preview-fullscreen-btn';
    el.textContent = '⛶';
    el.setAttribute('aria-label', 'フルスクリーン');
    el.addEventListener('click', () => this.toggleFullscreen());
    return el;
  }
}
