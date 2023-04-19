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
import useImportModalData from '~/concepts/pipelines/content/import/useImportModalData';
import { getProjectDisplayName } from '~/pages/projects/utils';
import PipelineFileUpload from '~/concepts/pipelines/content/import/PipelineFileUpload';

type PipelineImportModalProps = {
  isOpen: boolean;
  onClose: (imported: boolean) => void;
};

const PipelineImportModal: React.FC<PipelineImportModalProps> = ({ isOpen, onClose }) => {
  const { project, api, apiAvailable } = usePipelinesAPI();
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [{ name, description, fileContents }, setData, resetData] = useImportModalData();

  const haveEnoughData = !!name && !!fileContents;

  const onBeforeClose = (imported: boolean) => {
    onClose(imported);
    setImporting(false);
    resetData();
  };

  return (
    <Modal
      title="Import pipeline"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      actions={[
        <Button
          key="import-button"
          variant="primary"
          isDisabled={!apiAvailable || importing || !haveEnoughData}
          onClick={() => {
            setImporting(true);
            setError(undefined);
            api
              .uploadPipeline({}, name, description, fileContents)
              .then(() => onBeforeClose(true))
              .catch((e) => {
                setImporting(false);
                setError(e);
              });
          }}
        >
          Import pipeline
        </Button>,
        <Button key="cancel-button" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
      variant="medium"
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
                onChange={(value) => setData('name', value)}
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
                onChange={(value) => setData('description', value)}
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
