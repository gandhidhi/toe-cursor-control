/**
 * キャリブレーションUI
 *
 * キャリブレーション手順のガイドUIを提供する。
 * フルスクリーンオーバーレイとして表示し、4隅のターゲットマーカーを順番にハイライトする。
 *
 * 操作方法:
 *   1. ユーザーはつま先を床上のターゲット位置に置く
 *   2. スペースキーまたは画面中央の「記録」ボタンで確定
 *   3. 4点すべて記録するとキャリブレーション完了
 */
import { CalibrationModule } from '../calibration/CalibrationModule.ts';
import type { Point2D } from '../types/index.ts';

/** スクリーン端からのマージン (px) */
const MARGIN = 60;

/** 完了メッセージの自動非表示遅延 (ms) */
const AUTO_HIDE_DELAY_MS = 2000;

/** 4隅のターゲットポイント定義（順序: 左上、右上、右下、左下） */
interface TargetPoint {
  label: string;
  getPosition: (w: number, h: number) => Point2D;
}

const TARGET_POINTS: readonly TargetPoint[] = [
  { label: '左上', getPosition: (_w, _h) => ({ x: MARGIN, y: MARGIN }) },
  { label: '右上', getPosition: (w, _h) => ({ x: w - MARGIN, y: MARGIN }) },
  { label: '右下', getPosition: (w, h) => ({ x: w - MARGIN, y: h - MARGIN }) },
  { label: '左下', getPosition: (_w, h) => ({ x: MARGIN, y: h - MARGIN }) },
];

export class CalibrationUI {
  private container: HTMLElement;
  private styleElement: HTMLStyleElement;
  private calibrationModule: CalibrationModule;

  private overlayElement: HTMLDivElement;
  private markerElements: HTMLDivElement[] = [];
  private instructionElement: HTMLDivElement;
  private progressElement: HTMLDivElement;
  private startButton: HTMLButtonElement;
  private restartButton: HTMLButtonElement;
  private recordButton: HTMLButtonElement;
  private completeMessage: HTMLDivElement;
  private hintElement: HTMLDivElement;
  private promptElement: HTMLDivElement;

  /**
   * ポイント記録リクエスト時のコールバック。スクリーン座標を渡す。
   * 呼び出し側がカメラ空間座標を取得して recordPoint を呼ぶ責務を持つ。
   * true を返したら記録成功、false なら失敗（つま先未検出等）。
   */
  onRecordRequest: ((screenPoint: Point2D) => boolean) | null = null;

  private autoHideTimer: ReturnType<typeof setTimeout> | null = null;
  private calibrating = false;
  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(calibrationModule: CalibrationModule, container?: HTMLElement) {
    this.container = container ?? document.body;
    this.calibrationModule = calibrationModule;

    this.styleElement = this.createStyles();
    this.overlayElement = this.createOverlay();

    for (let i = 0; i < TARGET_POINTS.length; i++) {
      const marker = this.createMarker();
      this.markerElements.push(marker);
      this.overlayElement.appendChild(marker);
    }

    this.instructionElement = this.createInstructionElement();
    this.overlayElement.appendChild(this.instructionElement);

    this.progressElement = this.createProgressElement();
    this.overlayElement.appendChild(this.progressElement);

    this.hintElement = this.createHintElement();
    this.overlayElement.appendChild(this.hintElement);

    this.recordButton = this.createRecordButton();
    this.overlayElement.appendChild(this.recordButton);

    this.startButton = this.createStartButton();
    this.overlayElement.appendChild(this.startButton);

    this.restartButton = this.createRestartButton();
    this.overlayElement.appendChild(this.restartButton);

    this.completeMessage = this.createCompleteMessage();
    this.overlayElement.appendChild(this.completeMessage);

    this.promptElement = this.createPromptElement();

    this.container.appendChild(this.styleElement);
    this.container.appendChild(this.overlayElement);
    this.container.appendChild(this.promptElement);
    this.overlayElement.style.display = 'none';
    this.promptElement.style.display = 'none';
  }

  show(): void {
    this.overlayElement.style.display = 'flex';
    this.promptElement.style.display = 'none';
    this.showStartState();
  }

  hide(): void {
    this.overlayElement.style.display = 'none';
    this.calibrating = false;
    this.clearAutoHideTimer();
    this.removeKeyListener();
  }

  showPrompt(): void {
    this.promptElement.style.display = 'flex';
  }

  hidePrompt(): void {
    this.promptElement.style.display = 'none';
  }

  getOverlayElement(): HTMLDivElement {
    return this.overlayElement;
  }

  getPromptElement(): HTMLDivElement {
    return this.promptElement;
  }

  dispose(): void {
    this.clearAutoHideTimer();
    this.removeKeyListener();
    this.overlayElement.remove();
    this.promptElement.remove();
    this.styleElement.remove();
  }

  // ---------------------------------------------------------------------------
  // Public: trigger record from outside (for testing / programmatic use)
  // ---------------------------------------------------------------------------

  /** 現在のポイントを記録する（スペースキーまたは記録ボタンから呼ばれる） */
  recordCurrentPoint(): void {
    if (!this.calibrating) return;

    const progress = this.calibrationModule.getProgress();
    const index = progress.recordedPoints;
    if (index >= TARGET_POINTS.length) return;

    const w = this.overlayElement.clientWidth || window.innerWidth;
    const h = this.overlayElement.clientHeight || window.innerHeight;
    const target = TARGET_POINTS[index]!;
    const screenPoint = target.getPosition(w, h);

    if (this.onRecordRequest) {
      const success = this.onRecordRequest(screenPoint);
      if (!success) return;
    } else {
      this.calibrationModule.recordPoint(screenPoint, screenPoint);
    }

    const newProgress = this.calibrationModule.getProgress();
    this.updateProgress();

    if (newProgress.recordedPoints >= newProgress.requiredPoints) {
      this.onCalibrationComplete();
    } else {
      this.updateMarkers(newProgress.recordedPoints);
    }
  }

  // ---------------------------------------------------------------------------
  // Private: State management
  // ---------------------------------------------------------------------------

  private showStartState(): void {
    this.calibrating = false;
    this.startButton.style.display = 'inline-block';
    this.restartButton.style.display = 'none';
    this.recordButton.style.display = 'none';
    this.hintElement.style.display = 'none';
    this.completeMessage.style.display = 'none';
    this.updateMarkers(-1);
    this.updateProgress();
    this.removeKeyListener();
  }

  private startCalibration(): void {
    this.calibrationModule.startCalibration();
    this.calibrating = true;
    this.startButton.style.display = 'none';
    this.restartButton.style.display = 'inline-block';
    this.recordButton.style.display = 'inline-block';
    this.hintElement.style.display = 'block';
    this.completeMessage.style.display = 'none';
    this.updateMarkers(0);
    this.updateProgress();
    this.positionMarkers();
    this.addKeyListener();
  }

  private onCalibrationComplete(): void {
    this.calibrating = false;
    this.updateMarkers(-1);
    this.restartButton.style.display = 'none';
    this.recordButton.style.display = 'none';
    this.hintElement.style.display = 'none';
    this.completeMessage.style.display = 'block';
    this.instructionElement.textContent = 'キャリブレーションが完了しました';
    this.removeKeyListener();

    this.autoHideTimer = setTimeout(() => {
      this.hide();
    }, AUTO_HIDE_DELAY_MS);
  }

  private updateMarkers(activeIndex: number): void {
    for (let i = 0; i < this.markerElements.length; i++) {
      const marker = this.markerElements[i]!;
      if (i === activeIndex) {
        marker.classList.add('toe-calib-marker-active');
        marker.classList.remove('toe-calib-marker-done');
      } else if (i < activeIndex) {
        marker.classList.remove('toe-calib-marker-active');
        marker.classList.add('toe-calib-marker-done');
      } else {
        marker.classList.remove('toe-calib-marker-active');
        marker.classList.remove('toe-calib-marker-done');
      }
    }
  }

  private updateProgress(): void {
    const progress = this.calibrationModule.getProgress();
    this.instructionElement.textContent = progress.instruction;
    this.progressElement.textContent =
      `${progress.recordedPoints}/${progress.requiredPoints} ポイント記録済み`;
  }

  private positionMarkers(): void {
    const w = this.overlayElement.clientWidth || window.innerWidth;
    const h = this.overlayElement.clientHeight || window.innerHeight;

    for (let i = 0; i < TARGET_POINTS.length; i++) {
      const target = TARGET_POINTS[i]!;
      const pos = target.getPosition(w, h);
      const marker = this.markerElements[i]!;
      marker.style.left = `${pos.x}px`;
      marker.style.top = `${pos.y}px`;
    }
  }

  private clearAutoHideTimer(): void {
    if (this.autoHideTimer !== null) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Keyboard handling
  // ---------------------------------------------------------------------------

  private addKeyListener(): void {
    this.removeKeyListener();
    this.boundKeyHandler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.recordCurrentPoint();
      }
    };
    document.addEventListener('keydown', this.boundKeyHandler);
  }

  private removeKeyListener(): void {
    if (this.boundKeyHandler) {
      document.removeEventListener('keydown', this.boundKeyHandler);
      this.boundKeyHandler = null;
    }
  }

  // ---------------------------------------------------------------------------
  // DOM creation
  // ---------------------------------------------------------------------------

  private createStyles(): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = `
      .toe-calib-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.85);
        z-index: 100000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
        color: #fff;
        user-select: none;
      }

      .toe-calib-marker {
        position: absolute;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.4);
        background-color: rgba(255, 255, 255, 0.1);
        transform: translate(-50%, -50%);
        pointer-events: none;
        transition: all 0.3s ease;
        box-sizing: border-box;
      }

      .toe-calib-marker-active {
        border-color: #3b82f6;
        background-color: rgba(59, 130, 246, 0.4);
        box-shadow: 0 0 16px rgba(59, 130, 246, 0.6);
        animation: toe-calib-pulse 1.5s ease-in-out infinite;
      }

      .toe-calib-marker-done {
        border-color: #22c55e;
        background-color: rgba(34, 197, 94, 0.4);
      }

      @keyframes toe-calib-pulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-50%, -50%) scale(1.3); }
      }

      .toe-calib-instruction {
        font-size: 20px;
        font-weight: 500;
        margin-bottom: 12px;
        text-align: center;
      }

      .toe-calib-progress {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 16px;
      }

      .toe-calib-hint {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 20px;
        text-align: center;
      }

      .toe-calib-record-btn {
        padding: 12px 32px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        background-color: #22c55e;
        color: #fff;
        transition: background-color 0.2s ease, transform 0.1s ease;
        margin-bottom: 12px;
      }

      .toe-calib-record-btn:hover {
        background-color: #16a34a;
      }

      .toe-calib-record-btn:active {
        transform: scale(0.95);
      }

      .toe-calib-start-btn,
      .toe-calib-restart-btn {
        padding: 10px 24px;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }

      .toe-calib-start-btn {
        background-color: #3b82f6;
        color: #fff;
      }

      .toe-calib-start-btn:hover {
        background-color: #2563eb;
      }

      .toe-calib-restart-btn {
        background-color: rgba(255, 255, 255, 0.15);
        color: #e2e8f0;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .toe-calib-restart-btn:hover {
        background-color: rgba(255, 255, 255, 0.25);
      }

      .toe-calib-complete {
        font-size: 24px;
        font-weight: 600;
        color: #22c55e;
        margin-top: 16px;
      }

      .toe-calib-prompt {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 20px;
        background-color: rgba(0, 0, 0, 0.8);
        color: #fff;
        border-radius: 10px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        z-index: 99997;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .toe-calib-prompt-btn {
        padding: 6px 16px;
        border: none;
        border-radius: 6px;
        background-color: #3b82f6;
        color: #fff;
        font-size: 13px;
        cursor: pointer;
        white-space: nowrap;
      }

      .toe-calib-prompt-btn:hover {
        background-color: #2563eb;
      }
    `;
    return style;
  }

  private createOverlay(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'toe-calib-overlay';
    return el;
  }

  private createMarker(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'toe-calib-marker';
    return el;
  }

  private createInstructionElement(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'toe-calib-instruction';
    return el;
  }

  private createProgressElement(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'toe-calib-progress';
    return el;
  }

  private createHintElement(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'toe-calib-hint';
    el.textContent = 'つま先をターゲット位置に置いて、スペースキーまたは下のボタンで記録';
    el.style.display = 'none';
    return el;
  }

  private createRecordButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'toe-calib-record-btn';
    btn.textContent = '📍 記録（スペースキー）';
    btn.style.display = 'none';
    btn.addEventListener('click', () => this.recordCurrentPoint());
    return btn;
  }

  private createStartButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'toe-calib-start-btn';
    btn.textContent = 'キャリブレーション開始';
    btn.addEventListener('click', () => this.startCalibration());
    return btn;
  }

  private createRestartButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'toe-calib-restart-btn';
    btn.textContent = 'キャリブレーションをやり直す';
    btn.style.display = 'none';
    btn.addEventListener('click', () => this.startCalibration());
    return btn;
  }

  private createCompleteMessage(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'toe-calib-complete';
    el.textContent = '完了';
    el.style.display = 'none';
    return el;
  }

  private createPromptElement(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'toe-calib-prompt';

    const text = document.createElement('span');
    text.textContent = 'キャリブレーションが必要です';

    const btn = document.createElement('button');
    btn.className = 'toe-calib-prompt-btn';
    btn.textContent = 'キャリブレーション開始';
    btn.addEventListener('click', () => {
      this.hidePrompt();
      this.show();
      this.startCalibration();
    });

    el.appendChild(text);
    el.appendChild(btn);
    return el;
  }
}
