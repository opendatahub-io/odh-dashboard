import {
  EmptyExperimentsState,
  PipelineServerStarting,
} from '@odh-dashboard/autox-core/ui/components/feature';
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
  const pipelineServerStatus = usePipelineServerStatus(
    effectiveNamespace || undefined,
    !loaded || !hasExperiments,
  );

  const onListStatusRef = React.useRef(onExperimentsListStatus);
  onListStatusRef.current = onExperimentsListStatus;

  const prevListStatusRef = React.useRef<{
    effectiveNamespace: string;
    hasLoadError: boolean;
    loaded: boolean;
    hasExperiments: boolean;
  } | null>(null);

  React.useEffect(() => {
    const notify = onListStatusRef.current;
    if (!notify) {
      return;
    }

    let nextLoaded: boolean;
    let nextHasExperiments: boolean;
    if (hasLoadError) {
      nextLoaded = true;
      nextHasExperiments = false;
    } else if (!loaded) {
      nextLoaded = false;
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
      prev.hasExperiments === hasExperiments
    ) {
      return;
    }

    notify({ loaded: nextLoaded, hasExperiments: nextHasExperiments });
    prevListStatusRef.current = {
      effectiveNamespace,
      hasLoadError,
      loaded,
      hasExperiments,
    };
  }, [effectiveNamespace, hasLoadError, loaded, hasExperiments]);

  const errorCode = loadError ? getPipelineErrorCode(loadError) : undefined;

  const handleServerReady = React.useCallback(() => {
    refreshRuns();
  }, [refreshRuns]);

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

  if (loadError && errorCode === 403) {
    return <UnauthorizedError accessDomain="AutoRAG experiments" />;
  }

  if (pipelineServerMode === 'configure' || pipelineServerMode === 'enable') {
    return (
      <PipelineServerSetup
        namespace={effectiveNamespace || undefined}
        mode={pipelineServerMode}
        onStarted={() => setServerBusy(pipelineServerMode)}
        onFailed={() => setServerBusy(false)}
        onReady={handleServerReady}
      />
    );
  }

  if (pipelineServerStatus.isStarting && (!loadError || pipelineServerMode === 'waiting')) {
    return <PipelineServerStarting namespace={effectiveNamespace} />;
  }

  if (pipelineServerMode) {
    return (
      <PipelineServerSetup
        namespace={effectiveNamespace || undefined}
        mode={pipelineServerMode}
        onStarted={() => setServerBusy(pipelineServerMode)}
        onFailed={() => setServerBusy(false)}
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

  if (!loaded) {
    return (
      <Flex justifyContent={{ default: 'justifyContentCenter' }} className="pf-v6-u-pt-2xl">
        <FlexItem>
          <Spinner size="xl" />
        </FlexItem>
      </Flex>
    );
  }

  if (
    !hasExperiments &&
    effectiveNamespace &&
    !pipelineServerStatus.loaded &&
    !pipelineServerStatus.error
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
