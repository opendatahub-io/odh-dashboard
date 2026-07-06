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
  it('should compute duration from last RUNNING entry to finished_at', () => {
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
});
