import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalibrationModule } from '../CalibrationModule.ts';
import type { Point2D } from '../../types/index.ts';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

/** 非退化な4点のキャリブレーションペア（正方形の四隅） */
const VALID_CAMERA_POINTS: [Point2D, Point2D, Point2D, Point2D] = [
  { x: 0.1, y: 0.1 },
  { x: 0.9, y: 0.1 },
  { x: 0.9, y: 0.9 },
  { x: 0.1, y: 0.9 },
];

const VALID_SCREEN_POINTS: [Point2D, Point2D, Point2D, Point2D] = [
  { x: 0, y: 0 },
  { x: 1920, y: 0 },
  { x: 1920, y: 1080 },
  { x: 0, y: 1080 },
];

describe('CalibrationModule', () => {
  let module: CalibrationModule;

  beforeEach(() => {
    module = new CalibrationModule();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('startCalibration', () => {
    it('should reset recorded points', () => {
      module.recordPoint({ x: 0.1, y: 0.1 }, { x: 0, y: 0 });
      expect(module.getProgress().recordedPoints).toBe(1);

      module.startCalibration();
      expect(module.getProgress().recordedPoints).toBe(0);
    });
  });

  describe('recordPoint', () => {
    it('should record up to 4 points', () => {
      for (let i = 0; i < 4; i++) {
        module.recordPoint(VALID_CAMERA_POINTS[i]!, VALID_SCREEN_POINTS[i]!);
      }
      expect(module.getProgress().recordedPoints).toBe(4);
    });

    it('should ignore points beyond 4', () => {
      for (let i = 0; i < 4; i++) {
        module.recordPoint(VALID_CAMERA_POINTS[i]!, VALID_SCREEN_POINTS[i]!);
      }
      module.recordPoint({ x: 0.5, y: 0.5 }, { x: 960, y: 540 });
      expect(module.getProgress().recordedPoints).toBe(4);
    });
  });

  describe('getProgress', () => {
    it('should return correct progress at start', () => {
      const progress = module.getProgress();
      expect(progress.recordedPoints).toBe(0);
      expect(progress.requiredPoints).toBe(4);
      expect(progress.instruction).toBe('左上のポイントにつま先を合わせてください');
    });

    it('should update instruction as points are recorded', () => {
      module.recordPoint(VALID_CAMERA_POINTS[0]!, VALID_SCREEN_POINTS[0]!);
      expect(module.getProgress().instruction).toBe('右上のポイントにつま先を合わせてください');

      module.recordPoint(VALID_CAMERA_POINTS[1]!, VALID_SCREEN_POINTS[1]!);
      expect(module.getProgress().instruction).toBe('右下のポイントにつま先を合わせてください');

      module.recordPoint(VALID_CAMERA_POINTS[2]!, VALID_SCREEN_POINTS[2]!);
      expect(module.getProgress().instruction).toBe('左下のポイントにつま先を合わせてください');

      module.recordPoint(VALID_CAMERA_POINTS[3]!, VALID_SCREEN_POINTS[3]!);
      expect(module.getProgress().instruction).toBe('キャリブレーションが完了しました');
    });
  });

  describe('complete', () => {
    it('should return null when less than 4 points recorded', () => {
      module.recordPoint(VALID_CAMERA_POINTS[0]!, VALID_SCREEN_POINTS[0]!);
      module.recordPoint(VALID_CAMERA_POINTS[1]!, VALID_SCREEN_POINTS[1]!);
      expect(module.complete()).toBeNull();
    });

    it('should return a homography matrix with 4 valid points', () => {
      for (let i = 0; i < 4; i++) {
        module.recordPoint(VALID_CAMERA_POINTS[i]!, VALID_SCREEN_POINTS[i]!);
      }
      const matrix = module.complete();
      expect(matrix).not.toBeNull();
      expect(matrix).toHaveLength(9);
    });

    it('should return null for collinear camera points', () => {
      // All camera points on the same line (y = 0.5)
      const collinearCamera: Point2D[] = [
        { x: 0.1, y: 0.5 },
        { x: 0.3, y: 0.5 },
        { x: 0.6, y: 0.5 },
        { x: 0.9, y: 0.5 },
      ];
      for (let i = 0; i < 4; i++) {
        module.recordPoint(collinearCamera[i]!, VALID_SCREEN_POINTS[i]!);
      }
      expect(module.complete()).toBeNull();
    });

    it('should return null for collinear screen points', () => {
      // All screen points on the same line (y = 540)
      const collinearScreen: Point2D[] = [
        { x: 0, y: 540 },
        { x: 640, y: 540 },
        { x: 1280, y: 540 },
        { x: 1920, y: 540 },
      ];
      for (let i = 0; i < 4; i++) {
        module.recordPoint(VALID_CAMERA_POINTS[i]!, collinearScreen[i]!);
      }
      expect(module.complete()).toBeNull();
    });
  });

  describe('save / load', () => {
    it('should save and load a homography matrix', () => {
      const matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
      module.save(matrix);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'toe-cursor-control-calibration',
        JSON.stringify(matrix),
      );

      const loaded = module.load();
      expect(loaded).toEqual(matrix);
    });

    it('should return null when no data is saved', () => {
      expect(module.load()).toBeNull();
    });

    it('should return null and remove corrupted data (invalid JSON)', () => {
      localStorageMock.setItem('toe-cursor-control-calibration', 'not-json');
      vi.clearAllMocks();

      expect(module.load()).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'toe-cursor-control-calibration',
      );
    });

    it('should return null and remove data with wrong length', () => {
      localStorageMock.setItem(
        'toe-cursor-control-calibration',
        JSON.stringify([1, 2, 3]),
      );
      vi.clearAllMocks();

      expect(module.load()).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'toe-cursor-control-calibration',
      );
    });

    it('should return null and remove data with non-finite values', () => {
      localStorageMock.setItem(
        'toe-cursor-control-calibration',
        JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, null]),
      );
      vi.clearAllMocks();

      expect(module.load()).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'toe-cursor-control-calibration',
      );
    });
  });
});
