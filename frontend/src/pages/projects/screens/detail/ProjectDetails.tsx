import * as React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { CogIcon, CubeIcon, UsersIcon } from '@patternfly/react-icons';
import { Link, useLocation } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getProjectDescription, getProjectDisplayName } from '~/pages/projects/utils';
import GenericHorizontalBar from '~/pages/projects/components/GenericHorizontalBar';
import ProjectSharing from '~/pages/projects/projectSharing/ProjectSharing';
import { useAccessReview } from '~/api';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import ProjectSettingsPage from '~/pages/projects/projectSettings/ProjectSettingsPage';
import useCheckLogoutParams from './useCheckLogoutParams';
import ProjectDetailsComponents from './ProjectDetailsComponents';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'rbac.authorization.k8s.io',
  resource: 'rolebindings',
  verb: 'create',
};

const ProjectDetails: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const displayName = getProjectDisplayName(currentProject);
  const description = getProjectDescription(currentProject);
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  const projectSharingEnabled = useIsAreaAvailable(SupportedArea.DS_PROJECTS_PERMISSIONS).status;
  const { state } = useLocation();
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
          <BreadcrumbItem render={() => <Link to="/projects">Data Science Projects</Link>} />
          <BreadcrumbItem isActive>{displayName}</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={rbacLoaded}
      empty={false}
    >
      {projectSharingEnabled && allowCreate ? (
        <GenericHorizontalBar
          activeKey={state}
          sections={[
            { title: 'Components', component: <ProjectDetailsComponents />, icon: <CubeIcon /> },
            { title: 'Permissions', component: <ProjectSharing />, icon: <UsersIcon /> },
            ...(biasMetricsAreaAvailable
              ? [{ title: 'Settings', component: <ProjectSettingsPage />, icon: <CogIcon /> }]
              : []),
          ]}
        />
      ) : (
        <ProjectDetailsComponents />
      )}
    </ApplicationsPage>
  );
};

export default ProjectDetails;
