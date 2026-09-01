import * as React from 'react';
import useModelCatalogSettingsAPIState, {
  ModelCatalogSettingsAPIState,
} from '~/app/hooks/modelCatalogSettings/useModelCatalogSettingsAPIState';
import { useCatalogSourceConfigs } from '~/app/hooks/modelCatalogSettings/useCatalogSourceConfigs';
import type { CatalogSourceList } from '~/app/shared/types/catalogTypes';
import type { CatalogSourceConfigList } from '~/app/modelCatalogTypes';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { createCatalogSettingsContext } from '~/app/shared/catalogSettings/createCatalogSettingsContext';

const { useCatalogSettingsValue } = createCatalogSettingsContext<
  ModelCatalogSettingsAPIState,
  CatalogSourceConfigList
>({
  settingsHostPath: `${URL_PREFIX}/api/${BFF_API_VERSION}/settings/model_catalog`,
  catalogHostPath: `${URL_PREFIX}/api/${BFF_API_VERSION}/model_catalog`,
  useSettingsAPIState: useModelCatalogSettingsAPIState,
  useSourceConfigsList: useCatalogSourceConfigs,
});

export type ModelCatalogSettingsContextType = {
  apiState: ModelCatalogSettingsAPIState;
  refreshAPIState: () => void;
  catalogSourceConfigs: CatalogSourceConfigList | null;
  catalogSourceConfigsLoaded: boolean;
  catalogSourceConfigsLoadError?: Error;
  refreshCatalogSourceConfigs: () => void;
  catalogSources: CatalogSourceList | null;
  catalogSourcesLoaded: boolean;
  catalogSourcesLoadError?: Error;
  refreshCatalogSources: () => void;
  pendingSourceIds: Map<string, string>;
  markSourcePending: (id: string, previousStatus: string) => void;
};

type ModelCatalogSettingsContextProviderProps = {
  children: React.ReactNode;
};

export const ModelCatalogSettingsContext = React.createContext<ModelCatalogSettingsContextType>({
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  apiState: { apiAvailable: false, api: null as unknown as ModelCatalogSettingsAPIState['api'] },
  refreshAPIState: () => undefined,
  catalogSourceConfigs: null,
  catalogSourceConfigsLoaded: false,
  catalogSourceConfigsLoadError: undefined,
  refreshCatalogSourceConfigs: () => undefined,
  catalogSources: null,
  catalogSourcesLoaded: false,
  catalogSourcesLoadError: undefined,
  refreshCatalogSources: () => undefined,
  pendingSourceIds: new Map(),
  markSourcePending: () => undefined,
});

export const ModelCatalogSettingsContextProvider: React.FC<
  ModelCatalogSettingsContextProviderProps
> = ({ children }) => {
  const {
    apiState,
    refreshAPIState,
    sourceConfigs: catalogSourceConfigs,
    sourceConfigsLoaded: catalogSourceConfigsLoaded,
    sourceConfigsLoadError: catalogSourceConfigsLoadError,
    refreshSourceConfigs: refreshCatalogSourceConfigs,
    catalogSources,
    catalogSourcesLoaded,
    catalogSourcesLoadError,
    refreshCatalogSources,
  } = useCatalogSettingsValue();

  const [pendingSourceIds, setPendingSourceIds] = React.useState<Map<string, string>>(new Map());
  const pendingSkipCountRef = React.useRef(new Map<string, number>());
  const pollGenerationRef = React.useRef(0);
  const lastSeenGenerationRef = React.useRef(new Map<string, number>());

  const markSourcePending = React.useCallback((id: string, previousStatus: string) => {
    lastSeenGenerationRef.current.set(id, pollGenerationRef.current);
    pendingSkipCountRef.current.set(id, 3);
    setPendingSourceIds((prev) => {
      const next = new Map(prev);
      next.set(id, previousStatus);
      return next;
    });
  }, []);

  React.useEffect(() => {
    pollGenerationRef.current += 1;
    const currentGeneration = pollGenerationRef.current;

    setPendingSourceIds((prev) => {
      if (prev.size === 0) {
        return prev;
      }
      const next = new Map(prev);
      let changed = false;
      for (const [id] of prev) {
        const markedAt = lastSeenGenerationRef.current.get(id) ?? 0;
        const pollsSinceMarked = currentGeneration - markedAt;
        const skipCount = pendingSkipCountRef.current.get(id) ?? 0;

        if (pollsSinceMarked <= skipCount) {
          continue;
        }
        const source = catalogSources?.items?.find((s) => s.id === id);
        if (!source || source.status) {
          next.delete(id);
          pendingSkipCountRef.current.delete(id);
          lastSeenGenerationRef.current.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [catalogSources]);

  const contextValue = React.useMemo(
    () => ({
      apiState,
      refreshAPIState,
      catalogSourceConfigs,
      catalogSourceConfigsLoaded,
      catalogSourceConfigsLoadError,
      refreshCatalogSourceConfigs,
      catalogSources,
      catalogSourcesLoaded,
      catalogSourcesLoadError,
      refreshCatalogSources,
      pendingSourceIds,
      markSourcePending,
    }),
    [
      apiState,
      refreshAPIState,
      catalogSourceConfigs,
      catalogSourceConfigsLoaded,
      catalogSourceConfigsLoadError,
      refreshCatalogSourceConfigs,
      catalogSources,
      catalogSourcesLoaded,
      catalogSourcesLoadError,
      refreshCatalogSources,
      pendingSourceIds,
      markSourcePending,
    ],
  );

  return (
    <ModelCatalogSettingsContext.Provider value={contextValue}>
      {children}
    </ModelCatalogSettingsContext.Provider>
  );
};
