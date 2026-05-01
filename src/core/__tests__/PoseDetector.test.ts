import { describe, it, expect } from 'vitest';
import { extractToeLandmark } from '../PoseDetector';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/**
 * 33個のランドマークを持つダミー配列を生成するヘルパー。
 * 各ランドマークは index に基づいた値を持つ。
 */
function createMockLandmarks(count = 33): NormalizedLandmark[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i / count,
    y: (count - i) / count,
    z: i * 0.01,
    visibility: 0.9,
  }));
}

describe('extractToeLandmark', () => {
  it('should return landmark at index 31 for left foot', () => {
    const landmarks = createMockLandmarks(33);
    const result = extractToeLandmark(landmarks, 'left');
    expect(result).not.toBeNull();
    expect(result).toEqual(landmarks[31]);
  });

  it('should return landmark at index 32 for right foot', () => {
    const landmarks = createMockLandmarks(33);
    const result = extractToeLandmark(landmarks, 'right');
    expect(result).not.toBeNull();
    expect(result).toEqual(landmarks[32]);
  });

  it('should return null when landmarks array is too short for left foot', () => {
    const landmarks = createMockLandmarks(31); // indices 0-30, missing 31
    const result = extractToeLandmark(landmarks, 'left');
    expect(result).toBeNull();
  });

  it('should return null when landmarks array is too short for right foot', () => {
    const landmarks = createMockLandmarks(32); // indices 0-31, missing 32
    const result = extractToeLandmark(landmarks, 'right');
    expect(result).toBeNull();
  });

  it('should return null for empty landmarks array', () => {
    const result = extractToeLandmark([], 'left');
    expect(result).toBeNull();
  });

  it('should return correct landmark with specific values', () => {
    const landmarks = createMockLandmarks(33);
    // Override the toe landmarks with specific values
    landmarks[31] = { x: 0.1, y: 0.2, z: 0.3, visibility: 0.95 };
    landmarks[32] = { x: 0.4, y: 0.5, z: 0.6, visibility: 0.85 };

    const leftResult = extractToeLandmark(landmarks, 'left');
    expect(leftResult).toEqual({ x: 0.1, y: 0.2, z: 0.3, visibility: 0.95 });

    const rightResult = extractToeLandmark(landmarks, 'right');
    expect(rightResult).toEqual({ x: 0.4, y: 0.5, z: 0.6, visibility: 0.85 });
  });

  it('should work with exactly 33 landmarks (standard MediaPipe output)', () => {
    const landmarks = createMockLandmarks(33);
    // Both should be accessible
    expect(extractToeLandmark(landmarks, 'left')).not.toBeNull();
    expect(extractToeLandmark(landmarks, 'right')).not.toBeNull();
  });

  it('should work with more than 33 landmarks', () => {
    const landmarks = createMockLandmarks(40);
    const leftResult = extractToeLandmark(landmarks, 'left');
    const rightResult = extractToeLandmark(landmarks, 'right');
    expect(leftResult).toEqual(landmarks[31]);
    expect(rightResult).toEqual(landmarks[32]);
  });
});
