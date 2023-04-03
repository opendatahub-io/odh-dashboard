import * as React from 'react';
import { Alert, Bullseye, Button, Stack, StackItem } from '@patternfly/react-core';
import { PipelineAPIs } from '~/concepts/pipelines/types';
import { createPipelinesCR, listPipelines } from '~/api';
import usePipelineNamespaceCR from './usePipelineNamespaceCR';
import usePipelinesAPIRoute from './usePipelinesAPIRoute';

type PipelineContext = {
  hasCR: boolean;
  hostPath: string | null;
  namespace: string;
  initializing: boolean;
  refreshState: () => void;
};

const PipelinesContext = React.createContext<PipelineContext>({
  hasCR: false,
  hostPath: null,
  initializing: false,
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
        initializing: !crLoaded,
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
  pipelinesServer: { initializing: boolean; installed: boolean };
  namespace: string;
} & (
  | {
      apiAvailable: true;
      api: PipelineAPIs;
    }
  | {
      apiAvailable: false;
    }
);

export const usePipelinesAPI = (): UsePipelinesAPI => {
  const { hasCR, initializing, hostPath, namespace } = React.useContext(PipelinesContext);

  const pipelinesServer: UsePipelinesAPI['pipelinesServer'] = { initializing, installed: hasCR };

  if (!hostPath) {
    return {
      pipelinesServer,
      namespace,
      apiAvailable: false,
    };
  }

  return {
    pipelinesServer,
    namespace,
    apiAvailable: true,
    api: {
      // TODO: apis!
      // eg uploadPipeline: (content: string) => uploadPipeline(hostPath, content),
      listPipelines: listPipelines(hostPath),
    },
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
