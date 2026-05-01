import { describe, it, expect } from 'vitest';
import { computeHomography, applyHomography } from '../HomographyMatrix.ts';
import type { Point2D } from '../../types/index.ts';

describe('HomographyMatrix', () => {
  describe('applyHomography', () => {
    it('should apply identity matrix without changing the point', () => {
      const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
      const point: Point2D = { x: 0.5, y: 0.3 };
      const result = applyHomography(identity, point);
      expect(result.x).toBeCloseTo(0.5, 10);
      expect(result.y).toBeCloseTo(0.3, 10);
    });

    it('should apply a translation matrix', () => {
      // Translate by (10, 20)
      const matrix = [1, 0, 10, 0, 1, 20, 0, 0, 1];
      const point: Point2D = { x: 5, y: 3 };
      const result = applyHomography(matrix, point);
      expect(result.x).toBeCloseTo(15, 10);
      expect(result.y).toBeCloseTo(23, 10);
    });

    it('should apply a scaling matrix', () => {
      // Scale by 2x in x, 3x in y
      const matrix = [2, 0, 0, 0, 3, 0, 0, 0, 1];
      const point: Point2D = { x: 4, y: 5 };
      const result = applyHomography(matrix, point);
      expect(result.x).toBeCloseTo(8, 10);
      expect(result.y).toBeCloseTo(15, 10);
    });
  });

  describe('computeHomography', () => {
    it('should compute identity-like matrix for identical src and dst points', () => {
      const points: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ];
      const matrix = computeHomography(points, points);

      // Applying the matrix to any source point should return the same point
      for (const p of points) {
        const result = applyHomography(matrix, p);
        expect(result.x).toBeCloseTo(p.x, 5);
        expect(result.y).toBeCloseTo(p.y, 5);
      }
    });

    it('should compute a scaling homography', () => {
      const src: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ];
      const dst: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 0, y: 0 },
        { x: 1920, y: 0 },
        { x: 1920, y: 1080 },
        { x: 0, y: 1080 },
      ];
      const matrix = computeHomography(src, dst);

      for (let i = 0; i < 4; i++) {
        const result = applyHomography(matrix, src[i]!);
        expect(result.x).toBeCloseTo(dst[i]!.x, 3);
        expect(result.y).toBeCloseTo(dst[i]!.y, 3);
      }
    });

    it('should handle a perspective transform (non-rectangular dst)', () => {
      const src: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ];
      const dst: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 100, y: 200 },
        { x: 800, y: 150 },
        { x: 750, y: 900 },
        { x: 50, y: 850 },
      ];
      const matrix = computeHomography(src, dst);

      // Verify round-trip: each source point maps to its corresponding dst point
      for (let i = 0; i < 4; i++) {
        const result = applyHomography(matrix, src[i]!);
        expect(result.x).toBeCloseTo(dst[i]!.x, 3);
        expect(result.y).toBeCloseTo(dst[i]!.y, 3);
      }
    });

    it('should handle non-unit-square source points', () => {
      const src: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 0.1, y: 0.2 },
        { x: 0.9, y: 0.15 },
        { x: 0.85, y: 0.8 },
        { x: 0.15, y: 0.85 },
      ];
      const dst: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 0, y: 0 },
        { x: 1920, y: 0 },
        { x: 1920, y: 1080 },
        { x: 0, y: 1080 },
      ];
      const matrix = computeHomography(src, dst);

      for (let i = 0; i < 4; i++) {
        const result = applyHomography(matrix, src[i]!);
        expect(result.x).toBeCloseTo(dst[i]!.x, 3);
        expect(result.y).toBeCloseTo(dst[i]!.y, 3);
      }
    });
  });
});
