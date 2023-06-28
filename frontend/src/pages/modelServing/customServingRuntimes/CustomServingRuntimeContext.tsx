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

  // TODO: Disable backend workaround when we migrate admin panel to Passthrough API
  const servingRuntimeTemplates = useContextResourceData<TemplateKind>(
    useTemplates(dashboardNamespace, true),
  );

  // TODO: Disable backend workaround when we migrate admin panel to Passthrough API
  const servingRuntimeTemplateOrder = useContextResourceData<string>(
    useTemplateOrder(dashboardNamespace, true),
    2 * 60 * 1000,
  );

  const servingRuntimeTemplateRefresh = servingRuntimeTemplates.refresh;
  const servingRuntimeTemplateOrderRefresh = servingRuntimeTemplateOrder.refresh;

  const refreshData = React.useCallback(() => {
    servingRuntimeTemplateRefresh();
    servingRuntimeTemplateOrderRefresh();
  }, [servingRuntimeTemplateRefresh, servingRuntimeTemplateOrderRefresh]);

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
