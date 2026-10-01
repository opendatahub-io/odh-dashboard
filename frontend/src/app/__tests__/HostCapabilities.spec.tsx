import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import { commonFetch, k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import HostApiProvider, { HostCapabilities } from '#~/app/HostApiProvider';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  commonFetch: jest.fn(),
  k8sCreateResource: jest.fn(),
}));
jest.mock('#~/redux/selectors/project', () => ({
  useDashboardNamespace: () => ({ dashboardNamespace: 'operator-ns' }),
}));
jest.mock('#~/redux/selectors', () => ({ useUser: () => ({ username: 'caller' }) }));

const Host: React.FC<{ store: PluginStore; namespaces?: string[] }> = ({
  store,
  namespaces = ['project-a'],
}) => {
  const defaults = React.useContext(ProjectsContext);
  const projects = React.useMemo(
    () => ({
      ...defaults,
      projects: namespaces.map((k8sName) => mockProjectK8sResource({ k8sName })),
      loaded: true,
      loadError: undefined,
    }),
    [defaults, namespaces],
  );
  return (
    <PluginStoreProvider store={store}>
      <ProjectsContext.Provider value={projects}>
        <HostApiProvider>
          <HostCapabilities>
            <input data-testid="unsaved-form" defaultValue="" />
          </HostCapabilities>
        </HostApiProvider>
      </ProjectsContext.Provider>
    </PluginStoreProvider>
  );
};

const createStore = () =>
  new PluginStore({
    llmd: [
      {
        type: 'app.resource-capability',
        properties: {
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
        },
      },
      { type: 'app.route', properties: { path: '/llmd' } },
    ],
  });

describe('RHOAI capability integration', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ kube: { namespace: 'operator-ns' } }),
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it.each(['available', 'missing', 'forbidden', 'discovery-error', 'ssar-error'] as const)(
    'should gate the owning plugin for %s through actual host services',
    async (state) => {
      const store = createStore();
      jest.mocked(commonFetch).mockImplementation(async () => {
        if (state === 'discovery-error') {
          throw new Error('Discovery failed');
        }
        return {
          ok: true,
          json: async () => ({
            resources: state === 'missing' ? [] : [{ name: 'llminferenceservices' }],
          }),
        } as Response;
      });
      jest.mocked(k8sCreateResource).mockImplementation(async ({ resource }) => {
        if (state === 'ssar-error') {
          throw new Error('SSAR failed');
        }
        const attrs = resource.spec?.resourceAttributes as AccessReviewResourceAttributes;
        return {
          status: {
            allowed: state !== 'forbidden' && attrs.namespace === 'project-a',
          },
        };
      });
      const { rerender } = render(<Host store={store} />);
      expect(store.getPluginCapabilityState('llmd', 'llm-inference-services')).toBe('loading');
      const expected = state.endsWith('-error') ? 'error' : state;
      await waitFor(() =>
        expect(store.getPluginCapabilityState('llmd', 'llm-inference-services')).toBe(expected),
      );
      expect(store.getExtensions().some((extension) => extension.type === 'app.route')).toBe(
        state === 'available',
      );
      if (state === 'available') {
        expect(k8sCreateResource).toHaveBeenCalledWith(
          expect.objectContaining({
            resource: expect.objectContaining({
              spec: {
                resourceAttributes: {
                  group: 'serving.kserve.io',
                  resource: 'llminferenceservices',
                  verb: 'watch',
                  namespace: 'project-a',
                },
              },
            }),
          }),
        );
        const calls = jest.mocked(k8sCreateResource).mock.calls.length;
        rerender(<Host store={store} namespaces={['project-a', 'project-a']} />);
        await act(() => Promise.resolve());
        expect(store.getPluginCapabilityState('llmd', 'llm-inference-services')).toBe('available');
        expect(commonFetch).toHaveBeenCalledTimes(1);
        expect(k8sCreateResource).toHaveBeenCalledTimes(calls);
        const input = screen.getByTestId<HTMLInputElement>('unsaved-form');
        fireEvent.change(input, { target: { value: 'Unsaved changes' } });
        rerender(<Host store={store} namespaces={['project-b']} />);
        expect(store.getPluginCapabilityState('llmd', 'llm-inference-services')).toBe('available');
        expect(screen.getByTestId('unsaved-form')).toBe(input);
        expect(input.value).toBe('Unsaved changes');
        await waitFor(() =>
          expect(store.getPluginCapabilityState('llmd', 'llm-inference-services')).toBe(
            'forbidden',
          ),
        );
        expect(screen.getByTestId('unsaved-form')).toBe(input);
        expect(input.value).toBe('Unsaved changes');
      }
    },
  );
});
