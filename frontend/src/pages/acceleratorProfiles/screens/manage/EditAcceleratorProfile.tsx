import * as React from 'react';
import { useParams } from 'react-router';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { useDashboardNamespace } from '~/redux/selectors';
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
        <EmptyState>
          <EmptyStateIcon icon={ExclamationCircleIcon} />
          <Title headingLevel="h4" size="lg">
            Problem loading accelerator profile
          </Title>
          <EmptyStateBody>{error.message}</EmptyStateBody>
          <Button variant="primary" onClick={() => navigate('/acceleratorProfiles')}>
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

  return <ManageAcceleratorProfile existingAccelerator={data} />;
};

export default EditAcceleratorProfile;
