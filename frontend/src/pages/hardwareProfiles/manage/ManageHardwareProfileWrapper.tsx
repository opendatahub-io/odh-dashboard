import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useDashboardNamespace } from '#~/redux/selectors';
import ManageHardwareProfile from '#~/pages/hardwareProfiles/manage/ManageHardwareProfile';
import useHardwareProfile from '#~/pages/hardwareProfiles/useHardwareProfile';
import { HardwareProfileKind } from '#~/k8sTypes';

type ManageHardwareProfileWrapperProps = {
  children: (data: HardwareProfileKind) => React.ReactNode;
};

const ManageHardwareProfileWrapper: React.FC<ManageHardwareProfileWrapperProps> = ({
  children,
}) => {
  const navigate = useNavigate();
  const { hardwareProfileName } = useParams();
  const { dashboardNamespace } = useDashboardNamespace();
  const [data, , error] = useHardwareProfile(dashboardNamespace, hardwareProfileName);

  if (error) {
    return (
      <Bullseye>
        <EmptyState
          titleText={
            <Title headingLevel="h4" size="lg" data-testid="problem-loading-hardware-profile">
              Problem loading hardware profile
            </Title>
          }
          icon={ExclamationCircleIcon}
        >
          <EmptyStateBody>{error.message}</EmptyStateBody>
          <Button
            data-testid="view-all-hardware-profiles"
            variant="primary"
            onClick={() => navigate('/settings/environment-setup/hardware-profiles')}
          >
            View all hardware profiles
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

  return children(data);
};

export const EditHardwareProfile: React.FC = () => (
  <ManageHardwareProfileWrapper>
    {(data) => <ManageHardwareProfile existingHardwareProfile={data} />}
  </ManageHardwareProfileWrapper>
);

export const DuplicateHardwareProfile: React.FC = () => (
  <ManageHardwareProfileWrapper>
    {(data) => <ManageHardwareProfile duplicatedHardwareProfile={data} />}
  </ManageHardwareProfileWrapper>
);
