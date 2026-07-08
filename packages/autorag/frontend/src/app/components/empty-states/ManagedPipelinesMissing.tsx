import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { Alert, Button, Content, ContentVariants, Spinner, Title } from '@patternfly/react-core';
import React from 'react';
import { enableManagedPipelines, getPipelineRunsFromBFF } from '~/app/api/pipelines';
import {
  shouldShowManagedPipelinesMissing,
  shouldShowPipelineServerNotReady,
} from '~/app/utilities/pipelineServerEmptyState';
import { parseErrorStatus } from '~/app/utilities/utils';
import EnableManagedPipelinesModal from './EnableManagedPipelinesModal';

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 120_000;

type ManagedPipelinesMissingProps = {
  namespace: string;
  onEnableStarted?: () => void;
  onEnableFailed?: () => void;
  onEnabled: () => void;
};

type ComponentState = 'idle' | 'enabling' | 'polling' | 'error';

function ManagedPipelinesMissing({
  namespace,
  onEnableStarted,
  onEnableFailed,
  onEnabled,
}: ManagedPipelinesMissingProps): React.JSX.Element {
  const [state, setState] = React.useState<ComponentState>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const pollingRef = React.useRef<ReturnType<typeof setInterval>>();
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();
  const cancelledRef = React.useRef(false);

  const cleanup = React.useCallback(() => {
    cancelledRef.current = true;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = undefined;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  React.useEffect(() => cleanup, [cleanup]);

  const startPolling = React.useCallback(() => {
    setState('polling');
    cancelledRef.current = false;

    timeoutRef.current = setTimeout(() => {
      cleanup();
      setState('error');
      setErrorMessage('Timed out waiting for the pipeline server to restart.');
      onEnableFailed?.();
    }, POLL_TIMEOUT_MS);

    pollingRef.current = setInterval(async () => {
      try {
        await getPipelineRunsFromBFF('', { namespace, pageSize: 1 });
        if (cancelledRef.current) {
          return;
        }
        cleanup();
        onEnabled();
      } catch (e) {
        if (cancelledRef.current) {
          return;
        }
        if (shouldShowManagedPipelinesMissing(e) || shouldShowPipelineServerNotReady(e)) {
          return;
        }
        // Non-transient errors (e.g. 403) should stop polling and surface the error.
        // Transient errors (connection refused, 502, etc.) during a server restart
        // should exit polling and let the parent re-evaluate the server state.
        const status = e instanceof Error ? parseErrorStatus(e) : undefined;
        if (status === 403) {
          cleanup();
          setState('error');
          setErrorMessage(
            e instanceof Error
              ? e.message
              : 'An unexpected error occurred while waiting for the pipeline server.',
          );
          onEnableFailed?.();
          return;
        }
        cleanup();
        onEnabled();
      }
    }, POLL_INTERVAL_MS);
  }, [namespace, onEnabled, onEnableFailed, cleanup]);

  const handleEnable = React.useCallback(async () => {
    setState('enabling');
    setErrorMessage('');
    onEnableStarted?.();
    try {
      await enableManagedPipelines('', namespace);
      startPolling();
    } catch (e) {
      setState('error');
      setErrorMessage(e instanceof Error ? e.message : 'Failed to enable managed pipelines');
      onEnableFailed?.();
    }
  }, [namespace, startPolling, onEnableStarted, onEnableFailed]);

  if (state === 'polling') {
    return (
      <div
        className="pf-v6-u-text-align-center pf-v6-u-pt-2xl"
        data-testid="managed-pipelines-polling"
      >
        <Spinner size="xl" />
        <Title headingLevel="h3" className="pf-v6-u-mt-lg">
          Starting pipeline server
        </Title>
        <Content component={ContentVariants.p} className="pf-v6-u-mt-sm">
          The AutoRAG pipeline server is being initialized.
        </Content>
        <Content component={ContentVariants.p} className="pf-v6-u-mt-sm">
          The process should take less than five minutes. When the server is ready, you will be able
          to create and import pipelines.
        </Content>
      </div>
    );
  }

  return (
    <>
      {state === 'error' && errorMessage ? (
        <Alert
          variant="danger"
          isInline
          title="Failed to enable AutoRAG pipelines"
          data-testid="managed-pipelines-error"
          className="pf-v6-u-mb-md"
        >
          <p>{errorMessage}</p>
        </Alert>
      ) : null}
      <EmptyDetailsView
        title="Enable AutoRAG pipelines"
        description="A pipeline server was found, but AutoRAG pipelines are not enabled. Click the button below to enable them. This will restart the pipeline server, which may interrupt any currently running pipeline jobs."
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
            Enable AutoRAG pipelines
          </Button>
        }
      />
      {isModalOpen ? (
        <EnableManagedPipelinesModal
          onConfirm={() => {
            setIsModalOpen(false);
            handleEnable();
          }}
          onClose={() => setIsModalOpen(false)}
        />
      ) : null}
    </>
  );
}

export default ManagedPipelinesMissing;
