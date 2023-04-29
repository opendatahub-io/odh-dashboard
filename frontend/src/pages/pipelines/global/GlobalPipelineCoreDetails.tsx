import * as React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { BreadcrumbItem } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/pipelinesDetails/types';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';

type GlobalPipelineCoreDetailsProps = {
  pageName: string;
  redirectPath: (namespace: string) => string;
  BreadcrumbDetailsComponent: PipelineCoreDetailsPageComponent;
};

const GlobalPipelineCoreDetails: React.FC<GlobalPipelineCoreDetailsProps> = ({
  pageName,
  redirectPath,
  BreadcrumbDetailsComponent,
}) => {
  const { pipelineId, pipelineRunId } = useParams();
  const { namespace, project } = usePipelinesAPI();

  if (!pipelineId && !pipelineRunId) {
    return <Navigate to={redirectPath(namespace)} />;
  }

  return (
    <EnsureAPIAvailability>
      <BreadcrumbDetailsComponent
        breadcrumbPath={[
          <BreadcrumbItem
            key="home"
            render={() => (
              <Link to={redirectPath(namespace)}>
                {pageName} - {getProjectDisplayName(project)}
              </Link>
            )}
          />,
        ]}
      />
    </EnsureAPIAvailability>
  );
};

export default GlobalPipelineCoreDetails;
