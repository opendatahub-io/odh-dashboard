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
import { ServingRuntimeKind, TemplateKind } from '~/k8sTypes';
import { DEFAULT_CONTEXT_DATA } from '~/utilities/const';
import { ContextResourceData } from '~/types';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import { useDashboardNamespace } from '~/redux/selectors';
import { isServingRuntimeKind } from './utils';
import useTemplates from './useTemplates';
import useTemplateOrder from './useTemplateOrder';

type CustomServingRuntimeContextType = {
  refreshData: () => void;
  servingRuntimeTemplates: ContextResourceData<TemplateKind>;
  servingRuntimeTemplateOrder: ContextResourceData<string>;
  customServingRuntimes: ServingRuntimeKind[];
};

export const CustomServingRuntimeContext = React.createContext<CustomServingRuntimeContextType>({
  refreshData: () => undefined,
  servingRuntimeTemplates: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplateOrder: DEFAULT_CONTEXT_DATA,
  customServingRuntimes: [],
});

const CustomServingRuntimeContextProvider: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();

  const servingRuntimeTemplates = useContextResourceData<TemplateKind>(
    useTemplates(dashboardNamespace),
  );

  const servingRuntimeTemplateOrder = useContextResourceData<string>(
    useTemplateOrder(dashboardNamespace),
    2 * 60 * 1000,
  );

  const customServingRuntimes = React.useMemo(
    () =>
      servingRuntimeTemplates.data
        .map((template) => template.objects[0])
        .filter((object): object is ServingRuntimeKind => isServingRuntimeKind(object)),
    [servingRuntimeTemplates],
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
        customServingRuntimes,
        refreshData,
      }}
    >
      <Outlet />
    </CustomServingRuntimeContext.Provider>
  );
};

export default CustomServingRuntimeContextProvider;
