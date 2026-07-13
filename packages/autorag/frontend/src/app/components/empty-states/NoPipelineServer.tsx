/**
 * Empty State A — no compatible pipeline server detected.
 * Opens the Configure Pipeline Server modal to create one in-place,
 * then polls until the pipeline server is ready.
 */
import { ConfigurePipelinesServerModal } from '@odh-dashboard/internal/concepts/pipelines/content/configurePipelinesServer/ConfigurePipelinesServerModal';
import { EmptyDetailsView, ProjectObjectType, typedEmptyImage } from '@odh-dashboard/ui-core';
import { Alert, Bullseye, Button, Content, ContentVariants, Spinner } from '@patternfly/react-core';
import * as React from 'react';
import { getPipelineRunsFromBFF } from '~/app/api/pipelines';
import {
  shouldShowManagedPipelinesMissing,
  shouldShowNoDSPAEmptyState,
  shouldShowPipelineServerNotReady,
} from '~/app/utilities/pipelineServerEmptyState';
import { parseErrorStatus } from '~/app/utilities/utils';

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 120_000;

type NoPipelineServerProps = {
  namespace?: string;
  /** Called when polling starts (after DSPA creation) so the parent can keep this component mounted. */
  onConfigureStarted?: () => void;
  /** Called when the pipeline server is ready. */
  onServerConfigured?: () => void;
};

function NoPipelineServer({
  namespace,
  onConfigureStarted,
  onServerConfigured,
}: NoPipelineServerProps): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [polling, setPolling] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
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
    if (!namespace) {
      onServerConfigured?.();
      return;
    }
    setPolling(true);
    setErrorMessage('');
    cancelledRef.current = false;
    onConfigureStarted?.();

    timeoutRef.current = setTimeout(() => {
      cleanup();
      setPolling(false);
      setErrorMessage('Timed out waiting for the pipeline server to become ready.');
    }, POLL_TIMEOUT_MS);

    pollingRef.current = setInterval(async () => {
      try {
        await getPipelineRunsFromBFF('', { namespace, pageSize: 1 });
        if (cancelledRef.current) {
          return;
        }
        cleanup();
        setPolling(false);
        onServerConfigured?.();
      } catch (e) {
        if (cancelledRef.current) {
          return;
        }
        // Still starting up — keep polling
        if (
          shouldShowNoDSPAEmptyState(e) ||
          shouldShowManagedPipelinesMissing(e) ||
          shouldShowPipelineServerNotReady(e)
        ) {
          return;
        }
        const status = e instanceof Error ? parseErrorStatus(e) : undefined;
        if (status === 403) {
          cleanup();
          setPolling(false);
          setErrorMessage(
            e instanceof Error
              ? e.message
              : 'An unexpected error occurred while waiting for the pipeline server.',
          );
          return;
        }
        // Unknown error — assume server is ready and let parent re-evaluate
        cleanup();
        setPolling(false);
        onServerConfigured?.();
      }
    }, POLL_INTERVAL_MS);
  }, [namespace, onConfigureStarted, onServerConfigured, cleanup]);

  if (polling) {
    return (
      <Bullseye data-testid="pipeline-server-polling">
        <div className="pf-v6-u-text-align-center">
          <Spinner size="lg" />
          <Content component={ContentVariants.p} className="pf-v6-u-mt-md">
            Waiting for the pipeline server to become ready...
          </Content>
        </div>
      </Bullseye>
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
        iconImage={typedEmptyImage(ProjectObjectType.pipeline)}
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

export default NoPipelineServer;
