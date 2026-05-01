/**
 * 設定パネル
 * タップ感度、スムージング強度、検出対象の足（左/右）などの設定UIを提供する。
 * 画面右側に固定配置され、ギアアイコンボタンでトグル表示する。
 * SettingsManagerと連携し、設定変更を即時反映する。
 */
import { SettingsManager } from '../config/Settings.ts';
import { AppSettings } from '../types/index.ts';
import type { CameraDevice } from '../core/VideoCaptureModule.ts';

/** カメラ切り替え時のコールバック型 */
export type CameraChangeCallback = (deviceId: string) => void;

export class SettingsPanel {
  private container: HTMLElement;
  private styleElement: HTMLStyleElement;
  private toggleButton: HTMLButtonElement;
  private panelElement: HTMLDivElement;
  private visible = false;

  private settingsManager: SettingsManager;
  private onChangeCallback: (settings: AppSettings) => void;

  /** カメラ切り替え時のコールバック */
  onCameraChange: CameraChangeCallback | null = null;

  /** キャリブレーションやり直し時のコールバック */
  onRecalibrate: (() => void) | null = null;

  /** 背景再キャプチャ時のコールバック */
  onRecaptureBackground: (() => void) | null = null;

  // Control references for external updates
  private footLeftRadio!: HTMLInputElement;
  private footRightRadio!: HTMLInputElement;
  private alphaSlider!: HTMLInputElement;
  private alphaValue!: HTMLSpanElement;
  private deadZoneSlider!: HTMLInputElement;
  private deadZoneValue!: HTMLSpanElement;
  private velocitySlider!: HTMLInputElement;
  private velocityValue!: HTMLSpanElement;
  private cooldownSlider!: HTMLInputElement;
  private cooldownValue!: HTMLSpanElement;
  private doubleTapSlider!: HTMLInputElement;
  private doubleTapValue!: HTMLSpanElement;
  private cameraSelect!: HTMLSelectElement;
  private detectionModeSelect!: HTMLSelectElement;

  constructor(settingsManager: SettingsManager, container?: HTMLElement) {
    this.container = container ?? document.body;
    this.settingsManager = settingsManager;

    this.styleElement = this.createStyles();
    this.panelElement = this.createPanel();
    this.toggleButton = this.createToggleButton();

    this.container.appendChild(this.styleElement);
    this.container.appendChild(this.panelElement);
    this.container.appendChild(this.toggleButton);

    // Populate initial values from SettingsManager
    this.syncFromSettings(this.settingsManager.get());

    // Listen for external settings changes
    this.onChangeCallback = (settings: AppSettings) => {
      this.syncFromSettings(settings);
    };
    this.settingsManager.onChange(this.onChangeCallback);
  }

  /** パネルの表示/非表示を切り替える */
  togglePanel(): void {
    this.visible = !this.visible;
    if (this.visible) {
      this.panelElement.classList.add('toe-settings-panel-visible');
      this.toggleButton.setAttribute('aria-expanded', 'true');
    } else {
      this.panelElement.classList.remove('toe-settings-panel-visible');
      this.toggleButton.setAttribute('aria-expanded', 'false');
    }
  }

  /** パネルが表示中かどうか */
  isVisible(): boolean {
    return this.visible;
  }

  /** パネルDOM要素を取得する（テスト用） */
  getElement(): HTMLDivElement {
    return this.panelElement;
  }

  /** トグルボタンDOM要素を取得する（テスト用） */
  getToggleButton(): HTMLButtonElement {
    return this.toggleButton;
  }

  /** リソースを解放しDOM要素を削除する */
  dispose(): void {
    this.settingsManager.offChange(this.onChangeCallback);
    this.panelElement.remove();
    this.toggleButton.remove();
    this.styleElement.remove();
  }

  // ---------------------------------------------------------------------------
  // Private: sync UI from settings
  // ---------------------------------------------------------------------------

  private syncFromSettings(settings: AppSettings): void {
    // Detection mode
    this.detectionModeSelect.value = settings.detectionMode;

    // Foot selection
    this.footLeftRadio.checked = settings.targetFoot === 'left';
    this.footRightRadio.checked = settings.targetFoot === 'right';

    // Smoothing
    this.alphaSlider.value = String(settings.smoothing.alpha);
    this.alphaValue.textContent = settings.smoothing.alpha.toFixed(2);

    this.deadZoneSlider.value = String(settings.smoothing.deadZone);
    this.deadZoneValue.textContent = String(settings.smoothing.deadZone);

    // Tap
    this.velocitySlider.value = String(settings.tap.velocityThreshold);
    this.velocityValue.textContent = settings.tap.velocityThreshold.toFixed(3);

    this.cooldownSlider.value = String(settings.tap.cooldownMs);
    this.cooldownValue.textContent = `${settings.tap.cooldownMs}ms`;

    this.doubleTapSlider.value = String(settings.tap.doubleTapWindowMs);
    this.doubleTapValue.textContent = `${settings.tap.doubleTapWindowMs}ms`;
  }

  // ---------------------------------------------------------------------------
  // Private: DOM creation
  // ---------------------------------------------------------------------------

  private createStyles(): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = `
      .toe-settings-toggle {
        position: fixed;
        top: 60px;
        right: 12px;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 50%;
        background-color: rgba(0, 0, 0, 0.7);
        color: #fff;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99996;
        padding: 0;
        line-height: 1;
        user-select: none;
      }

      .toe-settings-toggle:hover {
        background-color: rgba(0, 0, 0, 0.85);
      }

      .toe-settings-panel {
        position: fixed;
        top: 0;
        right: -320px;
        width: 300px;
        height: 100%;
        background-color: rgba(15, 23, 42, 0.95);
        color: #e2e8f0;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        z-index: 99995;
        overflow-y: auto;
        padding: 16px;
        box-sizing: border-box;
        transition: right 0.25s ease;
        box-shadow: -4px 0 12px rgba(0, 0, 0, 0.3);
      }

      .toe-settings-panel-visible {
        right: 0;
      }

      .toe-settings-panel h2 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: #f1f5f9;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 8px;
      }

      .toe-settings-section {
        margin-bottom: 20px;
      }

      .toe-settings-section-title {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        margin-bottom: 10px;
      }

      .toe-settings-field {
        margin-bottom: 12px;
      }

      .toe-settings-field label {
        display: block;
        margin-bottom: 4px;
        color: #cbd5e1;
        font-size: 13px;
      }

      .toe-settings-field .toe-settings-slider-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .toe-settings-field input[type="range"] {
        flex: 1;
        height: 4px;
        -webkit-appearance: none;
        appearance: none;
        background: #334155;
        border-radius: 2px;
        outline: none;
      }

      .toe-settings-field input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #3b82f6;
        cursor: pointer;
      }

      .toe-settings-field input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #3b82f6;
        cursor: pointer;
        border: none;
      }

      .toe-settings-slider-value {
        min-width: 50px;
        text-align: right;
        font-variant-numeric: tabular-nums;
        color: #94a3b8;
        font-size: 12px;
      }

      .toe-settings-radio-group {
        display: flex;
        gap: 16px;
      }

      .toe-settings-radio-group label {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        color: #cbd5e1;
        font-size: 13px;
      }

      .toe-settings-radio-group input[type="radio"] {
        accent-color: #3b82f6;
      }

      .toe-settings-reset-btn {
        width: 100%;
        padding: 8px 16px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        background-color: transparent;
        color: #e2e8f0;
        font-size: 13px;
        cursor: pointer;
        margin-top: 8px;
      }

      .toe-settings-reset-btn:hover {
        background-color: rgba(255, 255, 255, 0.08);
      }

      .toe-settings-field select {
        width: 100%;
        padding: 6px 8px;
        border: 1px solid #334155;
        border-radius: 4px;
        background-color: #1e293b;
        color: #e2e8f0;
        font-size: 13px;
        font-family: inherit;
        outline: none;
        cursor: pointer;
      }

      .toe-settings-field select:focus {
        border-color: #3b82f6;
      }
    `;
    return style;
  }

  private createToggleButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'toe-settings-toggle';
    btn.textContent = '⚙';
    btn.setAttribute('aria-label', '設定パネルを開く');
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => this.togglePanel());
    return btn;
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'toe-settings-panel';

    // Title
    const title = document.createElement('h2');
    title.textContent = '設定';
    panel.appendChild(title);

    // Camera selection section
    panel.appendChild(this.createCameraSection());

    // Detection mode section
    panel.appendChild(this.createDetectionModeSection());

    // Background recapture button (for contour mode)
    const recaptureBgBtn = document.createElement('button');
    recaptureBgBtn.className = 'toe-settings-reset-btn toe-settings-recapture-bg-btn';
    recaptureBgBtn.textContent = '背景を再キャプチャ';
    recaptureBgBtn.addEventListener('click', () => {
      if (this.onRecaptureBackground) {
        this.onRecaptureBackground();
      }
    });
    panel.appendChild(recaptureBgBtn);

    // Foot selection section
    panel.appendChild(this.createFootSelectionSection());

    // Smoothing section
    panel.appendChild(this.createSmoothingSection());

    // Tap detection section
    panel.appendChild(this.createTapSection());

    // Recalibrate button
    const recalibrateBtn = document.createElement('button');
    recalibrateBtn.className = 'toe-settings-reset-btn toe-settings-recalibrate-btn';
    recalibrateBtn.textContent = 'キャリブレーションをやり直す';
    recalibrateBtn.addEventListener('click', () => {
      if (this.onRecalibrate) {
        this.onRecalibrate();
      }
    });
    panel.appendChild(recalibrateBtn);

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.className = 'toe-settings-reset-btn';
    resetBtn.textContent = 'リセット';
    resetBtn.addEventListener('click', () => {
      this.settingsManager.reset();
    });
    panel.appendChild(resetBtn);

    return panel;
  }

  /**
   * カメラデバイス一覧をドロップダウンに反映する。
   * カメラ起動後に呼び出す（ラベル取得にはアクセス許可が必要なため）。
   */
  updateCameraDevices(devices: CameraDevice[], currentDeviceId?: string | null): void {
    // 既存のオプションをクリア
    this.cameraSelect.innerHTML = '';

    if (devices.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'カメラが見つかりません';
      opt.disabled = true;
      this.cameraSelect.appendChild(opt);
      return;
    }

    for (const device of devices) {
      const opt = document.createElement('option');
      opt.value = device.deviceId;
      opt.textContent = device.label;
      if (currentDeviceId && device.deviceId === currentDeviceId) {
        opt.selected = true;
      }
      this.cameraSelect.appendChild(opt);
    }
  }

  private createDetectionModeSection(): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'toe-settings-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'toe-settings-section-title';
    sectionTitle.textContent = '検出モード';
    section.appendChild(sectionTitle);

    const field = document.createElement('div');
    field.className = 'toe-settings-field';

    const label = document.createElement('label');
    label.textContent = '検出方式';
    field.appendChild(label);

    this.detectionModeSelect = document.createElement('select');

    const mediapipeOpt = document.createElement('option');
    mediapipeOpt.value = 'mediapipe';
    mediapipeOpt.textContent = 'MediaPipe Pose（正面カメラ）';
    this.detectionModeSelect.appendChild(mediapipeOpt);

    const contourOpt = document.createElement('option');
    contourOpt.value = 'contour';
    contourOpt.textContent = '背景差分＋輪郭解析（天井カメラ）';
    this.detectionModeSelect.appendChild(contourOpt);

    this.detectionModeSelect.addEventListener('change', () => {
      const mode = this.detectionModeSelect.value as 'mediapipe' | 'contour';
      this.settingsManager.update({ detectionMode: mode });
    });

    field.appendChild(this.detectionModeSelect);
    section.appendChild(field);

    return section;
  }

  private createCameraSection(): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'toe-settings-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'toe-settings-section-title';
    sectionTitle.textContent = 'カメラ';
    section.appendChild(sectionTitle);

    const field = document.createElement('div');
    field.className = 'toe-settings-field';

    const label = document.createElement('label');
    label.textContent = 'カメラデバイス';
    field.appendChild(label);

    this.cameraSelect = document.createElement('select');
    const defaultOpt = document.createElement('option');
    defaultOpt.textContent = '読み込み中...';
    defaultOpt.disabled = true;
    defaultOpt.selected = true;
    this.cameraSelect.appendChild(defaultOpt);

    this.cameraSelect.addEventListener('change', () => {
      const deviceId = this.cameraSelect.value;
      if (deviceId && this.onCameraChange) {
        this.onCameraChange(deviceId);
      }
    });

    field.appendChild(this.cameraSelect);
    section.appendChild(field);

    return section;
  }

  private createFootSelectionSection(): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'toe-settings-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'toe-settings-section-title';
    sectionTitle.textContent = '検出対象の足';
    section.appendChild(sectionTitle);

    const radioGroup = document.createElement('div');
    radioGroup.className = 'toe-settings-radio-group';

    // Left foot
    const leftLabel = document.createElement('label');
    this.footLeftRadio = document.createElement('input');
    this.footLeftRadio.type = 'radio';
    this.footLeftRadio.name = 'toe-target-foot';
    this.footLeftRadio.value = 'left';
    this.footLeftRadio.addEventListener('change', () => {
      if (this.footLeftRadio.checked) {
        this.settingsManager.update({ targetFoot: 'left' });
      }
    });
    leftLabel.appendChild(this.footLeftRadio);
    leftLabel.appendChild(document.createTextNode('左足'));

    // Right foot
    const rightLabel = document.createElement('label');
    this.footRightRadio = document.createElement('input');
    this.footRightRadio.type = 'radio';
    this.footRightRadio.name = 'toe-target-foot';
    this.footRightRadio.value = 'right';
    this.footRightRadio.addEventListener('change', () => {
      if (this.footRightRadio.checked) {
        this.settingsManager.update({ targetFoot: 'right' });
      }
    });
    rightLabel.appendChild(this.footRightRadio);
    rightLabel.appendChild(document.createTextNode('右足'));

    radioGroup.appendChild(leftLabel);
    radioGroup.appendChild(rightLabel);
    section.appendChild(radioGroup);

    return section;
  }

  private createSmoothingSection(): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'toe-settings-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'toe-settings-section-title';
    sectionTitle.textContent = 'スムージング';
    section.appendChild(sectionTitle);

    // Alpha slider
    const alphaResult = this.createSliderField({
      label: '平滑化係数 (α)',
      min: 0.1,
      max: 1.0,
      step: 0.01,
      formatValue: (v) => v.toFixed(2),
      onChange: (v) => this.settingsManager.update({ smoothing: { alpha: v } }),
    });
    this.alphaSlider = alphaResult.slider;
    this.alphaValue = alphaResult.valueSpan;
    section.appendChild(alphaResult.field);

    // Dead zone slider
    const deadZoneResult = this.createSliderField({
      label: 'デッドゾーン (px)',
      min: 0,
      max: 20,
      step: 1,
      formatValue: (v) => String(Math.round(v)),
      onChange: (v) => this.settingsManager.update({ smoothing: { deadZone: Math.round(v) } }),
    });
    this.deadZoneSlider = deadZoneResult.slider;
    this.deadZoneValue = deadZoneResult.valueSpan;
    section.appendChild(deadZoneResult.field);

    return section;
  }

  private createTapSection(): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'toe-settings-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'toe-settings-section-title';
    sectionTitle.textContent = 'タップ検出';
    section.appendChild(sectionTitle);

    // Velocity threshold slider
    const velocityResult = this.createSliderField({
      label: '速度閾値',
      min: 0.01,
      max: 0.2,
      step: 0.001,
      formatValue: (v) => v.toFixed(3),
      onChange: (v) => this.settingsManager.update({ tap: { velocityThreshold: v } }),
    });
    this.velocitySlider = velocityResult.slider;
    this.velocityValue = velocityResult.valueSpan;
    section.appendChild(velocityResult.field);

    // Cooldown slider
    const cooldownResult = this.createSliderField({
      label: 'クールダウン',
      min: 100,
      max: 1000,
      step: 10,
      formatValue: (v) => `${Math.round(v)}ms`,
      onChange: (v) => this.settingsManager.update({ tap: { cooldownMs: Math.round(v) } }),
    });
    this.cooldownSlider = cooldownResult.slider;
    this.cooldownValue = cooldownResult.valueSpan;
    section.appendChild(cooldownResult.field);

    // Double tap window slider
    const doubleTapResult = this.createSliderField({
      label: 'ダブルタップ間隔',
      min: 200,
      max: 1000,
      step: 10,
      formatValue: (v) => `${Math.round(v)}ms`,
      onChange: (v) => this.settingsManager.update({ tap: { doubleTapWindowMs: Math.round(v) } }),
    });
    this.doubleTapSlider = doubleTapResult.slider;
    this.doubleTapValue = doubleTapResult.valueSpan;
    section.appendChild(doubleTapResult.field);

    return section;
  }

  private createSliderField(opts: {
    label: string;
    min: number;
    max: number;
    step: number;
    formatValue: (v: number) => string;
    onChange: (v: number) => void;
  }): { field: HTMLDivElement; slider: HTMLInputElement; valueSpan: HTMLSpanElement } {
    const field = document.createElement('div');
    field.className = 'toe-settings-field';

    const label = document.createElement('label');
    label.textContent = opts.label;
    field.appendChild(label);

    const row = document.createElement('div');
    row.className = 'toe-settings-slider-row';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(opts.min);
    slider.max = String(opts.max);
    slider.step = String(opts.step);

    const valueSpan = document.createElement('span');
    valueSpan.className = 'toe-settings-slider-value';

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valueSpan.textContent = opts.formatValue(v);
      opts.onChange(v);
    });

    row.appendChild(slider);
    row.appendChild(valueSpan);
    field.appendChild(row);

    return { field, slider, valueSpan };
  }
}
