import * as React from 'react';
import { SupportedArea, conditionalArea } from '~/concepts/areas';
import { useTemplates } from '~/api';
import { useDashboardNamespace } from '~/redux/selectors';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import useTemplateOrder from '~/pages/modelServing/customServingRuntimes/useTemplateOrder';
import { ContextResourceData, CustomWatchK8sResult } from '~/types';
import { TemplateKind } from '~/k8sTypes';
import { DEFAULT_CONTEXT_DATA, DEFAULT_LIST_WATCH_RESULT } from '~/utilities/const';
import useTemplateDisablement from '~/pages/modelServing/customServingRuntimes/useTemplateDisablement';
import useModelRegistryAPIState, { ModelRegistryAPIState } from './useModelRegistryAPIState';

export type ModelRegistryContextType = {
  apiState: ModelRegistryAPIState;
  refreshAPIState: () => void;
  servingRuntimeTemplates: CustomWatchK8sResult<TemplateKind[]>;
  servingRuntimeTemplateOrder: ContextResourceData<string>;
  servingRuntimeTemplateDisablement: ContextResourceData<string>;
};

type ModelRegistryContextProviderProps = {
  children: React.ReactNode;
  modelRegistryName: string;
};

export const ModelRegistryContext = React.createContext<ModelRegistryContextType>({
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  apiState: { apiAvailable: false, api: null as unknown as ModelRegistryAPIState['api'] },
  refreshAPIState: () => undefined,
  servingRuntimeTemplates: DEFAULT_LIST_WATCH_RESULT,
  servingRuntimeTemplateOrder: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplateDisablement: DEFAULT_CONTEXT_DATA,
});

export const ModelRegistryContextProvider = conditionalArea<ModelRegistryContextProviderProps>(
  SupportedArea.MODEL_REGISTRY,
  true,
)(({ children, modelRegistryName }) => {
  const { dashboardNamespace } = useDashboardNamespace();

  const servingRuntimeTemplates = useTemplates(dashboardNamespace);
  const servingRuntimeTemplateOrder = useContextResourceData<string>(
    useTemplateOrder(dashboardNamespace),
  );
  const servingRuntimeTemplateDisablement = useContextResourceData<string>(
    useTemplateDisablement(dashboardNamespace),
  );

  const hostPath = modelRegistryName ? `/api/service/modelregistry/${modelRegistryName}` : null;

  const [apiState, refreshAPIState] = useModelRegistryAPIState(hostPath);

  return (
    <ModelRegistryContext.Provider
      value={{
        apiState,
        refreshAPIState,
        servingRuntimeTemplates,
        servingRuntimeTemplateOrder,
        servingRuntimeTemplateDisablement,
      }}
    >
      {children}
    </ModelRegistryContext.Provider>
  );
});

type UseModelRegistryAPI = ModelRegistryAPIState & {
  refreshAllAPI: () => void;
};

export const useModelRegistryAPI = (): UseModelRegistryAPI => {
  const { apiState, refreshAPIState: refreshAllAPI } = React.useContext(ModelRegistryContext);

  return {
    refreshAllAPI,
    ...apiState,
  };
};
