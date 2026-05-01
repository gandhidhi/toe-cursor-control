// =============================================================================
// 座標系 (Coordinate Types)
// =============================================================================

/** 2D座標 */
export interface Point2D {
  x: number;
  y: number;
}

/** 3D座標 */
export interface Point3D {
  x: number; // 0-1 正規化座標
  y: number; // 0-1 正規化座標
  z: number; // 深度（相対値）
}

/** スクリーンサイズ */
export interface ScreenSize {
  width: number;
  height: number;
}

// =============================================================================
// ホモグラフィ行列 (Homography Matrix)
// =============================================================================

/**
 * 3x3ホモグラフィ変換行列（9要素の配列として表現）
 * [h11, h12, h13, h21, h22, h23, h31, h32, h33]
 *
 * 変換式:
 *   w * x' = h11*x + h12*y + h13
 *   w * y' = h21*x + h22*y + h23
 *   w      = h31*x + h32*y + h33
 */
export type HomographyMatrix = number[]; // length: 9

// =============================================================================
// カメラ関連 (Camera Types)
// =============================================================================

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'not_found'
  | 'error';

// =============================================================================
// 姿勢推定関連 (Pose Detection Types)
// =============================================================================

export interface ToeDetectionResult {
  /** 検出されたつま先の位置（Camera Space） */
  position: Point3D | null;
  /** 検出の信頼度 (0-1) */
  confidence: number;
  /** 検出状態 */
  detected: boolean;
  /** タイムスタンプ (ms) */
  timestamp: number;
}

// =============================================================================
// タップ検出関連 (Tap Detection Types)
// =============================================================================

export interface ToeFrame {
  /** つま先の高さ（z座標） */
  z: number;
  /** タイムスタンプ (ms) */
  timestamp: number;
}

export interface TapResult {
  /** 検出されたイベント */
  event: 'tap' | 'doubletap' | 'none';
  /** 最後のタップのタイムスタンプ */
  lastTapTimestamp: number | null;
}

export interface TapConfig {
  /** タップと判定する下方向速度の閾値 */
  velocityThreshold: number;
  /** タップ後の無視期間 (ms) */
  cooldownMs: number;
  /** ダブルタップの最大間隔 (ms) */
  doubleTapWindowMs: number;
}

// =============================================================================
// スムージング関連 (Smoothing Types)
// =============================================================================

export interface SmoothingConfig {
  /** EMAの平滑化係数 (0-1, 高いほど追従性が高い) */
  alpha: number;
  /** デッドゾーン半径（px）: この範囲内の微小移動を無視 */
  deadZone: number;
}

// =============================================================================
// イベントモデル (Event Types)
// =============================================================================

/** システムイベント */
export type SystemEvent =
  | { type: 'cursor_move'; position: Point2D }
  | { type: 'click'; position: Point2D }
  | { type: 'doubleclick'; position: Point2D }
  | { type: 'detection_lost' }
  | { type: 'detection_resumed' }
  | { type: 'performance_warning'; fps: number }
  | { type: 'calibration_required' }
  | { type: 'camera_error'; reason: CameraStatus };

// =============================================================================
// 状態管理 (State Types)
// =============================================================================

/** アプリケーション全体の状態 */
export interface AppState {
  /** カメラの状態 */
  cameraStatus: CameraStatus;
  /** つま先検出状態 */
  detectionStatus: 'detecting' | 'lost';
  /** キャリブレーション状態 */
  calibrationStatus: 'uncalibrated' | 'calibrating' | 'calibrated';
  /** 現在のカーソル位置 */
  cursorPosition: Point2D;
  /** 現在のFPS */
  currentFps: number;
  /** 設定 */
  settings: AppSettings;
}

// =============================================================================
// 設定 (Settings Types)
// =============================================================================

export interface AppSettings {
  /** 検出対象の足 */
  targetFoot: 'left' | 'right';
  /** スムージング設定 */
  smoothing: SmoothingConfig;
  /** タップ検出設定 */
  tap: TapConfig;
  /** カメラ設定 */
  camera: {
    width: number;
    height: number;
    frameRate: number;
  };
}

// =============================================================================
// キャリブレーション (Calibration Types)
// =============================================================================

export interface CalibrationProgress {
  /** 記録済みポイント数 */
  recordedPoints: number;
  /** 必要なポイント数 */
  requiredPoints: number; // 4
  /** 現在のステップの説明 */
  instruction: string;
}

// =============================================================================
// デフォルト設定 (Default Settings)
// =============================================================================

export const DEFAULT_SETTINGS: AppSettings = {
  targetFoot: 'right',
  smoothing: {
    alpha: 0.3,
    deadZone: 5,
  },
  tap: {
    velocityThreshold: 0.05,
    cooldownMs: 300,
    doubleTapWindowMs: 500,
  },
  camera: {
    width: 640,
    height: 480,
    frameRate: 30,
  },
};
