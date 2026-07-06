import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Bullseye, EmptyState, EmptyStateBody, Spinner } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import type { LLMInferenceServiceConfigKind } from '../types';
import { CONFIG_TYPE_LABEL, ConfigType } from '../types';
import { useWatchLLMInferenceServiceConfigs } from '../api/LLMInferenceServiceConfigs';

const ACCELERATOR_LABEL_SELECTOR = { [CONFIG_TYPE_LABEL]: ConfigType.ACCELERATOR };

type VllmAcceleratorConfigContextType = {
  configs: LLMInferenceServiceConfigKind[];
};

export const VllmAcceleratorConfigContext = React.createContext<VllmAcceleratorConfigContextType>({
  configs: [],
});

const VllmAcceleratorConfigContextProvider: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [configs, loaded, error] = useWatchLLMInferenceServiceConfigs(
    dashboardNamespace,
    ACCELERATOR_LABEL_SELECTOR,
  );

  const contextValue = React.useMemo(() => ({ configs }), [configs]);

  if (error) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          status="danger"
          titleText="Problem loading vLLM accelerator configurations"
        >
          <EmptyStateBody>{error.message}</EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
  }

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <VllmAcceleratorConfigContext.Provider value={contextValue}>
      <Outlet />
    </VllmAcceleratorConfigContext.Provider>
  );
};

export default VllmAcceleratorConfigContextProvider;
