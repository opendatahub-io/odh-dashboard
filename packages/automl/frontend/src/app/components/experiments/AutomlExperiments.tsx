import {
  Alert,
  Bullseye,
  Button,
  Spinner,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import UnauthorizedError from '@odh-dashboard/internal/pages/UnauthorizedError';
import { AutomlRunsTable } from '~/app/components/AutomlRunsTable';
import EmptyExperimentsState from '~/app/components/empty-states/EmptyExperimentsState';
import NoPipelineServer from '~/app/components/empty-states/NoPipelineServer';
import PipelineServerNotReady from '~/app/components/empty-states/PipelineServerNotReady';
import { usePipelineDefinitions } from '~/app/hooks/usePipelineDefinitions';
import { usePipelineRuns } from '~/app/hooks/usePipelineRuns';
import { automlCreatePathname } from '~/app/utilities/routes';

/**
 * Extracts HTTP status from Error.message when handleRestFailures (mod-arch-core)
 * has flattened AxiosError to a plain Error, so 403/404/503 branches can still run.
 */
function parseErrorStatus(error: Error): number | undefined {
  const match =
    error.message.match(/\bstatus\s+code\s+(\d{3})\b/i) ??
    error.message.match(/\bstatus[:\s]+(\d{3})\b/i) ??
    error.message.match(/\b(403|404|503)\b/);
  if (match) {
    const code = parseInt(match[1], 10);
    return code >= 100 && code < 600 ? code : undefined;
  }
  return undefined;
}

/**
 * Main experiments list page for AutoML. Renders pipeline runs in a paginated table,
 * handles loading/error states (403, 404, 503), and shows empty state when no experiments exist.
 */
function AutomlExperiments(): React.JSX.Element {
  const navigate = useNavigate();
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
  const loadError = defsError || runsError;

  const handleCreateClick = React.useCallback(() => {
    navigate(`${automlCreatePathname}/${effectiveNamespace}`);
  }, [navigate, effectiveNamespace]);

  const createButton = (
    <Button variant="primary" onClick={handleCreateClick}>
      Create AutoML experiment
    </Button>
  );

  const hasExperiments = totalSize > 0;

  const errorCode = loadError
    ? (getGenericErrorCode(loadError) ??
      (loadError instanceof Error ? parseErrorStatus(loadError) : undefined))
    : undefined;

  if (loadError) {
    if (errorCode === 403) {
      return <UnauthorizedError accessDomain="AutoML experiments" />;
    }
    if (errorCode === 404) {
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
        createExperimentRoute={`${automlCreatePathname}/${effectiveNamespace}`}
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
      toolbarContent={
        <ToolbarGroup align={{ default: 'alignEnd' }} style={{ flex: 1 }}>
          <ToolbarItem>{createButton}</ToolbarItem>
        </ToolbarGroup>
      }
    />
  );
}

export default AutomlExperiments;
