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
import useCreateExperimentData from '~/concepts/pipelines/content/experiment/useCreateExperimentData';
import { ExperimentKF } from '~/concepts/pipelines/kfTypes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import {
  NAME_CHARACTER_LIMIT,
  DESCRIPTION_CHARACTER_LIMIT,
} from '~/concepts/pipelines/content/const';
import { CharLimitHelperText } from '~/components/CharLimitHelperText';

type CreateExperimentModalProps = {
  onClose: (experiment?: ExperimentKF) => void;
};

const CreateExperimentModal: React.FC<CreateExperimentModalProps> = ({ onClose }) => {
  const { project, api, apiAvailable } = usePipelinesAPI();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [{ name, description }, setData, resetData] = useCreateExperimentData();

  const haveEnoughData = !!name;

  const onBeforeClose = (experiment?: ExperimentKF) => {
    onClose(experiment);
    setSubmitting(false);
    setError(undefined);
    resetData();
  };

  return (
    <Modal
      isOpen
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
              {getDisplayNameFromK8sResource(project)}
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
                onChange={(_, value) => setData('name', value)}
                maxLength={NAME_CHARACTER_LIMIT}
              />

              <CharLimitHelperText limit={NAME_CHARACTER_LIMIT} />
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
                onChange={(_, value) => setData('description', value)}
                maxLength={DESCRIPTION_CHARACTER_LIMIT}
              />

              <CharLimitHelperText limit={DESCRIPTION_CHARACTER_LIMIT} />
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
