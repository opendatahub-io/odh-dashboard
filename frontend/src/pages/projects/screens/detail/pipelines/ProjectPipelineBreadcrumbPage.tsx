import * as React from 'react';
import { Link } from 'react-router-dom';
import { BreadcrumbItem } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';

type ProjectPipelineDetailsProps = {
  BreadcrumbDetailsComponent: PipelineCoreDetailsPageComponent;
};

const ProjectPipelineBreadcrumbPage: React.FC<ProjectPipelineDetailsProps> = ({
  BreadcrumbDetailsComponent,
}) => {
  const { namespace, project } = usePipelinesAPI();

  const contextPath = `/projects/${namespace}`;
  return (
    <EnsureAPIAvailability>
      <BreadcrumbDetailsComponent
        breadcrumbPath={[
          <BreadcrumbItem
            key="project-home"
            render={() => <Link to={`/projects`}>Projects</Link>}
          />,
          <BreadcrumbItem
            key="project-details"
            render={() => <Link to={contextPath}>{getProjectDisplayName(project)}</Link>}
          />,
        ]}
        contextPath={contextPath}
      />
    </EnsureAPIAvailability>
  );
};

export default ProjectPipelineBreadcrumbPage;
