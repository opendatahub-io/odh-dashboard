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
import useTemplates from './useTemplates';

type CustomServingRuntimeContextType = {
  refreshData: () => void;
  servingRuntimeTemplates: ContextResourceData<TemplateKind>;
};

export const CustomServingRuntimeContext = React.createContext<CustomServingRuntimeContextType>({
  refreshData: () => undefined,
  servingRuntimeTemplates: DEFAULT_CONTEXT_DATA,
});

const CustomServingRuntimeContextProvider: React.FC = () => {
  const servingRuntimeTemplates = useContextResourceData<TemplateKind>(useTemplates('opendatahub')); // TODO: change to operator namespace

  const servingRuntimeTeamplateRefresh = servingRuntimeTemplates.refresh;

  const refreshData = React.useCallback(() => {
    servingRuntimeTeamplateRefresh();
  }, [servingRuntimeTeamplateRefresh]);

  if (servingRuntimeTemplates.error) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateIcon icon={ExclamationCircleIcon} />
          <Title headingLevel="h4" size="lg">
            Problem loading serving runtimes page
          </Title>
          <EmptyStateBody>{servingRuntimeTemplates.error?.message}</EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
  }

  if (!servingRuntimeTemplates.loaded) {
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
        refreshData,
      }}
    >
      <Outlet />
    </CustomServingRuntimeContext.Provider>
  );
};

export default CustomServingRuntimeContextProvider;
