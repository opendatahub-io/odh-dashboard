import * as React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { CogIcon, CubeIcon, UsersIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getProjectDescription, getProjectDisplayName } from '~/pages/projects/utils';
import GenericHorizontalBar from '~/pages/projects/components/GenericHorizontalBar';
import ProjectSharing from '~/pages/projects/projectSharing/ProjectSharing';
import { useAppContext } from '~/app/AppContext';
import { useAccessReview } from '~/api';
import { isProjectSharingEnabled } from '~/pages/projects/projectSharing/utils';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import ProjectSettingsPage from '~/pages/projects/projectSettings/ProjectSettingsPage';
import useCheckLogoutParams from './useCheckLogoutParams';
import ProjectDetailsComponents from './ProjectDetailsComponents';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'rbac.authorization.k8s.io',
  resource: 'rolebindings',
  verb: 'create',
};

const ProjectDetails: React.FC = () => {
  const { dashboardConfig } = useAppContext();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const displayName = getProjectDisplayName(currentProject);
  const description = getProjectDescription(currentProject);
  const projectSharingEnabled = isProjectSharingEnabled(dashboardConfig);

  const [allowCreate, rbacLoaded] = useAccessReview({
    ...accessReviewResource,
    namespace: currentProject.metadata.name,
  });

  useCheckLogoutParams();

  return (
    <ApplicationsPage
      title={displayName}
      description={description}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/projects">Data science projects</Link>} />
          <BreadcrumbItem isActive>{displayName}</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={rbacLoaded}
      empty={false}
    >
      {projectSharingEnabled && allowCreate ? (
        <GenericHorizontalBar
          sections={[
            { title: 'Components', component: <ProjectDetailsComponents />, icon: <CubeIcon /> },
            { title: 'Permissions', component: <ProjectSharing />, icon: <UsersIcon /> },
            { title: 'Settings', component: <ProjectSettingsPage />, icon: <CogIcon /> },
          ]}
        />
      ) : (
        <ProjectDetailsComponents />
      )}
    </ApplicationsPage>
  );
};

export default ProjectDetails;
