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
import { ServingRuntimeKind, InferenceServiceKind, ProjectKind } from '~/k8sTypes';
import { DEFAULT_CONTEXT_DATA } from '~/utilities/const';
import { ContextResourceData } from '~/types';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import useUserProjects from '~/pages/projects/screens/projects/useUserProjects';
import useInferenceServices from './useInferenceServices';
import useServingRuntimes from './useServingRuntimes';

type ModelServingContextType = {
  refreshAllData: () => void;
  servingRuntimes: ContextResourceData<ServingRuntimeKind>;
  inferenceServices: ContextResourceData<InferenceServiceKind>;
  projects: ContextResourceData<ProjectKind>;
};

export const ModelServingContext = React.createContext<ModelServingContextType>({
  refreshAllData: () => undefined,
  servingRuntimes: DEFAULT_CONTEXT_DATA,
  inferenceServices: DEFAULT_CONTEXT_DATA,
  projects: DEFAULT_CONTEXT_DATA,
});

const ModelServingContextProvider: React.FC = () => {
  const navigate = useNavigate();
  const { namespace } = useParams<{ namespace: string }>();
  const projects = useContextResourceData<ProjectKind>(useUserProjects());
  const servingRuntimes = useContextResourceData<ServingRuntimeKind>(useServingRuntimes(namespace));
  const inferenceServices = useContextResourceData<InferenceServiceKind>(
    useInferenceServices(namespace),
  );

  const projectRefresh = projects.refresh;
  const servingRuntimeRefresh = servingRuntimes.refresh;
  const inferenceServiceRefresh = inferenceServices.refresh;
  const refreshAllData = React.useCallback(() => {
    projectRefresh();
    servingRuntimeRefresh();
    inferenceServiceRefresh();
  }, [projectRefresh, servingRuntimeRefresh, inferenceServiceRefresh]);

  if (servingRuntimes.error || inferenceServices.error) {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateIcon icon={ExclamationCircleIcon} />
          <Title headingLevel="h4" size="lg">
            Problem loading model serving page
          </Title>
          <EmptyStateBody>
            {servingRuntimes.error?.message || inferenceServices.error?.message}
          </EmptyStateBody>
          <Button variant="primary" onClick={() => navigate('/projects')}>
            View my projects
          </Button>
        </EmptyState>
      </Bullseye>
    );
  }

  if (!servingRuntimes.loaded || !inferenceServices.loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <ModelServingContext.Provider
      value={{
        projects,
        servingRuntimes,
        inferenceServices,
        refreshAllData,
      }}
    >
      <Outlet />
    </ModelServingContext.Provider>
  );
};

export default ModelServingContextProvider;
