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
import { AcceleratorKind } from '~/k8sTypes';
import {
  createAcceleratorProfile,
  updateAcceleratorProfile,
} from '~/services/acceleratorProfileService';

type ManageAcceleratorProfileFooterProps = {
  state: AcceleratorKind['spec'];
  existingAccelerator?: AcceleratorKind;
};

export const ManageAcceleratorProfileFooter = ({
  state,
  existingAccelerator,
}: ManageAcceleratorProfileFooterProps) => {
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const navigate = useNavigate();

  const isButtonDisabled = !state.displayName || !state.identifier;

  const onCreateAcceleratorProfile = async () => {
    setIsLoading(true);
    createAcceleratorProfile(state)
      .then((res) => {
        if (res.success) {
          navigate(`/acceleratorProfiles`);
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
    if (existingAccelerator) {
      setIsLoading(true);
      updateAcceleratorProfile(existingAccelerator.metadata.name, state)
        .then((res) => {
          if (res.success) {
            navigate(`/acceleratorProfiles`);
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
            title={`Error ${existingAccelerator ? 'updating' : 'creating'} accelerator profile`}
          >
            {errorMessage}
          </Alert>
        </StackItem>
      )}
      <StackItem>
        <ActionList>
          <ActionListItem>
            <Button
              isDisabled={isButtonDisabled || isLoading}
              isLoading={isLoading}
              variant="primary"
              id="create-button"
              onClick={
                existingAccelerator ? onUpdateAcceleratorProfile : onCreateAcceleratorProfile
              }
              data-testid="accelerator-profile-create-button"
            >
              {existingAccelerator ? 'Update' : 'Create'} accelerator profile
            </Button>
          </ActionListItem>
          <ActionListItem>
            <Button
              variant="link"
              id="cancel-button"
              onClick={() => navigate(`/acceleratorProfiles`)}
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
