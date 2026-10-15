import { EmptyExperimentsState } from '@odh-dashboard/autox-core/ui/components/feature';
import { usePipelineServerStatus } from '@odh-dashboard/autox-core/ui/hooks';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/ui-core';
import UnauthorizedError from '@odh-dashboard/ui-core/components/UnauthorizedError';
import { Alert, Flex, FlexItem, Spinner } from '@patternfly/react-core';
import React from 'react';
import { useParams } from 'react-router';
import { AutoragRunsTable } from '~/app/components/AutoragRunsTable';
import PipelineServerSetup from '~/app/components/empty-states/PipelineServerSetup';
import { usePipelineRuns } from '~/app/hooks/usePipelineRuns';
import {
  shouldShowManagedPipelinesMissing,
  shouldShowNoDSPAEmptyState,
  shouldShowPipelineServerNotReady,
  getPipelineErrorCode,
} from '~/app/utilities/pipelineServerEmptyState';
import { autoragConfigurePathname } from '~/app/utilities/routes';

export type AutoragExperimentsListStatus = {
  /** True once pipeline definitions and runs have finished loading without a blocking list error. */
  loaded: boolean;
  /** True when at least one experiment (run) exists; false for empty state and error states. */
  hasExperiments: boolean;
};

type AutoragExperimentsProps = {
  /**
   * Fired when list loading / emptiness changes so the host page can tune chrome (e.g. hide the
   * header "Create AutoRAG optimization run" action while the centered empty state is shown).
   */
  onExperimentsListStatus?: (status: AutoragExperimentsListStatus) => void;
};

/**
 * **Empty State A (`PipelineServerSetup`)** — No managed pipeline server and/or managed AutoRAG
 * pipeline unavailable (see `shouldShowConfigurePipelineServerEmptyState`). Precedence over B.
 *
 * **Empty State B (`EmptyExperimentsState`)** — Server and pipeline load succeeded; zero runs.
 */
function AutoragExperiments({
  onExperimentsListStatus,
}: AutoragExperimentsProps): React.JSX.Element {
  const { namespace } = useParams();

  const effectiveNamespace = namespace ?? '';
  const [serverBusy, setServerBusy] = React.useState<'configure' | 'enable' | 'waiting' | false>(
    false,
  );
  const {
    runs,
    totalSize,
    page,
    pageSize,
    setPage,
    setPageSize,
    loaded: runsLoaded,
    error: runsError,
    refresh: refreshRuns,
  } = usePipelineRuns(effectiveNamespace);

  const loaded = runsLoaded;
  const loadError = runsError;
  const hasLoadError = Boolean(loadError);

  const hasExperiments = totalSize > 0;
  // Keep observing DSPA readiness even when the BFF returns cached runs. Its DSPA discovery
  // cache can briefly report a previously-ready server while the resource is starting.
  const pipelineServerStatus = usePipelineServerStatus(effectiveNamespace || undefined);
  const readinessLoaded = Boolean(effectiveNamespace) && pipelineServerStatus.loaded;
  const readinessError = Boolean(pipelineServerStatus.error);
  const pipelineServerStarting = pipelineServerStatus.isStarting;
  const hasAccessibleRunsDespiteWatchFailure =
    Boolean(effectiveNamespace) &&
    loaded &&
    !loadError &&
    hasExperiments &&
    getPipelineErrorCode(pipelineServerStatus.error) === 403;
  const hasBlockingReadinessError = readinessError && !hasAccessibleRunsDespiteWatchFailure;

  const onListStatusRef = React.useRef(onExperimentsListStatus);
  onListStatusRef.current = onExperimentsListStatus;

  const prevListStatusRef = React.useRef<{
    effectiveNamespace: string;
    hasLoadError: boolean;
    loaded: boolean;
    hasExperiments: boolean;
    readinessLoaded: boolean;
    readinessError: boolean;
    pipelineServerStarting: boolean;
  } | null>(null);

  React.useEffect(() => {
    const notify = onListStatusRef.current;
    if (!notify) {
      return;
    }

    let nextLoaded: boolean;
    let nextHasExperiments: boolean;
    if (hasLoadError || hasBlockingReadinessError) {
      nextLoaded = true;
      nextHasExperiments = false;
    } else if (!loaded || (!readinessLoaded && !hasAccessibleRunsDespiteWatchFailure)) {
      nextLoaded = false;
      nextHasExperiments = false;
    } else if (pipelineServerStarting) {
      nextLoaded = true;
      nextHasExperiments = false;
    } else {
      nextLoaded = true;
      nextHasExperiments = hasExperiments;
    }

    const prev = prevListStatusRef.current;
    if (
      prev &&
      prev.effectiveNamespace === effectiveNamespace &&
      prev.hasLoadError === hasLoadError &&
      prev.loaded === loaded &&
      prev.hasExperiments === hasExperiments &&
      prev.readinessLoaded === readinessLoaded &&
      prev.readinessError === readinessError &&
      prev.pipelineServerStarting === pipelineServerStarting
    ) {
      return;
    }

    notify({ loaded: nextLoaded, hasExperiments: nextHasExperiments });
    prevListStatusRef.current = {
      effectiveNamespace,
      hasLoadError,
      loaded,
      hasExperiments,
      readinessLoaded,
      readinessError,
      pipelineServerStarting,
    };
  }, [
    effectiveNamespace,
    hasLoadError,
    hasBlockingReadinessError,
    hasAccessibleRunsDespiteWatchFailure,
    loaded,
    hasExperiments,
    readinessLoaded,
    readinessError,
    pipelineServerStarting,
  ]);

  const errorCode = loadError ? getPipelineErrorCode(loadError) : undefined;

  const handleServerReady = React.useCallback(() => {
    refreshRuns();
  }, [refreshRuns]);
  const handleWaitingStarted = React.useCallback(() => setServerBusy('waiting'), []);
  const handleServerFailed = React.useCallback(() => setServerBusy(false), []);

  React.useEffect(() => {
    if (serverBusy && (loaded || loadError)) {
      setServerBusy(false);
    }
  }, [serverBusy, loaded, loadError]);

  // Determine whether to show PipelineServerSetup (configure or enable mode).
  // When serverBusy is set, keep the component mounted so its internal polling
  // spinner stays visible during restarts instead of flashing an error
  // or a generic error from transient 503s / connection refused.
  const getPipelineServerMode = (): 'configure' | 'enable' | 'waiting' | false => {
    if (serverBusy) {
      return serverBusy;
    }
    if (loadError && shouldShowNoDSPAEmptyState(loadError)) {
      return 'configure';
    }
    if (loadError && shouldShowManagedPipelinesMissing(loadError)) {
      return 'enable';
    }
    if (loadError && shouldShowPipelineServerNotReady(loadError)) {
      return 'waiting';
    }
    return false;
  };
  const pipelineServerMode = getPipelineServerMode();
  const handleServerStarted = React.useCallback(() => {
    setServerBusy(pipelineServerMode || 'waiting');
  }, [pipelineServerMode]);

  if (loadError && errorCode === 403) {
    return <UnauthorizedError accessDomain="AutoRAG experiments" />;
  }

  if (pipelineServerMode === 'configure' || pipelineServerMode === 'enable') {
    return (
      <PipelineServerSetup
        namespace={effectiveNamespace || undefined}
        mode={pipelineServerMode}
        onStarted={handleServerStarted}
        onFailed={handleServerFailed}
        onReady={handleServerReady}
      />
    );
  }

  if (effectiveNamespace && pipelineServerStatus.error && !hasAccessibleRunsDespiteWatchFailure) {
    return (
      <Alert
        variant="danger"
        isInline
        title="Unable to verify pipeline server readiness"
        data-testid="pipeline-server-status-error"
      >
        <p>{pipelineServerStatus.error.message}</p>
        <p>Refresh the page to check again before creating a run.</p>
      </Alert>
    );
  }

  if (
    pipelineServerStatus.isStarting &&
    !pipelineServerStatus.error &&
    (!loadError || pipelineServerMode === 'waiting')
  ) {
    return (
      <PipelineServerSetup
        namespace={effectiveNamespace || undefined}
        mode="waiting"
        isReady={false}
        onStarted={handleWaitingStarted}
        onFailed={handleServerFailed}
        onReady={handleServerReady}
      />
    );
  }

  if (pipelineServerMode) {
    return (
      <PipelineServerSetup
        namespace={effectiveNamespace || undefined}
        mode={pipelineServerMode}
        onStarted={handleServerStarted}
        onFailed={handleServerFailed}
        onReady={handleServerReady}
      />
    );
  }

  if (loadError) {
    return (
      <Alert variant="danger" isInline title="Failed to load experiments">
        <p>{loadError.message}</p>
      </Alert>
    );
  }

  if (
    !effectiveNamespace ||
    !loaded ||
    (!pipelineServerStatus.loaded && !hasAccessibleRunsDespiteWatchFailure)
  ) {
    return (
      <Flex justifyContent={{ default: 'justifyContentCenter' }} className="pf-v6-u-pt-2xl">
        <FlexItem>
          <Spinner size="xl" />
        </FlexItem>
      </Flex>
    );
  }

  if (!hasExperiments) {
    return (
      <EmptyExperimentsState
        createExperimentRoute={`${autoragConfigurePathname}/${effectiveNamespace}`}
        title="Create an AutoRAG optimization run"
        description="Test different retrieval and model configurations to find the best-performing setup."
        iconImage={typedEmptyImage(ProjectObjectType.pipeline)}
        dataTestId="empty-experiments-state"
      />
    );
  }

  return (
    <AutoragRunsTable
      runs={runs}
      namespace={effectiveNamespace}
      totalSize={totalSize}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPerPageChange={setPageSize}
      onRunActionComplete={refreshRuns}
    />
  );
}

export default AutoragExperiments;
