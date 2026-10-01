import * as React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import {
  HostApiCoreContext,
  PluginCapabilities,
  type HostApiCoreServices,
} from '@odh-dashboard/plugin-core/host-api';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import extensions, { LLMD_SERVING_ID } from '../extensions';
import { LLM_ACCELERATOR_CONFIGS_TAB_PATH } from '../../src/settings/llmAcceleratorConfigs/paths';
import { TOPOLOGY_CONFIGS_TAB_PATH } from '../../src/settings/topologyConfigs/paths';
import { ROUTING_CONFIGS_TAB_PATH } from '../../src/settings/routingConfigs/paths';

const routeExtensions = extensions.filter((extension) => extension.type === 'app.route');

// Mount the actual llmd declaration under the same capability boundary used by hosts.
const CapabilityHost: React.FC<{
  store: PluginStore;
  services: Pick<HostApiCoreServices, 'discoverResource' | 'reviewAccess'>;
}> = ({ store, services }) => {
  const defaults = React.useContext(HostApiCoreContext);
  const core = React.useMemo(() => ({ ...defaults, ...services }), [defaults, services]);
  return React.createElement(
    PluginStoreProvider,
    { store },
    React.createElement(
      HostApiCoreContext.Provider,
      { value: core },
      React.createElement(
        PluginCapabilities,
        {
          namespaceCandidates: { namespaces: [], loaded: false },
          fallback: 'Checking capabilities',
        },
        'Unrelated page',
      ),
    ),
  );
};

describe('llmd-serving activation', () => {
  it('should depend on the serving hub, not another serving spoke', () => {
    const area = extensions.find(
      (extension) => extension.type === 'app.area' && extension.properties.id === 'llmd-serving',
    );
    expect(area?.properties).toMatchObject({ reliantAreas: [SupportedArea.MODEL_SERVING] });
  });

  it('should declare its own API and project-scoped watch capability', () => {
    const capability = extensions.find((extension) => extension.type === 'app.resource-capability');
    expect(capability?.flags).toEqual({
      required: [LLMD_SERVING_ID, SupportedArea.MODEL_SERVING],
    });
    expect(capability?.properties).toEqual({
      id: 'llm-inference-services',
      resource: {
        group: 'serving.kserve.io',
        version: 'v1alpha2',
        resource: 'llminferenceservices',
      },
      namespaceScope: 'any',
      permissions: ['list', 'watch'].map((verb) => ({
        group: 'serving.kserve.io',
        resource: 'llminferenceservices',
        verb,
      })),
    });
  });

  it.each([
    [undefined, undefined],
    [false, false],
    [false, true],
    [true, false],
  ])(
    'should render unrelated pages without discovery or SSAR when llmd=%s and model-serving=%s',
    (llmd, modelServing) => {
      const store = new PluginStore({ [LLMD_SERVING_ID]: extensions });
      if (llmd !== undefined) {
        store.setFeatureFlags({ [LLMD_SERVING_ID]: llmd });
      }
      if (modelServing !== undefined) {
        store.setFeatureFlags({ [SupportedArea.MODEL_SERVING]: modelServing });
      }
      const services = {
        discoverResource: jest.fn().mockResolvedValue(true),
        reviewAccess: jest.fn().mockResolvedValue(false),
      };
      render(React.createElement(CapabilityHost, { store, services }));

      expect(screen.getByText('Unrelated page')).toBeVisible();
      expect(screen.queryByText('Checking capabilities')).toBeNull();
      expect(services.discoverResource).not.toHaveBeenCalled();
      expect(services.reviewAccess).not.toHaveBeenCalled();
      // Area metadata must remain visible so hosts can resolve feature flags.
      expect(store.getExtensions().some((extension) => extension.type === 'app.area')).toBe(true);
    },
  );

  it('should check enabled llmd and release unrelated pages if it is disabled while projects load', async () => {
    const store = new PluginStore({ [LLMD_SERVING_ID]: extensions });
    store.setFeatureFlags({ [LLMD_SERVING_ID]: true, [SupportedArea.MODEL_SERVING]: true });
    const services = {
      discoverResource: jest.fn().mockResolvedValue(true),
      reviewAccess: jest.fn().mockResolvedValue(false),
    };
    render(React.createElement(CapabilityHost, { store, services }));

    await waitFor(() => expect(services.reviewAccess).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Checking capabilities')).toBeVisible();
    expect(screen.queryByText('Unrelated page')).toBeNull();
    act(() => store.setFeatureFlags({ [LLMD_SERVING_ID]: false }));
    expect(screen.getByText('Unrelated page')).toBeVisible();
    expect(screen.queryByText('Checking capabilities')).toBeNull();
  });

  it('should still require API discovery and both operation-specific grants when enabled', async () => {
    const store = new PluginStore({ [LLMD_SERVING_ID]: extensions });
    store.setFeatureFlags({ [LLMD_SERVING_ID]: true, [SupportedArea.MODEL_SERVING]: true });
    const services = {
      discoverResource: jest.fn().mockResolvedValue(true),
      reviewAccess: jest.fn().mockResolvedValue(true),
    };
    render(React.createElement(CapabilityHost, { store, services }));
    await waitFor(() => expect(screen.getByText('Unrelated page')).toBeVisible());
    expect(services.discoverResource).toHaveBeenCalledWith(
      { group: 'serving.kserve.io', version: 'v1alpha2', resource: 'llminferenceservices' },
      { signal: expect.any(AbortSignal) },
    );
    ['list', 'watch'].forEach((verb) =>
      expect(services.reviewAccess).toHaveBeenCalledWith(
        {
          group: 'serving.kserve.io',
          resource: 'llminferenceservices',
          verb,
          namespace: undefined,
        },
        { signal: expect.any(AbortSignal) },
      ),
    );
    expect(store.getPluginCapabilityState(LLMD_SERVING_ID, 'llm-inference-services')).toBe(
      'available',
    );
  });
});

const acceleratorTab = extensions.find(
  (extension) =>
    extension.type === 'app.tab-route/tab' &&
    extension.properties.id === 'llm-accelerator-configurations',
);

const acceleratorFormPaths = [
  `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/add`,
  `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/edit/:configName`,
  `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/duplicate/:configName`,
];

describe('LLM accelerator configuration extensions', () => {
  it('should register the accelerator tab on the model deployment settings page', () => {
    expect(acceleratorTab).toBeDefined();
    expect(acceleratorTab?.properties).toEqual(
      expect.objectContaining({
        pageId: 'model-deployment-settings',
        id: 'llm-accelerator-configurations',
        title: 'LLM accelerator configurations',
        group: '3_accelerator',
      }),
    );
  });

  it('should gate the accelerator tab on its own feature areas only', () => {
    expect(acceleratorTab?.flags).toEqual({
      required: ['llmd-serving', 'ADMIN_USER', 'vllm-on-maas'],
    });
  });

  // The forms must not be tab content: TabRoutePage renders tab content beneath the
  // page title and tab bar, which would leave the form with two page headings.
  it('should register the form routes as standalone breakout routes outside the tab', () => {
    const paths = routeExtensions.map((extension) => extension.properties.path);

    acceleratorFormPaths.forEach((formPath) => {
      expect(paths).toContain(formPath);
    });
  });

  it('should gate the breakout form routes exactly as the tab is gated', () => {
    const formRoutes = routeExtensions.filter((extension) =>
      acceleratorFormPaths.includes(extension.properties.path),
    );

    expect(formRoutes).toHaveLength(acceleratorFormPaths.length);
    formRoutes.forEach((route) => {
      expect(route.flags).toEqual(acceleratorTab?.flags);
    });
  });

  it('should redirect the old standalone accelerator URL to the tab', () => {
    const redirectRoute = routeExtensions.find(
      (extension) =>
        extension.properties.path ===
        '/settings/model-resources-operations/llm-accelerator-configs/*',
    );

    expect(redirectRoute).toBeDefined();
    expect(redirectRoute?.flags).toEqual({
      required: ['llmd-serving', 'ADMIN_USER', 'vllm-on-maas'],
    });
  });
});

describe('llm-d topology configuration extensions', () => {
  const topologyTab = extensions.find(
    (extension) =>
      extension.type === 'app.tab-route/tab' &&
      extension.properties.id === 'topology-configurations',
  );

  const topologyFormPaths = [
    `${TOPOLOGY_CONFIGS_TAB_PATH}/add/:topologyType`,
    `${TOPOLOGY_CONFIGS_TAB_PATH}/edit/:configName`,
    `${TOPOLOGY_CONFIGS_TAB_PATH}/duplicate/:configName`,
  ];

  it('should register the topology tab on the model deployment settings page', () => {
    expect(topologyTab).toBeDefined();
    expect(topologyTab?.properties).toEqual(
      expect.objectContaining({
        pageId: 'model-deployment-settings',
        id: 'topology-configurations',
        title: 'llm-d topology configurations',
        group: '4_topology',
      }),
    );
  });

  it('should gate the topology tab on its own feature areas only', () => {
    expect(topologyTab?.flags).toEqual({
      required: ['llmd-topology-configs', 'ADMIN_USER'],
    });
  });

  // The forms must not be tab content: TabRoutePage renders tab content beneath the
  // page title and tab bar, which would leave the form with two page headings.
  it('should register the form routes as standalone breakout routes outside the tab', () => {
    const paths = routeExtensions.map((extension) => extension.properties.path);

    topologyFormPaths.forEach((formPath) => {
      expect(paths).toContain(formPath);
    });
  });

  it('should gate the breakout form routes exactly as the tab is gated', () => {
    const formRoutes = routeExtensions.filter((extension) =>
      topologyFormPaths.includes(extension.properties.path),
    );

    expect(formRoutes).toHaveLength(topologyFormPaths.length);
    formRoutes.forEach((route) => {
      expect(route.flags).toEqual(topologyTab?.flags);
    });
  });

  it('should redirect the old standalone topology URL to the tab', () => {
    const redirectRoute = routeExtensions.find(
      (extension) =>
        extension.properties.path ===
        '/settings/model-resources-operations/llmd-topology-configurations/*',
    );

    expect(redirectRoute).toBeDefined();
    expect(redirectRoute?.flags).toEqual({
      required: ['llmd-topology-configs', 'ADMIN_USER'],
    });
  });
});

describe('llm-d routing configuration extensions', () => {
  const routingTab = extensions.find(
    (extension) =>
      extension.type === 'app.tab-route/tab' &&
      extension.properties.id === 'routing-configurations',
  );

  const routingFormPaths = [
    `${ROUTING_CONFIGS_TAB_PATH}/add`,
    `${ROUTING_CONFIGS_TAB_PATH}/edit/:configName`,
    `${ROUTING_CONFIGS_TAB_PATH}/duplicate/:configName`,
  ];

  it('should register the routing tab on the model deployment settings page', () => {
    expect(routingTab).toBeDefined();
    expect(routingTab?.properties).toEqual(
      expect.objectContaining({
        pageId: 'model-deployment-settings',
        id: 'routing-configurations',
        title: 'llm-d routing configurations',
        group: '5_routing',
      }),
    );
  });

  it('should gate the routing tab on its own feature areas only', () => {
    expect(routingTab?.flags).toEqual({
      required: ['llmd-topology-configs', 'ADMIN_USER'],
    });
  });

  // The forms must not be tab content: TabRoutePage renders tab content beneath the
  // page title and tab bar, which would leave the form with two page headings.
  it('should register the form routes as standalone breakout routes outside the tab', () => {
    const paths = routeExtensions.map((extension) => extension.properties.path);

    routingFormPaths.forEach((formPath) => {
      expect(paths).toContain(formPath);
    });
  });

  it('should gate the breakout form routes exactly as the tab is gated', () => {
    const formRoutes = routeExtensions.filter((extension) =>
      routingFormPaths.includes(extension.properties.path),
    );

    expect(formRoutes).toHaveLength(routingFormPaths.length);
    formRoutes.forEach((route) => {
      expect(route.flags).toEqual(routingTab?.flags);
    });
  });

  it('should redirect the old standalone routing URL to the tab', () => {
    const redirectRoute = routeExtensions.find(
      (extension) =>
        extension.properties.path ===
        '/settings/model-resources-operations/llmd-routing-configurations/*',
    );

    expect(redirectRoute).toBeDefined();
    expect(redirectRoute?.flags).toEqual({
      required: ['llmd-topology-configs', 'ADMIN_USER'],
    });
  });
});

const getFieldIdForApplyExtension = (ext: unknown): string | undefined => {
  const e = ext as { type?: string; properties?: { fieldId?: string } };
  return e.type === 'model-serving.deployment/wizard-field-apply'
    ? e.properties?.fieldId
    : undefined;
};

describe('llmd-serving apply extension ordering', () => {
  it('registers the accelerator apply after the topology config apply', () => {
    const applyIds = extensions.map(getFieldIdForApplyExtension).filter(Boolean) as string[];
    const topoIdx = applyIds.indexOf('llmd-serving/custom-topology-config');
    const accelIdx = applyIds.indexOf('llmd-serving/accelerator-config');
    expect(topoIdx).toBeGreaterThanOrEqual(0);
    expect(accelIdx).toBeGreaterThan(topoIdx);
  });
});
