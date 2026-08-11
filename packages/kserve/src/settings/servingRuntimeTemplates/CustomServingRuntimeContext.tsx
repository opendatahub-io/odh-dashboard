import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Bullseye, EmptyState, EmptyStateBody, Spinner } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import { DEFAULT_LIST_FETCH_STATE } from '@odh-dashboard/ui-core/utilities/fetchState';
import { DEFAULT_LIST_WATCH_RESULT } from '@odh-dashboard/internal/utilities/const';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { useTemplates } from '@odh-dashboard/internal/api';
import useTemplateOrder from './useTemplateOrder';
import useTemplateDisablement from './useTemplateDisablement';

type CustomServingRuntimeContextType = {
  refreshData: () => void;
  servingRuntimeTemplates: CustomWatchK8sResult<TemplateKind[]>;
  servingRuntimeTemplateOrder: FetchStateObject<string[]>;
  servingRuntimeTemplateDisablement: FetchStateObject<string[]>;
};

export const CustomServingRuntimeContext = React.createContext<CustomServingRuntimeContextType>({
  refreshData: () => undefined,
  servingRuntimeTemplates: DEFAULT_LIST_WATCH_RESULT,
  servingRuntimeTemplateOrder: DEFAULT_LIST_FETCH_STATE,
  servingRuntimeTemplateDisablement: DEFAULT_LIST_FETCH_STATE,
});

const CustomServingRuntimeContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { dashboardNamespace } = useDashboardNamespace();

  const servingRuntimeTemplates = useTemplates(dashboardNamespace);

  // TODO: Disable backend workaround when we migrate admin panel to Passthrough API
  const servingRuntimeTemplateOrder = useTemplateOrder(dashboardNamespace, true, {
    refreshRate: 2 * 60 * 1000,
  });

  // TODO: Disable backend workaround when we migrate admin panel to Passthrough API
  const servingRuntimeTemplateDisablement = useTemplateDisablement(dashboardNamespace, true, {
    refreshRate: 2 * 60 * 1000,
  });

  const servingRuntimeTemplateOrderRefresh = servingRuntimeTemplateOrder.refresh;
  const servingRuntimeTemplateDisablementRefresh = servingRuntimeTemplateDisablement.refresh;

  const refreshData = React.useCallback(() => {
    servingRuntimeTemplateOrderRefresh();
    servingRuntimeTemplateDisablementRefresh();
  }, [servingRuntimeTemplateOrderRefresh, servingRuntimeTemplateDisablementRefresh]);

  const contextValue = React.useMemo(
    () => ({
      servingRuntimeTemplates,
      servingRuntimeTemplateOrder,
      servingRuntimeTemplateDisablement,
      refreshData,
    }),
    [
      servingRuntimeTemplates,
      servingRuntimeTemplateOrder,
      servingRuntimeTemplateDisablement,
      refreshData,
    ],
  );

  if (
    servingRuntimeTemplates[2] ||
    servingRuntimeTemplateOrder.error ||
    servingRuntimeTemplateDisablement.error
  ) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Problem loading serving runtimes page"
        >
          <EmptyStateBody>
            {servingRuntimeTemplates[2]?.message || servingRuntimeTemplateOrder.error?.message}
          </EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
  }

  if (
    !servingRuntimeTemplates[1] ||
    !servingRuntimeTemplateOrder.loaded ||
    !servingRuntimeTemplateDisablement.loaded
  ) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <CustomServingRuntimeContext.Provider value={contextValue}>
      {children ?? <Outlet />}
    </CustomServingRuntimeContext.Provider>
  );
};

export default CustomServingRuntimeContextProvider;
