import { LEGEND_MAX_CHARS } from '../../const';
import {
  buildColorByName,
  buildLegendData,
  buildLegendEvents,
  buildYDomain,
  formatTooltipDate,
  formatXTick,
  formatYTick,
  getEntryLabel,
  getLegendLabel,
  getTooltipPosition,
  getYAxisTicks,
  truncateLabel,
} from '../borrowingLendingChart';
import { CQMetricSeries } from '../../hooks/useBorrowingLendingMetrics';

const CQ_A = 'cq-a';
const CQ_B = 'cq-b';
const MY_CQ = 'my-cq';
const MY_COHORT = 'my-cohort';
const SHORT_COHORT = 'c';
const COHORT_CQ_LABEL = `${MY_COHORT} · ${MY_CQ}`;
const DISABLED_FILL = 'var(--pf-t--global--text--color--disabled)';
const LONG_LABEL_LEN = 20;
const WIDE_VIEWPORT = 1200;
const NARROW_VIEWPORT = 200;

/** Builds a minimal CQMetricSeries for test use. */
const makeSeries = (
  cqName: string,
  cohortName: string,
  yValues: number[] = [0],
): CQMetricSeries => ({
  cqName,
  cohortName,
  nominalQuota: 4,
  data: yValues.map((y, i) => ({ x: i * 1000, y })),
});

/** Returns a ref-like object whose getBoundingClientRect reports the given origin. */
const makeRef = (rectLeft: number, rectTop: number) => ({
  current: {
    getBoundingClientRect: () => ({ left: rectLeft, top: rectTop }),
  } as HTMLDivElement,
});

// 2024-01-09T12:00:00Z is a Tuesday — noon UTC keeps the date stable across all timezones
const TUESDAY_TS = new Date('2024-01-09T12:00:00Z').getTime();

describe('formatXTick', () => {
  it('formats a timestamp as "Weekday Day Month"', () => {
    expect(formatXTick(TUESDAY_TS)).toMatch(/^Tue 9 Jan$/);
  });
});

describe('formatTooltipDate', () => {
  it('formats a timestamp as "Weekday Day Month, HH:MM <tz>"', () => {
    // Timezone suffix varies by environment (e.g. "GMT+5:30", "UTC", "IST")
    expect(formatTooltipDate(TUESDAY_TS)).toMatch(/^Tue 9 Jan, \d{2}:\d{2} \S+$/);
  });
});

describe('formatYTick', () => {
  it.each([
    [0, '0'],
    [3, '+3'],
    [-3, '-3'],
    [1000, '+1.0k'],
    [-2500, '-2.5k'],
  ])('formats %d as "%s"', (y, expected) => {
    expect(formatYTick(y)).toBe(expected);
  });
});

describe('truncateLabel', () => {
  it.each([
    ['short label', 'abc', undefined, 'abc'],
    ['label at exact limit', 'a'.repeat(LEGEND_MAX_CHARS), undefined, 'a'.repeat(LEGEND_MAX_CHARS)],
    ['custom maxChars', 'hello world', 6, 'hello…'],
  ])('returns unchanged or truncated for %s', (_desc, input, maxChars, expected) => {
    expect(truncateLabel(input, maxChars)).toBe(expected);
  });

  it('appends ellipsis and caps length when label exceeds the limit', () => {
    const result = truncateLabel('a'.repeat(LEGEND_MAX_CHARS + 5));
    expect(result).toHaveLength(LEGEND_MAX_CHARS);
    expect(result.endsWith('…')).toBe(true);
  });
});

describe('getEntryLabel', () => {
  it.each([
    ['undefined info returns fallback', undefined, 'fallback-cq', 'fallback-cq'],
    ['empty cohortName returns cqName alone', makeSeries(MY_CQ, ''), 'fallback', MY_CQ],
    [
      'set cohortName prefixes the label',
      makeSeries(MY_CQ, MY_COHORT),
      'fallback',
      COHORT_CQ_LABEL,
    ],
  ] as const)('%s', (_desc, info, fallback, expected) => {
    expect(getEntryLabel(info as CQMetricSeries | undefined, fallback)).toBe(expected);
  });
});

describe('getLegendLabel', () => {
  it('truncates long cohort-prefixed labels to LEGEND_MAX_CHARS', () => {
    const result = getLegendLabel(
      makeSeries('a'.repeat(LONG_LABEL_LEN), 'b'.repeat(LONG_LABEL_LEN)),
    );
    expect(result.length).toBeLessThanOrEqual(LEGEND_MAX_CHARS);
    expect(result.endsWith('…')).toBe(true);
  });

  it('returns the full label unchanged when it fits within the limit', () => {
    expect(getLegendLabel(makeSeries('cq', 'cohort'))).toBe('cohort · cq');
  });
});

describe('buildYDomain', () => {
  it('returns ±1 buffer around zero for empty series', () => {
    expect(buildYDomain([])).toEqual({ minY: -1, maxY: 1 });
  });

  it.each([
    ['only positive values', [3, 5], { minY: -1, maxY: 6 }],
    ['mixed values', [-3, 4], { minY: -4, maxY: 5 }],
  ])('applies ±1 buffer and always includes zero for %s', (_desc, yValues, expected) => {
    expect(buildYDomain([makeSeries('cq', SHORT_COHORT, yValues)])).toEqual(expected);
  });
});

describe('getYAxisTicks', () => {
  it('generates evenly-spaced integer ticks that always include 0', () => {
    const ticks = getYAxisTicks(-4, 4);
    expect(ticks).toContain(0);
    const diffs = ticks.slice(1).map((t, i) => t - ticks[i]);
    expect(diffs.every((d) => d === diffs[0])).toBe(true);
  });

  it('uses step size 1 for a small range and covers all boundary values', () => {
    expect(getYAxisTicks(-1, 1)).toEqual(expect.arrayContaining([-1, 0, 1]));
  });
});

describe('buildColorByName', () => {
  const twoSeries = [makeSeries(CQ_A, SHORT_COHORT), makeSeries(CQ_B, SHORT_COHORT)];

  it('includes visible series and excludes hidden ones', () => {
    const map = buildColorByName(twoSeries, new Set([CQ_A]));
    expect(map.has(CQ_A)).toBe(false);
    expect(map.has(CQ_B)).toBe(true);
  });

  it('returns an empty map when all series are hidden', () => {
    expect(buildColorByName([makeSeries(CQ_A, SHORT_COHORT)], new Set([CQ_A])).size).toBe(0);
  });
});

describe('buildLegendData', () => {
  const singleSeries = [makeSeries(CQ_A, SHORT_COHORT)];

  it('greys out hidden series and leaves visible series without a fill', () => {
    const [hidden] = buildLegendData(singleSeries, new Set([CQ_A]));
    const [visible] = buildLegendData(singleSeries, new Set());
    expect(hidden.symbol.fill).toBe(DISABLED_FILL);
    expect(visible.symbol.fill).toBeUndefined();
  });

  it('sets childName and fullName correctly for event targeting and tooltip labels', () => {
    const [item] = buildLegendData([makeSeries(MY_CQ, MY_COHORT)], new Set());
    expect(item.childName).toBe(MY_CQ);
    expect(item.fullName).toBe(COHORT_CQ_LABEL);
  });
});

describe('buildLegendEvents', () => {
  it('returns click handlers for both data and labels targets', () => {
    const toggle = jest.fn();
    const events = buildLegendEvents(toggle);
    expect(events.map((e) => e.target)).toEqual(expect.arrayContaining(['data', 'labels']));
    events[0].eventHandlers.onClick({}, { datum: { childName: CQ_A } });
    expect(toggle).toHaveBeenCalledWith(CQ_A);
  });

  it('does not call toggleSeries when childName is missing', () => {
    const toggle = jest.fn();
    buildLegendEvents(toggle)[0].eventHandlers.onClick({}, { datum: {} });
    expect(toggle).not.toHaveBeenCalled();
  });
});

describe('getTooltipPosition', () => {
  const DEFAULT_REF = makeRef(100, 200);

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: WIDE_VIEWPORT,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  // vpX = rectLeft(100) + x(50) = 150
  it.each([
    ['right', WIDE_VIEWPORT, true],
    ['left (flipped)', NARROW_VIEWPORT, false],
  ])('places tooltip to the %s of cursor (innerWidth=%i)', (_dir, innerWidth, expectRight) => {
    Object.defineProperty(window, 'innerWidth', { value: innerWidth });
    const { finalLeft } = getTooltipPosition(DEFAULT_REF, 50, 100);
    if (expectRight) {
      expect(finalLeft).toBeGreaterThan(150);
    } else {
      expect(finalLeft).toBeLessThan(150);
    }
  });

  it.each<[string, ReturnType<typeof makeRef> | undefined, number, number, number]>([
    ['fitsBelow=true, ref undefined', undefined, 0, 0, 768],
    ['fitsBelow=false (small screen), flips up', makeRef(0, 0), 0, 100, 400],
  ])('finalTop is always ≥ 8px: %s', (_desc, ref, x, y, innerHeight) => {
    Object.defineProperty(window, 'innerHeight', { value: innerHeight });
    const { finalLeft, finalTop } = getTooltipPosition(ref, x, y);
    expect(finalTop).toBeGreaterThanOrEqual(8);
    expect(typeof finalLeft).toBe('number');
  });
});
