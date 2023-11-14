import * as React from 'react';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  EmptyState,
  EmptyStateIcon,
  EmptyStateVariant,
  EmptyStateBody,
  PageSection,
  PageSectionVariants,
  Title,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useAccelerators from '~/pages/notebookController/screens/server/useAccelerators';
import { useDashboardNamespace } from '~/redux/selectors';

const description = `Manage accelerator profile settings for users in your organization`;

const AcceleratorProfiles: React.FC = () => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [accelerators, loaded, loadError] = useAccelerators(dashboardNamespace);

  const navigate = useNavigate();

  const isEmpty = !accelerators || accelerators.length === 0;

  const noAcceleratorProfilePageSection = (
    <PageSection isFilled>
      <EmptyState variant={EmptyStateVariant.full} data-id="empty-empty-state">
        <EmptyStateIcon icon={PlusCircleIcon} />
        <Title headingLevel="h5" size="lg">
          No available accelerator profiles yet
        </Title>
        <EmptyStateBody>
          You don&apos;t have any accelerator profiles yet. To get started, please ask your cluster
          administrator about the accelerator availability in your cluster and create corresponding
          profiles in Openshift Data Science.
        </EmptyStateBody>
        <Button
          data-id="display-accelerator-modal-button"
          variant={ButtonVariant.primary}
          onClick={() => navigate('/acceleratorProfiles/create')}
        >
          Add new accelerator profile
        </Button>
      </EmptyState>
    </PageSection>
  );

  return (
    <ApplicationsPage
      title="Accelerator profiles"
      description={description}
      loaded={loaded}
      empty={isEmpty}
      loadError={loadError}
      errorMessage="Unable to load accelerator profiles."
      emptyStatePage={noAcceleratorProfilePageSection}
    >
      <PageSection variant={PageSectionVariants.light} padding={{ default: 'noPadding' }}>
        <Flex direction={{ default: 'column' }}>
          <FlexItem>{/* Todo: Create accelerator table */}</FlexItem>
        </Flex>
      </PageSection>
    </ApplicationsPage>
  );
};

export default AcceleratorProfiles;
