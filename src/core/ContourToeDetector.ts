import type { ToeDetectionResult, Point3D } from '../types/index.ts';
import type { IToeDetector } from './ToeDetectorInterface.ts';

/**
 * 背景差分＋輪郭解析によるつま先検出器（天井カメラ用）
 *
 * アルゴリズム:
 * 1. 背景フレームをキャプチャ（初期化時 or 手動リセット）
 * 2. 各フレームで背景との差分を計算
 * 3. 差分が閾値を超えるピクセルを前景（足）として抽出
 * 4. 前景領域の輪郭から最も先端の点をつま先として特定
 *
 * 天井から真下を撮影する構成を想定。
 * z座標は前景面積の変化から推定（タップ検出用、将来対応）。
 */
export class ContourToeDetector implements IToeDetector {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;

  private backgroundFrame: ImageData | null = null;
  private lastPosition: Point3D | null = null;

  /** 背景差分の閾値（0-255） */
  private diffThreshold = 30;

  /** 前景と判定する最小ピクセル数 */
  private minForegroundPixels = 100;

  /** 処理解像度（パフォーマンスのため縮小） */
  private processWidth = 160;
  private processHeight = 120;

  /** 背景キャプチャ待ちフレーム数 */
  private warmupFrames = 30;
  private frameCount = 0;

  /** 背景キャプチャ完了時のコールバック */
  onBackgroundCaptured: (() => void) | null = null;

  /** ウォームアップ開始時のコールバック */
  onWarmupStarted: (() => void) | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.processWidth;
    this.canvas.height = this.processHeight;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;

    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = this.processWidth;
    this.bgCanvas.height = this.processHeight;
    this.bgCtx = this.bgCanvas.getContext('2d', { willReadFrequently: true })!;
  }

  async initialize(): Promise<void> {
    // 背景差分は外部モデル不要。背景フレームは最初の数フレーム後に自動キャプチャ。
  }

  async detect(video: HTMLVideoElement): Promise<ToeDetectionResult> {
    const timestamp = performance.now();

    // 映像をキャンバスに描画（縮小）
    this.ctx.drawImage(video, 0, 0, this.processWidth, this.processHeight);
    const currentFrame = this.ctx.getImageData(0, 0, this.processWidth, this.processHeight);

    this.frameCount++;

    // ウォームアップ開始通知
    if (this.frameCount === 1 && !this.backgroundFrame) {
      if (this.onWarmupStarted) this.onWarmupStarted();
    }

    // ウォームアップ期間: 背景をキャプチャ
    if (this.frameCount === this.warmupFrames && !this.backgroundFrame) {
      this.captureBackground(video);
      if (this.onBackgroundCaptured) this.onBackgroundCaptured();
    }

    if (!this.backgroundFrame) {
      return this.buildLostResult(timestamp);
    }

    // 背景差分を計算
    const foregroundMask = this.computeForegroundMask(currentFrame);

    // 前景ピクセル数をカウント
    let foregroundCount = 0;
    for (let i = 0; i < foregroundMask.length; i++) {
      if (foregroundMask[i]) foregroundCount++;
    }

    if (foregroundCount < this.minForegroundPixels) {
      return this.buildLostResult(timestamp);
    }

    // つま先位置を特定（前景領域の最も下の点 = 天井カメラでは足の先端）
    const toePoint = this.findToePoint(foregroundMask);

    if (!toePoint) {
      return this.buildLostResult(timestamp);
    }

    // 正規化座標に変換（0〜1）
    const position: Point3D = {
      x: toePoint.x / this.processWidth,
      y: toePoint.y / this.processHeight,
      z: foregroundCount / (this.processWidth * this.processHeight), // 面積比をz代わりに
    };

    this.lastPosition = position;

    return {
      position,
      confidence: Math.min(foregroundCount / this.minForegroundPixels, 1),
      detected: true,
      timestamp,
    };
  }

  setTargetFoot(_foot: 'left' | 'right'): void {
    // 背景差分モードでは足の左右区別は行わない（最大の前景領域の先端を追跡）
  }

  dispose(): void {
    this.backgroundFrame = null;
    this.lastPosition = null;
    this.frameCount = 0;
  }

  /** 背景フレームを手動でキャプチャする */
  captureBackground(video: HTMLVideoElement): void {
    this.bgCtx.drawImage(video, 0, 0, this.processWidth, this.processHeight);
    this.backgroundFrame = this.bgCtx.getImageData(0, 0, this.processWidth, this.processHeight);
  }

  /** 背景フレームをリセットする（次のウォームアップで再キャプチャ） */
  resetBackground(): void {
    this.backgroundFrame = null;
    this.frameCount = 0;
  }

  /** 差分閾値を設定する */
  setDiffThreshold(threshold: number): void {
    this.diffThreshold = Math.max(1, Math.min(255, threshold));
  }

  /** 差分閾値を取得する */
  getDiffThreshold(): number {
    return this.diffThreshold;
  }

  /** 背景がキャプチャ済みかどうか */
  hasBackground(): boolean {
    return this.backgroundFrame !== null;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  /**
   * 背景差分から前景マスクを計算する。
   * 各ピクセルのRGB差分の合計が閾値を超えたら前景とする。
   */
  private computeForegroundMask(currentFrame: ImageData): boolean[] {
    const bg = this.backgroundFrame!.data;
    const cur = currentFrame.data;
    const pixelCount = this.processWidth * this.processHeight;
    const mask = new Array<boolean>(pixelCount);

    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      const dr = Math.abs(cur[idx]! - bg[idx]!);
      const dg = Math.abs(cur[idx + 1]! - bg[idx + 1]!);
      const db = Math.abs(cur[idx + 2]! - bg[idx + 2]!);
      const diff = (dr + dg + db) / 3;
      mask[i] = diff > this.diffThreshold;
    }

    return mask;
  }

  /**
   * 前景マスクからつま先位置を特定する。
   *
   * 天井カメラの場合、足の先端は前景領域の重心から最も遠い端点。
   * シンプルな実装として、前景領域の重心を計算し、
   * 重心から最も遠い前景ピクセルをつま先とする。
   */
  private findToePoint(mask: boolean[]): { x: number; y: number } | null {
    // 重心を計算
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (let y = 0; y < this.processHeight; y++) {
      for (let x = 0; x < this.processWidth; x++) {
        if (mask[y * this.processWidth + x]) {
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }

    if (count === 0) return null;

    const cx = sumX / count;
    const cy = sumY / count;

    // 重心から最も遠い前景ピクセルを探す
    let maxDist = 0;
    let toeX = cx;
    let toeY = cy;

    for (let y = 0; y < this.processHeight; y++) {
      for (let x = 0; x < this.processWidth; x++) {
        if (mask[y * this.processWidth + x]) {
          const dx = x - cx;
          const dy = y - cy;
          const dist = dx * dx + dy * dy;
          if (dist > maxDist) {
            maxDist = dist;
            toeX = x;
            toeY = y;
          }
        }
      }
    }

    return { x: toeX, y: toeY };
  }

  private buildLostResult(timestamp: number): ToeDetectionResult {
    return {
      position: this.lastPosition,
      confidence: 0,
      detected: false,
      timestamp,
    };
  }
}
