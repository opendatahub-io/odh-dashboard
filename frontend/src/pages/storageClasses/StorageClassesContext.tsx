import React from 'react';

import { MetadataAnnotation, StorageClassConfig, StorageClassKind } from '#~/k8sTypes';
import { FetchStateRefreshPromise } from '#~/utilities/useFetchState';
import { getStorageClassConfig, setDefaultStorageClass } from './utils';

export interface StorageClassContextProps {
  storageClasses: StorageClassKind[];
  storageClassConfigs: Record<string, StorageClassConfig | undefined>;
  refresh: FetchStateRefreshPromise<StorageClassKind[]>;
  isLoadingDefault: boolean;
  setIsLoadingDefault: (isUpdating: boolean) => void;
}

const defaultContextValues = {
  storageClasses: [],
  storageClassConfigs: {},
  refresh: () => Promise.resolve(undefined),
  isLoadingDefault: false,
  setIsLoadingDefault: () => undefined,
};

export const StorageClassContext =
  React.createContext<StorageClassContextProps>(defaultContextValues);

export interface StorageClassContextProviderProps {
  storageClasses: StorageClassKind[];
  refresh: FetchStateRefreshPromise<StorageClassKind[]>;
  children: React.ReactNode;
}

export const StorageClassContextProvider: React.FC<StorageClassContextProviderProps> = ({
  storageClasses,
  refresh,
  children,
}) => {
  const [isLoadingDefault, setIsLoadingDefault] = React.useState(false);

  const storageClassesWithConfigs = React.useMemo(() => {
    return setDefaultStorageClass(
      storageClasses.map((storageClass) => {
        const config = getStorageClassConfig(storageClass);
        return {
          ...storageClass,
          metadata: {
            ...storageClass.metadata,
            annotations: {
              ...storageClass.metadata.annotations,
              [MetadataAnnotation.OdhStorageClassConfig]: JSON.stringify(config),
            },
          },
        };
      }),
    );
  }, [storageClasses]);

  const storageClassConfigs = React.useMemo(
    () =>
      storageClassesWithConfigs.reduce(
        (acc: Record<string, StorageClassConfig | undefined>, storageClass) => {
          acc[storageClass.metadata.name] = getStorageClassConfig(storageClass);

          return acc;
        },
        {},
      ),
    [storageClassesWithConfigs],
  );

  const value: StorageClassContextProps = React.useMemo(
    () => ({
      storageClasses: setDefaultStorageClass(storageClassesWithConfigs),
      storageClassConfigs,
      refresh,
      isLoadingDefault,
      setIsLoadingDefault,
    }),
    [storageClassesWithConfigs, storageClassConfigs, refresh, isLoadingDefault],
  );

  return <StorageClassContext.Provider value={value}>{children}</StorageClassContext.Provider>;
};

export const useStorageClassContext = (): StorageClassContextProps =>
  React.useContext(StorageClassContext);
