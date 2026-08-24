import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceK8sResource';
import { ROUTING_CONFIG_REF_ANNOTATION, TOPOLOGY_CONFIG_REF_ANNOTATION } from '../const';
import {
  getDeploymentsReferencingConfig,
  isConfigInUse,
  isConfigReferencedInStatus,
  isDeletionPendingDueToReferences,
  isDeploymentReferencingConfig,
} from '../utils';

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

describe('isConfigInUse', () => {
  it('should prefer live deployment references over stale status.referencedBy', () => {
    const config = {
      ...mockLLMInferenceServiceConfigK8sResource({ name: 'router-config' }),
      status: {
        referencedBy: [{ name: 'my-deployment', namespace: 'test-project' }],
      },
    };

    expect(isConfigInUse(config, [], 'router-config', 'routing')).toBe(false);
  });

  it('should fall back to status.referencedBy when deployment list is unavailable', () => {
    const config = {
      ...mockLLMInferenceServiceConfigK8sResource({ name: 'router-config' }),
      status: {
        referencedBy: [{ name: 'my-deployment', namespace: 'test-project' }],
      },
    };

    expect(isConfigInUse(config, null, 'router-config', 'routing')).toBe(true);
  });
});

describe('isDeletionPendingDueToReferences', () => {
  it('should return true when terminating, finalizer present, and a deployment still references the config', () => {
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
    const deployments = [
      mockLLMInferenceServiceK8sResource({
        name: 'my-deployment',
        additionalAnnotations: { [ROUTING_CONFIG_REF_ANNOTATION]: 'router-config' },
      }),
    ];

    expect(isDeletionPendingDueToReferences(config, deployments, 'router-config', 'routing')).toBe(
      true,
    );
  });

  it('should return false when terminating with finalizer but deployment was removed', () => {
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

    expect(isDeletionPendingDueToReferences(config, [], 'router-config', 'routing')).toBe(false);
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

    expect(isDeletionPendingDueToReferences(config, [], 'router-config', 'routing')).toBe(false);
  });
});

describe('isDeploymentReferencingConfig', () => {
  it('should return true when the routing annotation matches the config name', () => {
    const deployment = mockLLMInferenceServiceK8sResource({
      name: 'my-deployment',
      additionalAnnotations: { [ROUTING_CONFIG_REF_ANNOTATION]: 'router-config' },
    });

    expect(isDeploymentReferencingConfig(deployment, 'router-config', 'routing')).toBe(true);
  });

  it('should return true when the topology annotation matches the config name', () => {
    const deployment = mockLLMInferenceServiceK8sResource({
      name: 'my-deployment',
      additionalAnnotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: 'topo-config' },
    });

    expect(isDeploymentReferencingConfig(deployment, 'topo-config', 'topology')).toBe(true);
  });

  it('should return true when the config name appears in baseRefs', () => {
    const deployment = mockLLMInferenceServiceK8sResource({
      name: 'my-deployment',
      baseRefs: [{ name: 'legacy-config' }],
    });

    expect(isDeploymentReferencingConfig(deployment, 'legacy-config', 'routing')).toBe(true);
  });

  it('should return true when the topology annotation references a local copy of the config', () => {
    const deployment = mockLLMInferenceServiceK8sResource({
      name: 'my-deployment',
      additionalAnnotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: 'my-deployment-topo-config' },
    });

    expect(isDeploymentReferencingConfig(deployment, 'topo-config', 'topology')).toBe(true);
  });

  it('should return false when no annotation or baseRef matches', () => {
    const deployment = mockLLMInferenceServiceK8sResource({
      name: 'my-deployment',
      additionalAnnotations: { [ROUTING_CONFIG_REF_ANNOTATION]: 'other-config' },
      baseRefs: [{ name: 'unrelated-config' }],
    });

    expect(isDeploymentReferencingConfig(deployment, 'router-config', 'routing')).toBe(false);
  });
});

describe('getDeploymentsReferencingConfig', () => {
  it('should return only deployments referencing the config', () => {
    const referencing = mockLLMInferenceServiceK8sResource({
      name: 'deployment-a',
      additionalAnnotations: { [ROUTING_CONFIG_REF_ANNOTATION]: 'router-config' },
    });
    const unrelated = mockLLMInferenceServiceK8sResource({
      name: 'deployment-b',
      additionalAnnotations: { [ROUTING_CONFIG_REF_ANNOTATION]: 'other-config' },
    });

    expect(
      getDeploymentsReferencingConfig([referencing, unrelated], 'router-config', 'routing'),
    ).toEqual([referencing]);
  });
});
