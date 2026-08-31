import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { isConfigReferencedInStatus, isDeletionPendingDueToReferences } from '../utils';

describe('isConfigReferencedInStatus', () => {
  it('should return true when status.referencedBy has entries', () => {
    const config = {
      ...mockLLMInferenceServiceConfigK8sResource({ name: 'router-config' }),
      status: {
        referencedBy: [{ name: 'my-deployment', namespace: 'test-project' }],
      },
    };

    expect(isConfigReferencedInStatus(config)).toBe(true);
  });

  it('should return false when status.referencedBy is empty', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({ name: 'router-config' });

    expect(isConfigReferencedInStatus(config)).toBe(false);
  });
});

describe('isDeletionPendingDueToReferences', () => {
  it('should return true when terminating, finalizer present, and still referenced', () => {
    const config = {
      ...mockLLMInferenceServiceConfigK8sResource({ name: 'router-config' }),
      metadata: {
        ...mockLLMInferenceServiceConfigK8sResource({ name: 'router-config' }).metadata,
        deletionTimestamp: '2026-08-05T12:00:00Z',
        finalizers: ['serving.kserve.io/llmisvcconfig-finalizer'],
      },
      status: {
        referencedBy: [{ name: 'my-deployment', namespace: 'test-project' }],
      },
    };

    expect(isDeletionPendingDueToReferences(config)).toBe(true);
  });

  it('should return false when terminating with finalizer but not referenced', () => {
    const config = {
      ...mockLLMInferenceServiceConfigK8sResource({ name: 'router-config' }),
      metadata: {
        ...mockLLMInferenceServiceConfigK8sResource({ name: 'router-config' }).metadata,
        deletionTimestamp: '2026-08-05T12:00:00Z',
        finalizers: ['serving.kserve.io/llmisvcconfig-finalizer'],
      },
    };

    expect(isDeletionPendingDueToReferences(config)).toBe(false);
  });
});
