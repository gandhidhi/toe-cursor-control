// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsPanel } from '../SettingsPanel.ts';
import { SettingsManager } from '../../config/Settings.ts';

describe('SettingsPanel', () => {
  let panel: SettingsPanel;
  let settingsManager: SettingsManager;

  beforeEach(() => {
    // Clear localStorage to ensure clean state
    localStorage.clear();
    settingsManager = new SettingsManager();
    panel = new SettingsPanel(settingsManager);
  });

  afterEach(() => {
    panel.dispose();
  });

  describe('constructor', () => {
    it('should create a panel element appended to document.body', () => {
      const el = panel.getElement();
      expect(el).toBeInstanceOf(HTMLDivElement);
      expect(document.body.contains(el)).toBe(true);
    });

    it('should have the settings panel class', () => {
      expect(panel.getElement().classList.contains('toe-settings-panel')).toBe(true);
    });

    it('should create a toggle button appended to document.body', () => {
      const btn = panel.getToggleButton();
      expect(btn).toBeInstanceOf(HTMLButtonElement);
      expect(document.body.contains(btn)).toBe(true);
    });

    it('should inject a style element into the container', () => {
      const styles = document.body.querySelectorAll('style');
      const hasSettingsStyle = Array.from(styles).some((s) =>
        s.textContent?.includes('toe-settings-panel'),
      );
      expect(hasSettingsStyle).toBe(true);
    });

    it('should append to a custom container when provided', () => {
      panel.dispose();
      const container = document.createElement('div');
      document.body.appendChild(container);

      panel = new SettingsPanel(settingsManager, container);
      expect(container.contains(panel.getElement())).toBe(true);
      expect(container.contains(panel.getToggleButton())).toBe(true);

      container.remove();
    });

    it('should initialize with default settings values', () => {
      const defaults = settingsManager.get();
      const panelEl = panel.getElement();

      // Check right foot is selected by default
      const rightRadio = panelEl.querySelector<HTMLInputElement>('input[value="right"]');
      expect(rightRadio!.checked).toBe(true);

      const leftRadio = panelEl.querySelector<HTMLInputElement>('input[value="left"]');
      expect(leftRadio!.checked).toBe(false);

      // Check alpha slider value
      const sliders = panelEl.querySelectorAll<HTMLInputElement>('input[type="range"]');
      expect(sliders[0]!.value).toBe(String(defaults.smoothing.alpha));
    });

    it('should start hidden (not visible)', () => {
      expect(panel.isVisible()).toBe(false);
      expect(panel.getElement().classList.contains('toe-settings-panel-visible')).toBe(false);
    });
  });

  describe('togglePanel', () => {
    it('should show the panel when toggled from hidden', () => {
      panel.togglePanel();
      expect(panel.isVisible()).toBe(true);
      expect(panel.getElement().classList.contains('toe-settings-panel-visible')).toBe(true);
    });

    it('should hide the panel when toggled from visible', () => {
      panel.togglePanel(); // show
      panel.togglePanel(); // hide
      expect(panel.isVisible()).toBe(false);
      expect(panel.getElement().classList.contains('toe-settings-panel-visible')).toBe(false);
    });

    it('should update aria-expanded on the toggle button', () => {
      const btn = panel.getToggleButton();
      expect(btn.getAttribute('aria-expanded')).toBe('false');

      panel.togglePanel();
      expect(btn.getAttribute('aria-expanded')).toBe('true');

      panel.togglePanel();
      expect(btn.getAttribute('aria-expanded')).toBe('false');
    });

    it('should toggle when the toggle button is clicked', () => {
      panel.getToggleButton().click();
      expect(panel.isVisible()).toBe(true);

      panel.getToggleButton().click();
      expect(panel.isVisible()).toBe(false);
    });
  });

  describe('foot selection', () => {
    it('should update settings when left foot is selected', () => {
      const panelEl = panel.getElement();
      const leftRadio = panelEl.querySelector<HTMLInputElement>('input[value="left"]')!;

      leftRadio.checked = true;
      leftRadio.dispatchEvent(new Event('change'));

      expect(settingsManager.get().targetFoot).toBe('left');
    });

    it('should update settings when right foot is selected', () => {
      // First switch to left
      const panelEl = panel.getElement();
      const leftRadio = panelEl.querySelector<HTMLInputElement>('input[value="left"]')!;
      leftRadio.checked = true;
      leftRadio.dispatchEvent(new Event('change'));

      // Then switch back to right
      const rightRadio = panelEl.querySelector<HTMLInputElement>('input[value="right"]')!;
      rightRadio.checked = true;
      rightRadio.dispatchEvent(new Event('change'));

      expect(settingsManager.get().targetFoot).toBe('right');
    });
  });

  describe('slider controls', () => {
    it('should update smoothing alpha when slider changes', () => {
      const panelEl = panel.getElement();
      const sliders = panelEl.querySelectorAll<HTMLInputElement>('input[type="range"]');
      const alphaSlider = sliders[0]!;

      alphaSlider.value = '0.7';
      alphaSlider.dispatchEvent(new Event('input'));

      expect(settingsManager.get().smoothing.alpha).toBe(0.7);
    });

    it('should update dead zone when slider changes', () => {
      const panelEl = panel.getElement();
      const sliders = panelEl.querySelectorAll<HTMLInputElement>('input[type="range"]');
      const deadZoneSlider = sliders[1]!;

      deadZoneSlider.value = '10';
      deadZoneSlider.dispatchEvent(new Event('input'));

      expect(settingsManager.get().smoothing.deadZone).toBe(10);
    });

    it('should update velocity threshold when slider changes', () => {
      const panelEl = panel.getElement();
      const sliders = panelEl.querySelectorAll<HTMLInputElement>('input[type="range"]');
      const velocitySlider = sliders[2]!;

      velocitySlider.value = '0.1';
      velocitySlider.dispatchEvent(new Event('input'));

      expect(settingsManager.get().tap.velocityThreshold).toBe(0.1);
    });

    it('should update cooldown when slider changes', () => {
      const panelEl = panel.getElement();
      const sliders = panelEl.querySelectorAll<HTMLInputElement>('input[type="range"]');
      const cooldownSlider = sliders[3]!;

      cooldownSlider.value = '500';
      cooldownSlider.dispatchEvent(new Event('input'));

      expect(settingsManager.get().tap.cooldownMs).toBe(500);
    });

    it('should update double tap window when slider changes', () => {
      const panelEl = panel.getElement();
      const sliders = panelEl.querySelectorAll<HTMLInputElement>('input[type="range"]');
      const doubleTapSlider = sliders[4]!;

      doubleTapSlider.value = '800';
      doubleTapSlider.dispatchEvent(new Event('input'));

      expect(settingsManager.get().tap.doubleTapWindowMs).toBe(800);
    });

    it('should display the current value next to each slider', () => {
      const panelEl = panel.getElement();
      const valueSpans = panelEl.querySelectorAll<HTMLSpanElement>('.toe-settings-slider-value');

      // Alpha value
      expect(valueSpans[0]!.textContent).toBe('0.30');
      // Dead zone value
      expect(valueSpans[1]!.textContent).toBe('5');
      // Velocity threshold value
      expect(valueSpans[2]!.textContent).toBe('0.050');
      // Cooldown value
      expect(valueSpans[3]!.textContent).toBe('300ms');
      // Double tap window value
      expect(valueSpans[4]!.textContent).toBe('500ms');
    });
  });

  describe('external settings changes', () => {
    it('should update UI when settings change externally', () => {
      settingsManager.update({ targetFoot: 'left' });

      const panelEl = panel.getElement();
      const leftRadio = panelEl.querySelector<HTMLInputElement>('input[value="left"]')!;
      const rightRadio = panelEl.querySelector<HTMLInputElement>('input[value="right"]')!;

      expect(leftRadio.checked).toBe(true);
      expect(rightRadio.checked).toBe(false);
    });

    it('should update slider values when settings change externally', () => {
      settingsManager.update({ smoothing: { alpha: 0.8 } });

      const panelEl = panel.getElement();
      const sliders = panelEl.querySelectorAll<HTMLInputElement>('input[type="range"]');
      expect(sliders[0]!.value).toBe('0.8');

      const valueSpans = panelEl.querySelectorAll<HTMLSpanElement>('.toe-settings-slider-value');
      expect(valueSpans[0]!.textContent).toBe('0.80');
    });
  });

  describe('reset button', () => {
    it('should reset settings to defaults when clicked', () => {
      // Change some settings
      settingsManager.update({
        targetFoot: 'left',
        smoothing: { alpha: 0.9, deadZone: 15 },
        tap: { velocityThreshold: 0.15, cooldownMs: 600, doubleTapWindowMs: 900 },
      });

      // Click reset (the one that is NOT the recalibrate or recapture button)
      const resetBtn = panel.getElement().querySelector<HTMLButtonElement>('.toe-settings-reset-btn:not(.toe-settings-recalibrate-btn):not(.toe-settings-recapture-bg-btn)')!;
      resetBtn.click();

      const settings = settingsManager.get();
      expect(settings.targetFoot).toBe('right');
      expect(settings.smoothing.alpha).toBe(0.3);
      expect(settings.smoothing.deadZone).toBe(5);
      expect(settings.tap.velocityThreshold).toBe(0.05);
      expect(settings.tap.cooldownMs).toBe(300);
      expect(settings.tap.doubleTapWindowMs).toBe(500);
    });

    it('should update UI after reset', () => {
      settingsManager.update({ targetFoot: 'left', smoothing: { alpha: 0.9 } });

      const resetBtn = panel.getElement().querySelector<HTMLButtonElement>('.toe-settings-reset-btn:not(.toe-settings-recalibrate-btn):not(.toe-settings-recapture-bg-btn)')!;
      resetBtn.click();

      const panelEl = panel.getElement();
      const rightRadio = panelEl.querySelector<HTMLInputElement>('input[value="right"]')!;
      expect(rightRadio.checked).toBe(true);

      const sliders = panelEl.querySelectorAll<HTMLInputElement>('input[type="range"]');
      expect(sliders[0]!.value).toBe('0.3');
    });
  });

  describe('Japanese labels', () => {
    it('should have Japanese title', () => {
      const title = panel.getElement().querySelector('h2');
      expect(title!.textContent).toBe('設定');
    });

    it('should have Japanese section titles', () => {
      const sectionTitles = panel.getElement().querySelectorAll('.toe-settings-section-title');
      const titles = Array.from(sectionTitles).map((el) => el.textContent);
      expect(titles).toContain('検出対象の足');
      expect(titles).toContain('スムージング');
      expect(titles).toContain('タップ検出');
    });

    it('should have Japanese foot labels', () => {
      const radioLabels = panel.getElement().querySelectorAll('.toe-settings-radio-group label');
      const texts = Array.from(radioLabels).map((el) => el.textContent);
      expect(texts).toContain('左足');
      expect(texts).toContain('右足');
    });

    it('should have Japanese reset button text', () => {
      const resetBtn = panel.getElement().querySelector('.toe-settings-reset-btn:not(.toe-settings-recalibrate-btn):not(.toe-settings-recapture-bg-btn)');
      expect(resetBtn!.textContent).toBe('リセット');
    });

    it('should have Japanese recalibrate button text', () => {
      const recalibrateBtn = panel.getElement().querySelector('.toe-settings-recalibrate-btn');
      expect(recalibrateBtn!.textContent).toBe('キャリブレーションをやり直す');
    });
  });

  describe('dispose', () => {
    it('should remove the panel element from the DOM', () => {
      const el = panel.getElement();
      expect(document.body.contains(el)).toBe(true);

      panel.dispose();
      expect(document.body.contains(el)).toBe(false);
    });

    it('should remove the toggle button from the DOM', () => {
      const btn = panel.getToggleButton();
      expect(document.body.contains(btn)).toBe(true);

      panel.dispose();
      expect(document.body.contains(btn)).toBe(false);
    });

    it('should remove the style element from the DOM', () => {
      const stylesBefore = document.body.querySelectorAll('style');
      const countBefore = Array.from(stylesBefore).filter((s) =>
        s.textContent?.includes('toe-settings-panel'),
      ).length;

      panel.dispose();

      const stylesAfter = document.body.querySelectorAll('style');
      const countAfter = Array.from(stylesAfter).filter((s) =>
        s.textContent?.includes('toe-settings-panel'),
      ).length;

      expect(countAfter).toBe(countBefore - 1);
    });

    it('should stop listening to settings changes after dispose', () => {
      panel.dispose();

      // This should not throw or update the (now removed) panel
      const spy = vi.spyOn(console, 'error');
      settingsManager.update({ targetFoot: 'left' });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
