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
import { createHardwareProfile, updateHardwareProfile } from '~/api';
import { useDashboardNamespace } from '~/redux/selectors';
import useNotification from '~/utilities/useNotification';

type ManageHardwareProfileFooterProps = {
  state: HardwareProfileFormData;
  existingHardwareProfile?: HardwareProfileKind;
  validFormData: boolean;
  redirectPath: string;
};

const ManageHardwareProfileFooter: React.FC<ManageHardwareProfileFooterProps> = ({
  state,
  existingHardwareProfile,
  validFormData,
  redirectPath,
}) => {
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { dashboardNamespace } = useDashboardNamespace();
  const navigate = useNavigate();
  const notification = useNotification();

  const { name, ...spec } = state;

  const onCreateHardwareProfile = async () => {
    setIsLoading(true);
    createHardwareProfile(name, spec, dashboardNamespace)
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
      setIsLoading(true);
      updateHardwareProfile(spec, existingHardwareProfile, dashboardNamespace)
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
