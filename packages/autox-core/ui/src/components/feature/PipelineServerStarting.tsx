import * as React from 'react';
import { Content, ContentVariants } from '@patternfly/react-core';
import { pipelinesBaseRoute } from '@odh-dashboard/internal/routes/pipelines/global';
import { Link } from 'react-router-dom';
import { SpinnerEmptyState } from '../primitive';

type PipelineServerStartingProps = {
  namespace?: string;
  'data-testid'?: string;
};

const PipelineServerStarting: React.FC<PipelineServerStartingProps> = ({
  namespace,
  'data-testid': testId = 'pipeline-server-starting',
}) => (
  <SpinnerEmptyState
    data-testid={testId}
    title="Starting pipeline server"
    description="The pipeline server is being initialized. The process should take less than five minutes."
    footer={
      namespace ? (
        <Content component={ContentVariants.a}>
          <Link to={pipelinesBaseRoute(namespace)}>Show details</Link>
        </Content>
      ) : undefined
    }
  />
);

export default PipelineServerStarting;
