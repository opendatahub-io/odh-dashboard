import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useAccessReview } from '~/api';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import useMountProjectRefresh from '~/concepts/projects/useMountProjectRefresh';
import { useBrowserStorage } from '~/components/browserStorage';
import { ProjectScope } from '~/pages/projects/types';
import EmptyProjects from './EmptyProjects';
import ProjectListView from './ProjectListView';
import ProjectScopeSelect from './ProjectScopeSelect';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'project.openshift.io',
  resource: 'projectrequests',
  verb: 'create',
};

const ProjectView: React.FC = () => {
  const [scope, setScope] = useBrowserStorage<ProjectScope>(
    'odh.dashboard.project.scope',
    ProjectScope.DS_PROJECTS,
  );
  const { projects, dataScienceProjects } = React.useContext(ProjectsContext);
  useMountProjectRefresh();
  const [allowCreate, rbacLoaded] = useAccessReview(accessReviewResource);

  return (
    <ApplicationsPage
      title="Data science projects"
      description={
        rbacLoaded
          ? `View your existing projects${allowCreate ? ' or create new projects' : ''}.`
          : undefined
      }
      headerContent={<ProjectScopeSelect selection={scope} setSelection={setScope} />}
      loaded={rbacLoaded}
      empty={
        scope === ProjectScope.ALL_PROJECTS
          ? projects.length === 0
          : dataScienceProjects.length === 0
      }
      emptyStatePage={<EmptyProjects allowCreate={allowCreate} />}
      provideChildrenPadding
    >
      <ProjectListView allowCreate={allowCreate} scope={scope} />
    </ApplicationsPage>
  );
};

export default ProjectView;
