import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceK8sResource';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
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
} from '../topology';

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
  it('adds config name to baseRefs and stores annotation', () => {
    const deployment = makeDeployment();
    const config = buildTopologyConfig('topo-1', TopologyType.MULTI_NODE);
    const result = applyTopologyConfig(deployment, { selectedConfig: config });

    expect(result.model.spec.baseRefs).toContainEqual({ name: 'topo-1' });
    expect(result.model.metadata.annotations?.[TOPOLOGY_CONFIG_REF_ANNOTATION]).toBe('topo-1');
  });

  it('replaces a previous topology config baseRef', () => {
    const deployment = makeDeployment({
      baseRefs: [{ name: 'old-topo' }],
      annotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: 'old-topo' },
    });
    const config = buildTopologyConfig('new-topo', TopologyType.SINGLE_NODE_DISAGGREGATED);
    const result = applyTopologyConfig(deployment, { selectedConfig: config });

    expect(result.model.spec.baseRefs).toContainEqual({ name: 'new-topo' });
    expect(result.model.spec.baseRefs).not.toContainEqual({ name: 'old-topo' });
    expect(result.model.metadata.annotations?.[TOPOLOGY_CONFIG_REF_ANNOTATION]).toBe('new-topo');
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
    expect(result.model.spec.baseRefs).toContainEqual({ name: 'topo-1' });
  });

  it('does not duplicate an existing baseRef', () => {
    const deployment = makeDeployment({
      baseRefs: [{ name: 'topo-1' }],
      annotations: { [TOPOLOGY_CONFIG_REF_ANNOTATION]: 'topo-1' },
    });
    const config = buildTopologyConfig('topo-1', TopologyType.MULTI_NODE);
    const result = applyTopologyConfig(deployment, { selectedConfig: config });

    const matching = result.model.spec.baseRefs?.filter((r) => r.name === 'topo-1');
    expect(matching).toHaveLength(1);
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
    expect(names.indexOf('topo-1')).toBeLessThan(names.indexOf('router-1'));
  });

  it('coexists with existing accelerator config baseRef', () => {
    let deployment = makeDeployment({ baseRefs: [{ name: 'my-deployment' }] });
    const topoConfig = buildTopologyConfig('topo-1', TopologyType.MULTI_NODE);
    const routerConfig = buildRouterConfig('router-1');

    deployment = applyTopologyConfig(deployment, { selectedConfig: topoConfig });
    deployment = applyRoutingConfig(deployment, { selectedConfig: routerConfig });

    expect(deployment.model.spec.baseRefs).toEqual([
      { name: 'my-deployment' },
      { name: 'topo-1' },
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
