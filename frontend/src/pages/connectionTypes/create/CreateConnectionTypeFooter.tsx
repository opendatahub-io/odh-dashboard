import * as React from 'react';
import { ActionList, ActionListItem, Button, Stack, StackItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { NameDescType } from '~/pages/projects/types';
import { createConnectionType } from '~/services/connectionTypesService';
import { ConnectionTypeField } from '~/concepts/connectionTypes/types';
import { translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import { createConnectionTypeObj } from '../../../concepts/connectionTypes/createConnectionTypeUtils';

type CreateConnectionTypeFooterProps = {
  nameDesc: NameDescType;
  enabled: boolean;
  fields: ConnectionTypeField[];
};

export const CreateConnectionTypeFooter: React.FC<CreateConnectionTypeFooterProps> = ({
  nameDesc,
  enabled,
  fields,
}) => {
  const navigate = useNavigate();

  const isValid = React.useMemo(() => Boolean(nameDesc.name), [nameDesc.name]);

  const onSave = async () => {
    if (isValid) {
      const connection = createConnectionTypeObj(
        {
          k8sName: translateDisplayNameForK8s(nameDesc.name),
          displayName: nameDesc.name,
          description: nameDesc.description,
          enabled,
          username: '',
        },
        fields,
      );
      try {
        await createConnectionType(connection);
        navigate('/connectionTypes');
      } catch (e) {
        alert(`Could not create connect type: ${e}`);
      }
    }
  };

  const onCancel = () => {
    navigate('/connectionTypes');
  };

  return (
    <Stack>
      <StackItem>
        <ActionList>
          <ActionListItem>
            <Button
              isDisabled={!isValid}
              variant="primary"
              data-testid="submit-button"
              id="create-button"
              onClick={onSave}
            >
              Create
            </Button>
          </ActionListItem>
          <ActionListItem>
            <Button variant="link" id="cancel-button" onClick={onCancel}>
              Cancel
            </Button>
          </ActionListItem>
        </ActionList>
      </StackItem>
    </Stack>
  );
};
