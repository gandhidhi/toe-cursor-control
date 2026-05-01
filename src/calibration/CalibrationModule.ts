import type { Point2D, HomographyMatrix, CalibrationProgress } from '../types/index.ts';
import { computeHomography } from './HomographyMatrix.ts';

/** localStorage に使用するキー */
const STORAGE_KEY = 'toe-cursor-control-calibration';

/** 必要なキャリブレーションポイント数 */
const REQUIRED_POINTS = 4;

/** 各ステップの日本語インストラクション */
const INSTRUCTIONS: readonly string[] = [
  '左上のポイントにつま先を合わせてください',
  '右上のポイントにつま先を合わせてください',
  '右下のポイントにつま先を合わせてください',
  '左下のポイントにつま先を合わせてください',
  'キャリブレーションが完了しました',
];

/** 記録されたキャリブレーションポイントの対応 */
interface CalibrationPair {
  camera: Point2D;
  screen: Point2D;
}

/**
 * 4点が退化（3点以上が同一直線上）しているかを判定する。
 * 三角形の面積（外積）を使い、すべての3点の組み合わせで面積がほぼゼロなら退化とみなす。
 */
function arePointsDegenerate(points: Point2D[]): boolean {
  if (points.length < 3) return true;

  // 4点のうち、任意の3点で構成される三角形の面積を計算し、
  // すべてがほぼゼロなら同一直線上にある（退化）
  const n = points.length;
  let hasNonDegenerateTriangle = false;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const p1 = points[i]!;
        const p2 = points[j]!;
        const p3 = points[k]!;

        // 外積（2倍の三角形面積）
        const crossProduct =
          (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);

        if (Math.abs(crossProduct) > 1e-8) {
          hasNonDegenerateTriangle = true;
        }
      }
    }
  }

  return !hasNonDegenerateTriangle;
}

/**
 * キャリブレーション手順を管理するモジュール。
 * 4点の対応関係を記録し、ホモグラフィ行列を算出・保存する。
 */
export class CalibrationModule {
  private pairs: CalibrationPair[] = [];

  /** キャリブレーションを開始（記録済みポイントをリセット） */
  startCalibration(): void {
    this.pairs = [];
  }

  /** キャリブレーションポイントを記録する */
  recordPoint(cameraPoint: Point2D, screenPoint: Point2D): void {
    if (this.pairs.length >= REQUIRED_POINTS) {
      return;
    }
    this.pairs.push({ camera: cameraPoint, screen: screenPoint });
  }

  /**
   * キャリブレーションを完了し、ホモグラフィ行列を算出する。
   * 4点未満、または退化した4点の場合は null を返す。
   */
  complete(): HomographyMatrix | null {
    if (this.pairs.length < REQUIRED_POINTS) {
      return null;
    }

    const cameraPoints = this.pairs.map((p) => p.camera);
    const screenPoints = this.pairs.map((p) => p.screen);

    // カメラ側・スクリーン側それぞれで退化チェック
    if (arePointsDegenerate(cameraPoints) || arePointsDegenerate(screenPoints)) {
      return null;
    }

    const srcPoints = cameraPoints as [Point2D, Point2D, Point2D, Point2D];
    const dstPoints = screenPoints as [Point2D, Point2D, Point2D, Point2D];

    return computeHomography(srcPoints, dstPoints);
  }

  /** localStorage から保存済みキャリブレーションデータを読み込む */
  load(): HomographyMatrix | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data === null) {
        return null;
      }

      const parsed: unknown = JSON.parse(data);

      // バリデーション: 9要素の数値配列であること
      if (
        !Array.isArray(parsed) ||
        parsed.length !== 9 ||
        !parsed.every((v) => typeof v === 'number' && isFinite(v))
      ) {
        // 破損データを削除
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return parsed as HomographyMatrix;
    } catch {
      // JSON パースエラーなど — 破損データを削除
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  /** キャリブレーションデータを localStorage に保存する */
  save(matrix: HomographyMatrix): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
  }

  /** キャリブレーションの進捗状態を取得する */
  getProgress(): CalibrationProgress {
    const recordedPoints = this.pairs.length;
    const instructionIndex = Math.min(recordedPoints, REQUIRED_POINTS);

    return {
      recordedPoints,
      requiredPoints: REQUIRED_POINTS,
      instruction: INSTRUCTIONS[instructionIndex]!,
    };
  }
}
