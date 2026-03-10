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
import { AutoragRunsTable } from '~/app/components/AutoragRunsTable';
import EmptyExperimentsState from '~/app/components/empty-states/EmptyExperimentsState';
import NoPipelineServer from '~/app/components/empty-states/NoPipelineServer';
import PipelineServerNotReady from '~/app/components/empty-states/PipelineServerNotReady';
import { usePipelineDefinitions } from '~/app/hooks/usePipelineDefinitions';
import { usePipelineRuns } from '~/app/hooks/usePipelineRuns';
// eslint-disable-next-line import/no-extraneous-dependencies -- ~/app is local path alias, not gen-ai package
import { autoragCreatePathname } from '~/app/utilities/routes';

/**
 * Main experiments list page for AutoRAG. Renders pipeline runs in a paginated table,
 * handles loading/error states (403, 404, 503), and shows empty state when no experiments exist.
 */
function AutoragExperiments(): React.JSX.Element {
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
  const loadError = defsError ?? runsError;

  const handleCreateClick = React.useCallback(() => {
    navigate(`${autoragCreatePathname}/${namespace ?? effectiveNamespace}`);
  }, [navigate, namespace, effectiveNamespace]);

  const createButton = (
    <Button variant="primary" onClick={handleCreateClick}>
      Create Autorag experiment
    </Button>
  );

  const hasExperiments = totalSize > 0;

  const errorCode = loadError ? getGenericErrorCode(loadError) : undefined;

  if (loadError) {
    if (errorCode === 403) {
      return <UnauthorizedError accessDomain="AutoRAG experiments" />;
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
        createExperimentRoute={`${autoragCreatePathname}/${namespace ?? effectiveNamespace}`}
        dataTestId="empty-experiments-state"
      />
    );
  }

  return (
    <AutoragRunsTable
      runs={runs}
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

export default AutoragExperiments;
