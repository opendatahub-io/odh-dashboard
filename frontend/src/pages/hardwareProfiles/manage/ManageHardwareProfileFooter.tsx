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

type ManageHardwareProfileFooterProps = {
  state: HardwareProfileFormData;
  existingHardwareProfile?: HardwareProfileKind;
  validFormData: boolean;
};

const ManageHardwareProfileFooter: React.FC<ManageHardwareProfileFooterProps> = ({
  state,
  existingHardwareProfile,
  validFormData,
}) => {
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { dashboardNamespace } = useDashboardNamespace();
  const navigate = useNavigate();

  const { name, ...spec } = state;

  const onCreateHardwareProfile = async () => {
    setIsLoading(true);
    createHardwareProfile(name, spec, dashboardNamespace)
      .then(() => navigate('/hardwareProfiles'))
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
        .then(() => navigate(`/hardwareProfiles`))
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
              onClick={() => navigate(`/hardwareProfiles`)}
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
