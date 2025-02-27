import {
  Stack,
  StackItem,
  Alert,
  ActionList,
  ActionListItem,
  Button,
  List,
  ListItem,
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
import useNotification from '~/utilities/useNotification';
import { MigrationAction, MigrationSourceType } from '~/pages/hardwareProfiles/migration/types';
import { MIGRATION_SOURCE_TYPE_LABELS } from '~/pages/hardwareProfiles/migration/MigrationTooltip';
import { useDashboardNamespace } from '~/redux/selectors';

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

  const { name, useCases, ...spec } = state;

  const onCreateHardwareProfile = async () => {
    setIsLoading(true);
    createHardwareProfile(name, spec, dashboardNamespace, useCases)
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
              useCases,
              {
                dryRun,
              },
            ),
          );
        } else {
          promises.push(
            updateHardwareProfile(spec, existingHardwareProfile, dashboardNamespace, useCases, {
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
            isExpandable
            isInline
            variant="warning"
            title="Updating this profile will trigger migration"
          >
            You are editing a simulated hardware profile,{' '}
            <strong>{migrationAction.source.label}</strong>, that was created from{' '}
            {MIGRATION_SOURCE_TYPE_LABELS[migrationAction.source.type]}.
            <br />
            <br />
            The following changes will occur:
            <List>
              {migrationAction.targetProfiles.length > 1 ? (
                <ListItem>
                  Multiple simulated hardware profiles depend on this resource. The following
                  hardware profile resources will be created:{' '}
                  <strong>
                    {migrationAction.targetProfiles
                      .map((profile) => profile.metadata.name)
                      .join(', ')}
                  </strong>
                </ListItem>
              ) : (
                <ListItem>
                  A hardware profile resource,{' '}
                  <strong>{migrationAction.targetProfiles[0].metadata.name}</strong>, will be
                  created
                </ListItem>
              )}
              <ListItem>
                The source{' '}
                {migrationAction.source.type === MigrationSourceType.ACCELERATOR_PROFILE
                  ? 'accelerator profile'
                  : migrationAction.source.type === MigrationSourceType.SERVING_CONTAINER_SIZE
                  ? 'model serving container size'
                  : 'notebook container size'}{' '}
                will be deleted
              </ListItem>
            </List>
            <br />
            Deployed workloads using this simulated profile will be unaffected by the migration.
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
              {existingHardwareProfile
                ? 'Update'
                : migrationAction
                ? 'Update and migrate'
                : 'Create'}
              hardware profile
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
