import { ClusterQueueKind } from '@odh-dashboard/k8s-core';
import parseK8sQuantity from './parseK8sQuantity';
import { ModelGpuCount } from './hardwareModels';
import { ACCELERATOR_RESOURCE_REGEX } from '../const';
import { CQDcgmResult, UnifiedCohort } from '../types';

export enum AcceleratorSegment {
  Own = 'Own',
  Lent = 'Lent',
  Borrowed = 'Borrowed',
  Available = 'Available',
  NoData = 'No data',
}

export enum AcceleratorDonutType {
  None = 'none',
  Normal = 'normal',
  BorrowLend = 'borrow-lend',
}

export type AcceleratorDonutConfig =
  | { type: AcceleratorDonutType.None }
  | {
      type: AcceleratorDonutType.Normal;
      used: number;
      nominal: number;
      title: string;
      percentage: number;
    }
  | {
      type: AcceleratorDonutType.BorrowLend;
      used: number;
      nominal: number;
      title: string;
      isBorrowing: boolean;
      stateLabel: AcceleratorSegment.Borrowed | AcceleratorSegment.Lent;
      segments: Array<{ x: string; y: number }>;
    };

/**
 * Fraction of total in-use GPUs attributed to "own" allocation.
 * Used by DcgmDonut to split the utilisation ring proportionally.
 */
export type BorrowLendInfo = {
  isBorrowing: boolean;
  ownRatio: number;
};

export type CQDcgmUtilization = {
  /** null = DCGM knows the model but data hasn't loaded yet (transient spinner) */
  computeUtilization: number | null | undefined;
  /** null = DCGM knows the model but data hasn't loaded yet (transient spinner) */
  memoryUtilization: number | null | undefined;
};

const ACCELERATOR_RE = new RegExp(ACCELERATOR_RESOURCE_REGEX);

export const isAcceleratorResource = (resourceName: string): boolean =>
  ACCELERATOR_RE.test(resourceName);

/** Returns the total nominal GPU quota declared in spec.resourceGroups. */
export const getCQNominalAccelerators = (cq: ClusterQueueKind): number =>
  (cq.spec.resourceGroups ?? []).reduce(
    (total, rg) =>
      total +
      rg.flavors.reduce(
        (sum, f) =>
          sum +
          f.resources
            .filter((r) => isAcceleratorResource(r.name))
            .reduce((s, r) => s + parseK8sQuantity(r.nominalQuota), 0),
        0,
      ),
    0,
  );

/** Returns total GPU units currently in use (from status.flavorsUsage[].resources[].total). */
export const getCQUsedAccelerators = (cq: ClusterQueueKind): number =>
  (cq.status?.flavorsUsage ?? []).reduce(
    (total, flavor) =>
      total +
      flavor.resources
        .filter((r) => isAcceleratorResource(r.name))
        .reduce((sum, r) => sum + parseK8sQuantity(r.total), 0),
    0,
  );

/** Returns GPU units borrowed from the cohort (status.flavorsUsage[].resources[].borrowed). */
export const getAcceleratorBorrowedCount = (cq: ClusterQueueKind): number =>
  (cq.status?.flavorsUsage ?? []).reduce(
    (total, flavor) =>
      total +
      flavor.resources
        .filter((r) => isAcceleratorResource(r.name))
        .reduce((sum, r) => sum + parseK8sQuantity(r.borrowed), 0),
    0,
  );

/** Returns GPU units unused and available for other CQs to borrow. Floored at 0. */
export const getAcceleratorLentCount = (cq: ClusterQueueKind): number =>
  Math.max(0, getCQNominalAccelerators(cq) - getCQUsedAccelerators(cq));

export const isAcceleratorBorrowing = (cq: ClusterQueueKind): boolean =>
  getAcceleratorBorrowedCount(cq) > 0;

export const isAcceleratorLending = (cq: ClusterQueueKind): boolean =>
  isInCohort(cq) && getAcceleratorLentCount(cq) > 0;

/** True when the CQ belongs to a Kueue cohort and can participate in borrow/lend. */
export const isInCohort = (cq: ClusterQueueKind): boolean => !!cq.spec.cohortName;

/** Filters to CQs with non-zero accelerator quota or active usage (includes pure borrowers). */
export const filterAcceleratorCQs = (cqs: ClusterQueueKind[]): ClusterQueueKind[] =>
  cqs.filter((cq) => getCQNominalAccelerators(cq) > 0 || getCQUsedAccelerators(cq) > 0);

/**
 * Total GPUs shown in the cohort header.
 * Normally this is the sum of each CQ's nominal quota.
 * For cohorts where every CQ is a pure borrower (nominal=0), falls back to active usage
 * so the header doesn't show a misleading 0.
 */
export const getCohortTotalAccelerators = (cohort: UnifiedCohort): number => {
  const nominalTotal = cohort.memberClusterQueues.reduce(
    (sum, cq) => sum + getCQNominalAccelerators(cq),
    0,
  );
  return nominalTotal > 0
    ? nominalTotal
    : cohort.memberClusterQueues.reduce((sum, cq) => sum + getCQUsedAccelerators(cq), 0);
};

/** Sum of unused GPU capacity across member CQs — how much the cohort can lend out.
 *  Returns 0 for standalone (non-cohort) groups since they cannot participate in lending. */
export const getCohortUnallocatedBorrowable = (cohort: UnifiedCohort): number =>
  cohort.state === 'standalone'
    ? 0
    : cohort.memberClusterQueues.reduce((sum, cq) => sum + getAcceleratorLentCount(cq), 0);

/** True if any member CQ in the cohort is currently borrowing or lending GPU resources.
 *  Always false for standalone groups since they cannot exchange quota. */
export const isCohortBorrowLendActive = (cohort: UnifiedCohort): boolean =>
  cohort.state !== 'standalone' &&
  cohort.memberClusterQueues.some((cq) => isAcceleratorBorrowing(cq) || isAcceleratorLending(cq));

/**
 * Returns the names of sibling CQs that are on the other side of a borrow/lend relationship.
 * For a lending CQ → names of CQs currently borrowing.
 * For a borrowing CQ → names of CQs currently lending (from whom capacity flows).
 */
export const getCounterpartCQNames = (
  cq: ClusterQueueKind,
  siblingsInCohort: ClusterQueueKind[],
): string[] => {
  const cqName = cq.metadata?.name ?? '';
  const siblings = siblingsInCohort.filter((s) => s.metadata?.name !== cqName);
  const check = isAcceleratorBorrowing(cq) ? isAcceleratorLending : isAcceleratorBorrowing;
  return siblings
    .filter(check)
    .map((s) => s.metadata?.name ?? '')
    .filter(Boolean);
};

/**
 * Derives the donut chart config for a ClusterQueue's accelerator utilization.
 * Returns 'none' when the CQ has no accelerator quota.
 * Returns 'borrow-lend' when the CQ is borrowing or lending GPU resources AND belongs to a cohort.
 * Returns 'normal' otherwise (including standalone CQs which cannot exchange quota).
 */
export const getAcceleratorDonutConfig = (
  cq: ClusterQueueKind,
  inCohort = true,
): AcceleratorDonutConfig => {
  const nominal = getCQNominalAccelerators(cq);
  const used = getCQUsedAccelerators(cq);

  if (nominal === 0) {
    if (used === 0 || !inCohort) {
      return { type: AcceleratorDonutType.None };
    }
    // Pure borrower: no owned quota but actively using borrowed GPUs from the cohort pool.
    // Standalone CQs (inCohort=false) cannot borrow, so they fall through to None above.
    // nominal is set to used so the donut renders as fully filled with the borrowed segment.
    return {
      type: AcceleratorDonutType.BorrowLend,
      used,
      nominal: used,
      title: `${used}`,
      isBorrowing: true,
      stateLabel: AcceleratorSegment.Borrowed,
      segments: [{ x: AcceleratorSegment.Borrowed, y: used }],
    };
  }
  const borrowed = getAcceleratorBorrowedCount(cq);
  const borrowing = isAcceleratorBorrowing(cq);
  const lending = isAcceleratorLending(cq);

  if (inCohort && (borrowing || lending)) {
    const ownUsed = Math.max(0, used - borrowed);
    const lent = Math.max(0, nominal - ownUsed);
    const available = Math.max(0, nominal - ownUsed - (borrowing ? 0 : lent));

    return {
      type: AcceleratorDonutType.BorrowLend,
      used,
      nominal,
      title: `${used}/${nominal}`,
      isBorrowing: borrowing,
      stateLabel: borrowing ? AcceleratorSegment.Borrowed : AcceleratorSegment.Lent,
      segments: borrowing
        ? [
            { x: AcceleratorSegment.Own, y: ownUsed },
            { x: AcceleratorSegment.Borrowed, y: borrowed },
            { x: AcceleratorSegment.Available, y: available },
          ]
        : [
            { x: AcceleratorSegment.Own, y: ownUsed },
            { x: AcceleratorSegment.Lent, y: lent },
          ],
    };
  }

  return {
    type: AcceleratorDonutType.Normal,
    used,
    nominal,
    title: `${used}/${nominal}`,
    percentage: Math.round((used / nominal) * 100),
  };
};

export type BorrowLendBadgeState = {
  borrowing: boolean;
  lending: boolean;
  lentCount: number;
  borrowedCount: number;
};

/** Derives the badge visibility and counts for the borrow/lend badges on a CQ card. */
export const getBorrowLendBadgeState = (config: AcceleratorDonutConfig): BorrowLendBadgeState => ({
  borrowing: config.type === AcceleratorDonutType.BorrowLend && config.isBorrowing,
  lending: config.type === AcceleratorDonutType.BorrowLend && !config.isBorrowing,
  lentCount:
    config.type === AcceleratorDonutType.BorrowLend && !config.isBorrowing
      ? config.segments.find((s) => s.x === AcceleratorSegment.Lent)?.y ?? 0
      : 0,
  borrowedCount:
    config.type === AcceleratorDonutType.BorrowLend && config.isBorrowing
      ? config.segments.find((s) => s.x === AcceleratorSegment.Borrowed)?.y ?? 0
      : 0,
});

/**
 * Derives the borrow-lend split ratio from the donut config.
 * Returns undefined when the CQ is neither borrowing nor lending.
 *
 * - Borrowing: own = Own segment slots out of total used (0 for pure borrowers).
 * - Lending:   own = used GPUs out of nominal total quota.
 *
 * ownRatio is derived from segments rather than nominal/used to handle pure borrowers
 * correctly — they set nominal=used as a rendering trick, which would give ownRatio=1
 * (100% owned) if we used nominal/used directly.
 */
export const getBorrowLendInfo = (config: AcceleratorDonutConfig): BorrowLendInfo | undefined => {
  if (config.type !== AcceleratorDonutType.BorrowLend) {
    return undefined;
  }
  const ownRatio = config.isBorrowing
    ? (config.segments.find((s) => s.x === AcceleratorSegment.Own)?.y ?? 0) / (config.used || 1)
    : config.used / (config.nominal || 1);
  return { isBorrowing: config.isBorrowing, ownRatio };
};

/**
 * Computes the Victory chart data array for a DCGM donut in borrow-lend mode.
 * Clamps the remainder so the ring stays on a 0–100% scale.
 */
export const computeDcgmSplitData = (
  percentage: number,
  { isBorrowing, ownRatio }: BorrowLendInfo,
): {
  chartData: Array<{ x: string; y: number }>;
  splitLabel: AcceleratorSegment.Borrowed | AcceleratorSegment.Lent;
} => {
  const splitLabel = isBorrowing ? AcceleratorSegment.Borrowed : AcceleratorSegment.Lent;
  const ownPct = percentage * ownRatio;
  const splitPct = percentage * (1 - ownRatio);
  // Remainder keeps the ring at 100% scale; clamped so >100% utilisation fills the ring completely.
  const remainingPct = Math.max(0, 100 - ownPct - splitPct);

  // Victory renders y:0 slices as a degenerate path (tiny visible line), so filter them out.
  const rawData = [
    { x: AcceleratorSegment.Own, y: ownPct },
    { x: splitLabel, y: splitPct },
    { x: AcceleratorSegment.Available, y: remainingPct },
  ].filter((d) => d.y > 0);

  const chartData = rawData.length === 0 ? [{ x: AcceleratorSegment.NoData, y: 100 }] : rawData;
  return { chartData, splitLabel };
};

/** Formats the active/pending workload count line shown on a CQ card. */
export const formatWorkloadCounts = (admitted: number, pending: number): string =>
  `Workloads: ${admitted} active, ${pending} pending`;

/**
 * Normalises a GPU model name so NFD node-label format ("NVIDIA-A100-SXM4-80GB" or "AMD_MI300X")
 * and DCGM metric label format ("NVIDIA A100-SXM4-80GB") map to the same key.
 */
export const normalizeModelName = (name: string): string =>
  name.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Resolves per-CQ DCGM utilization by averaging across all GPU models the CQ owns.
 *
 * - `undefined` means the model is not in DCGM's data (N/A ring)
 * - `null` means the model is known to DCGM but the metric hasn't arrived yet (spinner)
 * - `number` is the averaged percentage
 */
export const resolveCQDcgmUtilization = (
  models: string[],
  dcgmByModel: Map<string, CQDcgmResult>,
): CQDcgmUtilization => {
  if (models.length === 0) {
    return { computeUtilization: undefined, memoryUtilization: undefined };
  }

  const dcgmEntries = models
    .map((m) => dcgmByModel.get(normalizeModelName(m)))
    .filter((e): e is CQDcgmResult => e !== undefined);

  if (dcgmEntries.length === 0) {
    return { computeUtilization: undefined, memoryUtilization: undefined };
  }

  const computeValues = dcgmEntries
    .map((e) => e.computePercentage)
    .filter((v): v is number => v != null);
  const memoryValues = dcgmEntries
    .map((e) => e.memoryPercentage)
    .filter((v): v is number => v != null);

  const avg = (values: number[]): number =>
    Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return {
    computeUtilization: computeValues.length > 0 ? avg(computeValues) : undefined,
    memoryUtilization: memoryValues.length > 0 ? avg(memoryValues) : undefined,
  };
};

export type PerModelDcgmData = { model: string; pct: number };

/**
 * Returns per-model DCGM utilization arrays for a CQ's hardware models, used to
 * build per-model tooltip lines in the DCGM lent/borrowed donut charts.
 * Accepts an optional map so callers can pass `dcgmByModel` directly regardless of
 * whether DCGM is available, and always get a safe `{ compute, memory }` result.
 */
export const resolvePerModelDcgmData = (
  models: string[],
  dcgmByModel: Map<string, CQDcgmResult> | undefined,
): { compute: PerModelDcgmData[]; memory: PerModelDcgmData[] } => {
  if (!dcgmByModel) {
    return { compute: [], memory: [] };
  }

  const compute: PerModelDcgmData[] = [];
  const memory: PerModelDcgmData[] = [];

  for (const model of models) {
    const entry = dcgmByModel.get(normalizeModelName(model));
    if (!entry) {
      continue;
    }
    if (entry.computePercentage != null) {
      compute.push({ model, pct: entry.computePercentage });
    }
    if (entry.memoryPercentage != null) {
      memory.push({ model, pct: entry.memoryPercentage });
    }
  }

  return { compute, memory };
};

export const buildDcgmLentTooltip = (lentPct: number, data: PerModelDcgmData[]): string =>
  [
    `Total lent in use: ${Math.round(lentPct)}%`,
    ...data.map((d) => `${d.model}: ${d.pct}% utilization`),
  ]
    .filter(Boolean)
    .join('\n');

export const buildDcgmBorrowedTooltip = (borrowedPct: number, data: PerModelDcgmData[]): string =>
  [
    `Total borrowed in use: ${Math.round(borrowedPct)}%`,
    ...data.map((d) => `${d.model}: ${d.pct}% utilization`),
  ]
    .filter(Boolean)
    .join('\n');

export const buildDcgmOwnTooltip = (ownPct: number, data: PerModelDcgmData[]): string =>
  [
    `Total owned in use: ${Math.round(ownPct)}%`,
    ...data.map((d) => `${d.model}: ${d.pct}% utilization`),
  ]
    .filter(Boolean)
    .join('\n');

export const buildAcceleratorOwnLines = (gpus: ModelGpuCount[]): string =>
  gpus.map((m) => `${m.model}: ${m.used}/${m.nominal} in use`).join('\n');

export const buildAcceleratorLentLines = (gpus: ModelGpuCount[]): string =>
  gpus
    .filter((m) => m.nominal - m.used > 0)
    .map((m) => `${m.model}: ${m.nominal - m.used} lent`)
    .join('\n');

export const buildAcceleratorBorrowedLines = (gpus: ModelGpuCount[]): string =>
  gpus
    .filter((m) => (m.borrowed ?? 0) > 0)
    .map((m) => `${m.model}: +${m.borrowed ?? 0} borrowed`)
    .join('\n');
