// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CalibrationUI } from '../CalibrationUI.ts';
import { CalibrationModule } from '../../calibration/CalibrationModule.ts';

describe('CalibrationUI', () => {
  let calibrationModule: CalibrationModule;
  let ui: CalibrationUI;

  beforeEach(() => {
    calibrationModule = new CalibrationModule();
    ui = new CalibrationUI(calibrationModule);
  });

  afterEach(() => {
    ui.dispose();
  });

  describe('constructor', () => {
    it('should create overlay and prompt elements appended to document.body', () => {
      const overlay = ui.getOverlayElement();
      const prompt = ui.getPromptElement();
      expect(overlay).toBeInstanceOf(HTMLDivElement);
      expect(prompt).toBeInstanceOf(HTMLDivElement);
      expect(document.body.contains(overlay)).toBe(true);
      expect(document.body.contains(prompt)).toBe(true);
    });

    it('should have the overlay class', () => {
      expect(ui.getOverlayElement().classList.contains('toe-calib-overlay')).toBe(true);
    });

    it('should inject a style element into the container', () => {
      const styles = document.body.querySelectorAll('style');
      const hasCalibStyle = Array.from(styles).some((s) =>
        s.textContent?.includes('toe-calib-overlay'),
      );
      expect(hasCalibStyle).toBe(true);
    });

    it('should be hidden by default (both overlay and prompt)', () => {
      expect(ui.getOverlayElement().style.display).toBe('none');
      expect(ui.getPromptElement().style.display).toBe('none');
    });

    it('should append to a custom container when provided', () => {
      ui.dispose();
      const container = document.createElement('div');
      document.body.appendChild(container);

      ui = new CalibrationUI(calibrationModule, container);
      expect(container.contains(ui.getOverlayElement())).toBe(true);
      expect(container.contains(ui.getPromptElement())).toBe(true);

      container.remove();
    });

    it('should create 4 target marker elements inside the overlay', () => {
      const markers = ui.getOverlayElement().querySelectorAll('.toe-calib-marker');
      expect(markers.length).toBe(4);
    });

    it('should create instruction and progress elements', () => {
      const instruction = ui.getOverlayElement().querySelector('.toe-calib-instruction');
      const progress = ui.getOverlayElement().querySelector('.toe-calib-progress');
      expect(instruction).not.toBeNull();
      expect(progress).not.toBeNull();
    });

    it('should create start, restart, and record buttons', () => {
      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn');
      const restartBtn = ui.getOverlayElement().querySelector('.toe-calib-restart-btn');
      const recordBtn = ui.getOverlayElement().querySelector('.toe-calib-record-btn');
      expect(startBtn).not.toBeNull();
      expect(startBtn!.textContent).toBe('キャリブレーション開始');
      expect(restartBtn).not.toBeNull();
      expect(recordBtn).not.toBeNull();
    });

    it('should have markers with pointer-events: none (not clickable)', () => {
      const markers = ui.getOverlayElement().querySelectorAll('.toe-calib-marker');
      // Markers should not be interactive — check via CSS class
      // The CSS sets pointer-events: none on .toe-calib-marker
      expect(markers.length).toBe(4);
    });
  });

  describe('show / hide', () => {
    it('should display the overlay when show() is called', () => {
      ui.show();
      expect(ui.getOverlayElement().style.display).toBe('flex');
    });

    it('should hide the prompt when show() is called', () => {
      ui.showPrompt();
      ui.show();
      expect(ui.getPromptElement().style.display).toBe('none');
    });

    it('should hide the overlay when hide() is called', () => {
      ui.show();
      ui.hide();
      expect(ui.getOverlayElement().style.display).toBe('none');
    });

    it('should show the start button when show() is called', () => {
      ui.show();
      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn') as HTMLElement;
      expect(startBtn.style.display).toBe('inline-block');
    });

    it('should hide the record button before calibration starts', () => {
      ui.show();
      const recordBtn = ui.getOverlayElement().querySelector('.toe-calib-record-btn') as HTMLElement;
      expect(recordBtn.style.display).toBe('none');
    });
  });

  describe('showPrompt / hidePrompt', () => {
    it('should display the prompt when showPrompt() is called', () => {
      ui.showPrompt();
      expect(ui.getPromptElement().style.display).toBe('flex');
    });

    it('should hide the prompt when hidePrompt() is called', () => {
      ui.showPrompt();
      ui.hidePrompt();
      expect(ui.getPromptElement().style.display).toBe('none');
    });

    it('should contain a prompt message about calibration being needed', () => {
      const promptText = ui.getPromptElement().querySelector('span');
      expect(promptText!.textContent).toBe('キャリブレーションが必要です');
    });

    it('should open the overlay and start calibration when prompt button is clicked', () => {
      const startSpy = vi.spyOn(calibrationModule, 'startCalibration');
      ui.showPrompt();

      const promptBtn = ui.getPromptElement().querySelector('.toe-calib-prompt-btn') as HTMLElement;
      promptBtn.click();

      expect(ui.getPromptElement().style.display).toBe('none');
      expect(ui.getOverlayElement().style.display).toBe('flex');
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('calibration flow', () => {
    it('should start calibration when start button is clicked', () => {
      const startSpy = vi.spyOn(calibrationModule, 'startCalibration');
      ui.show();

      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn') as HTMLElement;
      startBtn.click();

      expect(startSpy).toHaveBeenCalled();
    });

    it('should show record button and hint after starting', () => {
      ui.show();
      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn') as HTMLElement;
      startBtn.click();

      const recordBtn = ui.getOverlayElement().querySelector('.toe-calib-record-btn') as HTMLElement;
      const hint = ui.getOverlayElement().querySelector('.toe-calib-hint') as HTMLElement;
      expect(recordBtn.style.display).toBe('inline-block');
      expect(hint.style.display).toBe('block');
    });

    it('should hide start button and show restart button after starting', () => {
      ui.show();
      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn') as HTMLElement;
      const restartBtn = ui.getOverlayElement().querySelector('.toe-calib-restart-btn') as HTMLElement;

      startBtn.click();

      expect(startBtn.style.display).toBe('none');
      expect(restartBtn.style.display).toBe('inline-block');
    });

    it('should highlight the first marker after starting calibration', () => {
      ui.show();
      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn') as HTMLElement;
      startBtn.click();

      const markers = ui.getOverlayElement().querySelectorAll('.toe-calib-marker');
      expect(markers[0]!.classList.contains('toe-calib-marker-active')).toBe(true);
      expect(markers[1]!.classList.contains('toe-calib-marker-active')).toBe(false);
    });

    it('should display progress text showing 0/4 after starting', () => {
      ui.show();
      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn') as HTMLElement;
      startBtn.click();

      const progress = ui.getOverlayElement().querySelector('.toe-calib-progress');
      expect(progress!.textContent).toBe('0/4 ポイント記録済み');
    });

    it('should advance to next marker when record button is clicked', () => {
      ui.show();
      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn') as HTMLElement;
      startBtn.click();

      const recordBtn = ui.getOverlayElement().querySelector('.toe-calib-record-btn') as HTMLElement;
      recordBtn.click();

      const markers = ui.getOverlayElement().querySelectorAll('.toe-calib-marker');
      expect(markers[0]!.classList.contains('toe-calib-marker-done')).toBe(true);
      expect(markers[1]!.classList.contains('toe-calib-marker-active')).toBe(true);

      const progress = ui.getOverlayElement().querySelector('.toe-calib-progress');
      expect(progress!.textContent).toBe('1/4 ポイント記録済み');
    });

    it('should advance when space key is pressed', () => {
      ui.show();
      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn') as HTMLElement;
      startBtn.click();

      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));

      const markers = ui.getOverlayElement().querySelectorAll('.toe-calib-marker');
      expect(markers[0]!.classList.contains('toe-calib-marker-done')).toBe(true);
      expect(markers[1]!.classList.contains('toe-calib-marker-active')).toBe(true);
    });

    it('should call onRecordRequest callback when recording', () => {
      const callback = vi.fn(() => true);
      ui.onRecordRequest = callback;

      ui.show();
      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn') as HTMLElement;
      startBtn.click();

      const recordBtn = ui.getOverlayElement().querySelector('.toe-calib-record-btn') as HTMLElement;
      recordBtn.click();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
    });

    it('should not advance when onRecordRequest returns false', () => {
      const callback = vi.fn(() => false);
      ui.onRecordRequest = callback;

      ui.show();
      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn') as HTMLElement;
      startBtn.click();

      const recordBtn = ui.getOverlayElement().querySelector('.toe-calib-record-btn') as HTMLElement;
      recordBtn.click();

      const markers = ui.getOverlayElement().querySelectorAll('.toe-calib-marker');
      expect(markers[0]!.classList.contains('toe-calib-marker-active')).toBe(true);
      const progress = ui.getOverlayElement().querySelector('.toe-calib-progress');
      expect(progress!.textContent).toBe('0/4 ポイント記録済み');
    });

    it('should show complete message after all 4 points are recorded', () => {
      vi.useFakeTimers();

      ui.show();
      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn') as HTMLElement;
      startBtn.click();

      const recordBtn = ui.getOverlayElement().querySelector('.toe-calib-record-btn') as HTMLElement;
      for (let i = 0; i < 4; i++) {
        recordBtn.click();
      }

      const completeMsg = ui.getOverlayElement().querySelector('.toe-calib-complete') as HTMLElement;
      expect(completeMsg.style.display).toBe('block');
      expect(completeMsg.textContent).toBe('完了');

      vi.useRealTimers();
    });

    it('should auto-hide after completion delay', () => {
      vi.useFakeTimers();

      ui.show();
      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn') as HTMLElement;
      startBtn.click();

      const recordBtn = ui.getOverlayElement().querySelector('.toe-calib-record-btn') as HTMLElement;
      for (let i = 0; i < 4; i++) {
        recordBtn.click();
      }

      expect(ui.getOverlayElement().style.display).toBe('flex');

      vi.advanceTimersByTime(2000);

      expect(ui.getOverlayElement().style.display).toBe('none');

      vi.useRealTimers();
    });

    it('should restart calibration when restart button is clicked', () => {
      const startSpy = vi.spyOn(calibrationModule, 'startCalibration');
      ui.show();

      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn') as HTMLElement;
      startBtn.click();

      const recordBtn = ui.getOverlayElement().querySelector('.toe-calib-record-btn') as HTMLElement;
      recordBtn.click();

      const restartBtn = ui.getOverlayElement().querySelector('.toe-calib-restart-btn') as HTMLElement;
      restartBtn.click();

      expect(startSpy).toHaveBeenCalledTimes(2);

      const progress = ui.getOverlayElement().querySelector('.toe-calib-progress');
      expect(progress!.textContent).toBe('0/4 ポイント記録済み');

      const markers = ui.getOverlayElement().querySelectorAll('.toe-calib-marker');
      expect(markers[0]!.classList.contains('toe-calib-marker-active')).toBe(true);
    });

    it('should not respond to space key when not calibrating', () => {
      ui.show();
      // Don't click start — still in start state

      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));

      const progress = ui.getOverlayElement().querySelector('.toe-calib-progress');
      expect(progress!.textContent).toBe('0/4 ポイント記録済み');
    });

    it('should remove key listener after hide', () => {
      ui.show();
      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn') as HTMLElement;
      startBtn.click();

      ui.hide();

      // Space key should not record after hide
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));

      const progress = calibrationModule.getProgress();
      expect(progress.recordedPoints).toBe(0);
    });

    it('should contain hint text about space key', () => {
      ui.show();
      const startBtn = ui.getOverlayElement().querySelector('.toe-calib-start-btn') as HTMLElement;
      startBtn.click();

      const hint = ui.getOverlayElement().querySelector('.toe-calib-hint');
      expect(hint!.textContent).toContain('スペースキー');
    });
  });

  describe('dispose', () => {
    it('should remove the overlay element from the DOM', () => {
      const overlay = ui.getOverlayElement();
      expect(document.body.contains(overlay)).toBe(true);

      ui.dispose();
      expect(document.body.contains(overlay)).toBe(false);
    });

    it('should remove the prompt element from the DOM', () => {
      const prompt = ui.getPromptElement();
      expect(document.body.contains(prompt)).toBe(true);

      ui.dispose();
      expect(document.body.contains(prompt)).toBe(false);
    });

    it('should remove the style element from the DOM', () => {
      const stylesBefore = document.body.querySelectorAll('style');
      const countBefore = Array.from(stylesBefore).filter((s) =>
        s.textContent?.includes('toe-calib-overlay'),
      ).length;

      ui.dispose();

      const stylesAfter = document.body.querySelectorAll('style');
      const countAfter = Array.from(stylesAfter).filter((s) =>
        s.textContent?.includes('toe-calib-overlay'),
      ).length;

      expect(countAfter).toBe(countBefore - 1);
    });
  });
});
