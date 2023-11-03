import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useAccessReview } from '~/api';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import useMountProjectRefresh from '~/concepts/projects/useMountProjectRefresh';
import EmptyProjects from './EmptyProjects';
import ProjectListView from './ProjectListView';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'project.openshift.io',
  resource: 'projectrequests',
  verb: 'create',
};

const ProjectView: React.FC = () => {
  const { projects } = React.useContext(ProjectsContext);
  useMountProjectRefresh();
  const [allowCreate, rbacLoaded] = useAccessReview(accessReviewResource);

  return (
    <ApplicationsPage
      title="Data Science Projects"
      description={
        rbacLoaded
          ? `View your existing projects${allowCreate ? ' or create new projects' : ''}.`
          : undefined
      }
      loaded={rbacLoaded}
      empty={projects.length === 0}
      emptyStatePage={<EmptyProjects allowCreate={allowCreate} />}
      provideChildrenPadding
    >
      <ProjectListView allowCreate={allowCreate} />
    </ApplicationsPage>
  );
};

export default ProjectView;
