// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  NotificationBanner,
  NotificationMessages,
} from '../NotificationBanner.ts';

describe('NotificationBanner', () => {
  let banner: NotificationBanner;

  beforeEach(() => {
    vi.useFakeTimers();
    banner = new NotificationBanner();
  });

  afterEach(() => {
    banner.dispose();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create a container element appended to document.body', () => {
      const el = banner.getElement();
      expect(el).toBeInstanceOf(HTMLDivElement);
      expect(document.body.contains(el)).toBe(true);
    });

    it('should have the notification banner class', () => {
      expect(
        banner.getElement().classList.contains('toe-notification-banner'),
      ).toBe(true);
    });

    it('should inject a style element into the container', () => {
      const styles = document.body.querySelectorAll('style');
      const hasStyle = Array.from(styles).some((s) =>
        s.textContent?.includes('toe-notification-banner'),
      );
      expect(hasStyle).toBe(true);
    });

    it('should be hidden by default', () => {
      expect(banner.getElement().style.display).toBe('none');
    });

    it('should have role="alert" for accessibility', () => {
      expect(banner.getElement().getAttribute('role')).toBe('alert');
    });

    it('should append to a custom container when provided', () => {
      banner.dispose();
      const container = document.createElement('div');
      document.body.appendChild(container);

      banner = new NotificationBanner(container);
      expect(container.contains(banner.getElement())).toBe(true);

      container.remove();
    });
  });

  describe('show', () => {
    it('should display the banner with the given message', () => {
      banner.show('テストメッセージ', 'error');

      expect(banner.getElement().style.display).toBe('flex');
      const msg = banner.getElement().querySelector('.toe-notification-message');
      expect(msg!.textContent).toBe('テストメッセージ');
    });

    it('should apply error styling for error type', () => {
      banner.show('エラー', 'error');

      expect(
        banner.getElement().classList.contains('toe-notification-error'),
      ).toBe(true);
      expect(
        banner.getElement().classList.contains('toe-notification-warning'),
      ).toBe(false);
    });

    it('should apply warning styling for warning type', () => {
      banner.show('警告', 'warning');

      expect(
        banner.getElement().classList.contains('toe-notification-warning'),
      ).toBe(true);
      expect(
        banner.getElement().classList.contains('toe-notification-error'),
      ).toBe(false);
    });

    it('should auto-hide warnings after default timeout (5000ms)', () => {
      banner.show('警告', 'warning');
      expect(banner.getElement().style.display).toBe('flex');

      vi.advanceTimersByTime(4999);
      expect(banner.getElement().style.display).toBe('flex');

      vi.advanceTimersByTime(1);
      expect(banner.getElement().style.display).toBe('none');
    });

    it('should auto-hide warnings after custom timeout', () => {
      banner.show('警告', 'warning', 2000);
      expect(banner.getElement().style.display).toBe('flex');

      vi.advanceTimersByTime(2000);
      expect(banner.getElement().style.display).toBe('none');
    });

    it('should not auto-hide errors by default', () => {
      banner.show('エラー', 'error');
      expect(banner.getElement().style.display).toBe('flex');

      vi.advanceTimersByTime(10000);
      expect(banner.getElement().style.display).toBe('flex');
    });

    it('should auto-hide errors when explicit timeout is provided', () => {
      banner.show('エラー', 'error', 3000);

      vi.advanceTimersByTime(3000);
      expect(banner.getElement().style.display).toBe('none');
    });

    it('should switch type correctly when called multiple times', () => {
      banner.show('エラー', 'error');
      expect(
        banner.getElement().classList.contains('toe-notification-error'),
      ).toBe(true);

      banner.show('警告', 'warning');
      expect(
        banner.getElement().classList.contains('toe-notification-warning'),
      ).toBe(true);
      expect(
        banner.getElement().classList.contains('toe-notification-error'),
      ).toBe(false);
    });

    it('should reset auto-hide timer when show is called again', () => {
      banner.show('警告1', 'warning', 3000);

      vi.advanceTimersByTime(2000);
      banner.show('警告2', 'warning', 3000);

      // 2000ms more from second show — should still be visible
      vi.advanceTimersByTime(2000);
      expect(banner.getElement().style.display).toBe('flex');

      // 1000ms more — now 3000ms from second show
      vi.advanceTimersByTime(1000);
      expect(banner.getElement().style.display).toBe('none');
    });
  });

  describe('hide', () => {
    it('should hide the banner', () => {
      banner.show('テスト', 'error');
      banner.hide();

      expect(banner.getElement().style.display).toBe('none');
    });

    it('should clear any pending auto-hide timer', () => {
      banner.show('警告', 'warning', 3000);
      banner.hide();

      // Show again as error (no auto-hide)
      banner.show('エラー', 'error');

      // Advance past the original warning timeout
      vi.advanceTimersByTime(5000);
      // Should still be visible since the timer was cleared
      expect(banner.getElement().style.display).toBe('flex');
    });
  });

  describe('close button', () => {
    it('should hide the banner when close button is clicked', () => {
      banner.show('テスト', 'error');

      const closeBtn = banner
        .getElement()
        .querySelector('.toe-notification-close') as HTMLButtonElement;
      closeBtn.click();

      expect(banner.getElement().style.display).toBe('none');
    });

    it('should have an accessible aria-label', () => {
      const closeBtn = banner
        .getElement()
        .querySelector('.toe-notification-close') as HTMLButtonElement;
      expect(closeBtn.getAttribute('aria-label')).toBe('閉じる');
    });
  });

  describe('convenience methods', () => {
    it('showCameraDenied should show camera denied error', () => {
      banner.showCameraDenied();

      expect(banner.getElement().style.display).toBe('flex');
      const msg = banner.getElement().querySelector('.toe-notification-message');
      expect(msg!.textContent).toBe(NotificationMessages.CAMERA_DENIED);
      expect(
        banner.getElement().classList.contains('toe-notification-error'),
      ).toBe(true);
    });

    it('showCameraNotFound should show camera not found error', () => {
      banner.showCameraNotFound();

      expect(banner.getElement().style.display).toBe('flex');
      const msg = banner.getElement().querySelector('.toe-notification-message');
      expect(msg!.textContent).toBe(NotificationMessages.CAMERA_NOT_FOUND);
      expect(
        banner.getElement().classList.contains('toe-notification-error'),
      ).toBe(true);
    });

    it('showPerformanceWarning should show performance warning', () => {
      banner.showPerformanceWarning();

      expect(banner.getElement().style.display).toBe('flex');
      const msg = banner.getElement().querySelector('.toe-notification-message');
      expect(msg!.textContent).toBe(NotificationMessages.PERFORMANCE_WARNING);
      expect(
        banner.getElement().classList.contains('toe-notification-warning'),
      ).toBe(true);
    });

    it('showPerformanceWarning should auto-hide after default timeout', () => {
      banner.showPerformanceWarning();

      vi.advanceTimersByTime(5000);
      expect(banner.getElement().style.display).toBe('none');
    });

    it('showModelLoadError should show model load error', () => {
      banner.showModelLoadError();

      expect(banner.getElement().style.display).toBe('flex');
      const msg = banner.getElement().querySelector('.toe-notification-message');
      expect(msg!.textContent).toBe(NotificationMessages.MODEL_LOAD_ERROR);
      expect(
        banner.getElement().classList.contains('toe-notification-error'),
      ).toBe(true);
    });

    it('showModelLoadError should not auto-hide', () => {
      banner.showModelLoadError();

      vi.advanceTimersByTime(10000);
      expect(banner.getElement().style.display).toBe('flex');
    });
  });

  describe('dispose', () => {
    it('should remove the banner element from the DOM', () => {
      const el = banner.getElement();
      expect(document.body.contains(el)).toBe(true);

      banner.dispose();
      expect(document.body.contains(el)).toBe(false);
    });

    it('should remove the style element from the DOM', () => {
      const stylesBefore = document.body.querySelectorAll('style');
      const countBefore = Array.from(stylesBefore).filter((s) =>
        s.textContent?.includes('toe-notification-banner'),
      ).length;

      banner.dispose();

      const stylesAfter = document.body.querySelectorAll('style');
      const countAfter = Array.from(stylesAfter).filter((s) =>
        s.textContent?.includes('toe-notification-banner'),
      ).length;

      expect(countAfter).toBe(countBefore - 1);
    });

    it('should clear any pending auto-hide timer', () => {
      banner.show('警告', 'warning', 3000);
      banner.dispose();

      // Should not throw after dispose
      vi.advanceTimersByTime(5000);
    });
  });
});

describe('NotificationMessages', () => {
  it('should have the correct camera denied message', () => {
    expect(NotificationMessages.CAMERA_DENIED).toBe(
      'カメラへのアクセスを許可してください',
    );
  });

  it('should have the correct camera not found message', () => {
    expect(NotificationMessages.CAMERA_NOT_FOUND).toBe(
      '利用可能なカメラが見つかりません',
    );
  });

  it('should have the correct performance warning message', () => {
    expect(NotificationMessages.PERFORMANCE_WARNING).toBe(
      'パフォーマンスが低下しています',
    );
  });

  it('should have the correct model load error message', () => {
    expect(NotificationMessages.MODEL_LOAD_ERROR).toBe(
      'モデルの読み込みに失敗しました',
    );
  });
});
