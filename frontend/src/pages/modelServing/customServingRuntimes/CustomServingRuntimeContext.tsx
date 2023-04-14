import * as React from 'react';
import { Outlet } from 'react-router-dom';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { TemplateKind } from '~/k8sTypes';
import { DEFAULT_CONTEXT_DATA } from '~/utilities/const';
import { ContextResourceData } from '~/types';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import { useDashboardNamespace } from '~/redux/selectors';
import useTemplates from './useTemplates';
import useTemplateOrder from './useTemplateOrder';

type CustomServingRuntimeContextType = {
  refreshData: () => void;
  servingRuntimeTemplates: ContextResourceData<TemplateKind>;
  servingRuntimeTemplateOrder: ContextResourceData<string>;
};

export const CustomServingRuntimeContext = React.createContext<CustomServingRuntimeContextType>({
  refreshData: () => undefined,
  servingRuntimeTemplates: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplateOrder: DEFAULT_CONTEXT_DATA,
});

const CustomServingRuntimeContextProvider: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();

  const servingRuntimeTemplates = useContextResourceData<TemplateKind>(
    useTemplates(dashboardNamespace),
  );

  const servingRuntimeTemplateOrder = useContextResourceData<string>(
    useTemplateOrder(dashboardNamespace),
  );

  const servingRuntimeTeamplateRefresh = servingRuntimeTemplates.refresh;
  const servingRuntimeTeamplateOrderRefresh = servingRuntimeTemplateOrder.refresh;

  const refreshData = React.useCallback(() => {
    servingRuntimeTeamplateRefresh();
    servingRuntimeTeamplateOrderRefresh();
  }, [servingRuntimeTeamplateRefresh, servingRuntimeTeamplateOrderRefresh]);

  if (servingRuntimeTemplates.error || servingRuntimeTemplateOrder.error) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateIcon icon={ExclamationCircleIcon} />
          <Title headingLevel="h2" size="lg">
            Problem loading serving runtimes page
          </Title>
          <EmptyStateBody>
            {servingRuntimeTemplates?.error?.message || servingRuntimeTemplateOrder?.error?.message}
          </EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
  }

  if (!servingRuntimeTemplates.loaded || !servingRuntimeTemplateOrder.loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <CustomServingRuntimeContext.Provider
      value={{
        servingRuntimeTemplates,
        servingRuntimeTemplateOrder,
        refreshData,
      }}
    >
      <Outlet />
    </CustomServingRuntimeContext.Provider>
  );
};

export default CustomServingRuntimeContextProvider;
