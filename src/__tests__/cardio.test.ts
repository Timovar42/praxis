import { describe, it, expect } from 'vitest';
import { calculateCardioCalories, getCardioMet, CARDIO_TYPES, DEFAULT_USER_PROFILE } from '../domain/cardio';

describe('Cardio Calorie Calculations', () => {
  it('has default user profile with 183 cm height', () => {
    expect(DEFAULT_USER_PROFILE.height).toBe(183);
    expect(DEFAULT_USER_PROFILE.weight).toBe(92);
    expect(DEFAULT_USER_PROFILE.age).toBe(18);
    expect(DEFAULT_USER_PROFILE.bodyFatPct).toBe(27);
  });
  it('calculates calories based on MET, weight and duration', () => {
    // MET 4.3 (walking), 92 kg, 60 minutes = 4.3 * 92 * 1 = 395.6 -> 396
    const calsWalking60 = calculateCardioCalories('treadmill_walk', 60, 92);
    expect(calsWalking60).toBe(396);

    // MET 9.5 (running), 92 kg, 30 minutes = 9.5 * 92 * 0.5 = 437
    const calsRunning30 = calculateCardioCalories('treadmill_run', 30, 92);
    expect(calsRunning30).toBe(437);

    // MET 11.5 (jump rope), 92 kg, 20 minutes = 11.5 * 92 * (20/60) = 352.66 -> 353
    const calsJumpRope20 = calculateCardioCalories('jump_rope', 20, 92);
    expect(calsJumpRope20).toBe(353);
  });

  it('returns 0 calories for 0 duration or invalid weight', () => {
    expect(calculateCardioCalories('treadmill_walk', 0, 92)).toBe(0);
    expect(calculateCardioCalories('treadmill_walk', -10, 92)).toBe(0);
    expect(calculateCardioCalories('treadmill_walk', 30, 0)).toBe(0);
  });

  it('provides all 6 requested cardio types', () => {
    const ids = CARDIO_TYPES.map((t) => t.id);
    expect(ids).toContain('treadmill_walk');
    expect(ids).toContain('treadmill_run');
    expect(ids).toContain('elliptical');
    expect(ids).toContain('bike');
    expect(ids).toContain('boxing');
    expect(ids).toContain('jump_rope');
  });

  it('returns default MET for unknown activity', () => {
    expect(getCardioMet('unknown_activity')).toBe(5.0);
  });
});
