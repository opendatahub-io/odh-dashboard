import * as React from 'react';
import ApplicationsPage from '../ApplicationsPage';
import EmptyProjects from './EmptyProjects';

const ProjectView: React.FC = () => {
  return (
    <ApplicationsPage
      title="Data science projects"
      description="View your existing projects or create new projects."
      loaded
      empty
      emptyStatePage={<EmptyProjects />}
    />
  );
};

export default ProjectView;
