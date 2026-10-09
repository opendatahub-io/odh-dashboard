/* eslint-disable camelcase */
import { getPipelineTaskAttemptTimestamp, getPipelineTaskTiming } from '../pipelineTaskTiming';

describe('getPipelineTaskTiming', () => {
  it('uses the start_time for a task without a retry', () => {
    expect(
      getPipelineTaskTiming({
        create_time: '2024-09-15T18:35:00Z',
        start_time: '2024-09-15T18:35:10Z',
        end_time: '2024-09-15T18:37:51Z',
      }),
    ).toEqual({
      start: '2024-09-15T18:35:10Z',
      end: '2024-09-15T18:37:51Z',
      retryStart: undefined,
    });
  });

  it('uses the latest retry queue time instead of a retained original start_time', () => {
    expect(
      getPipelineTaskTiming({
        create_time: '2024-09-15T18:35:00Z',
        start_time: '2024-09-15T18:35:10Z',
        end_time: '2024-10-05T18:37:51Z',
        state_history: [
          { state: 'RUNNING', update_time: '2024-09-15T18:35:10Z' },
          { state: 'FAILED', update_time: '2024-09-15T18:40:00Z' },
          { state: 'PENDING', update_time: '2024-10-05T18:35:55Z' },
          { state: 'RUNNING', update_time: '2024-10-05T18:36:01Z' },
          { state: 'FAILED', update_time: '2024-10-05T18:37:51Z' },
        ],
      }),
    ).toEqual({
      start: '2024-10-05T18:35:55Z',
      end: '2024-10-05T18:37:51Z',
      retryStart: '2024-10-05T18:35:55Z',
    });
  });

  it('uses a direct transition to RUNNING when no PENDING transition is recorded', () => {
    expect(
      getPipelineTaskTiming({
        start_time: '2024-09-15T18:35:10Z',
        state_history: [
          { state: 'FAILED', update_time: '2024-09-15T18:40:00Z' },
          { state: 'RUNNING', update_time: '2024-10-05T18:36:01Z' },
        ],
      }).start,
    ).toBe('2024-10-05T18:36:01Z');
  });

  it('uses create_time when start_time and retry history are unavailable', () => {
    expect(getPipelineTaskTiming({ create_time: '2024-09-15T18:35:00Z' }).start).toBe(
      '2024-09-15T18:35:00Z',
    );
  });
});

describe('getPipelineTaskAttemptTimestamp', () => {
  it('ignores a stage timestamp that predates the latest retry', () => {
    expect(
      getPipelineTaskAttemptTimestamp('2024-09-15T18:35:10Z', '2024-10-05T18:35:55Z'),
    ).toBeUndefined();
  });

  it('preserves timestamps at or after the latest retry', () => {
    expect(getPipelineTaskAttemptTimestamp('2024-10-05T18:36:01Z', '2024-10-05T18:35:55Z')).toBe(
      '2024-10-05T18:36:01Z',
    );
  });

  it('preserves timestamps when there is no retry', () => {
    expect(getPipelineTaskAttemptTimestamp('2024-09-15T18:35:10Z')).toBe('2024-09-15T18:35:10Z');
  });
});
