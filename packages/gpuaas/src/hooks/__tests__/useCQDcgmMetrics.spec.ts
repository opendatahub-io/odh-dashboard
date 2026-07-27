import { parseByModel } from '../useCQDcgmMetrics';

type MockResponse = Parameters<typeof parseByModel>[0];

const makeResponse = (results: Array<{ modelName?: string; value: string }>): MockResponse =>
  ({
    data: {
      result: results.map(({ modelName, value }) => ({
        metric: modelName ? { modelName } : {},
        value: [0, value],
      })),
    },
  } as MockResponse);

describe('parseByModel', () => {
  it('returns empty map for null response', () => {
    expect(parseByModel(null).size).toBe(0);
  });

  it('returns empty map when result array is empty', () => {
    expect(parseByModel(makeResponse([])).size).toBe(0);
  });

  it('ignores entries missing modelName label', () => {
    const response = makeResponse([{ value: '50' }]);
    expect(parseByModel(response).size).toBe(0);
  });

  it.each([
    ['42.7', 43],
    ['18.0', 18],
    ['99.5', 100],
    ['0.4', 0],
  ])('rounds value "%s" → %d', (raw, rounded) => {
    const map = parseByModel(makeResponse([{ modelName: 'Tesla T4', value: raw }]));
    expect(map.get('tesla t4')).toBe(rounded);
  });

  it('ignores NaN values', () => {
    const map = parseByModel(makeResponse([{ modelName: 'bad-model', value: 'not-a-number' }]));
    expect(map.size).toBe(0);
  });

  it('normalises modelName keys — DCGM space format → lowercase with spaces', () => {
    const map = parseByModel(makeResponse([{ modelName: 'NVIDIA A100-SXM4-80GB', value: '42' }]));
    expect(map.has('nvidia a100 sxm4 80gb')).toBe(true);
    expect(map.get('nvidia a100 sxm4 80gb')).toBe(42);
  });

  it('parses multiple models into the same map', () => {
    const map = parseByModel(
      makeResponse([
        { modelName: 'Tesla T4', value: '30' },
        { modelName: 'NVIDIA A100', value: '75' },
      ]),
    );
    expect(map.get('tesla t4')).toBe(30);
    expect(map.get('nvidia a100')).toBe(75);
  });
});

describe('byModel asymmetric coverage', () => {
  const computeMap = parseByModel(makeResponse([{ modelName: 'NVIDIA A100', value: '72' }]));
  const memoryMap = parseByModel(makeResponse([])); // memory has no A100 entry

  it.each([
    // settled=true: absent model → undefined ("No telemetry data"), not null (spinner)
    [true, 72, undefined],
    // settled=false: still loading → null (spinner) for both
    [false, null, null],
  ])('settled=%s → compute=%s, memory=%s', (settled, expectedCompute, expectedMemory) => {
    const entry = {
      computePercentage: settled ? computeMap.get('nvidia a100') : null,
      memoryPercentage: settled ? memoryMap.get('nvidia a100') : null,
    };
    expect(entry.computePercentage).toBe(expectedCompute);
    expect(entry.memoryPercentage).toBe(expectedMemory);
  });
});
