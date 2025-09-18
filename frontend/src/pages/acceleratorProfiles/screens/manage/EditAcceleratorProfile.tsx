import * as React from 'react';
import { useParams } from 'react-router';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { useDashboardNamespace } from '#~/redux/selectors';
import useAcceleratorProfile from './useAcceleratorProfile';
import ManageAcceleratorProfile from './ManageAcceleratorProfile';

const EditAcceleratorProfile: React.FC = () => {
  const navigate = useNavigate();
  const { acceleratorProfileName } = useParams();
  const { dashboardNamespace } = useDashboardNamespace();
  const [data, , error] = useAcceleratorProfile(dashboardNamespace, acceleratorProfileName);

  if (error) {
    return (
      <Bullseye>
        <EmptyState
          titleText={
            <Title headingLevel="h4" size="lg" data-testid="problem-loading-accelerator-profile">
              Problem loading accelerator profile
            </Title>
          }
          icon={ExclamationCircleIcon}
        >
          <EmptyStateBody>{error.message}</EmptyStateBody>
          <Button
            data-testid="view-all-accelerator-profiles"
            variant="primary"
            onClick={() => navigate('/settings/environment-setup/accelerator-profiles')}
          >
            View all accelerator profiles
          </Button>
        </EmptyState>
      </Bullseye>
    );
  }

  if (!data) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return <ManageAcceleratorProfile existingAcceleratorProfile={data} />;
};

export default EditAcceleratorProfile;
