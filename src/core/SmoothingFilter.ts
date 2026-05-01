import type { Point2D, SmoothingConfig } from '../types/index.ts';

/**
 * EMAスムージングの純粋関数
 *
 * 指数移動平均（Exponential Moving Average）を適用する。
 * smoothed = α * current + (1 - α) * previous
 *
 * @param current - 現在の座標
 * @param previous - 前回の座標
 * @param alpha - 平滑化係数 (0-1, 高いほど追従性が高い)
 * @returns スムージング適用後の座標
 */
export function applyEMA(
  current: Point2D,
  previous: Point2D,
  alpha: number,
): Point2D {
  return {
    x: alpha * current.x + (1 - alpha) * previous.x,
    y: alpha * current.y + (1 - alpha) * previous.y,
  };
}

/**
 * デッドゾーン付きスムージング
 *
 * currentとpreviousの距離がデッドゾーン半径以内の場合、previousを返す（微小移動を無視）。
 * デッドゾーン外の場合、EMAスムージングを適用する。
 *
 * @param current - 現在の座標
 * @param previous - 前回の座標（スムージング済み）
 * @param config - スムージング設定（alpha, deadZone）
 * @returns スムージング適用後の座標
 */
export function applySmoothing(
  current: Point2D,
  previous: Point2D,
  config: SmoothingConfig,
): Point2D {
  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // デッドゾーン内の微小移動は無視
  if (distance < config.deadZone) {
    return { x: previous.x, y: previous.y };
  }

  return applyEMA(current, previous, config.alpha);
}
