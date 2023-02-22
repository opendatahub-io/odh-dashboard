import * as React from 'react';
import usePipelineNamespaceCR from './usePipelineNamespaceCR';
import {
  Alert,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { PipelineAPIs } from '../types';
import usePipelinesAPIRoute from './usePipelinesAPIRoute';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { createPipelinesCR } from '../../../api';
import useProject from '../../../pages/projects/useProject';

type PipelineContext = {
  hasCR: boolean;
  hostPath: string | null;
  namespace: string;
  refreshState: () => void;
};

const PipelinesContext = React.createContext<PipelineContext>({
  hasCR: false,
  hostPath: null,
  namespace: '',
  refreshState: () => undefined,
});

type PipelineContextProviderProps = {
  children: React.ReactNode;
  namespace: string;
};

export const PipelineContextProvider: React.FC<PipelineContextProviderProps> = ({
  children,
  namespace,
}) => {
  const [, projectLoaded, projectLoadError] = useProject(namespace);
  const [pipelineNamespaceCR, crLoaded, crLoadError, refreshCR] = usePipelineNamespaceCR(namespace);
  // TODO: Do we need more than just knowing it exists?
  const isCRPresent = !!pipelineNamespaceCR;
  const [pipelineAPIRoute, routeLoaded, routeLoadError, refreshRoute] = usePipelinesAPIRoute(
    isCRPresent,
    namespace,
  );

  const refreshState = React.useCallback(() => {
    refreshCR();
    refreshRoute();
  }, [refreshRoute, refreshCR]);

  if (projectLoadError) {
    return (
      <Bullseye>
        <Alert title="Project does not exist" variant="danger" isInline>
          {projectLoadError.message}
        </Alert>
      </Bullseye>
    );
  }

  if (crLoadError || routeLoadError) {
    return (
      <Bullseye>
        <Alert title="Pipelines load error" variant="danger" isInline>
          {crLoadError?.message || routeLoadError?.message}
        </Alert>
      </Bullseye>
    );
  }

  const isLoading = !projectLoaded || !crLoaded || (isCRPresent && !routeLoaded);
  if (isLoading) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <PipelinesContext.Provider
      value={{
        hasCR: isCRPresent,
        hostPath: pipelineAPIRoute?.spec.host || null,
        namespace,
        refreshState,
      }}
    >
      {children}
    </PipelinesContext.Provider>
  );
};

type UsePipelinesAPI = {
  pipelinesEnabled: boolean;
  apiAvailable: boolean;
  api: PipelineAPIs;
};

export const usePipelinesAPI = (): UsePipelinesAPI => {
  const { hasCR, hostPath } = React.useContext(PipelinesContext);

  console.debug('usePipelinesAPI on', hostPath);

  return {
    pipelinesEnabled: hasCR,
    apiAvailable: !!hostPath,
    api: {
      // TODO: apis!
      // eg uploadPipeline: (content: string) => uploadPipeline(hostPath, content),
    },
  };
};

export const CreateCR: React.FC = () => {
  const { namespace, refreshState } = React.useContext(PipelinesContext);
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const createCR = () => {
    setCreating(true);
    setError(null);
    createPipelinesCR(namespace)
      .then(() => {
        refreshState();
        setCreating(false);
      })
      .catch((e) => {
        setCreating(false);
        setError(e);
      });
  };

  return (
    <EmptyState>
      <EmptyStateIcon icon={PlusCircleIcon} />
      <Title headingLevel="h1" size="lg">
        Pipelines is not setup
      </Title>
      <EmptyStateBody>You&rsquo;ll need to setup Pipelines for this namespace.</EmptyStateBody>
      <Button variant="primary" onClick={createCR} isDisabled={creating}>
        Enable Pipelines!
      </Button>
      {error && (
        <Alert isInline variant="danger" title="Error creating">
          {error.message}
        </Alert>
      )}
    </EmptyState>
  );
};
