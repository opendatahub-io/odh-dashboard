import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import UnauthorizedError from '@odh-dashboard/internal/pages/UnauthorizedError';
import { Alert, Bullseye, Spinner } from '@patternfly/react-core';
import React from 'react';
import { useParams } from 'react-router';
import { AutoragRunsTable } from '~/app/components/AutoragRunsTable';
import EmptyExperimentsState from '~/app/components/empty-states/EmptyExperimentsState';
import NoPipelineServer from '~/app/components/empty-states/NoPipelineServer';
import PipelineServerNotReady from '~/app/components/empty-states/PipelineServerNotReady';
import { usePipelineDefinitions } from '~/app/hooks/usePipelineDefinitions';
import { usePipelineRuns } from '~/app/hooks/usePipelineRuns';
import { shouldShowConfigurePipelineServerEmptyState } from '~/app/utilities/pipelineServerEmptyState';
import { autoragConfigurePathname } from '~/app/utilities/routes';
import { parseErrorStatus } from '~/app/utilities/utils';

export type AutoragExperimentsListStatus = {
  /** True once pipeline definitions and runs have finished loading without a blocking list error. */
  loaded: boolean;
  /** True when at least one experiment (run) exists; false for empty state and error states. */
  hasExperiments: boolean;
};

type AutoragExperimentsProps = {
  /**
   * Fired when list loading / emptiness changes so the host page can tune chrome (e.g. hide the
   * header "Create RAG optimization run" action while the centered empty state is shown).
   */
  onExperimentsListStatus?: (status: AutoragExperimentsListStatus) => void;
};

/**
 * **Empty State A (`NoPipelineServer`)** — No managed pipeline server and/or managed AutoRAG
 * pipeline unavailable (see `shouldShowConfigurePipelineServerEmptyState`). Precedence over B.
 *
 * **Empty State B (`EmptyExperimentsState`)** — Server and pipeline load succeeded; zero runs.
 */
function AutoragExperiments({
  onExperimentsListStatus,
}: AutoragExperimentsProps): React.JSX.Element {
  const { namespace } = useParams();

  const effectiveNamespace = namespace ?? '';

  const { loaded: defsLoaded, error: defsError } = usePipelineDefinitions(effectiveNamespace);
  const {
    runs,
    totalSize,
    page,
    pageSize,
    setPage,
    setPageSize,
    loaded: runsLoaded,
    error: runsError,
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

  if (loadError) {
    if (errorCode === 403) {
      return <UnauthorizedError accessDomain="AutoRAG experiments" />;
    }
    if (shouldShowConfigurePipelineServerEmptyState(loadError)) {
      return <NoPipelineServer namespace={effectiveNamespace || undefined} />;
    }
    if (errorCode === 503) {
      return <PipelineServerNotReady namespace={effectiveNamespace || undefined} />;
    }
    return (
      <Alert variant="danger" isInline title="Failed to load experiments">
        <p>{loadError.message}</p>
      </Alert>
    );
  }

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!hasExperiments) {
    return (
      <EmptyExperimentsState
        createExperimentRoute={`${autoragConfigurePathname}/${effectiveNamespace}`}
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
    />
  );
}

export default AutoragExperiments;
