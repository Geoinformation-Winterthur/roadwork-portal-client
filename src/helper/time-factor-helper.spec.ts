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

  // Primary need for first test suite:
  const primaryNeed1 = createNeed('2027-06-30', '2028-06-30', '2032-06-30');

  it('should return time factor 3 in Excel-Test 1 (Bedarf AEW)', () => {
    const compareNeed = createNeed('2027-06-30', '2028-06-30', '2032-06-30');
    expect(TimeFactorHelper.calcTimeFactor(compareNeed, primaryNeed1)).toBe(3);
  });

  it('should return time factor 2 in Excel-Test 2 (Bedarf EC)', () => {
    const compareNeed = createNeed('2029-02-01', '2029-02-01', '2031-10-31');
    expect(TimeFactorHelper.calcTimeFactor(compareNeed, primaryNeed1)).toBe(2);
  });

  it('should return time factor 3 in Excel-Test 3 (Bedarf KuBa)', () => {
    const compareNeed = createNeed('2027-07-31', '2028-03-31', '2031-03-31');
    expect(TimeFactorHelper.calcTimeFactor(compareNeed, primaryNeed1)).toBe(3);
  });

  // Primary need for second test suite:
  const primaryNeed2 = createNeed('2026-10-01', '2027-10-01', '2029-10-01');

  it('should return time factor 3 in Excel-Test 4 (Bedarf AEW)', () => {
    const compareNeed = createNeed('2026-10-01', '2027-10-01', '2029-10-01');
    expect(TimeFactorHelper.calcTimeFactor(compareNeed, primaryNeed2)).toBe(3);
  });

  it('should return time factor 2 in Excel-Test 5 (Bedarf EC)', () => {
    const compareNeed = createNeed('2029-02-01', '2029-02-01', '2031-10-31');
    expect(TimeFactorHelper.calcTimeFactor(compareNeed, primaryNeed2)).toBe(2);
  });

  it('should return time factor 2 in Excel-Test 6 (Bedarf KuBa)', () => {
    const compareNeed = createNeed('2027-03-31', '2028-03-31', '2031-03-31');
    expect(TimeFactorHelper.calcTimeFactor(compareNeed, primaryNeed2)).toBe(2);
  });

  it('should return time factor 3 in Excel-Test 7 (Bedarf APK)', () => {
    const compareNeed = createNeed('2026-07-01', '2027-04-01', '2028-10-01');
    expect(TimeFactorHelper.calcTimeFactor(compareNeed, primaryNeed2)).toBe(3);
  });

  // Primary need for third test suite:
  const primaryNeed3 = createNeed('2026-10-01', '2027-10-01', '2029-10-01');

  it('should return time factor 3 in Excel-Test 8 (Bedarf AEW)', () => {
    const compareNeed = createNeed('2026-10-01', '2027-10-01', '2029-10-01');
    expect(TimeFactorHelper.calcTimeFactor(compareNeed, primaryNeed3)).toBe(3);
  });

  it('should return time factor 2 in Excel-Test 9 (Bedarf EC)', () => {
    const compareNeed = createNeed('2029-02-01', '2029-02-01', '2031-10-31');
    expect(TimeFactorHelper.calcTimeFactor(compareNeed, primaryNeed3)).toBe(2);
  });

  it('should return time factor 2 in Excel-Test 10 (Bedarf KuBa)', () => {
    const compareNeed = createNeed('2027-03-31', '2028-03-31', '2031-03-31');
    expect(TimeFactorHelper.calcTimeFactor(compareNeed, primaryNeed3)).toBe(2);
  });

  it('should return time factor 3 in Excel-Test 11 (Bedarf APK)', () => {
    const compareNeed = createNeed('2026-07-01', '2027-04-01', '2028-10-01');
    expect(TimeFactorHelper.calcTimeFactor(compareNeed, primaryNeed3)).toBe(3);
  });

});
