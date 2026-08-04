/* eslint-disable camelcase */
import { buildMockRunKF } from '#~/__mocks__/mockRunKF';
import { RuntimeStateKF } from '#~/concepts/pipelines/kfTypes';
import { getRunStartTime, getRunDuration } from '#~/concepts/pipelines/content/tables/utils';

describe('getRunStartTime', () => {
  it('should return the last RUNNING entry timestamp from state_history', () => {
    const run = buildMockRunKF({
      created_at: '2024-01-01T00:00:00Z',
      state_history: [
        { update_time: '2024-01-01T00:00:01Z', state: RuntimeStateKF.PENDING },
        { update_time: '2024-01-01T00:00:05Z', state: RuntimeStateKF.RUNNING },
        { update_time: '2024-01-01T00:01:00Z', state: RuntimeStateKF.SUCCEEDED },
      ],
    });
    expect(getRunStartTime(run)).toEqual(new Date('2024-01-01T00:00:05Z'));
  });

  it('should return the last RUNNING entry when multiple RUNNING entries exist (retried run with preserved history)', () => {
    const run = buildMockRunKF({
      created_at: '2024-01-01T00:00:00Z',
      state_history: [
        { update_time: '2024-01-01T00:00:01Z', state: RuntimeStateKF.PENDING },
        { update_time: '2024-01-01T00:00:05Z', state: RuntimeStateKF.RUNNING },
        { update_time: '2024-01-01T00:01:00Z', state: RuntimeStateKF.FAILED },
        { update_time: '2024-01-01T02:00:00Z', state: RuntimeStateKF.PENDING },
        { update_time: '2024-01-01T02:00:05Z', state: RuntimeStateKF.RUNNING },
      ],
    });
    expect(getRunStartTime(run)).toEqual(new Date('2024-01-01T02:00:05Z'));
  });

  it('should fall back to created_at when state_history is empty', () => {
    const run = buildMockRunKF({
      created_at: '2024-01-01T00:00:00Z',
      state_history: [],
    });
    expect(getRunStartTime(run)).toEqual(new Date('2024-01-01T00:00:00Z'));
  });

  it('should fall back to created_at when state_history has no RUNNING entry', () => {
    const run = buildMockRunKF({
      created_at: '2024-01-01T00:00:00Z',
      state_history: [
        { update_time: '2024-01-01T00:00:01Z', state: RuntimeStateKF.PENDING },
        { update_time: '2024-01-01T00:01:00Z', state: RuntimeStateKF.SUCCEEDED },
      ],
    });
    expect(getRunStartTime(run)).toEqual(new Date('2024-01-01T00:00:00Z'));
  });

  it('should handle a retried run with wiped history (single RUNNING entry)', () => {
    const run = buildMockRunKF({
      created_at: '2024-01-01T00:00:00Z',
      state_history: [{ update_time: '2024-01-01T04:30:00Z', state: RuntimeStateKF.RUNNING }],
    });
    expect(getRunStartTime(run)).toEqual(new Date('2024-01-01T04:30:00Z'));
  });

  it('should skip null or primitive entries in state_history', () => {
    const run = buildMockRunKF({
      created_at: '2024-01-01T00:00:00Z',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (run as any).state_history = [
      null,
      42,
      'bad',
      { update_time: '2024-01-01T00:00:05Z', state: RuntimeStateKF.RUNNING },
    ];
    expect(getRunStartTime(run)).toEqual(new Date('2024-01-01T00:00:05Z'));
  });

  it('should fall back to created_at when state_history contains only null/primitive entries', () => {
    const run = buildMockRunKF({
      created_at: '2024-01-01T00:00:00Z',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (run as any).state_history = [null, undefined, 0];
    expect(getRunStartTime(run)).toEqual(new Date('2024-01-01T00:00:00Z'));
  });

  it('should handle undefined state_history gracefully', () => {
    const run = buildMockRunKF({
      created_at: '2024-01-01T00:00:00Z',
    });
    // Simulate a partial API response where state_history is missing at runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (run as any).state_history = undefined;
    expect(getRunStartTime(run)).toEqual(new Date('2024-01-01T00:00:00Z'));
  });
});

describe('getRunDuration', () => {
  it('should compute duration from RUNNING entry to next state transition', () => {
    const run = buildMockRunKF({
      finished_at: '2024-01-01T00:10:00Z',
      state_history: [
        { update_time: '2024-01-01T00:00:01Z', state: RuntimeStateKF.PENDING },
        { update_time: '2024-01-01T00:00:05Z', state: RuntimeStateKF.RUNNING },
        { update_time: '2024-01-01T00:10:00Z', state: RuntimeStateKF.SUCCEEDED },
      ],
    });
    // 10:00 - 00:05 = 9 minutes 55 seconds = 595000ms
    expect(getRunDuration(run)).toBe(595000);
  });

  it('should accumulate duration across multiple RUNNING segments for retried runs', () => {
    const run = buildMockRunKF({
      finished_at: '2024-01-01T02:10:00Z',
      state_history: [
        { update_time: '2024-01-01T00:00:01Z', state: RuntimeStateKF.PENDING },
        { update_time: '2024-01-01T00:00:05Z', state: RuntimeStateKF.RUNNING },
        { update_time: '2024-01-01T00:30:00Z', state: RuntimeStateKF.FAILED },
        { update_time: '2024-01-01T02:00:00Z', state: RuntimeStateKF.PENDING },
        { update_time: '2024-01-01T02:00:05Z', state: RuntimeStateKF.RUNNING },
        { update_time: '2024-01-01T02:10:00Z', state: RuntimeStateKF.SUCCEEDED },
      ],
    });
    // Segment 1: 00:30:00 - 00:00:05 = 29m 55s = 1795000ms
    // Segment 2: 02:10:00 - 02:00:05 = 9m 55s = 595000ms
    // Total: 2390000ms
    expect(getRunDuration(run)).toBe(2390000);
  });

  it('should use finished_at as end time when last state is RUNNING', () => {
    const run = buildMockRunKF({
      finished_at: '2024-01-01T00:10:00Z',
      state_history: [
        { update_time: '2024-01-01T00:00:01Z', state: RuntimeStateKF.PENDING },
        { update_time: '2024-01-01T00:00:05Z', state: RuntimeStateKF.RUNNING },
      ],
    });
    // 10:00 - 00:05 = 9m 55s = 595000ms
    expect(getRunDuration(run)).toBe(595000);
  });

  it('should return 0 for epoch finished_at', () => {
    const run = buildMockRunKF({
      finished_at: '1970-01-01T00:00:00Z',
      state_history: [{ update_time: '2024-01-01T00:00:05Z', state: RuntimeStateKF.RUNNING }],
    });
    expect(getRunDuration(run)).toBe(0);
  });

  it('should use created_at for duration when no RUNNING entry exists', () => {
    const run = buildMockRunKF({
      created_at: '2024-01-01T00:00:00Z',
      finished_at: '2024-01-01T00:05:00Z',
      state_history: [],
    });
    expect(getRunDuration(run)).toBe(300000);
  });

  it('should handle undefined state_history gracefully and fall back to created_at', () => {
    const run = buildMockRunKF({
      created_at: '2024-01-01T00:00:00Z',
      finished_at: '2024-01-01T00:05:00Z',
    });
    // Simulate a partial API response where state_history is missing at runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (run as any).state_history = undefined;
    // Falls back to finished_at - created_at = 5 minutes = 300000ms
    expect(getRunDuration(run)).toBe(300000);
  });

  it('should skip entries with invalid/NaN update_time', () => {
    const run = buildMockRunKF({
      created_at: '2024-01-01T00:00:00Z',
      finished_at: '2024-01-01T00:10:00Z',
      state_history: [
        { update_time: '2024-01-01T00:00:01Z', state: RuntimeStateKF.PENDING },
        { update_time: '2024-01-01T00:00:05Z', state: RuntimeStateKF.RUNNING },
        { update_time: 'not-a-date', state: RuntimeStateKF.SUCCEEDED },
      ],
    });
    // The invalid update_time entry is skipped, so RUNNING segment stays open
    // and closes at finished_at: 00:10:00 - 00:00:05 = 9m 55s = 595000ms
    expect(getRunDuration(run)).toBe(595000);
  });

  it('should skip negative duration intervals caused by out-of-order timestamps', () => {
    const run = buildMockRunKF({
      created_at: '2024-01-01T00:00:00Z',
      finished_at: '2024-01-01T00:10:00Z',
      state_history: [
        { update_time: '2024-01-01T00:00:01Z', state: RuntimeStateKF.PENDING },
        { update_time: '2024-01-01T00:05:00Z', state: RuntimeStateKF.RUNNING },
        // Timestamp before the RUNNING entry — would produce negative interval
        { update_time: '2024-01-01T00:03:00Z', state: RuntimeStateKF.FAILED },
        { update_time: '2024-01-01T00:06:00Z', state: RuntimeStateKF.PENDING },
        { update_time: '2024-01-01T00:07:00Z', state: RuntimeStateKF.RUNNING },
        { update_time: '2024-01-01T00:10:00Z', state: RuntimeStateKF.SUCCEEDED },
      ],
    });
    // First RUNNING at 00:05:00, next non-RUNNING at 00:03:00 is skipped (negative)
    // The RUNNING segment stays open until finished_at: 00:10:00 - 00:05:00 = 5m = 300000ms
    // But then PENDING at 00:06:00 > 00:05:00, so that closes the segment: 00:06:00 - 00:05:00 = 1m = 60000ms
    // Second RUNNING at 00:07:00, SUCCEEDED at 00:10:00: 00:10:00 - 00:07:00 = 3m = 180000ms
    // Total: 60000 + 180000 = 240000ms
    expect(getRunDuration(run)).toBe(240000);
  });
});
