import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Bullseye, EmptyState, EmptyStateBody, Spinner } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { TemplateKind } from '~/k8sTypes';
import { DEFAULT_LIST_FETCH_STATE, DEFAULT_LIST_WATCH_RESULT } from '~/utilities/const';
import { CustomWatchK8sResult } from '~/types';
import { useDashboardNamespace } from '~/redux/selectors';
import { useTemplates } from '~/api';
import { FetchStateObject } from '~/utilities/useFetch';
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

const CustomServingRuntimeContextProvider: React.FC = () => {
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
  const servingRuntimeTemplateDisablementRefresh = servingRuntimeTemplateOrder.refresh;

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
      <Outlet />
    </CustomServingRuntimeContext.Provider>
  );
};

export default CustomServingRuntimeContextProvider;
