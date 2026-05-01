import { describe, it, expect, beforeEach } from 'vitest';
import { CoordinateMapper } from '../CoordinateMapper.ts';
import { computeHomography } from '../../calibration/HomographyMatrix.ts';
import type { Point2D, ScreenSize } from '../../types/index.ts';

describe('CoordinateMapper', () => {
  let mapper: CoordinateMapper;
  const screenSize: ScreenSize = { width: 1920, height: 1080 };

  beforeEach(() => {
    mapper = new CoordinateMapper();
  });

  describe('isCalibrated', () => {
    it('should return false when no calibration is set', () => {
      expect(mapper.isCalibrated()).toBe(false);
    });

    it('should return true after setCalibration is called', () => {
      const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
      mapper.setCalibration(identity);
      expect(mapper.isCalibrated()).toBe(true);
    });
  });

  describe('mapToScreen - uncalibrated (linear fallback)', () => {
    it('should map (0, 0) to (0, 0)', () => {
      const result = mapper.mapToScreen({ x: 0, y: 0 }, screenSize);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should map (1, 1) to (width, height)', () => {
      const result = mapper.mapToScreen({ x: 1, y: 1 }, screenSize);
      expect(result.x).toBe(1920);
      expect(result.y).toBe(1080);
    });

    it('should map (0.5, 0.5) to center of screen', () => {
      const result = mapper.mapToScreen({ x: 0.5, y: 0.5 }, screenSize);
      expect(result.x).toBe(960);
      expect(result.y).toBe(540);
    });

    it('should clamp negative coordinates to 0', () => {
      const result = mapper.mapToScreen({ x: -0.1, y: -0.2 }, screenSize);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should clamp coordinates exceeding screen size', () => {
      const result = mapper.mapToScreen({ x: 1.5, y: 2.0 }, screenSize);
      expect(result.x).toBe(1920);
      expect(result.y).toBe(1080);
    });
  });

  describe('mapToScreen - calibrated (homography)', () => {
    it('should use homography transformation when calibrated', () => {
      // Set up a simple identity-like homography that maps [0,1] to [0, screenSize]
      const srcPoints: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ];
      const dstPoints: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 0, y: 0 },
        { x: 1920, y: 0 },
        { x: 1920, y: 1080 },
        { x: 0, y: 1080 },
      ];

      const matrix = computeHomography(srcPoints, dstPoints);
      mapper.setCalibration(matrix);

      const result = mapper.mapToScreen({ x: 0.5, y: 0.5 }, screenSize);
      expect(result.x).toBeCloseTo(960, 1);
      expect(result.y).toBeCloseTo(540, 1);
    });

    it('should clamp homography results within screen bounds', () => {
      // Use a homography that maps points outside screen bounds
      const srcPoints: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ];
      const dstPoints: [Point2D, Point2D, Point2D, Point2D] = [
        { x: -500, y: -500 },
        { x: 2500, y: -500 },
        { x: 2500, y: 1500 },
        { x: -500, y: 1500 },
      ];

      const matrix = computeHomography(srcPoints, dstPoints);
      mapper.setCalibration(matrix);

      // Point at (0, 0) maps to (-500, -500), should be clamped to (0, 0)
      const result = mapper.mapToScreen({ x: 0, y: 0 }, screenSize);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should correctly transform corner points with homography', () => {
      const srcPoints: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ];
      const dstPoints: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 100, y: 50 },
        { x: 1800, y: 50 },
        { x: 1800, y: 1000 },
        { x: 100, y: 1000 },
      ];

      const matrix = computeHomography(srcPoints, dstPoints);
      mapper.setCalibration(matrix);

      // Check that source corners map to destination corners
      const topLeft = mapper.mapToScreen({ x: 0, y: 0 }, screenSize);
      expect(topLeft.x).toBeCloseTo(100, 1);
      expect(topLeft.y).toBeCloseTo(50, 1);

      const bottomRight = mapper.mapToScreen({ x: 1, y: 1 }, screenSize);
      expect(bottomRight.x).toBeCloseTo(1800, 1);
      expect(bottomRight.y).toBeCloseTo(1000, 1);
    });
  });

  describe('setCalibration', () => {
    it('should allow updating calibration matrix', () => {
      const matrix1 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
      const matrix2 = [2, 0, 0, 0, 2, 0, 0, 0, 1];

      mapper.setCalibration(matrix1);
      expect(mapper.isCalibrated()).toBe(true);

      // Map with first matrix (identity)
      const result1 = mapper.mapToScreen({ x: 0.5, y: 0.5 }, screenSize);

      mapper.setCalibration(matrix2);
      // Map with second matrix (2x scale)
      const result2 = mapper.mapToScreen({ x: 0.5, y: 0.5 }, screenSize);

      // Results should differ since matrices are different
      expect(result1.x).not.toEqual(result2.x);
    });
  });
});
