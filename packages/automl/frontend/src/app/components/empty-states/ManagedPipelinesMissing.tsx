import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { Alert, Bullseye, Button, Spinner, Content, ContentVariants } from '@patternfly/react-core';
import React from 'react';
import { enableManagedPipelines, getPipelineRunsFromBFF } from '~/app/api/pipelines';
import {
  shouldShowManagedPipelinesMissing,
  shouldShowPipelineServerNotReady,
} from '~/app/utilities/pipelineServerEmptyState';

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
  const pollingRef = React.useRef<ReturnType<typeof setInterval>>();
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  const cleanup = React.useCallback(() => {
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

    timeoutRef.current = setTimeout(() => {
      cleanup();
      setState('idle');
    }, POLL_TIMEOUT_MS);

    pollingRef.current = setInterval(async () => {
      try {
        await getPipelineRunsFromBFF('', { namespace, pageSize: 1 });
        cleanup();
        onEnabled();
      } catch (e) {
        // Keep polling while the server is restarting (503) or pipelines are still missing.
        // Only call onEnabled when the error clears or changes to something unexpected.
        if (!shouldShowManagedPipelinesMissing(e) && !shouldShowPipelineServerNotReady(e)) {
          cleanup();
          onEnabled();
        }
      }
    }, POLL_INTERVAL_MS);
  }, [namespace, onEnabled, cleanup]);

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
      <Bullseye data-testid="managed-pipelines-polling">
        <div style={{ textAlign: 'center' }}>
          <Spinner size="lg" />
          <Content component={ContentVariants.p} className="pf-v6-u-mt-md">
            Waiting for the pipeline server to restart...
          </Content>
        </div>
      </Bullseye>
    );
  }

  return (
    <>
      {state === 'error' && errorMessage ? (
        <Alert
          variant="danger"
          isInline
          title="Failed to enable AutoML pipelines"
          data-testid="managed-pipelines-error"
          className="pf-v6-u-mb-md"
        >
          <p>{errorMessage}</p>
        </Alert>
      ) : null}
      <EmptyDetailsView
        title="Enable AutoML pipelines"
        description="A pipeline server was found, but AutoML pipelines are not enabled. Click the button below to enable them. This will restart the pipeline server, which may interrupt any currently running pipeline jobs."
        iconImage={typedEmptyImage(ProjectObjectType.pipeline)}
        imageAlt=""
        createButton={
          <Button
            variant="primary"
            data-testid="enable-managed-pipelines-button"
            onClick={handleEnable}
            isLoading={state === 'enabling'}
            isDisabled={state === 'enabling'}
          >
            Enable AutoML pipelines
          </Button>
        }
      />
    </>
  );
}

export default ManagedPipelinesMissing;
