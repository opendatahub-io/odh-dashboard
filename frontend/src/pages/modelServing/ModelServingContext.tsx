import * as React from 'react';
import { ServingRuntimeKind, InferenceServiceKind } from '../../k8sTypes';
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
import { DEFAULT_CONTEXT_DATA } from '../../utilities/const';
import useServingRuntimes from './useServingRuntimes';
import useInferenceServices from './useInferenceServices';
import { ContextResourceData } from '../../types';
import { useContextResourceData } from '../../utilities/useContextResourceData';

type ModelServingContextType = {
  refreshAllData: () => void;
  servingRuntimes: ContextResourceData<ServingRuntimeKind>;
  inferenceServices: ContextResourceData<InferenceServiceKind>;
};

export const ModelServingContext = React.createContext<ModelServingContextType>({
  refreshAllData: () => undefined,
  servingRuntimes: DEFAULT_CONTEXT_DATA,
  inferenceServices: DEFAULT_CONTEXT_DATA,
});

const ModelServingContextProvider: React.FC = () => {
  const navigate = useNavigate();
  const { namespace } = useParams<{ namespace: string }>();
  const servingRuntimes = useContextResourceData<ServingRuntimeKind>(useServingRuntimes(namespace));
  const inferenceServices = useContextResourceData<InferenceServiceKind>(
    useInferenceServices(namespace),
  );

  const servingRuntimeRefresh = servingRuntimes.refresh;
  const inferenceServiceRefresh = inferenceServices.refresh;
  const refreshAllData = React.useCallback(() => {
    servingRuntimeRefresh();
    inferenceServiceRefresh();
  }, [servingRuntimeRefresh, inferenceServiceRefresh]);

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
