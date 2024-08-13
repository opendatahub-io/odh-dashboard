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
import { usePipelineVersionImportModalData } from '~/concepts/pipelines/content/import/useImportModalData';
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import PipelineSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineSelector';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { DuplicateNameHelperText } from '~/concepts/pipelines/content/DuplicateNameHelperText';
import { getNameEqualsFilter } from '~/concepts/pipelines/utils';
import useDebounceCallback from '~/utilities/useDebounceCallback';
import {
  PIPELINE_ARGO_ERROR,
  PIPELINE_IMPORT_ARGO_ERROR_TEXT,
} from '~/concepts/pipelines/content/const';
import {
  PipelineUploadOption,
  extractKindFromPipelineYAML,
  generatePipelineVersionName,
} from './utils';
import PipelineUploadRadio from './PipelineUploadRadio';

type PipelineVersionImportModalProps = {
  existingPipeline?: PipelineKFv2 | null;
  onClose: (pipelineVersion?: PipelineVersionKFv2, pipeline?: PipelineKFv2 | null) => void;
};

const PipelineVersionImportModal: React.FC<PipelineVersionImportModalProps> = ({
  existingPipeline,
  onClose,
}) => {
  const { project, api, apiAvailable } = usePipelinesAPI();
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [hasDuplicateName, setHasDuplicateName] = React.useState(false);
  const [
    { name, description, pipeline, fileContents, uploadOption, pipelineUrl },
    setData,
    resetData,
  ] = usePipelineVersionImportModalData(existingPipeline);
  const isArgoWorkflow = extractKindFromPipelineYAML(fileContents) === 'Workflow';

  const pipelineId = pipeline?.pipeline_id || '';
  const pipelineName = pipeline?.display_name || '';

  const isImportButtonDisabled =
    !apiAvailable ||
    importing ||
    !name ||
    !pipeline ||
    (uploadOption === PipelineUploadOption.URL_IMPORT ? !pipelineUrl : !fileContents);

  const onBeforeClose = (
    pipelineVersion?: PipelineVersionKFv2,
    currentPipeline?: PipelineKFv2 | null,
  ) => {
    onClose(pipelineVersion, currentPipeline);
    setImporting(false);
    setError(undefined);
    resetData();
    setHasDuplicateName(false);
  };

  const checkForDuplicateName = useDebounceCallback(
    React.useCallback(
      async (value: string) => {
        if (pipeline?.pipeline_id && value) {
          const { pipeline_versions: duplicateVersions } = await api.listPipelineVersions(
            {},
            pipeline.pipeline_id,
            getNameEqualsFilter(value),
          );

          if (duplicateVersions?.length) {
            setHasDuplicateName(true);
          }
        }
      },
      [api, pipeline?.pipeline_id],
    ),
    500,
  );

  const onSubmit = () => {
    setImporting(true);
    setError(undefined);

    if (uploadOption === PipelineUploadOption.FILE_UPLOAD) {
      if (isArgoWorkflow) {
        setImporting(false);
        setError(new Error(PIPELINE_IMPORT_ARGO_ERROR_TEXT));
      } else {
        api
          .uploadPipelineVersion({}, name, description, fileContents, pipelineId)
          .then((pipelineVersion) => onBeforeClose(pipelineVersion, pipeline))
          .catch((e) => {
            setImporting(false);
            setError(e);
          });
      }
    } else {
      api
        .createPipelineVersion({}, pipelineId, {
          /* eslint-disable camelcase */
          pipeline_id: pipelineId,
          display_name: name,
          description,
          package_url: {
            pipeline_url: pipelineUrl,
          },
          /* eslint-enable camelcase */
        })
        .then((pipelineVersion) => onBeforeClose(pipelineVersion))
        .catch((e) => {
          setImporting(false);
          setError(e);
        });
    }
  };

  return (
    <Modal
      title="Upload new version"
      isOpen
      onClose={() => onBeforeClose()}
      actions={[
        <Button
          key="import-button"
          variant="primary"
          isDisabled={isImportButtonDisabled}
          isLoading={importing}
          onClick={onSubmit}
          data-testid="upload-version-submit-button"
        >
          Upload
        </Button>,
        <Button key="cancel-button" variant="secondary" onClick={() => onBeforeClose()}>
          Cancel
        </Button>,
      ]}
      variant="medium"
      data-testid="upload-version-modal"
    >
      <Form>
        <Stack hasGutter>
          <StackItem>
            <FormGroup label="Project">{getDisplayNameFromK8sResource(project)}</FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Pipeline" isRequired fieldId="pipeline-selection">
              <PipelineSelector
                selection={pipelineName}
                onSelect={(newPipeline) => {
                  setData('pipeline', newPipeline);
                  setData('name', generatePipelineVersionName(newPipeline));
                }}
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Pipeline version name" isRequired fieldId="pipeline-version-name">
              <TextInput
                isRequired
                type="text"
                data-testid="pipeline-version-name"
                id="pipeline-version-name"
                name="pipeline-version-name"
                value={name}
                onChange={(_e, value) => {
                  setHasDuplicateName(false);
                  setData('name', value);
                  checkForDuplicateName(value);
                }}
              />

              {hasDuplicateName && <DuplicateNameHelperText name={name} />}
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Pipeline version description" fieldId="pipeline-version-description">
              <TextArea
                isRequired
                type="text"
                id="pipeline-version-description"
                data-testid="pipeline-version-description"
                name="pipeline-version-description"
                value={description}
                onChange={(_e, value) => setData('description', value)}
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
              <Alert
                data-testid="import-modal-error"
                title={isArgoWorkflow ? PIPELINE_ARGO_ERROR : 'Error creating pipeline'}
                isInline
                variant="danger"
              >
                {error.message}
              </Alert>
            </StackItem>
          )}
        </Stack>
      </Form>
    </Modal>
  );
};

export default PipelineVersionImportModal;
