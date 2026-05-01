import type { ToeDetectionResult } from '../types/index.ts';

/**
 * つま先検出器の共通インターフェース。
 * MediaPipe Pose Landmarker と 背景差分＋輪郭解析の両方がこのインターフェースを実装する。
 */
export interface IToeDetector {
  /** モデル/リソースを初期化する */
  initialize(): Promise<void>;

  /** 映像フレームからつま先位置を検出する */
  detect(video: HTMLVideoElement): Promise<ToeDetectionResult>;

  /** 検出対象の足を設定する（MediaPipe用。背景差分では無視してよい） */
  setTargetFoot(foot: 'left' | 'right'): void;

  /** リソースを解放する */
  dispose(): void;
}

/** 検出モード */
export type DetectionMode = 'mediapipe' | 'contour';
