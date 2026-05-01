import { AppSettings, DEFAULT_SETTINGS } from '../types/index.ts';

const STORAGE_KEY = 'toe-cursor-control-settings';

type SettingsChangeCallback = (settings: AppSettings) => void;

/**
 * アプリケーション設定の管理クラス
 * - DEFAULT_SETTINGS に基づく初期化
 * - localStorage による永続化
 * - 設定変更時のコールバック通知
 */
export class SettingsManager {
  private settings: AppSettings;
  private listeners: Set<SettingsChangeCallback> = new Set();

  constructor() {
    this.settings = this.loadFromStorage() ?? structuredClone(DEFAULT_SETTINGS);
  }

  /** 現在の設定を取得する */
  get(): AppSettings {
    return structuredClone(this.settings);
  }

  /** 設定を部分的に更新する（ディープマージ） */
  update(partial: DeepPartial<AppSettings>): void {
    this.settings = deepMerge(
      this.settings as unknown as Record<string, unknown>,
      partial as unknown as Record<string, unknown>,
    ) as unknown as AppSettings;
    this.saveToStorage();
    this.notifyListeners();
  }

  /** 設定変更時のコールバックを登録する */
  onChange(callback: SettingsChangeCallback): void {
    this.listeners.add(callback);
  }

  /** 設定変更時のコールバックを解除する */
  offChange(callback: SettingsChangeCallback): void {
    this.listeners.delete(callback);
  }

  /** デフォルト設定にリセットする */
  reset(): void {
    this.settings = structuredClone(DEFAULT_SETTINGS);
    this.saveToStorage();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const snapshot = this.get();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // localStorage が利用できない環境では無視する
    }
  }

  private loadFromStorage(): AppSettings | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      if (isValidSettings(parsed)) {
        return parsed;
      }
      // 破損データの場合は削除してデフォルトにフォールバック
      localStorage.removeItem(STORAGE_KEY);
      return null;
    } catch {
      return null;
    }
  }
}

// =============================================================================
// ユーティリティ型・関数
// =============================================================================

/** ディープパーシャル型 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** ディープマージ（ターゲットにソースの値を再帰的にマージ） */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = structuredClone(target);
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    if (sourceVal === undefined) continue;

    const targetVal = result[key];
    if (
      typeof targetVal === 'object' &&
      targetVal !== null &&
      !Array.isArray(targetVal) &&
      typeof sourceVal === 'object' &&
      sourceVal !== null &&
      !Array.isArray(sourceVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else {
      result[key] = sourceVal;
    }
  }
  return result;
}

/** 設定オブジェクトの簡易バリデーション */
function isValidSettings(value: unknown): value is AppSettings {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  // targetFoot
  if (obj['targetFoot'] !== 'left' && obj['targetFoot'] !== 'right') return false;

  // detectionMode (optional for backward compat — default to 'mediapipe')
  if (obj['detectionMode'] !== undefined && obj['detectionMode'] !== 'mediapipe' && obj['detectionMode'] !== 'contour') return false;

  // smoothing
  const smoothing = obj['smoothing'];
  if (typeof smoothing !== 'object' || smoothing === null) return false;
  const s = smoothing as Record<string, unknown>;
  if (typeof s['alpha'] !== 'number' || typeof s['deadZone'] !== 'number') return false;

  // tap
  const tap = obj['tap'];
  if (typeof tap !== 'object' || tap === null) return false;
  const t = tap as Record<string, unknown>;
  if (
    typeof t['velocityThreshold'] !== 'number' ||
    typeof t['cooldownMs'] !== 'number' ||
    typeof t['doubleTapWindowMs'] !== 'number'
  ) return false;

  // camera
  const camera = obj['camera'];
  if (typeof camera !== 'object' || camera === null) return false;
  const c = camera as Record<string, unknown>;
  if (
    typeof c['width'] !== 'number' ||
    typeof c['height'] !== 'number' ||
    typeof c['frameRate'] !== 'number'
  ) return false;

  return true;
}
