import { getEvaluatingFieldLabel } from '~/app/utilities/startEvaluationRunUtils';

describe('startEvaluationRunUtils', () => {
  describe('getEvaluatingFieldLabel', () => {
    it('should return labels for each source mode', () => {
      expect(getEvaluatingFieldLabel('model')).toBe('Model');
      expect(getEvaluatingFieldLabel('agent')).toBe('Agent');
      expect(getEvaluatingFieldLabel('prerecorded')).toBe('Pre-recorded responses');
    });
  });
});
