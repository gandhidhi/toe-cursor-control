import type { Point2D, ScreenSize } from '../types/index.ts';

/**
 * カーソル位置をScreen Space範囲内にクランプする純粋関数
 */
export function clampToScreen(position: Point2D, screenSize: ScreenSize): Point2D {
  return {
    x: Math.max(0, Math.min(position.x, screenSize.width)),
    y: Math.max(0, Math.min(position.y, screenSize.height)),
  };
}

/** クリックイベントの情報 */
export interface ClickEventInfo {
  type: 'click' | 'dblclick';
  clientX: number;
  clientY: number;
  bubbles: boolean;
  cancelable: boolean;
}

/** DOM操作のインターフェース（テスト時にモック可能） */
export interface DOMAdapter {
  elementFromPoint(x: number, y: number): Element | null;
  dispatchClickEvent(element: Element, info: ClickEventInfo): void;
}

/** ブラウザ環境用のデフォルトDOMAdapter */
export function createBrowserDOMAdapter(): DOMAdapter {
  return {
    elementFromPoint(x: number, y: number): Element | null {
      return document.elementFromPoint(x, y);
    },
    dispatchClickEvent(element: Element, info: ClickEventInfo): void {
      element.dispatchEvent(
        new MouseEvent(info.type, {
          clientX: info.clientX,
          clientY: info.clientY,
          bubbles: info.bubbles,
          cancelable: info.cancelable,
        }),
      );
    },
  };
}

/**
 * カーソル制御モジュール
 * カーソルの表示位置更新とクリックイベントの発火を担当する。
 */
export class CursorController {
  private position: Point2D = { x: 0, y: 0 };
  private screenSize: ScreenSize;
  private dom: DOMAdapter;

  constructor(screenSize: ScreenSize, dom?: DOMAdapter) {
    this.screenSize = screenSize;
    this.dom = dom ?? createBrowserDOMAdapter();
  }

  /** スクリーンサイズを更新する */
  setScreenSize(screenSize: ScreenSize): void {
    this.screenSize = screenSize;
  }

  /** カーソル位置を更新する（Screen Space範囲内にクランプ） */
  updatePosition(position: Point2D): void {
    this.position = clampToScreen(position, this.screenSize);
  }

  /** 現在のカーソル位置を取得する */
  getPosition(): Point2D {
    return { ...this.position };
  }

  /** 指定位置でクリックイベントを発火する */
  emitClick(position: Point2D): void {
    const clamped = clampToScreen(position, this.screenSize);
    const target = this.dom.elementFromPoint(clamped.x, clamped.y);
    if (target) {
      this.dom.dispatchClickEvent(target, {
        type: 'click',
        clientX: clamped.x,
        clientY: clamped.y,
        bubbles: true,
        cancelable: true,
      });
    }
  }

  /** 指定位置でダブルクリックイベントを発火する */
  emitDoubleClick(position: Point2D): void {
    const clamped = clampToScreen(position, this.screenSize);
    const target = this.dom.elementFromPoint(clamped.x, clamped.y);
    if (target) {
      this.dom.dispatchClickEvent(target, {
        type: 'dblclick',
        clientX: clamped.x,
        clientY: clamped.y,
        bubbles: true,
        cancelable: true,
      });
    }
  }
}
