import * as React from 'react';
import {
  Alert,
  Button,
  Form,
  FormGroup,
  Modal,
  Stack,
  StackItem,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { usePipelineImportModalData } from '~/concepts/pipelines/content/import/useImportModalData';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';
import PipelineUploadRadio from './PipelineUploadRadio';
import { PipelineUploadOption } from './utils';

type PipelineImportModalProps = {
  isOpen: boolean;
  onClose: (pipeline?: PipelineKFv2) => void;
};

const PipelineImportModal: React.FC<PipelineImportModalProps> = ({ isOpen, onClose }) => {
  const { project, api, apiAvailable } = usePipelinesAPI();
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [{ name, description, fileContents, pipelineUrl, uploadOption }, setData, resetData] =
    usePipelineImportModalData();

  const isImportButtonDisabled =
    !apiAvailable ||
    importing ||
    !name ||
    (uploadOption === PipelineUploadOption.URL_IMPORT ? !pipelineUrl : !fileContents);

  const onBeforeClose = (pipeline?: PipelineKFv2) => {
    onClose(pipeline);
    setImporting(false);
    setError(undefined);
    resetData();
  };

  const onSubmit = () => {
    setImporting(true);
    setError(undefined);

    if (uploadOption === PipelineUploadOption.FILE_UPLOAD) {
      api
        .uploadPipeline({}, name, description, fileContents)
        .then((pipeline) => onBeforeClose(pipeline))
        .catch((e) => {
          setImporting(false);
          setError(e);
        });
    } else {
      api
        .createPipelineAndVersion(
          {},
          {
            pipeline: {
              /* eslint-disable camelcase */
              display_name: name,
              description,
            },
            pipeline_version: {
              display_name: name,
              description,
              package_url: {
                pipeline_url: pipelineUrl,
              },
              /* eslint-enable camelcase */
            },
          },
        )
        .then((pipeline) => onBeforeClose(pipeline))
        .catch((e) => {
          setImporting(false);
          setError(e);
        });
    }
  };

  return (
    <Modal
      title="Import pipeline"
      isOpen={isOpen}
      onClose={() => onBeforeClose()}
      actions={[
        <Button
          key="import-button"
          data-testid="import-button"
          variant="primary"
          isDisabled={isImportButtonDisabled}
          isLoading={importing}
          onClick={onSubmit}
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
                data-testid="pipeline-name"
                name="pipeline-name"
                value={name}
                onChange={(e, value) => setData('name', value)}
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Pipeline description" fieldId="pipeline-description">
              <TextArea
                isRequired
                type="text"
                id="pipeline-description"
                data-testid="pipeline-description"
                name="pipeline-description"
                value={description}
                onChange={(e, value) => setData('description', value)}
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <PipelineUploadRadio
              fileContents={fileContents}
              setFileContents={(data) => setData('fileContents', data)}
              pipelineUrl={pipelineUrl}
              setPipelineUrl={(url) => setData('pipelineUrl', url)}
              uploadOption={uploadOption}
              setUploadOption={(option) => {
                setData('uploadOption', option);
              }}
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
