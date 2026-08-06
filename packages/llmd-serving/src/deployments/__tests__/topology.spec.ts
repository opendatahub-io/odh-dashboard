import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceK8sResource';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { K8sStatusError } from '@odh-dashboard/k8s-core';
import {
  TOPOLOGY_TYPE_ANNOTATION,
  TOPOLOGY_CONFIG_REF_ANNOTATION,
  ROUTING_CONFIG_REF_ANNOTATION,
  TopologyType,
  type LLMdDeployment,
  type LLMInferenceServiceKind,
} from '../../types';
import {
  applyTopologyType,
  applyTopologyConfig,
  applyRoutingConfig,
  extractTopologyType,
  extractTopologyConfig,
  extractRoutingConfig,
  preDeployTopologyConfig,
} from '../topology';
import { createLLMInferenceServiceConfig } from '../../api/LLMInferenceServiceConfigs';

jest.mock('../../api/LLMInferenceServiceConfigs', () => ({
  createLLMInferenceServiceConfig: jest.fn(),
  deleteLLMInferenceServiceConfig: jest.fn(),
}));

const mockCreateConfig = jest.mocked(createLLMInferenceServiceConfig);

const makeDeployment = (
  overrides?: Partial<{
    baseRefs: LLMInferenceServiceKind['spec']['baseRefs'];
    annotations: Record<string, string>;
  }>,
): LLMdDeployment => {
  const model = mockLLMInferenceServiceK8sResource({});
  if (overrides?.baseRefs) {
    model.spec.baseRefs = overrides.baseRefs;
  }
  if (overrides?.annotations) {
    model.metadata.annotations = { ...model.metadata.annotations, ...overrides.annotations };
  }
  return { modelServingPlatformId: 'llmd-serving', model };
};

const DEPLOYMENT_NAME = 'test-llm-inference-service';

/** Topology configs are copied into the deployment's namespace under a deployment-prefixed name. */
const localConfigName = (configName: string) => `${DEPLOYMENT_NAME}-${configName}`;

const buildTopologyConfig = (name: string, topologyType: TopologyType) =>
  mockLLMInferenceServiceConfigK8sResource({
    name,
    displayName: `Topology ${name}`,
    topologyType,
  });

const buildRouterConfig = (name: string) =>
  mockLLMInferenceServiceConfigK8sResource({
    name,
    displayName: `Router ${name}`,
    configType: 'router' as never,
  });

// ─── applyTopologyType ─────────────────────────────────────────────────────────

describe('applyTopologyType', () => {
  it('sets the topology-type annotation', () => {
    const deployment = makeDeployment();
    const result = applyTopologyType(deployment, {
      topologyType: TopologyType.MULTI_NODE,
    });
    expect(result.model.metadata.annotations?.[TOPOLOGY_TYPE_ANNOTATION]).toBe(
      TopologyType.MULTI_NODE,
    );
  });

  it('overwrites a previous topology-type annotation', () => {
    const deployment = makeDeployment({
      annotations: { [TOPOLOGY_TYPE_ANNOTATION]: TopologyType.SINGLE_NODE },
    });
    const result = applyTopologyType(deployment, {
      topologyType: TopologyType.MULTI_NODE_DISAGGREGATED,
    });
    expect(result.model.metadata.annotations?.[TOPOLOGY_TYPE_ANNOTATION]).toBe(
      TopologyType.MULTI_NODE_DISAGGREGATED,
    );
  });

  it('returns the deployment unchanged when fieldData is undefined', () => {
    const deployment = makeDeployment();
    const result = applyTopologyType(deployment);
    expect(result).toEqual(deployment);
  });

  it('does not mutate the original deployment', () => {
    const deployment = makeDeployment();
    applyTopologyType(deployment, { topologyType: TopologyType.MULTI_NODE });
    expect(deployment.model.metadata.annotations?.[TOPOLOGY_TYPE_ANNOTATION]).toBeUndefined();
  });
});

// ─── applyTopologyConfig ────────────────────────────────────────────────────────

describe('applyTopologyConfig', () => {
  it('adds the local config copy name to baseRefs and stores annotation', () => {
    const deployment = makeDeployment();
    const config = buildTopologyConfig('topo-1', TopologyType.MULTI_NODE);
    const result = applyTopologyConfig(deployment, { selectedConfig: config });

    expect(result.model.spec.baseRefs).toContainEqual({ name: localConfigName('topo-1') });
    expect(result.model.metadata.annotations?.[TOPOLOGY_CONFIG_REF_ANNOTATION]).toBe(
      localConfigName('topo-1'),
    );
  });

  it('replaces a previous topology config baseRef', () => {
    const deployment = makeDeployment({
      baseRefs: [{ name: 'old-topo' }],
      annotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: 'old-topo' },
    });
    const config = buildTopologyConfig('new-topo', TopologyType.SINGLE_NODE_DISAGGREGATED);
    const result = applyTopologyConfig(deployment, { selectedConfig: config });

    expect(result.model.spec.baseRefs).toContainEqual({ name: localConfigName('new-topo') });
    expect(result.model.spec.baseRefs).not.toContainEqual({ name: 'old-topo' });
    expect(result.model.metadata.annotations?.[TOPOLOGY_CONFIG_REF_ANNOTATION]).toBe(
      localConfigName('new-topo'),
    );
  });

  it('removes the topology baseRef when no config is selected', () => {
    const deployment = makeDeployment({
      baseRefs: [{ name: 'topo-1' }],
      annotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: 'topo-1' },
    });
    const result = applyTopologyConfig(deployment, { selectedConfig: undefined });

    expect(result.model.spec.baseRefs).not.toContainEqual({ name: 'topo-1' });
    expect(result.model.metadata.annotations?.[TOPOLOGY_CONFIG_REF_ANNOTATION]).toBeUndefined();
  });

  it('preserves unrelated baseRefs', () => {
    const deployment = makeDeployment({
      baseRefs: [{ name: 'my-deployment' }, { name: 'some-other-ref' }],
    });
    const config = buildTopologyConfig('topo-1', TopologyType.MULTI_NODE);
    const result = applyTopologyConfig(deployment, { selectedConfig: config });

    expect(result.model.spec.baseRefs).toContainEqual({ name: 'my-deployment' });
    expect(result.model.spec.baseRefs).toContainEqual({ name: 'some-other-ref' });
    expect(result.model.spec.baseRefs).toContainEqual({ name: localConfigName('topo-1') });
  });

  it('does not duplicate an existing baseRef', () => {
    const deployment = makeDeployment({
      baseRefs: [{ name: localConfigName('topo-1') }],
      annotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: localConfigName('topo-1') },
    });
    const config = buildTopologyConfig('topo-1', TopologyType.MULTI_NODE);
    const result = applyTopologyConfig(deployment, { selectedConfig: config });

    const matching = result.model.spec.baseRefs?.filter(
      (r) => r.name === localConfigName('topo-1'),
    );
    expect(matching).toHaveLength(1);
  });

  it('does not re-prefix a config that is already a local copy', () => {
    const deployment = makeDeployment();
    const config = buildTopologyConfig(localConfigName('topo-1'), TopologyType.MULTI_NODE);
    const result = applyTopologyConfig(deployment, { selectedConfig: config });

    expect(result.model.spec.baseRefs).toEqual([{ name: localConfigName('topo-1') }]);
    expect(result.model.metadata.annotations?.[TOPOLOGY_CONFIG_REF_ANNOTATION]).toBe(
      localConfigName('topo-1'),
    );
  });

  it('truncates the local copy name to the k8s name length limit', () => {
    const deployment = makeDeployment();
    const config = buildTopologyConfig('a'.repeat(250), TopologyType.MULTI_NODE);
    const result = applyTopologyConfig(deployment, { selectedConfig: config });

    const name = result.model.metadata.annotations?.[TOPOLOGY_CONFIG_REF_ANNOTATION];
    expect(name).toHaveLength(253);
    expect(name).toEqual(expect.stringMatching(new RegExp(`^${DEPLOYMENT_NAME}-a+$`)));
    expect(result.model.spec.baseRefs).toContainEqual({ name });
  });

  it('does not leave a trailing hyphen when truncating the local copy name', () => {
    const deployment = makeDeployment();
    // Positions the cut directly after a hyphen: prefix (27) + 225 chars + '-' === 253
    const config = buildTopologyConfig(
      `${'a'.repeat(225)}-${'b'.repeat(30)}`,
      TopologyType.MULTI_NODE,
    );
    const result = applyTopologyConfig(deployment, { selectedConfig: config });

    const name = result.model.metadata.annotations?.[TOPOLOGY_CONFIG_REF_ANNOTATION];
    expect(name).toBe(`${DEPLOYMENT_NAME}-${'a'.repeat(225)}`);
    expect(name).not.toMatch(/-$/);
  });

  it('does not mutate the original deployment', () => {
    const deployment = makeDeployment();
    const config = buildTopologyConfig('topo-1', TopologyType.MULTI_NODE);
    applyTopologyConfig(deployment, { selectedConfig: config });

    expect(deployment.model.spec.baseRefs).toBeUndefined();
    expect(deployment.model.metadata.annotations?.[TOPOLOGY_CONFIG_REF_ANNOTATION]).toBeUndefined();
  });

  it('returns deployment unchanged when configRef is set but selectedConfig is not resolved', () => {
    const deployment = makeDeployment({
      baseRefs: [{ name: 'existing-topo' }],
      annotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: 'existing-topo' },
    });
    const result = applyTopologyConfig(deployment, { configRef: 'existing-topo' });

    expect(result.model.spec.baseRefs).toContainEqual({ name: 'existing-topo' });
    expect(result.model.metadata.annotations?.[TOPOLOGY_CONFIG_REF_ANNOTATION]).toBe(
      'existing-topo',
    );
  });
});

// ─── applyRoutingConfig ─────────────────────────────────────────────────────────

describe('applyRoutingConfig', () => {
  it('adds config name to baseRefs and stores annotation', () => {
    const deployment = makeDeployment();
    const config = buildRouterConfig('router-1');
    const result = applyRoutingConfig(deployment, { selectedConfig: config });

    expect(result.model.spec.baseRefs).toContainEqual({ name: 'router-1' });
    expect(result.model.metadata.annotations?.[ROUTING_CONFIG_REF_ANNOTATION]).toBe('router-1');
  });

  it('replaces a previous routing config baseRef', () => {
    const deployment = makeDeployment({
      baseRefs: [{ name: 'old-router' }],
      annotations: { [ROUTING_CONFIG_REF_ANNOTATION]: 'old-router' },
    });
    const config = buildRouterConfig('new-router');
    const result = applyRoutingConfig(deployment, { selectedConfig: config });

    expect(result.model.spec.baseRefs).toContainEqual({ name: 'new-router' });
    expect(result.model.spec.baseRefs).not.toContainEqual({ name: 'old-router' });
  });

  it('removes the routing baseRef when no config is selected', () => {
    const deployment = makeDeployment({
      baseRefs: [{ name: 'router-1' }],
      annotations: { [ROUTING_CONFIG_REF_ANNOTATION]: 'router-1' },
    });
    const result = applyRoutingConfig(deployment, { selectedConfig: undefined });

    expect(result.model.spec.baseRefs).not.toContainEqual({ name: 'router-1' });
    expect(result.model.metadata.annotations?.[ROUTING_CONFIG_REF_ANNOTATION]).toBeUndefined();
  });

  it('does not mutate the original deployment', () => {
    const deployment = makeDeployment();
    const config = buildRouterConfig('router-1');
    applyRoutingConfig(deployment, { selectedConfig: config });

    expect(deployment.model.spec.baseRefs).toBeUndefined();
  });

  it('returns deployment unchanged when configRef is set but selectedConfig is not resolved', () => {
    const deployment = makeDeployment({
      baseRefs: [{ name: 'existing-router' }],
      annotations: { [ROUTING_CONFIG_REF_ANNOTATION]: 'existing-router' },
    });
    const result = applyRoutingConfig(deployment, { configRef: 'existing-router' });

    expect(result.model.spec.baseRefs).toContainEqual({ name: 'existing-router' });
    expect(result.model.metadata.annotations?.[ROUTING_CONFIG_REF_ANNOTATION]).toBe(
      'existing-router',
    );
  });
});

// ─── Ordering: topology before routing ──────────────────────────────────────────

describe('baseRefs ordering', () => {
  it('topology baseRef appears before routing baseRef when both are applied in sequence', () => {
    let deployment = makeDeployment();
    const topoConfig = buildTopologyConfig('topo-1', TopologyType.MULTI_NODE);
    const routerConfig = buildRouterConfig('router-1');

    deployment = applyTopologyConfig(deployment, { selectedConfig: topoConfig });
    deployment = applyRoutingConfig(deployment, { selectedConfig: routerConfig });

    const names = deployment.model.spec.baseRefs?.map((r) => r.name) ?? [];
    expect(names.indexOf(localConfigName('topo-1'))).toBeLessThan(names.indexOf('router-1'));
  });

  it('coexists with existing accelerator config baseRef', () => {
    let deployment = makeDeployment({ baseRefs: [{ name: 'my-deployment' }] });
    const topoConfig = buildTopologyConfig('topo-1', TopologyType.MULTI_NODE);
    const routerConfig = buildRouterConfig('router-1');

    deployment = applyTopologyConfig(deployment, { selectedConfig: topoConfig });
    deployment = applyRoutingConfig(deployment, { selectedConfig: routerConfig });

    expect(deployment.model.spec.baseRefs).toEqual([
      { name: 'my-deployment' },
      { name: localConfigName('topo-1') },
      { name: 'router-1' },
    ]);
  });
});

// ─── extractTopologyType ────────────────────────────────────────────────────────

describe('extractTopologyType', () => {
  it('returns the topology type from annotation', () => {
    const deployment = makeDeployment({
      annotations: { [TOPOLOGY_TYPE_ANNOTATION]: TopologyType.MULTI_NODE },
    });
    expect(extractTopologyType(deployment)).toEqual({
      topologyType: TopologyType.MULTI_NODE,
    });
  });

  it('returns undefined when no topology-type annotation exists', () => {
    const deployment = makeDeployment();
    expect(extractTopologyType(deployment)).toBeUndefined();
  });

  it('returns undefined for an invalid topology type value', () => {
    const deployment = makeDeployment({
      annotations: { [TOPOLOGY_TYPE_ANNOTATION]: 'invalid-value' },
    });
    expect(extractTopologyType(deployment)).toBeUndefined();
  });
});

// ─── extractTopologyConfig ──────────────────────────────────────────────────────

describe('extractTopologyConfig', () => {
  it('returns the config ref name from annotation', () => {
    const deployment = makeDeployment({
      annotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: 'topo-config-1' },
    });
    expect(extractTopologyConfig(deployment)).toEqual({ configRef: 'topo-config-1' });
  });

  it('returns undefined when no annotation exists', () => {
    const deployment = makeDeployment();
    expect(extractTopologyConfig(deployment)).toBeUndefined();
  });
});

// ─── preDeploy config copies ───────────────────────────────────────────────────

describe('preDeploy config copies', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wizardState = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateConfig.mockResolvedValue(mockLLMInferenceServiceConfigK8sResource({}));
  });

  it('carries the config type label onto the topology config copy', async () => {
    const topologyConfig = buildTopologyConfig('topo-1', TopologyType.SINGLE_NODE);
    expect(topologyConfig.metadata.labels?.['opendatahub.io/config-type']).toBe(
      TopologyType.SINGLE_NODE,
    );

    let deployment = makeDeployment();
    deployment = applyTopologyConfig(deployment, { selectedConfig: topologyConfig });
    await preDeployTopologyConfig({ selectedConfig: topologyConfig }, wizardState, deployment);

    expect(mockCreateConfig).toHaveBeenCalledTimes(1);
    const created = mockCreateConfig.mock.calls[0][0];
    expect(created.metadata.labels?.['opendatahub.io/config-type']).toBe(TopologyType.SINGLE_NODE);
  });

  it('does not carry the dashboard label onto the copy', async () => {
    const topologyConfig = buildTopologyConfig('topo-1', TopologyType.SINGLE_NODE);

    let deployment = makeDeployment();
    deployment = applyTopologyConfig(deployment, { selectedConfig: topologyConfig });
    await preDeployTopologyConfig({ selectedConfig: topologyConfig }, wizardState, deployment);

    const created = mockCreateConfig.mock.calls[0][0];
    expect(created.metadata.labels?.['opendatahub.io/dashboard']).toBeUndefined();
  });

  it('marks the copy as a local copy in its display name', async () => {
    const topologyConfig = buildTopologyConfig('topo-1', TopologyType.SINGLE_NODE);

    let deployment = makeDeployment();
    deployment = applyTopologyConfig(deployment, { selectedConfig: topologyConfig });
    await preDeployTopologyConfig({ selectedConfig: topologyConfig }, wizardState, deployment);

    const created = mockCreateConfig.mock.calls[0][0];
    expect(created.metadata.annotations?.['openshift.io/display-name']).toBe(
      'Topology topo-1 (Local Copy)',
    );
  });

  it('recreates the copy when editing without changing the selected config', async () => {
    const topologyConfig = buildTopologyConfig('topo-1', TopologyType.SINGLE_NODE);
    const configRef = localConfigName('topo-1');

    const existingDeployment = makeDeployment({
      annotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: configRef },
    });
    let deployment = makeDeployment();
    deployment = applyTopologyConfig(deployment, { selectedConfig: topologyConfig });

    await preDeployTopologyConfig(
      { selectedConfig: topologyConfig },
      wizardState,
      deployment,
      existingDeployment,
    );

    expect(mockCreateConfig).toHaveBeenCalledTimes(1);
    expect(mockCreateConfig.mock.calls[0][0].metadata.name).toBe(configRef);
  });

  it('tolerates a 409 when the local copy already exists', async () => {
    const topologyConfig = buildTopologyConfig('topo-1', TopologyType.SINGLE_NODE);
    mockCreateConfig.mockRejectedValue(
      new K8sStatusError({
        apiVersion: 'v1',
        kind: 'Status',
        status: 'Failure',
        code: 409,
        message: 'already exists',
        reason: 'AlreadyExists',
      }),
    );

    let deployment = makeDeployment();
    deployment = applyTopologyConfig(deployment, { selectedConfig: topologyConfig });

    await expect(
      preDeployTopologyConfig({ selectedConfig: topologyConfig }, wizardState, deployment),
    ).resolves.toBe(deployment);
  });
});

// ─── extractRoutingConfig ───────────────────────────────────────────────────────

describe('extractRoutingConfig', () => {
  it('returns the config ref name from annotation', () => {
    const deployment = makeDeployment({
      annotations: { [ROUTING_CONFIG_REF_ANNOTATION]: 'router-config-1' },
    });
    expect(extractRoutingConfig(deployment)).toEqual({ configRef: 'router-config-1' });
  });

  it('returns undefined when no annotation exists', () => {
    const deployment = makeDeployment();
    expect(extractRoutingConfig(deployment)).toBeUndefined();
  });
});
