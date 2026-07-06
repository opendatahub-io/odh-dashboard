import { mockTrainJobK8sResource } from '../__mocks__/mockTrainJobK8sResource';
import { mockRayJobK8sResource } from '../__mocks__/mockRayJobK8sResource';
import { isRayJob, isTrainJob, UnifiedJobKind } from '../types';

describe('Type guards', () => {
  describe('isRayJob', () => {
    it('should return true for RayJob resources', () => {
      const rayJob = mockRayJobK8sResource({ name: 'test-ray' });
      expect(isRayJob(rayJob as UnifiedJobKind)).toBe(true);
    });

    it('should return false for TrainJob resources', () => {
      const trainJob = mockTrainJobK8sResource({ name: 'test-train' });
      expect(isRayJob(trainJob as UnifiedJobKind)).toBe(false);
    });
  });

  describe('isTrainJob', () => {
    it('should return true for TrainJob resources', () => {
      const trainJob = mockTrainJobK8sResource({ name: 'test-train' });
      expect(isTrainJob(trainJob as UnifiedJobKind)).toBe(true);
    });

    it('should return false for RayJob resources', () => {
      const rayJob = mockRayJobK8sResource({ name: 'test-ray' });
      expect(isTrainJob(rayJob as UnifiedJobKind)).toBe(false);
    });
  });
});
