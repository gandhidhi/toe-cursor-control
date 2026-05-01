// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CameraPreview } from '../CameraPreview.ts';

describe('CameraPreview', () => {
  let preview: CameraPreview;

  beforeEach(() => {
    preview = new CameraPreview();
  });

  afterEach(() => {
    preview.dispose();
  });

  describe('constructor', () => {
    it('should create a wrapper element appended to document.body', () => {
      const el = preview.getElement();
      expect(el).toBeInstanceOf(HTMLDivElement);
      expect(document.body.contains(el)).toBe(true);
    });

    it('should have the camera preview class', () => {
      expect(preview.getElement().classList.contains('toe-camera-preview')).toBe(true);
    });

    it('should contain a video element', () => {
      const video = preview.getElement().querySelector('video');
      expect(video).not.toBeNull();
      expect(video!.autoplay).toBe(true);
      expect(video!.muted).toBe(true);
    });

    it('should contain a canvas element with default dimensions', () => {
      const canvas = preview.getCanvasElement();
      expect(canvas.width).toBe(CameraPreview.DEFAULT_WIDTH);
      expect(canvas.height).toBe(CameraPreview.DEFAULT_HEIGHT);
    });

    it('should contain a toggle button', () => {
      const btn = preview.getElement().querySelector('.toe-camera-preview-toggle');
      expect(btn).not.toBeNull();
      expect(btn!.classList.contains('toe-camera-preview-toggle')).toBe(true);
    });

    it('should contain a fullscreen button', () => {
      const btn = preview.getElement().querySelector('.toe-camera-preview-fullscreen-btn');
      expect(btn).not.toBeNull();
    });

    it('should inject a style element into the container', () => {
      const styles = document.body.querySelectorAll('style');
      const hasPreviewStyle = Array.from(styles).some((s) =>
        s.textContent?.includes('toe-camera-preview'),
      );
      expect(hasPreviewStyle).toBe(true);
    });

    it('should append to a custom container when provided', () => {
      preview.dispose();
      const container = document.createElement('div');
      document.body.appendChild(container);

      preview = new CameraPreview(container);
      expect(container.contains(preview.getElement())).toBe(true);

      container.remove();
    });

    it('should not be collapsed by default', () => {
      expect(preview.isCollapsed()).toBe(false);
    });
  });

  describe('toggle', () => {
    it('should collapse the preview when toggled from pip', () => {
      preview.toggle();
      expect(preview.isCollapsed()).toBe(true);
      expect(preview.getMode()).toBe('collapsed');
      expect(
        preview.getElement().classList.contains('toe-camera-preview-collapsed'),
      ).toBe(true);
    });

    it('should expand the preview when toggled from collapsed', () => {
      preview.toggle(); // pip → collapsed
      preview.toggle(); // collapsed → pip
      expect(preview.isCollapsed()).toBe(false);
      expect(preview.getMode()).toBe('pip');
      expect(
        preview.getElement().classList.contains('toe-camera-preview-collapsed'),
      ).toBe(false);
    });

    it('should update the toggle button text on collapse', () => {
      const btn = preview.getElement().querySelector('.toe-camera-preview-toggle')!;
      expect(btn.textContent).toBe('◀');

      preview.toggle();
      expect(btn.textContent).toBe('▶');

      preview.toggle();
      expect(btn.textContent).toBe('◀');
    });

    it('should be triggered by clicking the toggle button', () => {
      const btn = preview.getElement().querySelector('.toe-camera-preview-toggle')!;
      (btn as HTMLElement).click();
      expect(preview.isCollapsed()).toBe(true);

      (btn as HTMLElement).click();
      expect(preview.isCollapsed()).toBe(false);
    });

    it('should go from fullscreen to pip when toggled', () => {
      preview.setMode('fullscreen');
      preview.toggle();
      expect(preview.getMode()).toBe('pip');
    });
  });

  describe('fullscreen', () => {
    it('should enter fullscreen mode', () => {
      preview.toggleFullscreen();
      expect(preview.getMode()).toBe('fullscreen');
      expect(
        preview.getElement().classList.contains('toe-camera-preview-fullscreen'),
      ).toBe(true);
    });

    it('should exit fullscreen back to pip', () => {
      preview.toggleFullscreen(); // pip → fullscreen
      preview.toggleFullscreen(); // fullscreen → pip
      expect(preview.getMode()).toBe('pip');
      expect(
        preview.getElement().classList.contains('toe-camera-preview-fullscreen'),
      ).toBe(false);
    });

    it('should be triggered by clicking the fullscreen button', () => {
      const btn = preview.getElement().querySelector('.toe-camera-preview-fullscreen-btn') as HTMLElement;
      btn.click();
      expect(preview.getMode()).toBe('fullscreen');

      btn.click();
      expect(preview.getMode()).toBe('pip');
    });

    it('should hide fullscreen button when collapsed', () => {
      preview.setMode('collapsed');
      const btn = preview.getElement().querySelector('.toe-camera-preview-fullscreen-btn') as HTMLElement;
      expect(btn.style.display).toBe('none');
    });

    it('should show fullscreen button in pip mode', () => {
      const btn = preview.getElement().querySelector('.toe-camera-preview-fullscreen-btn') as HTMLElement;
      // In pip mode (default), fullscreen button should not be hidden
      expect(btn.style.display).not.toBe('none');
    });

    it('should use setMode to switch between all modes', () => {
      preview.setMode('fullscreen');
      expect(preview.getMode()).toBe('fullscreen');

      preview.setMode('collapsed');
      expect(preview.getMode()).toBe('collapsed');

      preview.setMode('pip');
      expect(preview.getMode()).toBe('pip');
    });
  });

  describe('updateToePosition', () => {
    it('should not throw when updating toe position', () => {
      // jsdom does not implement canvas getContext('2d'), so we verify
      // the method runs without error (canvas drawing is a no-op in jsdom)
      expect(() => preview.updateToePosition(100, 100)).not.toThrow();
    });
  });

  describe('clearToePosition', () => {
    it('should not throw when clearing toe position', () => {
      preview.updateToePosition(100, 100);
      expect(() => preview.clearToePosition()).not.toThrow();
    });
  });

  describe('setVideoSource', () => {
    it('should copy srcObject from the source video element', () => {
      const sourceVideo = document.createElement('video');
      // Create a minimal mock MediaStream
      const mockStream = { id: 'mock' } as unknown as MediaStream;
      sourceVideo.srcObject = mockStream;

      preview.setVideoSource(sourceVideo);
      expect(preview.getVideoElement().srcObject).toBe(mockStream);
    });

    it('should not set srcObject when source has no stream', () => {
      const sourceVideo = document.createElement('video');
      preview.setVideoSource(sourceVideo);
      // srcObject remains falsy (null or undefined depending on environment)
      expect(preview.getVideoElement().srcObject).toBeFalsy();
    });
  });

  describe('dispose', () => {
    it('should remove the wrapper element from the DOM', () => {
      const el = preview.getElement();
      expect(document.body.contains(el)).toBe(true);

      preview.dispose();
      expect(document.body.contains(el)).toBe(false);
    });

    it('should remove the style element from the DOM', () => {
      const stylesBefore = document.body.querySelectorAll('style');
      const countBefore = Array.from(stylesBefore).filter((s) =>
        s.textContent?.includes('toe-camera-preview'),
      ).length;

      preview.dispose();

      const stylesAfter = document.body.querySelectorAll('style');
      const countAfter = Array.from(stylesAfter).filter((s) =>
        s.textContent?.includes('toe-camera-preview'),
      ).length;

      expect(countAfter).toBe(countBefore - 1);
    });

    it('should clear the video srcObject', () => {
      const sourceVideo = document.createElement('video');
      const mockStream = { id: 'mock' } as unknown as MediaStream;
      sourceVideo.srcObject = mockStream;
      preview.setVideoSource(sourceVideo);

      preview.dispose();
      expect(preview.getVideoElement().srcObject).toBeNull();
    });
  });
});
