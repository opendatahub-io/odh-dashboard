import { Button, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { AutoragRunsTable } from '~/app/components/AutoragRunsTable';
import NoProjects from '~/app/components/empty-states/NoProjects';
import { useAutoragMockPipelines } from '~/app/hooks/useAutoragMockPipelines';
import { usePipelineDefinitions } from '~/app/hooks/usePipelineDefinitions';
import { usePipelineRuns } from '~/app/hooks/usePipelineRuns';
// eslint-disable-next-line import/no-extraneous-dependencies -- ~/app is local path alias, not gen-ai package
import { autoragCreatePathname } from '~/app/utilities/routes';

function AutoragExperiments(): React.JSX.Element {
  const navigate = useNavigate();
  const { namespace } = useParams();
  const [useMock] = useAutoragMockPipelines();

  // Use 'default' as fallback when no namespace selected (e.g. mock mode, before redirect)
  const effectiveNamespace = namespace ?? (useMock ? 'default' : '');

  const { pipelineDefinitions } = usePipelineDefinitions(effectiveNamespace);
  const { runs } = usePipelineRuns(effectiveNamespace, pipelineDefinitions);

  const handleCreateClick = React.useCallback(() => {
    navigate(`${autoragCreatePathname}/${namespace ?? effectiveNamespace}`);
  }, [navigate, namespace, effectiveNamespace]);

  const createButton = (
    <Button variant="primary" onClick={handleCreateClick}>
      Create Autorag experiment
    </Button>
  );

  const hasExperiments = runs.length > 0;

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
