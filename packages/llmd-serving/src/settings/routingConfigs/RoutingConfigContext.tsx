import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Bullseye, EmptyState, EmptyStateBody, Spinner } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { type LLMInferenceServiceConfigKind } from '../../types';
import { useWatchRouterConfigs } from '../../api/LLMInferenceServiceConfigs';

type RoutingConfigContextType = {
  configs: LLMInferenceServiceConfigKind[];
};

export const RoutingConfigContext = React.createContext<RoutingConfigContextType>({
  configs: [],
});

const RoutingConfigContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [configs, loaded, error] = useWatchRouterConfigs(dashboardNamespace);

  const contextValue = React.useMemo(() => ({ configs }), [configs]);

  if (error) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          status="danger"
          titleText="Problem loading llm-d routing configurations"
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
    <RoutingConfigContext.Provider value={contextValue}>
      {children ?? <Outlet />}
    </RoutingConfigContext.Provider>
  );
};

export default RoutingConfigContextProvider;
