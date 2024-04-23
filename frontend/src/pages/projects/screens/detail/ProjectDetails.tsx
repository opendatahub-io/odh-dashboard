import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, Flex, FlexItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getProjectDescription, getProjectDisplayName } from '~/concepts/projects/utils';
import GenericHorizontalBar from '~/pages/projects/components/GenericHorizontalBar';
import ProjectSharing from '~/pages/projects/projectSharing/ProjectSharing';
import ProjectSettingsPage from '~/pages/projects/projectSettings/ProjectSettingsPage';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import { useQueryParams } from '~/utilities/useQueryParams';
import ModelServingPlatform from '~/pages/modelServing/screens/projects/ModelServingPlatform';
import { typedObjectImage, ProjectObjectType } from '~/concepts/design/utils';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { useAccessReview } from '~/api';
import useCheckLogoutParams from './useCheckLogoutParams';
import ProjectOverview from './overview/ProjectOverview';
import NotebookList from './notebooks/NotebookList';
import StorageList from './storage/StorageList';
import DataConnectionsList from './data-connections/DataConnectionsList';
import PipelinesSection from './pipelines/PipelinesSection';

import './ProjectDetails.scss';

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
  const pipelinesEnabled = useIsAreaAvailable(SupportedArea.DS_PIPELINES).status;
  const modelServingEnabled = useModelServingEnabled();
  const queryParams = useQueryParams();
  const state = queryParams.get('section');
  const [allowCreate, rbacLoaded] = useAccessReview({
    ...accessReviewResource,
    namespace: currentProject.metadata.name,
  });

  useCheckLogoutParams();

  const content = () => (
    <GenericHorizontalBar
      activeKey={state}
      sections={[
        { id: ProjectSectionID.OVERVIEW, title: 'Overview', component: <ProjectOverview /> },
        { id: ProjectSectionID.WORKBENCHES, title: 'Workbenches', component: <NotebookList /> },
        ...(pipelinesEnabled
          ? [
              {
                id: ProjectSectionID.PIPELINES,
                title: 'Pipelines',
                component: <PipelinesSection />,
              },
            ]
          : []),
        ...(modelServingEnabled
          ? [
              {
                id: ProjectSectionID.MODEL_SERVER,
                title: 'Models',
                component: <ModelServingPlatform />,
              },
            ]
          : []),
        {
          id: ProjectSectionID.CLUSTER_STORAGES,
          title: 'Cluster storage',
          component: <StorageList />,
        },
        {
          id: ProjectSectionID.DATA_CONNECTIONS,
          title: 'Data connections',
          component: <DataConnectionsList />,
        },
        ...(projectSharingEnabled && allowCreate
          ? [
              {
                id: ProjectSectionID.PERMISSIONS,
                title: 'Permissions',
                component: <ProjectSharing />,
              },
            ]
          : []),
        ...(biasMetricsAreaAvailable && allowCreate
          ? [
              {
                id: ProjectSectionID.SETTINGS,
                title: 'Settings',
                component: <ProjectSettingsPage />,
              },
            ]
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
          <img style={{ height: 32 }} src={typedObjectImage(ProjectObjectType.project)} alt="" />
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
      loaded={rbacLoaded}
      empty={false}
    >
      {content()}
    </ApplicationsPage>
  );
};

export default ProjectDetails;
