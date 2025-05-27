import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Bullseye, Spinner } from '@patternfly/react-core';
import NotFound from '~/pages/NotFound';
import { ProjectKind, ServingRuntimeKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';

type ProjectServerMetricsPathWrapperProps = {
  children: (servingRuntime: ServingRuntimeKind, currentProject: ProjectKind) => React.ReactNode;
};

const ProjectServerMetricsPathWrapper: React.FC<ProjectServerMetricsPathWrapperProps> = ({
  children,
}) => {
  const { servingRuntime: serverName } = useParams<{
    servingRuntime: string;
  }>();
  const {
    currentProject,
    servingRuntimes: {
      data: { items: servers },
      loaded,
    },
  } = React.useContext(ProjectDetailsContext);
  const servingRuntime = servers.find((server) => server.metadata.name === serverName);
  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }
  if (!servingRuntime) {
    return <NotFound />;
  }

  return <>{children(servingRuntime, currentProject)}</>;
};

export default ProjectServerMetricsPathWrapper;
