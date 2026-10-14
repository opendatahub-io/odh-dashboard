import { ConfigurePipelinesServerModal } from '@odh-dashboard/internal/concepts/pipelines/content/configurePipelinesServer/ConfigurePipelinesServerModal';
import { EmptyDetailsView, ProjectObjectType, typedEmptyImage } from '@odh-dashboard/ui-core';
import { Alert, Button } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import * as React from 'react';
import EnableManagedPipelinesModal from './EnableManagedPipelinesModal';
import PipelineServerStarting from './PipelineServerStarting';
import { useEnableManagedPipelinesMutation, usePipelineServerReadinessQuery } from '../../hooks';

export type PipelineServerSetupConfig = {
  productName: string;
  detailsRoute: (namespace?: string) => string;
  isTransientError: (error: unknown) => boolean;
};

export type PipelineServerSetupProps = {
  config: PipelineServerSetupConfig;
  namespace?: string;
  mode?: 'configure' | 'enable' | 'waiting';
  onStarted?: () => void;
  onFailed?: () => void;
  onReady?: () => void;
};

type ComponentState = 'idle' | 'enabling' | 'polling' | 'error';

const POLL_TIMEOUT_MS = 120_000;

const PipelineServerSetup: React.FC<PipelineServerSetupProps> = ({
  config,
  namespace,
  mode = 'configure',
  onStarted,
  onFailed,
  onReady,
}) => {
  const [state, setState] = React.useState<ComponentState>('idle');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();
  const cancelledRef = React.useRef(false);
  const startedRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  const operationIdRef = React.useRef(0);
  const pollingContextRef = React.useRef({ mode, namespace });
  if (
    pollingContextRef.current.mode !== mode ||
    pollingContextRef.current.namespace !== namespace
  ) {
    pollingContextRef.current = { mode, namespace };
    cancelledRef.current = true;
    operationIdRef.current += 1;
  }
  const enableMutation = useEnableManagedPipelinesMutation();
  const readinessQuery = usePipelineServerReadinessQuery(
    namespace,
    config.isTransientError,
    state === 'polling',
  );

  const cleanup = React.useCallback(() => {
    cancelledRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const startPolling = React.useCallback(() => {
    if (
      !mountedRef.current ||
      pollingContextRef.current.mode !== mode ||
      pollingContextRef.current.namespace !== namespace
    ) {
      return;
    }
    cleanup();
    if (!namespace) {
      return;
    }
    const pollingOperationId = operationIdRef.current;
    cancelledRef.current = false;
    startedRef.current = true;
    setState('polling');
    setErrorMessage('');
    onStarted?.();
    timeoutRef.current = setTimeout(() => {
      if (
        !mountedRef.current ||
        operationIdRef.current !== pollingOperationId ||
        cancelledRef.current
      ) {
        return;
      }
      cleanup();
      setState('error');
      setErrorMessage('Timed out waiting for the pipeline server to become ready.');
      onFailed?.();
    }, POLL_TIMEOUT_MS);
  }, [cleanup, mode, namespace, onFailed, onStarted]);

  React.useEffect(() => {
    cleanup();
    startedRef.current = false;
    setState('idle');
  }, [cleanup, mode, namespace]);

  React.useEffect(() => {
    if (mode === 'waiting' && !startedRef.current) {
      startPolling();
    }
  }, [mode, startPolling]);

  React.useEffect(() => {
    if (state !== 'polling' || cancelledRef.current) {
      return;
    }
    if (readinessQuery.data === true) {
      cleanup();
      startedRef.current = false;
      setState('idle');
      onReady?.();
      return;
    }
    if (readinessQuery.isError) {
      cleanup();
      startedRef.current = false;
      setState('error');
      setErrorMessage(
        readinessQuery.error instanceof Error
          ? readinessQuery.error.message
          : 'An unexpected error occurred while waiting for the pipeline server.',
      );
      onFailed?.();
    }
  }, [
    cleanup,
    onFailed,
    onReady,
    readinessQuery.data,
    readinessQuery.error,
    readinessQuery.isError,
    state,
  ]);

  React.useEffect(() => cleanup, [cleanup]);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationIdRef.current += 1;
      cleanup();
    };
  }, [cleanup]);

  const handleEnable = React.useCallback(async () => {
    if (!namespace) {
      return;
    }
    const operationId = ++operationIdRef.current;
    const operationNamespace = namespace;
    cancelledRef.current = false;
    setState('enabling');
    setErrorMessage('');
    onStarted?.();
    try {
      await enableMutation.mutateAsync(namespace);
      if (
        !mountedRef.current ||
        operationIdRef.current !== operationId ||
        pollingContextRef.current.mode !== 'enable' ||
        pollingContextRef.current.namespace !== operationNamespace
      ) {
        return;
      }
      startPolling();
    } catch (error) {
      if (
        !mountedRef.current ||
        operationIdRef.current !== operationId ||
        pollingContextRef.current.mode !== 'enable' ||
        pollingContextRef.current.namespace !== operationNamespace
      ) {
        return;
      }
      setState('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to enable managed pipelines',
      );
      onFailed?.();
    }
  }, [enableMutation, namespace, onFailed, onStarted, startPolling]);

  if (state === 'polling') {
    return <PipelineServerStarting namespace={namespace} data-testid="pipeline-server-polling" />;
  }

  if (mode === 'waiting') {
    return (
      <EmptyDetailsView
        title="There is a problem with the pipeline server"
        iconImage={typedEmptyImage(ProjectObjectType.pipeline)}
        imageAlt=""
        createButton={
          <Button
            variant="link"
            isInline
            data-testid="go-to-pipelines-link"
            component={(props) => <Link {...props} to={config.detailsRoute(namespace)} />}
          >
            View error details
          </Button>
        }
      />
    );
  }

  if (mode === 'enable') {
    return (
      <>
        {state === 'error' && errorMessage ? (
          <Alert
            variant="danger"
            isInline
            title={`Failed to enable ${config.productName} pipelines`}
            data-testid="managed-pipelines-error"
            className="pf-v6-u-mb-md"
          >
            <p>{errorMessage}</p>
          </Alert>
        ) : null}
        <EmptyDetailsView
          title={`Enable ${config.productName} pipelines`}
          description={`A pipeline server was found, but ${config.productName} pipelines are not enabled. Click the button below to enable them. This will restart the pipeline server, which may interrupt any currently running pipeline jobs.`}
          iconImage={typedEmptyImage(ProjectObjectType.pipeline)}
          imageAlt=""
          createButton={
            <Button
              variant="primary"
              data-testid="enable-managed-pipelines-button"
              onClick={() => setIsModalOpen(true)}
              isLoading={state === 'enabling'}
              isDisabled={state === 'enabling'}
            >
              Enable {config.productName} pipelines
            </Button>
          }
        />
        {isModalOpen ? (
          <EnableManagedPipelinesModal
            productName={config.productName}
            onConfirm={() => {
              setIsModalOpen(false);
              void handleEnable();
            }}
            onClose={() => setIsModalOpen(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      {errorMessage ? (
        <Alert
          variant="danger"
          isInline
          title="Pipeline server configuration failed"
          data-testid="pipeline-server-error"
          className="pf-v6-u-mb-md"
        >
          <p>{errorMessage}</p>
        </Alert>
      ) : null}
      <EmptyDetailsView
        title="Configure a pipeline server"
        description={`To use ${config.productName}, configure a pipeline server with ${config.productName} pipelines enabled.`}
        iconImage={typedEmptyImage(ProjectObjectType.pipeline, 'MissingModel')}
        imageAlt=""
        createButton={
          <Button
            variant="primary"
            data-testid="configure-pipeline-server-button"
            onClick={() => setIsModalOpen(true)}
          >
            Configure pipeline server
          </Button>
        }
      />
      {isModalOpen ? (
        <ConfigurePipelinesServerModal
          onClose={() => setIsModalOpen(false)}
          standaloneNamespace={namespace}
          onSuccess={startPolling}
          defaultConfig={{ enableManagedPipelines: true }}
          showManagedPipelinesWarning
          title={`Configure pipeline server for ${config.productName}`}
          submitLabel={`Configure pipeline server for ${config.productName}`}
        />
      ) : null}
    </>
  );
};

export default PipelineServerSetup;
