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
  Label,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { Link, useSearchParams } from 'react-router-dom';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { isProjectDetailsSettingsCardExtension } from '@odh-dashboard/plugin-core/extension-points';
import { ResourceNameTooltip } from '@odh-dashboard/ui-core';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useDeploymentsTab } from '#~/concepts/projects/projectDetails/useDeploymentsTab';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import GenericHorizontalBar from '#~/pages/projects/components/GenericHorizontalBar';
import ProjectSharing from '#~/pages/projects/projectSharing/ProjectSharing';
import ProjectPermissions from '#~/pages/projects/projectPermissions/ProjectPermissions';
import ProjectRoles from '#~/pages/projects/projectRoles/ProjectRoles';
import ProjectSettingsPage from '#~/pages/projects/projectSettings/ProjectSettingsPage';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
} from '#~/concepts/k8s/utils';
import HeaderIcon from '#~/concepts/design/HeaderIcon';
import {
  useProjectPermissionsTabVisible,
  useProjectRolesTabVisible,
} from '#~/concepts/projects/accessChecks';
import { useKueueConfiguration } from '#~/concepts/hardwareProfiles/kueueUtils';
import { PermissionsContextProvider } from '#~/concepts/permissions/PermissionsContext';
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
  const projectRBACEnabled = useIsAreaAvailable(SupportedArea.PROJECT_RBAC_SETTINGS).status;
  const roleManagementEnabled = useIsAreaAvailable(SupportedArea.ROLE_MANAGEMENT).status;
  const settingsCardExtensions = useExtensions(isProjectDetailsSettingsCardExtension);
  const hasSettingsCards = settingsCardExtensions.length > 0 || biasMetricsAreaAvailable; // Bias metrics is not yet an extension
  const deploymentsTab = useDeploymentsTab();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = searchParams.get('section');

  const [allowCreate, rbacLoaded] = useProjectPermissionsTabVisible(currentProject.metadata.name);
  const [allowRoles, rolesRbacLoaded] = useProjectRolesTabVisible(
    currentProject.metadata.name,
    roleManagementEnabled,
  );

  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;

  useCheckLogoutParams();

  const { isKueueDisabled, isProjectKueueEnabled, isKueueFeatureEnabled } =
    useKueueConfiguration(currentProject);

  const isKueueManaged = isProjectKueueEnabled && isKueueFeatureEnabled;

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
      loaded={rbacLoaded && (!roleManagementEnabled || rolesRbacLoaded)}
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
      {isKueueManaged && !isKueueAlertDismissed && (
        <Flex direction={{ default: 'column' }} className="pf-v6-u-px-lg">
          <Alert
            data-testid="kueue-managed-alert-project-details"
            variant="info"
            isInline
            title="This project uses Kueue for workload scheduling"
            actionClose={
              <AlertActionCloseButton
                data-testid="kueue-managed-alert-close"
                onClose={handleKueueAlertClose}
              />
            }
          />
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
            ...(roleManagementEnabled && allowRoles
              ? [
                  {
                    id: ProjectSectionID.ROLES,
                    title: 'Roles',
                    label: (
                      <Label isCompact color="yellow" variant="outline">
                        Dev preview
                      </Label>
                    ),
                    component: (
                      <PermissionsContextProvider namespace={currentProject.metadata.name}>
                        <ProjectRoles />
                      </PermissionsContextProvider>
                    ),
                  },
                ]
              : []),
            ...(projectSharingEnabled && allowCreate
              ? [
                  {
                    id: ProjectSectionID.PERMISSIONS,
                    title: 'Permissions',
                    component: projectRBACEnabled ? (
                      <PermissionsContextProvider namespace={currentProject.metadata.name}>
                        <ProjectPermissions />
                      </PermissionsContextProvider>
                    ) : (
                      <ProjectSharing />
                    ),
                  },
                ]
              : []),
            ...(hasSettingsCards
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
            workbenchEnabled,
            pipelinesEnabled,
            deploymentsTab,
            projectSharingEnabled,
            allowCreate,
            projectRBACEnabled,
            roleManagementEnabled,
            allowRoles,
            currentProject.metadata.name,
            hasSettingsCards,
          ],
        )}
      />
    </ApplicationsPage>
  );
};

export default ProjectDetails;
