import React from 'react';

import { StorageClassConfig, StorageClassKind } from '~/k8sTypes';
import { FetchStateRefreshPromise } from '~/utilities/useFetchState';
import { ResponseStatus } from '~/types';
import { updateStorageClassConfig } from '~/services/StorageClassService';
import { allSettledPromises } from '~/utilities/allSettledPromises';
import { getStorageClassConfig, isOpenshiftDefaultStorageClass } from './utils';

export interface StorageClassContextProps {
  storageClasses: StorageClassKind[];
  storageClassConfigs: Record<string, StorageClassConfig | undefined>;
  refresh: FetchStateRefreshPromise<StorageClassKind[]>;
  isUpdatingConfigs: boolean;
  isLoadingDefault: boolean;
  setIsLoadingDefault: (isUpdating: boolean) => void;
}

const defaultContextValues = {
  storageClasses: [],
  storageClassConfigs: {},
  refresh: () => Promise.resolve(undefined),
  isUpdatingConfigs: false,
  isLoadingDefault: false,
  setIsLoadingDefault: () => undefined,
};

export const StorageClassContext =
  React.createContext<StorageClassContextProps>(defaultContextValues);

export interface StorageClassContextProviderProps {
  storageClasses: StorageClassKind[];
  loaded: boolean;
  refresh: FetchStateRefreshPromise<StorageClassKind[]>;
  children: (
    isAlertOpen: boolean,
    setIsAlertOpen: React.Dispatch<React.SetStateAction<boolean>>,
  ) => React.ReactNode;
}

export const StorageClassContextProvider: React.FC<StorageClassContextProviderProps> = ({
  storageClasses,
  refresh,
  loaded,
  children,
}) => {
  const [isUpdatingConfigs, setIsUpdatingConfigs] = React.useState(true);
  const [isLoadingDefault, setIsLoadingDefault] = React.useState(false);
  const [isAutoDefaultAlertOpen, setIsAutoDefaultAlertOpen] = React.useState(false);

  const storageClassConfigs = React.useMemo(
    () =>
      storageClasses.reduce((acc: Record<string, StorageClassConfig | undefined>, storageClass) => {
        acc[storageClass.metadata.name] = getStorageClassConfig(storageClass);

        return acc;
      }, {}),
    [storageClasses],
  );

  const [defaultStorageClassName] =
    Object.entries(storageClassConfigs).find(([, config]) => config?.isDefault === true) || [];

  const openshiftDefaultScName = storageClasses.find((storageClass) =>
    isOpenshiftDefaultStorageClass(storageClass),
  )?.metadata.name;

  const updateConfigs = React.useCallback(async () => {
    let hasDefaultConfig = false;

    const updateRequests = Object.entries(storageClassConfigs).reduce(
      (acc: Promise<ResponseStatus>[], [name, config], index) => {
        const isFirstConfig = index === 0;
        const isOpenshiftDefault = openshiftDefaultScName === name;

        // Add a default config annotation when one doesn't exist
        if (!config) {
          let isDefault = isOpenshiftDefault;
          let isEnabled = isDefault;

          if (!openshiftDefaultScName) {
            isDefault = isFirstConfig;
            isEnabled = true;
          }

          acc.push(
            updateStorageClassConfig(name, {
              isDefault,
              isEnabled,
              displayName: name,
            }),
          );
        }
        // If multiple defaults are set via OpenShift's dashboard,
        // unset all except the first indexed storage class
        else {
          if (config.isDefault === true) {
            if (!hasDefaultConfig) {
              hasDefaultConfig = true;
            } else {
              acc.push(updateStorageClassConfig(name, { isDefault: false }));
            }
          }

          // Set a default storage class (OpenShift default or first indexed storage class)
          // if none exists and notify the user
          if (
            !defaultStorageClassName &&
            ((isFirstConfig && !openshiftDefaultScName) || isOpenshiftDefault)
          ) {
            acc.push(
              updateStorageClassConfig(name, {
                isDefault: true,
                isEnabled: true,
              }),
            );
          }

          // If the default storage class coming from OpenShift is disabled, update to enable
          if (defaultStorageClassName && !storageClassConfigs[defaultStorageClassName]?.isEnabled) {
            acc.push(
              updateStorageClassConfig(defaultStorageClassName, {
                isEnabled: true,
              }),
            );
          }
        }

        return acc;
      },
      [],
    );

    if (loaded) {
      try {
        const [successResponses] = await allSettledPromises(updateRequests);

        if (successResponses.length) {
          await refresh();

          if (!openshiftDefaultScName) {
            setIsAutoDefaultAlertOpen(true);
          }
        }
      } finally {
        setIsUpdatingConfigs(false);
      }
    }
  }, [storageClassConfigs, loaded, openshiftDefaultScName, defaultStorageClassName, refresh]);

  // Initialize storage class configs
  React.useEffect(() => {
    updateConfigs();
  }, [defaultStorageClassName, openshiftDefaultScName, storageClassConfigs, updateConfigs]);

  const value: StorageClassContextProps = React.useMemo(
    () => ({
      storageClasses,
      storageClassConfigs,
      refresh,
      isUpdatingConfigs,
      isLoadingDefault,
      setIsLoadingDefault,
    }),
    [storageClasses, storageClassConfigs, refresh, isUpdatingConfigs, isLoadingDefault],
  );

  return (
    <StorageClassContext.Provider value={value}>
      {children(isAutoDefaultAlertOpen, setIsAutoDefaultAlertOpen)}
    </StorageClassContext.Provider>
  );
};

export const useStorageClassContext = (): StorageClassContextProps =>
  React.useContext(StorageClassContext);
