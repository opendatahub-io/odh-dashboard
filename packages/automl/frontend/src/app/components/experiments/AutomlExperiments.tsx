import { Alert, Spinner } from '@patternfly/react-core';
import React from 'react';
import { useParams } from 'react-router';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import UnauthorizedError from '@odh-dashboard/internal/pages/UnauthorizedError';
import { AutomlRunsTable } from '~/app/components/AutomlRunsTable';
import EmptyExperimentsState from '~/app/components/empty-states/EmptyExperimentsState';
import PipelineServerSetup from '~/app/components/empty-states/PipelineServerSetup';
import { usePipelineDefinitions } from '~/app/hooks/usePipelineDefinitions';
import { usePipelineRuns } from '~/app/hooks/usePipelineRuns';
import {
  shouldShowManagedPipelinesMissing,
  shouldShowNoDSPAEmptyState,
  shouldShowPipelineServerNotReady,
} from '~/app/utilities/pipelineServerEmptyState';
import { automlConfigurePathname } from '~/app/utilities/routes';
import { parseErrorStatus } from '~/app/utilities/utils';

export type AutomlExperimentsListStatus = {
  /** True once pipeline definitions and runs have finished loading without a blocking list error. */
  loaded: boolean;
  /** True when at least one experiment (run) exists; false for empty state and error states. */
  hasExperiments: boolean;
};

type AutomlExperimentsProps = {
  /**
   * Fired when list loading / emptiness changes so the host page can tune chrome (e.g. hide the
   * header "Create AutoML optimization run" action while the centered empty state is shown).
   */
  onExperimentsListStatus?: (status: AutomlExperimentsListStatus) => void;
};

/**
 * **Empty State A (`PipelineServerSetup`)** — No managed pipeline server and/or managed AutoML
 * pipeline definitions unavailable (see `shouldShowConfigurePipelineServerEmptyState`). Precedence
 * over B: handled under `loadError` before the zero-runs branch.
 *
 * **Empty State B (`EmptyExperimentsState`)** — Server and definitions load succeeded; zero runs.
 */
function AutomlExperiments({ onExperimentsListStatus }: AutomlExperimentsProps): React.JSX.Element {
  const { namespace } = useParams();

  const effectiveNamespace = namespace ?? '';
  const [serverBusy, setServerBusy] = React.useState<'configure' | 'enable' | 'waiting' | false>(
    false,
  );

  const {
    loaded: defsLoaded,
    error: defsError,
    refresh: refreshDefs,
  } = usePipelineDefinitions(effectiveNamespace);
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

  const loaded = defsLoaded && runsLoaded;
  const loadError = defsError ?? runsError;
  const hasLoadError = Boolean(loadError);

  const hasExperiments = totalSize > 0;

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

  const errorCode = loadError
    ? (getGenericErrorCode(loadError) ??
      (loadError instanceof Error ? parseErrorStatus(loadError) : undefined))
    : undefined;

  const handleServerReady = React.useCallback(() => {
    void refreshDefs();
    refreshRuns();
  }, [refreshDefs, refreshRuns]);

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
    if (errorCode === 403) {
      return <UnauthorizedError accessDomain="AutoML experiments" />;
    }
    return (
      <Alert variant="danger" isInline title="Failed to load experiments">
        <p>{loadError.message}</p>
      </Alert>
    );
  }

  if (!loaded) {
    return (
      <div className="pf-v6-u-text-align-center pf-v6-u-pt-2xl">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!hasExperiments) {
    return (
      <EmptyExperimentsState
        createExperimentRoute={`${automlConfigurePathname}/${effectiveNamespace}`}
        dataTestId="empty-experiments-state"
      />
    );
  }

  return (
    <AutomlRunsTable
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

export default AutomlExperiments;
