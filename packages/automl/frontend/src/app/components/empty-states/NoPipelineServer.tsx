/**
 * Empty State A — no compatible pipeline server detected.
 * Directs users to the Pipelines page to configure a pipeline server.
 */
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { pipelinesBaseRoute } from '@odh-dashboard/internal/routes/pipelines/global';
import { Button } from '@patternfly/react-core';
import * as React from 'react';
import { Link } from 'react-router-dom';

type NoPipelineServerProps = {
  namespace?: string;
};

function NoPipelineServer({ namespace }: NoPipelineServerProps): React.JSX.Element {
  return (
    <EmptyDetailsView
      title="Configure a compatible pipeline server"
      description="To use AutoML, you need access to a pipeline server. Create or edit a pipeline server on the Pipelines page."
      iconImage={typedEmptyImage(ProjectObjectType.pipeline, 'MissingModel')}
      imageAlt=""
      createButton={
        <Button
          variant="link"
          isInline
          data-testid="go-to-pipelines-link"
          component={(props) => <Link {...props} to={pipelinesBaseRoute(namespace)} />}
        >
          Go to Pipelines
        </Button>
      }
    />
  );
}

export default NoPipelineServer;
