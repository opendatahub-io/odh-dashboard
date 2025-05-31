import * as React from 'react';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { useAccessReview } from '#~/api';
import { AccessReviewResourceAttributes } from '#~/k8sTypes';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import { ProjectObjectType } from '#~/concepts/design/utils';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import LaunchJupyterButton from '#~/pages/projects/screens/projects/LaunchJupyterButton';
import { useAppContext } from '#~/app/AppContext';
import EmptyProjects from './EmptyProjects';
import ProjectListView from './ProjectListView';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'project.openshift.io',
  resource: 'projectrequests',
  verb: 'create',
};

const ProjectView: React.FC = () => {
  const { dashboardConfig } = useAppContext();
  const { projects } = React.useContext(ProjectsContext);
  const [allowCreate, rbacLoaded] = useAccessReview(accessReviewResource);

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="Data science projects" objectType={ProjectObjectType.project} />}
      headerAction={
        dashboardConfig.spec.notebookController?.enabled ? <LaunchJupyterButton /> : undefined
      }
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
