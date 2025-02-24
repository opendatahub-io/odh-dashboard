import {
  Stack,
  StackItem,
  Alert,
  ActionList,
  ActionListItem,
  Button,
} from '@patternfly/react-core';
import React from 'react';
import { useNavigate } from 'react-router';
import { HardwareProfileKind } from '~/k8sTypes';
import { HardwareProfileFormData } from '~/pages/hardwareProfiles/manage/types';
import {
  createHardwareProfile,
  createHardwareProfileFromResource,
  updateHardwareProfile,
} from '~/api';
import { useDashboardNamespace } from '~/redux/selectors';
import useNotification from '~/utilities/useNotification';
import { MigrationAction } from '~/pages/hardwareProfiles/migration/types';
import { MIGRATION_SOURCE_TYPE_LABELS } from '~/pages/hardwareProfiles/migration/MigrationTooltip';

type ManageHardwareProfileFooterProps = {
  state: HardwareProfileFormData;
  existingHardwareProfile?: HardwareProfileKind;
  validFormData: boolean;
  redirectPath: string;
  migrationAction?: MigrationAction;
};

const ManageHardwareProfileFooter: React.FC<ManageHardwareProfileFooterProps> = ({
  state,
  existingHardwareProfile,
  validFormData,
  redirectPath,
  migrationAction,
}) => {
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { dashboardNamespace } = useDashboardNamespace();
  const navigate = useNavigate();
  const notification = useNotification();

  const { name, visibility, ...spec } = state;

  const onCreateHardwareProfile = async () => {
    setIsLoading(true);
    createHardwareProfile(name, spec, dashboardNamespace, visibility)
      .then(() => {
        if (redirectPath !== '/hardwareProfiles') {
          notification.success(
            'Hardware profile has been created.',
            <Stack hasGutter>
              <StackItem>
                A new hardware profile <strong>{state.displayName}</strong> has been created.
              </StackItem>
              <StackItem>
                <Button isInline variant="link" onClick={() => navigate(`/hardwareProfiles`)}>
                  View profile details
                </Button>
              </StackItem>
            </Stack>,
          );
        }
        navigate(redirectPath);
      })
      .catch((err) => {
        setErrorMessage(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const onUpdateHardwareProfile = async () => {
    if (existingHardwareProfile) {
      const getUpdatePromises = (dryRun: boolean) => {
        const promises = [];
        if (migrationAction) {
          promises.push(migrationAction.deleteSourceResource({ dryRun }));

          // check if there are other dependent hardware profiles
          const otherHardwareProfiles = migrationAction.targetProfiles.filter(
            (profile) => profile.metadata.name !== existingHardwareProfile.metadata.name,
          );
          promises.push(
            ...otherHardwareProfiles.map((profile) =>
              createHardwareProfileFromResource(profile, { dryRun }),
            ),
          );
          promises.push(
            createHardwareProfile(
              existingHardwareProfile.metadata.name,
              spec,
              dashboardNamespace,
              visibility,
              {
                dryRun,
              },
            ),
          );
        } else {
          promises.push(
            updateHardwareProfile(spec, existingHardwareProfile, dashboardNamespace, visibility, {
              dryRun,
            }),
          );
        }
        return promises;
      };

      setIsLoading(true);
      Promise.all(getUpdatePromises(true))
        .then(() => Promise.all(getUpdatePromises(false)))
        .then(() => navigate(redirectPath))
        .catch((err) => {
          setErrorMessage(err.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  };

  return (
    <Stack hasGutter>
      {migrationAction && (
        <StackItem>
          <Alert
            isInline
            variant="warning"
            title="Saving this hardware profile will trigger a migration"
          >
            You are editing a hardware profile that has been translated from a{' '}
            {MIGRATION_SOURCE_TYPE_LABELS[migrationAction.source.type]}. This action will create a
            new hardware profile and delete the source resource,{' '}
            <b>{migrationAction.source.label}</b>
            {migrationAction.targetProfiles.length > 1 && (
              <>
                <br />
                <br />
                Additionally, the following simulated hardware profiles dependent on the same source
                will be created:{' '}
                <b>
                  {migrationAction.targetProfiles
                    .filter(
                      (profile) => profile.metadata.name !== existingHardwareProfile?.metadata.name,
                    )
                    .map((profile) => profile.metadata.name)
                    .join(', ')}
                </b>
              </>
            )}
          </Alert>
        </StackItem>
      )}
      {errorMessage && (
        <StackItem>
          <Alert
            isInline
            variant="danger"
            title={`Error ${existingHardwareProfile ? 'updating' : 'creating'} hardware profile`}
          >
            {errorMessage}
          </Alert>
        </StackItem>
      )}
      <StackItem>
        <ActionList>
          <ActionListItem>
            <Button
              isDisabled={!validFormData || isLoading}
              isLoading={isLoading}
              variant="primary"
              id="create-button"
              onClick={existingHardwareProfile ? onUpdateHardwareProfile : onCreateHardwareProfile}
              data-testid="hardware-profile-create-button"
            >
              {existingHardwareProfile ? 'Update' : 'Create'} hardware profile
            </Button>
          </ActionListItem>
          <ActionListItem>
            <Button
              variant="link"
              id="cancel-button"
              onClick={() => navigate(redirectPath)}
              isDisabled={isLoading}
            >
              Cancel
            </Button>
          </ActionListItem>
        </ActionList>
      </StackItem>
    </Stack>
  );
};

export default ManageHardwareProfileFooter;
