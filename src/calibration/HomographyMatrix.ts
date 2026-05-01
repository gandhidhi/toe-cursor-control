import type { Point2D } from '../types/index.ts';

/**
 * 4点の対応関係からホモグラフィ行列（3x3）を計算する純粋関数。
 * DLT (Direct Linear Transform) アルゴリズムを使用。
 *
 * @param srcPoints カメラ空間の4点
 * @param dstPoints スクリーン空間の4点
 * @returns 9要素の配列 [h11, h12, h13, h21, h22, h23, h31, h32, h33]
 */
export function computeHomography(
  srcPoints: [Point2D, Point2D, Point2D, Point2D],
  dstPoints: [Point2D, Point2D, Point2D, Point2D],
): number[] {
  // Build the 8x9 matrix A for the DLT algorithm.
  // Each point correspondence gives 2 equations:
  //   -x*h11 - y*h12 - h13 + x'*x*h31 + x'*y*h32 + x'*h33 = 0
  //   -x*h21 - y*h22 - h23 + y'*x*h31 + y'*y*h32 + y'*h33 = 0
  //
  // Rearranged into Ah = 0 form where h = [h11..h33].

  const A: number[][] = [];

  for (let i = 0; i < 4; i++) {
    const sx = srcPoints[i]!.x;
    const sy = srcPoints[i]!.y;
    const dx = dstPoints[i]!.x;
    const dy = dstPoints[i]!.y;

    A.push([
      -sx, -sy, -1, 0, 0, 0, dx * sx, dx * sy, dx,
    ]);
    A.push([
      0, 0, 0, -sx, -sy, -1, dy * sx, dy * sy, dy,
    ]);
  }

  // Solve Ah = 0 using SVD. The solution is the last column of V
  // (the right singular vector corresponding to the smallest singular value).
  const h = solveHomogeneous(A);

  // Normalize so that h33 = 1 (if possible)
  const h33 = h[8]!;
  if (Math.abs(h33) < 1e-12) {
    // Degenerate case — return the raw solution
    return h;
  }

  return h.map((v) => v / h33);
}

/**
 * ホモグラフィ行列を使って2D点を変換する純粋関数。
 *
 * 変換式:
 *   w * x' = h11*x + h12*y + h13
 *   w * y' = h21*x + h22*y + h23
 *   w      = h31*x + h32*y + h33
 *
 * @param matrix 9要素のホモグラフィ行列
 * @param point 変換元の2D座標
 * @returns 変換後の2D座標
 */
export function applyHomography(
  matrix: number[],
  point: Point2D,
): Point2D {
  const [h11, h12, h13, h21, h22, h23, h31, h32, h33] = matrix;

  const w = h31! * point.x + h32! * point.y + h33!;

  if (Math.abs(w) < 1e-12) {
    // Point maps to infinity — return as-is to avoid division by zero
    return { x: point.x, y: point.y };
  }

  const xPrime = (h11! * point.x + h12! * point.y + h13!) / w;
  const yPrime = (h21! * point.x + h22! * point.y + h23!) / w;

  return { x: xPrime, y: yPrime };
}

// =============================================================================
// Internal linear algebra helpers (no external dependencies)
// =============================================================================

/**
 * Solve the homogeneous system Ah = 0 for an 8x9 matrix A.
 * Uses the SVD approach: compute A^T A (9x9), then find the eigenvector
 * corresponding to the smallest eigenvalue via the Jacobi eigenvalue algorithm.
 */
function solveHomogeneous(A: number[][]): number[] {
  const rows = A.length; // 8
  const cols = 9;

  // Compute A^T * A (9x9 symmetric matrix)
  const AtA: number[][] = Array.from({ length: cols }, () =>
    new Array<number>(cols).fill(0),
  );

  for (let i = 0; i < cols; i++) {
    for (let j = i; j < cols; j++) {
      let sum = 0;
      for (let k = 0; k < rows; k++) {
        sum += A[k]![i]! * A[k]![j]!;
      }
      AtA[i]![j] = sum;
      AtA[j]![i] = sum;
    }
  }

  // Find the eigenvector of A^T A corresponding to the smallest eigenvalue
  // using the Jacobi eigenvalue algorithm for symmetric matrices.
  return smallestEigenvector(AtA, cols);
}

/**
 * Jacobi eigenvalue algorithm for a symmetric matrix.
 * Returns the eigenvector corresponding to the smallest eigenvalue.
 */
function smallestEigenvector(matrix: number[][], n: number): number[] {
  // Work on a copy
  const S: number[][] = matrix.map((row) => [...row]);

  // Initialize V as identity matrix (will accumulate rotations)
  const V: number[][] = Array.from({ length: n }, (_, i) => {
    const row = new Array<number>(n).fill(0);
    row[i] = 1;
    return row;
  });

  const maxIterations = 200;

  for (let iter = 0; iter < maxIterations; iter++) {
    // Find the largest off-diagonal element
    let maxVal = 0;
    let p = 0;
    let q = 1;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const absVal = Math.abs(S[i]![j]!);
        if (absVal > maxVal) {
          maxVal = absVal;
          p = i;
          q = j;
        }
      }
    }

    // Convergence check
    if (maxVal < 1e-12) break;

    // Compute the Jacobi rotation
    const Spq = S[p]![q]!;
    const Spp = S[p]![p]!;
    const Sqq = S[q]![q]!;

    const theta = 0.5 * Math.atan2(2 * Spq, Spp - Sqq);
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    // Apply rotation to S: S' = J^T S J
    // Update rows/columns p and q
    for (let i = 0; i < n; i++) {
      if (i === p || i === q) continue;
      const Sip = S[i]![p]!;
      const Siq = S[i]![q]!;
      S[i]![p] = c * Sip + s * Siq;
      S[p]![i] = S[i]![p]!;
      S[i]![q] = -s * Sip + c * Siq;
      S[q]![i] = S[i]![q]!;
    }

    const newSpp = c * c * Spp + 2 * s * c * Spq + s * s * Sqq;
    const newSqq = s * s * Spp - 2 * s * c * Spq + c * c * Sqq;
    S[p]![p] = newSpp;
    S[q]![q] = newSqq;
    S[p]![q] = 0;
    S[q]![p] = 0;

    // Accumulate rotation in V
    for (let i = 0; i < n; i++) {
      const Vip = V[i]![p]!;
      const Viq = V[i]![q]!;
      V[i]![p] = c * Vip + s * Viq;
      V[i]![q] = -s * Vip + c * Viq;
    }
  }

  // Find the index of the smallest eigenvalue (diagonal of S)
  let minIdx = 0;
  let minVal = Math.abs(S[0]![0]!);
  for (let i = 1; i < n; i++) {
    const val = Math.abs(S[i]![i]!);
    if (val < minVal) {
      minVal = val;
      minIdx = i;
    }
  }

  // Return the corresponding eigenvector (column minIdx of V)
  return V.map((row) => row[minIdx]!);
}
