import * as React from 'react';
import {
  Form,
  FormGroup,
  Stack,
  StackItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { DuplicateNameHelperText } from '~/concepts/pipelines/content/DuplicateNameHelperText';
import {
  PIPELINE_IMPORT_ARGO_ERROR_TEXT,
  PIPELINE_ARGO_ERROR,
  NAME_CHARACTER_LIMIT,
  DESCRIPTION_CHARACTER_LIMIT,
  PIPELINE_IMPORT_V1_ERROR_TEXT,
} from '~/concepts/pipelines/content/const';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import useDebounceCallback from '~/utilities/useDebounceCallback';
import NameDescriptionField from '~/concepts/k8s/NameDescriptionField';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import PipelineMigrationNoteLinks from '~/concepts/pipelines/content/PipelineMigrationNoteLinks';
import { PipelineUploadOption, extractKindFromPipelineYAML, isYAMLPipelineV1 } from './utils';
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
  const isV1PipelineFile = isYAMLPipelineV1(fileContents);

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
          if (e.message.includes('InvalidInputError') && isV1PipelineFile) {
            setError(new Error(PIPELINE_IMPORT_V1_ERROR_TEXT));
          } else {
            setError(e);
          }
        });
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => onBeforeClose()}
      variant="medium"
      data-testid="import-pipeline-modal"
    >
      <ModalHeader title={title} />
      <ModalBody>
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
                setFileContents={(value) => {
                  setData('fileContents', value);
                  setError(undefined);
                }}
                pipelineUrl={pipelineUrl}
                setPipelineUrl={(url) => setData('pipelineUrl', url)}
                uploadOption={uploadOption}
                setUploadOption={(option) => setData('uploadOption', option)}
              />
            </StackItem>
          </Stack>
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onCancel={() => onBeforeClose()}
          onSubmit={onSubmit}
          submitLabel={submitButtonText}
          isSubmitLoading={importing}
          isSubmitDisabled={isImportButtonDisabled}
          error={error}
          alertTitle={
            isArgoWorkflow
              ? PIPELINE_ARGO_ERROR
              : isV1PipelineFile
              ? 'Pipeline update and recompile required'
              : 'Error creating pipeline'
          }
          alertLinks={isV1PipelineFile ? <PipelineMigrationNoteLinks /> : undefined}
        />
      </ModalFooter>
    </Modal>
  );
};

export default PipelineImportBase;
