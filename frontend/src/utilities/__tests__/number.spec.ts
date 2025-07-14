import { roundNumber, bytesAsRoundedGiB, bytesAsPreciseGiB } from '#~/utilities/number';

describe('roundNumber', () => {
  it('should return 0 for NaN input', () => {
    const resultNaN = roundNumber(NaN);
    expect(resultNaN).toBe(0);
  });

  it('should round to 1 decimal place when greater than or equal to 0.1', () => {
    expect(roundNumber(1)).toBe(1);
    expect(roundNumber(0.16)).toBe(0.2);
  });

  it('should round to 2 decimal places when less than 0.1', () => {
    expect(roundNumber(0.09765625)).toBe(0.1);
    expect(roundNumber(0.048828125)).toBe(0.05);
  });

  it('should round to custom precision if specified', () => {
    expect(roundNumber(1, 3)).toBe(1);
    expect(roundNumber(0.16, 3)).toBe(0.16);
    expect(roundNumber(0.09765625, 3)).toBe(0.098);
    expect(roundNumber(0.048828125, 3)).toBe(0.049);
  });
});

describe('bytesAsPreciseGiB', () => {
  it('should return 0 for NaN input', () => {
    expect(bytesAsPreciseGiB(NaN)).toBe(0);
  });

  it('should convert bytes to GiB with no loss of precision', () => {
    expect(bytesAsPreciseGiB(1024 * 1024 * 1024)).toBe(1);
    expect(bytesAsPreciseGiB(100 * 1024 * 1024)).toBe(0.09765625);
    expect(bytesAsPreciseGiB(50 * 1024 * 1024)).toBe(0.048828125);
  });
});

describe('bytesAsRoundedGiB', () => {
  it('should return 0 for NaN input', () => {
    const resultNaN = bytesAsRoundedGiB(NaN);
    expect(resultNaN).toBe(0);
  });

  it('should convert bytes to gigabytes and round to 1 decimal place when greater than or equal to 0.1 GB', () => {
    const result1GB = bytesAsRoundedGiB(1024 * 1024 * 1024);
    expect(result1GB).toBe(1);
  });

  it('should round to 2 decimal places when less than 0.1 GB', () => {
    const result01GB = bytesAsRoundedGiB(100 * 1024 * 1024);
    expect(result01GB).toBe(0.1);

    const result005GB = bytesAsRoundedGiB(50 * 1024 * 1024);
    expect(result005GB).toBe(0.05);
  });
});
