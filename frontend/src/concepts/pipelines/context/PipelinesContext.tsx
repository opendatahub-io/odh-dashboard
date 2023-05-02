import * as React from 'react';
import { Alert, Bullseye, Button, Stack, StackItem } from '@patternfly/react-core';
import { ProjectKind } from '~/k8sTypes';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import DeletePipelineServerModal from '~/concepts/pipelines/content/DeletePipelineServerModal';
import { ConfigurePipelinesServerModal } from '~/concepts/pipelines/content/configurePipelinesServer/ConfigurePipelinesServerModal';
import useAPIState, { APIState } from './useAPIState';
import usePipelineNamespaceCR from './usePipelineNamespaceCR';
import usePipelinesAPIRoute from './usePipelinesAPIRoute';

type PipelineContext = {
  hasCR: boolean;
  crInitializing: boolean;
  namespace: string;
  project: ProjectKind;
  refreshState: () => Promise<undefined>;
  refreshAPIState: () => void;
  apiState: APIState;
};

const PipelinesContext = React.createContext<PipelineContext>({
  hasCR: false,
  crInitializing: false,
  namespace: '',
  project: null as unknown as ProjectKind,
  refreshState: async () => undefined,
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

  const refreshState = React.useCallback(
    () => Promise.all([refreshCR(), refreshRoute()]).then(() => undefined),
    [refreshRoute, refreshCR],
  );

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
  const [configureModalVisible, setConfigureModalVisible] = React.useState(false);
  const { refreshState } = React.useContext(PipelinesContext);

  return (
    <>
      <Stack hasGutter>
        <StackItem>
          <Button variant={variant} onClick={() => setConfigureModalVisible(true)}>
            Create pipeline server
          </Button>
        </StackItem>
      </Stack>
      <ConfigurePipelinesServerModal
        open={configureModalVisible}
        onClose={() => {
          setConfigureModalVisible(false);
          refreshState();
        }}
      />
    </>
  );
};

export const DeleteModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { refreshState } = React.useContext(PipelinesContext);
  return (
    <DeletePipelineServerModal
      isOpen={isOpen}
      onClose={(deleted) => {
        if (deleted) {
          refreshState().then(onClose);
        } else {
          onClose();
        }
      }}
    />
  );
};
