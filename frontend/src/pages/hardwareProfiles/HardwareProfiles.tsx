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
import ApplicationsPage from '#~/pages/ApplicationsPage';
import HardwareProfilesTable from '#~/pages/hardwareProfiles/HardwareProfilesTable';
import { useAccessAllowed, verbModelAccess } from '#~/concepts/userSSAR';
import { HardwareProfileModel } from '#~/api';
import { generateWarningForHardwareProfiles } from '#~/pages/hardwareProfiles/utils';
import { useWatchHardwareProfiles } from '#~/utilities/useWatchHardwareProfiles';
import { useDashboardNamespace } from '#~/redux/selectors';
import { ProjectObjectType } from '#~/concepts/design/utils';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import useMigratedHardwareProfiles from './migration/useMigratedHardwareProfiles';

const description =
  'Manage hardware profiles for your organization. Administrators can use hardware profiles to determine resource allocation strategies for specific workloads or to explicitly define hardware configurations for users.';

const HardwareProfiles: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const {
    data: migratedHardwareProfiles,
    loaded: loadedMigratedHardwareProfiles,
    loadError: loadErrorMigratedHardwareProfiles,
    getMigrationAction,
  } = useMigratedHardwareProfiles(dashboardNamespace);
  const [hardwareProfiles, loadedHardwareProfiles, loadErrorHardwareProfiles] =
    useWatchHardwareProfiles(dashboardNamespace);

  const allMigratedHardwareProfiles = React.useMemo(
    () => [...migratedHardwareProfiles, ...hardwareProfiles],
    [migratedHardwareProfiles, hardwareProfiles],
  );

  const loaded = loadedMigratedHardwareProfiles && loadedHardwareProfiles;
  const loadError = loadErrorMigratedHardwareProfiles || loadErrorHardwareProfiles;

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
          data-testid="empty-state-hardware-profiles"
          icon={PlusCircleIcon}
        >
          <Title data-testid="no-available-hardware-profiles" headingLevel="h5" size="lg">
            No hardware profiles
          </Title>
          <EmptyStateBody>
            To get started, contact your cluster administrator to learn about hardware availability
            in your cluster, then create corresponding hardware profiles.
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
        <EmptyState
          variant={EmptyStateVariant.full}
          data-id="empty-empty-state"
          icon={BanIcon}
          data-testid="empty-state-hardware-profiles"
        >
          <Title data-testid="no-available-hardware-profiles" headingLevel="h5" size="lg">
            No hardware profiles
          </Title>
          <EmptyStateBody>
            To get started, contact your cluster administrator to learn about hardware availability
            in your cluster and to set up corresponding hardware profiles.
          </EmptyStateBody>
        </EmptyState>
      )}
    </PageSection>
  );
 
  return (
    <ApplicationsPage
      title={
        <TitleWithIcon
          title="Hardware profiles"
          objectType={ProjectObjectType.acceleratorProfile}
        />
      }
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
          <StackItem>
            <Alert
              isInline
              variant="warning"
              title={warningMessages.title}
              data-testid="hardware-profiles-error-alert"
            >
              <p>{warningMessages.message}</p>
            </Alert>
          </StackItem>
        )}
        <StackItem>
          {hardwareProfiles.length > 0 ? (
            <HardwareProfilesTable hardwareProfiles={hardwareProfiles} />
          ) : (
            noHardwareProfilePageSection
          )}
        </StackItem>

        {migratedHardwareProfiles.length > 0 && (
          <>
            <StackItem>
              <Title headingLevel="h2">Migrate your legacy profiles</Title>
            </StackItem>
            <StackItem>
              Your accelerator profiles and existing custom workbench and model deployment container
              sizes have been converted to legacy profiles. Migrate them to hardware profiles, which
              offer more flexibility. Deployed workloads using legacy profiles will be unaffected by
              the migration.
            </StackItem>
            <StackItem>
              <ExpandableSection
                data-testid="migrated-hardware-profiles-section"
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
