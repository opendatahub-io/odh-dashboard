import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, Flex, FlexItem } from '@patternfly/react-core';
import { CogIcon, CubeIcon, UsersIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getProjectDescription, getProjectDisplayName } from '~/pages/projects/utils';
import GenericHorizontalBar from '~/pages/projects/components/GenericHorizontalBar';
import ProjectSharing from '~/pages/projects/projectSharing/ProjectSharing';
import { useAccessReview } from '~/api';
import ProjectSettingsPage from '~/pages/projects/projectSettings/ProjectSettingsPage';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { useAppContext } from '~/app/AppContext';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import { useAppSelector } from '~/redux/hooks';
import { useQueryParams } from '~/utilities/useQueryParams';
import projectIcon from '~/images/UI_icon-Red_Hat-Folder-RGB.svg';
import ModelServingPlatformAlt from '~/pages/modelServing/screens/projects/ModelServingPlatformAlt';
import useCheckLogoutParams from './useCheckLogoutParams';
import ProjectDetailsComponents from './ProjectDetailsComponents';
import ProjectOverview from './overview/ProjectOverview';
import { AccessReviewResource } from './const';
import NotebookListAlt from './notebooks/NotebookListAlt';
import StorageListAlt from './storage/StorageListAlt';
import DataConnectionsListAlt from './data-connections/DataConnectionsListAlt';
import PipelinesSectionAlt from './pipelines/PipelinesSectionAlt';

const ProjectDetails: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const displayName = getProjectDisplayName(currentProject);
  const description = getProjectDescription(currentProject);
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  const projectSharingEnabled = useIsAreaAvailable(SupportedArea.DS_PROJECTS_PERMISSIONS).status;
  const [allowCreate, rbacLoaded] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });
  const { dashboardConfig } = useAppContext();
  const pipelinesEnabled =
    useIsAreaAvailable(SupportedArea.DS_PIPELINES).status &&
    dashboardConfig.status.dependencyOperators.redhatOpenshiftPipelines.available;
  const modelServingEnabled = useModelServingEnabled();
  const alternateUI = useAppSelector((state) => state.alternateUI);
  const queryParams = useQueryParams();
  const state = queryParams.get('section');

  useCheckLogoutParams();

  const content = () => {
    if (!alternateUI) {
      if (projectSharingEnabled && allowCreate) {
        return (
          <GenericHorizontalBar
            activeKey={state}
            sections={[
              {
                id: 'components',
                title: 'Components',
                component: <ProjectDetailsComponents />,
                icon: <CubeIcon />,
              },
              {
                id: 'permissions',
                title: 'Permissions',
                component: <ProjectSharing />,
                icon: <UsersIcon />,
              },
              ...(biasMetricsAreaAvailable
                ? [
                    {
                      id: 'settings',
                      title: 'Settings',
                      component: <ProjectSettingsPage />,
                      icon: <CogIcon />,
                    },
                  ]
                : []),
            ]}
          />
        );
      }
      return <ProjectDetailsComponents />;
    }
    return (
      <GenericHorizontalBar
        activeKey={state}
        sections={[
          { id: 'overview', title: 'Overview', component: <ProjectOverview /> },
          { id: 'workbenches', title: 'Workbenches', component: <NotebookListAlt /> },
          { id: 'cluster-storage', title: 'Cluster storage', component: <StorageListAlt /> },
          {
            id: 'data-connections',
            title: 'Data connections',
            component: <DataConnectionsListAlt />,
          },
          ...(pipelinesEnabled
            ? [{ id: 'pipelines', title: 'Pipelines', component: <PipelinesSectionAlt /> }]
            : []),
          ...(modelServingEnabled
            ? [
                {
                  id: 'model-servers',
                  title: 'Model servers',
                  component: <ModelServingPlatformAlt />,
                },
              ]
            : []),
          ...(projectSharingEnabled
            ? [{ id: 'permissions', title: 'Permissions', component: <ProjectSharing /> }]
            : []),
          ...(biasMetricsAreaAvailable
            ? [{ id: 'settings', title: 'Settings', component: <ProjectSettingsPage /> }]
            : []),
        ]}
      />
    );
  };
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
            <FlexItem>{displayName}</FlexItem>
          </Flex>
        ) : (
          displayName
        )
      }
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
      {content()}
    </ApplicationsPage>
  );
};

export default ProjectDetails;
