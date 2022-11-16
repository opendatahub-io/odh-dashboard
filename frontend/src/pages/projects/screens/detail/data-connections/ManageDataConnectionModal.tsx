import * as React from 'react';
import * as _ from 'lodash';
import { Alert, Button, Form, Modal, Stack, StackItem } from '@patternfly/react-core';
import AWSField from '../../../dataConnections/AWSField';
import { DataConnection, EnvVariableDataEntry } from '../../../types';
import { EMPTY_AWS_SECRET_DATA } from '../../../dataConnections/const';
import { isAWSValid } from '../../spawner/spawnerUtils';
import { assembleSecret, createSecret, replaceSecret } from '../../../../../api';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import { convertAWSSecretData } from './utils';

type ManageDataConnectionModalProps = {
  existingData?: DataConnection;
  isOpen: boolean;
  onClose: (submitted: boolean) => void;
};

const ManageDataConnectionModal: React.FC<ManageDataConnectionModalProps> = ({
  isOpen,
  onClose,
  existingData,
}) => {
  const [isProgress, setIsProgress] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [awsData, setAWSData] = React.useState<EnvVariableDataEntry[]>(EMPTY_AWS_SECRET_DATA);
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const projectName = currentProject.metadata.name;

  const isDisabled =
    isProgress ||
    !isAWSValid(awsData) ||
    (existingData && _.isEqual(convertAWSSecretData(existingData), awsData));

  React.useEffect(() => {
    if (existingData) {
      setAWSData(convertAWSSecretData(existingData));
    } else {
      setAWSData(EMPTY_AWS_SECRET_DATA);
    }
  }, [existingData]);

  const submit = () => {
    setErrorMessage('');
    setIsProgress(true);

    const assembledSecret = assembleSecret(
      projectName,
      awsData.reduce<Record<string, string>>(
        (acc, { key, value }) => ({ ...acc, [key]: value }),
        {},
      ),
      'aws',
      existingData?.data.metadata.name,
    );

    const handleError = (e: Error) => {
      setErrorMessage(e.message || 'An unknown error occurred');
      setIsProgress(false);
    };

    if (existingData) {
      replaceSecret(assembledSecret)
        .then(() => onBeforeClose(true))
        .catch(handleError);
    } else {
      createSecret(assembledSecret)
        .then(() => {
          onBeforeClose(true);
        })
        .catch(handleError);
    }
  };

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setIsProgress(false);
  };

  return (
    <Modal
      title={existingData ? 'Edit data connection' : 'Add data connection'}
      variant="medium"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      showClose
      actions={[
        <Button key="submit-dc" variant="primary" isDisabled={isDisabled} onClick={submit}>
          {existingData ? 'Update' : 'Add'} data connection
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

export default ManageDataConnectionModal;
