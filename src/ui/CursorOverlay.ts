/**
 * カーソルオーバーレイ
 * カーソルの視覚的表示を担当するカスタムDOM要素。
 * 半透明の円形カーソルを絶対配置し、CSS transitionsで滑らかに移動する。
 * クリック時にはパルスアニメーション＋画面フラッシュで視覚的フィードバックを提供する。
 */
export class CursorOverlay {
  private element: HTMLDivElement;
  private pulseElement: HTMLDivElement;
  private flashElement: HTMLDivElement;
  private styleElement: HTMLStyleElement;
  private container: HTMLElement;

  /** カーソルの直径 (px) */
  private static readonly CURSOR_SIZE = 24;

  constructor(container?: HTMLElement) {
    this.container = container ?? document.body;

    this.styleElement = this.createStyles();
    this.element = this.createCursorElement();
    this.pulseElement = this.createPulseElement();
    this.flashElement = this.createFlashElement();

    this.element.appendChild(this.pulseElement);
    this.container.appendChild(this.styleElement);
    this.container.appendChild(this.element);
    this.container.appendChild(this.flashElement);
  }

  /** カーソル位置を更新する */
  updatePosition(x: number, y: number): void {
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }

  /** カーソルを表示する */
  show(): void {
    this.element.style.display = 'block';
  }

  /** カーソルを非表示にする */
  hide(): void {
    this.element.style.display = 'none';
  }

  /** クリック時の視覚的フィードバック（パルス＋フラッシュ） */
  pulse(): void {
    // パルスリングをリセットして再トリガー
    this.pulseElement.classList.remove('toe-cursor-pulse-active');
    void this.pulseElement.offsetWidth;
    this.pulseElement.classList.add('toe-cursor-pulse-active');

    // カーソル自体を一瞬ハイライト
    this.element.classList.remove('toe-cursor-hit');
    void this.element.offsetWidth;
    this.element.classList.add('toe-cursor-hit');

    // 画面フラッシュ
    this.flashElement.classList.remove('toe-cursor-flash-active');
    void this.flashElement.offsetWidth;
    this.flashElement.classList.add('toe-cursor-flash-active');
  }

  /** DOM要素を取得する（テスト用） */
  getElement(): HTMLDivElement {
    return this.element;
  }

  /** リソースを解放しDOM要素を削除する */
  dispose(): void {
    this.element.remove();
    this.flashElement.remove();
    this.styleElement.remove();
  }

  private createStyles(): HTMLStyleElement {
    const style = document.createElement('style');
    const size = CursorOverlay.CURSOR_SIZE;
    style.textContent = `
      .toe-cursor-overlay {
        position: fixed;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background-color: rgba(59, 130, 246, 0.6);
        border: 3px solid rgba(59, 130, 246, 0.9);
        pointer-events: none;
        z-index: 99999;
        transform: translate(-50%, -50%);
        transition: left 0.05s ease-out, top 0.05s ease-out, background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        box-sizing: border-box;
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
      }

      .toe-cursor-hit {
        animation: toe-cursor-hit-anim 0.35s ease-out forwards;
      }

      @keyframes toe-cursor-hit-anim {
        0% {
          background-color: rgba(250, 204, 21, 1);
          border-color: rgba(250, 204, 21, 1);
          box-shadow: 0 0 24px rgba(250, 204, 21, 0.8);
          transform: translate(-50%, -50%) scale(1.5);
        }
        100% {
          background-color: rgba(59, 130, 246, 0.6);
          border-color: rgba(59, 130, 246, 0.9);
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
          transform: translate(-50%, -50%) scale(1);
        }
      }

      .toe-cursor-pulse-ring {
        position: absolute;
        top: 50%;
        left: 50%;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid rgba(250, 204, 21, 0.8);
        transform: translate(-50%, -50%) scale(1);
        opacity: 0;
        pointer-events: none;
        box-sizing: border-box;
      }

      .toe-cursor-pulse-active {
        animation: toe-cursor-pulse-anim 0.6s ease-out forwards;
      }

      @keyframes toe-cursor-pulse-anim {
        0% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
          border-width: 3px;
        }
        100% {
          transform: translate(-50%, -50%) scale(4);
          opacity: 0;
          border-width: 1px;
        }
      }

      .toe-cursor-flash {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 99998;
        opacity: 0;
        background-color: rgba(250, 204, 21, 0.15);
      }

      .toe-cursor-flash-active {
        animation: toe-cursor-flash-anim 0.3s ease-out forwards;
      }

      @keyframes toe-cursor-flash-anim {
        0% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }
    `;
    return style;
  }

  private createCursorElement(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'toe-cursor-overlay';
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.display = 'none';
    return el;
  }

  private createPulseElement(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'toe-cursor-pulse-ring';
    return el;
  }

  private createFlashElement(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'toe-cursor-flash';
    return el;
  }
}
