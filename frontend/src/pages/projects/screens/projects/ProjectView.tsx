import * as React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import projectIcon from '~/images/UI_icon-Red_Hat-Folder-RGB.svg';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useAccessReview } from '~/api';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import useMountProjectRefresh from '~/concepts/projects/useMountProjectRefresh';
import { useBrowserStorage } from '~/components/browserStorage';
import { ProjectScope } from '~/pages/projects/types';
import { useAppSelector } from '~/redux/hooks';
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
  const alternateUI = useAppSelector((state) => state.alternateUI);

  return (
    <ApplicationsPage
      title={
        alternateUI ? (
          <Flex
            spaceItems={{ default: 'spaceItemsSm' }}
            alignItems={{ default: 'alignItemsFlexStart' }}
          >
            <FlexItem>
              <img style={{ height: '32px' }} src={projectIcon} alt="prioject" />
            </FlexItem>
            <FlexItem>Data Science Projects</FlexItem>
          </Flex>
        ) : (
          'Data Science Projects'
        )
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
