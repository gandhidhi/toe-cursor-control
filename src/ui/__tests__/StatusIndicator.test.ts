// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StatusIndicator } from '../StatusIndicator.ts';

describe('StatusIndicator', () => {
  let indicator: StatusIndicator;

  beforeEach(() => {
    indicator = new StatusIndicator();
  });

  afterEach(() => {
    indicator.dispose();
  });

  describe('constructor', () => {
    it('should create a container element appended to document.body', () => {
      const el = indicator.getElement();
      expect(el).toBeInstanceOf(HTMLDivElement);
      expect(document.body.contains(el)).toBe(true);
    });

    it('should have the status indicator class', () => {
      expect(indicator.getElement().classList.contains('toe-status-indicator')).toBe(true);
    });

    it('should inject a style element into the container', () => {
      const styles = document.body.querySelectorAll('style');
      const hasIndicatorStyle = Array.from(styles).some((s) =>
        s.textContent?.includes('toe-status-indicator'),
      );
      expect(hasIndicatorStyle).toBe(true);
    });

    it('should default to lost status', () => {
      const dot = indicator.getElement().querySelector('.toe-status-dot');
      expect(dot!.classList.contains('toe-status-lost')).toBe(true);

      const label = indicator.getElement().querySelector('.toe-status-label');
      expect(label!.textContent).toBe('ロスト');
    });

    it('should append to a custom container when provided', () => {
      indicator.dispose();
      const container = document.createElement('div');
      document.body.appendChild(container);

      indicator = new StatusIndicator(container);
      expect(container.contains(indicator.getElement())).toBe(true);

      container.remove();
    });
  });

  describe('setStatus', () => {
    it('should show detecting state with green indicator', () => {
      indicator.setStatus('detecting');

      const dot = indicator.getElement().querySelector('.toe-status-dot');
      expect(dot!.classList.contains('toe-status-detecting')).toBe(true);
      expect(dot!.classList.contains('toe-status-lost')).toBe(false);

      const label = indicator.getElement().querySelector('.toe-status-label');
      expect(label!.textContent).toBe('検出中');
    });

    it('should show lost state with red indicator', () => {
      indicator.setStatus('detecting');
      indicator.setStatus('lost');

      const dot = indicator.getElement().querySelector('.toe-status-dot');
      expect(dot!.classList.contains('toe-status-lost')).toBe(true);
      expect(dot!.classList.contains('toe-status-detecting')).toBe(false);

      const label = indicator.getElement().querySelector('.toe-status-label');
      expect(label!.textContent).toBe('ロスト');
    });
  });

  describe('updateFps', () => {
    it('should display the FPS value rounded to an integer', () => {
      indicator.updateFps(29.7);

      const fps = indicator.getElement().querySelector('.toe-status-fps');
      expect(fps!.textContent).toBe('30 FPS');
    });

    it('should display 0 FPS for zero value', () => {
      indicator.updateFps(0);

      const fps = indicator.getElement().querySelector('.toe-status-fps');
      expect(fps!.textContent).toBe('0 FPS');
    });

    it('should update when called multiple times', () => {
      indicator.updateFps(60);
      indicator.updateFps(15);

      const fps = indicator.getElement().querySelector('.toe-status-fps');
      expect(fps!.textContent).toBe('15 FPS');
    });
  });

  describe('dispose', () => {
    it('should remove the indicator element from the DOM', () => {
      const el = indicator.getElement();
      expect(document.body.contains(el)).toBe(true);

      indicator.dispose();
      expect(document.body.contains(el)).toBe(false);
    });

    it('should remove the style element from the DOM', () => {
      const stylesBefore = document.body.querySelectorAll('style');
      const countBefore = Array.from(stylesBefore).filter((s) =>
        s.textContent?.includes('toe-status-indicator'),
      ).length;

      indicator.dispose();

      const stylesAfter = document.body.querySelectorAll('style');
      const countAfter = Array.from(stylesAfter).filter((s) =>
        s.textContent?.includes('toe-status-indicator'),
      ).length;

      expect(countAfter).toBe(countBefore - 1);
    });
  });
});
