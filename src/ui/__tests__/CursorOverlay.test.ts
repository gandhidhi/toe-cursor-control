// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CursorOverlay } from '../CursorOverlay.ts';

describe('CursorOverlay', () => {
  let overlay: CursorOverlay;

  beforeEach(() => {
    overlay = new CursorOverlay();
  });

  afterEach(() => {
    overlay.dispose();
  });

  describe('constructor', () => {
    it('should create a cursor element appended to document.body', () => {
      const el = overlay.getElement();
      expect(el).toBeInstanceOf(HTMLDivElement);
      expect(document.body.contains(el)).toBe(true);
    });

    it('should be hidden by default', () => {
      expect(overlay.getElement().style.display).toBe('none');
    });

    it('should inject a style element into the container', () => {
      const styles = document.body.querySelectorAll('style');
      const hasOverlayStyle = Array.from(styles).some((s) =>
        s.textContent?.includes('toe-cursor-overlay'),
      );
      expect(hasOverlayStyle).toBe(true);
    });

    it('should append to a custom container when provided', () => {
      overlay.dispose();
      const container = document.createElement('div');
      document.body.appendChild(container);

      overlay = new CursorOverlay(container);
      expect(container.contains(overlay.getElement())).toBe(true);

      container.remove();
    });
  });

  describe('updatePosition', () => {
    it('should update the left and top CSS properties', () => {
      overlay.updatePosition(150, 300);
      const el = overlay.getElement();
      expect(el.style.left).toBe('150px');
      expect(el.style.top).toBe('300px');
    });

    it('should handle zero coordinates', () => {
      overlay.updatePosition(0, 0);
      const el = overlay.getElement();
      expect(el.style.left).toBe('0px');
      expect(el.style.top).toBe('0px');
    });
  });

  describe('show / hide', () => {
    it('should make the cursor visible when show() is called', () => {
      overlay.show();
      expect(overlay.getElement().style.display).toBe('block');
    });

    it('should hide the cursor when hide() is called', () => {
      overlay.show();
      overlay.hide();
      expect(overlay.getElement().style.display).toBe('none');
    });
  });

  describe('pulse', () => {
    it('should add the pulse-active class to the pulse ring element', () => {
      overlay.pulse();
      const pulseRing = overlay.getElement().querySelector('.toe-cursor-pulse-ring');
      expect(pulseRing).not.toBeNull();
      expect(pulseRing!.classList.contains('toe-cursor-pulse-active')).toBe(true);
    });

    it('should re-trigger the animation on consecutive calls', () => {
      overlay.pulse();
      const pulseRing = overlay.getElement().querySelector('.toe-cursor-pulse-ring')!;
      expect(pulseRing.classList.contains('toe-cursor-pulse-active')).toBe(true);

      // Second call should still have the class (re-triggered)
      overlay.pulse();
      expect(pulseRing.classList.contains('toe-cursor-pulse-active')).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should remove the cursor element from the DOM', () => {
      const el = overlay.getElement();
      expect(document.body.contains(el)).toBe(true);

      overlay.dispose();
      expect(document.body.contains(el)).toBe(false);
    });

    it('should remove the style element from the DOM', () => {
      const stylesBefore = document.body.querySelectorAll('style');
      const countBefore = Array.from(stylesBefore).filter((s) =>
        s.textContent?.includes('toe-cursor-overlay'),
      ).length;

      overlay.dispose();

      const stylesAfter = document.body.querySelectorAll('style');
      const countAfter = Array.from(stylesAfter).filter((s) =>
        s.textContent?.includes('toe-cursor-overlay'),
      ).length;

      expect(countAfter).toBe(countBefore - 1);
    });
  });
});
