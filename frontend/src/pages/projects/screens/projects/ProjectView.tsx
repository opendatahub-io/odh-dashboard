import * as React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useAccessReview } from '~/api';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import useMountProjectRefresh from '~/concepts/projects/useMountProjectRefresh';
import { useBrowserStorage } from '~/components/browserStorage';
import { ProjectObjectType, ProjectScope } from '~/pages/projects/types';
import { typedObjectImage } from '~/pages/projects/utils';
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
      title={
        <Flex
          spaceItems={{ default: 'spaceItemsSm' }}
          alignItems={{ default: 'alignItemsFlexStart' }}
        >
          <img
            style={{ height: '32px' }}
            src={typedObjectImage(ProjectObjectType.project)}
            alt="prioject"
          />
          <FlexItem>Data Science Projects</FlexItem>
        </Flex>
      }
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
      removeChildrenTopPadding
    >
      <ProjectListView allowCreate={allowCreate} scope={scope} />
    </ApplicationsPage>
  );
};

export default ProjectView;
