import * as React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { BreadcrumbItem } from '@patternfly/react-core';
import PipelineDetails from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetails';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { byName, ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { getProjectDisplayName } from '~/pages/projects/utils';

const GlobalPipelineDetails: React.FC = () => {
  const { pipelineId } = useParams();
  const { namespace } = usePipelinesAPI();
  const { projects } = React.useContext(ProjectsContext);
  const project = projects.find(byName(namespace));

  if (!pipelineId) {
    return <Navigate to={`/pipelines/${namespace}`} />;
  }

  return (
    <PipelineDetails
      breadcrumbPath={[
        <BreadcrumbItem
          key="home"
          render={() => (
            <Link to={`/pipelines/${namespace}`}>
              Pipelines - {project ? getProjectDisplayName(project) : namespace}
            </Link>
          )}
        />,
      ]}
    />
  );
};

export default GlobalPipelineDetails;
