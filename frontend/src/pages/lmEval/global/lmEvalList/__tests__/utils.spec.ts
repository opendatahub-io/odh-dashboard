import { LMEvalState } from '#~/pages/lmEval/types';
import { getLMEvalState, getLMEvalStatusMessage } from '#~/pages/lmEval/global/lmEvalList/utils';

describe('getLMEvalStatusMessage', () => {
  it('returns "Failed" if state is Complete and reason is Failed with no message', () => {
    expect(getLMEvalStatusMessage({ state: 'Complete', reason: 'Failed' })).toBe('Failed');
  });

  it('returns custom message if state is Complete and reason is Failed with message', () => {
    expect(
      getLMEvalStatusMessage({
        state: 'Complete',
        reason: 'Failed',
        message: 'Something went wrong',
      }),
    ).toBe('Something went wrong');
  });

  it('returns "Pending" for Scheduled state', () => {
    expect(getLMEvalStatusMessage({ state: 'Scheduled' })).toBe('Pending');
  });

  it('returns "Running" for Running state', () => {
    expect(getLMEvalStatusMessage({ state: 'Running' })).toBe('Running');
  });

  it('returns "Complete" if reason is NoReason', () => {
    expect(getLMEvalStatusMessage({ state: 'Complete', reason: 'NoReason' })).toBe('Complete');
  });

  it('returns reason if provided and not "NoReason"', () => {
    expect(getLMEvalStatusMessage({ state: 'Complete', reason: 'Timeout' })).toBe('Timeout');
  });

  it('returns state as fallback', () => {
    expect(getLMEvalStatusMessage({ state: 'UnknownState' })).toBe('UnknownState');
  });
});

describe('getLMEvalState', () => {
  it('returns PENDING for Scheduled state', () => {
    expect(getLMEvalState({ state: 'Scheduled' })).toBe(LMEvalState.PENDING);
  });

  it('returns RUNNING for Running state', () => {
    expect(getLMEvalState({ state: 'Running' })).toBe(LMEvalState.RUNNING);
  });

  it('returns COMPLETE for Complete with reason not Failed', () => {
    expect(getLMEvalState({ state: 'Complete', reason: 'NoReason' })).toBe(LMEvalState.COMPLETE);
  });

  it('returns FAILED for Complete with reason Failed', () => {
    expect(getLMEvalState({ state: 'Complete', reason: 'Failed' })).toBe(LMEvalState.FAILED);
  });

  it('returns PENDING for unknown state', () => {
    expect(getLMEvalState({ state: 'Mystery' })).toBe(LMEvalState.PENDING);
  });
});
