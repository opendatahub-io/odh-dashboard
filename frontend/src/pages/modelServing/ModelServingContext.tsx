import * as React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ServingRuntimeKind, InferenceServiceKind, TemplateKind } from '~/k8sTypes';
import { DEFAULT_CONTEXT_DATA } from '~/utilities/const';
import { ContextResourceData } from '~/types';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import { useDashboardNamespace } from '~/redux/selectors';
import { DataConnection } from '~/pages/projects/types';
import useDataConnections from '~/pages/projects/screens/detail/data-connections/useDataConnections';
import useSyncPreferredProject from '~/concepts/projects/useSyncPreferredProject';
import { ProjectsContext, byName } from '~/concepts/projects/ProjectsContext';
import useInferenceServices from './useInferenceServices';
import useServingRuntimes from './useServingRuntimes';
import useTemplates from './customServingRuntimes/useTemplates';
import useTemplateOrder from './customServingRuntimes/useTemplateOrder';
import useTemplateDisablement from './customServingRuntimes/useTemplateDisablement';

type ModelServingContextType = {
  refreshAllData: () => void;
  dataConnections: ContextResourceData<DataConnection>;
  servingRuntimeTemplates: ContextResourceData<TemplateKind>;
  servingRuntimeTemplateOrder: ContextResourceData<string>;
  servingRuntimeTemplateDisablement: ContextResourceData<string>;
  servingRuntimes: ContextResourceData<ServingRuntimeKind>;
  inferenceServices: ContextResourceData<InferenceServiceKind>;
};

export const ModelServingContext = React.createContext<ModelServingContextType>({
  refreshAllData: () => undefined,
  dataConnections: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplates: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplateOrder: DEFAULT_CONTEXT_DATA,
  servingRuntimeTemplateDisablement: DEFAULT_CONTEXT_DATA,
  servingRuntimes: DEFAULT_CONTEXT_DATA,
  inferenceServices: DEFAULT_CONTEXT_DATA,
});

const ModelServingContextProvider: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const navigate = useNavigate();
  const { namespace } = useParams<{ namespace: string }>();
  const { projects } = React.useContext(ProjectsContext);
  const project = projects.find(byName(namespace)) ?? null;
  useSyncPreferredProject(project);
  const servingRuntimeTemplates = useContextResourceData<TemplateKind>(
    useTemplates(dashboardNamespace),
  );
  const servingRuntimeTemplateOrder = useContextResourceData<string>(
    useTemplateOrder(dashboardNamespace),
  );
  const servingRuntimeTemplateDisablement = useContextResourceData<string>(
    useTemplateDisablement(dashboardNamespace),
  );
  const servingRuntimes = useContextResourceData<ServingRuntimeKind>(useServingRuntimes(namespace));
  const inferenceServices = useContextResourceData<InferenceServiceKind>(
    useInferenceServices(namespace),
  );
  const dataConnections = useContextResourceData<DataConnection>(useDataConnections(namespace));

  const servingRuntimeRefresh = servingRuntimes.refresh;
  const inferenceServiceRefresh = inferenceServices.refresh;
  const dataConnectionRefresh = dataConnections.refresh;
  const refreshAllData = React.useCallback(() => {
    servingRuntimeRefresh();
    inferenceServiceRefresh();
    dataConnectionRefresh();
  }, [servingRuntimeRefresh, inferenceServiceRefresh, dataConnectionRefresh]);

  if (
    servingRuntimes.error ||
    inferenceServices.error ||
    servingRuntimeTemplates.error ||
    servingRuntimeTemplateOrder.error ||
    servingRuntimeTemplateDisablement.error ||
    dataConnections.error
  ) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateIcon icon={ExclamationCircleIcon} />
          <Title headingLevel="h2" size="lg">
            Problem loading model serving page
          </Title>
          <EmptyStateBody>
            {servingRuntimes.error?.message ||
              inferenceServices.error?.message ||
              servingRuntimeTemplates.error?.message ||
              servingRuntimeTemplateOrder.error?.message ||
              servingRuntimeTemplateDisablement.error?.message ||
              dataConnections.error?.message}
          </EmptyStateBody>
          <Button variant="primary" onClick={() => navigate('/projects')}>
            View my projects
          </Button>
        </EmptyState>
      </Bullseye>
    );
  }

  if (
    !servingRuntimes.loaded ||
    !inferenceServices.loaded ||
    !servingRuntimeTemplates.loaded ||
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
    <ModelServingContext.Provider
      value={{
        servingRuntimes,
        inferenceServices,
        servingRuntimeTemplates,
        servingRuntimeTemplateOrder,
        servingRuntimeTemplateDisablement,
        dataConnections,
        refreshAllData,
      }}
    >
      <Outlet />
    </ModelServingContext.Provider>
  );
};

export default ModelServingContextProvider;
