import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  AlertActionLink,
  Bullseye,
  Button,
  ButtonProps,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { DSPipelineKind, ProjectKind } from '~/k8sTypes';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import DeletePipelineServerModal from '~/concepts/pipelines/content/DeletePipelineServerModal';
import { ConfigurePipelinesServerModal } from '~/concepts/pipelines/content/configurePipelinesServer/ConfigurePipelinesServerModal';
import ViewPipelineServerModal from '~/concepts/pipelines/content/ViewPipelineServerModal';
import useSyncPreferredProject from '~/concepts/projects/useSyncPreferredProject';
import useManageElyraSecret from '~/concepts/pipelines/context/useManageElyraSecret';
import { deleteServer } from '~/concepts/pipelines/utils';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import { DEV_MODE } from '~/utilities/const';
import { MetadataStoreServicePromiseClient } from '~/third_party/mlmd';
import usePipelineAPIState, { PipelineAPIState } from './usePipelineAPIState';
import usePipelineNamespaceCR, { dspaLoaded, hasServerTimedOut } from './usePipelineNamespaceCR';
import usePipelinesAPIRoute from './usePipelinesAPIRoute';
import useRecurringRunRelatedInformation from './useRecurringRunRelatedInformation';

type GetRecurringRunInformationType = ReturnType<
  typeof useRecurringRunRelatedInformation
>['getRecurringRunInformation'];

type PipelineContext = {
  hasCR: boolean;
  hasCompatibleVersion: boolean;
  crInitializing: boolean;
  crName: string;
  crStatus: DSPipelineKind['status'];
  serverTimedOut: boolean;
  ignoreTimedOut: () => void;
  namespace: string;
  project: ProjectKind;
  refreshState: () => Promise<undefined>;
  refreshAPIState: () => void;
  getRecurringRunInformation: GetRecurringRunInformationType;
  apiState: PipelineAPIState;
  metadataStoreServiceClient: MetadataStoreServicePromiseClient;
};

const PipelinesContext = React.createContext<PipelineContext>({
  hasCR: false,
  hasCompatibleVersion: false,
  crInitializing: false,
  crName: '',
  crStatus: undefined,
  serverTimedOut: false,
  ignoreTimedOut: () => undefined,
  namespace: '',
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  project: null as unknown as ProjectKind,
  refreshState: async () => undefined,
  refreshAPIState: () => undefined,
  getRecurringRunInformation: () => ({
    loading: false,
    data: null,
  }),
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  apiState: { apiAvailable: false, api: null as unknown as PipelineAPIState['api'] },
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  metadataStoreServiceClient: null as unknown as MetadataStoreServicePromiseClient,
});

type PipelineContextProviderProps = {
  children: React.ReactNode;
  namespace: string;
};

export const PipelineContextProvider = conditionalArea<PipelineContextProviderProps>(
  SupportedArea.DS_PIPELINES,
  true,
)(({ children, namespace }) => {
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
  const dspaName = pipelineNamespaceCR?.metadata.name;
  const [pipelineAPIRouteHost, routeLoaded, routeLoadError, refreshRoute] = usePipelinesAPIRoute(
    isCRReady,
    dspaName ?? '',
    namespace,
  );

  const routeHost = routeLoaded && pipelineAPIRouteHost ? pipelineAPIRouteHost : null;
  const hostPath =
    routeLoaded && namespace && dspaName ? `/api/service/pipelines/${namespace}/${dspaName}` : null;
  useManageElyraSecret(namespace, pipelineNamespaceCR, routeHost);

  const refreshState = React.useCallback(
    () => Promise.all([refreshCR(), refreshRoute()]).then(() => undefined),
    [refreshRoute, refreshCR],
  );

  const metadataStoreServiceClient = React.useMemo(() => {
    const client = new MetadataStoreServicePromiseClient(
      `/api/service/mlmd/${namespace}/${dspaName}`,
    );
    if (DEV_MODE) {
      // Enables the use of this browser extension: https://github.com/SafetyCulture/grpc-web-devtools
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-function, @typescript-eslint/consistent-type-assertions
      const enableDevTools = (window as any).__GRPCWEB_DEVTOOLS__ || (() => {});
      enableDevTools([client]);
    }
    return client;
  }, [namespace, dspaName]);

  const [apiState, refreshAPIState] = usePipelineAPIState(hostPath);
  const { getRecurringRunInformation } = useRecurringRunRelatedInformation(apiState);
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
        hasCompatibleVersion: pipelineNamespaceCR?.spec.dspVersion === 'v2',
        crInitializing: !crLoaded,
        crName: pipelineNamespaceCR?.metadata.name ?? '',
        crStatus: pipelineNamespaceCR?.status,
        serverTimedOut,
        ignoreTimedOut,
        project,
        apiState,
        namespace,
        refreshState,
        refreshAPIState,
        getRecurringRunInformation,
        metadataStoreServiceClient,
      }}
    >
      {children}
    </PipelinesContext.Provider>
  );
});

type UsePipelinesAPI = PipelineAPIState & {
  /** The contextual namespace */
  namespace: string;
  /** The Project resource behind the namespace */
  project: ProjectKind;
  /** State of the CR */
  pipelinesServer: {
    initializing: boolean;
    installed: boolean;
    timedOut: boolean;
    compatible: boolean;
    name: string;
  };
  /**
   * Allows agnostic functionality to request all watched API to be reacquired.
   * Triggering this will invalidate the memo for API - pay attention to only calling it once per need.
   */
  getRecurringRunInformation: GetRecurringRunInformationType;
  refreshAllAPI: () => void;
  metadataStoreServiceClient: MetadataStoreServicePromiseClient;
};

export const usePipelinesAPI = (): UsePipelinesAPI => {
  const {
    hasCR,
    hasCompatibleVersion,
    crInitializing,
    crName,
    serverTimedOut,
    apiState,
    namespace,
    project,
    refreshAPIState: refreshAllAPI,
    getRecurringRunInformation,
    metadataStoreServiceClient,
  } = React.useContext(PipelinesContext);

  const pipelinesServer: UsePipelinesAPI['pipelinesServer'] = {
    initializing: crInitializing,
    installed: hasCR,
    compatible: hasCompatibleVersion,
    timedOut: serverTimedOut,
    name: crName,
  };

  return {
    pipelinesServer,
    namespace,
    project,
    refreshAllAPI,
    getRecurringRunInformation,
    metadataStoreServiceClient,
    ...apiState,
  };
};

type CreatePipelineServerButtonProps = Omit<ButtonProps, 'onClick'> & {
  title?: string;
};

export const CreatePipelineServerButton: React.FC<CreatePipelineServerButtonProps> = ({
  title = 'Configure pipeline server',
  ...buttonProps
}) => {
  const [configureModalVisible, setConfigureModalVisible] = React.useState(false);
  const { refreshState } = React.useContext(PipelinesContext);

  return (
    <>
      <Stack hasGutter>
        <StackItem>
          <Button
            data-testid="create-pipeline-button"
            onClick={() => setConfigureModalVisible(true)}
            {...buttonProps}
          >
            {title}
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
}): React.JSX.Element => {
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

export const ViewServerModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}): React.JSX.Element => {
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
  const { namespace, crName, crStatus, refreshState, ignoreTimedOut } =
    React.useContext(PipelinesContext);
  const errorMessage =
    crStatus?.conditions?.find((condition) => condition.type === 'Ready')?.message || '';
  return (
    <Alert
      variant="danger"
      isInline
      title="Pipeline server failed"
      actionClose={<AlertActionCloseButton onClose={() => ignoreTimedOut()} />}
      actionLinks={
        <>
          <AlertActionLink
            onClick={() => deleteServer(namespace, crName).then(() => refreshState())}
          >
            Delete pipeline server
          </AlertActionLink>
          <AlertActionLink onClick={() => ignoreTimedOut()}>Close</AlertActionLink>
        </>
      }
    >
      <Stack hasGutter>
        {errorMessage && (
          <StackItem data-testid="timeout-pipeline-error-message">{errorMessage}</StackItem>
        )}
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
