import { ClusterQueueKind } from '@odh-dashboard/k8s-core';
import { CQDcgmResult, UnifiedCohort } from '../../types';
import {
  AcceleratorDonutType,
  AcceleratorSegment,
  isAcceleratorResource,
  getCQNominalAccelerators,
  getCQUsedAccelerators,
  getAcceleratorBorrowedCount,
  getAcceleratorLentCount,
  isAcceleratorBorrowing,
  isAcceleratorLending,
  isInCohort,
  filterAcceleratorCQs,
  getCohortTotalAccelerators,
  getCohortUnallocatedBorrowable,
  isCohortBorrowLendActive,
  getAcceleratorDonutConfig,
  getBorrowLendBadgeState,
  getBorrowLendInfo,
  getCounterpartCQNames,
  formatWorkloadCounts,
  normalizeModelName,
  resolveCQDcgmUtilization,
} from '../clusterQueueUtils';

const makeGpuCQ = (
  name: string,
  {
    nominal = 8,
    used = 0,
    borrowed = 0,
  }: { nominal?: number; used?: number; borrowed?: number } = {},
): ClusterQueueKind =>
  ({
    apiVersion: 'kueue.x-k8s.io/v1beta2',
    kind: 'ClusterQueue',
    metadata: { name },
    spec: {
      resourceGroups: [
        {
          coveredResources: ['nvidia.com/gpu'],
          flavors: [
            {
              name: 'gpu-flavor',
              resources: [{ name: 'nvidia.com/gpu', nominalQuota: String(nominal) }],
            },
          ],
        },
      ],
    },
    status: {
      admittedWorkloads: 0,
      pendingWorkloads: 0,
      reservingWorkloads: 0,
      conditions: [],
      flavorsReservation: [],
      flavorsUsage: [
        {
          name: 'gpu-flavor',
          resources: [
            {
              name: 'nvidia.com/gpu',
              total: String(used),
              borrowed: String(borrowed),
            },
          ],
        },
      ],
    },
  } as unknown as ClusterQueueKind);

const makeCpuOnlyCQ = (name: string): ClusterQueueKind =>
  ({
    apiVersion: 'kueue.x-k8s.io/v1beta2',
    kind: 'ClusterQueue',
    metadata: { name },
    spec: {
      resourceGroups: [
        {
          coveredResources: ['cpu'],
          flavors: [{ name: 'cpu-flavor', resources: [{ name: 'cpu', nominalQuota: '100' }] }],
        },
      ],
    },
    status: { admittedWorkloads: 0, pendingWorkloads: 0, flavorsUsage: [] },
  } as unknown as ClusterQueueKind);

const makeCohort = (
  cqs: ClusterQueueKind[],
  state: UnifiedCohort['state'] = 'implicit',
): UnifiedCohort => ({
  name: 'test-cohort',
  state,
  memberClusterQueues: cqs,
  effectivePool: [],
});

const makeGpuCQWithCohort = (
  name: string,
  cohortName: string,
  opts: Parameters<typeof makeGpuCQ>[1] = {},
): ClusterQueueKind => {
  const cq = makeGpuCQ(name, opts);
  return { ...cq, spec: { ...cq.spec, cohortName } } as unknown as ClusterQueueKind;
};

const makeMap = (entries: Record<string, CQDcgmResult>): Map<string, CQDcgmResult> =>
  new Map(Object.entries(entries));

// GPU model name constants used across resolveCQDcgmUtilization tests.
// NFD label format uses dashes; DCGM metric labels use spaces (post-normalization).
const TESLA_T4_NFD = 'Tesla-T4';
const TESLA_T4_DCGM = 'tesla t4';

const NO_UTILIZATION_DATA = { computeUtilization: undefined, memoryUtilization: undefined };

describe('isAcceleratorResource', () => {
  it.each([
    ['nvidia.com/gpu', true],
    ['nvidia.com/mig.1g.5gb', true],
    ['amd.com/gpu', true],
    ['habana.ai/gaudi', true],
    ['cpu', false],
    ['memory', false],
    ['requests.cpu', false],
  ])('"%s" → %s', (name, expected) => {
    expect(isAcceleratorResource(name)).toBe(expected);
  });
});

describe('getCQNominalAccelerators', () => {
  it('returns 0 for CQ with no GPU resources', () => {
    expect(getCQNominalAccelerators(makeCpuOnlyCQ('cq'))).toBe(0);
  });

  it('sums GPU quota from all flavors', () => {
    expect(getCQNominalAccelerators(makeGpuCQ('cq', { nominal: 8 }))).toBe(8);
  });
});

describe('getCQUsedAccelerators', () => {
  it('returns 0 when no flavorsUsage present', () => {
    const cq = makeGpuCQ('cq');
    cq.status = { ...cq.status, flavorsUsage: [] } as ClusterQueueKind['status'];
    expect(getCQUsedAccelerators(cq)).toBe(0);
  });

  it('returns GPU units in use', () => {
    expect(getCQUsedAccelerators(makeGpuCQ('cq', { used: 5 }))).toBe(5);
  });

  it('ignores CPU resources', () => {
    const cq = makeCpuOnlyCQ('cq');
    expect(getCQUsedAccelerators(cq)).toBe(0);
  });
});

describe('getAcceleratorBorrowedCount', () => {
  it.each([
    [4, 0, 0],
    [10, 2, 2],
  ])('used=%d borrowed=%d → %d', (used, borrowed, expected) => {
    expect(getAcceleratorBorrowedCount(makeGpuCQ('cq', { nominal: 8, used, borrowed }))).toBe(
      expected,
    );
  });
});

describe('getAcceleratorLentCount', () => {
  it.each([
    [8, 0, 0, 'fully used'],
    [3, 0, 5, 'unused capacity'],
    [10, 2, 0, 'over quota floored at 0'],
  ])('used=%d borrowed=%d → %d (%s)', (used, borrowed, expected) => {
    expect(getAcceleratorLentCount(makeGpuCQ('cq', { nominal: 8, used, borrowed }))).toBe(expected);
  });
});

describe('isInCohort', () => {
  it.each([
    ['CQ with cohortName set', makeGpuCQWithCohort('cq', 'my-cohort'), true],
    ['CQ without cohortName', makeGpuCQ('cq'), false],
  ] as const)('%s → %s', (_label, cq, expected) => {
    expect(isInCohort(cq)).toBe(expected);
  });
});

describe('isAcceleratorBorrowing / isAcceleratorLending', () => {
  it('detects borrowing', () => {
    expect(isAcceleratorBorrowing(makeGpuCQ('cq', { nominal: 8, used: 10, borrowed: 2 }))).toBe(
      true,
    );
    expect(isAcceleratorBorrowing(makeGpuCQ('cq', { nominal: 8, used: 4 }))).toBe(false);
  });

  it('detects lending (unused capacity)', () => {
    expect(
      isAcceleratorLending(makeGpuCQWithCohort('cq', 'cohort-a', { nominal: 8, used: 3 })),
    ).toBe(true);
    expect(
      isAcceleratorLending(makeGpuCQWithCohort('cq', 'cohort-a', { nominal: 8, used: 8 })),
    ).toBe(false);
    expect(isAcceleratorLending(makeGpuCQ('cq', { nominal: 8, used: 3 }))).toBe(false); // standalone CQs cannot lend
  });
});

describe('filterAcceleratorCQs', () => {
  it('excludes CPU-only CQs and retains GPU CQs', () => {
    const cqs = [makeGpuCQ('gpu-cq'), makeCpuOnlyCQ('cpu-cq'), makeGpuCQ('gpu-cq-2')];
    expect(filterAcceleratorCQs(cqs).map((c) => c.metadata?.name)).toEqual(['gpu-cq', 'gpu-cq-2']);
  });

  it('returns empty array when all CQs are CPU-only', () => {
    expect(filterAcceleratorCQs([makeCpuOnlyCQ('cq')])).toHaveLength(0);
  });

  it('includes a pure-borrower CQ with nominal=0 but active GPU usage', () => {
    const pureBorrower = makeGpuCQ('burst-cq', { nominal: 0, used: 3 });
    expect(filterAcceleratorCQs([pureBorrower]).map((c) => c.metadata?.name)).toEqual(['burst-cq']);
  });
});

describe('getCohortTotalAccelerators', () => {
  it.each([
    ['empty cohort', [], 0],
    ['all normal CQs', [{ nominal: 8 }, { nominal: 16 }], 24],
    // Mixed: cq-burst borrows from cq-train's pool — physical total is still 8, not 10
    [
      'mixed — pure borrower not double-counted',
      [
        { nominal: 8, used: 6 },
        { nominal: 0, used: 2 },
      ],
      8,
    ],
    // Pure-borrower-only: no owned quota, fall back to active usage so header is not 0
    ['pure-borrower-only — falls back to used', [{ nominal: 0, used: 6 }], 6],
  ] as const)('%s', (_label, cqOpts, expected) => {
    const cohort = makeCohort(cqOpts.map((opts, i) => makeGpuCQ(`cq-${i}`, opts)));
    expect(getCohortTotalAccelerators(cohort)).toBe(expected);
  });
});

describe('getCohortUnallocatedBorrowable', () => {
  it('sums unused capacity across member CQs', () => {
    const cohort = makeCohort([
      makeGpuCQ('a', { nominal: 8, used: 5 }), // lent: 3
      makeGpuCQ('b', { nominal: 8, used: 8 }), // lent: 0
    ]);
    expect(getCohortUnallocatedBorrowable(cohort)).toBe(3);
  });

  it('returns 0 for a standalone group even if CQs have spare capacity', () => {
    const cohort = makeCohort([makeGpuCQ('a', { nominal: 8, used: 3 })], 'standalone');
    expect(getCohortUnallocatedBorrowable(cohort)).toBe(0);
  });
});

describe('isCohortBorrowLendActive', () => {
  it.each([
    ['borrowing CQ', makeCohort([makeGpuCQ('a', { nominal: 8, used: 10, borrowed: 2 })]), true],
    [
      'lending CQ (unused capacity)',
      makeCohort([makeGpuCQWithCohort('a', 'test-cohort', { nominal: 8, used: 3 })]),
      true,
    ],
    ['fully used, no borrowing', makeCohort([makeGpuCQ('a', { nominal: 8, used: 8 })]), false],
    ['empty cohort', makeCohort([]), false],
  ] as const)('%s → %s', (_label, cohort, expected) => {
    expect(isCohortBorrowLendActive(cohort)).toBe(expected);
  });

  it('returns false for a standalone group even if CQs have spare capacity or borrow', () => {
    const cohort = makeCohort(
      [
        makeGpuCQ('a', { nominal: 8, used: 3 }),
        makeGpuCQ('b', { nominal: 8, used: 10, borrowed: 2 }),
      ],
      'standalone',
    );
    expect(isCohortBorrowLendActive(cohort)).toBe(false);
  });
});

describe('getCounterpartCQNames', () => {
  it('lender sees names of borrowing siblings', () => {
    const lender = makeGpuCQ('lender', { nominal: 8, used: 3 });
    const borrower = makeGpuCQ('borrower', { nominal: 8, used: 10, borrowed: 2 });
    const other = makeGpuCQ('other', { nominal: 8, used: 8 });
    expect(getCounterpartCQNames(lender, [lender, borrower, other])).toEqual(['borrower']);
  });

  it('borrower sees names of lending siblings', () => {
    const borrower = makeGpuCQ('borrower', { nominal: 8, used: 10, borrowed: 2 });
    const lender = makeGpuCQWithCohort('lender', 'test-cohort', { nominal: 8, used: 3 });
    const other = makeGpuCQ('other', { nominal: 8, used: 8 });
    expect(getCounterpartCQNames(borrower, [borrower, lender, other])).toEqual(['lender']);
  });

  it.each([
    [
      'siblings present but no borrow-lend activity',
      [makeGpuCQ('sibling', { nominal: 8, used: 8 })],
    ],
    ['no siblings at all', []],
  ] as const)('returns empty array — %s', (_label, siblings) => {
    const cq = makeGpuCQ('cq', { nominal: 8, used: 8 });
    expect(getCounterpartCQNames(cq, [cq, ...siblings])).toEqual([]);
  });
});

describe('normalizeModelName', () => {
  it.each([
    ['NVIDIA-A100-SXM4-80GB', 'nvidia a100 sxm4 80gb'],
    ['NVIDIA A100-SXM4-80GB', 'nvidia a100 sxm4 80gb'],
    ['Tesla-T4', 'tesla t4'],
    ['Tesla T4', 'tesla t4'],
    ['  NVIDIA  A100  ', 'nvidia a100'],
    ['lowercase-model', 'lowercase model'],
    ['AMD_MI300X', 'amd mi300x'],
    ['AMD_Instinct_MI300X', 'amd instinct mi300x'],
  ])('"%s" → "%s"', (input, expected) => {
    expect(normalizeModelName(input)).toBe(expected);
  });
});

describe('formatWorkloadCounts', () => {
  it.each([
    [0, 0, 'Workloads: 0 active, 0 pending'],
    [1, 0, 'Workloads: 1 active, 0 pending'],
    [2, 5, 'Workloads: 2 active, 5 pending'],
    [0, 1, 'Workloads: 0 active, 1 pending'],
    [0, 10, 'Workloads: 0 active, 10 pending'],
  ])('(%d admitted, %d pending) → "%s"', (admitted, pending, expected) => {
    expect(formatWorkloadCounts(admitted, pending)).toBe(expected);
  });
});

describe('getAcceleratorDonutConfig', () => {
  it('returns type=none when CQ has no GPU quota and no usage', () => {
    expect(getAcceleratorDonutConfig(makeCpuOnlyCQ('cq'))).toEqual({
      type: AcceleratorDonutType.None,
    });
  });

  describe('pure borrower — nominal=0, used>0', () => {
    it.each([
      [3, '3'],
      [6, '6'],
    ])('used=%d → title="%s" single Borrowed segment', (used, title) => {
      const config = getAcceleratorDonutConfig(makeGpuCQ('burst-cq', { nominal: 0, used }));
      expect(config.type).toBe(AcceleratorDonutType.BorrowLend);
      if (config.type === AcceleratorDonutType.BorrowLend) {
        expect(config.isBorrowing).toBe(true);
        expect(config.title).toBe(title);
        expect(config.stateLabel).toBe(AcceleratorSegment.Borrowed);
        expect(config.segments).toEqual([{ x: AcceleratorSegment.Borrowed, y: used }]);
      }
    });
  });

  describe('normal state — fully utilised, no borrowing', () => {
    it.each([
      [8, 8, '8/8'],
      [16, 16, '16/16'],
    ])('nominal=%d used=%d → title="%s" percentage=100', (nominal, used, title) => {
      const config = getAcceleratorDonutConfig(makeGpuCQ('cq', { nominal, used }));
      expect(config.type).toBe(AcceleratorDonutType.Normal);
      if (config.type === AcceleratorDonutType.Normal) {
        expect(config.percentage).toBe(100);
        expect(config.title).toBe(title);
        expect(config.used).toBe(used);
        expect(config.nominal).toBe(nominal);
      }
    });
  });

  describe('lending state — used < nominal', () => {
    it.each([
      // [nominal, used, expectedOwnUsed, expectedLent]
      [8, 3, 3, 5],
      [8, 0, 0, 8],
    ])('nominal=%d used=%d → segments Own=%d Lent=%d', (nominal, used, ownUsed, lent) => {
      const config = getAcceleratorDonutConfig(
        makeGpuCQWithCohort('cq', 'test-cohort', { nominal, used }),
      );
      expect(config.type).toBe(AcceleratorDonutType.BorrowLend);
      if (config.type === AcceleratorDonutType.BorrowLend) {
        expect(config.isBorrowing).toBe(false);
        expect(config.stateLabel).toBe(AcceleratorSegment.Lent);
        expect(config.segments).toEqual([
          { x: AcceleratorSegment.Own, y: ownUsed },
          { x: AcceleratorSegment.Lent, y: lent },
        ]);
      }
    });
  });

  describe('standalone CQ (inCohort=false) — borrow-lend suppressed to normal', () => {
    it.each([
      // [description, cqOpts, expectedPercentage]
      // Math.round(3/8 * 100) = 38
      ['lending CQ', { nominal: 8, used: 3 }, 38],
      // used=8 equals nominal=8; borrowed=2 suppressed → 100%
      ['borrowing CQ', { nominal: 8, used: 8, borrowed: 2 }, 100],
    ] as const)('%s → type=normal percentage=%d', (_label, cqOpts, expectedPercentage) => {
      const config = getAcceleratorDonutConfig(makeGpuCQ('cq', cqOpts), false);
      expect(config.type).toBe(AcceleratorDonutType.Normal);
      if (config.type === AcceleratorDonutType.Normal) {
        expect(config.percentage).toBe(expectedPercentage);
      }
    });
  });

  describe('borrowing state — borrowed > 0', () => {
    it.each([
      // [nominal, used, borrowed, expectedOwnUsed, expectedAvailable]
      [8, 10, 2, 8, 0],
      [8, 6, 2, 4, 4],
    ])(
      'nominal=%d used=%d borrowed=%d → segments Own=%d Available=%d',
      (nominal, used, borrowed, ownUsed, available) => {
        const config = getAcceleratorDonutConfig(makeGpuCQ('cq', { nominal, used, borrowed }));
        expect(config.type).toBe(AcceleratorDonutType.BorrowLend);
        if (config.type === AcceleratorDonutType.BorrowLend) {
          expect(config.isBorrowing).toBe(true);
          expect(config.stateLabel).toBe(AcceleratorSegment.Borrowed);
          expect(config.segments).toEqual([
            { x: AcceleratorSegment.Own, y: ownUsed },
            { x: AcceleratorSegment.Borrowed, y: borrowed },
            { x: AcceleratorSegment.Available, y: available },
          ]);
        }
      },
    );
  });
});

describe('getBorrowLendBadgeState', () => {
  it.each([
    [
      'fully utilised (type=normal)',
      { nominal: 8, used: 8 },
      true,
      { borrowing: false, lending: false, lentCount: 0, borrowedCount: 0 },
    ],
    [
      'lending CQ',
      { nominal: 8, used: 3 },
      true,
      { borrowing: false, lending: true, lentCount: 5, borrowedCount: 0 },
    ],
    [
      'borrowing CQ',
      { nominal: 8, used: 10, borrowed: 2 },
      true,
      { borrowing: true, lending: false, lentCount: 0, borrowedCount: 2 },
    ],
    [
      'lending suppressed by inCohort=false',
      { nominal: 8, used: 3 },
      false,
      { borrowing: false, lending: false, lentCount: 0, borrowedCount: 0 },
    ],
  ] as const)('%s', (_label, cqOpts, inCohort, expected) => {
    const cq = inCohort
      ? makeGpuCQWithCohort('cq', 'test-cohort', cqOpts)
      : makeGpuCQ('cq', cqOpts);
    const config = getAcceleratorDonutConfig(cq, inCohort);
    expect(getBorrowLendBadgeState(config)).toEqual(expected);
  });
});

describe('getBorrowLendInfo', () => {
  it('returns undefined for a Normal donut', () => {
    const config = getAcceleratorDonutConfig(makeGpuCQ('cq', { nominal: 8, used: 4 }));
    expect(getBorrowLendInfo(config)).toBeUndefined();
  });

  it.each([
    // Pure borrower: nominal=0 set to used as rendering trick — Own segment absent → ownRatio must be 0
    ['pure borrower', makeGpuCQ('burst-cq', { nominal: 0, used: 6 }), true, 0],
    // Regular borrower: nominal=8, used=10, borrowed=2 → ownUsed=8, ownRatio=8/10=0.8
    [
      'regular borrower',
      makeGpuCQWithCohort('cq', 'cohort', { nominal: 8, used: 10, borrowed: 2 }),
      true,
      0.8,
    ],
    // Lender: nominal=8, used=4 → ownRatio=4/8=0.5
    ['lender', makeGpuCQWithCohort('cq', 'cohort', { nominal: 8, used: 4 }), false, 0.5],
  ] as const)(
    '%s — isBorrowing=%s, ownRatio≈%s',
    (_label, cq, expectedIsBorrowing, expectedRatio) => {
      const config = getAcceleratorDonutConfig(cq, true);
      const info = getBorrowLendInfo(config);
      expect(info?.isBorrowing).toBe(expectedIsBorrowing);
      expect(info?.ownRatio).toBeCloseTo(expectedRatio);
    },
  );
});

describe('resolveCQDcgmUtilization', () => {
  it('returns both undefined when models array is empty', () => {
    const map = makeMap({ [TESLA_T4_DCGM]: { computePercentage: 10, memoryPercentage: 20 } });
    expect(resolveCQDcgmUtilization([], map)).toEqual(NO_UTILIZATION_DATA);
  });

  it.each([
    [[TESLA_T4_NFD], {}],
    [['NVIDIA-A100', 'unknown-gpu'], {}],
  ] as const)('returns both undefined for unmatched models', (models, mapEntries) => {
    expect(resolveCQDcgmUtilization([...models], makeMap(mapEntries))).toEqual(NO_UTILIZATION_DATA);
  });

  it('resolves a single model — NFD dash format normalised to DCGM space format', () => {
    const map = makeMap({ [TESLA_T4_DCGM]: { computePercentage: 30, memoryPercentage: 60 } });
    expect(resolveCQDcgmUtilization([TESLA_T4_NFD], map)).toEqual({
      computeUtilization: 30,
      memoryUtilization: 60,
    });
  });

  it('averages compute and memory across multiple models', () => {
    const map = makeMap({
      'model a': { computePercentage: 20, memoryPercentage: 40 },
      'model b': { computePercentage: 40, memoryPercentage: 60 },
    });
    expect(resolveCQDcgmUtilization(['model-a', 'model-b'], map)).toEqual({
      computeUtilization: 30,
      memoryUtilization: 50,
    });
  });

  it('rounds averages (Math.round)', () => {
    const map = makeMap({
      'model a': { computePercentage: 1, memoryPercentage: 1 },
      'model b': { computePercentage: 2, memoryPercentage: 2 },
    });
    // avg = 1.5 → Math.round(1.5) = 2
    expect(resolveCQDcgmUtilization(['model-a', 'model-b'], map)).toEqual({
      computeUtilization: 2,
      memoryUtilization: 2,
    });
  });

  it.each([null, undefined] as const)(
    'skips %s percentage when averaging — absent dimension returns undefined (no-telemetry ring)',
    (noData) => {
      const computeAbsent = makeMap({
        [TESLA_T4_DCGM]: { computePercentage: noData, memoryPercentage: 20 },
      });
      expect(resolveCQDcgmUtilization([TESLA_T4_NFD], computeAbsent)).toEqual({
        computeUtilization: undefined,
        memoryUtilization: 20,
      });

      const memoryAbsent = makeMap({
        [TESLA_T4_DCGM]: { computePercentage: 50, memoryPercentage: noData },
      });
      expect(resolveCQDcgmUtilization([TESLA_T4_NFD], memoryAbsent)).toEqual({
        computeUtilization: 50,
        memoryUtilization: undefined,
      });

      const bothAbsent = makeMap({
        [TESLA_T4_DCGM]: { computePercentage: noData, memoryPercentage: noData },
      });
      expect(resolveCQDcgmUtilization([TESLA_T4_NFD], bothAbsent)).toEqual({
        computeUtilization: undefined,
        memoryUtilization: undefined,
      });
    },
  );

  it('averages only non-null values when models are partially loaded', () => {
    const map = makeMap({
      [TESLA_T4_DCGM]: { computePercentage: 40, memoryPercentage: null },
      'nvidia a100': { computePercentage: null, memoryPercentage: 60 },
    });
    expect(resolveCQDcgmUtilization([TESLA_T4_NFD, 'NVIDIA-A100'], map)).toEqual({
      computeUtilization: 40,
      memoryUtilization: 60,
    });
  });
});
