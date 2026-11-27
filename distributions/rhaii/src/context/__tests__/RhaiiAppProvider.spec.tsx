import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as React from 'react';
import { parse } from 'yaml';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useK8sWatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { type Extension, PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import { useWatchConnectionTypes } from '@odh-dashboard/plugin-core/host-api';
import { useTrackEvent, useTrackPageEvent } from '@odh-dashboard/analytics/react';
import { HardwareProfilesContext } from '@odh-dashboard/ui-core/context/HardwareProfilesContext';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import type { HardwareProfileKind } from '@odh-dashboard/k8s-core';
import RhaiiAppProviderComponent from '../RhaiiAppProvider';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  useK8sWatchResource: jest.fn(),
}));

const mockUseK8sWatchResource = jest.mocked(useK8sWatchResource);

jest.mock('../ProjectsContextProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

const ORIGINAL_TILT_FIXTURES = process.env.RHAII_TILT_FIXTURES;
let pluginStore: PluginStore;

const RhaiiAppProvider: React.FC<React.PropsWithChildren> = ({ children }) => (
  <PluginStoreProvider store={pluginStore}>
    <RhaiiAppProviderComponent>{children}</RhaiiAppProviderComponent>
  </PluginStoreProvider>
);

const ConnectionTypesConsumer: React.FC = () => {
  const [connectionTypes] = useWatchConnectionTypes();
  const {
    globalHardwareProfiles: [profiles],
  } = React.useContext(HardwareProfilesContext);
  return (
    <>
      <span data-testid="connection-type-names">
        {connectionTypes.map((connectionType) => connectionType.metadata.name).join(',')}
      </span>
      <span data-testid="hardware-profile-names">
        {profiles.map((profile) => profile.metadata.name).join(',')}
      </span>
    </>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  pluginStore = new PluginStore({});
  const profiles: HardwareProfileKind[] = [
    {
      apiVersion: 'infrastructure.opendatahub.io/v1',
      kind: 'HardwareProfile',
      metadata: { name: 'default-profile', namespace: 'opendatahub' },
      spec: { identifiers: [] },
    },
  ];
  mockUseK8sWatchResource.mockReturnValue([profiles, true, undefined]);
  globalThis.fetch = jest.fn(
    () =>
      new Promise<Response>(() => {
        // Keep the dashboard namespace request pending for this synchronous composition test.
      }),
  );
});

afterEach(() => {
  if (ORIGINAL_TILT_FIXTURES === undefined) {
    delete process.env.RHAII_TILT_FIXTURES;
  } else {
    process.env.RHAII_TILT_FIXTURES = ORIGINAL_TILT_FIXTURES;
  }
  jest.restoreAllMocks();
  delete (globalThis as { fetch?: typeof fetch }).fetch;
});

describe('RhaiiAppProvider unified selector gate', () => {
  it.each([
    [undefined, false],
    [false, false],
    [true, true],
  ])('should expose %s through the area contract', (flag, expected) => {
    if (flag !== undefined) {
      pluginStore.setFeatureFlags({ 'unified-project-selector': flag });
    }
    const Status: React.FC = () => {
      const { status } = useIsAreaAvailable(SupportedArea.UNIFIED_PROJECT_SELECTOR);
      return <span data-testid="ups-status">{String(status)}</span>;
    };
    render(
      <RhaiiAppProvider>
        <Status />
      </RhaiiAppProvider>,
    );
    expect(screen.getByTestId('ups-status').textContent).toBe(String(expected));
  });
});

describe('RHAII LLMD activation', () => {
  const manifest: {
    packages: {
      bundled: { package: string; extensionsPath: string; featureFlags: Record<string, boolean> }[];
    };
    extensionProfiles: { modelServing: string };
    featureFlags: Record<string, boolean>;
  } = parse(readFileSync(path.join(__dirname, '../../../distribution.yaml'), 'utf8'));
  const extensions = (entry: string) => jest.requireActual<{ default: Extension[] }>(entry).default;
  const groupVersion = 'serving.kserve.io/v1alpha2';
  const discoveryUrl = `/api/k8s/apis/${groupVersion}`;
  const resources = [{ name: 'llminferenceservices', namespaced: true, verbs: ['list', 'watch'] }];
  const response = (status: number, body: unknown) =>
    ({ status, ok: status === 200, json: async () => body } as Response);
  const methods = () =>
    pluginStore
      .getExtensions()
      .filter((extension) => extension.type === 'model-serving.deployment/deploy');
  const setup = (fetchDiscovery: jest.Mock, hub = true, configured?: boolean) => {
    pluginStore = new PluginStore({
      ...Object.fromEntries(
        manifest.packages.bundled.map((entry) => [
          entry.package,
          extensions(`${entry.package}/${entry.extensionsPath.slice(2)}`),
        ]),
      ),
      modelServing: extensions(
        `@odh-dashboard/model-serving/extensions/${manifest.extensionProfiles.modelServing}`,
      ),
    });
    pluginStore.setFeatureFlags({
      ...manifest.featureFlags,
      ...Object.assign({}, ...manifest.packages.bundled.map((entry) => entry.featureFlags)),
      'model-serving-shell': hub,
      ...(configured !== undefined && { 'enable-llmd-serving': configured }),
    });
    globalThis.fetch = jest.fn((url) =>
      url === discoveryUrl
        ? fetchDiscovery()
        : Promise.resolve(response(200, { kube: { namespace: 'test' } })),
    );
    return renderHook(
      () => ({
        llmd: useIsAreaAvailable(SupportedArea.LLMD_SERVING).status,
        kserve: useIsAreaAvailable(SupportedArea.K_SERVE).status,
      }),
      { wrapper: RhaiiAppProvider },
    );
  };

  it.each([
    [true, false],
    [false, true],
  ])('should skip discovery when hub=%s and configuration=%s', (hub, configured) => {
    const lookup = jest.fn();
    const { result } = setup(lookup, hub, configured);
    expect(result.current.llmd).toBe(false);
    expect(methods()).toHaveLength(0);
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each([
    [404, {}, 'does not serve'],
    [
      200,
      { groupVersion, resources: [{ name: 'llminferenceservices/status', namespaced: true }] },
      'does not serve',
    ],
    [403, {}, 'was denied'],
    [503, {}, 'HTTP 503'],
    [200, {}, 'Invalid Kubernetes discovery'],
  ])(
    'should keep extensions inactive after discovery %s and activate on retry',
    async (status, body, message) => {
      const lookup = jest
        .fn()
        .mockResolvedValueOnce(response(Number(status), body))
        .mockResolvedValueOnce(response(200, { groupVersion, resources }));
      const { result, rerender } = setup(lookup);
      expect(result.current.llmd).toBe(false);
      expect(methods()).toHaveLength(0);
      expect(await screen.findByText(new RegExp(String(message)))).toBeVisible();
      rerender();
      expect(lookup).toHaveBeenCalledTimes(1);
      expect(methods()).toHaveLength(0);
      fireEvent.click(screen.getByRole('button', { name: 'Retry discovery' }));
      await waitFor(() => expect(result.current).toEqual({ llmd: true, kserve: false }));
      expect(methods().map((extension) => extension.properties.platform)).toEqual(['llmd-serving']);
      expect(
        pluginStore
          .getExtensions()
          .some((extension) => extension.properties.fieldId === 'llmd-serving/gateway'),
      ).toBe(false);
      expect(lookup).toHaveBeenCalledTimes(2);
    },
  );

  it('should ignore an obsolete success after configuration is disabled', async () => {
    let resolve!: (value: Response) => void;
    const { result } = setup(
      jest.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      ),
    );
    act(() => pluginStore.setFeatureFlags({ 'enable-llmd-serving': false }));
    await act(async () => resolve(response(200, { groupVersion, resources })));
    expect(result.current.llmd).toBe(false);
    expect(methods()).toHaveLength(0);
  });
});

describe('RhaiiAppProvider Tilt fixture composition', () => {
  it.each([
    ['enabled', 'true', 'uri-v1'],
    ['disabled', 'false', ''],
    ['unset', undefined, ''],
  ] as const)(
    'should expose the expected connection types when fixtures are %s',
    (_state, flag, expected) => {
      if (flag === undefined) {
        delete process.env.RHAII_TILT_FIXTURES;
      } else {
        process.env.RHAII_TILT_FIXTURES = flag;
      }

      render(
        <RhaiiAppProvider>
          <ConnectionTypesConsumer />
        </RhaiiAppProvider>,
      );

      expect(screen.getByTestId('connection-type-names').textContent).toBe(expected);
      expect(screen.getByTestId('hardware-profile-names').textContent).toBe('default-profile');
    },
  );

  it('should watch the dashboard namespace resolved by the BFF', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ kube: { namespace: 'redhat-ods-applications' } }),
    });

    render(
      <RhaiiAppProvider>
        <ConnectionTypesConsumer />
      </RhaiiAppProvider>,
    );

    await waitFor(() =>
      expect(mockUseK8sWatchResource).toHaveBeenLastCalledWith(
        expect.objectContaining({ namespace: 'redhat-ods-applications' }),
        expect.objectContaining({ kind: 'HardwareProfile' }),
        undefined,
      ),
    );
  });
});

describe('RhaiiAppProvider tracking', () => {
  it('should mount a tracking no-op without accessing or initializing the global SDK', () => {
    const originalAnalytics = Object.getOwnPropertyDescriptor(window, 'analytics');
    const sdk = { track: jest.fn(), page: jest.fn() };
    const analyticsRead = jest.fn(() => sdk);
    const analyticsWrite = jest.fn();

    try {
      Object.defineProperty(window, 'analytics', {
        configurable: true,
        get: analyticsRead,
        set: analyticsWrite,
      });
      const { result, rerender } = renderHook(
        () => ({ track: useTrackEvent(), page: useTrackPageEvent() }),
        { wrapper: RhaiiAppProvider },
      );

      const initial = result.current;
      rerender();
      expect(result.current.track).toBe(initial.track);
      expect(result.current.page).toBe(initial.page);
      expect(
        result.current.track('custom-event', { outcome: 'submit', success: false }),
      ).toBeUndefined();
      expect(result.current.page()).toBeUndefined();
      expect(analyticsRead).not.toHaveBeenCalled();
      expect(analyticsWrite).not.toHaveBeenCalled();
      expect(sdk.track).not.toHaveBeenCalled();
      expect(sdk.page).not.toHaveBeenCalled();

      Reflect.deleteProperty(window, 'analytics');
      expect(() => result.current.track('custom-event', {})).not.toThrow();
      expect(() => result.current.page()).not.toThrow();
      expect(Object.getOwnPropertyDescriptor(window, 'analytics')).toBeUndefined();
    } finally {
      if (originalAnalytics) {
        Object.defineProperty(window, 'analytics', originalAnalytics);
      } else {
        Reflect.deleteProperty(window, 'analytics');
      }
    }
  });
});
