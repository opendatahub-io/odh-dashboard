import * as React from 'react';
import {
  PluginEventType,
  useExtensions,
  usePluginStore,
  type LoadedExtension,
} from '@openshift/dynamic-plugin-sdk';
import { DiscoveryForbiddenError } from '@odh-dashboard/k8s-core/api/discovery';
import { HostApiCoreContext } from './HostApiCoreContext';
import type { HostApiCoreServices } from './types';
import {
  isResourceCapabilityExtension,
  type ResourceCapability,
  type ResourceCapabilityExtension,
  type CapabilityState,
} from '../extension-points/resource-capabilities';
import { PluginStore } from '../core/plugin-store';

type NamespaceCandidates = {
  namespaces: string[];
  loaded: boolean;
  error?: Error;
};

const NAMESPACE_REVIEW_CONCURRENCY = 8;

export const resolveResourceCapability = async (
  capability: ResourceCapability,
  {
    discoverResource,
    reviewAccess,
  }: Pick<HostApiCoreServices, 'discoverResource' | 'reviewAccess'>,
  signal: AbortSignal,
  namespaceCandidates?: NamespaceCandidates,
): Promise<CapabilityState> => {
  if (!discoverResource || !reviewAccess) {
    return 'error';
  }
  const throwIfAborted = () => {
    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
  };
  try {
    if (!(await discoverResource(capability.resource, { signal }))) {
      return 'missing';
    }
    const hasAccess = async (namespace?: string): Promise<boolean> => {
      const allowed = await Promise.all(
        capability.permissions.map((attrs) =>
          reviewAccess(
            namespace === undefined ? attrs : { ...attrs, namespace: attrs.namespace ?? namespace },
            { signal },
          ),
        ),
      );
      return allowed.every((value) => value === true);
    };
    if (await hasAccess()) {
      return 'available';
    }
    if (capability.namespaceScope === 'any') {
      if (namespaceCandidates?.error) {
        return 'error';
      }
      if (!namespaceCandidates?.loaded) {
        return 'loading';
      }
      const namespaces = [...new Set(namespaceCandidates.namespaces.filter(Boolean))];
      for (let index = 0; index < namespaces.length; index += NAMESPACE_REVIEW_CONCURRENCY) {
        throwIfAborted();
        const allowed = await Promise.all(
          namespaces.slice(index, index + NAMESPACE_REVIEW_CONCURRENCY).map(hasAccess),
        );
        throwIfAborted();
        if (allowed.some(Boolean)) {
          return 'available';
        }
      }
    }
    return 'forbidden';
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    return error instanceof DiscoveryForbiddenError ? 'forbidden' : 'error';
  }
};

const CapabilityCheck: React.FC<{
  extension: LoadedExtension<ResourceCapabilityExtension>;
  store: PluginStore;
  namespaceCandidates?: NamespaceCandidates;
}> = ({ extension, store, namespaceCandidates }) => {
  const { discoverResource, reviewAccess } = React.useContext(HostApiCoreContext);
  // Only initial checks or a different host adapter invalidate the settled state.
  // Namespace refreshes must not remove extensions or unmount unrelated app routes.
  React.useEffect(() => {
    const { pluginName, properties } = extension;
    store.setPluginCapabilityState(pluginName, properties.id, 'loading');
    return () => store.setPluginCapabilityState(pluginName, properties.id, 'loading');
  }, [extension, store, discoverResource, reviewAccess]);

  React.useEffect(() => {
    const controller = new AbortController();
    const { pluginName, properties } = extension;
    void resolveResourceCapability(
      properties,
      { discoverResource, reviewAccess },
      controller.signal,
      namespaceCandidates,
    )
      .then((state) => {
        // Keep the last settled result while refreshed namespace candidates load.
        // Missing resources, denials and errors still disable the owning plugin.
        if (!controller.signal.aborted && state !== 'loading') {
          store.setPluginCapabilityState(pluginName, properties.id, state);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [extension, store, discoverResource, reviewAccess, namespaceCandidates]);
  return null;
};

/** Run capability declarations from loaded plugins using the current host adapter. */
export const PluginCapabilities: React.FC<
  React.PropsWithChildren<{
    namespaceCandidates?: NamespaceCandidates;
    fallback?: React.ReactNode;
  }>
> = ({ namespaceCandidates, children, fallback = null }) => {
  const extensions = useExtensions(isResourceCapabilityExtension);
  const store = usePluginStore();
  const subscribe = React.useCallback(
    (listener: VoidFunction) => store.subscribe([PluginEventType.ExtensionsChanged], listener),
    [store],
  );
  const getPending = React.useCallback(
    () =>
      store instanceof PluginStore &&
      store
        .getExtensions()
        .some(
          (extension) =>
            isResourceCapabilityExtension(extension) &&
            store.getPluginCapabilityState(extension.pluginName, extension.properties.id) ===
              'loading',
        ),
    [store],
  );
  const pending = React.useSyncExternalStore(subscribe, getPending, getPending);
  return store instanceof PluginStore ? (
    <>
      {extensions.map((extension) => (
        <CapabilityCheck
          key={extension.uid}
          extension={extension}
          store={store}
          namespaceCandidates={namespaceCandidates}
        />
      ))}
      {pending ? fallback : children}
    </>
  ) : (
    <>{children}</>
  );
};
