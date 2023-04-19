import * as React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { BreadcrumbItem } from '@patternfly/react-core';
import PipelineDetails from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetails';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { getProjectDisplayName } from '~/pages/projects/utils';

const ProjectPipelineDetails: React.FC = () => {
  const { pipelineId } = useParams();
  const { namespace } = usePipelinesAPI();
  const { projects } = React.useContext(ProjectsContext);
  const project = projects.find(byName(namespace));

  if (!pipelineId) {
    return <Navigate to={`/projects/${namespace}`} />;
  }

  return (
    <PipelineDetails
      breadcrumbPath={[
        <BreadcrumbItem key="project-home" render={() => <Link to={`/projects`}>Projects</Link>} />,
        <BreadcrumbItem
          key="project-details"
          render={() => (
            <Link to={`/projects/${namespace}`}>
              {project ? getProjectDisplayName(project) : namespace}
            </Link>
          )}
        />,
      ]}
    />
  );
};

export default ProjectPipelineDetails;
