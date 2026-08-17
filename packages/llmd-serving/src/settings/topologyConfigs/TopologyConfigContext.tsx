import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Bullseye, EmptyState, EmptyStateBody, Spinner } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { type LLMInferenceServiceConfigKind } from '../../types';
import { useWatchTopologyConfigs } from '../../api/LLMInferenceServiceConfigs';

type TopologyConfigContextType = {
  configs: LLMInferenceServiceConfigKind[];
};

export const TopologyConfigContext = React.createContext<TopologyConfigContextType>({
  configs: [],
});

const TopologyConfigContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [configs, loaded, error] = useWatchTopologyConfigs(dashboardNamespace);

  const contextValue = React.useMemo(() => ({ configs }), [configs]);

  if (error) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          status="danger"
          titleText="Problem loading llm-d topology configurations"
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
    <TopologyConfigContext.Provider value={contextValue}>
      {children ?? <Outlet />}
    </TopologyConfigContext.Provider>
  );
};

export default TopologyConfigContextProvider;
