/**
 * Pipeline server empty states for AutoRAG.
 *
 * - mode="configure" — no DSPA exists; opens the full configure modal.
 * - mode="enable"    — DSPA exists but managed pipelines are missing; patches the existing DSPA.
 * - mode="waiting"   — DSPA exists but is not ready; polls until ready or times out with an error.
 *
 * TODO: This component is near-identical to the AutoML PipelineServerSetup.
 * Extract into a shared pipeline-setup package as part of the autox deduplication effort
 * (also applies to EnableManagedPipelinesModal, PipelineServerStarting, and BFF handlers).
 */
import { ConfigurePipelinesServerModal } from '@odh-dashboard/internal/concepts/pipelines/content/configurePipelinesServer/ConfigurePipelinesServerModal';
import { EmptyDetailsView, ProjectObjectType, typedEmptyImage } from '@odh-dashboard/ui-core';
import { pipelinesBaseRoute } from '@odh-dashboard/internal/routes/pipelines/global';
import { Alert, Button } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import * as React from 'react';
import { enableManagedPipelines, getPipelineRunsFromBFF } from '~/app/api/pipelines';
import {
  shouldShowManagedPipelinesMissing,
  shouldShowNoDSPAEmptyState,
  shouldShowPipelineServerNotReady,
} from '~/app/utilities/pipelineServerEmptyState';
import EnableManagedPipelinesModal from './EnableManagedPipelinesModal';
import PipelineServerStarting from './PipelineServerStarting';

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 120_000;

type PipelineServerSetupProps = {
  namespace?: string;
  /** "configure" opens the full modal; "enable" patches the existing DSPA; "waiting" polls until ready. */
  mode?: 'configure' | 'enable' | 'waiting';
  onStarted?: () => void;
  onFailed?: () => void;
  onReady?: () => void;
};

type ComponentState = 'idle' | 'enabling' | 'polling' | 'error';

function PipelineServerSetup({
  namespace,
  mode = 'configure',
  onStarted,
  onFailed,
  onReady,
}: PipelineServerSetupProps): React.JSX.Element {
  const [state, setState] = React.useState<ComponentState>('idle');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const pollingRef = React.useRef<ReturnType<typeof setTimeout>>();
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();
  const cancelledRef = React.useRef(false);

  const cleanup = React.useCallback(() => {
    cancelledRef.current = true;
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = undefined;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  React.useEffect(() => cleanup, [cleanup]);

  // In "waiting" mode, start polling immediately on mount
  React.useEffect(() => {
    if (mode === 'waiting' && state === 'idle') {
      startPolling();
    }
    // Only run on mount — startPolling is stable via useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPolling = React.useCallback(() => {
    cleanup();
    if (!namespace) {
      return;
    }
    setState('polling');
    setErrorMessage('');
    cancelledRef.current = false;
    onStarted?.();

    timeoutRef.current = setTimeout(() => {
      cleanup();
      setState('error');
      setErrorMessage('Timed out waiting for the pipeline server to become ready.');
      onFailed?.();
    }, POLL_TIMEOUT_MS);

    const schedulePoll = () => {
      pollingRef.current = setTimeout(async () => {
        try {
          await getPipelineRunsFromBFF('', { namespace, pageSize: 1 });
          if (cancelledRef.current) {
            return;
          }
          cleanup();
          onReady?.();
        } catch (e) {
          if (cancelledRef.current) {
            return;
          }
          if (
            shouldShowNoDSPAEmptyState(e) ||
            shouldShowManagedPipelinesMissing(e) ||
            shouldShowPipelineServerNotReady(e)
          ) {
            schedulePoll();
            return;
          }
          cleanup();
          setState('error');
          setErrorMessage(
            e instanceof Error
              ? e.message
              : 'An unexpected error occurred while waiting for the pipeline server.',
          );
          onFailed?.();
        }
      }, POLL_INTERVAL_MS);
    };
    schedulePoll();
  }, [namespace, onStarted, onReady, onFailed, cleanup]);

  const handleEnable = React.useCallback(async () => {
    if (!namespace) {
      return;
    }
    setState('enabling');
    setErrorMessage('');
    onStarted?.();
    try {
      await enableManagedPipelines('', namespace);
      startPolling();
    } catch (e) {
      setState('error');
      setErrorMessage(e instanceof Error ? e.message : 'Failed to enable managed pipelines');
      onFailed?.();
    }
  }, [namespace, startPolling, onStarted, onFailed]);

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
            component={(props) => <Link {...props} to={pipelinesBaseRoute(namespace)} />}
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
        description="To use AutoRAG, configure a pipeline server with AutoRAG pipelines enabled."
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
          title="Configure pipeline server for AutoRAG"
          submitLabel="Configure pipeline server for AutoRAG"
        />
      ) : null}
    </>
  );
}

export default PipelineServerSetup;
