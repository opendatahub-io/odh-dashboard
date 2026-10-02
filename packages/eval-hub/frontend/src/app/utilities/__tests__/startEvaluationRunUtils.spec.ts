import {
  getSourceOptions,
  getEvaluatingFieldLabel,
  suiteEvaluatesToSourceMode,
} from '~/app/utilities/startEvaluationRunUtils';

const PROVIDER_ID_KEY = 'provider_id';

describe('startEvaluationRunUtils', () => {
  describe('suiteEvaluatesToSourceMode', () => {
    it('should map model and agent suite options to source modes', () => {
      expect(suiteEvaluatesToSourceMode('model')).toBe('model');
      expect(suiteEvaluatesToSourceMode('agent')).toBe('agent');
    });

    it('should default non-model suite options to agent', () => {
      expect(suiteEvaluatesToSourceMode('traces')).toBe('agent');
      expect(suiteEvaluatesToSourceMode('guardrails')).toBe('agent');
    });

    it('should support an array of suite evaluates options', () => {
      expect(suiteEvaluatesToSourceMode(['model', 'agent'])).toBe('model');
      expect(suiteEvaluatesToSourceMode([])).toBe('agent');
    });
  });

  describe('getEvaluatingFieldLabel', () => {
    it('should return labels for each source mode', () => {
      expect(getEvaluatingFieldLabel('model')).toBe('Model');
      expect(getEvaluatingFieldLabel('agent')).toBe('Agent');
      expect(getEvaluatingFieldLabel('prerecorded')).toBe('Pre-recorded responses');
    });
  });

  describe('getSourceOptions', () => {
    it('should only offer prerecorded responses for IBM CLEAR benchmarks', () => {
      expect(getSourceOptions({ providerId: 'ibm-clear' })).toContainEqual({
        value: 'prerecorded',
        label: 'Pre-recorded responses',
      });
      expect(getSourceOptions({ providerId: 'lm_evaluation_harness' })).not.toContainEqual({
        value: 'prerecorded',
        label: 'Pre-recorded responses',
      });
    });

    it('should only offer prerecorded responses for all-IBM-CLEAR collections', () => {
      expect(
        getSourceOptions(undefined, {
          benchmarks: [{ id: 'agentic-evaluation', [PROVIDER_ID_KEY]: 'ibm-clear' }],
        }),
      ).toContainEqual({ value: 'prerecorded', label: 'Pre-recorded responses' });
      expect(
        getSourceOptions(undefined, {
          benchmarks: [
            { id: 'agentic-evaluation', [PROVIDER_ID_KEY]: 'ibm-clear' },
            { id: 'arc_easy', [PROVIDER_ID_KEY]: 'lm_evaluation_harness' },
          ],
        }),
      ).not.toContainEqual({ value: 'prerecorded', label: 'Pre-recorded responses' });
    });
  });
});
