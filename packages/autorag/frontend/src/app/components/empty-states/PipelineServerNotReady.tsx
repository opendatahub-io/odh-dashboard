/**
 * Empty state shown when the DSPA exists but its Ready condition is not True.
 * Uses the same layout and graphic as NoPipelineServer and links to the Pipelines page
 * so the user can inspect the pipeline server status.
 */
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { pipelinesBaseRoute } from '@odh-dashboard/internal/routes/pipelines/global';
import { Button } from '@patternfly/react-core';
import * as React from 'react';
import { Link } from 'react-router-dom';

type PipelineServerNotReadyProps = {
  namespace?: string;
};

function PipelineServerNotReady({ namespace }: PipelineServerNotReadyProps): React.JSX.Element {
  return (
    <EmptyDetailsView
      title="There is a problem with the pipeline server"
      iconImage={typedEmptyImage(ProjectObjectType.pipeline)}
      imageAlt=""
      createButton={
        <Button
          variant="link"
          isInline
          data-testid="go-to-pipelines-link"
          component={(props) => <Link {...props} to={pipelinesBaseRoute(namespace)} />}
        >
          View error details
        </Button>
      }
    />
  );
}

export default PipelineServerNotReady;
