import { describe, it, expect, vi } from 'vitest';
import { CursorController, clampToScreen } from '../CursorController.ts';
import type { DOMAdapter, ClickEventInfo } from '../CursorController.ts';
import type { ScreenSize } from '../../types/index.ts';

const VIEWPORT: ScreenSize = { width: 1920, height: 1080 };

/** テスト用のモックDOMAdapter */
function createMockDOM() {
  const dispatched: { element: unknown; info: ClickEventInfo }[] = [];
  let currentElement: Element | null = {} as Element;

  const adapter: DOMAdapter & {
    dispatched: typeof dispatched;
    setElement: (el: Element | null) => void;
  } = {
    dispatched,
    setElement(el: Element | null) {
      currentElement = el;
    },
    elementFromPoint: vi.fn((_x: number, _y: number) => currentElement),
    dispatchClickEvent: vi.fn((element: Element, info: ClickEventInfo) => {
      dispatched.push({ element, info });
    }),
  };

  return adapter;
}

describe('clampToScreen', () => {
  it('should not modify positions within bounds', () => {
    const result = clampToScreen({ x: 100, y: 200 }, VIEWPORT);
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it('should clamp negative values to 0', () => {
    const result = clampToScreen({ x: -50, y: -30 }, VIEWPORT);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('should clamp values exceeding screen size', () => {
    const result = clampToScreen({ x: 2500, y: 1500 }, VIEWPORT);
    expect(result).toEqual({ x: 1920, y: 1080 });
  });

  it('should allow boundary values', () => {
    expect(clampToScreen({ x: 0, y: 0 }, VIEWPORT)).toEqual({ x: 0, y: 0 });
    expect(clampToScreen({ x: 1920, y: 1080 }, VIEWPORT)).toEqual({ x: 1920, y: 1080 });
  });
});

describe('CursorController', () => {
  describe('updatePosition / getPosition', () => {
    it('should store and return the cursor position', () => {
      const controller = new CursorController(VIEWPORT, createMockDOM());
      controller.updatePosition({ x: 100, y: 200 });
      expect(controller.getPosition()).toEqual({ x: 100, y: 200 });
    });

    it('should default to (0, 0)', () => {
      const controller = new CursorController(VIEWPORT, createMockDOM());
      expect(controller.getPosition()).toEqual({ x: 0, y: 0 });
    });

    it('should return a copy of the position (not a reference)', () => {
      const controller = new CursorController(VIEWPORT, createMockDOM());
      controller.updatePosition({ x: 50, y: 60 });
      const pos = controller.getPosition();
      pos.x = 999;
      expect(controller.getPosition()).toEqual({ x: 50, y: 60 });
    });

    it('should update position when called multiple times', () => {
      const controller = new CursorController(VIEWPORT, createMockDOM());
      controller.updatePosition({ x: 10, y: 20 });
      controller.updatePosition({ x: 300, y: 400 });
      expect(controller.getPosition()).toEqual({ x: 300, y: 400 });
    });
  });

  describe('viewport clamping', () => {
    it('should clamp negative x to 0', () => {
      const controller = new CursorController(VIEWPORT, createMockDOM());
      controller.updatePosition({ x: -50, y: 100 });
      expect(controller.getPosition()).toEqual({ x: 0, y: 100 });
    });

    it('should clamp negative y to 0', () => {
      const controller = new CursorController(VIEWPORT, createMockDOM());
      controller.updatePosition({ x: 100, y: -30 });
      expect(controller.getPosition()).toEqual({ x: 100, y: 0 });
    });

    it('should clamp x exceeding viewport width', () => {
      const controller = new CursorController(VIEWPORT, createMockDOM());
      controller.updatePosition({ x: 2500, y: 100 });
      expect(controller.getPosition()).toEqual({ x: VIEWPORT.width, y: 100 });
    });

    it('should clamp y exceeding viewport height', () => {
      const controller = new CursorController(VIEWPORT, createMockDOM());
      controller.updatePosition({ x: 100, y: 1500 });
      expect(controller.getPosition()).toEqual({ x: 100, y: VIEWPORT.height });
    });

    it('should clamp both coordinates when both are out of bounds', () => {
      const controller = new CursorController(VIEWPORT, createMockDOM());
      controller.updatePosition({ x: -10, y: 2000 });
      expect(controller.getPosition()).toEqual({ x: 0, y: VIEWPORT.height });
    });

    it('should not clamp positions within viewport', () => {
      const controller = new CursorController(VIEWPORT, createMockDOM());
      controller.updatePosition({ x: 960, y: 540 });
      expect(controller.getPosition()).toEqual({ x: 960, y: 540 });
    });

    it('should allow positions at viewport boundaries', () => {
      const controller = new CursorController(VIEWPORT, createMockDOM());
      controller.updatePosition({ x: 0, y: 0 });
      expect(controller.getPosition()).toEqual({ x: 0, y: 0 });

      controller.updatePosition({ x: VIEWPORT.width, y: VIEWPORT.height });
      expect(controller.getPosition()).toEqual({ x: VIEWPORT.width, y: VIEWPORT.height });
    });
  });

  describe('emitClick', () => {
    it('should dispatch a click event on the element at the given position', () => {
      const dom = createMockDOM();
      const controller = new CursorController(VIEWPORT, dom);

      controller.emitClick({ x: 100, y: 200 });

      expect(dom.elementFromPoint).toHaveBeenCalledWith(100, 200);
      expect(dom.dispatchClickEvent).toHaveBeenCalledTimes(1);
      expect(dom.dispatched).toHaveLength(1);

      const info = dom.dispatched[0]!.info;
      expect(info.type).toBe('click');
      expect(info.clientX).toBe(100);
      expect(info.clientY).toBe(200);
      expect(info.bubbles).toBe(true);
      expect(info.cancelable).toBe(true);
    });

    it('should not dispatch when no element is found at the position', () => {
      const dom = createMockDOM();
      dom.setElement(null);
      const controller = new CursorController(VIEWPORT, dom);

      controller.emitClick({ x: 100, y: 200 });

      expect(dom.elementFromPoint).toHaveBeenCalled();
      expect(dom.dispatchClickEvent).not.toHaveBeenCalled();
    });

    it('should clamp the position before dispatching', () => {
      const dom = createMockDOM();
      const controller = new CursorController(VIEWPORT, dom);

      controller.emitClick({ x: -50, y: 2000 });

      expect(dom.elementFromPoint).toHaveBeenCalledWith(0, VIEWPORT.height);
      expect(dom.dispatched[0]!.info.clientX).toBe(0);
      expect(dom.dispatched[0]!.info.clientY).toBe(VIEWPORT.height);
    });
  });

  describe('emitDoubleClick', () => {
    it('should dispatch a dblclick event on the element at the given position', () => {
      const dom = createMockDOM();
      const controller = new CursorController(VIEWPORT, dom);

      controller.emitDoubleClick({ x: 500, y: 300 });

      expect(dom.elementFromPoint).toHaveBeenCalledWith(500, 300);
      expect(dom.dispatchClickEvent).toHaveBeenCalledTimes(1);
      expect(dom.dispatched).toHaveLength(1);

      const info = dom.dispatched[0]!.info;
      expect(info.type).toBe('dblclick');
      expect(info.clientX).toBe(500);
      expect(info.clientY).toBe(300);
      expect(info.bubbles).toBe(true);
      expect(info.cancelable).toBe(true);
    });

    it('should not dispatch when no element is found at the position', () => {
      const dom = createMockDOM();
      dom.setElement(null);
      const controller = new CursorController(VIEWPORT, dom);

      controller.emitDoubleClick({ x: 100, y: 200 });

      expect(dom.elementFromPoint).toHaveBeenCalled();
      expect(dom.dispatchClickEvent).not.toHaveBeenCalled();
    });

    it('should clamp the position before dispatching', () => {
      const dom = createMockDOM();
      const controller = new CursorController(VIEWPORT, dom);

      controller.emitDoubleClick({ x: 3000, y: -100 });

      expect(dom.elementFromPoint).toHaveBeenCalledWith(VIEWPORT.width, 0);
      expect(dom.dispatched[0]!.info.clientX).toBe(VIEWPORT.width);
      expect(dom.dispatched[0]!.info.clientY).toBe(0);
    });
  });

  describe('setScreenSize', () => {
    it('should update the screen size used for clamping', () => {
      const controller = new CursorController({ width: 800, height: 600 }, createMockDOM());
      controller.updatePosition({ x: 1000, y: 700 });
      expect(controller.getPosition()).toEqual({ x: 800, y: 600 });

      controller.setScreenSize({ width: 1920, height: 1080 });
      controller.updatePosition({ x: 1000, y: 700 });
      expect(controller.getPosition()).toEqual({ x: 1000, y: 700 });
    });
  });
});
