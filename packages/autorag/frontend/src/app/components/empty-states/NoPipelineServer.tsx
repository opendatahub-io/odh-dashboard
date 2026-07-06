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
      description="To use AutoRAG, go to the Pipelines page, then create a new pipeline server or edit an existing one using Manage pipeline server configuration. Under Advanced settings, check the Enable AutoML and AutoRAG pipelines option."
      iconImage={typedEmptyImage(ProjectObjectType.pipeline)}
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
