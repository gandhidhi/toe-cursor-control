/**
 * 通知バナー
 * エラーメッセージやパフォーマンス警告をバナー形式で表示する。
 * 画面上部中央に固定配置され、エラー（赤）と警告（黄/アンバー）の2種類をサポートする。
 * 警告はデフォルト5秒後に自動非表示、エラーは手動で閉じるまで表示し続ける。
 */

export type NotificationType = 'error' | 'warning';

/** よく使う通知メッセージの定数 */
export const NotificationMessages = {
  CAMERA_DENIED: 'カメラへのアクセスを許可してください',
  CAMERA_NOT_FOUND: '利用可能なカメラが見つかりません',
  PERFORMANCE_WARNING: 'パフォーマンスが低下しています',
  MODEL_LOAD_ERROR: 'モデルの読み込みに失敗しました',
} as const;

export class NotificationBanner {
  private element: HTMLDivElement;
  private messageElement: HTMLSpanElement;
  private closeButton: HTMLButtonElement;
  private styleElement: HTMLStyleElement;
  private container: HTMLElement;
  private autoHideTimer: ReturnType<typeof setTimeout> | null = null;

  /** 警告の自動非表示までのデフォルト時間 (ms) */
  private static readonly DEFAULT_WARNING_TIMEOUT = 5000;

  constructor(container?: HTMLElement) {
    this.container = container ?? document.body;

    this.styleElement = this.createStyles();
    this.messageElement = this.createMessageElement();
    this.closeButton = this.createCloseButton();
    this.element = this.createContainerElement();

    this.element.appendChild(this.messageElement);
    this.element.appendChild(this.closeButton);
    this.container.appendChild(this.styleElement);
    this.container.appendChild(this.element);

    this.closeButton.addEventListener('click', () => this.hide());
  }

  /** バナーを表示する */
  show(message: string, type: NotificationType, timeoutMs?: number): void {
    this.clearAutoHideTimer();

    this.messageElement.textContent = message;

    this.element.className = 'toe-notification-banner';
    if (type === 'error') {
      this.element.classList.add('toe-notification-error');
    } else {
      this.element.classList.add('toe-notification-warning');
    }

    this.element.style.display = 'flex';

    // 警告は自動非表示、エラーは手動で閉じるまで表示
    if (type === 'warning') {
      const timeout = timeoutMs ?? NotificationBanner.DEFAULT_WARNING_TIMEOUT;
      this.autoHideTimer = setTimeout(() => this.hide(), timeout);
    } else if (timeoutMs !== undefined) {
      this.autoHideTimer = setTimeout(() => this.hide(), timeoutMs);
    }
  }

  /** バナーを非表示にする */
  hide(): void {
    this.clearAutoHideTimer();
    this.element.style.display = 'none';
  }

  /** カメラアクセス拒否エラーを表示する */
  showCameraDenied(): void {
    this.show(NotificationMessages.CAMERA_DENIED, 'error');
  }

  /** カメラ未検出エラーを表示する */
  showCameraNotFound(): void {
    this.show(NotificationMessages.CAMERA_NOT_FOUND, 'error');
  }

  /** パフォーマンス低下警告を表示する */
  showPerformanceWarning(): void {
    this.show(NotificationMessages.PERFORMANCE_WARNING, 'warning');
  }

  /** モデル読み込みエラーを表示する */
  showModelLoadError(): void {
    this.show(NotificationMessages.MODEL_LOAD_ERROR, 'error');
  }

  /** DOM要素を取得する（テスト用） */
  getElement(): HTMLDivElement {
    return this.element;
  }

  /** リソースを解放しDOM要素を削除する */
  dispose(): void {
    this.clearAutoHideTimer();
    this.element.remove();
    this.styleElement.remove();
  }

  private clearAutoHideTimer(): void {
    if (this.autoHideTimer !== null) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }

  private createStyles(): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = `
      .toe-notification-banner {
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        display: none;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        z-index: 100000;
        pointer-events: auto;
        user-select: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 90vw;
      }

      .toe-notification-error {
        background-color: #fef2f2;
        color: #991b1b;
        border: 1px solid #fca5a5;
      }

      .toe-notification-warning {
        background-color: #fffbeb;
        color: #92400e;
        border: 1px solid #fcd34d;
      }

      .toe-notification-message {
        flex: 1;
        line-height: 1.4;
      }

      .toe-notification-close {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        color: inherit;
        opacity: 0.6;
      }

      .toe-notification-close:hover {
        opacity: 1;
        background-color: rgba(0, 0, 0, 0.1);
      }
    `;
    return style;
  }

  private createContainerElement(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'toe-notification-banner';
    el.style.display = 'none';
    el.setAttribute('role', 'alert');
    return el;
  }

  private createMessageElement(): HTMLSpanElement {
    const el = document.createElement('span');
    el.className = 'toe-notification-message';
    return el;
  }

  private createCloseButton(): HTMLButtonElement {
    const el = document.createElement('button');
    el.className = 'toe-notification-close';
    el.textContent = '✕';
    el.setAttribute('aria-label', '閉じる');
    return el;
  }
}
