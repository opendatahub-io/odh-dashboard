import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, Flex, FlexItem, Truncate } from '@patternfly/react-core';
import { Link, useSearchParams } from 'react-router-dom';
import { useModelServingTab } from '#~/concepts/projects/projectDetails/useModelServingTab';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import GenericHorizontalBar from '#~/pages/projects/components/GenericHorizontalBar';
import ProjectSharing from '#~/pages/projects/projectSharing/ProjectSharing';
import ProjectSettingsPage from '#~/pages/projects/projectSettings/ProjectSettingsPage';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
} from '#~/concepts/k8s/utils';
import ResourceNameTooltip from '#~/components/ResourceNameTooltip';
import HeaderIcon from '#~/concepts/design/HeaderIcon';
import { useProjectPermissionsTabVisible } from '#~/concepts/projects/accessChecks';
import useCheckLogoutParams from './useCheckLogoutParams';
import ProjectOverview from './overview/ProjectOverview';
import NotebookList from './notebooks/NotebookList';
import StorageList from './storage/StorageList';
import ConnectionsList from './connections/ConnectionsList';
import PipelinesSection from './pipelines/PipelinesSection';
import ProjectActions from './ProjectActions';
import RagChatbot from './chatbot/RagChatbot';

import './ProjectDetails.scss';

const ProjectDetails: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const displayName = getDisplayNameFromK8sResource(currentProject);
  const description = getDescriptionFromK8sResource(currentProject);
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  const projectSharingEnabled = useIsAreaAvailable(SupportedArea.DS_PROJECTS_PERMISSIONS).status;
  const pipelinesEnabled = useIsAreaAvailable(SupportedArea.DS_PIPELINES).status;
  const modelServingTab = useModelServingTab();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = searchParams.get('section');

  const [allowCreate, rbacLoaded] = useProjectPermissionsTabVisible(currentProject.metadata.name);

  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;
  const chatBotEnabled = useIsAreaAvailable(SupportedArea.LLAMA_STACK_CHAT_BOT).status;

  useCheckLogoutParams();

  return (
    <ApplicationsPage
      title={
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <HeaderIcon type={ProjectObjectType.projectContext} sectionType={SectionType.general} />
          <FlexItem flex={{ default: 'flex_1' }}>
            <ResourceNameTooltip resource={currentProject} wrap={false}>
              <Truncate content={displayName} />
            </ResourceNameTooltip>
          </FlexItem>
        </Flex>
      }
      description={<div style={{ marginLeft: 40 }}>{description}</div>}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/projects">Data Science Projects</Link>} />
          <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
            <Truncate content={displayName} />
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={rbacLoaded}
      empty={false}
      headerAction={<ProjectActions project={currentProject} />}
    >
      <GenericHorizontalBar
        activeKey={state}
        onSectionChange={React.useCallback(
          (sectionId, replace) => {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set('section', sectionId);
            setSearchParams(newSearchParams, replace ? { replace } : undefined);
          },
          [searchParams, setSearchParams],
        )}
        sections={React.useMemo(
          () => [
            { id: ProjectSectionID.OVERVIEW, title: 'Overview', component: <ProjectOverview /> },
            ...(chatBotEnabled
              ? [
                  {
                    id: ProjectSectionID.CHATBOT,
                    title: 'Chatbot',
                    component: <RagChatbot />,
                  },
                ]
              : []),
            ...(workbenchEnabled
              ? [
                  {
                    id: ProjectSectionID.WORKBENCHES,
                    title: 'Workbenches',
                    component: <NotebookList />,
                  },
                ]
              : []),
            ...(pipelinesEnabled
              ? [
                  {
                    id: ProjectSectionID.PIPELINES,
                    title: 'Pipelines',
                    component: <PipelinesSection />,
                  },
                ]
              : []),
            ...modelServingTab,
            {
              id: ProjectSectionID.CLUSTER_STORAGES,
              title: 'Cluster storage',
              component: <StorageList />,
            },
            {
              id: ProjectSectionID.CONNECTIONS,
              title: 'Connections',
              component: <ConnectionsList />,
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
          ],
          [
            allowCreate,
            biasMetricsAreaAvailable,
            pipelinesEnabled,
            projectSharingEnabled,
            workbenchEnabled,
            modelServingTab,
            chatBotEnabled,
          ],
        )}
      />
    </ApplicationsPage>
  );
};

export default ProjectDetails;
