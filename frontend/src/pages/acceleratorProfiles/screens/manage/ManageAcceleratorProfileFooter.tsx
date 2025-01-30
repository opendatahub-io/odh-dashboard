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
import { AcceleratorProfileKind } from '~/k8sTypes';
import {
  createAcceleratorProfile,
  updateAcceleratorProfile,
} from '~/services/acceleratorProfileService';
import { AcceleratorProfileFormData } from '~/pages/acceleratorProfiles/screens/manage/types';
import useNotification from '~/utilities/useNotification';

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

  const onCreateAcceleratorProfile = async () => {
    setIsLoading(true);
    createAcceleratorProfile(state)
      .then((res) => {
        if (res.success) {
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
        } else {
          setErrorMessage(res.error || 'Could not create accelerator profile');
        }
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
      updateAcceleratorProfile(existingAcceleratorProfile.metadata.name, state)
        .then((res) => {
          if (res.success) {
            navigate(redirectPath);
          } else {
            setErrorMessage(res.error || 'Could not update accelerator profile');
          }
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
