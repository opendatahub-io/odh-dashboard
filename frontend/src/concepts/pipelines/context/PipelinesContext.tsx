import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  AlertActionLink,
  Bullseye,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ProjectKind } from '~/k8sTypes';
import { PipelineCoreResourceKF, PipelineRunJobKF } from '~/concepts/pipelines/kfTypes';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import DeletePipelineServerModal from '~/concepts/pipelines/content/DeletePipelineServerModal';
import { ConfigurePipelinesServerModal } from '~/concepts/pipelines/content/configurePipelinesServer/ConfigurePipelinesServerModal';
import ViewPipelineServerModal from '~/concepts/pipelines/content/ViewPipelineServerModal';
import useSyncPreferredProject from '~/concepts/projects/useSyncPreferredProject';
import useManageElyraSecret from '~/concepts/pipelines/context/useManageElyraSecret';
import { deleteServer } from '~/concepts/pipelines/utils';
import useJobRelatedInformation from '~/concepts/pipelines/context/useJobRelatedInformation';
import useAPIState, { APIState } from './useAPIState';
import usePipelineNamespaceCR, { dspaLoaded, hasServerTimedOut } from './usePipelineNamespaceCR';
import usePipelinesAPIRoute from './usePipelinesAPIRoute';

type JobStatus = {
  loading: boolean;
  data: PipelineRunJobKF | null;
};

type GetJobInformation = (resource: PipelineCoreResourceKF) => JobStatus;
type PipelineContext = {
  hasCR: boolean;
  crInitializing: boolean;
  serverTimedOut: boolean;
  ignoreTimedOut: () => void;
  namespace: string;
  project: ProjectKind;
  refreshState: () => Promise<undefined>;
  refreshAPIState: () => void;
  apiState: APIState;
  getJobInformation: GetJobInformation;
};

const PipelinesContext = React.createContext<PipelineContext>({
  hasCR: false,
  crInitializing: false,
  serverTimedOut: false,
  ignoreTimedOut: () => undefined,
  namespace: '',
  project: null as unknown as ProjectKind,
  refreshState: async () => undefined,
  refreshAPIState: () => undefined,
  getJobInformation: () => ({
    loading: false,
    data: null,
  }),
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
  const project = projects.find(byName(namespace)) ?? null;
  useSyncPreferredProject(project);

  const state = usePipelineNamespaceCR(namespace);
  const [pipelineNamespaceCR, crLoaded, crLoadError, refreshCR] = state;
  const isCRReady = dspaLoaded(state);
  const [disableTimeout, setDisableTimeout] = React.useState(false);
  const serverTimedOut = !disableTimeout && hasServerTimedOut(state, isCRReady);
  const ignoreTimedOut = React.useCallback(() => {
    setDisableTimeout(true);
  }, []);

  const [pipelineAPIRouteHost, routeLoaded, routeLoadError, refreshRoute] = usePipelinesAPIRoute(
    isCRReady,
    namespace,
  );

  const hostPath = routeLoaded && pipelineAPIRouteHost ? pipelineAPIRouteHost : null;
  useManageElyraSecret(namespace, pipelineNamespaceCR, hostPath);

  const refreshState = React.useCallback(
    () => Promise.all([refreshCR(), refreshRoute()]).then(() => undefined),
    [refreshRoute, refreshCR],
  );

  const [apiState, refreshAPIState] = useAPIState(hostPath);
  const { getJobInformation } = useJobRelatedInformation(apiState);
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
        hasCR: !!pipelineNamespaceCR,
        crInitializing: !crLoaded,
        serverTimedOut,
        ignoreTimedOut,
        project,
        apiState,
        namespace,
        refreshState,
        refreshAPIState,
        getJobInformation,
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
  pipelinesServer: { initializing: boolean; installed: boolean; timedOut: boolean };
  /**
   * Allows agnostic functionality to request all watched API to be reacquired.
   * Triggering this will invalidate the memo for API - pay attention to only calling it once per need.
   */
  getJobInformation: GetJobInformation;
  refreshAllAPI: () => void;
};

export const usePipelinesAPI = (): UsePipelinesAPI => {
  const {
    hasCR,
    crInitializing,
    serverTimedOut,
    apiState,
    namespace,
    project,
    refreshAPIState: refreshAllAPI,
    getJobInformation,
  } = React.useContext(PipelinesContext);

  const pipelinesServer: UsePipelinesAPI['pipelinesServer'] = {
    initializing: crInitializing,
    installed: hasCR,
    timedOut: serverTimedOut,
  };

  return {
    pipelinesServer,
    namespace,
    project,
    refreshAllAPI,
    getJobInformation,
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
            Create a pipeline server
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

export const DeleteServerModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
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

export const ViewServerModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { namespace } = React.useContext(PipelinesContext);
  const [pipelineNamespaceCR] = usePipelineNamespaceCR(namespace);

  return (
    <ViewPipelineServerModal
      isOpen={isOpen}
      onClose={onClose}
      pipelineNamespaceCR={pipelineNamespaceCR}
    />
  );
};

export const PipelineServerTimedOut: React.FC = () => {
  const { namespace, refreshState, ignoreTimedOut } = React.useContext(PipelinesContext);

  return (
    <Alert
      variant="danger"
      isInline
      title="Pipeline server failed"
      actionClose={<AlertActionCloseButton onClose={() => ignoreTimedOut()} />}
      actionLinks={
        <>
          <AlertActionLink onClick={() => deleteServer(namespace).then(() => refreshState())}>
            Delete pipeline server
          </AlertActionLink>
          <AlertActionLink onClick={() => ignoreTimedOut()}>Close</AlertActionLink>
        </>
      }
    >
      <Stack hasGutter>
        <StackItem>
          We encountered an error creating or loading your pipeline server. To continue, delete this
          pipeline server and create a new one. Deleting this pipeline server will delete all of its
          resources, including pipelines, runs, and jobs.
        </StackItem>
        <StackItem>To get help contact your administrator.</StackItem>
      </Stack>
    </Alert>
  );
};
