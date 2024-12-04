import * as React from 'react';
import { Alert, Button, Form, FormGroup, Modal, Stack, StackItem } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { DuplicateNameHelperText } from '~/concepts/pipelines/content/DuplicateNameHelperText';
import {
  PIPELINE_IMPORT_ARGO_ERROR_TEXT,
  PIPELINE_ARGO_ERROR,
  NAME_CHARACTER_LIMIT,
  DESCRIPTION_CHARACTER_LIMIT,
} from '~/concepts/pipelines/content/const';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import useDebounceCallback from '~/utilities/useDebounceCallback';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import { PipelineUploadOption, extractKindFromPipelineYAML } from './utils';
import PipelineUploadRadio from './PipelineUploadRadio';
import { PipelineImportData } from './useImportModalData';

export type PipelineImportBaseProps = {
  title: string;
  submitButtonText: string;
  onClose: (result?: PipelineKF | PipelineVersionKF, currentPipeline?: PipelineKF | null) => void;
  data: PipelineImportData;
  setData: UpdateObjectAtPropAndValue<PipelineImportData>;
  resetData: () => void;
  submitAction: () => Promise<PipelineKF | PipelineVersionKF>;
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
    hasDuplicateName ||
    !name ||
    (uploadOption === PipelineUploadOption.URL_IMPORT ? !pipelineUrl : !fileContents);

  const onBeforeClose = React.useCallback(
    (result?: PipelineKF | PipelineVersionKF) => {
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
            <NameDescriptionField
              nameFieldId="pipeline-name"
              nameFieldLabel="Pipeline name"
              descriptionFieldLabel="Pipeline description"
              descriptionFieldId="pipeline-description"
              data={{ name, description: description || '' }}
              hasNameError={hasDuplicateName}
              setData={(newData) => {
                setData('name', newData.name);
                setData('description', newData.description);
              }}
              maxLengthName={NAME_CHARACTER_LIMIT}
              maxLengthDesc={DESCRIPTION_CHARACTER_LIMIT}
              onNameChange={(value) => {
                setHasDuplicateName(false);
                debouncedCheckForDuplicateName(value);
              }}
              nameHelperText={
                hasDuplicateName ? <DuplicateNameHelperText isError name={name} /> : undefined
              }
            />
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
