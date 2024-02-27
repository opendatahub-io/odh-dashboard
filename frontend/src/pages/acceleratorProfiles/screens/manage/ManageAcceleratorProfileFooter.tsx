import {
  ActionList,
  ActionListItem,
  Alert,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import React from 'react';
import { useNavigate } from 'react-router';
import { AcceleratorProfileKind } from '~/k8sTypes';
import {
  createAcceleratorProfile,
  updateAcceleratorProfile,
} from '~/services/acceleratorProfileService';
import { fireTrackingEventRaw } from '~/utilities/segmentIOUtils';
import { TrackingOutcome } from '~/types';

type ManageAcceleratorProfileFooterProps = {
  state: AcceleratorProfileKind['spec'];
  existingAcceleratorProfile?: AcceleratorProfileKind;
};

export const ManageAcceleratorProfileFooter: React.FC<ManageAcceleratorProfileFooterProps> = ({
  state,
  existingAcceleratorProfile,
}) => {
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const navigate = useNavigate();

  const isButtonDisabled = !state.displayName || !state.identifier;

  const tr = (create: boolean, submitted: boolean, success?: boolean, properties?: any) => {
    fireTrackingEventRaw(`AcceleratorProfile ${create ? 'Edited' : 'Created'}`, {
      ...properties,
      outcome: submitted ? TrackingOutcome.submit : TrackingOutcome.cancel,
      success,
    });
  };

  const onCreateAcceleratorProfile = async () => {
    setIsLoading(true);
    createAcceleratorProfile(state)
      .then((res) => {
        if (res.success) {
          tr(true, true, true, {
            toleration: state.tolerations,
            enabled: state.enabled,
            identifier: state.identifier,
          });
          navigate(`/acceleratorProfiles`);
        } else {
          tr(true, true, false, {
            error: res.error || 'Could not create accelerator profile',
          });

          setErrorMessage(res.error || 'Could not create accelerator profile');
        }
      })
      .catch((err) => {
        tr(true, true, false, {
          error: err.message,
        });

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
            tr(false, true, true, {
              toleration: existingAcceleratorProfile.spec.tolerations,
              enabled: existingAcceleratorProfile.spec.enabled,
              identifier: existingAcceleratorProfile.spec.identifier,
            });

            navigate(`/acceleratorProfiles`);
          } else {
            tr(false, true, false, {
              error: res.error || 'Could not create accelerator profile',
            });
            setErrorMessage(res.error || 'Could not update accelerator profile');
          }
        })
        .catch((err) => {
          tr(false, true, false, {
            error: err.message,
          });

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
              isDisabled={isButtonDisabled || isLoading}
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
              onClick={() => {
                tr(!existingAcceleratorProfile, false);
                navigate(`/acceleratorProfiles`);
              }}
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
