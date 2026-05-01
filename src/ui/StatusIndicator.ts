/**
 * ステータスインジケータ
 * つま先の検出状態（検出中/ロスト）とFPSカウンターを視覚的に表示する。
 * 画面右上に固定配置される。
 */
export class StatusIndicator {
  private element: HTMLDivElement;
  private dotElement: HTMLSpanElement;
  private labelElement: HTMLSpanElement;
  private fpsElement: HTMLSpanElement;
  private styleElement: HTMLStyleElement;
  private container: HTMLElement;

  constructor(container?: HTMLElement) {
    this.container = container ?? document.body;

    this.styleElement = this.createStyles();
    this.dotElement = this.createDotElement();
    this.labelElement = this.createLabelElement();
    this.fpsElement = this.createFpsElement();
    this.element = this.createContainerElement();

    this.element.appendChild(this.dotElement);
    this.element.appendChild(this.labelElement);
    this.element.appendChild(this.fpsElement);
    this.container.appendChild(this.styleElement);
    this.container.appendChild(this.element);

    // 初期状態: ロスト
    this.setStatus('lost');
  }

  /** 検出状態を設定する */
  setStatus(status: 'detecting' | 'lost'): void {
    if (status === 'detecting') {
      this.dotElement.className = 'toe-status-dot toe-status-detecting';
      this.labelElement.textContent = '検出中';
    } else {
      this.dotElement.className = 'toe-status-dot toe-status-lost';
      this.labelElement.textContent = 'ロスト';
    }
  }

  /** FPS値を更新する */
  updateFps(fps: number): void {
    this.fpsElement.textContent = `${Math.round(fps)} FPS`;
  }

  /** DOM要素を取得する（テスト用） */
  getElement(): HTMLDivElement {
    return this.element;
  }

  /** リソースを解放しDOM要素を削除する */
  dispose(): void {
    this.element.remove();
    this.styleElement.remove();
  }

  private createStyles(): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = `
      .toe-status-indicator {
        position: fixed;
        top: 12px;
        right: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background-color: rgba(0, 0, 0, 0.7);
        color: #fff;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        z-index: 99998;
        pointer-events: none;
        user-select: none;
      }

      .toe-status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .toe-status-detecting {
        background-color: #22c55e;
        box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
      }

      .toe-status-lost {
        background-color: #ef4444;
        box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
      }

      .toe-status-label {
        min-width: 40px;
      }

      .toe-status-fps {
        margin-left: 8px;
        padding-left: 8px;
        border-left: 1px solid rgba(255, 255, 255, 0.3);
        color: rgba(255, 255, 255, 0.8);
        font-variant-numeric: tabular-nums;
      }
    `;
    return style;
  }

  private createContainerElement(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'toe-status-indicator';
    return el;
  }

  private createDotElement(): HTMLSpanElement {
    const el = document.createElement('span');
    el.className = 'toe-status-dot toe-status-lost';
    return el;
  }

  private createLabelElement(): HTMLSpanElement {
    const el = document.createElement('span');
    el.className = 'toe-status-label';
    el.textContent = 'ロスト';
    return el;
  }

  private createFpsElement(): HTMLSpanElement {
    const el = document.createElement('span');
    el.className = 'toe-status-fps';
    el.textContent = '0 FPS';
    return el;
  }
}
