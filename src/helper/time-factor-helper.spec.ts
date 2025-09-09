import { TimeFactorHelper } from './time-factor-helper';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';

function createNeed(
  early: string | Date,
  optimum: string | Date,
  late: string | Date
): RoadWorkNeedFeature {
  return {
    properties: {
      finishEarlyTo: early,
      finishOptimumTo: optimum,
      finishLateTo: late
    }
  } as RoadWorkNeedFeature;
}

describe('TimeFactorHelper.calcTimeFactor', () => {
  it('should return 0 if compareNeed or primaryNeed is null or undefined', () => {
    expect(TimeFactorHelper.calcTimeFactor(null as any, null as any)).toBe(0);
    expect(TimeFactorHelper.calcTimeFactor(createNeed('2025-01-01', '2025-01-02', '2025-01-03'), null as any)).toBe(0);
    expect(TimeFactorHelper.calcTimeFactor(null as any, createNeed('2025-01-01', '2025-01-02', '2025-01-03'))).toBe(0);
  });

  it('should return 1 when compareNeed.finishEarlyTo > primaryNeed.finishLateTo', () => {
    const primary = createNeed('2025-01-01', '2025-01-02', '2025-01-03');
    const compare = createNeed('2025-01-04', '2025-01-05', '2025-01-06');
    expect(TimeFactorHelper.calcTimeFactor(compare, primary)).toBe(1);
  });

  it('should return 2 when compareNeed.finishEarlyTo > primaryNeed.finishOptimumTo', () => {
    const primary = createNeed('2025-01-01', '2025-01-02', '2025-01-03');
    const compare = createNeed('2025-01-03', '2025-01-01', '2025-01-02');
    expect(TimeFactorHelper.calcTimeFactor(compare, primary)).toBe(2);
  });

  it('should return 2 when compareNeed.finishOptimumTo > primaryNeed.finishOptimumTo', () => {
    const primary = createNeed('2025-01-01', '2025-01-02', '2025-01-03');
    const compare = createNeed('2025-01-01', '2025-01-04', '2025-01-03');
    expect(TimeFactorHelper.calcTimeFactor(compare, primary)).toBe(2);
  });

  it('should return 3 when compareNeed.finishOptimumTo > primaryNeed.finishEarlyTo', () => {
    const primary = createNeed('2025-01-03', '2025-01-04', '2025-01-05');
    const compare = createNeed('2025-01-01', '2025-01-04', '2025-01-03');
    expect(TimeFactorHelper.calcTimeFactor(compare, primary)).toBe(3);
  });

  it('should return 3 when compareNeed.finishLateTo > primaryNeed.finishEarlyTo', () => {
    const primary = createNeed('2025-01-03', '2025-01-04', '2025-01-05');
    const compare = createNeed('2025-01-01', '2025-01-02', '2025-01-04');
    expect(TimeFactorHelper.calcTimeFactor(compare, primary)).toBe(3);
  });

  it('should return 4 when none of the conditions are met', () => {
    const primary = createNeed('2025-01-05', '2025-01-06', '2025-01-07');
    const compare = createNeed('2025-01-01', '2025-01-02', '2025-01-03');
    expect(TimeFactorHelper.calcTimeFactor(compare, primary)).toBe(4);
  });
});
