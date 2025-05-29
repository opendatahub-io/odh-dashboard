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
import { createAcceleratorProfile, updateAcceleratorProfile } from '#~/api';
import { AcceleratorProfileKind } from '#~/k8sTypes';
import { AcceleratorProfileFormData } from '#~/pages/acceleratorProfiles/screens/manage/types';
import { useDashboardNamespace } from '#~/redux/selectors';
import useNotification from '#~/utilities/useNotification';

type ManageAcceleratorProfileFooterProps = {
  state: AcceleratorProfileFormData;
  existingAcceleratorProfile?: AcceleratorProfileKind;
  validFormData: boolean;
  redirectPath: string;
};

export const ManageAcceleratorProfileFooter: React.FC<ManageAcceleratorProfileFooterProps> = ({
  state,
  existingAcceleratorProfile,
  validFormData,
  redirectPath,
}) => {
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const navigate = useNavigate();
  const notification = useNotification();
  const { dashboardNamespace } = useDashboardNamespace();

  const onCreateAcceleratorProfile = async () => {
    setIsLoading(true);
    createAcceleratorProfile(state, dashboardNamespace)
      .then(() => {
        if (redirectPath !== '/acceleratorProfiles') {
          notification.success(
            'Accelerator profile has been created.',
            <Stack hasGutter>
              <StackItem>
                A new accelerator profile <strong>{state.displayName}</strong> has been created.
              </StackItem>
              <StackItem>
                <Button isInline variant="link" onClick={() => navigate(`/acceleratorProfiles`)}>
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

  const onUpdateAcceleratorProfile = async () => {
    if (existingAcceleratorProfile) {
      setIsLoading(true);
      updateAcceleratorProfile(existingAcceleratorProfile.metadata.name, dashboardNamespace, state)
        .then(() => {
          navigate(redirectPath);
        })
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
            title={`Error ${
              existingAcceleratorProfile ? 'updating' : 'creating'
            } accelerator profile`}
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
              onClick={
                existingAcceleratorProfile ? onUpdateAcceleratorProfile : onCreateAcceleratorProfile
              }
              data-testid="accelerator-profile-create-button"
            >
              {existingAcceleratorProfile ? 'Update' : 'Create'} accelerator profile
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
