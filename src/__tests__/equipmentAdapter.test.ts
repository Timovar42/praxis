import { describe, it, expect } from 'vitest';
import {
  classifyEquipment,
  getEquipmentConversionFactor,
  getLastLoggedSetsForVariation,
  getCurrentLiftE1RMForVariation,
} from '../domain/equipmentAdapter';
import type { Session, Program, Settings } from '../domain/types';

describe('equipmentAdapter', () => {
  it('correctly classifies equipment variations', () => {
    expect(classifyEquipment('со штангой')).toBe('barbell');
    expect(classifyEquipment('с гантелями стоя')).toBe('dumbbell');
    expect(classifyEquipment('жим ног')).toBe('leg_press');
    expect(classifyEquipment('в гакке')).toBe('hack');
    expect(classifyEquipment('выпады в смитте')).toBe('smith');
    expect(classifyEquipment('хаммер')).toBe('hammer_machine');
    expect(classifyEquipment('с 1 гантелью из-за головы')).toBe('single_dumbbell_two_hands');
    expect(classifyEquipment('в кроссовере 1 рукой')).toBe('cable_one_hand');
    expect(classifyEquipment('в кроссовере с косичкой')).toBe('cable_two_hands');
  });

  it('converts dumbbell curl to barbell curl correctly (User Bug Scenario: 16kg DB -> ~35kg Barbell)', () => {
    const factor = getEquipmentConversionFactor('с гантелями стоя', 'со штангой', 'curl');
    expect(factor).toBeCloseTo(2.2, 1);

    const dumbbellWeight = 16;
    const estimatedBarbell = Math.round((dumbbellWeight * factor) / 2.5) * 2.5;
    expect(estimatedBarbell).toBe(35); // 16 * 2.2 = 35.2 -> 35 kg
  });

  it('converts squat to leg press and hack squat', () => {
    const squatToLegPress = getEquipmentConversionFactor('со штангой', 'жим ног', 'squat');
    expect(squatToLegPress).toBe(1.8);
    expect(100 * squatToLegPress).toBe(180);

    const squatToHack = getEquipmentConversionFactor('со штангой', 'в гакке', 'squat');
    expect(squatToHack).toBe(1.25);
    expect(100 * squatToHack).toBe(125);
  });

  it('converts bench press between barbell and dumbbells', () => {
    const benchDBtoBB = getEquipmentConversionFactor('с гантелями', 'со штангой', 'bench');
    expect(benchDBtoBB).toBe(2.4);

    const benchBBtoDB = getEquipmentConversionFactor('со штангой', 'с гантелями', 'bench');
    expect(benchBBtoDB).toBeCloseTo(1 / 2.4, 2);
  });

  it('adapts last logged sets when switching from dumbbells to barbell', () => {
    const mockProgram = {
      id: 'p1',
      name: 'Test',
      cycleStart: '2026-01-01',
      cycleWeeks: 3,
      days: {
        mon: { title: 'Arms' },
        tue: { title: 'Rest' },
        wed: { title: 'Rest' },
        fri: { title: 'Rest' },
        sat: { title: 'Rest' },
      },
      rotation: {
        mon: ['str', 'mid', 'vol'] as const,
        tue: ['str', 'mid', 'vol'] as const,
        wed: ['str', 'mid', 'vol'] as const,
        fri: ['str', 'mid', 'vol'] as const,
        sat: ['str', 'mid', 'vol'] as const,
      },
      slots: [
        {
          id: 'slot-biceps',
          name: 'Бицепс',
          lift: 'curl',
          day: 'mon' as const,
          kind: 'isolation' as const,
          inc: 2.5,
          muscles: { biceps: 1 },
          variations: ['с гантелями стоя', 'со штангой'],
          rx: {
            str: { opts: [[3, 10] as [number, number]] },
            mid: { opts: [[3, 8] as [number, number]] },
            vol: { opts: [[3, 12] as [number, number]] },
          },
        },
      ],
    } as unknown as Program;

    const mockSessions: Session[] = [
      {
        id: 's1',
        date: '2026-11-01',
        cycle: 1,
        week: 1,
        day: 'mon',
        entries: [
          {
            slotId: 'slot-biceps',
            variation: 'с гантелями стоя',
            zone: 'str',
            variant: 0,
            rxSnapshot: { opts: [[3, 10]] },
            sets: [
              { type: 'work', weight: 16, reps: 10, done: true },
              { type: 'work', weight: 16, reps: 10, done: true },
              { type: 'work', weight: 16, reps: 10, done: true },
            ],
          },
        ],
      },
    ];

    // User chooses barbell curl next session
    const res = getLastLoggedSetsForVariation(mockSessions, 'slot-biceps', 'со штангой', mockProgram);
    expect(res).not.toBeNull();
    expect(res?.adapted).toBe(true);
    expect(res?.sourceVariation).toBe('с гантелями стоя');
    expect(res?.sets[0].weight).toBe(35); // 16 * 2.2 rounded to 2.5 is 35kg

    // Verify e1RM conversion
    const mockSettings: Settings = {
      formula: 'epley',
      rpeMode: 'mid',
      units: 'kg',
    };
    const e1rmRes = getCurrentLiftE1RMForVariation(
      mockSessions,
      'slot-biceps',
      'со штангой',
      mockProgram,
      mockSettings
    );
    expect(e1rmRes.value).toBeGreaterThan(30);
    expect(e1rmRes.adaptedFrom).toBe('с гантелями стоя');
  });
});
