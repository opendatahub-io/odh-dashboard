import {
  APIOptions,
  FetchStateCallbackPromise,
  NotReadyError,
  POLL_INTERVAL,
  useFetchState,
} from 'mod-arch-core';
import React from 'react';
import { listExternalModels, listExternalProviders, listSecrets } from '~/app/api/external-models';
import { ExternalModel, ExternalProvider, SecretSummary } from '~/app/types/external-models';
import { useExternalModelsNamespace } from '~/app/hooks/useExternalModelsNamespace';

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const ExternalModelsContext = React.createContext({} as ExternalModelsContextType);

type ExternalModelsContextType = {
  externalModels: ExternalModel[];
  externalModelsLoaded: boolean;
  externalModelsError: Error | undefined;
  refreshExternalModels: () => void;
  isEmpty: boolean;
  externalProviders: ExternalProvider[];
  externalProvidersLoaded: boolean;
  externalProvidersError: Error | undefined;
  refreshExternalProviders: () => void;
  secrets: SecretSummary[];
  secretsLoaded: boolean;
  secretsError: Error | undefined;
  refreshSecrets: () => void;
};

type ExternalModelsProviderProps = {
  children: React.ReactNode;
};

export const ExternalModelsProvider: React.FC<ExternalModelsProviderProps> = ({ children }) => {
  const { resolvedNamespace } = useExternalModelsNamespace();

  const externalModelsCallback = React.useCallback<FetchStateCallbackPromise<ExternalModel[]>>(
    (opts: APIOptions) => {
      if (!resolvedNamespace) {
        return Promise.reject(new NotReadyError('Namespace not yet available'));
      }
      return listExternalModels()(opts, resolvedNamespace);
    },
    [resolvedNamespace],
  );

  const externalProvidersCallback = React.useCallback<
    FetchStateCallbackPromise<ExternalProvider[]>
  >(
    (opts: APIOptions) => {
      if (!resolvedNamespace) {
        return Promise.reject(new NotReadyError('Namespace not yet available'));
      }
      return listExternalProviders()(opts, resolvedNamespace);
    },
    [resolvedNamespace],
  );

  const secretsCallback = React.useCallback<FetchStateCallbackPromise<SecretSummary[]>>(
    (opts: APIOptions) => {
      if (!resolvedNamespace) {
        return Promise.reject(new NotReadyError('Namespace not yet available'));
      }
      return listSecrets()(opts, resolvedNamespace);
    },
    [resolvedNamespace],
  );

  const [secrets, secretsLoaded, secretsError, refreshSecrets] = useFetchState(
    secretsCallback,
    [],
    { refreshRate: POLL_INTERVAL },
  );

  const [externalModels, externalModelsLoaded, externalModelsError, refreshExternalModels] =
    useFetchState(externalModelsCallback, [], { refreshRate: POLL_INTERVAL });

  const [
    externalProviders,
    externalProvidersLoaded,
    externalProvidersError,
    refreshExternalProviders,
  ] = useFetchState(externalProvidersCallback, [], { refreshRate: POLL_INTERVAL });

  const isEmpty = externalModels.length === 0 && externalProviders.length === 0;

  const value = React.useMemo(
    () => ({
      externalModels,
      externalModelsLoaded,
      externalModelsError,
      refreshExternalModels,
      secrets,
      secretsLoaded,
      secretsError,
      refreshSecrets,
      isEmpty,
      externalProviders,
      externalProvidersLoaded,
      externalProvidersError,
      refreshExternalProviders,
    }),
    [
      externalModels,
      externalModelsLoaded,
      externalModelsError,
      refreshExternalModels,
      secrets,
      secretsLoaded,
      secretsError,
      refreshSecrets,
      isEmpty,
      externalProviders,
      externalProvidersLoaded,
      externalProvidersError,
      refreshExternalProviders,
    ],
  );
  return <ExternalModelsContext.Provider value={value}>{children}</ExternalModelsContext.Provider>;
};

export const useExternalModelsContext = (): ExternalModelsContextType =>
  React.useContext(ExternalModelsContext);
