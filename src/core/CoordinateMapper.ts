import type { Point2D, ScreenSize, HomographyMatrix } from '../types/index.ts';
import { applyHomography } from '../calibration/HomographyMatrix.ts';

/**
 * カメラ空間座標をスクリーン空間座標に変換するモジュール。
 *
 * キャリブレーション済みの場合はホモグラフィ変換を使用し、
 * 未キャリブレーションの場合は単純な線形マッピング（x * width, y * height）をフォールバックとして使用する。
 */
export class CoordinateMapper {
  private matrix: HomographyMatrix | null = null;

  /**
   * キャリブレーションデータ（ホモグラフィ行列）を設定する。
   * @param matrix 9要素のホモグラフィ変換行列
   */
  setCalibration(matrix: HomographyMatrix): void {
    this.matrix = matrix;
  }

  /**
   * Camera Space座標をScreen Space座標に変換する。
   *
   * キャリブレーション済みの場合はホモグラフィ変換を適用し、
   * 未キャリブレーションの場合は線形マッピングを使用する。
   * 結果はScreen Space範囲内にクランプされる。
   *
   * @param point Camera Space内の2D座標
   * @param screenSize スクリーンサイズ
   * @returns Screen Space内にクランプされた2D座標
   */
  mapToScreen(point: Point2D, screenSize: ScreenSize): Point2D {
    let mapped: Point2D;

    if (this.matrix !== null) {
      // ホモグラフィ変換を適用
      mapped = applyHomography(this.matrix, point);
    } else {
      // フォールバック: 単純な線形マッピング
      mapped = {
        x: point.x * screenSize.width,
        y: point.y * screenSize.height,
      };
    }

    // Screen Space範囲内にクランプ
    return {
      x: Math.max(0, Math.min(mapped.x, screenSize.width)),
      y: Math.max(0, Math.min(mapped.y, screenSize.height)),
    };
  }

  /**
   * キャリブレーション済みかどうかを返す。
   * @returns キャリブレーション済みの場合 true
   */
  isCalibrated(): boolean {
    return this.matrix !== null;
  }
}
