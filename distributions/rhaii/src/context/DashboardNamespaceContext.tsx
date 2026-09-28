import * as React from 'react';

export const DEFAULT_DASHBOARD_NAMESPACE = 'opendatahub';
export const DASHBOARD_NAMESPACE_TIMEOUT_MS = 30_000;

export const DashboardNamespaceContext = React.createContext(DEFAULT_DASHBOARD_NAMESPACE);

export const DashboardNamespaceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [namespace, setNamespace] = React.useState(DEFAULT_DASHBOARD_NAMESPACE);

  React.useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DASHBOARD_NAMESPACE_TIMEOUT_MS);

    void fetch('/api/status', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          return undefined;
        }
        const value: unknown = await response.json().catch(() => undefined);
        if (typeof value !== 'object' || value === null || !('kube' in value)) {
          return undefined;
        }
        const { kube } = value;
        if (typeof kube !== 'object' || kube === null || !('namespace' in kube)) {
          return undefined;
        }
        return typeof kube.namespace === 'string' && kube.namespace.length > 0
          ? kube.namespace
          : undefined;
      })
      .then((resolvedNamespace) => {
        if (resolvedNamespace) {
          setNamespace(resolvedNamespace);
        }
      })
      .catch(() => undefined)
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return (
    <DashboardNamespaceContext.Provider value={namespace}>
      {children}
    </DashboardNamespaceContext.Provider>
  );
};
