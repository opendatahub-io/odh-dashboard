import * as React from 'react';
import { Bullseye, EmptyState, EmptyStateBody, Spinner } from '@patternfly/react-core';
import { Route, Routes } from 'react-router-dom';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';

type ProjectsRoutesProps = {
  children: React.ReactNode;
};

/** For replacing the react-router <Routes> object in a safe "always render with projects". */
const ProjectsRoutes: React.FC<ProjectsRoutesProps> = ({ children }) => {
  const { loaded, loadError } = React.useContext(ProjectsContext);

  let render: React.ReactNode;

  if (loadError) {
    // This is unlikely to happen -- likely a development setup error and mounted outside of the provider
    render = (
      <EmptyState headingLevel="h2" titleText="There was an issue fetching projects.">
        <EmptyStateBody>{loadError.message}</EmptyStateBody>
      </EmptyState>
    );
  } else if (!loaded) {
    render = (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  } else {
    return <Routes>{children}</Routes>;
  }

  return (
    <Routes>
      <Route path="*" element={render} />
    </Routes>
  );
};

export default ProjectsRoutes;
