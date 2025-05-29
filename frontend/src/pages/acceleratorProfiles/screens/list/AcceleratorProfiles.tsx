import * as React from 'react';
import {
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  PageSection,
  EmptyStateActions,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import useAcceleratorProfiles from '#~/pages/notebookController/screens/server/useAcceleratorProfiles';
import { useDashboardNamespace } from '#~/redux/selectors';
import AcceleratorProfilesTable from '#~/pages/acceleratorProfiles/screens/list/AcceleratorProfilesTable';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';

const description = `Manage accelerator profile settings for users in your organization`;

const AcceleratorProfiles: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [acceleratorProfiles, loaded, loadError, refresh] =
    useAcceleratorProfiles(dashboardNamespace);

  const navigate = useNavigate();

  const isEmpty = acceleratorProfiles.length === 0;

  const noAcceleratorProfilePageSection = (
    <PageSection hasBodyWrapper={false} isFilled>
      <EmptyState
        headingLevel="h5"
        titleText={
          <span data-testid="no-available-accelerator-profiles">
            No available accelerator profiles yet
          </span>
        }
        icon={PlusCircleIcon}
        variant={EmptyStateVariant.full}
        data-id="empty-empty-state"
      >
        <EmptyStateBody>
          You don&apos;t have any accelerator profiles yet. To get started, please ask your cluster
          administrator about the accelerator availability in your cluster and create corresponding
          profiles in OpenShift Data Science.
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button
              data-testid="display-accelerator-modal-button"
              variant={ButtonVariant.primary}
              onClick={() => navigate('/acceleratorProfiles/create')}
            >
              Add new accelerator profile
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </PageSection>
  );

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon
          title="Accelerator profiles"
          objectType={ProjectObjectType.acceleratorProfile}
        />
      }
      description={description}
      loaded={loaded}
      empty={isEmpty}
      loadError={loadError}
      errorMessage="Unable to load accelerator profiles."
      emptyStatePage={noAcceleratorProfilePageSection}
      provideChildrenPadding
    >
      <AcceleratorProfilesTable
        acceleratorProfiles={acceleratorProfiles}
        refreshAcceleratorProfiles={refresh}
      />
    </ApplicationsPage>
  );
};

export default AcceleratorProfiles;
