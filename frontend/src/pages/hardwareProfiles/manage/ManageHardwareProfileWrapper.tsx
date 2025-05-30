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
import useMigratedHardwareProfiles from '#~/pages/hardwareProfiles/migration/useMigratedHardwareProfiles';
import { MigrationAction } from '#~/pages/hardwareProfiles/migration/types';

type ManageHardwareProfileWrapperProps = {
  children: (data: HardwareProfileKind, migrationAction?: MigrationAction) => React.ReactNode;
};

const ManageHardwareProfileWrapper: React.FC<ManageHardwareProfileWrapperProps> = ({
  children,
}) => {
  const navigate = useNavigate();
  const { hardwareProfileName } = useParams();
  const { dashboardNamespace } = useDashboardNamespace();
  const [data, , error] = useHardwareProfile(dashboardNamespace, hardwareProfileName);
  const {
    data: migratedHardwareProfiles,
    getMigrationAction,
    loaded: migratedProfilesLoaded,
    loadError: migratedProfilesError,
  } = useMigratedHardwareProfiles(dashboardNamespace);

  const migratedHardwareProfile = migratedHardwareProfiles.find(
    (profile) => profile.metadata.name === hardwareProfileName,
  );
  const migrationAction = migratedHardwareProfile
    ? getMigrationAction(migratedHardwareProfile.metadata.name)
    : undefined;

  if (!migratedProfilesLoaded && !migratedProfilesError) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  // Only show error if both regular profile failed and no migrated profile exists
  if (error && !migratedHardwareProfile) {
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
            onClick={() => navigate('/hardwareProfiles')}
          >
            View all hardware profiles
          </Button>
        </EmptyState>
      </Bullseye>
    );
  }

  // Use migrated profile if regular profile not found
  const profileData = data || migratedHardwareProfile;

  if (!profileData) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return children(profileData, migrationAction);
};

export const EditHardwareProfile: React.FC = () => (
  <ManageHardwareProfileWrapper>
    {(data, migrationAction) => (
      <ManageHardwareProfile existingHardwareProfile={data} migrationAction={migrationAction} />
    )}
  </ManageHardwareProfileWrapper>
);

export const DuplicateHardwareProfile: React.FC = () => (
  <ManageHardwareProfileWrapper>
    {(data) => <ManageHardwareProfile duplicatedHardwareProfile={data} />}
  </ManageHardwareProfileWrapper>
);
