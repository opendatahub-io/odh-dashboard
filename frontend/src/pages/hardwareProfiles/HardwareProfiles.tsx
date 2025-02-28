import * as React from 'react';
import {
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  PageSection,
  Title,
  EmptyStateActions,
  EmptyStateFooter,
  Alert,
  Stack,
  StackItem,
  ExpandableSection,
} from '@patternfly/react-core';
import { BanIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import HardwareProfilesTable from '~/pages/hardwareProfiles/HardwareProfilesTable';
import { useAccessAllowed, verbModelAccess } from '~/concepts/userSSAR';
import { HardwareProfileModel } from '~/api';
import { generateWarningForHardwareProfiles } from '~/pages/hardwareProfiles/utils';
import { useWatchHardwareProfiles } from '~/utilities/useWatchHardwareProfiles';
import { useDashboardNamespace } from '~/redux/selectors';
import useMigratedHardwareProfiles from './migration/useMigratedHardwareProfiles';

const description = `Manage hardware profile settings for users in your organization.`;

const HardwareProfiles: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const {
    data: allMigratedHardwareProfiles,
    migratedHardwareProfiles,
    loaded,
    loadError,
    getMigrationAction,
  } = useMigratedHardwareProfiles();
  const [hardwareProfiles] = useWatchHardwareProfiles(dashboardNamespace);
  const navigate = useNavigate();
  const [allowedToCreate, loadedAllowed] = useAccessAllowed(
    verbModelAccess('create', HardwareProfileModel),
  );

  const isEmpty = allMigratedHardwareProfiles.length === 0;
  const warningMessages = generateWarningForHardwareProfiles(allMigratedHardwareProfiles);

  const noHardwareProfilePageSection = (
    <PageSection isFilled>
      {allowedToCreate ? (
        <EmptyState
          variant={EmptyStateVariant.full}
          data-id="empty-empty-state"
          icon={PlusCircleIcon}
        >
          <Title data-testid="no-available-hardware-profiles" headingLevel="h5" size="lg">
            No available hardware profiles yet
          </Title>
          <EmptyStateBody>
            You don&apos;t have any hardware profiles yet. To get started, please ask your cluster
            administrator about the hardware availability in your cluster and create corresponding
            profiles in {ODH_PRODUCT_NAME}.
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button
                data-testid="display-hardware-modal-button"
                variant={ButtonVariant.primary}
                onClick={() => navigate('/hardwareProfiles/create')}
              >
                Add new hardware profile
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      ) : (
        <EmptyState variant={EmptyStateVariant.full} data-id="empty-empty-state" icon={BanIcon}>
          <Title data-testid="no-available-hardware-profiles" headingLevel="h5" size="lg">
            No available hardware profiles
          </Title>
          <EmptyStateBody>
            You don&apos;t have any hardware profiles yet. To get started, please ask your cluster
            administrator about the hardware availability in your cluster and to set up
            corresponding profiles in {ODH_PRODUCT_NAME}.
          </EmptyStateBody>
        </EmptyState>
      )}
    </PageSection>
  );

  return (
    <ApplicationsPage
      title="Hardware profiles"
      description={description}
      loaded={loaded && loadedAllowed}
      empty={isEmpty}
      loadError={loadError}
      errorMessage="Unable to load hardware profiles."
      emptyStatePage={noHardwareProfilePageSection}
      provideChildrenPadding
    >
      <Stack hasGutter>
        {warningMessages && (
          <Alert
            isInline
            variant="warning"
            title={warningMessages.title}
            data-testid="hardware-profiles-error-alert"
          >
            <p>{warningMessages.message}</p>
          </Alert>
        )}
        {/* <StackItem>
          <Title headingLevel="h2">Created profiles</Title>
        </StackItem> */}
        <StackItem>
          Profiles created by {ODH_PRODUCT_NAME} administrators to target workbench, model
          deployment and pipeline workloads to hardware nodes.
        </StackItem>
        <StackItem>
          <HardwareProfilesTable
            hardwareProfiles={hardwareProfiles}
            getMigrationAction={getMigrationAction}
          />
        </StackItem>
        {migratedHardwareProfiles && migratedHardwareProfiles.length > 0 && (
          <>
            <StackItem>
              <Title headingLevel="h2">Legacy profiles</Title>
            </StackItem>
            <StackItem>
              Profiles created by the system from existing accelerator profiles in the ODH dashboard
              config or existing custom workbench container sizes. These profiles cannot be applied
              to new workbenches, model deployments or pipeline workloads. Migrating this profile
              converts it to a Created profile and deletes its existing Kubernetes resource.
              Deployed workloads using legacy profiles will be unaffected by the migration.
            </StackItem>
            <StackItem>
              <ExpandableSection
                toggleTextExpanded={`Hide legacy profiles (${migratedHardwareProfiles.length})`}
                toggleTextCollapsed={`Show legacy profiles (${migratedHardwareProfiles.length})`}
              >
                <HardwareProfilesTable
                  isMigratedTable
                  hardwareProfiles={migratedHardwareProfiles}
                  getMigrationAction={getMigrationAction}
                />
              </ExpandableSection>
            </StackItem>
          </>
        )}
      </Stack>
    </ApplicationsPage>
  );
};

export default HardwareProfiles;
