import { describe, it, expect } from 'vitest';
import { detectTap, computeVelocities, findTapPattern } from '../TapDetector.ts';
import type { ToeFrame, TapConfig } from '../../types/index.ts';

const defaultConfig: TapConfig = {
  velocityThreshold: 0.05,
  cooldownMs: 300,
  doubleTapWindowMs: 500,
};

describe('TapDetector', () => {
  describe('computeVelocities', () => {
    it('should compute velocities between adjacent frames', () => {
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 0 },
        { z: 0.5, timestamp: 100 },
        { z: 0.8, timestamp: 200 },
      ];
      const velocities = computeVelocities(history);
      expect(velocities).toHaveLength(2);
      // (0.5 - 1.0) / (100 - 0) = -0.005
      expect(velocities[0]).toBeCloseTo(-0.005, 10);
      // (0.8 - 0.5) / (200 - 100) = 0.003
      expect(velocities[1]).toBeCloseTo(0.003, 10);
    });

    it('should return 0 velocity for same-timestamp frames', () => {
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 100 },
        { z: 0.5, timestamp: 100 },
      ];
      const velocities = computeVelocities(history);
      expect(velocities[0]).toBe(0);
    });

    it('should return empty array for single frame', () => {
      const history: ToeFrame[] = [{ z: 1.0, timestamp: 0 }];
      expect(computeVelocities(history)).toHaveLength(0);
    });
  });

  describe('findTapPattern', () => {
    it('should detect a tap when downward velocity exceeds threshold and reverses', () => {
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 0 },
        { z: 0.0, timestamp: 100 },  // fast downward
        { z: 0.3, timestamp: 200 },  // reversal upward
      ];
      const velocities = computeVelocities(history);
      const result = findTapPattern(history, velocities, 0.005);
      expect(result).toBe(100); // timestamp of the lowest point
    });

    it('should return null when velocity is below threshold', () => {
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 0 },
        { z: 0.999, timestamp: 100 },  // very slow downward
        { z: 1.0, timestamp: 200 },
      ];
      const velocities = computeVelocities(history);
      const result = findTapPattern(history, velocities, 0.05);
      expect(result).toBeNull();
    });

    it('should return null when there is no upward reversal', () => {
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 0 },
        { z: 0.0, timestamp: 100 },  // fast downward
        { z: -0.5, timestamp: 200 }, // still going down
      ];
      const velocities = computeVelocities(history);
      const result = findTapPattern(history, velocities, 0.005);
      expect(result).toBeNull();
    });

    it('should detect the most recent tap pattern', () => {
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 0 },
        { z: 0.0, timestamp: 100 },  // first tap down
        { z: 0.5, timestamp: 200 },  // first reversal
        { z: 1.0, timestamp: 300 },
        { z: 0.0, timestamp: 400 },  // second tap down
        { z: 0.5, timestamp: 500 },  // second reversal
      ];
      const velocities = computeVelocities(history);
      const result = findTapPattern(history, velocities, 0.005);
      // Should find the most recent (last) tap pattern
      expect(result).toBe(400);
    });
  });

  describe('detectTap', () => {
    it('should return none for insufficient history (less than 3 frames)', () => {
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 0 },
        { z: 0.0, timestamp: 100 },
      ];
      const result = detectTap(history, defaultConfig);
      expect(result.event).toBe('none');
      expect(result.lastTapTimestamp).toBeNull();
    });

    it('should return none for empty history', () => {
      const result = detectTap([], defaultConfig);
      expect(result.event).toBe('none');
      expect(result.lastTapTimestamp).toBeNull();
    });

    it('should detect a single tap', () => {
      // Create a clear tap pattern: fast downward then reversal
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 0 },
        { z: 0.0, timestamp: 10 },   // velocity = -0.1, exceeds threshold 0.05
        { z: 0.5, timestamp: 20 },   // reversal upward
      ];
      const result = detectTap(history, defaultConfig);
      expect(result.event).toBe('tap');
      expect(result.lastTapTimestamp).toBe(10);
    });

    it('should return none when velocity is below threshold', () => {
      // Slow downward movement
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 0 },
        { z: 0.99, timestamp: 100 },  // velocity = -0.0001, below threshold
        { z: 1.0, timestamp: 200 },
      ];
      const result = detectTap(history, defaultConfig);
      expect(result.event).toBe('none');
    });

    it('should ignore tap within cooldown period', () => {
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 200 },
        { z: 0.0, timestamp: 210 },  // fast tap
        { z: 0.5, timestamp: 220 },
      ];
      // Previous tap was at timestamp 100, cooldown is 300ms
      // New tap at 210 is within 300ms of 100
      const result = detectTap(history, defaultConfig, 100);
      expect(result.event).toBe('none');
      expect(result.lastTapTimestamp).toBe(100); // preserves previous
    });

    it('should detect tap after cooldown period expires', () => {
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 500 },
        { z: 0.0, timestamp: 510 },
        { z: 0.5, timestamp: 520 },
      ];
      // Previous tap at 100, cooldown 300ms. New tap at 510 > 100 + 300
      const result = detectTap(history, defaultConfig, 100);
      expect(result.event).toBe('doubletap'); // within doubleTapWindowMs (500)
      expect(result.lastTapTimestamp).toBe(510);
    });

    it('should detect doubletap when second tap is within doubleTapWindowMs', () => {
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 600 },
        { z: 0.0, timestamp: 610 },
        { z: 0.5, timestamp: 620 },
      ];
      // Previous tap at 400, doubleTapWindowMs is 500
      // New tap at 610, 610 - 400 = 210 < 500 → doubletap
      // But also check cooldown: 610 - 400 = 210 < 300 → cooldown blocks it
      // Need to set previous tap so cooldown passes but doubletap window still active
      const result = detectTap(history, defaultConfig, 200);
      // 610 - 200 = 410 > 300 (cooldown passed), 410 < 500 (within doubletap window)
      expect(result.event).toBe('doubletap');
      expect(result.lastTapTimestamp).toBe(610);
    });

    it('should detect single tap when second tap is outside doubleTapWindowMs', () => {
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 1000 },
        { z: 0.0, timestamp: 1010 },
        { z: 0.5, timestamp: 1020 },
      ];
      // Previous tap at 100, doubleTapWindowMs is 500
      // New tap at 1010, 1010 - 100 = 910 > 500 → single tap
      const result = detectTap(history, defaultConfig, 100);
      expect(result.event).toBe('tap');
      expect(result.lastTapTimestamp).toBe(1010);
    });

    it('should return none when no tap pattern exists', () => {
      // Steady z values, no tap
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 0 },
        { z: 1.0, timestamp: 100 },
        { z: 1.0, timestamp: 200 },
      ];
      const result = detectTap(history, defaultConfig);
      expect(result.event).toBe('none');
    });

    it('should preserve lastTapTimestamp when no new tap detected', () => {
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 0 },
        { z: 1.0, timestamp: 100 },
        { z: 1.0, timestamp: 200 },
      ];
      const result = detectTap(history, defaultConfig, 50);
      expect(result.event).toBe('none');
      expect(result.lastTapTimestamp).toBe(50);
    });

    it('should handle first tap with no previous tap timestamp', () => {
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 0 },
        { z: 0.0, timestamp: 10 },
        { z: 0.5, timestamp: 20 },
      ];
      const result = detectTap(history, defaultConfig, null);
      expect(result.event).toBe('tap');
      expect(result.lastTapTimestamp).toBe(10);
    });

    it('should work with custom config values', () => {
      const strictConfig: TapConfig = {
        velocityThreshold: 0.1,
        cooldownMs: 500,
        doubleTapWindowMs: 300,
      };
      // Velocity = |-1.0/10| = 0.1, which is not > 0.1 (must exceed, not equal)
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 0 },
        { z: 0.0, timestamp: 10 },  // velocity = -0.1
        { z: 0.5, timestamp: 20 },
      ];
      const result = detectTap(history, strictConfig);
      // -downVelocity = 0.1, threshold = 0.1, 0.1 > 0.1 is false
      expect(result.event).toBe('none');
    });

    it('should detect tap when velocity just exceeds threshold', () => {
      const config: TapConfig = {
        velocityThreshold: 0.1,
        cooldownMs: 300,
        doubleTapWindowMs: 500,
      };
      const history: ToeFrame[] = [
        { z: 1.0, timestamp: 0 },
        { z: 0.0, timestamp: 9 },   // velocity = -1.0/9 ≈ -0.111, exceeds 0.1
        { z: 0.5, timestamp: 20 },
      ];
      const result = detectTap(history, config);
      expect(result.event).toBe('tap');
    });
  });
});
