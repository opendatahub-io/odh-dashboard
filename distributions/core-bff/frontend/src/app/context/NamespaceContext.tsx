import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useBffStatus } from '~/app/context/BffStatusContext';
import useFetchJson from '~/app/hooks/useFetchJson';
import type { StatusResponse } from '~/app/types';

type K8sNamespaceList = {
  items: { metadata?: { name?: string } }[];
};

type NamespaceContextType = {
  namespaces: string[];
  selectedNamespace: string;
  setSelectedNamespace: (ns: string) => void;
  loaded: boolean;
};

const NamespaceContext = createContext<NamespaceContextType>({
  namespaces: [],
  selectedNamespace: '',
  setSelectedNamespace: () => undefined,
  loaded: false,
});

export const NamespaceProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { connected } = useBffStatus();
  const { data: statusData } = useFetchJson<StatusResponse>(connected ? '/api/status' : null);
  const { data, loaded } = useFetchJson<K8sNamespaceList>(
    connected ? '/api/k8s/api/v1/namespaces' : null,
  );
  const [selected, setSelected] = useState('');

  const namespaces = useMemo(
    () =>
      (data?.items ?? [])
        .map((item) => item.metadata?.name ?? '')
        .filter(Boolean)
        .toSorted(),
    [data],
  );

  useEffect(() => {
    if (!selected && statusData?.kube.namespace) {
      setSelected(statusData.kube.namespace);
    }
  }, [statusData, selected]);

  useEffect(() => {
    if (namespaces.length > 0 && selected && !namespaces.includes(selected)) {
      setSelected(namespaces[0]);
    }
  }, [namespaces, selected]);

  const value = useMemo(
    () => ({
      namespaces,
      selectedNamespace: selected,
      setSelectedNamespace: setSelected,
      loaded,
    }),
    [namespaces, selected, loaded],
  );

  return <NamespaceContext.Provider value={value}>{children}</NamespaceContext.Provider>;
};

export const useNamespaceSelector = (): NamespaceContextType => useContext(NamespaceContext);
