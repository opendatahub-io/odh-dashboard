import {
  getEvaluatingFieldLabel,
  suiteEvaluatesToSourceMode,
} from '~/app/utilities/startEvaluationRunUtils';

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
  });

  describe('getEvaluatingFieldLabel', () => {
    it('should return labels for each source mode', () => {
      expect(getEvaluatingFieldLabel('model')).toBe('Model');
      expect(getEvaluatingFieldLabel('agent')).toBe('Agent');
      expect(getEvaluatingFieldLabel('prerecorded')).toBe('Pre-recorded responses');
    });
  });
});
