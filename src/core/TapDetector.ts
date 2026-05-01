import type { ToeFrame, TapConfig, TapResult } from '../types/index.ts';

/**
 * タップ検出の純粋関数
 *
 * つま先のz座標の履歴を分析し、タップ動作を検出する。
 * タップは、つま先が閾値を超える速度で下方向に移動した後、
 * 上方向に反転するパターンとして定義される。
 *
 * アルゴリズム:
 * 1. 隣接フレーム間のz座標の速度（dz/dt）を計算
 * 2. 下降速度が閾値を超えた後、上昇に反転するポイントを検出
 * 3. クールダウン期間内のタップは無視
 * 4. ダブルタップウィンドウ内の2回目のタップはダブルタップとして判定
 *
 * z座標: 高い値 = 地面から遠い、低い値 = 地面に近い
 * 下降 = z が減少 = 負の速度
 *
 * @param history - 最近のToeFrameの履歴（z座標 + タイムスタンプ）
 * @param config - タップ検出設定
 * @param lastTapTimestamp - 前回のタップのタイムスタンプ（クールダウン・ダブルタップ判定用）
 * @returns タップ検出結果
 */
export function detectTap(
  history: ToeFrame[],
  config: TapConfig,
  lastTapTimestamp: number | null = null,
): TapResult {
  // 最低3フレーム必要（速度計算に2ペア、反転検出に3フレーム）
  if (history.length < 3) {
    return { event: 'none', lastTapTimestamp };
  }

  // 隣接フレーム間の速度を計算
  const velocities = computeVelocities(history);

  // タップパターンを検出: 閾値を超える下降速度の後に上昇反転
  const tapTimestamp = findTapPattern(history, velocities, config.velocityThreshold);

  if (tapTimestamp === null) {
    return { event: 'none', lastTapTimestamp };
  }

  // クールダウン判定: 前回のタップからcooldownMs以内なら無視
  if (lastTapTimestamp !== null && tapTimestamp - lastTapTimestamp < config.cooldownMs) {
    return { event: 'none', lastTapTimestamp };
  }

  // ダブルタップ判定: 前回のタップからdoubleTapWindowMs以内なら doubletap
  if (lastTapTimestamp !== null && tapTimestamp - lastTapTimestamp <= config.doubleTapWindowMs) {
    return { event: 'doubletap', lastTapTimestamp: tapTimestamp };
  }

  // シングルタップ
  return { event: 'tap', lastTapTimestamp: tapTimestamp };
}

/**
 * 隣接フレーム間のz座標の速度を計算する
 *
 * velocity = (z[i+1] - z[i]) / (t[i+1] - t[i])
 * 負の速度 = 下降（地面に向かう動き）
 *
 * @param history - ToeFrameの履歴
 * @returns 各隣接ペアの速度配列（length = history.length - 1）
 */
export function computeVelocities(history: ToeFrame[]): number[] {
  const velocities: number[] = [];

  for (let i = 0; i < history.length - 1; i++) {
    const current = history[i]!;
    const next = history[i + 1]!;
    const dt = next.timestamp - current.timestamp;

    if (dt <= 0) {
      velocities.push(0);
    } else {
      velocities.push((next.z - current.z) / dt);
    }
  }

  return velocities;
}

/**
 * タップパターンを検出する
 *
 * 閾値を超える下降速度の後に上昇（速度が正に反転）するパターンを探す。
 * タップのタイムスタンプは反転ポイント（最低点）のタイムスタンプとする。
 *
 * @param history - ToeFrameの履歴
 * @param velocities - 速度配列
 * @param velocityThreshold - 下降速度の閾値（正の値）
 * @returns タップが検出された場合のタイムスタンプ、未検出の場合はnull
 */
export function findTapPattern(
  history: ToeFrame[],
  velocities: number[],
  velocityThreshold: number,
): number | null {
  // 最後のタップパターンを検出（最新のイベントを優先）
  // velocities[i] は history[i] → history[i+1] の速度
  // 反転パターン: velocities[i] が閾値超の下降、velocities[i+1] が上昇（正）
  for (let i = velocities.length - 2; i >= 0; i--) {
    const downVelocity = velocities[i]!;
    const nextVelocity = velocities[i + 1]!;

    // 下降速度が閾値を超え（負の速度の絶対値が閾値超）、次に上昇に反転
    if (-downVelocity > velocityThreshold && nextVelocity > 0) {
      // タップのタイムスタンプは反転ポイント（最低点 = history[i+1]）
      return history[i + 1]!.timestamp;
    }
  }

  return null;
}
