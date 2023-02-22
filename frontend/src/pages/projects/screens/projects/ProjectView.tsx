import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import EmptyProjects from './EmptyProjects';
import useUserProjects from './useUserProjects';
import ProjectListView from './ProjectListView';

const ProjectView: React.FC = () => {
  const [projects, loaded, loadError, refreshProjects] = useUserProjects();

  return (
    <ApplicationsPage
      title="Data science projects"
      description="View your existing projects or create new projects."
      loaded={loaded}
      empty={projects.length === 0}
      loadError={loadError}
      emptyStatePage={<EmptyProjects />}
      provideChildrenPadding
    >
      <ProjectListView projects={projects} refreshProjects={refreshProjects} />
    </ApplicationsPage>
  );
};

export default ProjectView;
