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
} from '@patternfly/react-core';
import { BanIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useDashboardNamespace } from '~/redux/selectors';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import HardwareProfilesTable from '~/pages/hardwareProfiles/HardwareProfilesTable';
import { useAccessAllowed, verbModelAccess } from '~/concepts/userSSAR';
import { HardwareProfileModel } from '~/api';
import useHardwareProfiles from './useHardwareProfiles';

const description = `Manage hardware profile settings for users in your organization.`;

const HardwareProfiles: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [hardwareProfiles, loaded, loadError, refresh] = useHardwareProfiles(dashboardNamespace);
  const navigate = useNavigate();
  const [allowedToCreate, loadedAllowed] = useAccessAllowed(
    verbModelAccess('create', HardwareProfileModel),
  );

  const isEmpty = hardwareProfiles.length === 0;

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
      <HardwareProfilesTable
        hardwareProfiles={hardwareProfiles}
        refreshHardwareProfiles={refresh}
      />
    </ApplicationsPage>
  );
};

export default HardwareProfiles;
