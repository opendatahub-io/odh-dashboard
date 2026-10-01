import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { DiscoveryForbiddenError } from '@odh-dashboard/k8s-core/api/discovery';
import { PluginCapabilities, resolveResourceCapability } from '../PluginCapabilities';
import { HostApiCoreContext } from '../HostApiCoreContext';
import type { HostApiCoreServices } from '../types';
import type {
  ResourceCapability,
  CapabilityState,
} from '../../extension-points/resource-capabilities';
import { PluginStore } from '../../core/plugin-store';

const capability: ResourceCapability = {
  id: 'widgets',
  resource: { group: 'example.io', version: 'v1', resource: 'widgets' },
  permissions: [{ group: 'example.io', resource: 'widgets', verb: 'list', namespace: 'project-a' }],
};

const namespacedCapability: ResourceCapability = {
  ...capability,
  namespaceScope: 'any',
  permissions: (['list', 'watch'] as const).map((verb) => ({
    group: 'example.io',
    resource: 'widgets',
    verb,
  })),
};

type CapabilityServices = Pick<HostApiCoreServices, 'discoverResource' | 'reviewAccess'>;

const CapabilityHost: React.FC<{
  store: PluginStore;
  services: CapabilityServices;
  namespaceCandidates: React.ComponentProps<typeof PluginCapabilities>['namespaceCandidates'];
}> = ({ store, services, namespaceCandidates }) => {
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
        { namespaceCandidates, fallback: 'Checking capabilities' },
        React.createElement('input', { 'data-testid': 'unsaved-form', defaultValue: '' }),
      ),
    ),
  );
};

const createCapabilityStore = () =>
  new PluginStore({
    feature: [
      { type: 'app.resource-capability', properties: namespacedCapability },
      { type: 'app.route', properties: { path: '/widgets' } },
    ],
  });

const deferredBoolean = () => {
  let resolve: (value: boolean) => void = () => undefined;
  const promise = new Promise<boolean>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe('plugin capabilities', () => {
  it.each([true, false])(
    'should bound parallel namespace reviews, deduplicate candidates and stop after a grant (allowed: %s)',
    async (allowed) => {
      let active = 0;
      let peak = 0;
      const reviewAccess = jest.fn<
        Promise<boolean>,
        Parameters<NonNullable<HostApiCoreServices['reviewAccess']>>
      >(async ({ namespace }) => {
        if (!namespace) {
          return false;
        }
        active += 1;
        peak = Math.max(peak, active);
        await Promise.resolve();
        active -= 1;
        return allowed && namespace === 'project-8';
      });
      const namespaces = Array.from({ length: 20 }, (_, index) => `project-${index}`);
      const { signal } = new AbortController();
      await expect(
        resolveResourceCapability(
          namespacedCapability,
          { discoverResource: async () => true, reviewAccess },
          signal,
          { namespaces: ['', ...namespaces, ...namespaces], loaded: true },
        ),
      ).resolves.toBe(allowed ? 'available' : 'forbidden');
      // Eight namespaces, each with two operation-specific reviews, per batch.
      expect(peak).toBe(16);
      expect(reviewAccess).toHaveBeenCalledTimes(allowed ? 34 : 42);
      expect(reviewAccess.mock.calls.every(([, opts]) => opts?.signal === signal)).toBe(true);
    },
  );

  it.each(['abort', 'error'] as const)(
    'should stop scheduling namespace batches after %s without granting access',
    async (failure) => {
      const controller = new AbortController();
      const reviewAccess = jest.fn<
        Promise<boolean>,
        Parameters<NonNullable<HostApiCoreServices['reviewAccess']>>
      >(async ({ namespace }) => {
        if (!namespace) {
          return false;
        }
        if (failure === 'abort') {
          controller.abort();
          return true;
        }
        throw new Error('SSAR failed');
      });
      const result = resolveResourceCapability(
        namespacedCapability,
        { discoverResource: async () => true, reviewAccess },
        controller.signal,
        {
          namespaces: Array.from({ length: 20 }, (_, index) => `project-${index}`),
          loaded: true,
        },
      );
      if (failure === 'abort') {
        await expect(result).rejects.toMatchObject({ name: 'AbortError' });
      } else {
        await expect(result).resolves.toBe('error');
      }
      expect(reviewAccess).toHaveBeenCalledTimes(18);
    },
  );

  it.each(['available', 'forbidden', 'missing', 'error'] as const)(
    'should preserve unsaved forms during a namespace refresh that resolves to %s',
    async (state) => {
      const store = createCapabilityStore();
      const discoverResource = jest.fn().mockResolvedValue(true);
      const reviewAccess = jest.fn<
        Promise<boolean>,
        Parameters<NonNullable<HostApiCoreServices['reviewAccess']>>
      >(async ({ namespace }) => namespace === 'project-a');
      const services = { discoverResource, reviewAccess };
      const { rerender } = render(
        React.createElement(CapabilityHost, {
          store,
          services,
          namespaceCandidates: { namespaces: ['project-a'], loaded: true },
        }),
      );
      expect(screen.queryByTestId('unsaved-form')).toBeNull();
      await waitFor(() =>
        expect(store.getPluginCapabilityState('feature', 'widgets')).toBe('available'),
      );
      const input = screen.getByTestId<HTMLInputElement>('unsaved-form');
      fireEvent.change(input, { target: { value: 'Unsaved changes' } });

      // A transient namespace-loading result must not reset a settled capability either.
      rerender(
        React.createElement(CapabilityHost, {
          store,
          services,
          namespaceCandidates: { namespaces: [], loaded: false },
        }),
      );
      await act(() => Promise.resolve());
      expect(store.getPluginCapabilityState('feature', 'widgets')).toBe('available');

      const refresh = deferredBoolean();
      discoverResource.mockReturnValue(refresh.promise);
      reviewAccess.mockImplementation(async ({ namespace }) => {
        if (state === 'error') {
          throw new Error('SSAR failed');
        }
        return state === 'available' && namespace === 'project-b';
      });
      rerender(
        React.createElement(CapabilityHost, {
          store,
          services,
          namespaceCandidates: { namespaces: ['project-b'], loaded: true },
        }),
      );
      expect(screen.queryByText('Checking capabilities')).toBeNull();
      expect(screen.getByTestId('unsaved-form')).toBe(input);
      expect(store.getPluginCapabilityState('feature', 'widgets')).toBe('available');
      expect(store.getExtensions().some((extension) => extension.type === 'app.route')).toBe(true);

      await act(async () => refresh.resolve(state !== 'missing'));
      await waitFor(() => expect(store.getPluginCapabilityState('feature', 'widgets')).toBe(state));
      expect(store.getExtensions().some((extension) => extension.type === 'app.route')).toBe(
        state === 'available',
      );
      expect(screen.getByTestId('unsaved-form')).toBe(input);
      expect(input.value).toBe('Unsaved changes');
    },
  );

  it('should abort superseded refreshes and ignore their late results', async () => {
    const store = createCapabilityStore();
    const discoverResource = jest.fn().mockResolvedValue(true);
    const services = { discoverResource, reviewAccess: jest.fn().mockResolvedValue(true) };
    const { rerender } = render(
      React.createElement(CapabilityHost, {
        store,
        services,
        namespaceCandidates: { namespaces: ['project-a'], loaded: true },
      }),
    );
    await waitFor(() =>
      expect(store.getPluginCapabilityState('feature', 'widgets')).toBe('available'),
    );
    const stale = deferredBoolean();
    discoverResource.mockReturnValueOnce(stale.promise);
    rerender(
      React.createElement(CapabilityHost, {
        store,
        services,
        namespaceCandidates: { namespaces: ['project-b'], loaded: true },
      }),
    );
    const [, { signal }] = discoverResource.mock.calls[1];
    rerender(
      React.createElement(CapabilityHost, {
        store,
        services,
        namespaceCandidates: { namespaces: ['project-c'], loaded: true },
      }),
    );
    expect(signal.aborted).toBe(true);
    await act(async () => stale.resolve(false));
    expect(store.getPluginCapabilityState('feature', 'widgets')).toBe('available');
    expect(screen.queryByText('Checking capabilities')).toBeNull();
  });

  it('should invalidate settled permissions when the access-review adapter changes', async () => {
    const store = createCapabilityStore();
    const discoverResource = jest.fn().mockResolvedValue(true);
    const services = { discoverResource, reviewAccess: jest.fn().mockResolvedValue(true) };
    const namespaceCandidates = { namespaces: ['project-a'], loaded: true };
    const { rerender } = render(
      React.createElement(CapabilityHost, { store, services, namespaceCandidates }),
    );
    await waitFor(() =>
      expect(store.getPluginCapabilityState('feature', 'widgets')).toBe('available'),
    );
    const refresh = deferredBoolean();
    rerender(
      React.createElement(CapabilityHost, {
        store,
        services: { discoverResource, reviewAccess: () => refresh.promise },
        namespaceCandidates,
      }),
    );
    expect(store.getPluginCapabilityState('feature', 'widgets')).toBe('loading');
    expect(screen.queryByTestId('unsaved-form')).toBeNull();
    await act(async () => refresh.resolve(false));
    await waitFor(() =>
      expect(store.getPluginCapabilityState('feature', 'widgets')).toBe('forbidden'),
    );
  });

  it('should respect capability declaration flags without blocking unrelated active extensions', () => {
    const store = new PluginStore({
      feature: [
        {
          type: 'app.resource-capability',
          properties: capability,
          flags: { required: ['CHECK_WIDGETS'] },
        },
        { type: 'app.route', properties: { path: '/widgets' } },
      ],
    });
    expect(store.getExtensions().map((extension) => extension.type)).toEqual(['app.route']);
    store.setFeatureFlags({ CHECK_WIDGETS: true });
    expect(store.getExtensions().map((extension) => extension.type)).toEqual([
      'app.resource-capability',
    ]);
    store.setPluginCapabilityState('feature', 'widgets', 'available');
    expect(store.getExtensions().map((extension) => extension.type)).toEqual([
      'app.resource-capability',
      'app.route',
    ]);
    store.setFeatureFlags({ CHECK_WIDGETS: false });
    store.setPluginCapabilityState('feature', 'widgets', 'loading');
    expect(store.getExtensions().map((extension) => extension.type)).toEqual(['app.route']);
  });
  it('should accept namespaced access without treating it as cluster-wide permission', async () => {
    const reviewAccess = jest
      .fn()
      .mockImplementation(async (attrs) => attrs.namespace === 'project-a');
    const singlePermissionCapability: ResourceCapability = {
      ...capability,
      namespaceScope: 'any',
      permissions: [{ group: 'example.io', resource: 'widgets', verb: 'list' }],
    };
    const { signal } = new AbortController();
    await expect(
      resolveResourceCapability(
        singlePermissionCapability,
        { discoverResource: async () => true, reviewAccess },
        signal,
        { namespaces: ['project-a'], loaded: true },
      ),
    ).resolves.toBe('available');
    expect(reviewAccess).toHaveBeenNthCalledWith(1, singlePermissionCapability.permissions[0], {
      signal,
    });
    expect(reviewAccess).toHaveBeenNthCalledWith(
      2,
      { ...singlePermissionCapability.permissions[0], namespace: 'project-a' },
      { signal },
    );
  });

  it('should never grant access merely because a host supplies namespace candidates', async () => {
    const required: ResourceCapability = { ...capability, namespaceScope: 'any' };
    const services = { discoverResource: async () => true, reviewAccess: async () => false };
    const { signal } = new AbortController();
    await expect(resolveResourceCapability(required, services, signal)).resolves.toBe('loading');
    await expect(
      resolveResourceCapability(required, services, signal, {
        namespaces: ['project-a'],
        loaded: true,
      }),
    ).resolves.toBe('forbidden');
    await expect(
      resolveResourceCapability(required, services, signal, {
        namespaces: [],
        loaded: true,
        error: new Error('Namespace lookup failed'),
      }),
    ).resolves.toBe('error');
    await expect(
      resolveResourceCapability(
        required,
        {
          ...services,
          reviewAccess: async () => {
            throw new Error('SSAR failed');
          },
        },
        signal,
        { namespaces: ['project-a'], loaded: true },
      ),
    ).resolves.toBe('error');
  });

  it.each(['available', 'missing', 'forbidden', 'error'] as const)(
    'should publish %s through the mounted host adapter and cancel on unmount',
    async (state) => {
      const store = new PluginStore({
        feature: [
          { type: 'app.resource-capability', properties: capability },
          { type: 'app.route', properties: { path: '/widgets' } },
        ],
      });
      const discoverResource = jest.fn().mockImplementation(async () => {
        if (state === 'error') {
          throw new Error('Discovery unavailable');
        }
        return state !== 'missing';
      });
      const reviewAccess = jest.fn().mockResolvedValue(state !== 'forbidden');
      const Host: React.FC = () => {
        const defaults = React.useContext(HostApiCoreContext);
        return React.createElement(
          HostApiCoreContext.Provider,
          { value: { ...defaults, discoverResource, reviewAccess } },
          React.createElement(
            PluginCapabilities,
            { fallback: 'Checking capabilities' },
            'App routes',
          ),
        );
      };
      const { unmount } = render(
        React.createElement(PluginStoreProvider, { store }, React.createElement(Host)),
      );
      expect(store.getPluginCapabilityState('feature', 'widgets')).toBe('loading');
      expect(screen.queryByText('App routes')).toBeNull();
      expect(screen.getByText('Checking capabilities')).toBeTruthy();
      await waitFor(() => expect(store.getPluginCapabilityState('feature', 'widgets')).toBe(state));
      expect(screen.getByText('App routes')).toBeTruthy();
      expect(screen.queryByText('Checking capabilities')).toBeNull();
      expect(store.getExtensions().some((e) => e.type === 'app.route')).toBe(state === 'available');
      expect(discoverResource).toHaveBeenCalledTimes(1);
      unmount();
      expect(discoverResource.mock.calls[0][1].signal.aborted).toBe(true);
      expect(store.getPluginCapabilityState('feature', 'widgets')).toBe('loading');
    },
  );

  it.each([true, false])(
    'should check caller access after discovery (allowed: %s)',
    async (allowed) => {
      const reviewAccess = jest.fn().mockResolvedValue(allowed);
      const { signal } = new AbortController();
      await expect(
        resolveResourceCapability(
          capability,
          { discoverResource: async () => true, reviewAccess },
          signal,
        ),
      ).resolves.toBe(allowed ? 'available' : 'forbidden');
      expect(reviewAccess).toHaveBeenCalledWith(capability.permissions[0], { signal });
    },
  );

  it('should report missing APIs without issuing SSARs', async () => {
    const reviewAccess = jest.fn();
    await expect(
      resolveResourceCapability(
        capability,
        { discoverResource: async () => false, reviewAccess },
        new AbortController().signal,
      ),
    ).resolves.toBe('missing');
    expect(reviewAccess).not.toHaveBeenCalled();
  });

  it('should distinguish discovery denial, discovery errors, and SSAR errors', async () => {
    const { signal } = new AbortController();
    await expect(
      resolveResourceCapability(
        capability,
        {
          discoverResource: async () => {
            throw new DiscoveryForbiddenError();
          },
          reviewAccess: async () => true,
        },
        signal,
      ),
    ).resolves.toBe('forbidden');
    await expect(
      resolveResourceCapability(
        capability,
        {
          discoverResource: async () => {
            throw new Error();
          },
          reviewAccess: async () => true,
        },
        signal,
      ),
    ).resolves.toBe('error');
    await expect(
      resolveResourceCapability(
        capability,
        {
          discoverResource: async () => true,
          reviewAccess: async () => {
            throw new Error();
          },
        },
        signal,
      ),
    ).resolves.toBe('error');
    await expect(resolveResourceCapability(capability, {}, signal)).resolves.toBe('error');
  });

  it('should propagate cancellation without publishing a new capability state', async () => {
    const controller = new AbortController();
    controller.abort();
    const error = new DOMException('Aborted', 'AbortError');
    await expect(
      resolveResourceCapability(
        capability,
        {
          discoverResource: async () => {
            throw error;
          },
          reviewAccess: async () => true,
        },
        controller.signal,
      ),
    ).rejects.toBe(error);
  });

  it('should keep each plugin disabled in every state except available, regardless of UI flags', () => {
    const store = new PluginStore({
      feature: [
        { type: 'app.resource-capability', properties: capability },
        {
          type: 'app.route',
          properties: { path: '/widgets' },
          flags: { required: ['ADMIN_USER'] },
        },
      ],
      unrelated: [{ type: 'app.route', properties: { path: '/other' } }],
    });
    store.setFeatureFlags({ ADMIN_USER: true });
    expect(store.getPluginCapabilityState('feature', 'widgets')).toBe('loading');
    for (const state of [
      'available',
      'loading',
      'missing',
      'forbidden',
      'error',
    ] as CapabilityState[]) {
      store.setPluginCapabilityState('feature', 'widgets', state);
      expect(store.getExtensions().some((e) => e.properties.path === '/widgets')).toBe(
        state === 'available',
      );
      expect(store.getExtensions().some((e) => e.properties.path === '/other')).toBe(true);
      expect(store.getExtensions().some((e) => e.type === 'app.resource-capability')).toBe(true);
    }
  });
});
