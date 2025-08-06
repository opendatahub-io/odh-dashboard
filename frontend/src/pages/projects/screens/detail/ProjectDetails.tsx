import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Flex,
  FlexItem,
  Truncate,
  Alert,
  AlertActionCloseButton,
  Popover,
  Button,
  ListItem,
  List,
} from '@patternfly/react-core';
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
import useKueueDisabled from '#~/concepts/projects/hooks/useKueueDisabled';
import useCheckLogoutParams from './useCheckLogoutParams';
import ProjectOverview from './overview/ProjectOverview';
import NotebookList from './notebooks/NotebookList';
import StorageList from './storage/StorageList';
import ConnectionsList from './connections/ConnectionsList';
import PipelinesSection from './pipelines/PipelinesSection';
import ProjectActions from './ProjectActions';
import RagChatbot from './chatbot/RagChatbot';

import './ProjectDetails.scss';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

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

  const { shouldShowKueueAlert } = useKueueDisabled(currentProject);

  const [isKueueAlertDismissed, setIsKueueAlertDismissed] = React.useState(false);

  const handleKueueAlertClose = React.useCallback(() => {
    setIsKueueAlertDismissed(true);
  }, []);

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
      {shouldShowKueueAlert && !isKueueAlertDismissed && (
        <Flex direction={{ default: 'column' }} className="pf-v6-u-px-lg">
          <Alert
            variant="info"
            isInline
            title="Kueue is disabled in this cluster"
            isExpandable={true}
            actionClose={<AlertActionCloseButton onClose={handleKueueAlertClose} />}
          >
            <p>
              This project uses local queue for workload allocation, which relies on Kueue. To
              deploy a model or create a workbench in this project, ask your administrator to enable
              Kueue or change this project's workload allocation strategy.
            </p>
            <Popover
              position="bottom"
              headerContent="Who's my administrator?"
              bodyContent={
                <div>
                  Your administrator might be:
                  <List>
                    <ListItem>
                      The person who assigned you your username, or who heelped you log in for the
                      first time
                    </ListItem>
                    <ListItem>Someone in your IT department or help desk</ListItem>
                    <ListItem>A project manager or developer</ListItem>
                    <ListItem>Your preofessor (at a school)</ListItem>
                  </List>
                </div>
              }
            >
              <Button variant="link" icon={<OutlinedQuestionCircleIcon />} aria-label="More info">
                Who's my administrator?
              </Button>
            </Popover>
          </Alert>
        </Flex>
      )}

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
