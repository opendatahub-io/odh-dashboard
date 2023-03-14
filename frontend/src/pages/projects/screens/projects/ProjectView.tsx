import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useAccessReview } from '~/api';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import EmptyProjects from './EmptyProjects';
import useUserProjects from './useUserProjects';
import ProjectListView from './ProjectListView';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'project.openshift.io',
  resource: 'projects',
  verb: 'create',
};

const ProjectView: React.FC = () => {
  const [projects, loaded, loadError, refreshProjects] = useUserProjects();
  const [allowCreate, rbacLoaded] = useAccessReview(accessReviewResource);

  return (
    <ApplicationsPage
      title="Data science projects"
      description="View your existing projects or create new projects."
      loaded={loaded && rbacLoaded}
      empty={projects.length === 0}
      loadError={loadError}
      emptyStatePage={<EmptyProjects allowCreate={allowCreate} />}
      provideChildrenPadding
    >
      <ProjectListView
        projects={projects}
        refreshProjects={refreshProjects}
        allowCreate={allowCreate}
      />
    </ApplicationsPage>
  );
};

export default ProjectView;
