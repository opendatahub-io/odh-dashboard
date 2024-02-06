import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, Flex, FlexItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getProjectDescription, getProjectDisplayName } from '~/pages/projects/utils';
import GenericHorizontalBar from '~/pages/projects/components/GenericHorizontalBar';
import ProjectSharing from '~/pages/projects/projectSharing/ProjectSharing';
import ProjectSettingsPage from '~/pages/projects/projectSettings/ProjectSettingsPage';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { useAppContext } from '~/app/AppContext';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import { useQueryParams } from '~/utilities/useQueryParams';
import projectIcon from '~/images/UI_icon-Red_Hat-Folder-RGB.svg';
import ModelServingPlatform from '~/pages/modelServing/screens/projects/ModelServingPlatform';
import useCheckLogoutParams from './useCheckLogoutParams';
import ProjectOverview from './overview/ProjectOverview';
import NotebookList from './notebooks/NotebookList';
import StorageList from './storage/StorageList';
import DataConnectionsList from './data-connections/DataConnectionsList';
import PipelinesSection from './pipelines/PipelinesSection';

import './ProjectDetails.scss';

const ProjectDetails: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const displayName = getProjectDisplayName(currentProject);
  const description = getProjectDescription(currentProject);
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  const projectSharingEnabled = useIsAreaAvailable(SupportedArea.DS_PROJECTS_PERMISSIONS).status;
  const { dashboardConfig } = useAppContext();
  const pipelinesEnabled =
    useIsAreaAvailable(SupportedArea.DS_PIPELINES).status &&
    dashboardConfig.status.dependencyOperators.redhatOpenshiftPipelines.available;
  const modelServingEnabled = useModelServingEnabled();
  const queryParams = useQueryParams();
  const state = queryParams.get('section');

  useCheckLogoutParams();

  const content = () => (
    <GenericHorizontalBar
      activeKey={state}
      sections={[
        { id: 'overview', title: 'Overview', component: <ProjectOverview /> },
        { id: 'workbenches', title: 'Workbenches', component: <NotebookList /> },
        { id: 'cluster-storage', title: 'Cluster storage', component: <StorageList /> },
        {
          id: 'data-connections',
          title: 'Data connections',
          component: <DataConnectionsList />,
        },
        ...(pipelinesEnabled
          ? [{ id: 'pipelines', title: 'Pipelines', component: <PipelinesSection /> }]
          : []),
        ...(modelServingEnabled
          ? [
              {
                id: 'model-servers',
                title: 'Model servers',
                component: <ModelServingPlatform />,
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

  return (
    <ApplicationsPage
      title={
        <Flex
          spaceItems={{ default: 'spaceItemsSm' }}
          alignItems={{ default: 'alignItemsFlexStart' }}
        >
          <img style={{ height: 32 }} src={projectIcon} alt="prioject" />
          <FlexItem>{displayName}</FlexItem>
        </Flex>
      }
      description={<div style={{ marginLeft: 40 }}>{description}</div>}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/projects">Data Science Projects</Link>} />
          <BreadcrumbItem isActive>{displayName}</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
    >
      {content()}
    </ApplicationsPage>
  );
};

export default ProjectDetails;
