import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Bullseye, EmptyState, EmptyStateBody, Spinner } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { CONFIG_TYPE_LABEL } from '../../const';
import { ConfigType, type LLMInferenceServiceConfigKind } from '../../types';
import { useWatchLLMInferenceServiceConfigs } from '../../api/LLMInferenceServiceConfigs';

const ACCELERATOR_LABEL_SELECTOR = { [CONFIG_TYPE_LABEL]: ConfigType.ACCELERATOR };

type LlmAcceleratorConfigContextType = {
  configs: LLMInferenceServiceConfigKind[];
};

export const LlmAcceleratorConfigContext = React.createContext<LlmAcceleratorConfigContextType>({
  configs: [],
});

const LlmAcceleratorConfigContextProvider: React.FC = () => {
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
          titleText="Problem loading LLM accelerator configurations"
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
    <LlmAcceleratorConfigContext.Provider value={contextValue}>
      <Outlet />
    </LlmAcceleratorConfigContext.Provider>
  );
};

export default LlmAcceleratorConfigContextProvider;
