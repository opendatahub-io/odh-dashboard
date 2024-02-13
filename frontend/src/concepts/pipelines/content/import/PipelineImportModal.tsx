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
import { usePipelineImportModalData } from '~/concepts/pipelines/content/import/useImportModalData';
import { getProjectDisplayName } from '~/pages/projects/utils';
import PipelineFileUpload from '~/concepts/pipelines/content/import/PipelineFileUpload';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';

type PipelineImportModalProps = {
  isOpen: boolean;
  onClose: (pipeline?: PipelineKF) => void;
};

const PipelineImportModal: React.FC<PipelineImportModalProps> = ({ isOpen, onClose }) => {
  const { project, api, apiAvailable } = usePipelinesAPI();
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [{ name, description, fileContents }, setData, resetData] = usePipelineImportModalData();

  const isImportButtonDisabled = !apiAvailable || importing || !name || !fileContents;

  const onBeforeClose = (pipeline?: PipelineKF) => {
    onClose(pipeline);
    setImporting(false);
    setError(undefined);
    resetData();
  };

  return (
    <Modal
      title="Import pipeline"
      isOpen={isOpen}
      onClose={() => onBeforeClose()}
      actions={[
        <Button
          key="import-button"
          variant="primary"
          isDisabled={isImportButtonDisabled}
          isLoading={importing}
          onClick={() => {
            setImporting(true);
            setError(undefined);
            api
              .uploadPipeline({}, name, description, fileContents)
              .then((pipeline) => onBeforeClose(pipeline))
              .catch((e) => {
                setImporting(false);
                setError(e);
              });
          }}
        >
          Import pipeline
        </Button>,
        <Button key="cancel-button" variant="secondary" onClick={() => onBeforeClose()}>
          Cancel
        </Button>,
      ]}
      variant="medium"
      data-testid="import-pipeline-modal"
    >
      <Form>
        <Stack hasGutter>
          <StackItem>
            <FormGroup label="Project" fieldId="project-name">
              {getProjectDisplayName(project)}
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Pipeline name" isRequired fieldId="pipeline-name">
              <TextInput
                isRequired
                type="text"
                id="pipeline-name"
                name="pipeline-name"
                value={name}
                onChange={(e, value) => setData('name', value)}
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Pipeline description" fieldId="pipeline-description">
              <TextInput
                isRequired
                type="text"
                id="pipeline-description"
                name="pipeline-description"
                value={description}
                onChange={(e, value) => setData('description', value)}
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <PipelineFileUpload
              fileContents={fileContents}
              onUpload={(data) => setData('fileContents', data)}
            />
          </StackItem>
          {error && (
            <StackItem>
              <Alert title="Error creating pipeline" isInline variant="danger">
                {error.message}
              </Alert>
            </StackItem>
          )}
        </Stack>
      </Form>
    </Modal>
  );
};

export default PipelineImportModal;
