import { allSettledPromises } from '../allSettledPromises';

describe('allSettledPromises', () => {
  it('should split fulfilled and rejected results', async () => {
    const error = new Error('boom');
    const [successes, fails, all] = await allSettledPromises<number, Error>([
      Promise.resolve(1),
      Promise.reject(error),
      Promise.resolve(3),
    ]);

    expect(successes.map((r) => r.value)).toEqual([1, 3]);
    expect(fails.map((r) => r.reason)).toEqual([error]);
    expect(all.map((r) => r.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
  });

  it('should return empty arrays for no promises', async () => {
    expect(await allSettledPromises([])).toEqual([[], [], []]);
  });

  it('should keep input order in the combined results', async () => {
    const slow = new Promise<string>((resolve) => {
      setTimeout(() => resolve('slow'), 10);
    });
    const [successes] = await allSettledPromises([slow, Promise.resolve('fast')]);
    expect(successes.map((r) => r.value)).toEqual(['slow', 'fast']);
  });
});
