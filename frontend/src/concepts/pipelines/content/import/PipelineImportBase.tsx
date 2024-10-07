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
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { DuplicateNameHelperText } from '~/concepts/pipelines/content/DuplicateNameHelperText';
import {
  PIPELINE_IMPORT_ARGO_ERROR_TEXT,
  PIPELINE_ARGO_ERROR,
} from '~/concepts/pipelines/content/const';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import useDebounceCallback from '~/utilities/useDebounceCallback';
import { PipelineUploadOption, extractKindFromPipelineYAML } from './utils';
import PipelineUploadRadio from './PipelineUploadRadio';
import { PipelineImportData } from './useImportModalData';

export type PipelineImportBaseProps = {
  title: string;
  submitButtonText: string;
  onClose: (
    result?: PipelineKFv2 | PipelineVersionKFv2,
    currentPipeline?: PipelineKFv2 | null,
  ) => void;
  data: PipelineImportData;
  setData: UpdateObjectAtPropAndValue<PipelineImportData>;
  resetData: () => void;
  submitAction: () => Promise<PipelineKFv2 | PipelineVersionKFv2>;
  checkForDuplicateName: (value: string) => Promise<boolean>;
  children?: React.ReactNode;
};

const PipelineImportBase: React.FC<PipelineImportBaseProps> = ({
  title,
  submitButtonText,
  onClose,
  data,
  setData,
  resetData,
  submitAction,
  checkForDuplicateName,
  children,
}) => {
  const { project, apiAvailable } = usePipelinesAPI();
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const { name, description, fileContents, pipelineUrl, uploadOption } = data;
  const [hasDuplicateName, setHasDuplicateName] = React.useState(false);
  const isArgoWorkflow = extractKindFromPipelineYAML(fileContents) === 'Workflow';

  const isImportButtonDisabled =
    !apiAvailable ||
    importing ||
    !name ||
    (uploadOption === PipelineUploadOption.URL_IMPORT ? !pipelineUrl : !fileContents);

  const onBeforeClose = React.useCallback(
    (result?: PipelineKFv2 | PipelineVersionKFv2) => {
      onClose(result, data.pipeline);
      setImporting(false);
      setError(undefined);
      resetData();
      setHasDuplicateName(false);
    },
    [onClose, resetData, data.pipeline],
  );

  const debouncedCheckForDuplicateName = useDebounceCallback(
    React.useCallback(
      async (value: string) => {
        const isDuplicate = await checkForDuplicateName(value);
        setHasDuplicateName(!!isDuplicate);
      },
      [checkForDuplicateName],
    ),
    500,
  );

  const handleNameChange = React.useCallback(
    async (value: string) => {
      setHasDuplicateName(false);
      setData('name', value);
      debouncedCheckForDuplicateName(value);
    },
    [debouncedCheckForDuplicateName, setData],
  );

  const onSubmit = () => {
    setImporting(true);
    setError(undefined);

    if (uploadOption === PipelineUploadOption.FILE_UPLOAD && isArgoWorkflow) {
      setImporting(false);
      setError(new Error(PIPELINE_IMPORT_ARGO_ERROR_TEXT));
    } else {
      submitAction()
        .then((result) => {
          onBeforeClose(result);
        })
        .catch((e) => {
          setImporting(false);
          setError(e);
        });
    }
  };

  return (
    <Modal
      title={title}
      isOpen
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
          {submitButtonText}
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
              {getDisplayNameFromK8sResource(project)}
            </FormGroup>
          </StackItem>
          {children}
          <StackItem>
            <FormGroup label="Pipeline name" isRequired fieldId="pipeline-name">
              <TextInput
                isRequired
                type="text"
                id="pipeline-name"
                data-testid="pipeline-name"
                name="pipeline-name"
                value={name}
                onChange={(_e, value) => handleNameChange(value)}
              />
              {hasDuplicateName && <DuplicateNameHelperText name={name} />}
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Pipeline description" fieldId="pipeline-description">
              <TextArea
                type="text"
                id="pipeline-description"
                data-testid="pipeline-description"
                name="pipeline-description"
                value={description}
                onChange={(_e, value) => setData('description', value)}
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <PipelineUploadRadio
              fileContents={fileContents}
              setFileContents={(value) => setData('fileContents', value)}
              pipelineUrl={pipelineUrl}
              setPipelineUrl={(url) => setData('pipelineUrl', url)}
              uploadOption={uploadOption}
              setUploadOption={(option) => setData('uploadOption', option)}
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

export default PipelineImportBase;
