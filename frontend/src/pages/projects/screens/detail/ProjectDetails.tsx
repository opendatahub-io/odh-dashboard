import * as React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { CubeIcon, UsersIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getProjectDescription, getProjectDisplayName } from '~/pages/projects/utils';
import GenericHorizontalBar from '~/pages/projects/components/GenericHorizontalBar';
import ProjectSharing from '~/pages/projects/projectSharing/ProjectSharing';
import { useAppContext } from '~/app/AppContext';
import { isProjectSharingEnabled } from '~/pages/projects/projectSharing/utils';
import useCheckLogoutParams from './useCheckLogoutParams';
import ProjectDetailsComponents from './ProjectDetailsComponents';

const ProjectDetails: React.FC = () => {
  const { dashboardConfig } = useAppContext();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const displayName = getProjectDisplayName(currentProject);
  const description = getProjectDescription(currentProject);
  const projectSharingEnabled = isProjectSharingEnabled(dashboardConfig);

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
      loaded
      empty={false}
    >
      {projectSharingEnabled ? (
        <GenericHorizontalBar
          sections={[
            { title: 'Components', component: <ProjectDetailsComponents />, icon: <CubeIcon /> },
            { title: 'Permissions', component: <ProjectSharing />, icon: <UsersIcon /> },
          ]}
        />
      ) : (
        <ProjectDetailsComponents />
      )}
    </ApplicationsPage>
  );
};

export default ProjectDetails;
