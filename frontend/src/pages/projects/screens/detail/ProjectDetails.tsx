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
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { Link, useSearchParams } from 'react-router-dom';
import { useDeploymentsTab } from '#~/concepts/projects/projectDetails/useDeploymentsTab';
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
import { useKueueConfiguration } from '#~/concepts/hardwareProfiles/kueueUtils';
import FeatureStoreIntegration from '#~/pages/projects/featureStoreConfig/FeatureStoreIntegration';
import useCheckLogoutParams from './useCheckLogoutParams';
import ProjectOverview from './overview/ProjectOverview';
import NotebookList from './notebooks/NotebookList';
import StorageList from './storage/StorageList';
import ConnectionsList from './connections/ConnectionsList';
import PipelinesSection from './pipelines/PipelinesSection';
import ProjectActions from './ProjectActions';

import './ProjectDetails.scss';

const ProjectDetails: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const displayName = getDisplayNameFromK8sResource(currentProject);
  const description = getDescriptionFromK8sResource(currentProject);
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  const projectSharingEnabled = useIsAreaAvailable(SupportedArea.DS_PROJECTS_PERMISSIONS).status;
  const pipelinesEnabled = useIsAreaAvailable(SupportedArea.DS_PIPELINES).status;
  const deploymentsTab = useDeploymentsTab();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = searchParams.get('section');

  const [allowCreate, rbacLoaded] = useProjectPermissionsTabVisible(currentProject.metadata.name);

  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;

  useCheckLogoutParams();

  const { isKueueDisabled } = useKueueConfiguration(currentProject);

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
          <BreadcrumbItem render={() => <Link to="/projects">Projects</Link>} />
          <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
            <Truncate content={displayName} />
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={rbacLoaded}
      empty={false}
      headerAction={<ProjectActions project={currentProject} />}
    >
      {isKueueDisabled && !isKueueAlertDismissed && (
        <Flex direction={{ default: 'column' }} className="pf-v6-u-px-lg">
          <Alert
            data-testid="kueue-disabled-alert-project-details"
            variant="info"
            isInline
            title="Kueue is disabled in this cluster"
            isExpandable
            actionClose={<AlertActionCloseButton onClose={handleKueueAlertClose} />}
          >
            <p>
              This project uses local queue for workload allocation, which relies on Kueue. To
              deploy a model or create a workbench in this project, ask your administrator to enable
              Kueue or change this project&apos;s workload allocation strategy.
            </p>
            <Popover
              position="bottom"
              headerContent="Who's my administrator?"
              bodyContent={
                <div>
                  Your administrator might be:
                  <List>
                    <ListItem>
                      The person who assigned you your username, or who helped you log in for the
                      first time
                    </ListItem>
                    <ListItem>Someone in your IT department or help desk</ListItem>
                    <ListItem>A project manager or developer</ListItem>
                    <ListItem>Your professor (at a school)</ListItem>
                  </List>
                </div>
              }
            >
              <Button variant="link" icon={<OutlinedQuestionCircleIcon />} aria-label="More info">
                Who&apos;s my administrator?
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
            ...deploymentsTab,
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
            {
              id: ProjectSectionID.FEATURE_STORE,
              title: 'Feature store integration',
              component: <FeatureStoreIntegration />,
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
            deploymentsTab,
          ],
        )}
      />
    </ApplicationsPage>
  );
};

export default ProjectDetails;
