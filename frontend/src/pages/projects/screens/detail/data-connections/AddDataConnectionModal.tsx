import * as React from 'react';
import { Alert, Button, Form, Modal, Stack, StackItem } from '@patternfly/react-core';
import AWSField from '../../../dataConnections/AWSField';
import { EnvVariableDataEntry } from '../../../types';
import { EMPTY_AWS_SECRET_DATA } from '../../../dataConnections/const';
import { isAWSValid } from '../../spawner/spawnerUtils';
import { assembleSecret, createSecret } from '../../../../../api';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';

type AddDataConnectionModalProps = {
  isOpen: boolean;
  onClose: (submitted: boolean) => void;
};

const AddDataConnectionModal: React.FC<AddDataConnectionModalProps> = ({ isOpen, onClose }) => {
  const [isProgress, setIsProgress] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [awsData, setAWSData] = React.useState<EnvVariableDataEntry[]>(EMPTY_AWS_SECRET_DATA);
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const projectName = currentProject.metadata.name;

  const canCreate = !isProgress && isAWSValid(awsData);

  const submit = () => {
    setErrorMessage('');
    setIsProgress(true);
    createSecret(
      assembleSecret(
        projectName,
        awsData.reduce<Record<string, string>>(
          (acc, { key, value }) => ({ ...acc, [key]: value }),
          {},
        ),
        'aws',
      ),
    )
      .then(() => {
        onBeforeClose(true);
      })
      .catch((e) => {
        setErrorMessage(e.message || 'An unknown error occurred');
      });
  };
  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setIsProgress(false);
    setAWSData(EMPTY_AWS_SECRET_DATA);
  };

  return (
    <Modal
      title="Add data connection"
      variant="medium"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      showClose
      actions={[
        <Button key="submit-dc" variant="primary" isDisabled={!canCreate} onClick={submit}>
          Add data connection
        </Button>,
        <Button key="cancel-dc" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
    >
      <Stack hasGutter>
        <StackItem>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <AWSField values={awsData} onUpdate={(data) => setAWSData(data)} />
          </Form>
        </StackItem>
        {errorMessage && (
          <StackItem>
            <Alert isInline variant="danger" title="Error creating data connection">
              {errorMessage}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};

export default AddDataConnectionModal;
