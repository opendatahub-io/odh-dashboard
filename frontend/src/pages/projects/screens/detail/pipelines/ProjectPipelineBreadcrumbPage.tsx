import * as React from 'react';
import { Link } from 'react-router-dom';
import { BreadcrumbItem } from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineCoreDetailsPageComponent } from '#~/concepts/pipelines/content/types';
import EnsureAPIAvailability from '#~/concepts/pipelines/EnsureAPIAvailability';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';

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
            render={() => <Link to="/projects">Data Science Projects</Link>}
          />,
          <BreadcrumbItem
            key="project-details"
            render={() => <Link to={contextPath}>{getDisplayNameFromK8sResource(project)}</Link>}
          />,
        ]}
        contextPath={contextPath}
      />
    </EnsureAPIAvailability>
  );
};

export default ProjectPipelineBreadcrumbPage;
