import * as React from 'react';
import {
  Alert,
  AlertActionLink,
  Bullseye,
  Button,
  ButtonProps,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { DSPipelineKind, DSPipelineManagedPipelinesKind, ProjectKind } from '#~/k8sTypes';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import DeletePipelineServerModal from '#~/concepts/pipelines/content/DeletePipelineServerModal';
import { ConfigurePipelinesServerModal } from '#~/concepts/pipelines/content/configurePipelinesServer/ConfigurePipelinesServerModal';
import ViewPipelineServerModal from '#~/concepts/pipelines/content/ViewPipelineServerModal';
import useSyncPreferredProject from '#~/concepts/projects/useSyncPreferredProject';
import { conditionalArea, SupportedArea } from '#~/concepts/areas';
import { DEV_MODE } from '#~/utilities/const';
import { MetadataStoreServicePromiseClient } from '#~/third_party/mlmd';
import { getGenericErrorCode } from '#~/api';
import UnauthorizedError from '#~/pages/UnauthorizedError';
import usePipelineAPIState, { PipelineAPIState } from './usePipelineAPIState';
import usePipelineNamespaceCR, {
  dspaLoaded,
  hasServerTimedOut,
  isDspaAllReady,
} from './usePipelineNamespaceCR';
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
  namespace: string;
  project: ProjectKind;
  refreshState: () => Promise<undefined>;
  refreshAPIState: () => void;
  getRecurringRunInformation: GetRecurringRunInformationType;
  apiState: PipelineAPIState;
  metadataStoreServiceClient: MetadataStoreServicePromiseClient;
  managedPipelines: DSPipelineManagedPipelinesKind | undefined;
  isStarting?: boolean;
  startingStatusModalOpenRef?: React.MutableRefObject<string | null>;
};

const PipelinesContext = React.createContext<PipelineContext>({
  hasCR: false,
  hasCompatibleVersion: false,
  crInitializing: false,
  crName: '',
  crStatus: undefined,
  serverTimedOut: false,
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
  managedPipelines: undefined,
  isStarting: false,
  startingStatusModalOpenRef: { current: null },
});

type PipelineContextProviderProps = {
  children: React.ReactNode;
  namespace: string;
  pageName?: string;
};

export const PipelineContextProvider = conditionalArea<PipelineContextProviderProps>(
  SupportedArea.DS_PIPELINES,
  true,
)(({ children, namespace, pageName }) => {
  const { projects } = React.useContext(ProjectsContext);
  const project = projects.find(byName(namespace)) ?? null;
  useSyncPreferredProject(project);

  const startingStatusModalOpenRef = React.useRef<string | null>(null);

  const state = usePipelineNamespaceCR(namespace);
  const [pipelineNamespaceCR, crLoaded, crLoadError, refreshCR] = state;

  const isResourceLoaded = crLoaded && !!pipelineNamespaceCR;
  const isAllLoaded = isDspaAllReady(state);
  const isStarting = isResourceLoaded && !isAllLoaded;

  const isCRReady = dspaLoaded(state);
  const serverTimedOut = hasServerTimedOut(state, isCRReady);
  const dspaName = pipelineNamespaceCR?.metadata.name;
  const [, routeLoaded, routeLoadError, refreshRoute] = usePipelinesAPIRoute(
    isCRReady,
    dspaName ?? '',
    namespace,
  );

  const hostPath =
    routeLoaded && namespace && dspaName ? `/api/service/pipelines/${namespace}/${dspaName}` : null;

  const refreshState = React.useCallback(
    () => Promise.all([refreshCR(), refreshRoute()]).then(() => undefined),
    [refreshRoute, refreshCR],
  );

  const metadataStoreServiceClient = React.useMemo(() => {
    const client = new MetadataStoreServicePromiseClient(
      `/api/service/mlmd/${namespace}/${dspaName ?? ''}`,
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
    if (getGenericErrorCode(error) === 403) {
      return <UnauthorizedError accessDomain={pageName} />;
    }
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
        project,
        apiState,
        namespace,
        refreshState,
        refreshAPIState,
        getRecurringRunInformation,
        metadataStoreServiceClient,
        managedPipelines: pipelineNamespaceCR?.spec.apiServer?.managedPipelines,
        isStarting,
        startingStatusModalOpenRef,
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
    crStatus: DSPipelineKind['status'];
    isStarting: boolean | undefined;
  };
  /**
   * Allows agnostic functionality to request all watched API to be reacquired.
   * Triggering this will invalidate the memo for API - pay attention to only calling it once per need.
   */
  getRecurringRunInformation: GetRecurringRunInformationType;
  refreshAllAPI: () => void;
  metadataStoreServiceClient: MetadataStoreServicePromiseClient;
  refreshState: () => void;
  managedPipelines: DSPipelineManagedPipelinesKind | undefined;

  startingStatusModalOpenRef?: React.MutableRefObject<string | null>;
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
    managedPipelines,
    refreshState,
    crStatus,
    isStarting,
    startingStatusModalOpenRef,
  } = React.useContext(PipelinesContext);

  const pipelinesServer: UsePipelinesAPI['pipelinesServer'] = {
    initializing: crInitializing,
    installed: hasCR,
    compatible: hasCompatibleVersion,
    timedOut: serverTimedOut,
    name: crName,
    crStatus,
    isStarting,
  };

  return {
    pipelinesServer,
    namespace,
    project,
    refreshAllAPI,
    getRecurringRunInformation,
    metadataStoreServiceClient,
    managedPipelines,
    refreshState,
    startingStatusModalOpenRef,
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
      {configureModalVisible ? (
        <ConfigurePipelinesServerModal
          onClose={() => {
            setConfigureModalVisible(false);
            refreshState();
          }}
        />
      ) : null}
    </>
  );
};

export const DeleteServerModal = ({ onClose }: { onClose: () => void }): React.JSX.Element => {
  const { refreshState } = React.useContext(PipelinesContext);
  return (
    <DeletePipelineServerModal
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

export const ViewServerModal = ({ onClose }: { onClose: () => void }): React.JSX.Element => {
  const { namespace } = React.useContext(PipelinesContext);
  const [pipelineNamespaceCR] = usePipelineNamespaceCR(namespace);

  return <ViewPipelineServerModal onClose={onClose} pipelineNamespaceCR={pipelineNamespaceCR} />;
};

export const PipelineServerTimedOut: React.FC = () => {
  const { crStatus } = React.useContext(PipelinesContext);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const errorMessage =
    crStatus?.conditions?.find((condition) => condition.type === 'Ready')?.message || '';
  return (
    <>
      <Alert
        variant="danger"
        isInline
        title="Pipeline server failed"
        actionLinks={
          <>
            <AlertActionLink onClick={() => setDeleteOpen(true)}>
              Delete pipeline server
            </AlertActionLink>
          </>
        }
      >
        <Stack hasGutter>
          {errorMessage && (
            <StackItem data-testid="timeout-pipeline-error-message">{errorMessage}</StackItem>
          )}
          <StackItem>
            We encountered an error creating or loading your pipeline server. To continue, delete
            this pipeline server and create a new one. Deleting this pipeline server will delete all
            of its resources, including pipelines, runs, and jobs.
          </StackItem>
          <StackItem>To get help contact your administrator.</StackItem>
        </Stack>
      </Alert>
      {deleteOpen ? (
        <DeleteServerModal
          onClose={() => {
            setDeleteOpen(false);
          }}
        />
      ) : null}
    </>
  );
};
