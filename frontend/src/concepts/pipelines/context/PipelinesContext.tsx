import * as React from 'react';
import { Alert, Bullseye, Button, Stack, StackItem } from '@patternfly/react-core';
import { createPipelinesCR } from '~/api';
import { ProjectKind } from '~/k8sTypes';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import useAPIState, { APIState } from './useAPIState';
import usePipelineNamespaceCR from './usePipelineNamespaceCR';
import usePipelinesAPIRoute from './usePipelinesAPIRoute';

type PipelineContext = {
  hasCR: boolean;
  crInitializing: boolean;
  namespace: string;
  project: ProjectKind;
  refreshState: () => void;
  refreshAPIState: () => void;
  apiState: APIState;
};

const PipelinesContext = React.createContext<PipelineContext>({
  hasCR: false,
  crInitializing: false,
  namespace: '',
  project: null as unknown as ProjectKind,
  refreshState: () => undefined,
  refreshAPIState: () => undefined,
  apiState: { apiAvailable: false, api: null as unknown as APIState['api'] },
});

type PipelineContextProviderProps = {
  children: React.ReactNode;
  namespace: string;
};

export const PipelineContextProvider: React.FC<PipelineContextProviderProps> = ({
  children,
  namespace,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const project = projects.find(byName(namespace));
  const [pipelineNamespaceCR, crLoaded, crLoadError, refreshCR] = usePipelineNamespaceCR(namespace);
  // TODO: Implement the status loading flag from the CR
  const isCRPresent = crLoaded && !!pipelineNamespaceCR;
  const [pipelineAPIRouteHost, routeLoaded, routeLoadError, refreshRoute] = usePipelinesAPIRoute(
    isCRPresent,
    namespace,
  );
  const hostPath = routeLoaded && pipelineAPIRouteHost ? pipelineAPIRouteHost : null;

  const refreshState = React.useCallback(() => {
    refreshCR();
    refreshRoute();
  }, [refreshRoute, refreshCR]);

  const [apiState, refreshAPIState] = useAPIState(hostPath);

  let error = crLoadError || routeLoadError;
  if (error || !project) {
    error = error || new Error('Project not found');
    return (
      <Bullseye>
        <Alert title="Pipelines load error" variant="danger" isInline>
          {error.message}
        </Alert>
      </Bullseye>
    );
  }

  return (
    <PipelinesContext.Provider
      value={{
        hasCR: isCRPresent,
        crInitializing: !crLoaded,
        project,
        apiState,
        namespace,
        refreshState,
        refreshAPIState,
      }}
    >
      {children}
    </PipelinesContext.Provider>
  );
};

type UsePipelinesAPI = APIState & {
  /** The contextual namespace */
  namespace: string;
  /** The Project resource behind the namespace */
  project: ProjectKind;
  /** State of the CR */
  pipelinesServer: { initializing: boolean; installed: boolean };
  /**
   * Allows agnostic functionality to request all watched API to be reacquired.
   * Triggering this will invalidate the memo for API - pay attention to only calling it once per need.
   */
  refreshAllAPI: () => void;
};

export const usePipelinesAPI = (): UsePipelinesAPI => {
  const {
    hasCR,
    crInitializing,
    apiState,
    namespace,
    project,
    refreshAPIState: refreshAllAPI,
  } = React.useContext(PipelinesContext);

  const pipelinesServer: UsePipelinesAPI['pipelinesServer'] = {
    initializing: crInitializing,
    installed: hasCR,
  };

  return {
    pipelinesServer,
    namespace,
    project,
    refreshAllAPI,
    ...apiState,
  };
};

type CreatePipelineServerButtonProps = {
  variant: 'primary' | 'secondary';
};

export const CreatePipelineServerButton: React.FC<CreatePipelineServerButtonProps> = ({
  variant,
}) => {
  const { namespace, refreshState } = React.useContext(PipelinesContext);
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const createCR = () => {
    setCreating(true);
    setError(null);
    createPipelinesCR(namespace)
      .then(() => {
        refreshState();
        // Don't reset creating state, this component is not needed once we have it and the caller
        // should navigate away on their own as they will not need to create anymore
      })
      .catch((e) => {
        setCreating(false);
        setError(e);
      });
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <Button variant={variant} onClick={createCR} isDisabled={creating}>
          Create pipeline server
        </Button>
      </StackItem>
      {error && (
        <StackItem>
          <Alert isInline variant="danger" title="Error creating">
            {error.message}
          </Alert>
        </StackItem>
      )}
    </Stack>
  );
};
