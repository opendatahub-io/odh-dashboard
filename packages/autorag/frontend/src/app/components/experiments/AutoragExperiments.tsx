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
import { AutoragRunsTable } from '~/app/components/AutoragRunsTable';
import NoPipelineServer from '~/app/components/empty-states/NoPipelineServer';
import NoProjects from '~/app/components/empty-states/NoProjects';
import { usePipelineDefinitions } from '~/app/hooks/usePipelineDefinitions';
import { usePipelineRuns } from '~/app/hooks/usePipelineRuns';
// eslint-disable-next-line import/no-extraneous-dependencies -- ~/app is local path alias, not gen-ai package
import { autoragCreatePathname } from '~/app/utilities/routes';

function AutoragExperiments(): React.JSX.Element {
  const navigate = useNavigate();
  const { namespace } = useParams();

  const effectiveNamespace = namespace ?? '';

  const {
    pipelineDefinitions,
    loaded: defsLoaded,
    error: defsError,
  } = usePipelineDefinitions(effectiveNamespace);
  const {
    runs,
    loaded: runsLoaded,
    error: runsError,
  } = usePipelineRuns(effectiveNamespace, pipelineDefinitions);

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

  const hasExperiments = runs.length > 0;

  // Show friendly empty state when no Pipeline Server (DSPipelineApplication) exists in the namespace
  const isNoPipelineServerError =
    loadError &&
    (loadError.message.toLowerCase().includes('no pipeline server') ||
      loadError.message.toLowerCase().includes('dspipelineapplication'));

  if (loadError && !isNoPipelineServerError) {
    return (
      <Alert variant="danger" isInline title="Failed to load experiments">
        <p>{loadError.message}</p>
      </Alert>
    );
  }

  if (isNoPipelineServerError) {
    return <NoPipelineServer namespace={effectiveNamespace || undefined} />;
  }

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!hasExperiments) {
    return <NoProjects />;
  }

  return (
    <AutoragRunsTable
      runs={runs}
      toolbarContent={
        <ToolbarGroup align={{ default: 'alignEnd' }} style={{ flex: 1 }}>
          <ToolbarItem>{createButton}</ToolbarItem>
        </ToolbarGroup>
      }
    />
  );
}

export default AutoragExperiments;
