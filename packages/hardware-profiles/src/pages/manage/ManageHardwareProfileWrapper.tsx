import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, LockIcon } from '@patternfly/react-icons';
import type { HardwareProfileKind } from '@odh-dashboard/k8s-core';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors';
import ManageHardwareProfile from './ManageHardwareProfile';
import useHardwareProfile from '../useHardwareProfile';
import { isDRAHardwareProfile } from '../utils';
import {
  DRA_HARDWARE_PROFILE_DUPLICATE_DISABLED_MESSAGE,
  DRA_HARDWARE_PROFILE_EDIT_DISABLED_MESSAGE,
} from '../const';

type ManageHardwareProfileWrapperProps = {
  children: (data: HardwareProfileKind) => React.ReactNode;
};

const ManageHardwareProfileWrapper: React.FC<ManageHardwareProfileWrapperProps> = ({
  children,
}) => {
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
            component={(props: React.ComponentProps<'a'>) => (
              <Link {...props} to="/settings/environment-setup/hardware-profiles" />
            )}
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

type DRANotSupportedProps = {
  title: string;
  message: string;
};

const DRANotSupported: React.FC<DRANotSupportedProps> = ({ title, message }) => (
  <Bullseye>
    <EmptyState
      titleText={
        <Title headingLevel="h4" size="lg" data-testid="dra-hardware-profile-not-editable">
          {title}
        </Title>
      }
      icon={LockIcon}
    >
      <EmptyStateBody>{message}</EmptyStateBody>
      <Button
        data-testid="view-all-hardware-profiles"
        variant="primary"
        className="pf-v6-u-mt-md"
        component={(props: React.ComponentProps<'a'>) => (
          <Link {...props} to="/settings/environment-setup/hardware-profiles" />
        )}
      >
        View all hardware profiles
      </Button>
    </EmptyState>
  </Bullseye>
);

export const EditHardwareProfile: React.FC = () => (
  <ManageHardwareProfileWrapper>
    {(data) =>
      isDRAHardwareProfile(data) ? (
        <DRANotSupported
          title="This hardware profile cannot be edited"
          message={DRA_HARDWARE_PROFILE_EDIT_DISABLED_MESSAGE}
        />
      ) : (
        <ManageHardwareProfile existingHardwareProfile={data} />
      )
    }
  </ManageHardwareProfileWrapper>
);

export const DuplicateHardwareProfile: React.FC = () => (
  <ManageHardwareProfileWrapper>
    {(data) =>
      isDRAHardwareProfile(data) ? (
        <DRANotSupported
          title="This hardware profile cannot be duplicated"
          message={DRA_HARDWARE_PROFILE_DUPLICATE_DISABLED_MESSAGE}
        />
      ) : (
        <ManageHardwareProfile duplicatedHardwareProfile={data} />
      )
    }
  </ManageHardwareProfileWrapper>
);
