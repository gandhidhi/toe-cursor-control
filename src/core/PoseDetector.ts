import {
  PoseLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { ToeDetectionResult, Point3D } from '../types/index';

/** MediaPipe Pose Landmarker のランドマークインデックス */
const LEFT_FOOT_TOE_INDEX = 31;
const RIGHT_FOOT_TOE_INDEX = 32;

/** モデルファイルのCDN URL */
const MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/**
 * ランドマーク配列から対象の足のつま先ランドマークを抽出する純粋関数。
 *
 * @param landmarks - MediaPipe が返す NormalizedLandmark の配列（33要素）
 * @param targetFoot - 抽出対象の足 ('left' | 'right')
 * @returns 対象のつま先ランドマーク。インデックスが範囲外の場合は null
 */
export function extractToeLandmark(
  landmarks: NormalizedLandmark[],
  targetFoot: 'left' | 'right',
): NormalizedLandmark | null {
  const index =
    targetFoot === 'left' ? LEFT_FOOT_TOE_INDEX : RIGHT_FOOT_TOE_INDEX;

  const landmark = landmarks[index];
  if (!landmark) {
    return null;
  }
  return landmark;
}

/**
 * PoseDetector
 *
 * MediaPipe Pose Landmarker をラップし、映像フレームからつま先のランドマークを
 * 抽出するモジュール。検出ロスト時は最後の検出位置を保持し、状態を通知する。
 */
export class PoseDetector {
  private landmarker: PoseLandmarker | null = null;
  private targetFoot: 'left' | 'right' = 'right';
  private lastPosition: Point3D | null = null;
  private lastDetected = false;
  private lastTimestamp = -1;

  /**
   * MediaPipe Pose Landmarker モデルを初期化する。
   * FilesetResolver で Wasm ランタイムを解決し、PoseLandmarker を生成する。
   */
  async initialize(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    );

    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_ASSET_PATH,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  }

  /**
   * 映像フレームからつま先位置を検出する。
   *
   * @param video - 検出対象の HTMLVideoElement
   * @returns つま先検出結果
   */
  async detect(video: HTMLVideoElement): Promise<ToeDetectionResult> {
    if (!this.landmarker) {
      return {
        position: this.lastPosition,
        confidence: 0,
        detected: false,
        timestamp: performance.now(),
      };
    }

    const timestamp = performance.now();

    // MediaPipe の detectForVideo は同期的に結果を返す（VIDEO モード）
    // タイムスタンプは厳密に単調増加である必要がある
    const effectiveTimestamp =
      timestamp <= this.lastTimestamp
        ? this.lastTimestamp + 1
        : timestamp;
    this.lastTimestamp = effectiveTimestamp;

    const result = this.landmarker.detectForVideo(video, effectiveTimestamp);

    // ランドマークが検出されなかった場合
    if (!result.landmarks || result.landmarks.length === 0) {
      return this.buildLostResult(timestamp);
    }

    const poseLandmarks = result.landmarks[0];
    if (!poseLandmarks || poseLandmarks.length === 0) {
      return this.buildLostResult(timestamp);
    }

    const toeLandmark = extractToeLandmark(poseLandmarks, this.targetFoot);
    if (!toeLandmark) {
      return this.buildLostResult(timestamp);
    }

    // 検出成功
    const position: Point3D = {
      x: toeLandmark.x,
      y: toeLandmark.y,
      z: toeLandmark.z,
    };

    this.lastPosition = position;
    this.lastDetected = true;

    return {
      position,
      confidence: toeLandmark.visibility,
      detected: true,
      timestamp,
    };
  }

  /**
   * 検出対象の足を設定する。
   *
   * @param foot - 'left' または 'right'
   */
  setTargetFoot(foot: 'left' | 'right'): void {
    this.targetFoot = foot;
  }

  /**
   * 現在の検出対象の足を取得する。
   */
  getTargetFoot(): 'left' | 'right' {
    return this.targetFoot;
  }

  /**
   * リソースを解放する。
   */
  dispose(): void {
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
    }
    this.lastPosition = null;
    this.lastDetected = false;
    this.lastTimestamp = -1;
  }

  /**
   * 検出ロスト時の結果を構築する。
   * 最後の検出位置を保持し、detected を false に設定する。
   */
  private buildLostResult(timestamp: number): ToeDetectionResult {
    this.lastDetected = false;
    return {
      position: this.lastPosition,
      confidence: 0,
      detected: false,
      timestamp,
    };
  }

  /**
   * 現在の検出状態を取得する（テスト・UI用）。
   */
  isDetected(): boolean {
    return this.lastDetected;
  }
}
