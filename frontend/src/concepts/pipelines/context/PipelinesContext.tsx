import * as React from 'react';
import { Alert, Bullseye, Button, Stack, StackItem } from '@patternfly/react-core';
import { PipelineAPIs } from '~/concepts/pipelines/types';
import { createPipelinesCR, listPipelineRuns, listPipelines } from '~/api';
import usePipelineNamespaceCR from './usePipelineNamespaceCR';
import usePipelinesAPIRoute from './usePipelinesAPIRoute';

type PipelineContext = {
  hasCR: boolean;
  crInitializing: boolean;
  hostPath: string | null;
  namespace: string;
  refreshState: () => void;
};

const PipelinesContext = React.createContext<PipelineContext>({
  hasCR: false,
  crInitializing: false,
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
  const [pipelineNamespaceCR, crLoaded, crLoadError, refreshCR] = usePipelineNamespaceCR(namespace);
  // TODO: Do we need more than just knowing it exists?
  const isCRPresent = crLoaded && !!pipelineNamespaceCR;
  // TODO: Manage the route being free but the pods not being spun up yet
  const [pipelineAPIRouteHost, routeLoaded, routeLoadError, refreshRoute] = usePipelinesAPIRoute(
    isCRPresent,
    namespace,
  );
  const hostPath = routeLoaded && pipelineAPIRouteHost ? pipelineAPIRouteHost : null;

  const refreshState = React.useCallback(() => {
    refreshCR();
    refreshRoute();
  }, [refreshRoute, refreshCR]);

  const error = crLoadError || routeLoadError;
  if (error) {
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
        hostPath,
        namespace,
        refreshState,
      }}
    >
      {children}
    </PipelinesContext.Provider>
  );
};

type UsePipelinesAPI = {
  /** The contextual namespace */
  namespace: string;
  /** State of the CR */
  pipelinesServer: { initializing: boolean; installed: boolean };
  /** If API will successfully call */
  apiAvailable: boolean;
  /** The available API functions */
  api: PipelineAPIs;
};

export const usePipelinesAPI = (): UsePipelinesAPI => {
  const { hasCR, crInitializing, hostPath, namespace } = React.useContext(PipelinesContext);

  const pipelinesServer: UsePipelinesAPI['pipelinesServer'] = {
    initializing: crInitializing,
    installed: hasCR,
  };

  const apiState = React.useMemo<Pick<UsePipelinesAPI, 'apiAvailable' | 'api'>>(() => {
    let path = hostPath;
    if (!path) {
      // TODO: we need to figure out maybe a stopgap or something
      path = '';
    }

    return {
      apiAvailable: !!path,
      api: {
        listPipelines: listPipelines(path),
        listPipelineRuns: listPipelineRuns(path),
      },
    };
  }, [hostPath]);

  return {
    pipelinesServer,
    namespace,
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
