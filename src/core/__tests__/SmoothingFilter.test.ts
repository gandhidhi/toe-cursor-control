import { describe, it, expect } from 'vitest';
import { applyEMA, applySmoothing } from '../SmoothingFilter.ts';
import type { Point2D, SmoothingConfig } from '../../types/index.ts';

describe('SmoothingFilter', () => {
  describe('applyEMA', () => {
    it('should return current when alpha is 1', () => {
      const current: Point2D = { x: 100, y: 200 };
      const previous: Point2D = { x: 50, y: 80 };
      const result = applyEMA(current, previous, 1);
      expect(result.x).toBeCloseTo(100, 10);
      expect(result.y).toBeCloseTo(200, 10);
    });

    it('should return previous when alpha is 0', () => {
      const current: Point2D = { x: 100, y: 200 };
      const previous: Point2D = { x: 50, y: 80 };
      const result = applyEMA(current, previous, 0);
      expect(result.x).toBeCloseTo(50, 10);
      expect(result.y).toBeCloseTo(80, 10);
    });

    it('should compute weighted average with alpha 0.5', () => {
      const current: Point2D = { x: 100, y: 200 };
      const previous: Point2D = { x: 50, y: 80 };
      const result = applyEMA(current, previous, 0.5);
      expect(result.x).toBeCloseTo(75, 10);
      expect(result.y).toBeCloseTo(140, 10);
    });

    it('should apply EMA formula correctly with alpha 0.3', () => {
      const current: Point2D = { x: 10, y: 20 };
      const previous: Point2D = { x: 0, y: 0 };
      const result = applyEMA(current, previous, 0.3);
      // smoothed = 0.3 * current + 0.7 * previous
      expect(result.x).toBeCloseTo(3, 10);
      expect(result.y).toBeCloseTo(6, 10);
    });

    it('should return same point when current equals previous', () => {
      const point: Point2D = { x: 42, y: 73 };
      const result = applyEMA(point, point, 0.3);
      expect(result.x).toBeCloseTo(42, 10);
      expect(result.y).toBeCloseTo(73, 10);
    });
  });

  describe('applySmoothing', () => {
    const config: SmoothingConfig = { alpha: 0.3, deadZone: 5 };

    it('should return previous when movement is within dead zone', () => {
      const previous: Point2D = { x: 100, y: 100 };
      const current: Point2D = { x: 102, y: 101 }; // distance ~2.24
      const result = applySmoothing(current, previous, config);
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it('should apply EMA when movement exceeds dead zone', () => {
      const previous: Point2D = { x: 100, y: 100 };
      const current: Point2D = { x: 120, y: 100 }; // distance = 20
      const result = applySmoothing(current, previous, config);
      // EMA: 0.3 * 120 + 0.7 * 100 = 106
      expect(result.x).toBeCloseTo(106, 10);
      expect(result.y).toBeCloseTo(100, 10);
    });

    it('should return previous when current equals previous', () => {
      const point: Point2D = { x: 50, y: 50 };
      const result = applySmoothing(point, point, config);
      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
    });

    it('should return previous at exactly the dead zone boundary', () => {
      const previous: Point2D = { x: 100, y: 100 };
      // distance exactly 4.99... < 5 (dead zone)
      const current: Point2D = { x: 103, y: 104 }; // distance = 5
      const result = applySmoothing(current, previous, config);
      // distance = sqrt(9+16) = 5, which is not < 5, so EMA is applied
      expect(result.x).toBeCloseTo(0.3 * 103 + 0.7 * 100, 10);
      expect(result.y).toBeCloseTo(0.3 * 104 + 0.7 * 100, 10);
    });

    it('should handle dead zone of 0 (no dead zone)', () => {
      const zeroDeadZone: SmoothingConfig = { alpha: 0.5, deadZone: 0 };
      const previous: Point2D = { x: 100, y: 100 };
      const current: Point2D = { x: 100.1, y: 100.1 }; // tiny movement
      const result = applySmoothing(current, previous, zeroDeadZone);
      // distance > 0, so EMA is applied
      expect(result.x).toBeCloseTo(100.05, 5);
      expect(result.y).toBeCloseTo(100.05, 5);
    });
  });
});
