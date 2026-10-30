import {
  ADMISSION_METRIC_IDS,
  admissionMetricResponsePredicate,
  buildAdmissionLeadTimeQuery,
  buildAdmissionRateQuery,
  buildLabelSelector,
  mapAdmissionMetricSeries,
  mapAdmissionLeadTimeSeries,
  getAdmissionChartGridLeft,
} from '../admissionMetrics';
import { getWindowConfig } from '../../hooks/useWorkloadAdmissionMetrics';
import {
  formatAdmissionMetricValue,
  formatAdmissionMetricHeadline,
  formatAdmissionTimestamp,
  getAdmissionMetricsXDomain,
  getAdmissionMetricHeadlineValue,
  getAdmissionMetricYInterval,
  getAdmissionTickInterval,
} from '../workloadAdmissions';

describe('getAdmissionChartGridLeft', () => {
  it.each([
    { metricId: ADMISSION_METRIC_IDS.rate, labelWidth: 6, expected: 45 },
    { metricId: ADMISSION_METRIC_IDS.rate, labelWidth: 5, expected: 35 },
    { metricId: ADMISSION_METRIC_IDS.leadTime, labelWidth: 5, expected: 50 },
    { metricId: ADMISSION_METRIC_IDS.leadTime, labelWidth: 4, expected: 30 },
    { metricId: ADMISSION_METRIC_IDS.waiting, labelWidth: 10, expected: 78 },
    { metricId: ADMISSION_METRIC_IDS.waiting, labelWidth: 3, expected: 29 },
    { metricId: ADMISSION_METRIC_IDS.active, labelWidth: 4, expected: 36 },
  ])('returns expected grid-left for %#', ({ metricId, labelWidth, expected }) => {
    expect(getAdmissionChartGridLeft(metricId, labelWidth)).toBe(expected);
  });
});

const PROMETHEUS_CLUSTER_QUEUE_LABEL = 'cluster_queue';
const ESCAPED_CLUSTER_QUEUE_SELECTOR =
  '{cluster_queue=~"^(gpu\\\\.queue|gpu\\\\(queue\\\\)|gpu\\\\\\\\queue)$"}';

describe('getWindowConfig', () => {
  it.each([
    ['1h', '5m'],
    ['24h', '15m'],
    ['7d', '2h'],
    ['30d', '8h'],
  ])('should use a %s rate window for the %s range', (timeWindow, rateWindow) => {
    expect(getWindowConfig(timeWindow).rateWindow).toBe(rateWindow);
  });
});

describe('getAdmissionMetricsXDomain', () => {
  it('uses selected range instead of returned data timestamps', () => {
    expect(getAdmissionMetricsXDomain(7 * 24 * 60 * 60, 1_000_000)).toEqual([
      -603_800_000, 1_000_000,
    ]);
  });
});

describe('admission metric queries', () => {
  it('should escape regex characters and omit empty label values', () => {
    expect(
      buildLabelSelector({
        [PROMETHEUS_CLUSTER_QUEUE_LABEL]: ['gpu.queue', 'gpu(queue)', 'gpu\\queue'],
      }),
    ).toBe(ESCAPED_CLUSTER_QUEUE_SELECTOR);
    expect(buildLabelSelector({ [PROMETHEUS_CLUSTER_QUEUE_LABEL]: [], status: ['active'] })).toBe(
      '{status=~"^(active)$"}',
    );
  });

  it('should use the configured rate window for admission rate queries', () => {
    expect(buildAdmissionRateQuery(['manual-lifecycle-cq'], '2h')).toContain('[2h]');
  });

  it('should use the configured rate window for lead-time queries', () => {
    expect(buildAdmissionLeadTimeQuery(['manual-lifecycle-cq'], '2h')).toContain('[2h]');
  });
});

describe('admissionMetricResponsePredicate', () => {
  it('should return an empty result list when Prometheus returns no results', () => {
    expect(admissionMetricResponsePredicate({ resultType: 'matrix', result: undefined })).toEqual(
      [],
    );
  });
});

describe('mapAdmissionMetricSeries', () => {
  it('should aggregate series by timestamp and return the latest finite value', () => {
    expect(
      mapAdmissionMetricSeries([
        {
          metric: { request: 'one' },
          values: [
            [200, '2'],
            [100, '1'],
          ],
        },
        {
          metric: { request: 'two' },
          values: [
            [100, '3'],
            [200, '4'],
          ],
        },
      ]),
    ).toEqual({
      value: 6,
      data: [
        { x: 100000, y: 4 },
        { x: 200000, y: 6 },
      ],
    });
  });

  it('should ignore invalid timestamps and values', () => {
    expect(
      mapAdmissionMetricSeries([
        {
          metric: {},
          values: [
            [100, '1'],
            [Number.NaN, '2'],
            [200, 'NaN'],
            [300, '3'],
          ],
        },
      ]),
    ).toEqual({
      value: 3,
      data: [
        { x: 100000, y: 1 },
        { x: 300000, y: 3 },
      ],
    });
  });

  it('should return no data when all samples are invalid', () => {
    expect(
      mapAdmissionMetricSeries([
        {
          metric: {},
          values: [
            [100, 'NaN'],
            [Number.NaN, '2'],
          ],
        },
      ]),
    ).toEqual({ value: null, data: [] });
  });

  it('should apply the supplied value transform before selecting the latest value', () => {
    expect(
      mapAdmissionMetricSeries(
        [
          {
            metric: {},
            values: [[100, '0.5']],
          },
        ],
        (value) => value * 1000,
      ),
    ).toEqual({ value: 500, data: [{ x: 100000, y: 500 }] });
  });
});

describe('mapAdmissionLeadTimeSeries', () => {
  it('should retain the latest valid lead-time value when later samples are NaN', () => {
    const result = mapAdmissionLeadTimeSeries([
      {
        metric: {},
        values: [
          [100, '0.5'],
          [200, 'NaN'],
        ],
      },
    ]);

    expect(result).toEqual({
      value: 500,
      data: [{ x: 100000, y: 500 }],
    });
  });

  it('should return no value when all lead-time samples are NaN', () => {
    expect(
      mapAdmissionLeadTimeSeries([
        {
          metric: {},
          values: [
            [100, 'NaN'],
            [200, 'NaN'],
          ],
        },
      ]),
    ).toEqual({ value: null, data: [] });
  });
});

describe('formatAdmissionTimestamp', () => {
  const timestamp = new Date(2026, 9, 15, 22, 0).getTime();

  it.each([
    {
      name: 'same-day ranges with a 12-hour time and AM/PM',
      timeWindow: '1h',
      domain: [new Date(2026, 9, 15, 21, 0).getTime(), new Date(2026, 9, 15, 23, 0).getTime()] as [
        number,
        number,
      ],
      expected: '10:00 PM',
    },
    {
      name: '7-day ranges with date-only labels',
      timeWindow: '7d',
      domain: [new Date(2026, 9, 15, 22, 0).getTime(), new Date(2026, 9, 22, 22, 0).getTime()] as [
        number,
        number,
      ],
      expected: 'Oct 15',
    },
    {
      name: '30-day ranges with date-only labels',
      timeWindow: '30d',
      domain: [new Date(2026, 9, 1, 22, 0).getTime(), new Date(2026, 9, 31, 22, 0).getTime()] as [
        number,
        number,
      ],
      expected: 'Oct 15',
    },
    {
      name: '1-hour ranges crossing midnight with time-only labels',
      timeWindow: '1h',
      domain: [new Date(2026, 9, 15, 23, 0).getTime(), new Date(2026, 9, 16, 1, 0).getTime()] as [
        number,
        number,
      ],
      expected: '10:00 PM',
    },
    {
      name: '24-hour ranges crossing midnight with time-only labels',
      timeWindow: '24h',
      domain: [new Date(2026, 9, 15, 23, 0).getTime(), new Date(2026, 9, 16, 1, 0).getTime()] as [
        number,
        number,
      ],
      expected: '10:00 PM',
    },
    {
      name: 'same-day 24-hour ranges with time-only labels',
      timeWindow: '24h',
      domain: [new Date(2026, 9, 15, 8, 0).getTime(), new Date(2026, 9, 15, 23, 0).getTime()] as [
        number,
        number,
      ],
      expected: '10:00 PM',
    },
  ])('uses $name', ({ timeWindow, domain, expected }) => {
    expect(formatAdmissionTimestamp(timestamp, timeWindow, domain)).toBe(expected);
  });
});

describe('admission chart tooltip timestamps', () => {
  const timestamp = new Date(2026, 9, 15, 22, 0).getTime();

  it.each([
    ['1h', [new Date(2026, 9, 15, 21, 0).getTime(), timestamp] as [number, number]],
    ['24h', [new Date(2026, 9, 15, 8, 0).getTime(), timestamp] as [number, number]],
  ])('uses 12-hour AM/PM time for the %s tooltip', (timeWindow, domain) => {
    expect(formatAdmissionTimestamp(timestamp, timeWindow, domain)).toBe('10:00 PM');
  });

  it.each([
    ['7d', [timestamp, new Date(2026, 9, 22, 22, 0).getTime()] as [number, number]],
    [
      '30d',
      [new Date(2026, 9, 1, 22, 0).getTime(), new Date(2026, 9, 31, 22, 0).getTime()] as [
        number,
        number,
      ],
    ],
  ])('uses date-only formatting for the %s tooltip', (timeWindow, domain) => {
    expect(formatAdmissionTimestamp(timestamp, timeWindow, domain)).toBe('Oct 15');
  });
});

describe('getAdmissionTickInterval', () => {
  it.each([
    ['7d', 2 * 24 * 60 * 60 * 1000],
    ['30d', 6 * 24 * 60 * 60 * 1000],
    ['1h', 15 * 60 * 1000],
    ['24h', 5 * 60 * 60 * 1000],
    ['unknown', undefined],
  ])('returns the expected interval for %s', (timeWindow, expectedInterval) => {
    expect(getAdmissionTickInterval(timeWindow)).toBe(expectedInterval);
  });

  it.each([
    ['1h', 60 * 60 * 1000, 4],
    ['24h', 24 * 60 * 60 * 1000, 4.8],
    ['7d', 7 * 24 * 60 * 60 * 1000, 3.5],
    ['30d', 30 * 24 * 60 * 60 * 1000, 5],
  ])('uses a consistent numeric interval for the %s domain', (timeWindow, domain, segments) => {
    const interval = getAdmissionTickInterval(timeWindow);

    expect(interval).toBeDefined();
    if (interval === undefined) {
      throw new Error(`Expected an interval for ${timeWindow}`);
    }

    expect(domain / interval).toBe(segments);
  });
});

describe('formatAdmissionMetricValue', () => {
  it('includes admissions per second for admission rate values', () => {
    expect(formatAdmissionMetricValue('admission-rate', 0.091)).toBe('0.091/s');
  });

  it('includes milliseconds for admission lead-time values', () => {
    expect(formatAdmissionMetricValue('admission-lead-time', 62)).toBe('62ms');
  });

  it.each([
    [1000, '1s'],
    [1500, '1.5s'],
    [30000, '30s'],
  ])('formats %s milliseconds as %s', (value, expected) => {
    expect(formatAdmissionMetricValue('admission-lead-time', value)).toBe(expected);
  });
});

describe('formatAdmissionMetricHeadline', () => {
  it('preserves precision for small non-zero admission-rate averages', () => {
    expect(
      formatAdmissionMetricHeadline(
        {
          id: 'admission-rate',
          label: 'Admission rate',
          value: '0',
          data: [],
          color: 'blue',
        },
        0.000214,
      ),
    ).toBe('0.000214/s');
  });

  it('keeps three decimal places for normal admission-rate values', () => {
    expect(
      formatAdmissionMetricHeadline(
        {
          id: 'admission-rate',
          label: 'Admission rate',
          value: '0',
          data: [],
          color: 'blue',
        },
        0.003,
      ),
    ).toBe('0.003/s');
  });
});

describe('getAdmissionMetricYInterval', () => {
  it.each(['waiting-workloads', 'active-workloads'])(
    'uses integer ticks for small %s counts',
    (metricId) => {
      expect(getAdmissionMetricYInterval(metricId, 5)).toBe(1);
    },
  );

  it.each(['waiting-workloads', 'active-workloads'])(
    'uses adaptive ticks for large %s counts',
    (metricId) => {
      expect(getAdmissionMetricYInterval(metricId, 1000)).toBe(200);
    },
  );

  it.each(['admission-rate', 'admission-lead-time'])('uses automatic ticks for %s', (metricId) => {
    expect(getAdmissionMetricYInterval(metricId, 1000)).toBeUndefined();
  });
});

describe('getAdmissionMetricHeadlineValue', () => {
  it.each(['admission-rate', 'admission-lead-time'])(
    'uses the average plotted value for %s',
    (metricId) => {
      expect(
        getAdmissionMetricHeadlineValue({
          id: metricId,
          label: metricId,
          value: '0',
          data: [
            { x: 1, y: 0.003 },
            { x: 2, y: 0 },
          ],
          color: 'blue',
        }),
      ).toBe(0.0015);
    },
  );

  it.each(['waiting-workloads', 'active-workloads'])(
    'uses the maximum plotted value for %s',
    (metricId) => {
      expect(
        getAdmissionMetricHeadlineValue({
          id: metricId,
          label: metricId,
          value: '0',
          data: [
            { x: 1, y: 2 },
            { x: 2, y: 4 },
          ],
          color: 'blue',
        }),
      ).toBe(4);
    },
  );

  it('returns null when all plotted values are invalid', () => {
    expect(
      getAdmissionMetricHeadlineValue({
        id: 'admission-rate',
        label: 'Admission rate',
        value: '--',
        data: [{ x: 1, y: Number.NaN }],
        color: 'blue',
      }),
    ).toBeNull();
  });
});
