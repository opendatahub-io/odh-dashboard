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
import { HardwareProfileKind } from '#~/k8sTypes';
import { HardwareProfileFormData } from '#~/pages/hardwareProfiles/manage/types';
import {
  createHardwareProfile,
  createHardwareProfileFromResource,
  updateHardwareProfile,
} from '#~/api';
import useNotification from '#~/utilities/useNotification';
import { MigrationAction, MigrationSourceType } from '#~/pages/hardwareProfiles/migration/types';
import { useDashboardNamespace } from '#~/redux/selectors';
import MigrationModal from '#~/pages/hardwareProfiles/migration/MigrationModal';
import { MIGRATION_SOURCE_TYPE_LABELS } from '#~/pages/hardwareProfiles/migration/const';

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
  const [migrationModalOpen, setMigrationModalOpen] = React.useState<boolean>(false);

  const { name, visibility: useCases, ...spec } = state;

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
          // delete source resource
          promises.push(migrationAction.deleteSourceResource({ dryRun }));

          // create dependent profiles
          promises.push(
            ...migrationAction.dependentProfiles.map((profile) =>
              createHardwareProfileFromResource(profile, { dryRun }),
            ),
          );

          // create new hardware profile
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
    <>
      <Stack hasGutter>
        {migrationAction && (
          <StackItem>
            <Alert
              isExpandable
              isInline
              variant="warning"
              data-testid="migration-alert"
              title="Updating this profile will trigger migration"
            >
              You are editing a legacy hardware profile that was created from the{' '}
              <strong>{migrationAction.source.label}</strong>{' '}
              {MIGRATION_SOURCE_TYPE_LABELS[migrationAction.source.type]}
              {migrationAction.source.type !== MigrationSourceType.ACCELERATOR_PROFILE
                ? ' in the ODH dashboard config.'
                : '.'}
              <br />
              <br />
              Migrating this profile creates a matching resource in Kubernetes, and deletes its
              source resource. Deployed workloads using this legacy profile will be unaffected by
              the migration.
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
                onClick={() => {
                  if (migrationAction) {
                    setMigrationModalOpen(true);
                  } else if (existingHardwareProfile) {
                    onUpdateHardwareProfile();
                  } else {
                    onCreateHardwareProfile();
                  }
                }}
                data-testid="hardware-profile-create-button"
              >
                {migrationAction ? 'Migrate ' : existingHardwareProfile ? 'Update ' : 'Create '}
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
      {migrationModalOpen && migrationAction && (
        <MigrationModal
          migrationAction={migrationAction}
          onClose={() => setMigrationModalOpen(false)}
          onMigrate={onUpdateHardwareProfile}
        />
      )}
    </>
  );
};

export default ManageHardwareProfileFooter;
