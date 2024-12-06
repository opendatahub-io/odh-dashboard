import * as React from 'react';
import {
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateIcon,
  EmptyStateVariant,
  EmptyStateBody,
  PageSection,
  Title,
  EmptyStateActions,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useDashboardNamespace } from '~/redux/selectors';
import useHardwareProfiles from './useHardwareProfiles';

const description = `Manage hardware profile settings for users in your organization`;

const HardwareProfiles: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [hardwareProfiles, loaded, loadError] = useHardwareProfiles(dashboardNamespace);

  const isEmpty = hardwareProfiles.length === 0;

  const noHardwareProfilePageSection = (
    <PageSection isFilled>
      <EmptyState variant={EmptyStateVariant.full} data-id="empty-empty-state">
        <EmptyStateIcon icon={PlusCircleIcon} />
        <Title data-testid="no-available-hardware-profiles" headingLevel="h5" size="lg">
          No available hardware profiles yet
        </Title>
        <EmptyStateBody>
          You don&apos;t have any hardware profiles yet. To get started, please ask your cluster
          administrator about the hardware availability in your cluster and create corresponding
          profiles in OpenShift Data Science.
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button
              data-testid="display-hardware-modal-button"
              variant={ButtonVariant.primary}
              onClick={() => {
                /* Todo: Create hardware profile */
              }}
            >
              Add new hardware profile
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </PageSection>
  );

  return (
    <ApplicationsPage
      title="Hardware profiles"
      description={description}
      loaded={loaded}
      empty={isEmpty}
      loadError={loadError}
      errorMessage="Unable to load hardware profiles."
      emptyStatePage={noHardwareProfilePageSection}
      provideChildrenPadding
    >
      {/* Todo: Create hardware table */}
    </ApplicationsPage>
  );
};

export default HardwareProfiles;
