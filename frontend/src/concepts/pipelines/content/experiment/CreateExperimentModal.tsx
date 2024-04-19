import * as React from 'react';
import {
  Alert,
  Button,
  Form,
  FormGroup,
  Modal,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import useCreateExperimentData from '~/concepts/pipelines/content/experiment/useCreateExperimentData';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';

type CreateExperimentModalProps = {
  isOpen: boolean;
  onClose: (experiment?: ExperimentKFv2) => void;
};

const CreateExperimentModal: React.FC<CreateExperimentModalProps> = ({ isOpen, onClose }) => {
  const { project, api, apiAvailable } = usePipelinesAPI();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [{ name, description }, setData, resetData] = useCreateExperimentData();

  const haveEnoughData = !!name;

  const onBeforeClose = (experiment?: ExperimentKFv2) => {
    onClose(experiment);
    setSubmitting(false);
    setError(undefined);
    resetData();
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Create experiment"
      onClose={() => onBeforeClose()}
      actions={[
        <Button
          key="create-button"
          variant="primary"
          isDisabled={!apiAvailable || submitting || !haveEnoughData}
          onClick={() => {
            setSubmitting(true);
            setError(undefined);
            api
              // eslint-disable-next-line camelcase
              .createExperiment({}, { display_name: name, description })
              .then((experiment) => onBeforeClose(experiment))
              .catch((e) => {
                setSubmitting(false);
                setError(e);
              });
          }}
        >
          Create experiment
        </Button>,
        <Button key="cancel-button" variant="secondary" onClick={() => onBeforeClose()}>
          Cancel
        </Button>,
      ]}
      variant="small"
    >
      <Form>
        <Stack hasGutter>
          <StackItem>
            <FormGroup label="Project" fieldId="project-name">
              {getProjectDisplayName(project)}
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Experiment name" isRequired fieldId="experiment-name">
              <TextInput
                isRequired
                type="text"
                id="experiment-name"
                name="experiment-name"
                value={name}
                onChange={(e, value) => setData('name', value)}
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Description" fieldId="experiment-description">
              <TextInput
                isRequired
                type="text"
                id="experiment-description"
                name="experiment-description"
                value={description}
                onChange={(e, value) => setData('description', value)}
              />
            </FormGroup>
          </StackItem>
          {error && (
            <StackItem>
              <Alert title="Error creating experiment" isInline variant="danger">
                {error.message}
              </Alert>
            </StackItem>
          )}
        </Stack>
      </Form>
    </Modal>
  );
};

export default CreateExperimentModal;
